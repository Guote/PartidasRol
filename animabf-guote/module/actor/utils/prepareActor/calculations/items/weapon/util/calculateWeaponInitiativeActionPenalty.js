export const calculateWeaponInitiativeActionPenalty = (system) => {
    return (Math.ceil(system.general.modifiers.physicalActions.value / 2) +
        system.general.modifiers.naturalPenalty.byArmors.value);
};
