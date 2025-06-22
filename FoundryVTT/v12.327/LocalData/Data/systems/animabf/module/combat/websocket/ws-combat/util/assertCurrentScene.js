import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
const assertCurrentScene = () => {
  if (game.scenes?.current?.id !== game.scenes?.active?.id) {
    const message = game.i18n.localize(
      "macros.combat.dialog.error.notInActiveScene.title"
    );
    ABFDialogs.prompt(message);
    throw new Error(message);
  }
};
export {
  assertCurrentScene
};
