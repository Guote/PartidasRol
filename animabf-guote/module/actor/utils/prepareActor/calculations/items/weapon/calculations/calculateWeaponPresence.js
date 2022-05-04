export const calculateWeaponPresence = (weapon) => Math.max(weapon.data.presence.base.value + weapon.data.quality.value * 10, 0);
