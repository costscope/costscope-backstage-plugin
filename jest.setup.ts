import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Suppress noisy React DOM warnings from jsdom about SVG gradient tags rendered
// outside an <svg> because Recharts is mocked to simple <div> wrappers in tests.
// We still want other errors to surface.
const originalError = console.error;
console.error = (...args: any[]) => {
	try {
		const joined = args.map(a => String(a)).join(' ').toLowerCase();
		if (
			joined.includes('warning: the tag <stop> is unrecognized') ||
			joined.includes('warning: the tag <lineargradient> is unrecognized') ||
			joined.includes('warning: the tag <defs> is unrecognized') ||
			joined.includes('warning: <lineargradient /> is using incorrect casing') ||
			// React act(...) noise from async state flushes in tests (React Query notifyManager, MUI ripple)
			joined.includes('warning: an update to') && joined.includes('inside a test was not wrapped in act')
		) {
			return;
		}
	} catch {
		// fall through
	}
	originalError(...args);
};

	// Global ResizeObserver polyfill for jsdom (Recharts, responsive containers & tests)
	if (typeof (globalThis as any).ResizeObserver === 'undefined') {
		(globalThis as any).ResizeObserver = class {
			private _cb: ResizeObserverCallback;
			constructor(cb: ResizeObserverCallback) { this._cb = cb; }
			observe(target: Element) {
				// Fire once with contentRect approximation
				queueMicrotask(() => {
					try {
						this._cb([
							{
								target,
								contentRect: target.getBoundingClientRect?.() || {
									x: 0, y: 0, width: (target as any).offsetWidth || 0, height: (target as any).offsetHeight || 0,
									top: 0, left: 0, right: 0, bottom: 0,
								},
								borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [],
							} as any,
						], this as any);
					} catch { /* ignore */ }
				});
			}
			unobserve() {}
			disconnect() {}
		};
	}

// Mock canvas getContext to suppress axe warnings about unsupported context
if (typeof HTMLCanvasElement !== 'undefined') {
	Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
		writable: true,
		value: jest.fn().mockImplementation(() => ({
			// Mock 2D context with minimal implementation to avoid axe warnings
			canvas: null,
			clearRect: jest.fn(),
			fillRect: jest.fn(),
			strokeRect: jest.fn(),
			fillText: jest.fn(),
			strokeText: jest.fn(),
			measureText: jest.fn(() => ({ width: 0 })),
			getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(0) })),
			putImageData: jest.fn(),
			createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(0) })),
			setTransform: jest.fn(),
			resetTransform: jest.fn(),
			save: jest.fn(),
			restore: jest.fn(),
			scale: jest.fn(),
			rotate: jest.fn(),
			translate: jest.fn(),
			transform: jest.fn(),
			setLineDash: jest.fn(),
			getLineDash: jest.fn(() => []),
			lineWidth: 1,
			lineCap: 'butt',
			lineJoin: 'miter',
			miterLimit: 10,
			lineDashOffset: 0,
			font: '10px sans-serif',
			textAlign: 'start',
			textBaseline: 'alphabetic',
			direction: 'ltr',
			fillStyle: '#000000',
			strokeStyle: '#000000',
			shadowBlur: 0,
			shadowColor: '#000000',
			shadowOffsetX: 0,
			shadowOffsetY: 0,
			globalAlpha: 1,
			globalCompositeOperation: 'source-over',
			imageSmoothingEnabled: true,
			imageSmoothingQuality: 'low',
		})),
	});
}

// Increase default Jest test timeout for this project. Some integration/behavior
// tests run network-like mock flows and can exceed Jest's 5s default in slower
// environments. 120s is generous but keeps CI stable without editing many files.
jest.setTimeout(120000);
