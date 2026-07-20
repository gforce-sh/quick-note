import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

beforeEach(() => localStorage.clear());

describe("useTheme", () => {
  it("defaults to light when localStorage has no entry", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
  });

  it("restores the saved theme from localStorage on mount", () => {
    localStorage.setItem("qn-theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("saves the new theme to localStorage when toggled", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(localStorage.getItem("qn-theme")).toBe("dark");
  });
});
