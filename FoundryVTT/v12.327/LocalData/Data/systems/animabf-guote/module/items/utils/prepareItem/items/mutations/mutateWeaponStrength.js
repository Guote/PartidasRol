export const mutateWeaponStrength = (data) => {
    data.weaponStrength.final.value = data.weaponStrength.base.value + data.quality.value / 5;
};
