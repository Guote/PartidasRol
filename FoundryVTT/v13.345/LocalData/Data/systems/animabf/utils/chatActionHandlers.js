import * as applyDamageActionHandler from "./chatActionHandlers/applyDamageActionHandler.js";
import * as applyMultiDefenseActions from "./chatActionHandlers/applyMultiDefenseActions.js";
import * as autoDefendActionHandler from "./chatActionHandlers/autoDefendActionHandler.js";
import * as autoDefendPendingActionHandler from "./chatActionHandlers/autoDefendPendingActionHandler.js";
import * as defendActionHandler from "./chatActionHandlers/defendActionHandler.js";
import * as defendTargetActionHandler from "./chatActionHandlers/defendTargetActionHandler.js";
const chatActionHandlers = (() => {
  const actionModules = {
    // ← añade también chatActions
    .../* @__PURE__ */ Object.assign({ "./chatActionHandlers/applyDamageActionHandler.js": applyDamageActionHandler, "./chatActionHandlers/applyMultiDefenseActions.js": applyMultiDefenseActions, "./chatActionHandlers/autoDefendActionHandler.js": autoDefendActionHandler, "./chatActionHandlers/autoDefendPendingActionHandler.js": autoDefendPendingActionHandler, "./chatActionHandlers/defendActionHandler.js": defendActionHandler, "./chatActionHandlers/defendTargetActionHandler.js": defendTargetActionHandler }),
    .../* @__PURE__ */ Object.assign({ "./chatActionHandlers/applyDamageActionHandler.js": applyDamageActionHandler, "./chatActionHandlers/applyMultiDefenseActions.js": applyMultiDefenseActions, "./chatActionHandlers/autoDefendActionHandler.js": autoDefendActionHandler, "./chatActionHandlers/autoDefendPendingActionHandler.js": autoDefendPendingActionHandler, "./chatActionHandlers/defendActionHandler.js": defendActionHandler, "./chatActionHandlers/defendTargetActionHandler.js": defendTargetActionHandler }),
    .../* @__PURE__ */ Object.assign({}),
    .../* @__PURE__ */ Object.assign({})
  };
  const registry = {};
  const register = (id, fn, src) => {
    if (!id || typeof fn !== "function") return;
    if (registry[id]) {
      console.warn(
        `[ABF] chatActionHandlers: override '${id}' from ${registry[id].__src} with ${src}`
      );
    }
    try {
      Object.defineProperty(fn, "__src", { value: src });
    } catch {
    }
    registry[id] = fn;
  };
  for (const p in actionModules) {
    const mod = actionModules[p];
    if (typeof mod.default === "function") {
      const actions = Array.isArray(mod.actions) ? mod.actions : typeof mod.action === "string" ? [mod.action] : null;
      if (actions) actions.forEach((a) => register(a, mod.default, `default@${p}`));
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
  }
  console.debug(
    `[ABF] chatActionHandlers loaded (${Object.keys(registry).length})`,
    Object.keys(registry)
  );
  return registry;
})();
export {
  chatActionHandlers
};
