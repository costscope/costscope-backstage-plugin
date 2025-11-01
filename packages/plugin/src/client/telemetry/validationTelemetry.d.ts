export interface ValidationEventRecord {
    path: string;
    success: boolean;
    durationMs: number;
    schema: 'overview' | 'breakdown' | 'alerts' | 'unknown';
    ts: number;
    errorMessage?: string;
    schemaHash?: string;
}
export declare function recordValidationEvent(r: Omit<ValidationEventRecord, 'ts'>): void;
export declare function getValidationRecords(): ValidationEventRecord[];
export declare function clearValidationRecords(): void;
export interface ValidationAggregateRow {
    schema: string;
    countSuccess: number;
    countError: number;
    avgMs: number;
    p95Ms?: number;
}
export declare function printValidationSummary(): void;
export declare function getValidationMetrics(): any;
declare global {
    interface Window {
        costscopePrintValidationSummary?: () => void;
    }
}
