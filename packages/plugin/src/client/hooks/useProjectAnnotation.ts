import { useEntity } from '@backstage/plugin-catalog-react';

import { PROJECT_ANNOTATION } from '../../constants';

/**
 * Returns the project annotation value (costscope.io/project) if present on the current entity.
 * Also returns a boolean indicating whether it exists.
 */
/** @public */
export function useProjectAnnotation(): { project?: string; hasProject: boolean } {
  const { entity } = useEntity();
  const project = (entity?.metadata as any)?.annotations?.[PROJECT_ANNOTATION] as string | undefined;
  return { project, hasProject: Boolean(project) };
}
