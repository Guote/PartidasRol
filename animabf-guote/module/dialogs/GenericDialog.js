import { Templates } from "../utils/constants.js";
export class GenericDialog extends FormApplication {
    constructor(data) {
        super(data);
        this.data = data;
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
        for (const button of this.data.buttons) {
            html.find(`#${button.id}`).click(e => {
                button.fn?.(e);
                this.close();
            });
        }
    }
    async close() {
        if (!this.data.onClose?.()) {
            return super.close();
        }
        return undefined;
    }
    getData() {
        return this.data;
    }
    async _updateObject(event, formData) {
        this.data = mergeObject(this.data, formData);
        this.render();
    }
}
