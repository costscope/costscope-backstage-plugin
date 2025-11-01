import React from 'react';
/**
 * DatasetFreshnessCard – shows recent ingestion datasets (short metadata) for a project/global.
 * Basic a11y: region landmark, caption, focusable refresh button.
 */
export declare const DatasetFreshnessCard: ({ project, limit }: {
    project?: string;
    limit?: number;
}) => React.JSX.Element;
