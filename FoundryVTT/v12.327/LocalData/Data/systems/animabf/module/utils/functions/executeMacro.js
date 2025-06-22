import { Logger } from "../../../utils/log.js";
import { ABFSettingsKeys } from "../../../utils/registerSettings.js";
const executeMacro = (name, args) => {
  if (!name) {
    return;
  }
  setTimeout(() => {
    const macro = game.macros.getName(name);
    Logger.debug(args);
    if (macro) {
      macro.execute(args);
    } else {
      Logger.debug(`Macro '${name}' not found.`);
      let defaultMacroName = "";
      if (args.shieldId) {
        defaultMacroName = game.settings.get(
          "animabf",
          ABFSettingsKeys.MACRO_SHIELD_DEFAULT
        );
      } else if (args.projectile?.name) {
        defaultMacroName = game.settings.get(
          "animabf",
          ABFSettingsKeys.MACRO_PROJECTILE_DEFAULT
        );
      } else {
        defaultMacroName = game.settings.get(
          "animabf",
          ABFSettingsKeys.MACRO_ATTACK_DEFAULT
        );
      }
      game.macros.getName(defaultMacroName)?.execute(args);
    }
  }, 250);
};
export {
  executeMacro
};
