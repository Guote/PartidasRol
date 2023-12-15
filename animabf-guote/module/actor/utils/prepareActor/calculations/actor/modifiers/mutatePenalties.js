import { calculateFatigue } from "./calculations/calculateFatigue.js";

const getMaxAndMin = (array) => {
  let max = Math.max(0, ...array);
  let min = Math.min(0, ...array);
  return {
    max: max,
    min: min,
  };
};

export const mutatePenalties = (data, actor) => {
  let modFisArray = [
    data.general.modifiers.modFisico.bonus.value,
    data.general.modifiers.modFisico.malus.value,
    game?.cub?.hasCondition("Cansancio", actor) ? calculateFatigue(data) : 0,
    data.general.modifiers.modFisico.dolor ?? 0,
    data.general.modifiers.modFisico.critico ?? 0,
    data.general.modifiers.modFisico.conditionBon ?? 0,
    data.general.modifiers.modFisico.conditionPen ?? 0,
  ];
  let modSobArray = [
    data.general.modifiers.modSobrenatural.bonus.value,
    data.general.modifiers.modSobrenatural.malus.value,
    data.general.modifiers.modSobrenatural.conditionBon ?? 0,
    data.general.modifiers.modSobrenatural.conditionPen ?? 0,
  ];
  let modAttackFisArray = [
    ...modFisArray,
    data.general.modifiers.modFisico?.attack?.conditionBon ?? 0,
    data.general.modifiers.modFisico?.attack?.conditionPen ?? 0,
  ];
  let modAttackSobArray = [
    ...modSobArray,
    data.general.modifiers.modSobrenatural?.attack?.conditionBon ?? 0,
    data.general.modifiers.modSobrenatural?.attack?.conditionPen ?? 0,
  ];
  let modDefenseFisArray = [
    ...modFisArray,
    data.general.modifiers.modFisico?.defense?.conditionBon ?? 0,
    data.general.modifiers.modFisico?.defense?.conditionPen ?? 0,
  ];
  let modDefenseSobArray = [
    ...modSobArray,
    data.general.modifiers.modSobrenatural?.defense?.conditionBon ?? 0,
    data.general.modifiers.modSobrenatural?.defense?.conditionPen ?? 0,
  ];

  const penalties = {
    fis: {
      pen: getMaxAndMin(modFisArray).min, // mínimo de - userInput, condition/activeEff, cansancio u otras cosas que vengan de fórmula,
      bon: getMaxAndMin(modFisArray).max, // max de - userInput, condition/activeEff,
    },
    sob: {
      pen: getMaxAndMin(modSobArray).min, // "min de - userInput, condition/ActiveEff",
      bon: getMaxAndMin(modSobArray).max, //"max de - userInput, condition/ActiveEff",
    },
    general:
      getMaxAndMin(modFisArray).min +
      getMaxAndMin(modFisArray).max +
      getMaxAndMin(modSobArray).min +
      getMaxAndMin(modSobArray).max, // "suma de físico, sob, condition/ActiveEff",
    ataque:
      data.general.modifiers?.modManiobras?.ha?.value ??
      0 +
        getMaxAndMin(modAttackFisArray).min +
        getMaxAndMin(modAttackFisArray).max +
        getMaxAndMin(modAttackSobArray).min +
        getMaxAndMin(modAttackSobArray).max, // "pen+bon",
    // oculto: pen:  minimo de todo y condition,
    // oculto: bon:  max de todo y condition
    defense:
      data.general.modifiers?.modManiobras?.hd?.value ??
      0 +
        getMaxAndMin(modDefenseFisArray).min +
        getMaxAndMin(modDefenseFisArray).max +
        getMaxAndMin(modDefenseSobArray).min +
        getMaxAndMin(modDefenseSobArray).max, // "pen+bon",
    // oculto: pen:  minimo de todo y condition,
    // oculto: bon:  max de todo y condition
  };

  data.general.modifiers.modFisico.final.value =
    penalties.fis.pen + penalties.fis.bon;
  data.general.modifiers.modSobrenatural.final.value =
    penalties.sob.pen + penalties.sob.bon;
  data.general.modifiers.modFinal.general.final.value = penalties.general;
  data.general.modifiers.modFinal.attack.final.value = penalties.ataque;
  data.general.modifiers.modFinal.defense.final.value = penalties.defense;
};
