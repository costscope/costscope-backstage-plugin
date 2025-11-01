// CommonJS Jest setup file. This mirrors the logic in `jest.setup.ts` but is
// written in plain JS so Jest can require it directly during startup.
require('@testing-library/jest-dom');
require('jest-axe/extend-expect');

// Suppress noisy React DOM warnings from jsdom about SVG gradient tags rendered
// outside an <svg> because Recharts is mocked to simple <div> wrappers in tests.
// We still want other errors to surface.
const originalError = console.error;
console.error = (...args) => {
	try {
		const joined = args.map(a => String(a)).join(' ').toLowerCase();
		if (
			joined.includes('warning: the tag <stop> is unrecognized') ||
			joined.includes('warning: the tag <lineargradient> is unrecognized') ||
			joined.includes('warning: the tag <defs> is unrecognized') ||
			joined.includes('warning: <lineargradient /> is using incorrect casing') ||
			// React act(...) noise from async state flushes in tests (React Query notifyManager, MUI ripple)
			(joined.includes('warning: an update to') && joined.includes('inside a test was not wrapped in act'))
		) {
			return;
		}
	} catch (e) {
		// fall through
	}
	originalError(...args);
};

// Global ResizeObserver polyfill for jsdom (Recharts, responsive containers & tests)
if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class {
		constructor(cb) { this._cb = cb; }
		observe(target) {
			queueMicrotask(() => {
				try {
					this._cb([
						{
							target,
							contentRect: (target.getBoundingClientRect && target.getBoundingClientRect()) || {
								x: 0, y: 0, width: (target.offsetWidth || 0), height: (target.offsetHeight || 0),
								top: 0, left: 0, right: 0, bottom: 0,
							},
							borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [],
						}
					], this);
				} catch (e) { /* ignore */ }
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

// Increase default Jest test timeout for this project.
jest.setTimeout(120000);

// Temporarily silence known noisy console.error messages during each test run.
// This reduces log noise while preserving the original behavior for other errors.
const noisyPatterns = [
	/Query data cannot be undefined/i,
	/an update to .* inside a test was not wrapped in act/i,
];

beforeEach(() => {
	// Save original and override
	globalThis.__originalConsoleError = console.error;
	console.error = (...args) => {
		try {
			const joined = args.map(a => String(a)).join(' ');
			for (const p of noisyPatterns) {
				if (p.test(joined)) return;
			}
		} catch (e) {
			// ignore
		}
		globalThis.__originalConsoleError(...args);
	};
});

afterEach(() => {
	if (globalThis.__originalConsoleError) {
		console.error = globalThis.__originalConsoleError;
		delete globalThis.__originalConsoleError;
	}
});
