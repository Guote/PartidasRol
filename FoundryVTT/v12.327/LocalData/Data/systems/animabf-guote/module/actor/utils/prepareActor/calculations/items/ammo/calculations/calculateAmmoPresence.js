const calculateAmmoPresence = (ammo) => Math.max(ammo.system.presence.base.value + ammo.system.quality.value * 10, 0);
export {
  calculateAmmoPresence
};
