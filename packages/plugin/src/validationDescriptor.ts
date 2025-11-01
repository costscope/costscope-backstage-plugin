// Central manual lightweight runtime validation descriptor used to build zod schemas.
// Keep in sync with OpenAPI spec + generated types. Hash compared in CI via spec:descriptor.
export const validationDescriptor = {
  overview: 'array[{date:string,cost:number}]',
  breakdown: 'array[{dim:string,cost:number,deltaPct:number}]',
  alerts: 'array[{id:string,severity:info|warn|critical,message:string}]',
} as const;

// Stable djb2 hash – exported for tests/scripts.
export function computeValidationDescriptorHash(desc = validationDescriptor): string {
  const json = JSON.stringify(desc);
  let h = 5381;
  for (let i = 0; i < json.length; i += 1) h = (h * 33) ^ json.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const VALIDATION_DESCRIPTOR_HASH = computeValidationDescriptorHash();
