import { renderTemplates } from "../renderTemplates.js";
import { Templates } from "../constants.js";
const openComplexInputDialog = async (actor, dialogType) => {
  const { i18n } = game;
  let castOverride = actor.getFlag("animabf", "spellCastingOverride") || false;
  const [dialogHTML, iconHTML] = await renderTemplates(
    {
      name: dialogType === "newSupernaturalShield" ? Templates.Dialog[dialogType].main : Templates.Dialog[dialogType],
      context: {
        data: {
          actor,
          mystic: {
            spellUsed: void 0,
            spellGrade: "base",
            castInnate: false,
            castPrepared: false,
            castOverride
          }
        }
      }
    },
    {
      name: Templates.Dialog.Icons.Accept
    }
  );
  return new Promise((resolve) => {
    new Dialog(
      {
        title: i18n.localize("dialogs.title"),
        content: dialogHTML,
        buttons: {
          submit: {
            icon: iconHTML,
            label: i18n.localize("dialogs.continue"),
            callback: (html) => {
              const results = new FormDataExtended(html.find("form")[0], {}).object;
              if (html.find(".psychic.active").length !== 0) {
                results.tab = "psychic";
              }
              if (html.find(".mystic.active").length !== 0) {
                results.tab = "mystic";
              }
              resolve(results);
            }
          }
        },
        default: "submit"
      },
      {
        tabs: [
          {
            navSelector: ".sheet-tabs",
            contentSelector: ".sheet-body"
          }
        ]
      }
    ).render(true);
  });
};
export {
  openComplexInputDialog
};
