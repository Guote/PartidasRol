import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
const assertGMActive = () => {
  if (!game.users?.find((u) => u.isGM && u.active)) {
    const message = game.i18n.localize("macros.combat.dialog.error.noGMActive.title");
    ABFDialogs.prompt(message);
    throw new Error(message);
  }
};
export {
  assertGMActive
};
