/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async redirects() {
    // Legacy bookmarks from before the state-scoped restructure.
    // /pick3, /pick4 default to Wisconsin (the first state we shipped).
    const subroutes = [
      "",
      "/check",
      "/coverage",
      "/frequency",
      "/gaps",
      "/lookup",
      "/pairs",
      "/positional",
      "/carryover",
      "/streams",
    ];
    return [
      ...subroutes.map((s) => ({
        source: `/pick3${s}`,
        destination: `/wi-pick3${s}`,
        permanent: true,
      })),
      ...subroutes.map((s) => ({
        source: `/pick4${s}`,
        destination: `/wi-pick4${s}`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
