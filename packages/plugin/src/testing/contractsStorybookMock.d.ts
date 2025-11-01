export declare const OPENAPI_SPEC_HASH = "00000000";
export declare function verifyDescriptorHash(opts: {
    descriptorHash: string;
}): {
    matches: boolean;
    comparedSpecFragment: string;
};
