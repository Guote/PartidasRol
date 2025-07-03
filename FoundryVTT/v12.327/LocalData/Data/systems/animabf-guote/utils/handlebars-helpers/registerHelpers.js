import { isHBSHelper } from "./helpers/isHBSHelper.js";
import { calculateExperienceHBSHelper } from "./helpers/calculateExperienceHBSHelper.js";
import { concatHBSHelper } from "./helpers/concatHBSHelper.js";
import { getKeyOfHBSHelper } from "./helpers/getKeyOfHBSHelper.js";
import { manipulateStringHBSHelper } from "./helpers/manipulateStringHBSHelper.js";
import { mathHBSHelper } from "./helpers/mathHBSHelper.js";
import { getDifficultyFromIndexHBSHelper } from "./helpers/getDifficultyFromIndexHBSHelper.js";
import { iterateNumberHBSHelper } from "./helpers/iterateNumberHBSHelper.js";
import { notHBSHelper } from "./helpers/notHBSHelper.js";
import { minNumberHBSHelper } from "./helpers/minNumberHBSHelper.js";
import { eachWhenHBSHelper } from "./helpers/eachWhenHBSHelper.js";
import { getNameActorUuid } from "./helpers/getNameActorUuid.js";
import { isArrayEmpty } from "./helpers/isArrayEmpty.js";
import { logHBSHelper } from "./helpers/logHBSHelper.js";
import { calculateLevelsHBSHelper } from "./helpers/calculateLevelsHBSHelper.js";
import { calculateLanguagesHBSHelper } from "./helpers/calculateLanguagesHBSHelper.js";
const registerHelpers = () => {
  const helpers = [
    calculateExperienceHBSHelper,
    concatHBSHelper,
    notHBSHelper,
    getDifficultyFromIndexHBSHelper,
    getKeyOfHBSHelper,
    isHBSHelper,
    iterateNumberHBSHelper,
    manipulateStringHBSHelper,
    mathHBSHelper,
    minNumberHBSHelper,
    eachWhenHBSHelper,
    getNameActorUuid,
    isArrayEmpty,
    logHBSHelper,
    calculateLanguagesHBSHelper,
    calculateLevelsHBSHelper
  ];
  for (const helper of helpers) {
    Handlebars.registerHelper(helper.name, helper.fn);
  }
};
export {
  registerHelpers
};
