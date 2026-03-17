/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove or comment out the export line for Vercel deployment
  // output: 'export',
  
  images: {
    unoptimized: true,
  },
  // If your repo is not at the root domain (like username.github.io/repo-name)
  // basePath: '/internship-platform',
}

export default nextConfig