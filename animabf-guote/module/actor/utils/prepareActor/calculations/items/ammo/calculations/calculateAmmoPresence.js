export const calculateAmmoPresence = (ammo) => Math.max(ammo.data.presence.base.value + ammo.data.quality.value * 10, 0);
