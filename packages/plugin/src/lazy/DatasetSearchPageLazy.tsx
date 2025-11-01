import React from 'react';

// Small wrapper so consumers can import { DatasetSearchPageLazy } and get a lazily loaded page chunk.
// The heavy filter + table logic lives in the dynamically imported file.
export const DatasetSearchPageLazy = React.lazy(() => import('../components/pages/DatasetSearchPage'));
