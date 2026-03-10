import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "call"
): ToolInvocation {
  const base = { toolCallId: "test-id", toolName, args };
  if (state === "result") {
    return { ...base, state, result: {} };
  }
  return { ...base, state };
}

describe("ToolCallBadge", () => {
  describe("str_replace_editor labels", () => {
    it("shows 'Creating <file>' for create command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "create",
            path: "/App.jsx",
          })}
        />
      );
      expect(screen.getByText("Creating App.jsx")).toBeDefined();
    });

    it("shows 'Editing <file>' for str_replace command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "str_replace",
            path: "/src/components/Button.tsx",
          })}
        />
      );
      expect(screen.getByText("Editing Button.tsx")).toBeDefined();
    });

    it("shows 'Editing <file>' for insert command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "insert",
            path: "/Card.tsx",
          })}
        />
      );
      expect(screen.getByText("Editing Card.tsx")).toBeDefined();
    });

    it("shows 'Reading <file>' for view command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "view",
            path: "/index.tsx",
          })}
        />
      );
      expect(screen.getByText("Reading index.tsx")).toBeDefined();
    });
  });

  describe("file_manager labels", () => {
    it("shows 'Renaming <file>' for rename command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("file_manager", {
            command: "rename",
            path: "/OldName.tsx",
            new_path: "/NewName.tsx",
          })}
        />
      );
      expect(screen.getByText("Renaming OldName.tsx")).toBeDefined();
    });

    it("shows 'Deleting <file>' for delete command", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("file_manager", {
            command: "delete",
            path: "/Unused.tsx",
          })}
        />
      );
      expect(screen.getByText("Deleting Unused.tsx")).toBeDefined();
    });
  });

  describe("fallback", () => {
    it("shows the raw tool name for unknown tools", () => {
      render(
        <ToolCallBadge
          toolInvocation={makeInvocation("some_unknown_tool", {})}
        />
      );
      expect(screen.getByText("some_unknown_tool")).toBeDefined();
    });
  });

  describe("status indicator", () => {
    it("shows a spinner when in-progress", () => {
      const { container } = render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "create",
            path: "/App.jsx",
          }, "call")}
        />
      );
      expect(container.querySelector(".animate-spin")).toBeDefined();
      expect(container.querySelector(".bg-emerald-500")).toBeNull();
    });

    it("shows a green dot when done", () => {
      const { container } = render(
        <ToolCallBadge
          toolInvocation={makeInvocation("str_replace_editor", {
            command: "create",
            path: "/App.jsx",
          }, "result")}
        />
      );
      expect(container.querySelector(".bg-emerald-500")).toBeDefined();
      expect(container.querySelector(".animate-spin")).toBeNull();
    });
  });
});
