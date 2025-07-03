const calculateSecondarySwim = (data) => data.secondaries.athletics.swim.base.value + data.general.modifiers.allActions.final.value + data.general.modifiers.physicalActions.final.value + data.general.modifiers.naturalPenalty.final.value - data.general.modifiers.naturalPenalty.reduction.value;
export {
  calculateSecondarySwim
};
