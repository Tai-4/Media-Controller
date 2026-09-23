/**
 * Whether `element` can be routed through Web Audio without being silenced.
 * Cross-origin media loaded without CORS outputs silence through a MediaElementSourceNode,
 * so such elements are left alone.
 */
export function canRouteThroughWebAudio(element, pageUrl = window.location.href) {
    if (element.crossOrigin) {
        // Loaded in CORS mode: if it plays at all, the server allowed it.
        return true;
    }

    const src = element.currentSrc || element.src;
    if (!src) {
        // Source not selected yet. The media controller retries when the media loads or plays.
        return false;
    }

    const url = new URL(src, pageUrl);
    if (url.protocol === 'data:') {
        return true;
    }
    // blob: URLs carry the origin that created them, so this covers MSE players too.
    return url.origin === new URL(pageUrl).origin;
}

/**
 * Shared gain -> stereo panner chain that media elements are routed through.
 * The AudioContext is created on first use, so pages where the volume or pan is never changed
 * are not touched at all.
 */
export class AudioGraph {
    #context = null;
    #gainNode = null;
    #pannerNode = null;
    #connectedElements = new WeakSet();

    get isActive() {
        return this.#context !== null;
    }

    setParams({ volume, pan }) {
        this.#start();
        this.#gainNode.gain.value = volume;
        this.#pannerNode.pan.value = pan;
    }

    connect(element) {
        if (this.#connectedElements.has(element) || !canRouteThroughWebAudio(element)) {
            return;
        }

        this.#start();
        // An AudioContext created without a user gesture on the page starts suspended.
        // Route media into it only once it runs, so audio is never silenced by a suspended graph.
        this.#resume().then(() => {
            if (this.#connectedElements.has(element)) {
                return;
            }

            let source;
            try {
                source = this.#context.createMediaElementSource(element);
            } catch {
                // Already routed through another AudioContext (by the page or another extension).
                return;
            }
            this.#connectedElements.add(element);
            source.connect(this.#gainNode);
        });
    }

    #start() {
        if (this.#context) {
            return;
        }

        this.#context = new AudioContext();
        this.#gainNode = this.#context.createGain();
        this.#pannerNode = new StereoPannerNode(this.#context);
        this.#gainNode
            .connect(this.#pannerNode)
            .connect(this.#context.destination);
    }

    #resume() {
        return this.#context.state === 'running' ? Promise.resolve() : this.#context.resume();
    }
}
