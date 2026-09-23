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
