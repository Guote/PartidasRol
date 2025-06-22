import { PromptDialog } from './PromptDialog.js';
import { ConfirmationDialog } from './ConfirmationDialog.js';
export const ABFDialogs = {
    prompt: (body) => new Promise(resolve => {
        new PromptDialog(body, { onAccept: () => resolve() });
    }),
    confirm: (title, body, { onConfirm, onCancel } = {}) => new Promise(resolve => {
        new ConfirmationDialog(title, body, {
            onConfirm: () => {
                onConfirm?.();
                resolve();
            },
            onCancel: () => {
                onCancel?.();
                resolve();
            }
        });
    })
};
