class MediaState {
    static defaultVolume = 1.0;
    static defaultSpeed = 1.0;
    static defaultPan = 0.0;

    static minVolumeLimit = 0.0;
    static minPanLimit = -1.0;
    static maxPanLimit = 1.0;
    static minSpeedLimit = 0.0;
    static maxSpeedLimit = 16.0;

    constructor(volume, speed, pan) {
        volume = parseFloat(volume);
        speed = parseFloat(speed);
        pan = parseFloat(pan);

        if (isNaN(volume)) volume = MediaState.defaultVolume;
        if (isNaN(speed)) speed = MediaState.defaultSpeed;
        if (isNaN(pan)) pan = MediaState.defaultPan;

        if (volume < MediaState.minVolumeLimit) volume = MediaState.minVolumeLimit;
        if (speed < MediaState.minSpeedLimit) speed = MediaState.minSpeedLimit;
        if (speed > MediaState.maxSpeedLimit) speed = MediaState.maxSpeedLimit;
        if (pan < MediaState.minPanLimit) pan = MediaState.minPanLimit;
        if (pan > MediaState.maxPanLimit) pan = MediaState.maxPanLimit;

        this.volume = volume;
        this.speed = speed;
        this.pan = pan;
    }

    copy(data) {
        return new MediaState(
            data.volume == undefined ? this.volume : data.volume,
            data.speed == undefined ? this.speed : data.speed,
            data.pan == undefined ? this.pan : data.pan
        );
    }

    equals(other) {
        return this.volume == other.volume && this.speed == other.speed && this.pan == other.pan;
    }
}

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

class EmptyUIAdapter {
    run() {}
}

class YoutubeUIAdapter {
    buttonHTML = `
        <yt-button-view-model class="ytd-menu-renderer">
            <button-view-model class="ytSpecButtonViewModelHost style-scope ytd-menu-renderer">
                <button class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment" title="" aria-label="Speed" aria-disabled="false" style="">
                    <div class="yt-spec-button-shape-next__button-text-content"></div>
                </button>
            </button-view-model>
        </yt-button-view-model>
    `;
    buttonInjectTargetSelector = '#top-level-buttons-computed';

    run(mediaStateStore, clickCallback, wheelCallback) {
        window.addEventListener('yt-page-data-updated', async () => {
            const button = this.injectSpeedButton(mediaStateStore, clickCallback, wheelCallback);
            if (button == null) {
                setTimeout(() => {
                    this.injectSpeedButton(mediaStateStore, clickCallback, wheelCallback);
                }, 3000);
            }
        });
    }

    injectSpeedButton(mediaStateStore, clickCallback, wheelCallback) {
        const targetNode = document.querySelector(this.buttonInjectTargetSelector);
        if (!targetNode) {
            return null;
        }

        targetNode.insertAdjacentHTML('beforeend', this.buttonHTML);
        const buttonElement = targetNode.lastElementChild;
        const buttonTextContent = buttonElement.querySelector('.yt-spec-button-shape-next__button-text-content');
        buttonTextContent.textContent = this._formatSpeedText(mediaStateStore.state.speed);
        buttonElement.addEventListener('click', () => {
            if (buttonTextContent) {
                clickCallback();
            }
        });
        buttonElement.addEventListener('wheel', (event) => {
            if (buttonTextContent) {
                event.preventDefault();
                wheelCallback(event.deltaY);
            }
        });
        mediaStateStore.addEventListener('onMediaSpeedChange', (event) => {
            buttonTextContent.textContent = this._formatSpeedText(event.detail.newSpeed);
        });

        return buttonElement;
    }

    _formatSpeedText(speed) {
        return `${speed.toFixed(1)}x`;
    }
}

class AdapterFactory {
    static emptyUIAdapter = new EmptyUIAdapter();

    static getAdapterForHost(hostName) {
        if (hostName.endsWith('youtube.com')) {
            return new YoutubeUIAdapter();
        }
        return AdapterFactory.emptyUIAdapter;
    }
}

(() => {
    const mediaStateStore = new MediaStateStore();
    const mediaContext = new (window.AudioContext || window.webkitAudioContext);
    const shareGainNode = mediaContext.createGain();
    const sharePannerNode = new StereoPannerNode(
        mediaContext,
        { pan: mediaStateStore.state.pan }
    );

    mediaStateStore.addEventListener('onMediaVolumeChange', (event) => {
        chrome.runtime.sendMessage({
            type: "VOLUME_UPDATED",
            value: event.detail.newVolume
        });
    });
    mediaStateStore.addEventListener('onMediaSpeedChange', (event) => {
        chrome.runtime.sendMessage({
            type: "SPEED_UPDATED",
            value: event.detail.newSpeed
        });
    });
    mediaStateStore.addEventListener('onMediaPanChange', (event) => {
        chrome.runtime.sendMessage({
            type: "PAN_UPDATED",
            value: event.detail.newPan
        });
    })

    const mediaElementSourceSet = new WeakSet();
    const createMediaElementSourceIfNeeded = (nodeList, callback) => {
        nodeList.forEach((mediaElement) => {
            if (mediaElementSourceSet.has(mediaElement)) {
                return;
            } else {
                const source = mediaContext.createMediaElementSource(mediaElement);
                mediaElementSourceSet.add(mediaElement);
                callback(source);
            }
        });
    };
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const mediaElementNodeList = document.querySelectorAll("audio, video");
        createMediaElementSourceIfNeeded(mediaElementNodeList, (source) => {
            source
                .connect(shareGainNode)
                .connect(sharePannerNode)
                .connect(mediaContext.destination);
            source.mediaElement.playbackRate = mediaStateStore.state.speed;
        });
        switch (message.request) {
            case "PING":
                sendResponse({ response: "PONG" });
                break;
            case "GET MediaSettings":
                const response = {
                    volume: mediaStateStore.state.volume,
                    speed: mediaStateStore.state.speed,
                    pan: mediaStateStore.state.pan
                };
                sendResponse(response);
                break;
            case "UPDATE MediaVolume":
                mediaStateStore.updateVolume(message.data.volume);
                shareGainNode.gain.value = mediaStateStore.state.volume;
                break;
            case "UPDATE MediaSpeed":
                mediaStateStore.updateSpeed(message.data.speed);
                const mediaElementNodeList = document.querySelectorAll("audio, video");
                mediaElementNodeList.forEach((mediaElement) => {
                    mediaElement.playbackRate = mediaStateStore.state.speed;
                });
                break;
            case "UPDATE MediaPan":
                mediaStateStore.updatePan(message.data.pan);
                sharePannerNode.pan.value = mediaStateStore.state.pan;
                break;
        }
    });

    const mediaElementNodeList = document.querySelectorAll("audio, video");
    createMediaElementSourceIfNeeded(mediaElementNodeList, (source) => {
        source
            .connect(shareGainNode)
            .connect(sharePannerNode)
            .connect(mediaContext.destination);
        source.mediaElement.playbackRate = mediaStateStore.state.speed;
    });

    const speedButtonClickCallback = () => {
        mediaStateStore.updateSpeed(MediaState.defaultSpeed);
        const mediaElementNodeList = document.querySelectorAll("audio, video");
        mediaElementNodeList.forEach((mediaElement) => {
            mediaElement.playbackRate = mediaStateStore.state.speed;
        });
    }
    const speedButtonWheelCallback = (delta) => {
        let newSpeed = Math.round((mediaStateStore.state.speed - (delta * 0.001)) * 10) / 10;
        if (newSpeed < MediaState.minSpeedLimit) {
            newSpeed = MediaState.minSpeedLimit;
        } else if (newSpeed > MediaState.maxSpeedLimit) {
            newSpeed = MediaState.maxSpeedLimit;
        }

        mediaStateStore.updateSpeed(newSpeed);
        const mediaElementNodeList = document.querySelectorAll("audio, video");
        mediaElementNodeList.forEach((mediaElement) => {
            mediaElement.playbackRate = mediaStateStore.state.speed;
        });
    };

    const UIAdapter = AdapterFactory.getAdapterForHost(window.location.hostname);
    UIAdapter.run(mediaStateStore, speedButtonClickCallback, speedButtonWheelCallback);
})();