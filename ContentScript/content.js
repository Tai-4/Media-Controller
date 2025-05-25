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
        this.mediaElement.playbackRate = mediaSettings.speed
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

class DocumentMedia extends MediaShareControllable {
    constructor(document, sharedMediaSettings) {
        super()
        this.mediaElementCollection = new ConcatHTMLCollection(
            document.getElementsByTagName("audio"),
            document.getElementsByTagName("video")
        )
        this._mediaList = new ShareControlMediaList(
            this.mediaElementCollection.toArray(),
            sharedMediaSettings
        )
    }

    get sharedMediaSettings() {
        return this._mediaList.sharedMediaSettings
    }

    _syncMediaList(aliveMediaElementCollection) {
        this._mediaList = new ShareControlMediaList(
            aliveMediaElementCollection.toArray(),
            this.sharedMediaSettings
        )
    }

    registerNewDocument(newDocument) {
        const newCollection = new ConcatHTMLCollection(
            newDocument.getElementsByTagName("audio"),
            newDocument.getElementsByTagName("video")
        )
        this.mediaElementCollection.concat(newCollection)
        this.updateMediaSettings(this.sharedMediaSettings)
    }

    updateMediaSettings(newSettings) {
        this._syncMediaList(this.mediaElementCollection)
        return this._mediaList.updateMediaSettings(newSettings)
    }

    updateVolume(volume) {
        this._syncMediaList(this.mediaElementCollection)
        return this._mediaList.updateVolume(volume)
    }

    updatePan(pan) {
        this._syncMediaList(this.mediaElementCollection)
        return this._mediaList.updatePan(pan)
    }

    updateSpeed(speed) {
        this._syncMediaList(this.mediaElementCollection)
        return this._mediaList.updateSpeed(speed)
    }
}

class ConcatHTMLCollection {
    constructor(...collections) {
        this.collections = collections
    }

    concat(newConcatHTMLCollection) {
        this.collections.push(
            ...newConcatHTMLCollection.collections
        )
    }

    toArray() {
        return this.collections.flatMap(
            (collection) => [...collection]
        )
    }
}

class NotImplementedError extends Error {}

class Model {
    constructor() {
        this.documentMedia = new DocumentMedia(
            document, new MediaSettings()
        )

        const iframeList = document.querySelectorAll('iframe')
        iframeList.forEach((iframe) => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document
                this.documentMedia.registerNewDocument(doc)
            } catch (error) {
                if (error.name == "SecurityError") {
                    // Do nothing on CORS errors.
                    return
                }
                throw error
            }
        })
    }

    pong() {
        return "pong"
    }

    getMediaSettings() {
        const mediaSettings = this.documentMedia.sharedMediaSettings
        return {
            volume: mediaSettings.volume,
            pan: mediaSettings.pan,
            speed: mediaSettings.speed
        }
    }
    
    updateMediaVolume(volume) {
        this.documentMedia.updateVolume(volume)
    }

    updateMediaPan(pan) {
        this.documentMedia.updatePan(pan)
    }

    updateMediaSpeed(speed) {
        this.documentMedia.updateSpeed(speed)
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