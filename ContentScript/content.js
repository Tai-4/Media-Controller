// Entry point. Depends on the scripts listed before this file in manifest.json.
(() => {
    const mediaStateStore = new MediaStateStore();
    const mediaAudioGraph = new MediaAudioGraph(mediaStateStore.state.pan);

    registerMediaStateNotifier(mediaStateStore);
    registerPopupMessageHandler(mediaStateStore, mediaAudioGraph);

    const speedControllerCallbacks = createSpeedControllerCallbacks(mediaStateStore);
    const UIAdapter = AdapterFactory.getAdapterForHost(window.location.hostname);
    const speedControllerElement = SpeedControllerElementFactory.getSpeedControllerElementForHost(
        window.location.hostname,
        mediaStateStore,
        speedControllerCallbacks.click,
        speedControllerCallbacks.dblClick,
        speedControllerCallbacks.wheel
    );
    UIAdapter.run(speedControllerElement);
})();
