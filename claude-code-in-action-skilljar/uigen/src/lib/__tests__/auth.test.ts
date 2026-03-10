// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

// Must be mocked before importing auth
vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are in place
const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  it("sets the auth-token cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
  });

  it("sets the cookie with httpOnly and correct options", async () => {
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  it("stores a verifiable JWT containing userId and email", async () => {
    await createSession("user-42", "test@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("test@example.com");
  });
});

describe("getSession", () => {
  it("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@b.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-1");
    expect(session!.email).toBe("a@b.com");
  });

  it("returns null for a tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "a@b.com" },
      "-1s" // already expired
    );
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  it("deletes the auth-token cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

describe("verifySession", () => {
  function makeRequest(token?: string): NextRequest {
    const req = new NextRequest("http://localhost/");
    if (token) {
      req.cookies.set(COOKIE_NAME, token);
    }
    return req;
  }

  it("returns null when request has no cookie", async () => {
    const session = await verifySession(makeRequest());

    expect(session).toBeNull();
  });

  it("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-99", email: "x@y.com" });

    const session = await verifySession(makeRequest(token));

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-99");
    expect(session!.email).toBe("x@y.com");
  });

  it("returns null for an invalid token", async () => {
    const session = await verifySession(makeRequest("garbage.token.here"));

    expect(session).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await makeToken(
      { userId: "user-1", email: "a@b.com" },
      "-1s"
    );

    const session = await verifySession(makeRequest(token));

    expect(session).toBeNull();
  });
});
