export const includesPerkHBSHelper = {
  name: 'includesPerk',
  fn: (selectedPerkLevels, perkIndex, levelIndex) => {
    if (!Array.isArray(selectedPerkLevels)) return false;
    return selectedPerkLevels.some(
      s => s.perkIndex === Number(perkIndex) && s.levelIndex === Number(levelIndex)
    );
  }
};
