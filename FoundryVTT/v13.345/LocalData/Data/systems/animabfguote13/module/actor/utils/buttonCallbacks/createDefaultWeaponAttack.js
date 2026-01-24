import { Templates } from "../../../utils/constants.js";
import { ABFAttackData } from "../../../combat/ABFAttackData.js";
import { openModDialog } from "../../../utils/dialogs/openSimpleInputDialog.js";
async function createDefaultWeaponAttack(sheet, e) {
  const weaponId = e.currentTarget.dataset.weaponId;
  const weapon = sheet.actor.items.get(weaponId);
  if (!weapon) {
    ui.notifications.warn("Arma no encontrada.");
    return;
  }
  const label = `Rolling attack`;
  const mod = await openModDialog();
  const actor = sheet.actor;
  let baseAttack = weapon.system.attack.final.value;
  let formula = `${actor.system.combat.attack.base.value >= 200 ? actor.system.general.diceSettings.abilityMasteryDie.value : actor.system.general.diceSettings.abilityDie.value} + ${baseAttack} + ${mod}`;
  const roll = new ABFFoundryRoll(formula, actor.system);
  await roll.evaluate({ async: true });
  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: label
  });
  const attackData = ABFAttackData.builder().attackAbility(roll.total).damage(weapon.system.damage?.final?.value).ignoreArmor(weapon.system.ignoreArmor.value).reducedArmor(weapon.system.reducedArmor.final.value).armorType(weapon.system.critic?.primary?.value).damageType(game.animabfguote13.combat.DamageType.NONE).presence(weapon.system.presence?.final?.value).isProjectile(false).automaticCrit(false).critBonus(0).attackerId(sheet.actor.id).weaponId(weapon.id).build();
  const content = await renderTemplate(Templates.Chat.AttackData, {
    weapon,
    actor: sheet.actor,
    attackData
    // for {{json attackData}} in the button
  });
  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor: sheet.actor })
  });
}
export {
  createDefaultWeaponAttack
};
