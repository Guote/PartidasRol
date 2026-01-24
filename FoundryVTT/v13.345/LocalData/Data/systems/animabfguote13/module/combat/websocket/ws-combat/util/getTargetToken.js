import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
const getTargetToken = (attackerToken, targetTokens) => {
  let message;
  if (targetTokens.ids.length > 1) {
    message = game.i18n.localize("macros.combat.dialog.error.multipleTargets.title");
  }
  if (targetTokens.ids.length === 0) {
    message = game.i18n.localize("macros.combat.dialog.error.oneTarget.title");
  }
  if (message) {
    ABFDialogs.prompt(message);
    throw new Error(message);
  }
  const target = targetTokens.values().next().value.document;
  if (!target.actor?.id) {
    message = game.i18n.localize("macros.combat.dialog.error.withoutActor.title");
  }
  if (target.id === attackerToken.id) {
    message = game.i18n.localize("macros.combat.dialog.error.cannotAttackYourself.title");
  }
  if (message) {
    ABFDialogs.prompt(message);
    throw new Error(message);
  }
  return target;
};
export {
  getTargetToken
};
