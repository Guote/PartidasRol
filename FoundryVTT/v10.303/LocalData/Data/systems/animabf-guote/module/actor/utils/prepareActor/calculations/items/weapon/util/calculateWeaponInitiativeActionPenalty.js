export const calculateWeaponInitiativeActionPenalty = (data) => {
    return (Math.ceil(data.general.modifiers.physicalActions.value / 2) +
        data.general.modifiers.naturalPenalty.byArmors.value);
};
