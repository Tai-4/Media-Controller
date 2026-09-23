import { UpdateSource } from '../media-store.js';
import { DEFAULT_SPEED, speedAfterWheel, toggledMaxSpeed } from '../speed-commands.js';

// Our own markers. YouTube's button component drops the `id` of cloned elements,
// and its class names change over time, so data attributes are used instead.
const BUTTON_MARKER_ATTRIBUTE = 'data-mc-speed-controller';
const SPEED_TEXT_ATTRIBUTE = 'data-mc-speed-text';

const WATCH_METADATA_SELECTOR = 'ytd-watch-metadata';
// There are many elements which have #top-level-buttons-computed.
// Only the element within ytd-watch-metadata is the target.
const INJECT_TARGET_SELECTOR = `${WATCH_METADATA_SELECTOR} #top-level-buttons-computed`;
const TEMPLATE_BUTTON_SELECTOR = 'ytd-menu-renderer yt-button-view-model';
const YOUTUBE_BUTTON_TEXT_CLASS = 'ytSpecButtonShapeNextButtonTextContent';

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 10_000;

// Warnings point at the selector that no longer matches when YouTube changes its page structure.
function warn(message) {
    console.warn(`[Media Controller] YouTube speed button: ${message}`);
}

/** Adds a speed button next to the like/share buttons on watch pages. */
export const youtubeIntegration = {
    matches: (location) => location.hostname === 'www.youtube.com',
    install: (store) => new YoutubeSpeedButton(store).start(),
};

function formatSpeed(speed) {
    return `${speed.toFixed(1)}x`;
}

/**
 * Clones one of YouTube's own buttons so that the speed button matches its look.
 * Falls back to a self-styled button when there is nothing to clone.
 */
function createButton(speedText) {
    const templateHost = document.querySelector(TEMPLATE_BUTTON_SELECTOR);
    const templateButton = templateHost?.querySelector('button');
    if (!templateButton) {
        warn(`template button not found (${TEMPLATE_BUTTON_SELECTOR} button); using a fallback button.`);
        return createFallbackButton(speedText);
    }

    // Only the plain <button> is cloned, wrapped in a plain <div>. A clone of YouTube's button
    // component re-renders itself from data it does not have, which empties it after navigation.
    const wrapper = document.createElement('div');
    wrapper.setAttribute(BUTTON_MARKER_ATTRIBUTE, '');
    const hostStyle = getComputedStyle(templateHost);
    wrapper.style.display = hostStyle.display;
    wrapper.style.marginLeft = hostStyle.marginLeft;

    const button = templateButton.cloneNode(true);
    button.setAttribute('aria-label', 'Speed Controller');
    button.removeAttribute('title');
    // When space is short YouTube collapses its buttons to fixed-width icon buttons without a label.
    // Drop the icon styles and make sure there is a label, so the speed is always visible.
    button.classList.remove('ytSpecButtonShapeNextIconLeading', 'ytSpecButtonShapeNextIconButton');
    button.querySelector('.ytSpecButtonShapeNextIcon')?.remove();
    let textElement = button.querySelector(`.${YOUTUBE_BUTTON_TEXT_CLASS}`);
    if (!textElement) {
        textElement = document.createElement('div');
        textElement.className = YOUTUBE_BUTTON_TEXT_CLASS;
        button.prepend(textElement);
    }
    textElement.setAttribute(SPEED_TEXT_ATTRIBUTE, '');
    textElement.textContent = speedText;

    wrapper.append(button);
    return wrapper;
}

/** A button that does not depend on YouTube's classes. Colors follow YouTube's theme variables when present. */
function createFallbackButton(speedText) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute(BUTTON_MARKER_ATTRIBUTE, '');
    wrapper.style.display = 'inline-flex';
    wrapper.style.marginLeft = '8px';

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Speed Controller');
    Object.assign(button.style, {
        height: '40px',
        padding: '0 16px',
        border: 'none',
        borderRadius: '20px',
        background: 'var(--yt-spec-badge-chip-background, rgba(128, 128, 128, 0.2))',
        color: 'var(--yt-spec-text-primary, currentColor)',
        font: '500 14px Roboto, Arial, sans-serif',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    });

    const textElement = document.createElement('span');
    textElement.setAttribute(SPEED_TEXT_ATTRIBUTE, '');
    textElement.textContent = speedText;

    button.append(textElement);
    wrapper.append(button);
    return wrapper;
}

class YoutubeSpeedButton {
    #store;
    #button = null;
    #unsubscribe = null;
    #pollTimer = null;
    #speedBeforeClick = null;
    // YouTube re-renders the buttons after navigation and may drop ours; this puts it back.
    #reattachObserver = new MutationObserver(() => this.#reattach());

    constructor(store) {
        this.#store = store;
    }

    start() {
        // Fired after every navigation, including the first page load.
        window.addEventListener('yt-page-data-updated', () => this.#onPageDataUpdated());
    }

    #onPageDataUpdated() {
        this.#stopPolling();
        if (new URL(window.location.href).pathname === '/watch') {
            this.#pollForInjectTarget((target) => this.#inject(target));
        } else {
            this.#remove();
        }
    }

    #pollForInjectTarget(onFound) {
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        const poll = () => {
            this.#pollTimer = null;
            const target = document.querySelector(INJECT_TARGET_SELECTOR);
            if (target) {
                onFound(target);
            } else if (Date.now() < deadline) {
                this.#pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
            } else {
                warn(`inject target not found within ${POLL_TIMEOUT_MS / 1000}s (${INJECT_TARGET_SELECTOR}).`);
            }
        };
        poll();
    }

    #stopPolling() {
        clearTimeout(this.#pollTimer);
        this.#pollTimer = null;
    }

    #inject(target) {
        if (!this.#button) {
            // Leftover from an earlier instance of this content script (e.g. after the extension was reloaded).
            document.querySelector(`[${BUTTON_MARKER_ATTRIBUTE}]`)?.remove();

            this.#button = createButton(formatSpeed(this.#store.state.speed));
            this.#button.addEventListener('click', (event) => this.#onClick(event));
            this.#button.addEventListener('dblclick', () => this.#onDoubleClick());
            this.#button.addEventListener('wheel', (event) => {
                event.preventDefault();
                this.#updateSpeed(speedAfterWheel(this.#store.state.speed, event.deltaY));
            }, { passive: false });
            this.#unsubscribe = this.#store.subscribe((state) => this.#render(state));
        }

        if (!target.contains(this.#button)) {
            target.append(this.#button);
        }
        this.#reattachObserver.disconnect();
        this.#reattachObserver.observe(target.closest(WATCH_METADATA_SELECTOR) ?? target, { childList: true, subtree: true });
    }

    #reattach() {
        const target = document.querySelector(INJECT_TARGET_SELECTOR);
        if (this.#button && target && !target.contains(this.#button)) {
            target.append(this.#button);
        }
    }

    #remove() {
        this.#reattachObserver.disconnect();
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        this.#button?.remove();
        this.#button = null;
    }

    #onClick(event) {
        // The second click of a double click is handled by the dblclick listener.
        if (event.detail > 1) {
            return;
        }
        // Reset immediately, but remember the speed for a double click that may follow.
        this.#speedBeforeClick = this.#store.state.speed;
        this.#updateSpeed(DEFAULT_SPEED);
    }

    #onDoubleClick() {
        // The first click has already reset the speed, so toggle based on the speed before it.
        this.#updateSpeed(toggledMaxSpeed(this.#speedBeforeClick ?? this.#store.state.speed));
        this.#speedBeforeClick = null;
    }

    #updateSpeed(speed) {
        this.#store.update({ speed }, UpdateSource.USER);
    }

    #render(state) {
        const textElement = this.#button?.querySelector(`[${SPEED_TEXT_ATTRIBUTE}]`);
        if (textElement) {
            textElement.textContent = formatSpeed(state.speed);
        }
    }
}
