export type JobStatus = 'active' | 'paused' | 'closed'
export type ApplicationStatus =
  | 'applied'
  | 'screened'
  | 'shortlisted'
  | 'in_interview'
  | 'offer_sent'
  | 'offer_signed'
  | 'rejected'
export type SlotStatus = 'tentative' | 'confirmed' | 'released' | 'expired'
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled'
export type OfferStatus = 'draft' | 'sent' | 'signed'

export interface Job {
  id: string
  title: string
  team: string
  location: string
  remote_status: string
  experience_level: string
  description: string
  responsibilities: string[]
  requirements: string[]
  status: JobStatus
  created_at: string
}

export interface Application {
  id: string
  job_id: string
  full_name: string
  email: string
  linkedin_url: string | null
  portfolio_url: string | null
  resume_url: string
  resume_filename: string
  resume_text: string | null
  status: ApplicationStatus
  ai_score: number | null
  ai_score_rationale: string | null
  ai_parsed_skills: string[] | null
  ai_years_experience: number | null
  ai_education: string | null
  ai_employers: string[] | null
  ai_achievements: string[] | null
  ai_candidate_brief: string | null
  ai_research_linkedin: string | null
  ai_research_twitter: string | null
  ai_research_github: string | null
  ai_discrepancies: string[] | null
  admin_override_note: string | null
  created_at: string
  updated_at: string
  job?: Job
}

export interface InterviewSlot {
  id: string
  application_id: string
  interviewer_email: string
  start_time: string
  end_time: string
  status: SlotStatus
  google_event_id: string | null
  created_at: string
}

export interface Interview {
  id: string
  application_id: string
  slot_id: string
  meeting_url: string | null
  transcript: string | null
  summary: string | null
  fireflies_meeting_id: string | null
  status: InterviewStatus
  created_at: string
  slot?: InterviewSlot
}

export interface OfferLetter {
  id: string
  application_id: string
  job_title: string
  start_date: string
  base_salary: string
  compensation_structure: string | null
  equity_bonus: string | null
  reporting_manager: string
  custom_terms: string | null
  letter_content: string
  signing_token: string
  signed_at: string | null
  signature_data: string | null
  signer_ip: string | null
  status: OfferStatus
  created_at: string
}

export interface SchedulingToken {
  id: string
  application_id: string
  token: string
  expires_at: string
  used: boolean
  nudge_sent_at: string | null
  created_at: string
}

export interface StatusHistoryEntry {
  id: string
  application_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  note: string | null
  created_at: string
}

export interface AIScreeningResult {
  score: number
  rationale: string
  strengths: string[]
  gaps: string[]
  skills: string[]
  years_experience: number
  education: string
  employers: string[]
  achievements: string[]
}

export interface CandidateResearch {
  linkedin_summary: string
  twitter_summary: string
  github_summary: string
  discrepancies: string[]
  candidate_brief: string
}
