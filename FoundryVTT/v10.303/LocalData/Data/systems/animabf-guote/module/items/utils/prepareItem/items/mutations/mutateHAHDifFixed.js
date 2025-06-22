export const mutateHAHDifFixed = (data) => {
  if (data.attack.isFixed?.value && data.baseAtk?.value) {
    data.attack.final.value = data.baseAtk.value;
  }
  if (data.block.isFixed?.value && data.baseDef?.value) {
    data.block.final.value = data.baseDef.value;
  }
};
