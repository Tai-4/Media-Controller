import { youtubeIntegration } from './youtube.js';

// Site-specific UI. Each integration: { matches(location): boolean, install(store): void }.
const siteIntegrations = [
    youtubeIntegration,
];

export function installSiteIntegration(location, store) {
    siteIntegrations.find((integration) => integration.matches(location))?.install(store);
}
