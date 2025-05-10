class TabUtils {
    static async getCurrentTab(){
        const queryOptions = { active: true, currentWindow: true };
        const tabList = await chrome.tabs.query(queryOptions);
        const currentTab = tabList[0];
        return currentTab;
    }
}

class ConnectionError extends Error {}

class API {
    async ping(tabId) {
        const message = {
            request: "PING"
        }
        return await this._sendMessage(tabId, message, ConnectionError)
    }

    async getSharedAudioSettings(tabId) {
        const message = {
            request: "GET AudioSettings"
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedAudioVolume(tabId, volume) {
        const message = {
            request: "UPDATE AudioVolume",
            data: volume
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedAudioPan(tabId, pan) {
        const message = {
            request: "UPDATE AudioPan",
            data: pan
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedAudioSpeed(tabId, speed) {
        const message = {
            request: "UPDATE AudioSpeed",
            data: speed
        }
        return await this._sendMessage(tabId, message)
    }

    _sendMessage(tabId, message, errorType = Error) {
        return new Promise((resolve, reject) => {
            const callback = (response) => {
                if (chrome.runtime.lastError == undefined) {
                    resolve(response)
                } else {
                    reject(errorType)
                }
            }
            chrome.tabs.sendMessage(tabId, message, callback)
        })
    }
}

class PopupView {
    static loadingAnimationHTML = `
        <div class="loading-box page-info__item__favicon">
            <div class="loading-box__mark" />
        </div>
    `

    static alertboxHTML = `
        <div class="alert-box">
            <h2 class="heading">Error</h2>
            <p class="alert-box__detail">Connection failed.</p>
        </div>
    `

    api = new API()

    pageInfoView = document.getElementsByClassName("page-info")[0]
    settingsControllerView = document.getElementsByClassName("settings")[0]
    volumeSlider = document.getElementsByClassName("settings__volume-level-controller__slider")[0]
    panSlider = document.getElementsByClassName("settings__stereo-pan-level-controller__slider")[0]
    volumeLevelView = document.getElementsByClassName("settings__volume-persent__current")[0]
    pageFaviconView = document.getElementsByClassName("page-info__item__favicon")[0]
    pageTitleView = document.getElementsByClassName("page-info__item__title")[0]
    
    async initialize() {
        this.currentTab = await TabUtils.getCurrentTab()
        const canConnect = await this.canConnect(this.currentTab.id)
        
        this.setPageInfo(this.currentTab)

        if (!canConnect) {
            this.settingsControllerView.hidden = true
            this.pageInfoView.insertAdjacentHTML(
                "afterend", PopupView.alertboxHTML
            )
            return
        }

        const settings = await this.api.getSharedAudioSettings(this.currentTab.id)
        this.setSharedAudioSettings(settings)

        this.volumeSlider.addEventListener("input", async () => {
            this.volumeLevelView.textContent = this.volumeSlider.value * 10 *10
            await this.api.updateSharedAudioVolume(
                this.currentTab.id,
                this.volumeSlider.value
            )
        }, false)
        this.panSlider.addEventListener("input", async () => {
            await this.api.updateSharedAudioPan(
                this.currentTab.id,
                this.panSlider.value
            )
        }, false)
    }

    async canConnect(tabId) {
        const pong = await this.api.ping(tabId).catch((reason) => {
            if (reason == ConnectionError) {
                return
            } else {
                throw reason
            }
        })
        return pong == "pong" 
    }

    setPageInfo(pageTab) {
        this.pageTitleView.textContent = pageTab.title
        if (pageTab.favIconUrl) {
            this.pageFaviconView.src = pageTab.favIconUrl
        } else {
            this.pageFaviconView.hidden = true
            this.pageFaviconView.insertAdjacentHTML(
                "afterend", PopupView.loadingAnimationHTML
            )
        }
    }

    setSharedAudioSettings(sharedAudioSettings) {
        this.volumeSlider.value = sharedAudioSettings.volume
        this.volumeLevelView.textContent = this.volumeSlider.value * 10 * 10
        this.panSlider.value = sharedAudioSettings.pan
    }
}

const popupView = new PopupView
popupView.initialize()