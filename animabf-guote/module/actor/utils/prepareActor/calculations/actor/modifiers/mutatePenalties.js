import { calculateFatigue } from "./calculations/calculateFatigue.js";
export const mutatePenalties = (data) => {
  
  data.general.modifiers.modFisico.final.value =
    data.general.modifiers.modFisico.bonus.value +
    data.general.modifiers.modFisico.malus.value;
  data.general.modifiers.modSobrenatural.final.value =
    data.general.modifiers.modSobrenatural.bonus.value +
    data.general.modifiers.modSobrenatural.malus.value;
    data.general.modifiers.allActions.final.value = data.general.modifiers.modFisico.final.value + data.general.modifiers.modSobrenatural.final.value;
  
    data.general.modifiers.modManiobras.ha.final.value = 
    data.general.modifiers.modManiobras.ha.bonus.value +
    data.general.modifiers.modManiobras.ha.malus.value;
  data.general.modifiers.modManiobras.hd.final.value = 
    data.general.modifiers.modManiobras.hd.bonus.value +
    data.general.modifiers.modManiobras.hd.malus.value;
};
