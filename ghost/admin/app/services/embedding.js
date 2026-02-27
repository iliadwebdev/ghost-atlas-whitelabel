import Service from '@ember/service';

export default class EmbeddingService extends Service {
    get isEmbedded() {
        try {
            return window.self !== window.top;
        } catch (e) {
            // Cross-origin iframe throws on window.top access in some browsers
            return true;
        }
    }
}
