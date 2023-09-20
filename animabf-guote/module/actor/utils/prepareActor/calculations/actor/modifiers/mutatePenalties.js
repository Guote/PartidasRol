import { calculateFatigue } from './calculations/calculateFatigue.js';
export const mutatePenalties = (data) => {
    data.general.modifiers.allActions.final.value = data.general.modifiers.allActions.base.value + calculateFatigue(data);
};
