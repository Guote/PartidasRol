const abfCritLabel = {
  name: "abfCritLabel",
  fn: (code) => {
    const v = code && typeof code === "object" && "value" in code ? code.value : code;
    if (v == null) return "";
    const weaponCfg = CONFIG?.config?.iterables?.combat?.weapon ?? {};
    const key = weaponCfg.criticTypesWithNone?.[v] ?? weaponCfg.criticTypes?.[v];
    return key ? game.i18n.localize(key) : String(v);
  }
};
export {
  abfCritLabel
};
