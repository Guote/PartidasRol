export const calculateSecondaryHide = (system) => {
    return (system.secondaries.subterfuge.hide.base.value +
        system.general.modifiers.allActions.final.value +
        system.general.modifiers.naturalPenalty.byArmors.value);
};
