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
        const error = new ConnectionError("Connection Failed.")
        return await this._sendMessage(tabId, message, error)
    }

    async getSharedMediaSettings(tabId) {
        const message = {
            request: "GET MediaSettings"
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedMediaVolume(tabId, volume) {
        const message = {
            request: "UPDATE MediaVolume",
            data: volume
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedMediaPan(tabId, pan) {
        const message = {
            request: "UPDATE MediaPan",
            data: pan
        }
        return await this._sendMessage(tabId, message)
    }

    async updateSharedMediaSpeed(tabId, speed) {
        const message = {
            request: "UPDATE MediaSpeed",
            data: speed
        }
        return await this._sendMessage(tabId, message)
    }

    _sendMessage(tabId, message, error = new Error("Error has occurred in API class")) {
        return new Promise((resolve, reject) => {
            const callback = (response) => {
                if (chrome.runtime.lastError == undefined) {
                    resolve(response)
                } else {
                    reject(error)
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
    speedSlider = document.getElementsByClassName("settings__speed-level-controller__slider")[0]
    volumeLevelView = document.getElementsByClassName("settings__volume-persent__current")[0]
    speedLevelView = document.getElementsByClassName("settings__speed-persent__current")[0]
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

        const settings = await this.api.getSharedMediaSettings(this.currentTab.id)
        this.setSharedMediaSettings(settings)

        this.volumeSlider.addEventListener("input", async () => {
            this.volumeLevelView.textContent = this.volumeSlider.value * 10 * 10
            await this.api.updateSharedMediaVolume(
                this.currentTab.id,
                this.volumeSlider.value
            )
        }, false)
        this.speedSlider.addEventListener("input", async () => {
            this.speedLevelView.textContent = this.speedSlider.value * 10 * 10
            await this.api.updateSharedMediaSpeed(
                this.currentTab.id,
                this.speedSlider.value
            )
        })
        this.panSlider.addEventListener("input", async () => {
            await this.api.updateSharedMediaPan(
                this.currentTab.id,
                this.panSlider.value
            )
        }, false)
    }

    async canConnect(tabId) {
        const pong = await this.api.ping(tabId).catch((reason) => {
            if (reason instanceof ConnectionError) {
                return "not pong"
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

    setSharedMediaSettings(sharedMediaSettings) {
        this.volumeSlider.value = sharedMediaSettings.volume
        this.volumeLevelView.textContent = this.volumeSlider.value * 10 * 10
        this.speedSlider.value = sharedMediaSettings.speed
        this.speedLevelView.textContent = this.speedSlider.value * 10 * 10
        this.panSlider.value = sharedMediaSettings.pan
    }
}

const popupView = new PopupView
popupView.initialize()