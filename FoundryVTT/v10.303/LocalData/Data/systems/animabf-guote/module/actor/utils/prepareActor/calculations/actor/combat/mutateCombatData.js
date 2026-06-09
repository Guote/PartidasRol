import { mutateData } from "../../../utils/mutateData.js";

export const mutateCombatData = async (data) => {
  const activeEffectModAtk =
    data?.activeEffects?.combat?.attack?.final?.value ?? 0;
  const activeEffectModDef =
    (data?.activeEffects?.combat?.block?.final?.value ||
      data?.activeEffects?.combat?.dodge?.final?.value) ??
    0;
  
  mutateData(data, "combat.attack");
  mutateData(data, "combat.block");
  mutateData(data, "combat.dodge");

  const modFinal = data.general.modifiers.modFinal;
  data.combat.attack.withMod = {
    value: (data.combat.attack.final.value ?? 0) + (modFinal.attack.final.value ?? 0),
  };
  data.combat.block.withMod = {
    value: (data.combat.block.final.value ?? 0) + (modFinal.defense.final.value ?? 0),
  };
  data.combat.dodge.withMod = {
    value: (data.combat.dodge.final.value ?? 0) + (modFinal.defense.final.value ?? 0),
  };
};
