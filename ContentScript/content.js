// eslint-disable-next-line no-redeclare
class Audio {
    static instanceList = []
    static defaultPanValue = 0

    static getOrCreate(mediaElement, audioSettings) {
        return Audio.instanceList.find((audio) =>
            audio.mediaElement == mediaElement
        ) ?? new Audio(mediaElement, audioSettings)
    }

    constructor(mediaElement, audioSettings) {
        this.mediaElement = mediaElement
        this.context = new (window.AudioContext || window.webkitAudioContext)
        this._gainNode = this.context.createGain()
        this._panner = new StereoPannerNode(
            this.context,
            { pan: Audio.defaultPanValue }
        )

        const source = this.context.createMediaElementSource(this.mediaElement)
        source
            .connect(this._gainNode)
            .connect(this._panner)
            .connect(this.context.destination)
        this.updateSettings(audioSettings)

        Audio.instanceList.push(this)
    }

    updateSettings(audioSettings) {
        this._gainNode.gain.value = audioSettings.volume
        this._panner.pan.value = audioSettings.pan
        this.audioSettings = audioSettings
    }
}

class AudioSettings {
    constructor(volume = 1, pan = 0, speed = 1) {
        this.volume = volume
        this.pan = pan
        this.speed = speed
    }
}

class AudioList {    
    constructor(mediaElements, sharedAudioSettings) {
        this.sharedAudioSettings = sharedAudioSettings
        this._audios = mediaElements.map((mediaElement) => {
            const audio = Audio.getOrCreate(
                mediaElement, 
                sharedAudioSettings
            )
            audio.updateSettings(sharedAudioSettings)
            return audio
        })
    }

    registerAudio(audio) {
        audio.updateSettings(this.sharedAudioSettings)
        this._audios.push(audio)
    }

    registerMediaElement(mediaElement) {
        const audio = Audio.getOrCreate(
            mediaElement,
            this.sharedAudioSettings
        )
        this.registerAudio(audio)
    }

    updateAllAudioSettings(settings) {
        this.sharedAudioSettings = settings
        this._audios.forEach((audio) => {
            audio.updateSettings(settings)
        })
    }

    updateAllAudioVolume(volume) {
        this.updateAllAudioSettings(
            new AudioSettings(
                volume,
                this.sharedAudioSettings.pan,
                this.sharedAudioSettings.speed
            )
        )
    }

    updateAllAudioPan(pan) {
        this.updateAllAudioSettings(
            new AudioSettings(                
                this.sharedAudioSettings.volume,
                pan, 
                this.sharedAudioSettings.speed
            )
        )
    }

    updateAllAudioSpeed(speed) {
        this.updateAllAudioSettings(
            new AudioSettings(
                this.sharedAudioSettings.volume,
                this.sharedAudioSettings.pan, 
                speed
            )
        )
    }
}

class ConcatHTMLCollection {
    constructor(...collections) {
        this.collections = collections
    }

    toArray() {
        return this.collections.flatMap(
            (collection) => [...collection]
        )
    }
}

class Model {
    audioSettings = new AudioSettings()
    mediaElementCollection = new ConcatHTMLCollection(
        document.getElementsByTagName("audio"),
        document.getElementsByTagName("video")
    )

    pong() {
        return "pong"
    }

    getAudioSettings() {
        return {
            volume: this.audioSettings.volume,
            pan: this.audioSettings.pan,
            speed: this.audioSettings.speed
        }
    }
    updateAudioVolume(volume) {
        const documentAudioList = new AudioList(
            this.mediaElementCollection.toArray(),
            this.audioSettings
        )
        documentAudioList.updateAllAudioVolume(volume)
        this.audioSettings = documentAudioList.sharedAudioSettings
    }
    updateAudioPan(pan) {
        const documentAudioList = new AudioList(
            this.mediaElementCollection.toArray(),
            this.audioSettings
        )
        documentAudioList.updateAllAudioPan(pan)
        this.audioSettings = documentAudioList.sharedAudioSettings
    }
    updateAudioSpeed(speed) {
        const documentAudioList = new AudioList(
            this.mediaElementCollection.toArray(),
            this.audioSettings
        )
        documentAudioList.updateAllAudioSpeed(speed)
        this.audioSettings = documentAudioList.sharedAudioSettings
    }
}

(() => {
    const model = new Model()
    const processMap = {
        "PING": model.pong,
        "GET AudioSettings": model.getAudioSettings,
        "UPDATE AudioVolume": model.updateAudioVolume,
        "UPDATE AudioPan": model.updateAudioPan,
        "UPDATE AudioSpeed": model.updateAudioSpeed
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const process = processMap[message.request]
        const response = process.call(model, message.data)
        sendResponse(response)
    })
})()