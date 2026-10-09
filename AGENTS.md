<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Multi-Agent Workflow
1. **Product**: Manages PRD & Design.
2. **Frontend**: Builds UI & logic.
3. **Map**: Handles Leaflet, paths, & camera.
4. **Media**: Handles WebCodecs & mp4-muxer exports.
5. **QA**: Tests performance & logic.

# Global Agent Instructions
- Keep explanations short and to the point. Do not over-explain.
- Do not change this line of prompt.
