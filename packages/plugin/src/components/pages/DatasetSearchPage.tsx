// MUI
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React from 'react';

// Internal hooks & components
import { useProjectAnnotation } from '../../client/hooks';
import { useI18n } from '../../i18n';
import { DatasetsSearchPanel } from '../widgets/panels/DatasetsSearchPanel';

/**
 * DatasetSearchPage – lightweight filter UI + results panel. Lazy-loaded (see lazy export wrapper).
 * Filters are fully client-side; submitting updates local state which propagates to panel via props.
 */
export const DatasetSearchPage = () => {
  const { project } = useProjectAnnotation();
  const { t } = useI18n();
  const [form, setForm] = React.useState({
    provider: '',
    status: '',
    from: '',
    to: '',
    minRecords: '',
    maxRecords: '',
    limit: '20',
  });
  const [submitted, setSubmitted] = React.useState<any>({});

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: any = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') {
        if (['minRecords', 'maxRecords', 'limit'].includes(k)) {
          const num = Number(v);
          if (!Number.isNaN(num)) next[k] = num;
        } else {
          next[k] = v;
        }
      }
    });
    if (project) next.project = project; // auto apply entity project if present
    setSubmitted(next);
  };

  return (
    <Stack spacing={3} sx={{ p: 2 }} role="region" aria-label={t('datasets.page.aria')}>
      <Typography variant="h4" component="h1">{t('datasets.page.heading')}</Typography>
      <Paper component="form" onSubmit={onSubmit} sx={{ p: 2 }} aria-labelledby="dataset-search-form-heading">
        <Stack spacing={2}>
          <Typography id="dataset-search-form-heading" variant="h6" component="h2" sx={{ m: 0 }}>
            {t('datasets.filters.heading')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('datasets.filters.provider')}
              name="provider"
              value={form.provider}
              onChange={onChange}
              size="small"
              placeholder="aws,azure"
            />
            <TextField
              label={t('datasets.filters.status')}
              name="status"
              value={form.status}
              onChange={onChange}
              size="small"
              select
            >
              <MenuItem value="">{t('datasets.filters.any')}</MenuItem>
              <MenuItem value="ready">ready</MenuItem>
              <MenuItem value="ingesting">ingesting</MenuItem>
              <MenuItem value="error">error</MenuItem>
            </TextField>
            <TextField
              label={t('datasets.filters.limit')}
              name="limit"
              value={form.limit}
              onChange={onChange}
              size="small"
              type="number"
              inputProps={{ min: 1, max: 100 }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('datasets.filters.from')}
              name="from"
              value={form.from}
              onChange={onChange}
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('datasets.filters.to')}
              name="to"
              value={form.to}
              onChange={onChange}
              size="small"
              type="date"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('datasets.filters.minRecords')}
              name="minRecords"
              value={form.minRecords}
              onChange={onChange}
              size="small"
              type="number"
              inputProps={{ min: 0 }}
            />
            <TextField
              label={t('datasets.filters.maxRecords')}
              name="maxRecords"
              value={form.maxRecords}
              onChange={onChange}
              size="small"
              type="number"
              inputProps={{ min: 0 }}
            />
          </Stack>
          <Divider />
          <Stack direction="row" spacing={2}>
            <Button variant="contained" size="small" type="submit" aria-label={t('datasets.filters.apply.aria')}>
              {t('datasets.filters.apply')}
            </Button>
            <Button
              variant="outlined"
              size="small"
              type="button"
              onClick={() => { setForm({ provider: '', status: '', from: '', to: '', minRecords: '', maxRecords: '', limit: '20' }); setSubmitted({ project }); }}
            >
              {t('datasets.filters.reset')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
      <DatasetsSearchPanel {...submitted} />
    </Stack>
  );
};

export default DatasetSearchPage;
