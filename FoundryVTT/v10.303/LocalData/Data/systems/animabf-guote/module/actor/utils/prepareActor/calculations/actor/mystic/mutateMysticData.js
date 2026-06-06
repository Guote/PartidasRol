import { bulkMutateData } from "../../../utils/mutateData.js";

export const mutateMysticData = (data) => {
    const { mystic } = data;
    
    bulkMutateData(
      data,
      ["mystic.act.main", "mystic.act.alternative"],
      Math.min(0, Math.floor(data.general.modifiers.modFinal.general.final.value / 10) * 5),
      0
    );
    bulkMutateData(
      data,
      [
        "mystic.magicProjection",
        "mystic.magicProjection.imbalance.offensive",
        "mystic.magicProjection.imbalance.defensive",
        "mystic.summoning.summon",
        "mystic.summoning.banish",
        "mystic.summoning.bind",
        "mystic.summoning.control",
      ],
      0,
      0
    );

    const dailyZeon = mystic.spellMaintenances
      .filter(m => m.system?.active?.value !== false)
      .reduce((acc, m) => acc + (m.system?.cost?.value ?? 0) + (m.system?.dayCostMod?.value ?? 0), 0);
    mystic.zeonRegeneration.final.value = Math.max(mystic.zeonRegeneration.base.value - dailyZeon, 0);
};
