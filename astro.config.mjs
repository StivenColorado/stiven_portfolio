import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel/serverless";
// o si prefieres static:
// import vercel from "@astrojs/vercel/static";

export default defineConfig({
  integrations: [tailwind()],
  output: "server", // o "static" si usas vercel/static
  adapter: vercel(),
});