import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/sonsecha-startup-web/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        workspace: resolve(import.meta.dirname, 'workspace.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        koreaTouchlessReport: resolve(import.meta.dirname, 'korea-touchless-report.html'),
        operationsApps: resolve(import.meta.dirname, 'operations-apps.html'),
        carwashAppCatalog: resolve(import.meta.dirname, 'carwash-app-catalog.html'),
        carwashOperationsPlan: resolve(import.meta.dirname, 'carwash-operations-plan.html'),
        carwashOperationsModules: resolve(import.meta.dirname, 'carwash-operations-modules.html'),
        carwashAllSpecs: resolve(import.meta.dirname, 'carwash-all-specs.html'),
        inventoryApp: resolve(import.meta.dirname, 'inventory-app.html'),
        dailyClosingDashboard: resolve(import.meta.dirname, 'daily-closing-dashboard.html'),
        dailyClosing: resolve(import.meta.dirname, 'daily-closing-app.html'),
        salesApp: resolve(import.meta.dirname, 'sales-app.html'),
        wastewaterApp: resolve(import.meta.dirname, 'wastewater-app.html'),
        equipmentApp: resolve(import.meta.dirname, 'equipment-app.html'),
        startupDiaryApp: resolve(import.meta.dirname, 'startup-diary-app.html'),
        gptSite: resolve(import.meta.dirname, 'gpt-site.html'),
      },
    },
  },
});
