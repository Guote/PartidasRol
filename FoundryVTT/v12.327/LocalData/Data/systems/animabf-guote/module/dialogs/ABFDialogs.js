import { PromptDialog } from "./PromptDialog.js";
import { ConfirmationDialog } from "./ConfirmationDialog.js";
const ABFDialogs = {
  /**
   * @param {string} body
   * @returns {Promise<void>}
   */
  prompt: (body) => new Promise((resolve) => {
    new PromptDialog(body, { onAccept: () => resolve() });
  }),
  /** @type {(title: string, body: string) => Promise<void>} */
  /**
   * @param {string} title
   * @param {string} body
   * @param {{ onConfirm?: () => void; onCancel?: () => void }}
   * @returns {Promise<string>}
   */
  confirm: (title, body, { onConfirm, onCancel } = {}) => new Promise((resolve) => {
    new ConfirmationDialog(title, body, {
      onConfirm: () => {
        onConfirm?.();
        resolve("confirm");
      },
      onCancel: () => {
        onCancel?.();
        resolve("cancel");
      }
    });
  })
};
export {
  ABFDialogs
};
