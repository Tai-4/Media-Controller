class Media {
    static instanceList = []
    static defaultPanValue = 0

    static getOrCreate(mediaElement, mediaSettings) {
        return Media.instanceList.find((media) =>
            media.mediaElement == mediaElement
        ) ?? new Media(mediaElement, mediaSettings)
    }

    constructor(mediaElement, mediaSettings) {
        this.mediaElement = mediaElement
        this.mediaContext = new (window.AudioContext || window.webkitAudioContext)
        this._gainNode = this.mediaContext.createGain()
        this._pannerNode = new StereoPannerNode(
            this.mediaContext,
            { pan: Media.defaultPanValue }
        )

        const source = this.mediaContext.createMediaElementSource(this.mediaElement)
        source
            .connect(this._gainNode)
            .connect(this._pannerNode)
            .connect(this.mediaContext.destination)
        this.updateSettings(mediaSettings)

        Media.instanceList.push(this)
    }

    updateSettings(mediaSettings) {
        this._gainNode.gain.value = mediaSettings.volume
        this._pannerNode.pan.value = mediaSettings.pan
        this.mediaSettings = mediaSettings
    }
}

class MediaSettings {
    constructor(volume = 1, pan = 0, speed = 1) {
        this.volume = volume
        this.pan = pan
        this.speed = speed
    }
}

class MediaShareControllable {
    updateMediaSettings() { throw new NotImplementedError() }
    updateVolume() { throw new NotImplementedError() }
    updatePan() { throw new NotImplementedError() }
    updateSpeed() { throw new NotImplementedError() }
}

class ShareControlMediaList extends MediaShareControllable {    
    constructor(mediaElements, sharedMediaSettings) {
        super()

        this.sharedMediaSettings = sharedMediaSettings
        this._medias = mediaElements.map((mediaElement) => {
            const media = Media.getOrCreate(
                mediaElement, 
                sharedMediaSettings
            )
            media.updateSettings(sharedMediaSettings)
            return media
        })
    }

    updateMediaSettings(settings) {
        this.sharedMediaSettings = settings
        this._medias.forEach((media) => {
            media.updateSettings(settings)
        })
    }

    updateVolume(volume) {
        this.updateMediaSettings(
            new MediaSettings(
                volume,
                this.sharedMediaSettings.pan,
                this.sharedMediaSettings.speed
            )
        )
    }

    updatePan(pan) {
        this.updateMediaSettings(
            new MediaSettings(                
                this.sharedMediaSettings.volume,
                pan, 
                this.sharedMediaSettings.speed
            )
        )
    }

    updateSpeed(speed) {
        this.updateMediaSettings(
            new MediaSettings(
                this.sharedMediaSettings.volume,
                this.sharedMediaSettings.pan, 
                speed
            )
        )
    }
}

class DocumentMediaList extends MediaShareControllable {
    mediaElementCollection = new ConcatHTMLCollection(
        document.getElementsByTagName("audio"),
        document.getElementsByTagName("video")
    )

    constructor(sharedMediaSettings) {
        super()
        this._mediaList = new ShareControlMediaList(
            this.mediaElementCollection.toArray(),
            sharedMediaSettings
        )
    }

    get sharedMediaSettings() {
        return this._mediaList.sharedMediaSettings
    }

    _sync() {
        this._mediaList = new ShareControlMediaList(
            this.mediaElementCollection.toArray(),
            this.sharedMediaSettings
        )
    }

    updateMediaSettings() {
        this._sync()
        return this._mediaList.updateMediaSettings()
    }

    updateVolume(volume) {
        this._sync()
        return this._mediaList.updateVolume(volume)
    }

    updatePan(pan) {
        this._sync()
        return this._mediaList.updatePan(pan)
    }

    updateSpeed(speed) {
        this._sync()
        return this._mediaList.updateSpeed(speed)
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

class NotImplementedError extends Error {}

class Model {
    documentMediaList = new DocumentMediaList(
        new MediaSettings()
    )

    pong() {
        return "pong"
    }

    getMediaSettings() {
        const mediaSettings = this.documentMediaList.sharedMediaSettings
        return {
            volume: mediaSettings.volume,
            pan: mediaSettings.pan,
            speed: mediaSettings.speed
        }
    }
    
    updateMediaVolume(volume) {
        this.documentMediaList.updateVolume(volume)
    }

    updateMediaPan(pan) {
        this.documentMediaList.updatePan(pan)
    }

    updateMediaSpeed(speed) {
        this.documentMediaList.updateSpeed(speed)
    }
}

(() => {
    const model = new Model()
    const processMap = {
        "PING": model.pong,
        "GET MediaSettings": model.getMediaSettings,
        "UPDATE MediaVolume": model.updateMediaVolume,
        "UPDATE MediaPan": model.updateMediaPan,
        "UPDATE MediaSpeed": model.updateMediaSpeed
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const process = processMap[message.request]
        const response = process.call(model, message.data)
        sendResponse(response)
    })
})()