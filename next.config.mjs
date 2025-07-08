/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['aws-sdk']
  },
  // Improve CSS loading in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Ensure splitChunks and cacheGroups exist
      if (!config.optimization.splitChunks) {
        config.optimization.splitChunks = { cacheGroups: {} }
      }
      if (!config.optimization.splitChunks.cacheGroups) {
        config.optimization.splitChunks.cacheGroups = {}
      }
      
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.css$/,
        chunks: 'all',
        enforce: true,
      }
    }
    return config
  },
  // Ensure CSS is properly optimized
  swcMinify: true,
}

export default nextConfig