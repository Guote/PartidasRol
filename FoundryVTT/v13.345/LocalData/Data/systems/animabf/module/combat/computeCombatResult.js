import "../utils/constants.js";
import { ABFCombatResultData } from "./ABFCombatResultData.js";
function computeCombatResult(attackData, defenseData) {
  const defenderToken = defenseData.defenderTokenId && (canvas.tokens?.get?.(defenseData.defenderTokenId) || canvas.tokens?.placeables?.find((t) => t.id === defenseData.defenderTokenId)) || canvas.tokens?.placeables?.find((t) => t.actor?.id === defenseData.defenderId);
  const defenderActor = defenderToken?.actor || (defenseData.defenderId ? game.actors?.get?.(defenseData.defenderId) : null);
  attackData.attackerId ? game.actors?.get?.(attackData.attackerId) : null;
  const difference = (attackData.attackAbility ?? 0) - (defenseData.defenseAbility ?? 0);
  const hasCounterAttack = difference <= 0 && attackData.canBeCounterAttacked !== false && defenseData.canCounterAttack !== false;
  const counterAttackMultiplier = 0.5;
  const rawBonus = hasCounterAttack ? -difference * counterAttackMultiplier : 0;
  const counterAttackValue = Math.floor(rawBonus / 5) * 5;
  const baseDamage = getFinalBaseDamage(attackData, defenseData);
  const finalArmor = getFinalArmor(attackData, defenseData);
  const roundedDifference = Math.floor(difference / 10) * 10;
  const damagePercentage = Math.max(0, roundedDifference - finalArmor * 10 - 20);
  const finalDamage = baseDamage * damagePercentage / 100;
  tryApplySupernaturalShieldWear(defenderActor, attackData, defenseData, difference);
  const lifeBeforeAttack = defenderActor.system.characteristics.secondaries.lifePoints.value;
  let lifePercentRemoved = 100;
  if (lifeBeforeAttack > 0) {
    lifePercentRemoved = finalDamage / lifeBeforeAttack * 100;
  }
  const isCritical = lifePercentRemoved >= 50 || attackData.automaticCrit;
  const critValue = finalDamage + attackData.critBonus;
  return ABFCombatResultData.builder().difference(difference).hasCounterAttack(hasCounterAttack).counterAttackValue(counterAttackValue).damageFinal(finalDamage).lifePercentRemoved(Math.floor(Math.min(100, Math.max(lifePercentRemoved, 0)))).isCritical(isCritical).baseCriticalValue(critValue).attackBreak(attackData.breakage).build();
}
function tryApplySupernaturalShieldWear(defenderActor, attackData, defenseData, difference) {
  if (!defenderActor) return;
  const defenseType = defenseData?.defenseType;
  const usedShield = defenseType === "shield" || defenseType === "supernaturalShield";
  const blockedSuccessfully = (difference ?? 0) <= 0;
  if (!usedShield || !blockedSuccessfully) return;
  const shieldId = defenseData?.shieldId;
  if (!shieldId) return;
  const baseAttackDamage = Number(attackData?.damage ?? 0) || 0;
  let shieldDamageFromArmorPenetration = Number(attackData?.reducedArmor * 10);
  if (attackData?.ignoreArmor) {
    shieldDamageFromArmorPenetration = 200;
  }
  if (baseAttackDamage <= 0) return;
  const totalShieldDamage = baseAttackDamage + shieldDamageFromArmorPenetration;
  const shieldItem = defenderActor.items?.get?.(shieldId);
  if (shieldItem) {
    const current = Number(shieldItem.system?.shieldPoints ?? 0) || 0;
    const next = Math.max(0, current - totalShieldDamage);
    if (next !== current) {
      shieldItem.update({ "system.shieldPoints": next }).catch(() => {
      });
    }
    return;
  }
  const dyn = defenderActor.system?.dynamic?.supernaturalShields?.[shieldId];
  if (dyn?.system) {
    const current = Number(dyn.system.shieldPoints ?? 0) || 0;
    const next = Math.max(0, current - totalShieldDamage);
    if (next !== current) {
      defenderActor.update({
        [`system.dynamic.supernaturalShields.${shieldId}.system.shieldPoints`]: next
      }).catch(() => {
      });
    }
  }
}
function getFinalBaseDamage(attackData, defenseData) {
  const finalBaseDamage = Math.max(
    0,
    (attackData.damage ?? 0) - (defenseData.damageReduction ?? 0)
  );
  const roundedFinalBaseDamage = Math.ceil(finalBaseDamage / 10) * 10;
  return Math.max(0, roundedFinalBaseDamage);
}
function getFinalArmor(attackData, defenseData) {
  let armor = 0;
  if (attackData.ignoreArmor && defenseData.inmodifiableArmor) {
    armor = Math.ceil((defenseData.armor ?? 0) / 2);
  } else if (attackData.ignoreArmor) {
    armor = 0;
  } else if (defenseData.inmodifiableArmor) {
    armor = defenseData.armor ?? 0;
  } else {
    armor = (defenseData.armor ?? 0) - (attackData.reducedArmor ?? 0);
  }
  return Math.max(0, armor);
}
export {
  computeCombatResult
};
