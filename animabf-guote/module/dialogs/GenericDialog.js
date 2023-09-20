import { Templates } from '../utils/constants.js';
export class GenericDialog extends FormApplication {
    constructor(data) {
        super(data);
        this.modalData = data;
        this.render(true);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['abf-dialog generic-dialog'],
            submitOnChange: true,
            closeOnSubmit: false,
            width: null,
            height: null,
            resizable: true,
            template: Templates.Dialog.GenericDialog,
            title: 'Dialog'
        });
    }
    activateListeners(html) {
        super.activateListeners(html);
        for (const button of this.modalData.buttons) {
            html.find(`#${button.id}`).click(e => {
                button.fn?.(e);
                this.close();
            });
        }
    }
    async close() {
        if (!this.modalData.onClose?.()) {
            return super.close();
        }
        return undefined;
    }
    getData() {
        return this.modalData;
    }
    async _updateObject(event, formData) {
        this.modalData = mergeObject(this.modalData, formData);
        this.render();
    }
}
