const mutateCombatData = (data) => {
  data.combat.attack.final.value = data.combat.attack.base.value + data.general.modifiers.allActions.final.value + data.general.modifiers.physicalActions.final.value;
  data.combat.block.final.value = data.combat.block.base.value + data.general.modifiers.allActions.final.value + data.general.modifiers.physicalActions.final.value;
  data.combat.dodge.final.value = data.combat.dodge.base.value + data.general.modifiers.allActions.final.value + data.general.modifiers.physicalActions.final.value;
};
export {
  mutateCombatData
};
