import { renderTemplates } from "../../utils/renderTemplates.js";
import { Templates } from "../../utils/constants.js";
import { ABFDialogs } from "../../dialogs/ABFDialogs.js";
import { calculateCombatResult } from "../../combat/utils/calculateCombatResult.js";
const openDialog = async () => {
  const [dialogHTML, iconHTML] = await renderTemplates(
    {
      name: Templates.Dialog.DamageCalculator,
      context: {}
    },
    {
      name: Templates.Dialog.Icons.Accept
    }
  );
  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize("macros.damageCalculator.dialog.title"),
      content: dialogHTML,
      buttons: {
        submit: {
          icon: iconHTML,
          label: game.i18n.localize("dialogs.continue"),
          callback: (html) => {
            const results = new FormDataExtended(html.find("form")[0], {}).object;
            resolve(results);
          }
        }
      },
      default: "submit"
    }).render(true);
  });
};
const damageCalculatorMacro = async () => {
  const results = await openDialog();
  const attack = results["damage-calculator-attack-input"];
  const defense = results["damage-calculator-defense-input"];
  const at = results["damage-calculator-ta-input"];
  const damage = results["damage-calculator-damage-input"];
  if (typeof attack !== "number" || typeof defense !== "number" || typeof at !== "number" || typeof damage !== "number") {
    ABFDialogs.prompt("One of the fields is empty or is not a number");
    return;
  }
  const result = calculateCombatResult(attack, defense, at, damage);
  let final = `<div>HA: ${attack}, HD: ${defense}, at: ${at}, Daño Base: ${damage}</div>`;
  if (result.canCounterAttack) {
    final = `${final}<h2>Bono al contraataque: <span style='color:#ff1515'>${result.counterAttackBonus}</span></h2>`;
  } else {
    final = `${final}<h2>Daño final: <span style='color:#ff1515'>${result.damage}</span></h2>`;
  }
  const user = game.collections?.get("User");
  if (user !== void 0) {
    const isGM = (u) => u.isGM;
    const hasId = (u) => u.id !== null;
    const gmIds = user.filter(isGM).filter(hasId).map((u) => u.id);
    if (gmIds.length > 0) {
      ChatMessage.create({
        content: final,
        whisper: gmIds
      });
    }
  }
};
export {
  damageCalculatorMacro
};
