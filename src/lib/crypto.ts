/**
 * Obsidian Encryption Module
 * Implements strong AES-256-GCM authenticated encryption using the native Web Crypto API.
 * Designed for high performance (off-main-thread where possible or using native C++ browser bindings).
 */

// Generate a new AES-256-GCM key
export const generateSymmetricKey = async (): Promise<CryptoKey> => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable (so we can export it and encrypt it with user's public keys later)
    ["encrypt", "decrypt"]
  );
};

// Helper for base64 conversion in browser
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Export key to raw base64 string for storage/transmission
export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
};

// Import key from base64 string
export const importKey = async (base64Key: string): Promise<CryptoKey> => {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt plaintext using AES-256-GCM
export const encryptText = async (text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for AES-GCM
  const encoded = new TextEncoder().encode(text);
  
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuf),
    iv: arrayBufferToBase64(iv.buffer),
  };
};

// Decrypt ciphertext using AES-256-GCM
export const decryptText = async (ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> => {
  const ciphertextBuf = base64ToArrayBuffer(ciphertextBase64);
  const ivBuf = base64ToArrayBuffer(ivBase64);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuf,
    },
    key,
    ciphertextBuf
  );

  return new TextDecoder().decode(decryptedBuf);
};

// Basic in-memory key cache to avoid re-importing keys constantly
// In production, this should be in a secure worker or highly protected memory space
const keyCache = new Map<string, CryptoKey>();

export const getConversationKey = async (conversationId: string, encodedKeyFromDb: string): Promise<CryptoKey> => {
  if (keyCache.has(conversationId)) {
    return keyCache.get(conversationId)!;
  }
  
  const key = await importKey(encodedKeyFromDb);
  keyCache.set(conversationId, key);
  return key;
};
