import db from '../db.js';

/**
 * Persistent security audit log (A09 — Security Logging and Monitoring).
 *
 * Events are written to the security_audit_log table so they survive
 * server restarts and can be queried by admins. Console logging is kept
 * as a secondary output for streaming log aggregators.
 *
 * Usage:
 *   await audit.log(req, 'LOGIN_OK', { user_id: 1, tenant_id: 2 });
 *   await audit.log(req, 'LOGIN_FAILED', { identifier: 'foo@bar.com' });
 */

const EVENTS = Object.freeze({
  LOGIN_OK:               'LOGIN_OK',
  LOGIN_FAILED:           'LOGIN_FAILED',
  LOGOUT:                 'LOGOUT',
  SESSION_REPLACED:       'SESSION_REPLACED',
  PASSWORD_CHANGED:       'PASSWORD_CHANGED',
  PASSWORD_RESET_REQ:     'PASSWORD_RESET_REQ',
  PASSWORD_RESET_OK:      'PASSWORD_RESET_OK',
  USER_CREATED:           'USER_CREATED',
  USER_UPDATED:           'USER_UPDATED',
  USER_DELETED:           'USER_DELETED',
  PERMISSION_CHANGED:     'PERMISSION_CHANGED',
  TENANT_CREATED:         'TENANT_CREATED',
  TENANT_SUSPENDED:       'TENANT_SUSPENDED',
  UPLOAD_OK:              'UPLOAD_OK',
  UPLOAD_REJECTED:        'UPLOAD_REJECTED',
  ACCESS_DENIED:          'ACCESS_DENIED',
  INVALID_TOKEN:          'INVALID_TOKEN',
  TWO_FA_ENABLED:         'TWO_FA_ENABLED',
  TWO_FA_DISABLED:        'TWO_FA_DISABLED',
  TWO_FA_FAILED:          'TWO_FA_FAILED',
  SESSION_REVOKED:        'SESSION_REVOKED',
});

/**
 * @param {import('express').Request} req
 * @param {string} event  - one of EVENTS
 * @param {object} [meta] - arbitrary JSON metadata
 */
async function log(req, event, meta = {}) {
  const ts = new Date().toISOString();
  const ip = req?.ip || 'unknown';
  const uid = req?.user?.id ?? meta.user_id ?? null;
  const tid = req?.user?.tenant_id ?? meta.tenant_id ?? null;
  const rid = req?.id || null;

  // Always log to console for streaming aggregators
  console.info(`[AUDIT][${ts}][${rid ?? '-'}] ${event} uid=${uid} tid=${tid} ip=${ip}`, JSON.stringify(meta));

  try {
    await db.query(
      `INSERT INTO security_audit_log (event, user_id, tenant_id, ip_address, request_id, meta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [event, uid, tid, ip, rid, JSON.stringify(meta)]
    );
  } catch (err) {
    // Never let audit failure break the main request
    console.error(`[AUDIT_WRITE_ERROR] ${err.message}`);
  }
}

export const audit = { log, EVENTS };
