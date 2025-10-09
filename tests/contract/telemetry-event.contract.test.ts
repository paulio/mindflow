import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../specs/010-host-the-application/contracts/telemetry-event.contract.json';
import requestEvent from '../fixtures/azure/telemetry-request-event.json';
import deploymentEvent from '../fixtures/azure/telemetry-deployment-event.json';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);

describe('Telemetry event contract', () => {
  it('accepts valid http_request events', () => {
    expect(validate(requestEvent)).toBe(true);
  });

  it('accepts valid deployment_status events', () => {
    expect(validate(deploymentEvent)).toBe(true);
  });

  it('rejects events with mismatched structure for type', () => {
    const invalid = {
      ...requestEvent,
      eventType: 'deployment_status',
      deployment: deploymentEvent.deployment,
    };

    expect(validate(invalid)).toBe(false);
  });
});
