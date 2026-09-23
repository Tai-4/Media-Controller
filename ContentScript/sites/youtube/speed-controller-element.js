class YoutubeSpeedControllerElement {

    constructor(mediaStateStore, clickCallback, dblClickCallback, wheelCallback) {
        this._mediaStateStore = mediaStateStore;
        this._clickCallback = clickCallback;
        this._dblClickCallback = dblClickCallback;
        this._wheelCallback = wheelCallback;
        this._onMediaSpeedChangeListener = (event) => {
            this._drawCurrentMediaSpeed(event.detail.newSpeed);
        };
    }

    inject(targetElement) {
        if (!targetElement) {
            return null;
        }

        const controller = this._createControllerElement(
            this._formatSpeedText(this._mediaStateStore.state.speed)
        );
        targetElement.insertAdjacentElement('beforeend', controller);

        controller.addEventListener('click', () => {
            this._clickCallback();
        });
        controller.addEventListener('dblclick', () => {
            this._dblClickCallback();
        });
        controller.addEventListener('wheel', (event) => {
            event.preventDefault();
            this._wheelCallback(event.deltaY);
        })

        this._mediaStateStore.addEventListener('onMediaSpeedChange', this._onMediaSpeedChangeListener);
        return controller;
    }

    remove() {
        const controller = document.getElementById('mc-speed-controller');
        if (!controller) {
            return;
        }

        const frame = controller.parentElement.parentElement;
        if (frame) {
            frame.remove();
        }
        this._mediaStateStore.removeEventListener('onMediaSpeedChange', this._onMediaSpeedChangeListener);
    }

    _formatSpeedText(speed) {
        return `${speed.toFixed(1)}x`;
    }

    _drawCurrentMediaSpeed(speed) {
        const controller = document.getElementById('mc-speed-controller');
        const speedText = controller.querySelector('.ytSpecButtonShapeNextButtonTextContent');
        speedText.textContent = this._formatSpeedText(speed);
    }

    _createControllerElement(speedText) {
        const originalButton = document.querySelector('ytd-menu-renderer yt-button-view-model');
        if (!originalButton) {
            return null;
        }

        const controller = originalButton.cloneNode(true);
        controller.id = 'mc-speed-controller';

        const buttonElement = controller.querySelector('button');
        if (buttonElement) {
            buttonElement.setAttribute('aria-label', "Speed Controller");
            buttonElement.removeAttribute('title');
            buttonElement.classList.remove('ytSpecButtonShapeNextIconLeading');
        }
        const iconWrapper = controller.querySelector('.ytSpecButtonShapeNextIcon');
        if (iconWrapper) {
            iconWrapper.remove();
        }
        const textElement = controller.querySelector('.ytSpecButtonShapeNextButtonTextContent');
        if (textElement) {
            textElement.textContent = speedText;
        }

        return controller;
    }
}
