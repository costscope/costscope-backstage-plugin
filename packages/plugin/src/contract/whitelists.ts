/**
 * Whitelists of required & optional fields per mock endpoint. These reflect the
 * minimal UI surface we currently consume. Tests use these to assert that the
 * mock server does not drift or introduce unexpected fields (accidental bloat).
 *
 * If the UI starts using a previously optional field – move it to `required`.
 */

export interface FieldWhitelist {
  required: readonly string[];
  optional: readonly string[];
}

export const providersWhitelist: FieldWhitelist = {
  required: ['id', 'name'],
  optional: ['status'], // ignoring: displayName, services, lastUpdated (mock-only extras)
};

export const datasetsWhitelist: FieldWhitelist = {
  required: ['id', 'provider', 'periodStart', 'periodEnd', 'records', 'status'],
  optional: ['createdAt', 'bytes'], // ignoring: project, lastIngestedAt (renamed createdAt for UI clarity)
};

export const summaryWhitelist: FieldWhitelist = {
  required: ['period', 'totalCost'],
  optional: ['prevPeriodCost', 'deltaPct', 'avgDailyCost', 'startDate', 'endDate', 'currency'],
};

export const breakdownWhitelist: FieldWhitelist = {
  required: ['dim', 'cost', 'deltaPct'],
  optional: [],
};

export const alertsWhitelist: FieldWhitelist = {
  required: ['id', 'severity', 'message'],
  optional: [],
};

export const healthWhitelist: FieldWhitelist = {
  required: ['status'],
  optional: ['details'],
};

export const whitelistByPath: Record<string, FieldWhitelist> = {
  '/providers': providersWhitelist,
  '/datasets': datasetsWhitelist,
  '/datasets/search': datasetsWhitelist,
  '/costs/summary': summaryWhitelist,
  '/breakdown': breakdownWhitelist,
  '/alerts': alertsWhitelist,
  '/healthz': healthWhitelist,
};
