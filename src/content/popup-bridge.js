import { MessageType, PORT_NAME } from '../shared/protocol.js';
import { UpdateSource } from './media-store.js';

/**
 * Serves the popup over a port opened with chrome.tabs.connect.
 * Only the popup of this tab is connected, and nothing is sent while the popup is closed.
 */
export function startPopupBridge(store, runtime = chrome.runtime) {
    runtime.onConnect.addListener((port) => {
        if (port.name !== PORT_NAME) {
            return;
        }

        const sendState = (state) => port.postMessage({ type: MessageType.STATE, state });
        const unsubscribe = store.subscribe(sendState);
        port.onDisconnect.addListener(unsubscribe);
        port.onMessage.addListener((message) => {
            if (message?.type === MessageType.UPDATE) {
                store.update(message.patch ?? {}, UpdateSource.USER);
            }
        });

        sendState(store.state);
    });
}
