import * as castPsychicPower from "./buttonCallbacks/castPsychicPower.js";
import * as castSpellGrade from "./buttonCallbacks/castSpellGrade.js";
import * as createDefaultWeaponAttack from "./buttonCallbacks/createDefaultWeaponAttack.js";
import * as createWeaponAttack from "./buttonCallbacks/createWeaponAttack.js";
const modules = {
  .../* @__PURE__ */ Object.assign({ "./buttonCallbacks/castPsychicPower.js": castPsychicPower, "./buttonCallbacks/castSpellGrade.js": castSpellGrade, "./buttonCallbacks/createDefaultWeaponAttack.js": createDefaultWeaponAttack, "./buttonCallbacks/createWeaponAttack.js": createWeaponAttack }),
  .../* @__PURE__ */ Object.assign({ "./buttonCallbacks/castPsychicPower.js": castPsychicPower, "./buttonCallbacks/castSpellGrade.js": castSpellGrade, "./buttonCallbacks/createDefaultWeaponAttack.js": createDefaultWeaponAttack, "./buttonCallbacks/createWeaponAttack.js": createWeaponAttack })
};
const registry = {};
const register = (id, fn, src) => {
  if (!id || typeof fn !== "function") return;
  if (registry[id])
    console.warn(
      `[ABF] clickHandlers: overriding '${id}' from ${registry[id].__src} with ${src}`
    );
  try {
    Object.defineProperty(fn, "__src", { value: src });
  } catch {
  }
  registry[id] = fn;
};
const inferIdFromPath = (p) => p.match(/([^/]+)\.js$/)?.[1] ?? null;
for (const p in modules) {
  const mod = modules[p];
  if (typeof mod.default === "function") {
    const actions = Array.isArray(mod.actions) ? mod.actions : typeof mod.action === "string" ? [mod.action] : null;
    if (actions?.length) actions.forEach((a) => register(a, mod.default, `default@${p}`));
    else register(inferIdFromPath(p), mod.default, `default(inferred)@${p}`);
  }
  if (mod.handlers && typeof mod.handlers === "object") {
    for (const [id, fn] of Object.entries(mod.handlers))
      register(id, fn, `handlers@${p}`);
  }
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function" && typeof value.action === "string") {
      register(value.action, value, `${key}@${p}`);
    }
  }
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === "function" && key !== "default")
      register(key, value, `${key}@${p}`);
  }
}
console.debug(
  `[ABF] clickHandlers loaded (${Object.keys(registry).length})`,
  Object.keys(registry)
);
function preloadClickHandlers() {
  return Object.keys(registry).length;
}
function createClickHandlers(sheet) {
  const bound = {};
  for (const [id, fn] of Object.entries(registry)) {
    bound[id] = (e) => {
      try {
        return fn(sheet, e, e?.currentTarget?.dataset ?? {});
      } catch (err) {
        console.error(`[ABF] clickHandler '${id}' failed from ${fn.__src}`, {
          dataset: e?.currentTarget?.dataset ?? null,
          target: e?.currentTarget ?? null
        });
        ui.notifications?.error(`Handler "${id}" falló (ver consola).`);
        throw err;
      }
    };
  }
  return bound;
}
export {
  createClickHandlers,
  preloadClickHandlers
};
