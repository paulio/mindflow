import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../specs/010-host-the-application/contracts/auth-profile.contract.json';
import authProfileFixture from '../fixtures/azure/auth-profile.json';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateAuthProfile = ajv.compile(schema);

describe('Azure Static Web Apps auth profile contract', () => {
  it('accepts a valid Entra ID profile', () => {
    expect(validateAuthProfile(authProfileFixture)).toBe(true);
  });

  it('rejects profiles from other identity providers', () => {
    const invalidProfile = {
      ...authProfileFixture,
      clientPrincipal: {
        ...authProfileFixture.clientPrincipal,
        identityProvider: 'twitter'
      }
    };

    expect(validateAuthProfile(invalidProfile)).toBe(false);
  });
});
