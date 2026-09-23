// Media settings shared by the content script and the popup.
// A media state is an immutable plain object: { volume, speed, pan }.

export const MEDIA_STATE_LIMITS = Object.freeze({
    volume: Object.freeze({ min: 0, max: 5, default: 1 }),
    speed: Object.freeze({ min: 0, max: 16, default: 1 }),
    pan: Object.freeze({ min: -1, max: 1, default: 0 }),
});

export const DEFAULT_MEDIA_STATE = Object.freeze({
    volume: MEDIA_STATE_LIMITS.volume.default,
    speed: MEDIA_STATE_LIMITS.speed.default,
    pan: MEDIA_STATE_LIMITS.pan.default,
});

function normalizeValue(value, fallback, { min, max }) {
    const number = parseFloat(value);
    if (Number.isNaN(number)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, number));
}

/**
 * Returns a new state with `patch` applied on top of `base`.
 * Unknown keys are ignored, and invalid or out-of-range values are clamped or fall back to `base`.
 */
export function applyMediaStatePatch(base, patch = {}) {
    const next = {};
    for (const key of Object.keys(MEDIA_STATE_LIMITS)) {
        next[key] = patch[key] === undefined
            ? base[key]
            : normalizeValue(patch[key], base[key], MEDIA_STATE_LIMITS[key]);
    }
    return Object.freeze(next);
}

export function mediaStatesEqual(a, b) {
    return a.volume === b.volume && a.speed === b.speed && a.pan === b.pan;
}
