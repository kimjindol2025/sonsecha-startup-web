import { WORKSPACE_ENABLED } from './site-features.js';

// The static HTML already shows the holding message. Disabled means no workspace
// initialization, API requests, role switching, or browser-storage access.
if (WORKSPACE_ENABLED) {
  const unavailable = document.querySelector('#workspaceUnavailable');
  const feature = document.querySelector('#workspaceFeature');
  unavailable.hidden = true;
  feature.hidden = false;
  import('./workspace.js').catch(() => {
    feature.hidden = true;
    unavailable.hidden = false;
  });
}
