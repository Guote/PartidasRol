export const calculateSecondarySwim = (data) => {
    return (data.secondaries.athletics.swim.base.value +
        data.general.modifiers.allActions.final.value +
        data.general.modifiers.physicalActions.value +
        data.general.modifiers.naturalPenalty.byArmors.value +
        data.general.modifiers.naturalPenalty.byWearArmorRequirement.value);
};
