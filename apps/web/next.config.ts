import type { NextConfig } from "next";

const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

function getSupabaseHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
}

export default nextConfig;
