// Verifies key text and primary/secondary color contrast meets WCAG AA in high-contrast theme
// Uses jest-axe to compute contrast on rendered DOM

/// <reference path="../types/jest-axe.d.ts" />
import React from 'react';
// Run only the color-contrast rule to keep execution fast and reduce flake
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { configureAxe } = require('jest-axe');
// Limit to a single rule and a single run per file to avoid concurrent axe invocations
const axe = configureAxe({ runOnly: { type: 'rule', values: ['color-contrast'] } });
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { highContrastTheme } from './highContrastTheme';

function renderWithHC(ui: React.ReactElement) {
  return render(<ThemeProvider theme={highContrastTheme}>{ui}</ThemeProvider>);
}

describe('High-contrast theme color ratios', () => {
  // Increase timeout a bit for axe in CI
  // Match global timeout defined in jest.setup.ts
  jest.setTimeout(120000);

  it('primary button and secondary text meet contrast requirements on paper background', async () => {
    const { container } = renderWithHC(
      <Paper elevation={0} sx={{ p: 2 }}>
        <Button variant="contained" color="primary">Action</Button>
        {/* MUI v5 uses palette key notation */}
        <Typography color="text.secondary">Subtle text</Typography>
      </Paper>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
