export const calculateAmmoDamage = (ammo) => Math.max(ammo.data.damage.base.value + ammo.data.quality.value * 2, 0);
