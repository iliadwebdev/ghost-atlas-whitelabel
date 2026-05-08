import Component from '@glimmer/component';
import {action} from '@ember/object';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

function hasParagraphWrapper(html) {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(html, 'text/html');

    return doc.body?.firstElementChild?.tagName === 'P';
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function roundToTenth(value) {
    return Math.round(value * 10) / 10;
}

// `{x: 50, y: 50}` is the implicit centre — the backend collapses it to null
// on save, so we mirror that client-side to avoid a flicker on round-trip.
function collapseCenter(point) {
    if (point && point.x === 50 && point.y === 50) {
        return null;
    }
    return point;
}

export default class GhEditorFeatureImageComponent extends Component {
    @service settings;

    @tracked isEditingAlt = false;
    @tracked captionInputFocused = false;
    @tracked showUnsplashSelector = false;
    @tracked canDrop = false;
    @tracked tkCount = 0;
    @tracked isPickingFocalPoint = false;
    @tracked localFocalPoint = null;
    @tracked isDragging = false;

    imageElement = null;
    _boundOnPointerMove = null;
    _boundOnPointerUp = null;
    _boundOnKeyDown = null;

    get displayFocalPoint() {
        if (this.localFocalPoint) {
            return this.localFocalPoint;
        }
        if (this.args.focalPoint) {
            return this.args.focalPoint;
        }
        // While picking with no chosen point yet, show a muted centre marker
        // to communicate "centre is the default; click to choose."
        if (this.isPickingFocalPoint) {
            return {x: 50, y: 50};
        }
        return null;
    }

    get hasFocalPoint() {
        return !!this.args.focalPoint;
    }

    get isFocalMarkerMuted() {
        return this.isPickingFocalPoint && !this.localFocalPoint && !this.args.focalPoint;
    }

    get focalMarkerStyle() {
        const point = this.displayFocalPoint;
        if (!point) {
            return htmlSafe('');
        }
        return htmlSafe(`left: ${point.x}%; top: ${point.y}%;`);
    }

    get caption() {
        const content = this.args.caption;
        if (!content) {
            return null;
        }
        // wrap in a paragraph, so it gets parsed correctly
        return hasParagraphWrapper(content) ? content : `<p>${content}</p>`;
    }

    @action
    setCaption(html) {
        const cleanedHtml = cleanBasicHtml(html || '', {firstChildInnerContent: true});
        this.args.updateCaption(cleanedHtml);
    }

    @action
    registerEditorAPI(API) {
        this.editorAPI = API;
    }

    @action
    focusCaptionEditor() {
        if (this.editorAPI) {
            this.editorAPI.focusEditor({position: 'bottom'});
        }
    }

    @action
    handleCaptionBlur() {
        this.captionInputFocused = false;
        this.args.handleCaptionBlur();
    }

    @action
    setUploadedImage(results) {
        if (results[0]) {
            this.args.updateImage(results[0].url);
        }
    }

    @action
    setUnsplashImage({src, caption}) {
        this.args.updateImage(src);
        this.args.updateCaption(caption);
    }

    @action
    toggleUnsplashSelector() {
        this.showUnsplashSelector = !this.showUnsplashSelector;
    }

    @action
    toggleAltEditing() {
        if (!this.isEditingAlt && this.isPickingFocalPoint) {
            this.stopPicking();
        }
        this.isEditingAlt = !this.isEditingAlt;
    }

    @action
    registerImageElement(el) {
        this.imageElement = el;
    }

    @action
    startPicking() {
        this.isEditingAlt = false;
        this.isPickingFocalPoint = true;
        this.localFocalPoint = null;
        this._boundOnKeyDown = this.onKeyDown.bind(this);
        window.addEventListener('keydown', this._boundOnKeyDown);
    }

    @action
    stopPicking() {
        if (this.localFocalPoint) {
            this.args.updateFocalPoint(collapseCenter(this.localFocalPoint));
        }
        this.localFocalPoint = null;
        this.isPickingFocalPoint = false;
        this.isDragging = false;
        this._detachDragListeners();
        if (this._boundOnKeyDown) {
            window.removeEventListener('keydown', this._boundOnKeyDown);
            this._boundOnKeyDown = null;
        }
    }

    @action
    resetFocalPoint() {
        this.localFocalPoint = null;
        this.args.updateFocalPoint(null);
    }

    @action
    onPickerPointerDown(event) {
        if (!this.isPickingFocalPoint || !this.imageElement) {
            return;
        }
        // Clicks on the Reset/Done overlay buttons must not place a focal point
        if (event.target.closest('.image-action')) {
            return;
        }
        event.preventDefault();
        this.isDragging = true;
        this.localFocalPoint = this._coordsFromEvent(event);
        this._boundOnPointerMove = this.onPointerMove.bind(this);
        this._boundOnPointerUp = this.onPointerUp.bind(this);
        window.addEventListener('pointermove', this._boundOnPointerMove);
        window.addEventListener('pointerup', this._boundOnPointerUp);
    }

    onPointerMove(event) {
        if (!this.isDragging) {
            return;
        }
        this.localFocalPoint = this._coordsFromEvent(event);
    }

    onPointerUp() {
        if (!this.isDragging) {
            return;
        }
        this.isDragging = false;
        const committed = collapseCenter(this.localFocalPoint);
        this.args.updateFocalPoint(committed);
        this.localFocalPoint = null;
        this._detachDragListeners();
    }

    onKeyDown(event) {
        if (event.key === 'Escape' && this.isPickingFocalPoint) {
            event.preventDefault();
            this.stopPicking();
        }
    }

    _coordsFromEvent(event) {
        const rect = this.imageElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return {x: 50, y: 50};
        }
        const x = clamp((event.clientX - rect.left) / rect.width * 100, 0, 100);
        const y = clamp((event.clientY - rect.top) / rect.height * 100, 0, 100);
        return {x: roundToTenth(x), y: roundToTenth(y)};
    }

    _detachDragListeners() {
        if (this._boundOnPointerMove) {
            window.removeEventListener('pointermove', this._boundOnPointerMove);
            this._boundOnPointerMove = null;
        }
        if (this._boundOnPointerUp) {
            window.removeEventListener('pointerup', this._boundOnPointerUp);
            this._boundOnPointerUp = null;
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this._detachDragListeners();
        if (this._boundOnKeyDown) {
            window.removeEventListener('keydown', this._boundOnKeyDown);
            this._boundOnKeyDown = null;
        }
    }

    @action
    onAltInput(event) {
        this.args.updateAlt(event.target.value);
    }

    @action
    dragOver(event) {
        if (!event.dataTransfer.files) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            let eA = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';
        }

        // event.stopPropagation();
        event.preventDefault();

        this.canDrop = true;
    }

    @action
    dragLeave(event) {
        if (!event.dataTransfer.files) {
            return;
        }

        event.preventDefault();
        this.canDrop = false;
    }

    @action
    drop(setFiles, event) {
        if (!event.dataTransfer.files) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        this.canDrop = false;

        setFiles(event.dataTransfer.files);
    }

    @action
    saveImage(setFiles, imageFile) {
        this.canDrop = false;
        setFiles([imageFile]);
    }

    @action
    onTKCountChange(count) {
        if (this.args.onTKCountChange) {
            this.tkCount = count;
            this.args.onTKCountChange(count);
        }
    }
}
