/**
 * Pulse SDK Utilities — hashing, ID generation, sanitization
 */

function hashString(str) {
  // Simple hash for browser compatibility (no crypto dependency)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'usr_' + Math.abs(hash).toString(16).padStart(8, '0');
}

function generateEventId() {
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
}

function sanitizeMetadata(metadata, piiFields = []) {
  if (!metadata) return {};
  const clean = { ...metadata };

  // Default PII fields to strip
  const defaultPii = ['email', 'name', 'phone', 'address', 'ssn', 'password', 'token', 'cookie'];
  const allPii = [...defaultPii, ...piiFields];

  for (const key of Object.keys(clean)) {
    if (allPii.some(pii => key.toLowerCase().includes(pii))) {
      clean[key] = '[REDACTED]';
    }
  }

  // Truncate error stacks
  if (clean.errorStack && clean.errorStack.length > 500) {
    clean.errorStack = clean.errorStack.substring(0, 500) + '...[truncated]';
  }

  return clean;
}

module.exports = { hashString, generateEventId, sanitizeMetadata };
