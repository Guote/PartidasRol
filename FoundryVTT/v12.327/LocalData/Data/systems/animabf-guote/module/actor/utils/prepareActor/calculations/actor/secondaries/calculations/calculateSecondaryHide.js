export const calculateSecondaryHide = (data) => {
    return (data.secondaries.subterfuge.hide.base.value +
        data.general.modifiers.allActions.final.value +
        data.general.modifiers.naturalPenalty.byArmors.value);
};
