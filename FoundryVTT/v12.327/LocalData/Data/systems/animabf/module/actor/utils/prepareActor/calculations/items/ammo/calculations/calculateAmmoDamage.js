const calculateAmmoDamage = (ammo) => Math.max(ammo.system.damage.base.value + ammo.system.quality.value * 2, 0);
export {
  calculateAmmoDamage
};
