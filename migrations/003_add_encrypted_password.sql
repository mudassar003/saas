-- Add encrypted password field for admin access
-- This allows super admins to view original passwords while maintaining bcrypt security

-- Add the encrypted password column
ALTER TABLE users ADD COLUMN password_encrypted TEXT;

-- Add comment explaining the dual password approach
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash for authentication - never store plain text here';
COMMENT ON COLUMN users.password_encrypted IS 'AES encrypted password for admin viewing - encrypted with app secret key';

-- Create index for admin queries (though not frequently used)
CREATE INDEX IF NOT EXISTS idx_users_encrypted_password ON users(id) WHERE password_encrypted IS NOT NULL;

-- Update existing users to have placeholder encrypted passwords
-- In production, you would need to reset passwords or have users re-enter them
UPDATE users SET password_encrypted = 'LEGACY_USER_RESET_REQUIRED' WHERE password_encrypted IS NULL;