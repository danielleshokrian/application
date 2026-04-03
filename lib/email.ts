/**
 * Email module using Resend.
 * Falls back to console logging when RESEND_API_KEY is not set.
 */

import { Resend } from 'resend'
import type { CalendarSlot } from './calendar'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = `${process.env.EMAIL_FROM_NAME || 'TalentAI Hiring'} <${process.env.EMAIL_FROM || 'hiring@talentai.io'}>`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function send(options: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: string }>
}) {
  if (!resend) {
    console.log(`[Email MOCK] To: ${options.to} | Subject: ${options.subject}`)
    console.log(`[Email MOCK] Body preview: ${options.html.slice(0, 200)}...`)
    return { id: `mock_email_${Date.now()}` }
  }
  return await resend.emails.send({ from: FROM, ...options })
}

export async function sendApplicationConfirmation(params: {
  to: string
  candidateName: string
  jobTitle: string
  applicationId: string
}) {
  return send({
    to: params.to,
    subject: `Application received — ${params.jobTitle}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a2fa0;">Application Received ✓</h2>
  <p>Hi ${params.candidateName},</p>
  <p>Thanks for applying for the <strong>${params.jobTitle}</strong> role at TalentAI. We've received your application and our team will review it shortly.</p>
  <p>Our AI screening system will evaluate your resume against the role requirements. If you're a strong match, you'll hear from us within 2 business days with next steps.</p>
  <p style="background: #f0f4ff; padding: 12px; border-radius: 8px;">
    <strong>Application ID:</strong> ${params.applicationId.slice(0, 8).toUpperCase()}<br/>
    <strong>Role:</strong> ${params.jobTitle}
  </p>
  <p>Best of luck,<br/><strong>The TalentAI Hiring Team</strong></p>
</div>`,
  })
}

export async function sendSchedulingEmail(params: {
  to: string
  candidateName: string
  jobTitle: string
  slots: CalendarSlot[]
  schedulingToken: string
}) {
  const slotOptions = params.slots
    .map(
      (s, i) => `
<tr>
  <td style="padding: 12px; border-bottom: 1px solid #eee;">
    <strong>Option ${i + 1}:</strong> ${s.label}
    <a href="${APP_URL}/schedule/${params.schedulingToken}?slot=${s.id}"
       style="display:inline-block; margin-left:16px; padding:6px 16px; background:#4f6ef7; color:white; border-radius:4px; text-decoration:none; font-size:13px;">
      Select This Time
    </a>
  </td>
</tr>`
    )
    .join('')

  return send({
    to: params.to,
    subject: `Schedule your interview — ${params.jobTitle}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a2fa0;">You're Shortlisted! Let's Schedule Your Interview</h2>
  <p>Hi ${params.candidateName},</p>
  <p>Great news — after reviewing your application for <strong>${params.jobTitle}</strong>, we'd like to invite you to an interview. Please select one of the available 45-minute slots below:</p>
  <table style="width:100%; border-collapse:collapse; margin:20px 0;">
    ${slotOptions}
  </table>
  <p>Or <a href="${APP_URL}/schedule/${params.schedulingToken}" style="color:#4f6ef7;">click here to view all options</a> and request a different time if none of the above work.</p>
  <p style="color: #666; font-size: 13px;">This link expires in 5 days. If you don't respond, we'll follow up with a reminder.</p>
  <p>Best,<br/><strong>The TalentAI Hiring Team</strong></p>
</div>`,
  })
}

export async function sendInterviewConfirmation(params: {
  to: string
  candidateName: string
  jobTitle: string
  slotLabel: string
  meetingUrl: string
  icsContent: string
}) {
  return send({
    to: params.to,
    subject: `Interview confirmed — ${params.jobTitle} | ${params.slotLabel}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a2fa0;">Interview Confirmed ✓</h2>
  <p>Hi ${params.candidateName},</p>
  <p>Your interview for <strong>${params.jobTitle}</strong> has been confirmed.</p>
  <p style="background: #f0f4ff; padding: 16px; border-radius: 8px;">
    📅 <strong>${params.slotLabel}</strong><br/>
    🔗 <a href="${params.meetingUrl}">Join Meeting: ${params.meetingUrl}</a>
  </p>
  <p>A calendar invite (.ics) is attached. You can also accept directly in your Google Calendar.</p>
  <p><strong>What to expect:</strong> A 45-minute conversation with our team covering your background, the role, and how we can grow together. No technical test — just a real conversation.</p>
  <p>See you soon,<br/><strong>The TalentAI Hiring Team</strong></p>
</div>`,
    attachments: [
      {
        filename: 'interview.ics',
        content: Buffer.from(params.icsContent).toString('base64'),
      },
    ],
  })
}

export async function sendSchedulingNudge(params: {
  to: string
  candidateName: string
  jobTitle: string
  schedulingToken: string
}) {
  return send({
    to: params.to,
    subject: `Quick reminder: schedule your interview for ${params.jobTitle}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a2fa0;">Don't miss your interview slot</h2>
  <p>Hi ${params.candidateName},</p>
  <p>We noticed you haven't selected an interview time yet for the <strong>${params.jobTitle}</strong> role.</p>
  <p>Our available slots are filling up — please <a href="${APP_URL}/schedule/${params.schedulingToken}" style="color:#4f6ef7; font-weight:bold;">click here to book your time</a> before the slots are gone.</p>
  <p>If you're no longer interested or have questions, just reply to this email and we'll follow up.</p>
  <p>Best,<br/><strong>The TalentAI Hiring Team</strong></p>
</div>`,
  })
}

export async function sendOfferEmail(params: {
  to: string
  candidateName: string
  jobTitle: string
  signingToken: string
}) {
  return send({
    to: params.to,
    subject: `Offer Letter — ${params.jobTitle} at TalentAI`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a2fa0;">Congratulations! You Have an Offer 🎉</h2>
  <p>Hi ${params.candidateName},</p>
  <p>We're delighted to extend an offer for the <strong>${params.jobTitle}</strong> role at TalentAI. The full offer details are in the link below.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${APP_URL}/offer/${params.signingToken}"
       style="display:inline-block; padding:14px 32px; background:#4f6ef7; color:white; border-radius:8px; text-decoration:none; font-size:16px; font-weight:bold;">
      View & Sign Offer Letter →
    </a>
  </p>
  <p style="color: #666; font-size: 13px;">Please review and sign within 5 days. If you have questions, reply directly to this email.</p>
  <p>We can't wait to have you on the team,<br/><strong>The TalentAI Team</strong></p>
</div>`,
  })
}

export async function sendOfferSignedAlertToAdmin(params: {
  candidateName: string
  jobTitle: string
  signedAt: string
  applicationId: string
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentai.io'
  return send({
    to: adminEmail,
    subject: `✅ Offer signed — ${params.candidateName} for ${params.jobTitle}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #16a34a;">Offer Signed!</h2>
  <p><strong>${params.candidateName}</strong> has signed their offer letter for <strong>${params.jobTitle}</strong>.</p>
  <p><strong>Signed at:</strong> ${new Date(params.signedAt).toLocaleString()}</p>
  <p><a href="${APP_URL}/admin/candidates/${params.applicationId}" style="color:#4f6ef7;">View candidate profile →</a></p>
  <p>Next step: Slack onboarding has been automatically triggered.</p>
</div>`,
  })
}

export async function sendReschedulingRequest(params: {
  interviewerEmail: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  requestedTime: string
  approveUrl: string
  declineUrl: string
}) {
  return send({
    to: params.interviewerEmail,
    subject: `Rescheduling request from ${params.candidateName}`,
    html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Reschedule Request</h2>
  <p>${params.candidateName} (${params.candidateEmail}) has requested an alternative interview time for the <strong>${params.jobTitle}</strong> role.</p>
  <p><strong>Requested time:</strong> ${params.requestedTime}</p>
  <div style="margin: 20px 0;">
    <a href="${params.approveUrl}" style="padding:10px 20px; background:#16a34a; color:white; border-radius:4px; text-decoration:none; margin-right:10px;">✓ Approve</a>
    <a href="${params.declineUrl}" style="padding:10px 20px; background:#dc2626; color:white; border-radius:4px; text-decoration:none;">✗ Decline</a>
  </div>
</div>`,
  })
}
