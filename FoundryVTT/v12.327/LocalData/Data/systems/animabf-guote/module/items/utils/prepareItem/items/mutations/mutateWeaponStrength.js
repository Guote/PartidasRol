const mutateWeaponStrength = (system) => {
  system.weaponStrength.final.value = system.weaponStrength.base.value + system.quality.value / 5;
};
export {
  mutateWeaponStrength
};
