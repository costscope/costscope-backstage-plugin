import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { usePrefetchOnVisibility } from './usePrefetchOnVisibility';

// Simple IntersectionObserver stub exposing manual trigger
class IOStub {
  static last: IOStub | null = null;
  private cb: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb;
    IOStub.last = this;
  }
  observe() {}
  disconnect() {}
  trigger(isIntersecting = true) {
    this.cb([{ isIntersecting } as any], this as any);
  }
}

describe('usePrefetchOnVisibility', () => {
  beforeEach(() => {
    (globalThis as any).IntersectionObserver = IOStub as any;
    IOStub.last = null;
  });

  it('invokes callback once by default', async () => {
    const fn = jest.fn();
    const Harness = () => {
      const { ref, hasPrefetched } = usePrefetchOnVisibility(fn);
      return <div ref={ref as any}>{hasPrefetched ? 'done' : 'idle'}</div>;
    };
    render(<Harness />);
    await act(async () => {
      IOStub.last!.trigger();
      await Promise.resolve();
    });
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await act(async () => {
      IOStub.last!.trigger();
      await Promise.resolve();
    });
    // still one call after second trigger
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supports multiple triggers when once=false', () => {
    const fn = jest.fn();
    const Harness = () => {
      const { ref } = usePrefetchOnVisibility(fn, { once: false });
      return <div ref={ref as any}>multi</div>;
    };
    render(<Harness />);
    act(() => {
      IOStub.last!.trigger();
    });
    act(() => {
      IOStub.last!.trigger();
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('falls back to immediate run when observer unsupported', async () => {
    delete (globalThis as any).IntersectionObserver;
    const fn = jest.fn();
    const Harness = () => {
      const { ref, hasPrefetched } = usePrefetchOnVisibility(fn);
      return <div ref={ref as any}>{hasPrefetched ? 'done' : 'idle'}</div>;
    };
    const { findByText } = render(<Harness />);
    await findByText('done');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
