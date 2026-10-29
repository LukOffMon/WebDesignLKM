/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Relative asset paths let the exported site run from any sub-folder
  // (GitHub Pages, a local `python3 -m http.server`, a USB stick...).
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist references the optional Node "canvas" package; it is never used in the browser.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
