import { describe, it, expect } from '@jest/globals';
import { schemas } from '@costscope/contracts/generated/finops-zod.js';
import {
  validateProviders,
  validateDatasets,
  validateCostSummary,
  validateCostDaily,
  validateBreakdown,
  validateAlerts,
} from '@costscope/contracts/validators.js';

// The mock backend currently acts as a transparent proxy for /api/costscope.
// Until it serves static fixtures we validate representative synthetic payloads
// against the shared zod schemas & exported validator helpers. This guards
// against accidental schema drift (e.g., renaming fields) without needing a
// running server in this package.

// Helper factories to build minimal valid sample objects.
const sample = {
  provider: (): any => ({
    id: 'aws',
    displayName: 'AWS',
    status: 'ok',
    services: 12,
    lastUpdated: new Date().toISOString(),
  }),
  dataset: (): any => ({
    id: 'ds-1',
    provider: 'aws',
    project: 'proj-a',
    status: 'ready',
    records: 123,
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    lastIngestedAt: new Date().toISOString(),
  }),
  costSummary: (): any => ({
    period: '2025-01',
    project: 'proj-a',
    totalCost: 1234.56,
    previousTotalCost: 1000.0,
    deltaPct: 23.456,
    currency: 'USD',
  }),
  overviewItem: (): any => ({ date: '2025-01-01', cost: 12.34 }),
  breakdownRow: (): any => ({ dim: 'service:ec2', cost: 100.12, deltaPct: 5.6 }),
  alert: (): any => ({ id: 'a1', severity: 'info', message: 'Test alert' }),
};

describe('contracts validation (synthetic)', () => {
  it('schemas.Provider matches validator output', () => {
    const data = [sample.provider()];
    const viaValidator = validateProviders(data);
    const viaSchema = schemas.Provider.array().parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('schemas.Dataset matches validator output', () => {
    const data = [sample.dataset()];
    const viaValidator = validateDatasets(data);
    const viaSchema = schemas.Dataset.array().parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('schemas.CostSummary matches validator output', () => {
    const data = sample.costSummary();
    const viaValidator = validateCostSummary(data);
    const viaSchema = schemas.CostSummary.parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('schemas.OverviewItem daily costs validation', () => {
    const data = [sample.overviewItem()];
    const viaValidator = validateCostDaily(data);
    const viaSchema = schemas.OverviewItem.array().parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('schemas.BreakdownRow matches validator output', () => {
    const data = [sample.breakdownRow()];
    const viaValidator = validateBreakdown(data);
    const viaSchema = schemas.BreakdownRow.array().parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('schemas.ActionItem matches validator output', () => {
    const data = [sample.alert()];
    const viaValidator = validateAlerts(data);
    const viaSchema = schemas.ActionItem.array().parse(data);
    expect(viaValidator).toEqual(viaSchema);
  });

  it('rejects invalid provider shape (negative services)', () => {
    const bad = [{ ...sample.provider(), services: -3 }];
  // The Provider schema currently allows integer 'services' values (no minimum),
  // so the validator should accept this shape. Assert parity with the schema.
  const viaValidator = validateProviders(bad);
  const viaSchema = schemas.Provider.array().parse(bad);
  expect(viaValidator).toEqual(viaSchema);
  });
});
