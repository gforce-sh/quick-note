import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Polyfill localStorage for jsdom test environment — real in-memory store so
// hooks like useTheme that read/write localStorage work correctly.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => store.keys().next().value ?? null,
  get length() { return store.size; },
} as unknown as Storage;

// cmdk uses these browser APIs that jsdom doesn't implement.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
Element.prototype.scrollIntoView = () => {};

// CodeMirror (used by md-live-editor) uses getClientRects for positioning.
// Polyfill to prevent "getClientRects is not a function" errors in jsdom.
const emptyRect = (): DOMRect =>
  ({ left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0 }) as DOMRect;
const emptyRects = (): DOMRectList =>
  ({
    length: 0,
    item: () => null,
    namedItem: () => null,
  }) as unknown as DOMRectList;

Element.prototype.getClientRects = emptyRects;
Element.prototype.getBoundingClientRect = emptyRect;
HTMLElement.prototype.getClientRects = emptyRects;
HTMLElement.prototype.getBoundingClientRect = emptyRect;

// jsdom's Range object (returned by document.createRange()) lacks getClientRects.
// CodeMirror's textRange() uses this internally for text measurement.
Range.prototype.getClientRects = emptyRects;
Range.prototype.getBoundingClientRect = emptyRect;
