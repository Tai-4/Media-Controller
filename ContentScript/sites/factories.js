class SpeedControllerElementFactory {
    static emptySpeedController = new EmptySpeedControllerElement();

    static getSpeedControllerElementForHost(hostName, mediaStateStore, clickCallback, dblClickCallback, wheelCallback) {
        if (hostName.endsWith('youtube.com')) {
            return new YoutubeSpeedControllerElement(mediaStateStore, clickCallback, dblClickCallback, wheelCallback);
        }
        return this.emptySpeedController;
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
