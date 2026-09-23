class MediaStateStore extends EventTarget {
    _mediaState = new MediaState();

    get state() { return this._mediaState; }

    _update(mediaState) {
        if (this._mediaState.equals(mediaState)) {
            return;
        }

        this._mediaState = mediaState;
        this.dispatchEvent(new CustomEvent('onMediaStateChange', { detail: { newState: this.state } }));
    }

    updateVolume(volume) {
        const newState = this._mediaState.copy({ volume: volume });
        if (this.state != newState) {
            this._update(newState);
            this.dispatchEvent(new CustomEvent('onMediaVolumeChange', { detail: { newVolume: volume } }));
        }
    }

    updateSpeed(speed) {
        const newState = this._mediaState.copy({ speed: speed });
        if (this.state != newState) {
            this._update(newState);
            this.dispatchEvent(new CustomEvent('onMediaSpeedChange', { detail: { newSpeed: speed } }));
        }
    }

    updatePan(pan) {
        const newState = this._mediaState.copy({ pan: pan });
        if (this.state != newState) {
            this._update(newState);
            this.dispatchEvent(new CustomEvent('onMediaPanChange', { detail: { newPan: pan } }));
        }
    }
}
