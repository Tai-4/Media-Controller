import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MediaStore, UpdateSource } from '../src/content/media-store.js';
import { startPopupBridge } from '../src/content/popup-bridge.js';
import { MessageType, PORT_NAME } from '../src/shared/protocol.js';

const fakeEvent = () => {
    const listeners = [];
    return { addListener: (l) => listeners.push(l), emit: (...args) => listeners.forEach((l) => l(...args)) };
};

function setup(portName = PORT_NAME) {
    const store = new MediaStore();
    const onConnect = fakeEvent();
    startPopupBridge(store, { onConnect });

    const port = { name: portName, sent: [], onMessage: fakeEvent(), onDisconnect: fakeEvent() };
    port.postMessage = (message) => port.sent.push(message);
    onConnect.emit(port);
    return { store, port };
}

test('sends the current state on connect and on every change', () => {
    const { store, port } = setup();
    store.update({ volume: 2 }, UpdateSource.PAGE);

    assert.deepEqual(port.sent.map((m) => [m.type, m.state.volume]), [[MessageType.STATE, 1], [MessageType.STATE, 2]]);
});

test('applies UPDATE messages as user changes', () => {
    const { store, port } = setup();
    const sources = [];
    store.subscribe((state, previous, source) => sources.push(source));

    port.onMessage.emit({ type: MessageType.UPDATE, patch: { speed: 2 } });
    port.onMessage.emit({ type: MessageType.UPDATE, patch: null });

    assert.equal(store.state.speed, 2);
    assert.deepEqual(sources, [UpdateSource.USER]);
});

test('stops sending after the popup disconnects', () => {
    const { store, port } = setup();
    port.onDisconnect.emit();
    store.update({ volume: 2 }, UpdateSource.USER);

    assert.equal(port.sent.length, 1);
});

test('ignores ports opened by others', () => {
    const { port } = setup('something-else');
    assert.equal(port.sent.length, 0);
});
