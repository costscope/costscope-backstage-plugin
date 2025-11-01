import { ApiRef, createApiRef } from '@backstage/core-plugin-api';

import type { CostscopeApi } from '../types';

/** Backstage API Ref for Costscope API (typed). */
export const costscopeApiRef: ApiRef<CostscopeApi> = createApiRef({ id: 'plugin.costscope.service' });
