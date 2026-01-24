import * as attackDataCopyOption from "./chatContext/attackDataCopyOption.js";
function getChatContextMenuFactories() {
  const contextModules = /* @__PURE__ */ Object.assign({ "./chatContext/attackDataCopyOption.js": attackDataCopyOption });
  const factories = [];
  for (const p in contextModules) {
    const mod = contextModules[p];
    if (typeof mod.default === "function") factories.push(mod.default);
    if (Array.isArray(mod.menuItems)) {
      for (const it of mod.menuItems) {
        if (typeof it === "function") factories.push(it);
        else factories.push(() => it);
      }
    }
  }
  return factories;
}
export {
  getChatContextMenuFactories
};
