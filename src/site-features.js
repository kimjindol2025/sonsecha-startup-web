// Enable only after the customer-facing workspace is ready. Rebuild after changing.
export const WORKSPACE_ENABLED = false;

export function applySiteFeatureVisibility(root = document) {
  root.querySelectorAll('[data-workspace-link]').forEach(link => {
    link.hidden = !WORKSPACE_ENABLED;
  });
}
