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

-- Backward-compatibility for environments where jobs already existed with an older shape
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS job_description_html TEXT;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE IF EXISTS jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure safe defaults for pre-existing rows
UPDATE jobs SET is_published = FALSE WHERE is_published IS NULL;
UPDATE jobs SET created_at = NOW() WHERE created_at IS NULL;
UPDATE jobs SET updated_at = NOW() WHERE updated_at IS NULL;

-- Apply expected constraints/defaults when possible
ALTER TABLE IF EXISTS jobs ALTER COLUMN is_published SET DEFAULT FALSE;
ALTER TABLE IF EXISTS jobs ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS jobs ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS jobs ALTER COLUMN is_published SET NOT NULL;
ALTER TABLE IF EXISTS jobs ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE IF EXISTS jobs ALTER COLUMN updated_at SET NOT NULL;

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

-- Backward-compatibility for environments where job_applications already existed
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS job_id BIGINT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS cv_drive_file_id TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS cv_drive_link TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS cover_drive_file_id TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS cover_drive_link TEXT;
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE IF EXISTS job_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE job_applications SET status = 'new' WHERE status IS NULL;
UPDATE job_applications SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE IF EXISTS job_applications ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE IF EXISTS job_applications ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'job_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'job_applications_job_id_fkey'
    ) THEN
      ALTER TABLE job_applications
      ADD CONSTRAINT job_applications_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

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
