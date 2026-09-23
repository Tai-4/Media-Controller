class MediaAudioGraph {
    constructor(initialPan) {
        this._mediaContext = new (window.AudioContext || window.webkitAudioContext)();
        this._shareGainNode = this._mediaContext.createGain();
        this._sharePannerNode = new StereoPannerNode(
            this._mediaContext,
            { pan: initialPan }
        );
        this._mediaElementSourceSet = new WeakSet();
    }

    connectIfNeeded(mediaElements) {
        mediaElements.forEach((mediaElement) => {
            if (this._mediaElementSourceSet.has(mediaElement)) {
                return;
            } else {
                const source = this._mediaContext.createMediaElementSource(mediaElement);
                this._mediaElementSourceSet.add(mediaElement);
                source
                    .connect(this._shareGainNode)
                    .connect(this._sharePannerNode)
                    .connect(this._mediaContext.destination);
            }
        });
    }

    setVolume(volume) {
        this._shareGainNode.gain.value = volume;
    }

    setPan(pan) {
        this._sharePannerNode.pan.value = pan;
    }
}
