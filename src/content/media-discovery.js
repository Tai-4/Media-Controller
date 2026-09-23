const MEDIA_SELECTOR = 'audio, video';

export function isMediaElement(node) {
    return node?.localName === 'audio' || node?.localName === 'video';
}

/** Finds media elements in the document and in same-origin iframes. */
export function findMediaElements(root = document) {
    const mediaElements = Array.from(root.querySelectorAll(MEDIA_SELECTOR));
    for (const iframe of root.querySelectorAll('iframe')) {
        try {
            const iframeDocument = iframe.contentDocument;
            if (iframeDocument) {
                mediaElements.push(...iframeDocument.querySelectorAll(MEDIA_SELECTOR));
            }
        } catch {
            // Ignore cross-origin iframe access errors
        }
    }
    return mediaElements;
}
