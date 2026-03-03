-- Add application_limit to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS application_limit integer;
