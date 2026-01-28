/** @type {import('next').NextConfig} */
const path = require("path");

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

module.exports = {
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  optimizeFonts: true,
  transpilePackages: ['react-image-crop', 'react-toastify'],
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
  },
  async rewrites() {
    const fileFolders = [
      'profile_photo', 'admin_profile_photo', 'company_logo', 'communication',
      'trust_training_records', 'blog_banner', 'resources', 'notice-templates',
      'notices', 'recieved-notices', 'notices_supporting_docs', 'contracts',
      'variations', 'bank_statements', 'retention_trust_certificates',
      'transaction_csv_file_attachments', 'optional_attachments', 'compulsory_attachments',
      'optional_supporting_statement_attachments', 'audit_reports', 'generated_aba_files',
      'Admin_holiday', 'misc', 'notices-generated', 'original-notices-generated'
    ];
    
    const fileFolderRewrites = fileFolders.map(folder => ({
      source: `/${folder}/:path*`,
      destination: `${BACKEND_URL}/${folder}/:path*`,
    }));

    return [
      {
        source: '/graphql',
        destination: `${BACKEND_URL}/graphql`,
      },
      {
        source: '/files/:path*',
        destination: `${BACKEND_URL}/files/:path*`,
      },
      {
        source: '/socket.io/',
        destination: `${BACKEND_URL}/socket.io/`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${BACKEND_URL}/socket.io`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
      {
        source: '/assets/:path*',
        destination: `${BACKEND_URL}/assets/:path*`,
      },
      ...fileFolderRewrites,
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pg.claritazlabs.com",
        port: "3028",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pt-stg.claritazlabs.com",
        port: "3029",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
