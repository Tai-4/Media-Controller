// Popup <-> content script protocol.
// The popup opens a port to the active tab's content script with chrome.tabs.connect.
//   content -> popup: { type: STATE, state }   sent on connect and on every state change
//   popup -> content: { type: UPDATE, patch }  patch is a partial media state

export const PORT_NAME = 'media-controller';

export const MessageType = Object.freeze({
    STATE: 'STATE',
    UPDATE: 'UPDATE',
});
