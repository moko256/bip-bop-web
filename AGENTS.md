## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, playwright, sveltekit-adapter, paraglide, ai-tools

## Svelte MCP

### list-sections

On any Svelte or SvelteKit question, call this first. It returns sections with titles, `use_cases`, and paths.

### get-documentation

After `list-sections`, read each section's `use_cases` and fetch every section the task needs. One call accepts one or many sections.

### svelte-autofixer

Before sending Svelte you wrote, run this and repeat until it reports no issues or suggestions.

### playground-link

When the finished code stays outside the project, ask if they want a Playground link. Call this only after they say yes.

## Cloud Agent

On startup, pull the latest `origin` once.

When sharing or analyzing a page Playwright can operate, copy an existing test and screenshot from it. For a full-page shot, copy `e2e/full-page-screenshot.e2e.ts` and save the images under `/opt/cursor/artifacts/`.
