(async function() {
    const getCurrentTab = async () => {
        const queryOptions = { active: true, currentWindow: true };
        const tabList = await chrome.tabs.query(queryOptions);
        const currentTab = tabList[0];
        return currentTab;
    }
    const tab = await getCurrentTab();

    const UI = {
        pageInfoView: document.getElementsByClassName("page-info")[0],
        settingsView: document.getElementsByClassName("settings")[0],
        volumeSlider: document.getElementsByClassName("settings__volume-level-controller__slider")[0],
        panSlider: document.getElementsByClassName("settings__stereo-pan-level-controller__slider")[0],
        speedSlider: document.getElementsByClassName("settings__speed-level-controller__slider")[0],
        volumeDisplay: document.getElementsByClassName("settings__volume-persent__current")[0],
        speedDisplay: document.getElementsByClassName("settings__speed-persent__current")[0],
        pageFaviconDisplay: document.getElementsByClassName("page-info__item__favicon")[0],
        pageTitleDisplay: document.getElementsByClassName("page-info__item__title")[0]
    };
    UI.volumeSlider.addEventListener("input", async (event) => {
        const volume = parseFloat(event.target.value);
        chrome.tabs.sendMessage(tab.id, {
            request: "UPDATE MediaVolume",
            data: { volume: volume }
        });
    });
    UI.speedSlider.addEventListener("input", async (event) => {
        const speed = parseFloat(event.target.value);
        chrome.tabs.sendMessage(tab.id, {
            request: "UPDATE MediaSpeed",
            data: { speed: speed }
        });
    });
    UI.panSlider.addEventListener("input", async (event) => {
        const pan = parseFloat(event.target.value);
        chrome.tabs.sendMessage(tab.id, {
            request: "UPDATE MediaPan",
            data: { pan: pan }
        });
    });
    UI.pageTitleDisplay.textContent = tab.title;
    if (tab.favIconUrl) {
        UI.pageFaviconDisplay.src = tab.favIconUrl;
    } else {
        UI.pageFaviconDisplay.hidden = true;
        UI.pageFaviconDisplay.insertAdjacentHTML(
            "afterend", `<div class="loading-box page-info__item__favicon"><div class="loading-box__mark" /></div>`
        );
    }
    chrome.runtime.onMessage.addListener((message) => {
        switch (message.type) {
            case "VOLUME_UPDATED":
                UI.volumeSlider.value = message.value;
                UI.volumeDisplay.textContent = Math.round(message.value * 100);
                break;
            case "SPEED_UPDATED":
                UI.speedSlider.value = message.value;
                UI.speedDisplay.textContent = Math.round(message.value * 100);
                break;
            case "PAN_UPDATED":
                UI.panSlider.value = message.value;
                break;
        }
    });

    chrome.tabs.sendMessage(tab.id, { request: "PING" }, (response) => {
        if (chrome.runtime.lastError == undefined) {
            chrome.tabs.sendMessage(tab.id, { request: "GET MediaSettings" }, (response) => {
                UI.volumeSlider.value = response.volume;
                UI.speedSlider.value = response.speed;
                UI.panSlider.value = response.pan;
                UI.volumeDisplay.textContent = Math.round(response.volume * 100);
                UI.speedDisplay.textContent = Math.round(response.speed * 100);
            });
        } else {
            UI.settingsView.hidden = true;
            UI.pageInfoView.insertAdjacentHTML(
                "afterend", `<div class="alert-box"><h2 class="heading">Error</h2><p class="alert-box__detail">Connection failed.</p></div>`
            );
        }
    });
})();