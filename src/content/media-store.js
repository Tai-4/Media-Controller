import { DEFAULT_MEDIA_STATE, applyMediaStatePatch, mediaStatesEqual } from '../shared/media-state.js';

// Who caused a state change. The media controller only pushes settings onto media elements
// for changes made through the extension, and follows the page for changes the page made itself.
export const UpdateSource = Object.freeze({
    USER: 'user',
    PAGE: 'page',
});

/** Single source of truth for the page's media settings. */
export class MediaStore {
    #state = DEFAULT_MEDIA_STATE;
    #listeners = new Set();

    get state() {
        return this.#state;
    }

    /** Applies a partial state. Listeners are notified only when the state actually changes. */
    update(patch, source) {
        const next = applyMediaStatePatch(this.#state, patch);
        if (mediaStatesEqual(this.#state, next)) {
            return;
        }

        const previous = this.#state;
        this.#state = next;
        for (const listener of this.#listeners) {
            listener(next, previous, source);
        }
    }

    /** @returns {() => void} unsubscribe */
    subscribe(listener) {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }
}
