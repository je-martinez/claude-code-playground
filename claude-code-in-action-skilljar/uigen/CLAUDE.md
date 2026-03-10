# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset database
npm run db:reset

# Prisma migrations (after schema changes)
npx prisma migrate dev
```

## Environment

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. The app works without it — a mock provider returns static code instead of calling Claude.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat, Claude generates JSX/TSX code into a virtual file system, and the result renders live in a sandboxed iframe.

### Request / data flow

1. User types a prompt → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat` via the Vercel AI SDK `useChat` hook.
2. The route (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem` from the serialized files sent in the request body, then streams a `streamText` response powered by `@ai-sdk/anthropic`.
3. Claude uses two tools during generation:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view/create/edit files with str-replace semantics.
   - `file_manager` (`src/lib/tools/file-manager.ts`) — higher-level file operations.
4. Tool calls are handled client-side in `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`), mutating the in-memory `VirtualFileSystem`.
5. On finish, if a `projectId` is provided and the user is authenticated, the full message history and serialized file tree are persisted to SQLite via Prisma.
6. `PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger` and re-renders the preview by:
   - Transpiling all files with Babel standalone (`src/lib/transform/jsx-transformer.ts`).
   - Building a browser import map (blob URLs for local files, `https://esm.sh/` for third-party packages).
   - Injecting the HTML into an `<iframe srcdoc>` sandbox.

### Key abstractions

| Module | Purpose |
|---|---|
| `src/lib/file-system.ts` | In-memory `VirtualFileSystem` — the canonical state for generated files. Serializes to/from plain JSON for transport and storage. |
| `src/lib/transform/jsx-transformer.ts` | Babel-based JSX/TSX → JS transpilation, import map generation, and preview HTML construction. |
| `src/lib/contexts/file-system-context.tsx` | React context wrapping `VirtualFileSystem`; exposes `handleToolCall` so the AI SDK can apply tool results client-side. |
| `src/lib/contexts/chat-context.tsx` | React context wrapping `useChat` from Vercel AI SDK; injects the serialized file tree into every request. |
| `src/lib/auth.ts` | JWT-based session management (HTTP-only cookie, `jose` library). Server-only. |
| `src/lib/provider.ts` | Returns the language model — real Anthropic model when `ANTHROPIC_API_KEY` is set, mock otherwise. |
| `src/lib/prompts/generation.tsx` | System prompt sent to Claude for component generation. |

### Data model (Prisma / SQLite)

- `User` — email + bcrypt password.
- `Project` — belongs to an optional `User`; stores `messages` (JSON array) and `data` (serialized `VirtualFileSystem` as JSON).

### Auth

JWT sessions stored in an `auth-token` HTTP-only cookie (7-day expiry). `src/middleware.ts` handles route protection. Anonymous users can generate components; work is tracked in `src/lib/anon-work-tracker.ts` and can be claimed after sign-up.

### Testing

Tests use Vitest + jsdom + React Testing Library. Test files live next to the code they test under `__tests__/` directories.
