import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import React from 'react';

/**
 * Minimal, dependency-light InfoCard replacement using MUI v5 primitives.
 * Avoids pulling in heavy @backstage/core-components for simple card layouts.
 */
export const LiteInfoCard = ({ title, children, ...rest }: { title?: React.ReactNode; children?: React.ReactNode } & React.ComponentProps<typeof Card>) => (
  <Card variant="outlined" {...rest}>
    {title ? <CardHeader title={title} /> : null}
    <CardContent>{children}</CardContent>
  </Card>
);
