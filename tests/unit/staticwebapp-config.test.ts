import { describe, expect, it } from 'vitest';
import config from '../../staticwebapp.config.json';

describe('staticwebapp.config.json', () => {
  it('enables Entra ID authentication with required scopes', () => {
    expect(config.auth).toBeDefined();
    const aad = config.auth?.identityProviders?.azureActiveDirectory;
    expect(aad).toBeDefined();
    expect(aad?.registration?.login?.scopes).toContain('openid');
    expect(aad?.registration?.login?.scopes).toContain('profile');
    expect(aad?.registration?.login?.scopes).toContain('email');
  });

  it('forces authentication for application routes', () => {
    expect(Array.isArray(config.routes)).toBe(true);
    const protectedRoute = config.routes?.find((route: any) => route.route === '/*');
    expect(protectedRoute).toBeDefined();
    expect(protectedRoute?.allowedRoles).toContain('authenticated');
  });

  it('defines neutral fallback response for unauthorized users', () => {
    expect(Array.isArray(config.responseOverrides)).toBe(true);
    const unauthorized = config.responseOverrides?.find((entry: any) => entry.statusCode === 401);
    expect(unauthorized).toBeDefined();
    expect(unauthorized?.serve).toBe('/unauthorized/index.html');
  });

  it('routes unknown paths to the SPA entry point', () => {
    expect(config.navigationFallback?.rewrite).toBe('/index.html');
    expect(config.navigationFallback?.exclude).toContain('/api/*');
  });
});
