// Minimal api descriptor used for CI spec:descriptor check
import * as z from 'zod';

export const api = {
  overview: z.z.array(z.z.object({ date: z.z.string(), cost: z.z.number() })),
  breakdown: z.z.array(
    z.z.object({ dim: z.z.string(), cost: z.z.number(), deltaPct: z.z.number() }),
  ),
  alerts: z.z.array(
    z.z.object({
      id: z.z.string(),
      severity: z.z.enum(['info', 'warn', 'critical']),
      message: z.z.string(),
    }),
  ),
};

export default api;
