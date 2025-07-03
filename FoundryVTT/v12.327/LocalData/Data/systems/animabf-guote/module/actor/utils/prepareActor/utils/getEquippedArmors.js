const getEquippedArmors = (data) => {
  return data.combat.armors.filter((a) => a.system.equipped.value);
};
export {
  getEquippedArmors
};
