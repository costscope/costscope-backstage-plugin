/**
 * Append the project query parameter (if provided) to an existing params object.
 * Returns a new object – original `params` is not mutated.
 * @public
 */
export declare function withProjectParam<T extends Record<string, string | undefined>>(params: T, project?: string): T & {
    [k: string]: string | undefined;
};
