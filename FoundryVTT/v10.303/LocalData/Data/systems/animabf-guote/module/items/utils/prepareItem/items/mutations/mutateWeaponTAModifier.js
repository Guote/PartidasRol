export const mutateWeaponTAModifier = (data) => {
    data.taModifier.final.value = data.taModifier.base.value - Math.round(data.quality.value / 5);
};
