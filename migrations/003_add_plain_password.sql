-- Add plain password field for admin viewing
-- Simple approach: store password in plain text for admin access

-- Add the plain password column
ALTER TABLE users ADD COLUMN password_plain TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN users.password_plain IS 'Plain text password for admin viewing - stored for admin convenience';

-- Update existing users to have placeholder passwords
-- In production, you would need to reset passwords or have users re-enter them
UPDATE users SET password_plain = 'admin123' WHERE email = 'admin@company.com';
UPDATE users SET password_plain = 'RESET_REQUIRED' WHERE password_plain IS NULL;