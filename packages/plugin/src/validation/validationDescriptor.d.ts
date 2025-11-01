export declare const validationDescriptor: {
    readonly overview: "array[{date:string,cost:number}]";
    readonly breakdown: "array[{dim:string,cost:number,deltaPct:number}]";
    readonly alerts: "array[{id:string,severity:info|warn|critical,message:string}]";
};
export declare function computeValidationDescriptorHash(desc?: {
    readonly overview: "array[{date:string,cost:number}]";
    readonly breakdown: "array[{dim:string,cost:number,deltaPct:number}]";
    readonly alerts: "array[{id:string,severity:info|warn|critical,message:string}]";
}): string;
export declare const VALIDATION_DESCRIPTOR_HASH: string;
