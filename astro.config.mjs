import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Importante para el despliegue en Vercel
  adapter: vercel(),
  integrations: [tailwind()],
  redirects: {
    '/Portfolio': '/Portfolio'
  }
});

