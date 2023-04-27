export const calculateWeaponReload = (weapon, system) => {
    const sleightOfHand = system.secondaries.creative.sleightOfHand.final.value;
    const attack = system.combat.attack.final.value;
    return weapon.system.reload.base.value - Math.floor(Math.max(attack, sleightOfHand) / 100);
};
