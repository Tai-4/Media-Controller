function registerMediaStateNotifier(mediaStateStore) {
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
}

function registerPopupMessageHandler(mediaStateStore, mediaAudioGraph) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const mediaElements = getAllMediaElements();

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
                mediaAudioGraph.connectIfNeeded(mediaElements);
                mediaStateStore.updateVolume(message.data.volume);
                mediaAudioGraph.setVolume(mediaStateStore.state.volume);
                break;
            case "UPDATE MediaSpeed":
                mediaStateStore.updateSpeed(message.data.speed);
                applySpeedToMediaElements(mediaElements, mediaStateStore.state.speed);
                break;
            case "UPDATE MediaPan":
                mediaAudioGraph.connectIfNeeded(mediaElements);
                mediaStateStore.updatePan(message.data.pan);
                mediaAudioGraph.setPan(mediaStateStore.state.pan);
                break;
        }
    });
}
