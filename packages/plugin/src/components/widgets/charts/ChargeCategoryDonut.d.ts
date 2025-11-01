import React from 'react';
/**
 * ChargeCategoryDonut – visual share of cost by charge category (reuses breakdown endpoint).
 * Keeps implementation intentionally light; snapshot + ARIA tests mock recharts heavy internals.
 */
export declare const ChargeCategoryDonut: ({ period, project, maxSlices }: {
    period?: string;
    project?: string;
    maxSlices?: number;
}) => React.JSX.Element;
export default ChargeCategoryDonut;
