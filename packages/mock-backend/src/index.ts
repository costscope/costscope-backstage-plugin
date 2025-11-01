import { startMockBackend } from './server';

const PORT = process.env.PORT ? Number(process.env.PORT) : 7008;
const MOCK_TARGET = process.env.MOCK_TARGET || 'http://localhost:7007';

// Fire and forget boot for CLI usage; programmatic tests import startMockBackend directly.
startMockBackend({ port: PORT, target: MOCK_TARGET }).catch(err => {
  process.stderr.write(`mock-backend failed to start: ${err}\n`);
  process.exit(1);
});

