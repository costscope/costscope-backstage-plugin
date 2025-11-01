import * as z from 'zod';
export declare const api: {
    overview: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        cost: number;
    }, {
        date: string;
        cost: number;
    }>, "many">;
    breakdown: z.ZodArray<z.ZodObject<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cost: number;
        dim: string;
        deltaPct: number;
    }, {
        cost: number;
        dim: string;
        deltaPct: number;
    }>, "many">;
    alerts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        id: string;
        severity: "info" | "warn" | "critical";
    }, {
        message: string;
        id: string;
        severity: "info" | "warn" | "critical";
    }>, "many">;
};
export default api;
