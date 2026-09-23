import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRouteThroughWebAudio } from '../src/content/audio-graph.js';

const pageUrl = 'https://example.com/watch';
const media = (props) => ({ crossOrigin: null, currentSrc: '', src: '', ...props });

test('routes same-origin media', () => {
    assert.ok(canRouteThroughWebAudio(media({ currentSrc: 'https://example.com/a.mp4' }), pageUrl));
    assert.ok(canRouteThroughWebAudio(media({ src: '/a.mp4' }), pageUrl));
});

test('routes blob: URLs created by the page (MSE players)', () => {
    assert.ok(canRouteThroughWebAudio(media({ currentSrc: 'blob:https://example.com/1234' }), pageUrl));
});

test('routes data: URLs', () => {
    assert.ok(canRouteThroughWebAudio(media({ currentSrc: 'data:audio/wav;base64,AAAA' }), pageUrl));
});

test('does not route cross-origin media loaded without CORS', () => {
    assert.ok(!canRouteThroughWebAudio(media({ currentSrc: 'https://cdn.example.net/a.mp4' }), pageUrl));
});

test('routes cross-origin media loaded with CORS', () => {
    const element = media({ currentSrc: 'https://cdn.example.net/a.mp4', crossOrigin: 'anonymous' });
    assert.ok(canRouteThroughWebAudio(element, pageUrl));
});

test('waits until a source is selected', () => {
    assert.ok(!canRouteThroughWebAudio(media({}), pageUrl));
});
