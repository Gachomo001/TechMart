-- Add status field to profiles table
ALTER TABLE profiles
ADD COLUMN status text NOT NULL DEFAULT 'active'::text,
ADD CONSTRAINT profiles_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]));

-- Update existing profiles to have active status
UPDATE profiles SET status = 'active' WHERE status IS NULL;
