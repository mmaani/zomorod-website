-- Recruitment schema for jobs + applications (Google Drive links from service account uploads)

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT,
  location_country TEXT,
  location_city TEXT,
  employment_type TEXT,
  job_description_html TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  education_level TEXT,
  country TEXT,
  city TEXT,
  cv_drive_file_id TEXT,
  cv_drive_link TEXT,
  cover_drive_file_id TEXT,
  cover_drive_link TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_is_published ON jobs (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications (status, created_at DESC);

-- Keep updated_at fresh when jobs rows are updated
CREATE OR REPLACE FUNCTION set_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_jobs_updated_at ON jobs;
CREATE TRIGGER trg_set_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_jobs_updated_at();
