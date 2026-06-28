import { login, logout } from "../src/api";

function mockFetch(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("api.login", () => {
  it("returns ok on 200", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { ok: true }));

    await expect(login("1234")).resolves.toEqual({ ok: true });
  });

  it("returns invalid on 401", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "invalid passcode" }));

    await expect(login("0000")).resolves.toEqual({ ok: false, reason: "invalid" });
  });

  it("returns locked on 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, { error: "locked" }));

    await expect(login("0000")).resolves.toEqual({ ok: false, reason: "locked" });
  });

  it("logout posts to /api/logout", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
