import React from 'react';
/**
 * CardSection – lightweight wrapper that standardizes heading + actions layout
 * for Costscope widgets. Keeps markup minimal to avoid bundle growth.
 *
 * Accessibility: wraps children in a region (unless region=false) with aria-labelledby
 * referencing the heading id. Consumers pass a stable `headingId` so existing
 * tests & snapshots remain valid without churn.
 */
export interface CardSectionProps {
    title: React.ReactNode;
    headingId: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    spacing?: number;
    region?: boolean;
}
export declare const focusRingSx: {
    readonly '&:focus-visible': {
        readonly outline: "2px solid #1976d2";
        readonly outlineOffset: 2;
    };
};
export declare const CardSection: ({ title, headingId, actions, children, spacing, region, }: CardSectionProps) => React.JSX.Element;
export default CardSection;
