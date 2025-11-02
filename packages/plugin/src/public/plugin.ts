// Simplified Variant A: require a recent @backstage/frontend-plugin-api (peer dependency)
// and use its primitives directly — no dynamic require or conditional fallbacks.
import { DEFAULT_SERVICE_ID } from '../constants';

// Plugin root descriptor (extension stubs removed in favor of manual routing).
// Breaking (documented): removed CostscopePageExtension & EntityCostscopeContentExtension.
/** @public */
export const costscope: any = { id: DEFAULT_SERVICE_ID, extensions: [] };

// NOTE: Former stub exports provided no behavior and were misleading about automatic
// route/tab registration. Consumers should mount <CostscopePage /> explicitly.

