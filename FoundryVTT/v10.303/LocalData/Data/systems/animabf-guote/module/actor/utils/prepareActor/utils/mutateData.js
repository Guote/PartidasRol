const getDeepProp = (object, path) => {
  return path.split(".").reduce((o, i) => o?.[i], object);
};
export const mutateData = (data, path, modifier = 0, min) => {
  let activeEffectPath = `.activeEffects.${path}`;
  let baseValue = getDeepProp(data, `${path}.base.value`) ?? 0;
  let activeEffectMod =
    getDeepProp(data, `${activeEffectPath}.final.value`) ?? 0;

  let newValue = min
    ? Math.max(baseValue + activeEffectMod + modifier, min)
    : baseValue + activeEffectMod + modifier;
  const newFinal = {
    final: { value: newValue },
  };

  Object.assign(getDeepProp(data, path), newFinal);

  /*   console.log(
      path,
      getDeepProp(data, path),
      activeEffectMod,
      baseValue,
      activeEffectMod,
      getDeepProp(data, `${path}`),
      baseValue + activeEffectMod + modifier
    ); */
};
export const bulkMutateData = (data, paths = [""], modifier = 0, min) => {
  paths?.forEach((path) => mutateData(data, path, modifier, min));
};

export const misMuertoACaballo = () => {
  console.log("MIS PUTOS MUERTO");
};
