import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The GlobalHeader logo is hot-linked from the WordPress source of truth at
  // almiworld.com so it can be swapped without redeploying every family product.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "almiworld.com" }],
  },

  // The item bank is READ FROM DISK AT REQUEST TIME. src/lib/ch/items.ts does
  // fs.readFileSync(path.join(process.cwd(), "src/data/items", <computed name>)) —
  // the filename is derived from the registry slug, so Next's tracer cannot see it,
  // and nothing ever `import`s these JSON files. Without an explicit include they can
  // be left out of the serverless bundle, loadBundle() hits its `!fs.existsSync`
  // branch, returns [], and every practice module serves ZERO tasks — to a paying
  // user, silently, because a missing bundle is indistinguishable from an unwritten
  // one. Ship the data with the functions that read it.
  outputFileTracingIncludes: {
    "/api/status": ["./src/data/items/**"],
    "/practice/**": ["./src/data/items/**"],
  },
};

export default nextConfig;
