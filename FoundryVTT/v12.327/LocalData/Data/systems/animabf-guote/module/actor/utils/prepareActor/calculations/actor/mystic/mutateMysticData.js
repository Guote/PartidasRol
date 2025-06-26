import { bulkMutateData } from "../../../utils/mutateData.js";

export const mutateMysticData = (data) => {
    const { mystic } = data;
    
    bulkMutateData(
      data,
      ["mystic.act.main", "mystic.act.alternative"],
      Math.floor(data.general.modifiers.modFinal.general.final.value / 10) * 5,
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
      data.general.modifiers.modFinal.general.final.value,
      0
    );

    const dailyZeon = mystic.spellMaintenances.reduce((acc, currentValue) => acc + currentValue.system.cost.value, 0);
    mystic.zeonRegeneration.final.value = Math.max(mystic.zeonRegeneration.base.value - dailyZeon, 0);
};
