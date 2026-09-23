import { MessageType, PORT_NAME } from '../shared/protocol.js';

const UI = {
    pageInfoView: document.querySelector('.page-info'),
    settingsView: document.querySelector('.settings'),
    volumeSlider: document.querySelector('.settings__volume-level-controller__slider'),
    speedSlider: document.querySelector('.settings__speed-level-controller__slider'),
    panSlider: document.querySelector('.settings__stereo-pan-level-controller__slider'),
    volumeDisplay: document.querySelector('.settings__volume-percent__current'),
    speedDisplay: document.querySelector('.settings__speed-percent__current'),
    pageFaviconDisplay: document.querySelector('.page-info__item__favicon'),
    pageTitleDisplay: document.querySelector('.page-info__item__title'),
};

async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function renderPageInfo(tab) {
    UI.pageTitleDisplay.textContent = tab.title;
    if (tab.favIconUrl) {
        UI.pageFaviconDisplay.src = tab.favIconUrl;
        UI.pageFaviconDisplay.hidden = false;
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'loading-box page-info__item__favicon';
        placeholder.append(Object.assign(document.createElement('div'), { className: 'loading-box__mark' }));
        UI.pageFaviconDisplay.after(placeholder);
    }
}

function renderState(state) {
    UI.volumeSlider.value = state.volume;
    UI.speedSlider.value = state.speed;
    UI.panSlider.value = state.pan;
    UI.volumeDisplay.textContent = Math.round(state.volume * 100);
    UI.speedDisplay.textContent = Math.round(state.speed * 100);
}

function renderConnectionError(tab) {
    // Content scripts cannot run on browser-internal pages such as chrome:// or the Web Store.
    const isWebPage = /^(https?|file):/.test(tab.url ?? '');
    const detail = isWebPage
        ? 'Reload this page and try again.'
        : 'Media on this page cannot be controlled.';

    const alertBox = document.createElement('div');
    alertBox.className = 'alert-box';
    const heading = Object.assign(document.createElement('h2'), { className: 'heading', textContent: 'Error' });
    const message = Object.assign(document.createElement('p'), { className: 'alert-box__detail', textContent: detail });
    alertBox.append(heading, message);

    UI.settingsView.hidden = true;
    UI.pageInfoView.after(alertBox);
}

async function main() {
    const tab = await getCurrentTab();
    renderPageInfo(tab);

    const port = chrome.tabs.connect(tab.id, { name: PORT_NAME });
    let connected = false;
    port.onMessage.addListener((message) => {
        if (message.type === MessageType.STATE) {
            connected = true;
            renderState(message.state);
        }
    });
    port.onDisconnect.addListener(() => {
        // Reading lastError marks it as handled. It is set when no content script is listening.
        void chrome.runtime.lastError;
        if (!connected) {
            renderConnectionError(tab);
        }
    });

    const sendPatch = (patch) => port.postMessage({ type: MessageType.UPDATE, patch });
    UI.volumeSlider.addEventListener('input', (event) => sendPatch({ volume: parseFloat(event.target.value) }));
    UI.speedSlider.addEventListener('input', (event) => sendPatch({ speed: parseFloat(event.target.value) }));
    UI.panSlider.addEventListener('input', (event) => sendPatch({ pan: parseFloat(event.target.value) }));
}

main();
