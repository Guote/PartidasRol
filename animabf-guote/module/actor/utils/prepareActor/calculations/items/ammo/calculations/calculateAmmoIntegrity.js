export const calculateAmmoIntegrity = (ammo) => Math.max(ammo.data.integrity.base.value + ammo.data.quality.value * 2, 0);
