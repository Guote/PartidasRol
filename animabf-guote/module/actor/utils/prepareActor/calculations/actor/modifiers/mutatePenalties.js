import { calculateFatigue } from "./calculations/calculateFatigue.js";
export const mutatePenalties = (system) => {
  
  system.general.modifiers.modFisico.final.value =
    system.general.modifiers.modFisico.bonus.value +
    system.general.modifiers.modFisico.malus.value;
  system.general.modifiers.modSobrenatural.final.value =
    system.general.modifiers.modSobrenatural.bonus.value +
    system.general.modifiers.modSobrenatural.malus.value;
    system.general.modifiers.allActions.final.value = system.general.modifiers.modFisico.final.value + system.general.modifiers.modSobrenatural.final.value;
  
    system.general.modifiers.modManiobras.ha.final.value = 
    system.general.modifiers.modManiobras.ha.bonus.value +
    system.general.modifiers.modManiobras.ha.malus.value;
  system.general.modifiers.modManiobras.hd.final.value = 
    system.general.modifiers.modManiobras.hd.bonus.value +
    system.general.modifiers.modManiobras.hd.malus.value;
};
