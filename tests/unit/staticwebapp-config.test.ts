import { describe, expect, it } from 'vitest';
import config from '../../staticwebapp.config.json';

describe('staticwebapp.config.json', () => {
  it('enables Entra ID authentication with required scopes', () => {
    expect(config.auth).toBeDefined();
    const aad = config.auth?.identityProviders?.azureActiveDirectory;
    expect(aad).toBeDefined();
    const loginParameters = aad?.login?.loginParameters ?? [];
    const scopeParam = loginParameters.find((value: string) => value.startsWith('scope='));
    expect(scopeParam).toBeDefined();
    expect(scopeParam).toContain('openid');
    expect(scopeParam).toContain('profile');
    expect(scopeParam).toContain('email');
  });

  it('forces authentication for application routes', () => {
    expect(Array.isArray(config.routes)).toBe(true);
    const protectedRoute = config.routes?.find((route: any) => route.route === '/*');
    expect(protectedRoute).toBeDefined();
    expect(protectedRoute?.allowedRoles).toContain('authenticated');
  });

  it('defines neutral fallback response for unauthorized users', () => {
    expect(typeof config.responseOverrides).toBe('object');
    const unauthorized = (config.responseOverrides as Record<string, any>)?.['401'];
    expect(unauthorized).toBeDefined();
    expect(unauthorized?.rewrite).toBe('/unauthorized/index.html');
    expect(unauthorized?.statusCode).toBe(200);
  });

  it('avoids unreachable routes configuration', () => {
    const coveredRoute = config.routes?.find((route: any) => route.route === '/.auth/*');
    expect(coveredRoute).toBeUndefined();
  });

  it('routes unknown paths to the SPA entry point', () => {
    expect(config.navigationFallback?.rewrite).toBe('/index.html');
    expect(config.navigationFallback?.exclude).toContain('/api/*');
  });
});
