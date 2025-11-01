import { PROJECT_QUERY_PARAM } from '../constants';

/**
 * Append the project query parameter (if provided) to an existing params object.
 * Returns a new object – original `params` is not mutated.
 * @public
 */
export function withProjectParam<T extends Record<string, string | undefined>>(
  params: T,
  project?: string,
): T & { [k: string]: string | undefined } {
  if (!project) return params;
  return { ...params, [PROJECT_QUERY_PARAM]: project };
}
