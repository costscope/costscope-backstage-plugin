export interface PointLike {
    date: string;
    cost: number;
    [k: string]: any;
}
export declare function computeAdaptiveMaxPoints(width: number | undefined | null, { pxPerPoint, minPoints, maxPoints, fallbackPoints, }?: {
    pxPerPoint?: number;
    minPoints?: number;
    maxPoints?: number;
    fallbackPoints?: number;
}): number;
export declare function downsampleAdaptive<T extends PointLike>(data: T[] | undefined | null, width: number | undefined | null, opts?: {
    pxPerPoint?: number;
    minPoints?: number;
    maxPoints?: number;
    fallbackPoints?: number;
}): T[];
export declare function downsampleLTOB<T extends PointLike>(data: T[] | undefined | null, maxPoints?: number): T[];
