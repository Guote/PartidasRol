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
};
