import { z } from 'zod';
export declare function validateWith<T>(schema: z.ZodType<T>, data: unknown): T;
export declare function safeValidateWith<T>(schema: z.ZodType<T>, data: unknown): {
    ok: true;
    data: T;
} | {
    ok: false;
    error: z.ZodError;
};
export declare const validateProviders: (data: unknown) => z.objectInputType<{
    id: z.ZodString;
    displayName: z.ZodString;
    status: z.ZodString;
    services: z.ZodOptional<z.ZodNumber>;
    lastUpdated: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">[];
export declare const validateDatasets: (data: unknown) => z.objectInputType<{
    id: z.ZodString;
    provider: z.ZodString;
    project: z.ZodString;
    status: z.ZodString;
    records: z.ZodNumber;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    lastIngestedAt: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">[];
export declare const validateCostDaily: (data: unknown) => z.objectInputType<{
    date: z.ZodString;
    cost: z.ZodNumber;
}, z.ZodTypeAny, "passthrough">[];
export declare const validateCostSummary: (data: unknown) => z.objectInputType<{
    period: z.ZodString;
    project: z.ZodString;
    totalCost: z.ZodNumber;
    previousTotalCost: z.ZodNumber;
    deltaPct: z.ZodNumber;
    currency: z.ZodString;
}, z.ZodTypeAny, "passthrough">;
export declare const validateBreakdown: (data: unknown) => z.objectInputType<{
    dim: z.ZodString;
    cost: z.ZodNumber;
    deltaPct: z.ZodNumber;
}, z.ZodTypeAny, "passthrough">[];
export declare const validateAlerts: (data: unknown) => z.objectInputType<{
    id: z.ZodString;
    severity: z.ZodEnum<["info", "warn", "critical"]>;
    message: z.ZodString;
}, z.ZodTypeAny, "passthrough">[];
export declare function verifyDescriptorHash(opts: {
    descriptorHash: string;
    specHash?: string;
    prefixLength?: number;
}): {
    matches: boolean;
    specHash: string;
    descriptorHash: string;
    comparedSpecFragment: string;
};
