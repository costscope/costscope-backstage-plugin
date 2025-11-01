import React from 'react';
export interface DatasetsSearchPanelProps {
    project?: string;
    provider?: string;
    status?: string;
    from?: string;
    to?: string;
    minRecords?: number;
    maxRecords?: number;
    limit?: number;
}
/** Minimal datasets search results table (no pagination yet). */
export declare const DatasetsSearchPanel: (filters: DatasetsSearchPanelProps) => React.JSX.Element;
