import { GenericDialog } from "./GenericDialog.js";
export class PromptDialog extends GenericDialog {
    constructor(body, { onAccept } = {}) {
        super({
            class: 'prompt-dialog',
            content: `<p class='body'>${body}</p>`,
            buttons: [
                {
                    id: 'on-confirm-button',
                    fn: onAccept,
                    content: game.i18n.localize('dialogs.accept')
                }
            ]
        });
    }
}
