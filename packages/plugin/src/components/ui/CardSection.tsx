import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
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
  headingId: string; // stable id used by aria-labelledby
  actions?: React.ReactNode; // right side inline actions (e.g. refresh button)
  children: React.ReactNode;
  spacing?: number;
  region?: boolean;
}

export const focusRingSx = { '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } } as const;

export const CardSection = ({
  title,
  headingId,
  actions,
  children,
  spacing = 1,
  region = true,
}: CardSectionProps) => {
  return (
    <Stack spacing={spacing} role={region ? 'region' : undefined} aria-labelledby={region ? headingId : undefined}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 0 }}>
          {title}
        </Typography>
        {actions}
      </Stack>
      {children}
    </Stack>
  );
};

export default CardSection;
