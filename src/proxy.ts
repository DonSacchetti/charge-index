import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals (/_next/* — static files, the image
     * optimizer, dev HMR) and image files. The auth cookie only needs
     * refreshing on real page and route requests; Server Actions post to page
     * paths, not /_next, so they still pass through.
     */
    "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
