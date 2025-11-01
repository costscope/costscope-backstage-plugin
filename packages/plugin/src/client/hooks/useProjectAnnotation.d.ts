/**
 * Returns the project annotation value (costscope.io/project) if present on the current entity.
 * Also returns a boolean indicating whether it exists.
 */
/** @public */
export declare function useProjectAnnotation(): {
    project?: string;
    hasProject: boolean;
};
