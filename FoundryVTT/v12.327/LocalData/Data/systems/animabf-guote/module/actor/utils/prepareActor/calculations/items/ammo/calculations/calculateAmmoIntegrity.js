const calculateAmmoIntegrity = (ammo) => Math.max(ammo.system.integrity.base.value + ammo.system.quality.value * 2, 0);
export {
  calculateAmmoIntegrity
};
