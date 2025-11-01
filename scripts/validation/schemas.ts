// Minimal Zod schemas for mock validation (optional, lazy loaded)
import { z } from 'zod';

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
});
export const providersSchema = z.array(providerSchema);

export const datasetSchema = z.object({
  id: z.string(),
  provider: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  records: z.number(),
  status: z.string(),
  createdAt: z.string().optional(),
});
export const datasetsSchema = z.array(datasetSchema);

export const summarySchema = z.object({
  period: z.string(),
  totalCost: z.number(),
  prevPeriodCost: z.number().optional(),
  deltaPct: z.number().optional(),
  currency: z.string().optional(),
});

export const breakdownRowSchema = z.object({ dim: z.string(), cost: z.number(), deltaPct: z.number() });
export const breakdownSchema = z.array(breakdownRowSchema);

export const alertSchema = z.object({ id: z.string(), severity: z.string(), message: z.string() });
export const alertsSchema = z.array(alertSchema);

export const healthSchema = z.object({ status: z.string(), details: z.any().optional() });

export type SchemaMap = Record<string, any>;
export const schemaMap: SchemaMap = {
  '/providers': providersSchema,
  '/datasets': datasetsSchema,
  '/datasets/search': datasetsSchema,
  '/costs/summary': summarySchema,
  '/breakdown': breakdownSchema,
  '/alerts': alertsSchema,
  '/healthz': healthSchema,
};
