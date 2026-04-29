-- Add strengths and gaps columns to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_strengths TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_gaps TEXT[];
