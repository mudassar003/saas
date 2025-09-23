import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.PASSWORD_ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error('PASSWORD_ENCRYPTION_KEY environment variable is required');
  }

  // Use the first 32 bytes of the key (or pad if shorter)
  const key = Buffer.from(keyString.padEnd(KEY_LENGTH, '0')).subarray(0, KEY_LENGTH);
  return key;
}

/**
 * Encrypt a password for admin storage
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptPassword(password: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('password'));

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine IV + tag + encrypted data
    const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
    return combined;

  } catch (error) {
    console.error('Password encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password for admin viewing
 * Validates authentication tag for data integrity
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    if (encryptedPassword === 'LEGACY_USER_RESET_REQUIRED') {
      return '[LEGACY - Password Reset Required]';
    }

    const key = getEncryptionKey();

    // Extract components
    const ivHex = encryptedPassword.substring(0, IV_LENGTH * 2);
    const tagHex = encryptedPassword.substring(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2);
    const encryptedHex = encryptedPassword.substring((IV_LENGTH + TAG_LENGTH) * 2);

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('password'));

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;

  } catch (error) {
    console.error('Password decryption failed:', error);
    return '[DECRYPTION_FAILED]';
  }
}

/**
 * Generate a secure random password
 * Used when creating new users
 */
export function generateSecurePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}