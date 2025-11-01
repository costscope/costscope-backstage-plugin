// Minimal react-use mock for tests
export const useCopyToClipboard = () => [{ value: undefined }, () => false] as const;
export const useAsync = () => ({ loading: false, error: undefined, value: undefined });
