import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// cmdk uses these browser APIs that jsdom doesn't implement.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
Element.prototype.scrollIntoView = () => {};
