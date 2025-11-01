import { render } from '@testing-library/react';
import React from 'react';
import { CostscopeApi } from '../../client';
export declare function renderWithProviders(ui: React.ReactElement, opts?: {
    mockApi?: Partial<CostscopeApi>;
    featureFlags?: Record<string, boolean>;
}): ReturnType<typeof render>;
