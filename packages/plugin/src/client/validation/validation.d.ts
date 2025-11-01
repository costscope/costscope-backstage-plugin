import type { ZodAny } from '../../validationTypes';
export declare function __resetValidationLoggingForTest(): void;
export declare function runtimeValidationEnabled(): boolean;
export declare function computeSchemaHash(): string;
export declare function ensureSchemas(errorApi?: any, force?: boolean): Promise<{
    overview: ZodAny;
    breakdown: ZodAny;
    alerts: ZodAny;
} | undefined>;
export declare function validateIfEnabled(path: string, json: unknown, attempt: number, correlationId: string, validateOverride?: boolean, errorApi?: any): Promise<void>;
