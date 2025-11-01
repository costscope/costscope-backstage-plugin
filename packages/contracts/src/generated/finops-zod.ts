import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

const Provider = z
  .object({
    id: z.string(),
    displayName: z.string(),
    status: z.string(),
    services: z.number().int().optional(),
    lastUpdated: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const Dataset = z
  .object({
    id: z.string(),
    provider: z.string(),
    project: z.string(),
    status: z.string(),
    records: z.number().int(),
    periodStart: z.string(),
    periodEnd: z.string(),
    lastIngestedAt: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough();
const CostSummary = z
  .object({
    period: z.string(),
    project: z.string(),
    totalCost: z.number(),
    previousTotalCost: z.number(),
    deltaPct: z.number(),
    currency: z.string(),
  })
  .passthrough();
const OverviewItem = z.object({ date: z.string(), cost: z.number() }).passthrough();
const BreakdownRow = z
  .object({ dim: z.string(), cost: z.number(), deltaPct: z.number() })
  .passthrough();
const ActionItem = z
  .object({ id: z.string(), severity: z.enum(['info', 'warn', 'critical']), message: z.string() })
  .passthrough();

export const schemas = {
  Provider,
  Dataset,
  CostSummary,
  OverviewItem,
  BreakdownRow,
  ActionItem,
};

const endpoints = makeApi([
  {
    method: 'get',
    path: '/alerts',
    alias: 'getAlerts',
    requestFormat: 'json',
    response: z.array(ActionItem),
  },
  {
    method: 'get',
    path: '/breakdown',
    alias: 'getBreakdown',
    requestFormat: 'json',
    parameters: [
      {
        name: 'by',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'period',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.array(BreakdownRow),
  },
  {
    method: 'get',
    path: '/costs/daily',
    alias: 'getCostsdaily',
    requestFormat: 'json',
    parameters: [
      {
        name: 'period',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.array(OverviewItem),
  },
  {
    method: 'get',
    path: '/costs/summary',
    alias: 'getCostssummary',
    requestFormat: 'json',
    parameters: [
      {
        name: 'period',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'project',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: CostSummary,
  },
  {
    method: 'get',
    path: '/datasets',
    alias: 'getDatasets',
    requestFormat: 'json',
    parameters: [
      {
        name: 'project',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.array(Dataset),
  },
  {
    method: 'get',
    path: '/providers',
    alias: 'getProviders',
    requestFormat: 'json',
    response: z.array(Provider),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
