import { MEDIA_STATE_LIMITS } from '../shared/media-state.js';

// Speed operations for on-page controls. Results are clamped by the store.

const SPEED_LIMITS = MEDIA_STATE_LIMITS.speed;
const SPEED_PER_WHEEL_DELTA = 0.001;

export const DEFAULT_SPEED = SPEED_LIMITS.default;

/** Toggles between the default speed and the maximum speed. */
export function toggledMaxSpeed(currentSpeed) {
    return currentSpeed === SPEED_LIMITS.max ? SPEED_LIMITS.default : SPEED_LIMITS.max;
}

/** Scrolling down slows down, scrolling up speeds up, in 0.1x steps. */
export function speedAfterWheel(currentSpeed, deltaY) {
    return Math.round((currentSpeed - deltaY * SPEED_PER_WHEEL_DELTA) * 10) / 10;
}
