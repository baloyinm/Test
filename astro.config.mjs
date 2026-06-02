import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://infinae-web.vercel.app',
  output: 'server',
  adapter: vercel(),
});
