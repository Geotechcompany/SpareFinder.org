import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    // Temporarily disabled PWA plugin due to dependency issue with es-abstract/2024/Call
    // The manifest.json is still used for install prompts
    // TODO: Re-enable when vite-plugin-pwa dependencies are updated
    // VitePWA({
    //   registerType: 'prompt',
    //   includeAssets: ['favicon.ico', 'sparefinderlogodark.png', 'sparefinderlogo.png'],
    //   manifest: {
    //     name: 'SpareFinder - AI-Powered Spare Parts Identification',
    //     short_name: 'SpareFinder',
    //     description: 'Instantly identify industrial spare parts with AI-powered vision. Upload a photo to get part name, specs and supplier options.',
    //     theme_color: '#8B5CF6',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     orientation: 'portrait',
    //     scope: '/',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: '/sparefinderlogodark.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //         purpose: 'any maskable'
    //       },
    //       {
    //         src: '/sparefinderlogodark.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //         purpose: 'any maskable'
    //       }
    //     ]
    //   },
    //   devOptions: {
    //     enabled: false,
    //     type: 'module'
    //   }
    // }),
    // Temporarily disable lovable-tagger during troubleshooting
    // mode === 'development' && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
