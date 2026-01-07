import { describe, expect, it } from 'vitest';
import { isAdminAuthorized } from './auth';

describe('isAdminAuthorized', () => {
  it('accepts matching Bearer token when ADMIN_TOKEN is set', () => {
    const req = new Request('https://example.com/admin/stats', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(isAdminAuthorized(req, { ADMIN_TOKEN: 'secret' })).toBe(true);
  });

  it('rejects missing/incorrect token when ADMIN_TOKEN is set', () => {
    const reqMissing = new Request('https://example.com/admin/stats');
    expect(isAdminAuthorized(reqMissing, { ADMIN_TOKEN: 'secret' })).toBe(false);

    const reqWrong = new Request('https://example.com/admin/stats', {
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(isAdminAuthorized(reqWrong, { ADMIN_TOKEN: 'secret' })).toBe(false);
  });

  it('allows localhost admin requests without a token when ADMIN_TOKEN is unset', () => {
    const req = new Request('http://localhost:8787/admin/stats');
    expect(isAdminAuthorized(req, {})).toBe(true);
  });

  it('rejects non-localhost admin requests without a token when ADMIN_TOKEN is unset', () => {
    const req = new Request('https://example.com/admin/stats');
    expect(isAdminAuthorized(req, {})).toBe(false);
  });
});
