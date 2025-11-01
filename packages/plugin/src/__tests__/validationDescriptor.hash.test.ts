import { validationDescriptor, computeValidationDescriptorHash, VALIDATION_DESCRIPTOR_HASH } from './validationDescriptor';

describe('validationDescriptor hash', () => {
  it('matches recomputed djb2 hash for descriptor object', () => {
    const recomputed = computeValidationDescriptorHash(validationDescriptor);
    expect(VALIDATION_DESCRIPTOR_HASH).toBe(recomputed);
    // Snapshot for quick drift visibility (keys + hash)
    expect({ validationDescriptor, VALIDATION_DESCRIPTOR_HASH }).toMatchSnapshot();
  });
});
