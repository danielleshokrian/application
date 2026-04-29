import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractTextFromFile } from '@/lib/resume-parser'
import { sendApplicationConfirmation } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const linkedinUrl = formData.get('linkedin_url') as string | null
    const portfolioUrl = formData.get('portfolio_url') as string | null
    const jobId = formData.get('job_id') as string
    const resumeFile = formData.get('resume') as File | null

    // Validate required fields
    if (!fullName || !email || !jobId || !resumeFile) {
      return NextResponse.json(
        { error: 'Missing required fields: full_name, email, job_id, resume' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Validate file type
    const fileExt = resumeFile.name.toLowerCase().split('.').pop()
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and DOCX files are accepted.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (resumeFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Check if job exists and is active
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, title, status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status === 'closed') {
      return NextResponse.json(
        { error: 'This position is no longer accepting applications.' },
        { status: 409 }
      )
    }

    if (job.status === 'paused') {
      return NextResponse.json(
        { error: 'Applications for this role are temporarily paused. Please check back soon.' },
        { status: 409 }
      )
    }

    // Check for duplicate application
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id, status')
      .eq('email', email.toLowerCase().trim())
      .eq('job_id', jobId)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: 'You have already applied for this role.',
          applicationId: existing.id,
          status: existing.status,
        },
        { status: 409 }
      )
    }

    // Upload resume to Supabase Storage
    const fileBuffer = Buffer.from(await resumeFile.arrayBuffer())
    const filename = `${uuidv4()}-${resumeFile.name.replace(/\s+/g, '_')}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filename, fileBuffer, {
        contentType: resumeFile.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload Error]', uploadError)
      const isBucketMissing =
        uploadError.message?.includes('Bucket not found') ||
        uploadError.message?.includes('bucket') ||
        (uploadError as { statusCode?: string }).statusCode === '404'
      return NextResponse.json(
        {
          error: isBucketMissing
            ? 'Storage not configured. Please create a "resumes" bucket in Supabase Storage (Storage → New bucket → name: resumes → Public → Save).'
            : `Resume upload failed: ${uploadError.message}`,
        },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('resumes')
      .getPublicUrl(filename)
    const resumeUrl = urlData.publicUrl

    // Extract resume text for AI screening
    let resumeText = ''
    try {
      resumeText = await extractTextFromFile(fileBuffer, resumeFile.name)
    } catch (err) {
      console.warn('[ResumeParser] Text extraction failed:', err)
    }

    // Create application record
    const { data: application, error: insertError } = await supabaseAdmin
      .from('applications')
      .insert({
        job_id: jobId,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        linkedin_url: linkedinUrl?.trim() || null,
        portfolio_url: portfolioUrl?.trim() || null,
        resume_url: resumeUrl,
        resume_filename: resumeFile.name,
        resume_text: resumeText,
        status: 'applied',
      })
      .select()
      .single()

    if (insertError || !application) {
      console.error('[Insert Error]', insertError)
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 })
    }

    // Record status history
    await supabaseAdmin.from('status_history').insert({
      application_id: application.id,
      from_status: null,
      to_status: 'applied',
      changed_by: 'candidate',
      note: 'Application submitted',
    })

    // Send confirmation email (non-blocking)
    sendApplicationConfirmation({
      to: email,
      candidateName: fullName,
      jobTitle: job.title,
      applicationId: application.id,
    }).catch((err) => console.error('[Email] Confirmation failed:', err))

    // Trigger async AI screening (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: application.id }),
    }).catch((err) => console.error('[Screening] Trigger failed:', err))

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully. Check your email for confirmation.',
    })
  } catch (err) {
    console.error('[Applications API]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Admin: list all applications with filters
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const status = searchParams.get('status')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')

  let query = supabaseAdmin
    .from('applications')
    .select('*, job:jobs(id, title, team)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (role) query = query.eq('job_id', role)
  if (status) query = query.eq('status', status)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data, total: count, page, limit })
}
