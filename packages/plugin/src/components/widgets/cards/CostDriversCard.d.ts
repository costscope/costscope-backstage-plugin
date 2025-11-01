import React from 'react';
export interface CostDriversCardProps {
    period?: string;
    project?: string;
    dimension?: string;
    limit?: number;
}
/**
 * CostDriversCard – table of top N cost drivers (dimension, cost, delta percent).
 * Keeps implementation light (no pagination / sorting controls yet).
 */
export declare const CostDriversCard: ({ period, project, dimension, limit }: CostDriversCardProps) => React.JSX.Element;
export default CostDriversCard;
