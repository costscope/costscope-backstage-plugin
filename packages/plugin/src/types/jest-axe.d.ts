declare module 'jest-axe' {
  export const axe: any;
}

declare global {
  namespace jest {
  interface Matchers<R> { toHaveNoViolations(): R }
  }
}

export {};
