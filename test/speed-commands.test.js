import assert from 'node:assert/strict';
import { test } from 'node:test';
import { speedAfterWheel, toggledMaxSpeed } from '../src/content/speed-commands.js';

test('toggles between the default speed and the maximum speed', () => {
    assert.equal(toggledMaxSpeed(1), 16);
    assert.equal(toggledMaxSpeed(2.5), 16);
    assert.equal(toggledMaxSpeed(16), 1);
});

test('wheel changes the speed in 0.1x steps', () => {
    assert.equal(speedAfterWheel(1, -100), 1.1);
    assert.equal(speedAfterWheel(1, 100), 0.9);
    assert.equal(speedAfterWheel(1.2, 300), 0.9);
});

test('tiny wheel deltas round to the current speed', () => {
    assert.equal(speedAfterWheel(1, 4), 1);
});
