import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutosave } from "../src/autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createAutosave", () => {
  it("debounces and saves only the latest body, once", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const a = createAutosave(save, { debounceMs: 2000, retryMs: 5000 });

    a.schedule("a");
    a.schedule("ab");
    a.schedule("abc");
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
  });

  it("transitions saving -> saved on success", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const a = createAutosave(save, { debounceMs: 2000, retryMs: 5000 });
    const seen: string[] = [];
    a.subscribe((s) => seen.push(s));

    a.schedule("x");
    await vi.advanceTimersByTimeAsync(2000);

    expect(seen).toContain("saving");
    expect(a.status()).toBe("saved");
  });

  it("goes to error then retries and recovers", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const a = createAutosave(save, { debounceMs: 2000, retryMs: 5000 });

    a.schedule("x");
    await vi.advanceTimersByTimeAsync(2000);
    expect(a.status()).toBe("error");

    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(a.status()).toBe("saved");
  });
});
