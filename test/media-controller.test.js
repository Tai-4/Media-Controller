import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { MediaController } from '../src/content/media-controller.js';
import { MediaStore, UpdateSource } from '../src/content/media-store.js';

class FakeEventRoot {
    handlers = new Map();
    addEventListener(type, handler, capture) {
        assert.equal(capture, true, 'media events do not bubble, so capture is required');
        this.handlers.set(type, handler);
    }
    dispatch(type, target) {
        this.handlers.get(type)?.({ target });
    }
}

class FakeAudioGraph {
    isActive = false;
    params = null;
    connected = [];
    setParams(params) {
        this.isActive = true;
        this.params = params;
    }
    connect(element) {
        this.connected.push(element);
    }
}

const video = (playbackRate = 1) => ({ localName: 'video', playbackRate });

let store, audioGraph, eventRoot, elements;
beforeEach(() => {
    store = new MediaStore();
    audioGraph = new FakeAudioGraph();
    eventRoot = new FakeEventRoot();
    elements = [video(), video()];
    new MediaController({ store, audioGraph, findMediaElements: () => elements, eventRoot }).start();
});

test('applies a user speed change to every media element', () => {
    store.update({ speed: 2 }, UpdateSource.USER);
    assert.deepEqual(elements.map((e) => e.playbackRate), [2, 2]);
});

test('does not touch the speed before the user changes it', () => {
    const element = video(1.5);
    eventRoot.dispatch('play', element);
    assert.equal(element.playbackRate, 1.5);
});

test('applies the speed to media that starts playing later', () => {
    store.update({ speed: 3 }, UpdateSource.USER);
    const lateElement = video();
    eventRoot.dispatch('loadedmetadata', lateElement);
    assert.equal(lateElement.playbackRate, 3);
});

test('adopts speed changes made by the page', () => {
    const element = video(1.75);
    eventRoot.dispatch('ratechange', element);
    assert.equal(store.state.speed, 1.75);
    assert.deepEqual(elements.map((e) => e.playbackRate), [1, 1], 'page changes are not pushed to other elements');
});

test('ignores ratechange events caused by its own updates', () => {
    const sources = [];
    store.subscribe((state, previous, source) => sources.push(source));

    store.update({ speed: 2 }, UpdateSource.USER);
    eventRoot.dispatch('ratechange', elements[0]);

    assert.deepEqual(sources, [UpdateSource.USER]);
});

test('starts audio processing only when volume or pan changes', () => {
    store.update({ speed: 2 }, UpdateSource.USER);
    assert.equal(audioGraph.isActive, false);
    assert.deepEqual(audioGraph.connected, []);

    store.update({ volume: 2 }, UpdateSource.USER);
    assert.deepEqual(audioGraph.params, { volume: 2, speed: 2, pan: 0 });
    assert.deepEqual(audioGraph.connected, elements);

    const lateElement = video();
    eventRoot.dispatch('play', lateElement);
    assert.ok(audioGraph.connected.includes(lateElement));
});

test('ignores events from non-media elements', () => {
    eventRoot.dispatch('ratechange', { localName: 'div', playbackRate: 5 });
    assert.equal(store.state.speed, 1);
});
