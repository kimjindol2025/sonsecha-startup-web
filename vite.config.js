import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        koreaTouchlessReport: resolve(import.meta.dirname, 'korea-touchless-report.html'),
        operationsApps: resolve(import.meta.dirname, 'operations-apps.html'),
        carwashAppCatalog: resolve(import.meta.dirname, 'carwash-app-catalog.html'),
        inventoryApp: resolve(import.meta.dirname, 'inventory-app.html'),
        salesApp: resolve(import.meta.dirname, 'sales-app.html'),
        wastewaterApp: resolve(import.meta.dirname, 'wastewater-app.html'),
        equipmentApp: resolve(import.meta.dirname, 'equipment-app.html'),
        startupDiaryApp: resolve(import.meta.dirname, 'startup-diary-app.html'),
        gptSite: resolve(import.meta.dirname, 'gpt-site.html'),
      },
    },
  },
});
