import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function emptyRouteFallback() {
  const rewrite = (url?: string | null) => {
    if (!url) return url
    const pathname = url.split('?')[0]
    if (
      pathname === '/signup' ||
      pathname === '/signup/' ||
      pathname === '/login' ||
      pathname === '/login/' ||
      pathname === '/reset' ||
      pathname === '/reset/' ||
      pathname === '/dashboard' ||
      pathname === '/dashboard/' ||
      pathname.startsWith('/dashboard/')
    ) {
      return '/index.html'
    }
    return url
  }

  return {
    name: 'empty-route-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url) ?? req.url
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url) ?? req.url
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    emptyRouteFallback(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    port: 5173,
    strictPort: false,
    // Figma Make uses secure HMR; plain HTTP works for local development.
    hmr: process.env.FIGMA_MAKE
      ? { protocol: 'wss' }
      : true,
  },
})
