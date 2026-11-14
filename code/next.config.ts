import type { NextConfig } from "next";

const demoBuild = process.env.VERCEL === "1" || process.env.SAELLA_DEMO_BUILD === "1";

const nextConfig: NextConfig = {
  // Design-system server (`npm run dev:ds`) builds into its own folder so both servers can run at once.
  distDir: process.env.APP_SURFACE === "ds" ? ".next-ds" : ".next",
  // Let teammates on the same office Wi-Fi open the dev servers by IP (2026-10-28). Next 16 blocks dev assets
  // for any origin other than localhost unless it is listed here. Add your machine's LAN address if it changes.
  allowedDevOrigins: ["192.168.1.39", "192.168.1.*"],
  // The floating "N" dev-tools button sat on top of the account avatar in the sidebar (2026-10-29). Build and
  // runtime errors still open the overlay.
  devIndicators: false,
  // The shared demo build turns these off: most screens read the URL outside <Suspense>, which cacheComponents
  // refuses to prerender. Vercel sets VERCEL=1 on its builds by itself (no project setting needed);
  // SAELLA_DEMO_BUILD=1 does the same for a local `next build`. Local dev keeps them on.
  cacheComponents: !demoBuild,
  partialPrefetching: !demoBuild,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
