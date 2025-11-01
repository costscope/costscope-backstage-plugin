import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';

import { useCacheEvents } from '../../client/hooks';
import { logger } from '../../utils/logger';

type Ev = {
  ts: number;
  type: string;
  path: string;
  error?: unknown;
};

/**
 * Developer diagnostics panel for observing CostscopeClient cache/SWR events.
 * Render only in non-production environments.
 */
export function CacheEventsPanel() {
  const [events, setEvents] = React.useState<Ev[]>([]);

  // Keep only last 200 events
  const push = React.useCallback((e: Ev) => {
    setEvents(prev => {
      const next = prev.length >= 200 ? [...prev.slice(-199), e] : [...prev, e];
      return next;
    });
  }, []);

  useCacheEvents(ev => {
    try {
      push(ev as Ev);
    } catch (e) {
      // Swallow UI errors but surface via centralized logger
      logger.warn('[CacheEventsPanel] failed to record event', e);
    }
  });

  return (
    <Box
      role="region"
      aria-label="Costscope cache and SWR events"
      sx={{
        mt: 2,
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
      data-testid="cache-events-panel"
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">Cache/SWR events (dev)</Typography>
          <Button
            onClick={() => setEvents([])}
            size="small"
            variant="outlined"
            data-testid="cache-events-clear"
          >
            Clear
          </Button>
        </Stack>
        <Box
          component="div"
          sx={{
            fontFamily: 'monospace',
            fontSize: 12,
            maxHeight: 240,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.5,
            p: 1,
            bgcolor: 'background.default',
          }}
        >
          {events.length === 0 ? (
            <Typography component="div" sx={{ opacity: 0.7 }}>
              No events yet — trigger any Costscope request.
            </Typography>
          ) : (
            events.map((e, i) => (
              <div key={i} style={{ color: e.type === 'swr-revalidate-error' ? '#c00' : undefined }}>
                {new Date(e.ts).toLocaleTimeString()} | {e.type} | {e.path}
              </div>
            ))
          )}
        </Box>
      </Stack>
    </Box>
  );
}

export default CacheEventsPanel;
