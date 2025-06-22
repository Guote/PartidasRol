import { renderTemplates } from "../renderTemplates.js";
import { Templates } from "../constants.js";
const openSimpleInputDialog = async ({
  title = "",
  content,
  placeholder = ""
}) => {
  const referencedGame = game;
  const [dialogHTML, iconHTML] = await renderTemplates(
    {
      name: Templates.Dialog.ModDialog,
      context: {
        content,
        placeholder
      }
    },
    {
      name: Templates.Dialog.Icons.Accept
    }
  );
  return new Promise((resolve) => {
    new Dialog({
      title: title ? title : referencedGame.i18n.localize("dialogs.title"),
      content: dialogHTML,
      buttons: {
        submit: {
          icon: iconHTML,
          label: referencedGame.i18n.localize("dialogs.continue"),
          callback: (html) => {
            const results = new FormDataExtended(html.find("form")[0], {}).object;
            resolve(results["dialog-input"]);
          }
        }
      },
      default: "submit",
      render: () => $("#dialog-input").focus()
    }).render(true);
  });
};
const openModDialog = async () => {
  const referencedGame = game;
  return openSimpleInputDialog({
    content: referencedGame.i18n.localize("dialogs.mod.content"),
    placeholder: "0"
  });
};
export {
  openModDialog,
  openSimpleInputDialog
};
