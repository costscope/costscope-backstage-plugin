import React from 'react';
export interface TopServicesProps {
    period?: string;
    project?: string;
    /** Group/dimension to aggregate by. Defaults to ServiceCategory */
    group?: 'ServiceCategory' | 'RegionId' | string;
    /** Number of rows to display (by cost desc). Default 5 */
    limit?: number;
}
/**
 * Lightweight Top Services widget using MUI v5 + React Query.
 * Data source: breakdown by ServiceCategory for the selected period/project.
 */
export declare const TopServices: ({ period, project, group, limit }: TopServicesProps) => React.JSX.Element;
