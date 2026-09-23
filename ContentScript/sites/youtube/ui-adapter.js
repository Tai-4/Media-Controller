class YoutubeUIAdapter {
    run(speedControllerElement) {
        window.addEventListener('yt-page-data-updated', async () => {
            if (this._isWatchPage()) {
                const injectTarget = await this._getSpeedControllerInjectTargetAsync();
                speedControllerElement.inject(injectTarget);
            } else {
                speedControllerElement.remove();
            }
        });
    }

    _getSpeedControllerInjectTarget() {
        // There are many elements which have #top-level-buttons-computed.
        // Only the element within ytd-watch-metadata are required.
        return document.querySelector('ytd-watch-metadata #top-level-buttons-computed');
    }

    _getSpeedControllerInjectTargetAsync() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const target = this._getSpeedControllerInjectTarget();
                if (target) {
                    clearInterval(checkInterval);
                    resolve(target);
                }
            }, 100);
        });
    }

    _isWatchPage() {
        const url = new URL(window.location.href);
        return url.pathname === '/watch'
    }
}
