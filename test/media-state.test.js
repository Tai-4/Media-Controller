import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_MEDIA_STATE, applyMediaStatePatch, mediaStatesEqual } from '../src/shared/media-state.js';

test('applies only the given keys', () => {
    assert.deepEqual(applyMediaStatePatch(DEFAULT_MEDIA_STATE, { speed: 2 }), { volume: 1, speed: 2, pan: 0 });
});

test('parses numeric strings', () => {
    assert.equal(applyMediaStatePatch(DEFAULT_MEDIA_STATE, { volume: '2.5' }).volume, 2.5);
});

test('clamps values to their limits', () => {
    const state = applyMediaStatePatch(DEFAULT_MEDIA_STATE, { volume: 100, speed: -1, pan: 3 });
    assert.deepEqual(state, { volume: 5, speed: 0, pan: 1 });
});

test('keeps the previous value for invalid input', () => {
    const base = { volume: 2, speed: 3, pan: 0.5 };
    assert.deepEqual(applyMediaStatePatch(base, { volume: 'abc', speed: NaN, pan: null }), base);
});

test('ignores unknown keys', () => {
    assert.deepEqual(applyMediaStatePatch(DEFAULT_MEDIA_STATE, { foo: 1 }), DEFAULT_MEDIA_STATE);
});

test('returns a frozen state', () => {
    assert.ok(Object.isFrozen(applyMediaStatePatch(DEFAULT_MEDIA_STATE, {})));
});

test('compares states by value', () => {
    assert.ok(mediaStatesEqual({ volume: 1, speed: 1, pan: 0 }, DEFAULT_MEDIA_STATE));
    assert.ok(!mediaStatesEqual({ volume: 1, speed: 2, pan: 0 }, DEFAULT_MEDIA_STATE));
});
