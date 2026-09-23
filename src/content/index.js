import { AudioGraph } from './audio-graph.js';
import { MediaController } from './media-controller.js';
import { findMediaElements } from './media-discovery.js';
import { MediaStore } from './media-store.js';
import { startPopupBridge } from './popup-bridge.js';
import { installSiteIntegration } from './sites/index.js';

const store = new MediaStore();

new MediaController({
    store,
    audioGraph: new AudioGraph(),
    findMediaElements: () => findMediaElements(document),
    eventRoot: document,
}).start();

startPopupBridge(store);
installSiteIntegration(window.location, store);
