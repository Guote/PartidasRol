import { ALL_ITEM_CONFIGURATIONS } from "./constants.js";
const prepareItems = async (actor) => {
  for (const itemType in ALL_ITEM_CONFIGURATIONS) {
    if (ALL_ITEM_CONFIGURATIONS.hasOwnProperty(itemType)) {
      const config = ALL_ITEM_CONFIGURATIONS[itemType];
      await config.resetFieldPath(actor);
    }
  }
};
export {
  prepareItems
};
