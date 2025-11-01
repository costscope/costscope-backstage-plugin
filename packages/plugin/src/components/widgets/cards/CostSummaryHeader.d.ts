import React from 'react';
/**
 * CostSummaryHeader – composite widget showing summary metrics + top service share.
 * Period defaults to P30D; uses breakdown(ServiceCategory) to find top N (5) rows.
 */
export declare const CostSummaryHeader: ({ period, project, topN }: {
    period?: string;
    project?: string;
    topN?: number;
}) => React.JSX.Element;
export default CostSummaryHeader;
