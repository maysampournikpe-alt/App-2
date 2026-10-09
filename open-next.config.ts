import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental cache. Rumbo's pages are static or per-request, and its
// own cache and rate limits are handled in src/lib/finder/limits.ts.
export default defineCloudflareConfig();
