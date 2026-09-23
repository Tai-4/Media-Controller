function createSpeedControllerCallbacks(mediaStateStore) {
    const click = () => {
        mediaStateStore.updateSpeed(MediaState.defaultSpeed);
        applySpeedToMediaElements(getAllMediaElements(), mediaStateStore.state.speed);
    }
    const dblClick = () => {
        if (mediaStateStore.state.speed == MediaState.maxSpeedLimit) {
            mediaStateStore.updateSpeed(MediaState.minSpeedLimit);
        } else {
            mediaStateStore.updateSpeed(MediaState.maxSpeedLimit);
        }

        applySpeedToMediaElements(getAllMediaElements(), mediaStateStore.state.speed);
    }
    const wheel = (delta) => {
        let newSpeed = Math.round((mediaStateStore.state.speed - (delta * 0.001)) * 10) / 10;
        if (newSpeed < MediaState.minSpeedLimit) {
            newSpeed = MediaState.minSpeedLimit;
        } else if (newSpeed > MediaState.maxSpeedLimit) {
            newSpeed = MediaState.maxSpeedLimit;
        }

        mediaStateStore.updateSpeed(newSpeed);
        applySpeedToMediaElements(getAllMediaElements(), mediaStateStore.state.speed);
    };

    return { click, dblClick, wheel };
}
