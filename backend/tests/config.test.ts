import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveJwtSecret } from '../src/config/env.js';

describe('JWT secret configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows development fallback secrets outside production', () => {
    vi.stubEnv('NODE_ENV', 'test');

    expect(resolveJwtSecret('JWT_ACCESS_SECRET', undefined, 'dev-access-secret')).toBe('dev-access-secret');
  });

  it('rejects missing, weak, and example secrets in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => resolveJwtSecret('JWT_ACCESS_SECRET', undefined, 'dev-access-secret')).toThrow('JWT_ACCESS_SECRET');
    expect(() => resolveJwtSecret('JWT_ACCESS_SECRET', 'short-secret', 'dev-access-secret')).toThrow('JWT_ACCESS_SECRET');
    expect(() => resolveJwtSecret('JWT_ACCESS_SECRET', 'replace_me_with_a_long_random_secret', 'dev-access-secret')).toThrow('JWT_ACCESS_SECRET');
  });

  it('accepts a sufficiently strong production secret', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(resolveJwtSecret('JWT_ACCESS_SECRET', 'random-production-secret-with-more-than-32-chars', 'fallback')).toBe(
      'random-production-secret-with-more-than-32-chars'
    );
  });
});
