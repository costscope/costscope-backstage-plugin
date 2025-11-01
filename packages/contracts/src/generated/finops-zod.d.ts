import { type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';
export declare const schemas: {
    Provider: z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    Dataset: z.ZodObject<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    CostSummary: z.ZodObject<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    OverviewItem: z.ZodObject<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    BreakdownRow: z.ZodObject<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>;
    ActionItem: z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
};
export declare const api: import("@zodios/core").ZodiosInstance<[{
    method: "get";
    path: "/alerts";
    alias: "getAlerts";
    requestFormat: "json";
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/breakdown";
    alias: "getBreakdown";
    requestFormat: "json";
    parameters: [{
        name: "by";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }, {
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/costs/daily";
    alias: "getCostsdaily";
    requestFormat: "json";
    parameters: [{
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/costs/summary";
    alias: "getCostssummary";
    requestFormat: "json";
    parameters: [{
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }, {
        name: "project";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodObject<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
}, {
    method: "get";
    path: "/datasets";
    alias: "getDatasets";
    requestFormat: "json";
    parameters: [{
        name: "project";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/providers";
    alias: "getProviders";
    requestFormat: "json";
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}]>;
export declare function createApiClient(baseUrl: string, options?: ZodiosOptions): import("@zodios/core").ZodiosInstance<[{
    method: "get";
    path: "/alerts";
    alias: "getAlerts";
    requestFormat: "json";
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        severity: z.ZodEnum<["info", "warn", "critical"]>;
        message: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/breakdown";
    alias: "getBreakdown";
    requestFormat: "json";
    parameters: [{
        name: "by";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }, {
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        dim: z.ZodString;
        cost: z.ZodNumber;
        deltaPct: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/costs/daily";
    alias: "getCostsdaily";
    requestFormat: "json";
    parameters: [{
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        date: z.ZodString;
        cost: z.ZodNumber;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/costs/summary";
    alias: "getCostssummary";
    requestFormat: "json";
    parameters: [{
        name: "period";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }, {
        name: "project";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodObject<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        period: z.ZodString;
        project: z.ZodString;
        totalCost: z.ZodNumber;
        previousTotalCost: z.ZodNumber;
        deltaPct: z.ZodNumber;
        currency: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
}, {
    method: "get";
    path: "/datasets";
    alias: "getDatasets";
    requestFormat: "json";
    parameters: [{
        name: "project";
        type: "Query";
        schema: z.ZodOptional<z.ZodString>;
    }];
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        provider: z.ZodString;
        project: z.ZodString;
        status: z.ZodString;
        records: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        lastIngestedAt: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, {
    method: "get";
    path: "/providers";
    alias: "getProviders";
    requestFormat: "json";
    response: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        displayName: z.ZodString;
        status: z.ZodString;
        services: z.ZodOptional<z.ZodNumber>;
        lastUpdated: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}]>;
