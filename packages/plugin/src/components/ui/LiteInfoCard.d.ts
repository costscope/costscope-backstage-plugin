import Card from '@mui/material/Card';
import React from 'react';
/**
 * Minimal, dependency-light InfoCard replacement using MUI v5 primitives.
 * Avoids pulling in heavy @backstage/core-components for simple card layouts.
 */
export declare const LiteInfoCard: ({ title, children, ...rest }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
} & React.ComponentProps<typeof Card>) => React.JSX.Element;
