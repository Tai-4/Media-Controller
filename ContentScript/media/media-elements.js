function getAllMediaElements() {
    const mediaElements = Array.from(document.querySelectorAll("audio, video"));
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            mediaElements.push(...iframeDocument.querySelectorAll("audio, video"));
        } catch (e) {
            // Ignore cross-origin iframe access errors
        }
    });
    return mediaElements;
}

function applySpeedToMediaElements(mediaElements, speed) {
    mediaElements.forEach((mediaElement) => {
        mediaElement.playbackRate = speed;
    });
}
