// @ts-nocheck
// deno-lint-ignore-file no-explicit-any

/**
 * Server-side Email Encryption Utilities for Supabase Edge Functions
 *
 * Provides AES-GCM encryption for sensitive email data before database storage.
 * Compatible with client-side decryption using the same key derivation.
 */

// Encryption configuration
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for GCM

/**
 * Generate a user-specific encryption key from their user ID
 * Uses a server-side master key combined with user ID for deterministic key generation
 */
async function deriveUserKey(userId: string): Promise<CryptoKey> {
  // Get master key from environment (support both variable names for compatibility)
  const masterKey =
    Deno.env.get('EMAIL_ENCRYPTION_MASTER_KEY') ||
    Deno.env.get('EMAIL_ENCRYPTION_KEY');
  if (!masterKey) {
    throw new Error(
      'EMAIL_ENCRYPTION_MASTER_KEY or EMAIL_ENCRYPTION_KEY environment variable not set'
    );
  }

  const encoder = new TextEncoder();

  // Import master key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive user-specific key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(userId), // Use user ID as salt for deterministic keys
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt text data using AES-GCM
 */
async function encryptText(text: string, key: CryptoKey): Promise<string> {
  if (!text || text.trim() === '') return text;

  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    data
  );

  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...combined));

  // Add prefix to indicate server-side encryption
  return `srv_enc:${base64}`;
}

/**
 * Decrypt text data using AES-GCM
 */
async function decryptText(
  encryptedText: string,
  key: CryptoKey
): Promise<string> {
  if (!encryptedText || encryptedText.trim() === '') return encryptedText;

  try {
    // Check if this is server-side encrypted data
    if (!encryptedText.startsWith('srv_enc:')) {
      // Not encrypted or different encryption format
      return encryptedText;
    }

    // Remove prefix and decode from base64
    const base64Data = encryptedText.substring(8); // Remove 'srv_enc:' prefix
    const combined = new Uint8Array(
      atob(base64Data)
        .split('')
        .map((char) => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Server-side decryption failed:', error);
    return '[Decryption Error]';
  }
}

/**
 * Email encryption interface
 */
export interface EncryptableEmailData {
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  // Non-encrypted fields pass through unchanged
  [key: string]: any;
}

/**
 * Encrypt sensitive email data before database storage
 */
export async function encryptEmailData(
  emailData: EncryptableEmailData,
  userId: string
): Promise<EncryptableEmailData> {
  if (!isEncryptionSupported()) {
    throw new Error('Encryption not supported in this environment');
  }

  try {
    const key = await deriveUserKey(userId);
    const encrypted = { ...emailData };

    // Encrypt sensitive fields
    if (emailData.subject) {
      encrypted.subject = await encryptText(emailData.subject, key);
    }
    if (emailData.body_text) {
      encrypted.body_text = await encryptText(emailData.body_text, key);
    }
    if (emailData.body_html) {
      encrypted.body_html = await encryptText(emailData.body_html, key);
    }

    return encrypted;
  } catch (error) {
    console.error('Server-side email encryption failed:', error);
    throw new Error(`Failed to encrypt email data: ${error.message}`);
  }
}

/**
 * Decrypt email data after retrieving from database
 */
export async function decryptEmailData(
  encryptedData: EncryptableEmailData,
  userId: string
): Promise<EncryptableEmailData> {
  if (!isEncryptionSupported()) {
    console.warn('Encryption not supported, returning data as-is');
    return encryptedData;
  }

  try {
    const key = await deriveUserKey(userId);
    const decrypted = { ...encryptedData };

    // Decrypt sensitive fields
    if (encryptedData.subject) {
      decrypted.subject = await decryptText(encryptedData.subject, key);
    }
    if (encryptedData.body_text) {
      decrypted.body_text = await decryptText(encryptedData.body_text, key);
    }
    if (encryptedData.body_html) {
      decrypted.body_html = await decryptText(encryptedData.body_html, key);
    }

    return decrypted;
  } catch (error) {
    console.error('Server-side email decryption failed:', error);
    // Return original data with error indicators
    return {
      ...encryptedData,
      subject: encryptedData.subject
        ? '[Decryption Error]'
        : encryptedData.subject,
      body_text: encryptedData.body_text
        ? '[Decryption Error]'
        : encryptedData.body_text,
      body_html: encryptedData.body_html
        ? '[Decryption Error]'
        : encryptedData.body_html,
    };
  }
}

/**
 * Check if Web Crypto API is available (should be available in Deno)
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}

/**
 * Generate a secure master key for initial setup
 * This should be called once and the result stored as EMAIL_ENCRYPTION_MASTER_KEY
 */
export function generateMasterKey(): string {
  if (!isEncryptionSupported()) {
    throw new Error('Crypto API not available for key generation');
  }

  const keyBytes = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  return btoa(String.fromCharCode(...keyBytes));
}

/**
 * Utility function to encrypt a single field (used by other functions)
 */
export async function encryptField(
  text: string,
  userId: string
): Promise<string> {
  if (!text || text.trim() === '') return text;

  const key = await deriveUserKey(userId);
  return await encryptText(text, key);
}

/**
 * Utility function to decrypt a single field (used by other functions)
 */
export async function decryptField(
  encryptedText: string,
  userId: string
): Promise<string> {
  if (!encryptedText || encryptedText.trim() === '') return encryptedText;

  const key = await deriveUserKey(userId);
  return await decryptText(encryptedText, key);
}
