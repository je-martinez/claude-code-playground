import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: unknown) => mockCreateProject(input),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  describe("signIn", () => {
    it("returns the auth result on success", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());

      let authResult: { success: boolean };
      await act(async () => {
        authResult = await result.current.signIn("a@b.com", "password");
      });

      expect(authResult!.success).toBe(true);
      expect(mockSignIn).toHaveBeenCalledWith("a@b.com", "password");
    });

    it("returns the auth result on failure without navigating", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let authResult: { success: boolean; error?: string };
      await act(async () => {
        authResult = await result.current.signIn("a@b.com", "wrong");
      });

      expect(authResult!.success).toBe(false);
      expect(authResult!.error).toBe("Invalid credentials");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("sets isLoading to true during sign in and resets after", async () => {
      let resolveSignIn: (v: { success: boolean }) => void;
      mockSignIn.mockReturnValue(
        new Promise((r) => {
          resolveSignIn = r;
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<unknown>;
      act(() => {
        signInPromise = result.current.signIn("a@b.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading even when signIn action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signIn("a@b.com", "pass")
        ).rejects.toThrow("Network error");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("returns the auth result on success", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());

      let authResult: { success: boolean };
      await act(async () => {
        authResult = await result.current.signUp("a@b.com", "password123");
      });

      expect(authResult!.success).toBe(true);
      expect(mockSignUp).toHaveBeenCalledWith("a@b.com", "password123");
    });

    it("returns the auth result on failure without navigating", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let authResult: { success: boolean; error?: string };
      await act(async () => {
        authResult = await result.current.signUp("a@b.com", "password123");
      });

      expect(authResult!.success).toBe(false);
      expect(authResult!.error).toBe("Email already registered");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("resets isLoading even when signUp action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(
          result.current.signUp("a@b.com", "pass")
        ).rejects.toThrow("Server error");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post-sign-in navigation", () => {
    it("creates a project from anonymous work and navigates to it", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/": { type: "directory" } },
      });
      mockCreateProject.mockResolvedValue({ id: "new-proj-99" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "hello" }],
          data: { "/": { type: "directory" } },
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-proj-99");
    });

    it("navigates to the most recent project when no anon work exists", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "proj-recent" },
        { id: "proj-old" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-recent");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("creates a new project when no anon work and no existing projects", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "fresh-proj" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/fresh-proj");
    });

    it("skips anon work when messages array is empty", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pass");
      });

      // Should not create project from anon work, should navigate to existing
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });
  });
});
