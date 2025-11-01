import { test, expect } from '@playwright/test';
import { fetchJson } from './utils';

// Verifies core mock API endpoints (directly against mock server) plus one forced error.
// We bypass the Backstage proxy to avoid race conditions where the backend dev server
// serves index.html before proxy wiring is fully ready.

const period = 'P7D';
const mockBase = process.env.MOCK_BASE || 'http://localhost:7100/api/costscope';


test.describe('Costscope mock API endpoints (direct)', () => {
  test('core endpoints return expected JSON', async () => {
  const health = await fetchJson(`${mockBase}/healthz`, 200);
    expect(health.status || health.state).toBeDefined();

  const daily = await fetchJson(`${mockBase}/costs/daily?period=${period}`, 200);
    expect(Array.isArray(daily) && daily.length > 0).toBeTruthy();

  const breakdown = await fetchJson(`${mockBase}/breakdown?by=ServiceCategory&period=${period}`, 200);
    expect(Array.isArray(breakdown) && breakdown.length > 0).toBeTruthy();

  const summary = await fetchJson(`${mockBase}/costs/summary?period=${period}`, 200);
    expect(summary).toHaveProperty('totalCost');

  const alerts = await fetchJson(`${mockBase}/alerts`, 200);
    expect(Array.isArray(alerts)).toBeTruthy();
  });

  test('forced 503 error path (summary)', async () => {
    const res = await fetch(`${mockBase}/costs/summary?period=${period}&forceError=503`);
    expect(res.status).toBe(503);
  });
});
