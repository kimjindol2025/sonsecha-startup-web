import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        home: resolve(import.meta.dirname, 'home.html'),
        permit: resolve(import.meta.dirname, 'permit.html'),
        guide: resolve(import.meta.dirname, 'guide.html'),
        blog: resolve(import.meta.dirname, 'blog.html'),
        blogPost: resolve(import.meta.dirname, 'blog-post.html'),
        insurance: resolve(import.meta.dirname, 'insurance.html'),
        employment: resolve(import.meta.dirname, 'employment.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        adminLogin: resolve(import.meta.dirname, 'admin-login.html'),
        workspace: resolve(import.meta.dirname, 'workspace.html'),
      },
    },
  },
});
