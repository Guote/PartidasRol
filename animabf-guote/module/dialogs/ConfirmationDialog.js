import { GenericDialog } from "./GenericDialog.js";
export class ConfirmationDialog extends GenericDialog {
    constructor(title, body, { onConfirm, onCancel } = {
        onConfirm: () => {
            this.close();
        },
        onCancel: () => {
            this.close();
        }
    }) {
        super({
            class: 'confirmation-dialog',
            content: `
    <p class='title'>${title}</p>
    <p class='body'>${body}</p>
`,
            buttons: [
                { id: 'on-cancel-button', fn: onCancel, content: game.i18n.localize('dialogs.cancel') },
                { id: 'on-confirm-button', fn: onConfirm, content: game.i18n.localize('dialogs.accept') }
            ]
        });
    }
}
