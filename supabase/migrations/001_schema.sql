-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  location TEXT NOT NULL,
  remote_status TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  description TEXT NOT NULL,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT NOT NULL,
  resume_filename TEXT NOT NULL,
  resume_text TEXT,
  status TEXT NOT NULL DEFAULT 'applied',
  ai_score INTEGER,
  ai_score_rationale TEXT,
  ai_parsed_skills TEXT[],
  ai_years_experience INTEGER,
  ai_education TEXT,
  ai_employers TEXT[],
  ai_achievements TEXT[],
  ai_candidate_brief TEXT,
  ai_research_linkedin TEXT,
  ai_research_twitter TEXT,
  ai_research_github TEXT,
  ai_discrepancies TEXT[],
  admin_override_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, job_id)
);

-- Status history
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview slots (calendar holds)
CREATE TABLE IF NOT EXISTS interview_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  interviewer_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'tentative',
  google_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES interview_slots(id),
  meeting_url TEXT,
  transcript TEXT,
  summary TEXT,
  fireflies_meeting_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offer letters
CREATE TABLE IF NOT EXISTS offer_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  base_salary TEXT NOT NULL,
  compensation_structure TEXT,
  equity_bonus TEXT,
  reporting_manager TEXT NOT NULL,
  custom_terms TEXT,
  letter_content TEXT NOT NULL,
  signing_token TEXT UNIQUE NOT NULL,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  signer_ip TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling tokens (for candidate slot-selection links)
CREATE TABLE IF NOT EXISTS scheduling_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  nudge_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed job listings
INSERT INTO jobs (title, team, location, remote_status, experience_level, description, responsibilities, requirements, status)
VALUES
(
  'Senior AI Product Engineer',
  'Product & Engineering',
  'San Francisco, CA',
  'Hybrid (3 days in-office)',
  'Senior (5+ years)',
  'We are building the next generation of AI-powered internal tools that transform how teams operate. As a Senior AI Product Engineer, you will sit at the intersection of product thinking and hands-on AI engineering, owning full-stack features from ideation through deployment. You will work directly with Claude, GPT-4o, and emerging frontier models to build systems that genuinely move the needle for our customers.',
  ARRAY[
    'Design and build AI-powered product features end-to-end using LLMs, RAG pipelines, and agentic workflows',
    'Own the full product lifecycle: ideation, scoping, implementation, measurement, and iteration',
    'Collaborate with the founding team to identify highest-leverage AI opportunities across the product',
    'Instrument and evaluate AI system outputs to detect regressions, hallucinations, and quality drift',
    'Write clean, well-tested TypeScript/Python code and maintain high engineering standards',
    'Mentor junior engineers and establish AI engineering best practices',
    'Ship fast: we operate with startup urgency and expect weekly meaningful progress'
  ],
  ARRAY[
    '5+ years of software engineering experience with at least 1 year building production AI/ML systems',
    'Deep familiarity with LLM APIs (Anthropic, OpenAI) and prompt engineering techniques',
    'Strong TypeScript or Python skills; experience with Next.js preferred',
    'Experience with vector databases, RAG systems, or agentic workflows',
    'Ability to scope, prioritize, and ship independently without heavy process',
    'Strong written communication — you can explain complex AI behavior to non-technical stakeholders',
    'Bonus: experience with Supabase, LangChain, LlamaIndex, or AI agent frameworks'
  ],
  'active'
),
(
  'AI Product Operator',
  'Operations & AI',
  'Remote (US)',
  'Fully Remote',
  'Mid-level (2–5 years)',
  'This is not a traditional ops role. As an AI Product Operator, you will sit at the intersection of product thinking, systems design, and hands-on AI building. You will be responsible for designing, building, and iterating on AI-powered internal tools that meaningfully improve how our teams operate. Think: less engineer, more AI-native builder who can wire together Claude, Zapier, Supabase, and custom APIs to solve real business problems — fast.',
  ARRAY[
    'Identify, scope, and build AI-powered internal tools from scratch using no-code and low-code AI platforms',
    'Design end-to-end workflows that connect LLMs, APIs, databases, and communication tools (Slack, email)',
    'Collaborate with department heads to identify where AI can reduce manual work and human error',
    'Maintain, monitor, and improve deployed AI systems based on real usage and feedback',
    'Document systems thoroughly so non-technical teammates can understand and use them',
    'Evaluate new AI tools, APIs, and models and recommend adoptions where appropriate',
    'Build with urgency: ship MVPs in days, not weeks'
  ],
  ARRAY[
    '2+ years experience in operations, product, or a technical role at a startup',
    'Hands-on experience building with LLM APIs or AI automation tools (Zapier, Make, n8n)',
    'Familiarity with no-code/low-code tools and the ability to write basic scripts when needed',
    'Strong systems thinker: you can map out a full workflow and anticipate edge cases before they happen',
    'Excellent written communication and documentation habits',
    'Self-directed: you can take a problem statement and drive it to a shipped solution independently',
    'Bonus: experience with Supabase, Airtable, Retool, or similar internal tooling platforms'
  ],
  'active'
),
(
  'Head of Talent & People',
  'People & Culture',
  'New York, NY',
  'Hybrid (flexible)',
  'Senior / Lead (6+ years)',
  'We are looking for a people-first Head of Talent who also embraces technology as a force multiplier. You will own the full talent lifecycle — from employer brand through onboarding — and will be expected to actively leverage AI tools to build a hiring machine that is both faster and more human than traditional approaches. You will report directly to the CEO and sit on the leadership team.',
  ARRAY[
    'Own end-to-end recruiting across all functions: sourcing, screening, interviewing, closing, and onboarding',
    'Build and maintain a high-quality candidate experience that reflects our values and brand',
    'Design structured interview processes with standardized scorecards to reduce bias',
    'Partner with hiring managers to define roles, calibrate bar, and make fast, high-quality decisions',
    'Implement and manage an AI-augmented ATS and hiring workflow (this role will help select the tools)',
    'Build onboarding programs that ramp new hires to full productivity in their first 30 days',
    'Report on hiring metrics (time-to-hire, quality of hire, offer acceptance rate) weekly to leadership'
  ],
  ARRAY[
    '6+ years of talent acquisition or people operations experience, ideally at a high-growth startup',
    'Proven track record of building recruiting functions from scratch or at small teams (under 50 people)',
    'Experience using or evaluating ATS platforms, sourcing tools, and AI hiring tools',
    'Strong data orientation: you track metrics and make decisions based on evidence, not intuition alone',
    'Exceptional communication and relationship-building skills — candidates love working with you',
    'Ability to move fast without sacrificing candidate experience or team calibration quality',
    'Bonus: experience with structured interviewing methodologies (STAR, Topgrading, work trials)'
  ],
  'active'
),
(
  'Growth Marketing Manager',
  'Marketing',
  'Remote (US or EU)',
  'Fully Remote',
  'Mid-level (3–5 years)',
  'We need a performance-driven Growth Marketing Manager who combines analytical rigor with creative experimentation. You will own our paid acquisition channels, conversion optimization, and growth experiments. Critically, you will be expected to leverage AI tools to produce content, run experiments, and analyze data at a pace that a traditional marketer operating alone could not match.',
  ARRAY[
    'Own and optimize paid acquisition across Google, LinkedIn, and Meta with clear ROAS targets',
    'Design and run conversion rate optimization experiments across landing pages and onboarding flows',
    'Leverage AI content tools to produce ad copy, landing page variants, and email sequences at scale',
    'Build and maintain growth dashboards that give leadership real-time visibility into channel performance',
    'Partner with Product to identify and instrument key activation and retention moments',
    'Manage relationships with agencies or freelancers when specialist support is needed',
    'Report weekly to CEO with clear metrics, learnings, and next experiments'
  ],
  ARRAY[
    '3–5 years of growth marketing or performance marketing experience at a B2B SaaS company',
    'Hands-on experience managing paid acquisition budgets of $50K+ per month',
    'Strong analytical skills: comfortable in SQL, Google Sheets, or similar tools for data analysis',
    'Experience with marketing automation tools (HubSpot, Klaviyo, Customer.io) and CRM integration',
    'Demonstrated track record of running structured experiments and making data-backed decisions',
    'Familiarity with AI content tools (Claude, GPT-4, Midjourney) and willingness to use them daily',
    'Bonus: experience with PLG (product-led growth) motions and in-app growth experiments'
  ],
  'active'
)
ON CONFLICT DO NOTHING;
