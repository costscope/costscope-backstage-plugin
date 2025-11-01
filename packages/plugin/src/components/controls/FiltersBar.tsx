import { analyticsApiRef, useApi } from '@backstage/core-plugin-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import React from 'react';

import { DEFAULT_SERVICE_ID } from '../../constants';
import { useI18n } from '../../i18n';

export type PeriodPreset = 'P7D' | 'P30D' | 'P90D';
export type GroupBy = 'ServiceCategory' | 'RegionId';

export interface FiltersBarProps {
  period: PeriodPreset;
  group: GroupBy;
  onChangePeriod: (p: PeriodPreset) => void;
  onChangeGroup: (g: GroupBy) => void;
  disableAnalytics?: boolean;
}

export const FiltersBar = ({
  period,
  group,
  onChangePeriod,
  onChangeGroup,
  disableAnalytics,
}: FiltersBarProps) => {
  let analytics: any | undefined;
  try {
    analytics = useApi(analyticsApiRef);
  } catch {
    analytics = undefined; // optional
  }

  const handlePeriod = (next: PeriodPreset) => {
    if (next === period) return;
    onChangePeriod(next);
    if (!disableAnalytics && analytics?.captureEvent) {
      try {
        analytics.captureEvent({
          context: DEFAULT_SERVICE_ID,
          action: `${DEFAULT_SERVICE_ID}.period.change`,
          subject: next,
          attributes: { previous: period, next, group },
        });
      } catch {/* noop */}
    }
  };

  const handleGroup = (next: GroupBy) => {
    if (next === group) return;
    onChangeGroup(next);
    if (!disableAnalytics && analytics?.captureEvent) {
      try {
        analytics.captureEvent({
          context: DEFAULT_SERVICE_ID,
          action: `${DEFAULT_SERVICE_ID}.group.change`,
          subject: next,
          attributes: { previous: group, next, period },
        });
      } catch {/* noop */}
    }
  };

  const { t } = useI18n();

  return (
    <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
      <ButtonGroup size="small" aria-label="Select period">
        {[
          { value: 'P7D', label: '7D' },
          { value: 'P30D', label: '30D' },
          { value: 'P90D', label: '90D' },
        ].map(p => (
          <Button
            key={p.value}
            variant={period === p.value ? 'contained' : 'outlined'}
            onClick={() => handlePeriod(p.value as PeriodPreset)}
            sx={{ '&:focus-visible': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
          >
            {p.label}
          </Button>
        ))}
      </ButtonGroup>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="costscope-groupby-label">{t('filters.groupby.label')}</InputLabel>
        <Select
          labelId="costscope-groupby-label"
          label={t('filters.groupby.label')}
          value={group}
          onChange={e => handleGroup(e.target.value as GroupBy)}
          sx={{ '& .MuiSelect-select:focus': { outline: '2px solid #1976d2', outlineOffset: 2 } }}
        >
          <MenuItem value="ServiceCategory">Service Category</MenuItem>
          <MenuItem value="RegionId">Region</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};
