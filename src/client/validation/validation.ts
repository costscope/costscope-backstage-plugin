// Minimal validation placeholder
export function validatePayload(_payload: unknown): { valid: boolean; errors?: string[] } {
	// Accept everything in placeholder implementation
	return { valid: true };
}

export default validatePayload;
