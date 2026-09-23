import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MediaStore, UpdateSource } from '../src/content/media-store.js';

test('notifies listeners with the new state, the previous state and the source', () => {
    const store = new MediaStore();
    const calls = [];
    store.subscribe((...args) => calls.push(args));

    store.update({ volume: 2 }, UpdateSource.USER);

    assert.equal(calls.length, 1);
    const [state, previous, source] = calls[0];
    assert.equal(state.volume, 2);
    assert.equal(previous.volume, 1);
    assert.equal(source, UpdateSource.USER);
    assert.equal(store.state, state);
});

test('does not notify when the state does not change', () => {
    const store = new MediaStore();
    let count = 0;
    store.subscribe(() => count++);

    store.update({ speed: 1 }, UpdateSource.USER);
    store.update({ volume: 99 }, UpdateSource.USER);
    store.update({ volume: 5 }, UpdateSource.USER);

    assert.equal(count, 1, 'clamped value equal to the current one is not a change');
});

test('unsubscribe stops notifications', () => {
    const store = new MediaStore();
    let count = 0;
    const unsubscribe = store.subscribe(() => count++);

    unsubscribe();
    store.update({ pan: 1 }, UpdateSource.USER);

    assert.equal(count, 0);
});
