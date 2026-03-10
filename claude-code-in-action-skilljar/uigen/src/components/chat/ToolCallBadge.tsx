"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    const file = getFileName((args.path as string) ?? "");
    switch (command) {
      case "create":
        return `Creating ${file}`;
      case "str_replace":
      case "insert":
        return `Editing ${file}`;
      case "view":
        return `Reading ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    const file = getFileName((args.path as string) ?? "");
    switch (command) {
      case "rename":
        return `Renaming ${file}`;
      case "delete":
        return `Deleting ${file}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const isDone = state === "result";
  const label = getLabel(toolName, args as Record<string, unknown>);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
