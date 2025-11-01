export declare const qk: {
    overview: (period: string, project?: string) => readonly ["costscope", "overview", string, string];
    breakdown: (group: string, period: string, project?: string) => readonly ["costscope", "breakdown", string, string, string];
    summary: (period: string, project?: string) => readonly ["costscope", "summary", string, string];
    actionItems: (project?: string) => readonly ["costscope", "actionItems", string];
    dismissActionItem: (id: string) => readonly ["costscope", "actionItems", "dismiss", string];
    providers: () => readonly ["costscope", "providers"];
    datasets: (project?: string) => readonly ["costscope", "datasets", string];
    datasetsSearch: (params: {
        project?: string;
        provider?: string;
        status?: string;
        from?: string;
        to?: string;
        minRecords?: number;
        maxRecords?: number;
        limit?: number;
    }) => readonly ["costscope", "datasetsSearch", string, string, string, string, string, number | "", number | "", number | ""];
};
export type QueryKey = ReturnType<typeof qk.overview> | ReturnType<typeof qk.breakdown> | ReturnType<typeof qk.summary> | ReturnType<typeof qk.actionItems> | ReturnType<typeof qk.dismissActionItem>;
