import * as abfCritLabel from "./helpers/abfCritLabel.js";
import * as calculateExperienceHBSHelper from "./helpers/calculateExperienceHBSHelper.js";
import * as calculateLanguagesHBSHelper from "./helpers/calculateLanguagesHBSHelper.js";
import * as calculateLevelsHBSHelper from "./helpers/calculateLevelsHBSHelper.js";
import * as concatHBSHelper from "./helpers/concatHBSHelper.js";
import * as eachWhenHBSHelper from "./helpers/eachWhenHBSHelper.js";
import * as formulaValueHelper from "./helpers/formulaValueHelper.js";
import * as getDifficultyFromIndexHBSHelper from "./helpers/getDifficultyFromIndexHBSHelper.js";
import * as getKeyOfHBSHelper from "./helpers/getKeyOfHBSHelper.js";
import * as getNameActorUuid from "./helpers/getNameActorUuid.js";
import * as injectFromHookHelper from "./helpers/injectFromHookHelper.js";
import * as isArrayEmpty from "./helpers/isArrayEmpty.js";
import * as isHBSHelper from "./helpers/isHBSHelper.js";
import * as iterateNumberHBSHelper from "./helpers/iterateNumberHBSHelper.js";
import * as jsonHelper from "./helpers/jsonHelper.js";
import * as logHBSHelper from "./helpers/logHBSHelper.js";
import * as manipulateStringHBSHelper from "./helpers/manipulateStringHBSHelper.js";
import * as mathHBSHelper from "./helpers/mathHBSHelper.js";
import * as minNumberHBSHelper from "./helpers/minNumberHBSHelper.js";
import * as notHBSHelper from "./helpers/notHBSHelper.js";
import * as settingBool from "./helpers/settingBool.js";
import * as sysPathHBSHelper from "./helpers/sysPathHBSHelper.js";
const registerHelpers = () => {
  const helperModules = {
    .../* @__PURE__ */ Object.assign({ "./helpers/abfCritLabel.js": abfCritLabel, "./helpers/calculateExperienceHBSHelper.js": calculateExperienceHBSHelper, "./helpers/calculateLanguagesHBSHelper.js": calculateLanguagesHBSHelper, "./helpers/calculateLevelsHBSHelper.js": calculateLevelsHBSHelper, "./helpers/concatHBSHelper.js": concatHBSHelper, "./helpers/eachWhenHBSHelper.js": eachWhenHBSHelper, "./helpers/formulaValueHelper.js": formulaValueHelper, "./helpers/getDifficultyFromIndexHBSHelper.js": getDifficultyFromIndexHBSHelper, "./helpers/getKeyOfHBSHelper.js": getKeyOfHBSHelper, "./helpers/getNameActorUuid.js": getNameActorUuid, "./helpers/injectFromHookHelper.js": injectFromHookHelper, "./helpers/isArrayEmpty.js": isArrayEmpty, "./helpers/isHBSHelper.js": isHBSHelper, "./helpers/iterateNumberHBSHelper.js": iterateNumberHBSHelper, "./helpers/jsonHelper.js": jsonHelper, "./helpers/logHBSHelper.js": logHBSHelper, "./helpers/manipulateStringHBSHelper.js": manipulateStringHBSHelper, "./helpers/mathHBSHelper.js": mathHBSHelper, "./helpers/minNumberHBSHelper.js": minNumberHBSHelper, "./helpers/notHBSHelper.js": notHBSHelper, "./helpers/settingBool.js": settingBool, "./helpers/sysPathHBSHelper.js": sysPathHBSHelper }),
    .../* @__PURE__ */ Object.assign({ "./helpers/abfCritLabel.js": abfCritLabel, "./helpers/calculateExperienceHBSHelper.js": calculateExperienceHBSHelper, "./helpers/calculateLanguagesHBSHelper.js": calculateLanguagesHBSHelper, "./helpers/calculateLevelsHBSHelper.js": calculateLevelsHBSHelper, "./helpers/concatHBSHelper.js": concatHBSHelper, "./helpers/eachWhenHBSHelper.js": eachWhenHBSHelper, "./helpers/formulaValueHelper.js": formulaValueHelper, "./helpers/getDifficultyFromIndexHBSHelper.js": getDifficultyFromIndexHBSHelper, "./helpers/getKeyOfHBSHelper.js": getKeyOfHBSHelper, "./helpers/getNameActorUuid.js": getNameActorUuid, "./helpers/injectFromHookHelper.js": injectFromHookHelper, "./helpers/isArrayEmpty.js": isArrayEmpty, "./helpers/isHBSHelper.js": isHBSHelper, "./helpers/iterateNumberHBSHelper.js": iterateNumberHBSHelper, "./helpers/jsonHelper.js": jsonHelper, "./helpers/logHBSHelper.js": logHBSHelper, "./helpers/manipulateStringHBSHelper.js": manipulateStringHBSHelper, "./helpers/mathHBSHelper.js": mathHBSHelper, "./helpers/minNumberHBSHelper.js": minNumberHBSHelper, "./helpers/notHBSHelper.js": notHBSHelper, "./helpers/settingBool.js": settingBool, "./helpers/sysPathHBSHelper.js": sysPathHBSHelper })
  };
  const registry = /* @__PURE__ */ Object.create(null);
  const register = (name, fn, src) => {
    if (!name || typeof fn !== "function") return;
    if (registry[name]) {
      console.warn(
        `[ABF] handlebars helper override: '${name}' from ${registry[name]} -> ${src}`
      );
    }
    Handlebars.registerHelper(name, fn);
    registry[name] = src;
  };
  const acceptCandidate = (candidate, src) => {
    if (!candidate) return;
    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      if (Array.isArray(candidate.helpers)) {
        for (const h of candidate.helpers) acceptCandidate(h, `${src}#helpers[]`);
      }
      if (typeof candidate.name === "string" && typeof candidate.fn === "function") {
        return register(candidate.name, candidate.fn, src);
      }
      return;
    }
    if (typeof candidate === "function") {
      const name = candidate.hbsName || candidate.name;
      return register(name, candidate, src);
    }
    if (Array.isArray(candidate)) {
      for (const h of candidate) acceptCandidate(h, `${src}[]`);
    }
  };
  for (const path in helperModules) {
    const mod = helperModules[path];
    if (!mod) continue;
    if (mod.default) acceptCandidate(mod.default, `default@${path}`);
    for (const [key, value] of Object.entries(mod)) {
      if (key === "default") continue;
      acceptCandidate(value, `${key}@${path}`);
    }
  }
  console.debug(
    `[ABF] Handlebars helpers registered (${Object.keys(registry).length}):`,
    Object.keys(registry).sort()
  );
};
export {
  registerHelpers
};
