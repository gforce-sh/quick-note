import { describe, it, expect } from "vitest";
import { deriveTitle } from "../../src/notes/title";

describe("deriveTitle", () => {
  it("uses the first heading", () => {
    expect(deriveTitle("# Hello world\n\nbody")).toBe("Hello world");
  });

  it("uses a lower-level heading too", () => {
    expect(deriveTitle("### Section")).toBe("Section");
  });

  it("falls back to the first non-empty line when there is no heading", () => {
    expect(deriveTitle("just some text\nmore")).toBe("just some text");
  });

  it("skips leading blank lines", () => {
    expect(deriveTitle("\n\n   indented\n")).toBe("indented");
  });

  it("returns null for empty or whitespace-only bodies", () => {
    expect(deriveTitle("")).toBeNull();
    expect(deriveTitle("   \n\t\n")).toBeNull();
  });
});
