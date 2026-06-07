// ── TOTP (RFC 6238) — self-contained, no external deps ────────────────────────
// Implements the same algorithm Google Authenticator / Authy / 1Password use:
// HMAC-SHA1 over a 30-second time counter, 6-digit codes. Free, offline, standard.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD  = 30;   // seconds per code
const DIGITS  = 6;
const WINDOW  = 1;    // accept the previous/next step to tolerate clock drift

// ── Base32 (RFC 4648, no padding) ─────────────────────────────────────────────
export function base32Encode(buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str) {
  const clean = str.toUpperCase().replace(/=+$/,'').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ── Generate a fresh secret (20 bytes = 160 bits, the RFC-recommended size) ────
export function generateSecret() {
  return base32Encode(randomBytes(20));
}

// ── HOTP for a given counter ──────────────────────────────────────────────────
function hotp(secretBase32, counter) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  // Write the counter as a big-endian 64-bit integer
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

// ── Verify a user-supplied token against the secret (±WINDOW steps) ────────────
export function verifyToken(secretBase32, token) {
  if (!secretBase32 || typeof token !== 'string') return false;
  const cleaned = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;

  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const expected = hotp(secretBase32, counter + i);
    // Constant-time compare to avoid timing leaks
    const a = Buffer.from(expected);
    const b = Buffer.from(cleaned);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

// ── otpauth:// URI for QR codes (rendered client-side; secret never leaves) ────
export function buildOtpAuthUri({ secret, account, issuer = 'FB Core' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
