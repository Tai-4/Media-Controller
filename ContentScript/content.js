class MediaState {
    defaultVolume = 1.0;
    defaultSpeed = 1.0;
    defaultPan = 0.0;

    minVolumeLimit = 0.0;
    minPanLimit = -1.0;
    maxPanLimit = 1.0;
    minSpeedLimit = 0.0;
    maxSpeedLimit = 16.0;

    constructor(volume, speed, pan) {
        volume = parseFloat(volume);
        speed = parseFloat(speed);
        pan = parseFloat(pan);

        if (isNaN(volume)) volume = this.defaultVolume;
        if (isNaN(speed)) speed = this.defaultSpeed;
        if (isNaN(pan)) pan = this.defaultPan;

        if (volume < this.minVolumeLimit) volume = this.minVolumeLimit;
        if (speed < this.minSpeedLimit) speed = this.minSpeedLimit;
        if (speed > this.maxSpeedLimit) speed = this.maxSpeedLimit;
        if (pan < this.minPanLimit) pan = this.minPanLimit;
        if (pan > this.maxPanLimit) pan = this.maxPanLimit;

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
}

(() => {
    let mediaState = new MediaState();
    const mediaContext = new (window.AudioContext || window.webkitAudioContext);
    const shareGainNode = mediaContext.createGain();
    const sharePannerNode = new StereoPannerNode(
        mediaContext,
        { pan: mediaState.pan }
    );

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
            source.mediaElement.playbackRate = mediaState.speed;
        });
        switch (message.request) {
            case "PING":
                sendResponse({ response: "PONG" });
                break;
            case "GET MediaSettings":
                const response = {
                    volume: mediaState.volume,
                    speed: mediaState.speed,
                    pan: mediaState.pan
                };
                sendResponse(response);
                break;
            case "UPDATE MediaVolume":
                mediaState = mediaState.copy({volume: message.data.volume});
                shareGainNode.gain.value = mediaState.volume;
                chrome.runtime.sendMessage({
                    type: "VOLUME_UPDATED",
                    value: mediaState.volume
                });
                break;
            case "UPDATE MediaSpeed":
                mediaState = mediaState.copy({speed: message.data.speed});
                const mediaElementNodeList = document.querySelectorAll("audio, video");
                mediaElementNodeList.forEach((mediaElement) => {
                    mediaElement.playbackRate = mediaState.speed;
                });
                chrome.runtime.sendMessage({
                    type: "SPEED_UPDATED",
                    value: mediaState.speed
                });
                break;
            case "UPDATE MediaPan":
                mediaState = mediaState.copy({pan: message.data.pan});
                sharePannerNode.pan.value = mediaState.pan;
                chrome.runtime.sendMessage({
                    type: "PAN_UPDATED",
                    value: mediaState.pan
                });
                break;
        }
    });

    const mediaElementNodeList = document.querySelectorAll("audio, video");
    createMediaElementSourceIfNeeded(mediaElementNodeList, (source) => {
        source
            .connect(shareGainNode)
            .connect(sharePannerNode)
            .connect(mediaContext.destination);
        source.mediaElement.playbackRate = mediaState.speed;
    });
})();