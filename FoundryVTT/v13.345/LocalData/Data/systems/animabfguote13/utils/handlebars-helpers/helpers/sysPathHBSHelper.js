const sysTpl = {
  name: "sysTpl",
  fn: (relPath) => {
    const id = game.system?.id ?? "animabfguote13";
    return `systems/${id}/${relPath}`;
  }
};
const sysAsset = {
  name: "sysAsset",
  fn: (relPath) => {
    const id = game.system?.id ?? "animabfguote13";
    return `/systems/${id}/${relPath}`;
  }
};
export {
  sysAsset,
  sysTpl
};
