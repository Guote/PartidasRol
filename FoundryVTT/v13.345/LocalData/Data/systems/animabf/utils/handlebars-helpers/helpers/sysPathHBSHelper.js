const sysTpl = {
  name: "sysTpl",
  fn: (relPath) => {
    const id = game.system?.id ?? "animabf";
    return `systems/${id}/${relPath}`;
  }
};
const sysAsset = {
  name: "sysAsset",
  fn: (relPath) => {
    const id = game.system?.id ?? "animabf";
    return `/systems/${id}/${relPath}`;
  }
};
export {
  sysAsset,
  sysTpl
};
