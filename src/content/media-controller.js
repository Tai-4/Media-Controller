import { UpdateSource } from './media-store.js';
import { isMediaElement } from './media-discovery.js';

// Media events do not bubble, so they are observed in the capture phase.
const MEDIA_READY_EVENTS = ['loadedmetadata', 'play'];

/**
 * Keeps media elements in sync with the store.
 *
 * - Changes made through the extension (UpdateSource.USER) are applied to every media element,
 *   including elements that appear or start playing later.
 * - Speed changes made by the page itself (e.g. YouTube's own speed menu) are adopted into the store,
 *   so the popup and the speed button always show the actual speed.
 * - Nothing is applied until the user changes a setting, so pages keep their own defaults.
 */
export class MediaController {
    #store;
    #audioGraph;
    #findMediaElements;
    #eventRoot;
    #speedControlled = false;
    // Playback rates this controller set, used to tell its own ratechange events from the page's.
    #expectedRates = new WeakMap();

    constructor({ store, audioGraph, findMediaElements, eventRoot }) {
        this.#store = store;
        this.#audioGraph = audioGraph;
        this.#findMediaElements = findMediaElements;
        this.#eventRoot = eventRoot;
    }

    start() {
        this.#store.subscribe((state, previous, source) => this.#onStateChange(state, previous, source));

        for (const type of MEDIA_READY_EVENTS) {
            this.#eventRoot.addEventListener(type, (event) => this.#onMediaReady(event.target), true);
        }
        this.#eventRoot.addEventListener('ratechange', (event) => this.#onRateChange(event.target), true);
    }

    #onStateChange(state, previous, source) {
        if (source !== UpdateSource.USER) {
            return;
        }

        if (state.speed !== previous.speed) {
            this.#speedControlled = true;
        }
        if (state.volume !== previous.volume || state.pan !== previous.pan) {
            this.#audioGraph.setParams(state);
        }
        for (const element of this.#findMediaElements()) {
            this.#applyTo(element, state);
        }
    }

    #onMediaReady(target) {
        if (isMediaElement(target)) {
            this.#applyTo(target, this.#store.state);
        }
    }

    #applyTo(element, state) {
        if (this.#speedControlled && element.playbackRate !== state.speed) {
            this.#expectedRates.set(element, state.speed);
            element.playbackRate = state.speed;
        }
        if (this.#audioGraph.isActive) {
            this.#audioGraph.connect(element);
        }
    }

    #onRateChange(target) {
        if (!isMediaElement(target)) {
            return;
        }

        const expectedRate = this.#expectedRates.get(target);
        this.#expectedRates.delete(target);
        if (expectedRate === target.playbackRate) {
            return;
        }
        this.#store.update({ speed: target.playbackRate }, UpdateSource.PAGE);
    }
}
