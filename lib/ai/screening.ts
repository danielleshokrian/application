import Anthropic from '@anthropic-ai/sdk'
import type { AIScreeningResult, CandidateResearch, Job } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/** Strip markdown code fences that Claude sometimes wraps around JSON */
function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

/**
 * Parse and screen a resume against a job description.
 * Returns a structured fit score with rationale.
 */
export async function screenResume(
  resumeText: string,
  job: Job
): Promise<AIScreeningResult> {
  const jdText = `
Role: ${job.title}
Team: ${job.team}
Experience Level: ${job.experience_level}
Description: ${job.description}
Responsibilities:
${job.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}
Requirements:
${job.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}
  `.trim()

  const prompt = `You are a senior technical recruiter with deep expertise in evaluating candidates.

Analyze the following resume against the job description and return a structured JSON assessment.

JOB DESCRIPTION:
${jdText}

CANDIDATE RESUME:
${resumeText}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "rationale": "<2-3 sentence summary of overall fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "skills": ["<skill 1>", "<skill 2>", ...],
  "years_experience": <integer>,
  "education": "<highest degree and institution>",
  "employers": ["<employer 1>", "<employer 2>", ...],
  "achievements": ["<key achievement 1>", "<key achievement 2>", "<key achievement 3>"]
}

Scoring guide:
- 85-100: Exceptional match, clear hire signal
- 70-84: Strong match, worth interviewing
- 55-69: Partial match, some gaps
- 40-54: Weak match, significant gaps
- 0-39: Poor fit

Be honest and specific. Identify real gaps, not just surface-level issues.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripMarkdown(text)) as AIScreeningResult
}

/**
 * Research a shortlisted candidate using available profile info.
 * Simulates web research using Claude's reasoning over provided URLs and profile data.
 */
export async function researchCandidate(
  candidate: {
    full_name: string
    email: string
    linkedin_url?: string | null
    portfolio_url?: string | null
    resume_text?: string | null
  },
  job: Job
): Promise<CandidateResearch> {
  // In production: use a web browsing tool or Perplexity API to actually fetch profiles.
  // Here we use Claude to generate realistic research summaries based on available data,
  // and document what a real integration would look like.

  const profileContext = [
    `Name: ${candidate.full_name}`,
    `Email: ${candidate.email}`,
    candidate.linkedin_url ? `LinkedIn: ${candidate.linkedin_url}` : 'LinkedIn: Not provided',
    candidate.portfolio_url ? `Portfolio/GitHub: ${candidate.portfolio_url}` : 'Portfolio: Not provided',
    candidate.resume_text ? `Resume excerpt: ${candidate.resume_text.slice(0, 2000)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are a talent intelligence analyst. Based on the available profile data for this candidate applying for "${job.title}", generate a research briefing.

CANDIDATE PROFILE:
${profileContext}

ROLE CONTEXT: ${job.title} at ${job.team} team

Generate a realistic talent intelligence report. If LinkedIn/GitHub URLs are provided, craft research summaries based on what such a profile would likely contain for someone with this background. Be specific and professional.

Return ONLY valid JSON (no markdown):
{
  "linkedin_summary": "<2-3 sentences summarizing what their LinkedIn profile reveals about career trajectory, endorsements, and network>",
  "twitter_summary": "<1-2 sentences about relevant tweets, threads, or public discourse if applicable, or 'No public Twitter presence found matching this profile'>",
  "github_summary": "<2-3 sentences about notable repositories, contributions, or open source work>",
  "discrepancies": ["<discrepancy 1 if any>"],
  "candidate_brief": "<3-5 sentence executive summary a hiring manager can read in 60 seconds covering: who they are, why they're compelling for this role, key risk factors, and recommended next step>"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(stripMarkdown(text)) as CandidateResearch
}

/**
 * Generate a personalized Slack welcome message for a new hire.
 */
export async function generateSlackWelcome(params: {
  full_name: string
  job_title: string
  start_date: string
  reporting_manager: string
  candidate_brief?: string | null
}): Promise<string> {
  const prompt = `You are an enthusiastic but professional HR bot writing a Slack welcome message for a new team member joining their first day.

New hire details:
- Name: ${params.full_name}
- Role: ${params.job_title}
- Start date: ${params.start_date}
- Manager: ${params.reporting_manager}
${params.candidate_brief ? `- Background: ${params.candidate_brief}` : ''}

Write a warm, personalized, 3-4 paragraph Slack welcome message that:
1. Greets them by first name with genuine excitement
2. Acknowledges their specific background/role (be specific, not generic)
3. Includes a note from their manager (${params.reporting_manager})
4. Points them to key onboarding resources and next steps

Format it for Slack (use *bold* for emphasis, no HTML). Keep it human — not corporate-speak.
Return only the message text, no preamble.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Generate a professional offer letter.
 */
export async function generateOfferLetter(params: {
  candidate_name: string
  job_title: string
  start_date: string
  base_salary: string
  compensation_structure: string | null
  equity_bonus: string | null
  reporting_manager: string
  custom_terms: string | null
  candidate_brief: string | null
}): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const prompt = `Generate a professional, legally-appropriate employment offer letter.

Candidate: ${params.candidate_name}
Job Title: ${params.job_title}
Start Date: ${params.start_date}
Base Salary: ${params.base_salary}
Compensation Structure: ${params.compensation_structure || 'Standard annual salary, paid bi-weekly'}
Equity/Bonus: ${params.equity_bonus || 'Not applicable at this time'}
Reporting Manager: ${params.reporting_manager}
Custom Terms: ${params.custom_terms || 'None'}
Today's Date: ${today}
Company: TalentAI Inc.

Write a complete, professional offer letter that:
1. Has a proper letterhead / date / salutation
2. Clearly states the role, start date, and reporting structure
3. Details the compensation package (salary, equity, benefits overview)
4. Includes standard at-will employment language
5. Lists any conditions (background check, right to work)
6. Has a signature block for both company (pre-signed by hiring manager) and candidate
7. Ends with acceptance instructions

The letter should be formal but warm. Use professional formatting with clear sections.
Return only the letter text — no preamble or commentary.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
