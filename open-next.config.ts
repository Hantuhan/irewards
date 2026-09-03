import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Incremental cache can be switched to R2 once NEXT_INC_CACHE_R2_BUCKET is bound.
export default defineCloudflareConfig({});
