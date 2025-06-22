import "../../ABFItem.js";
import { ITEM_CONFIGURATIONS, ALL_ITEM_CONFIGURATIONS } from "../../../actor/utils/prepareItems/constants.js";
import { normalizeItem } from "../../../actor/utils/prepareActor/utils/normalizeItem.js";
const prepareItem = async (item) => {
  const configuration = ITEM_CONFIGURATIONS[item.type];
  if (configuration?.defaultValue) {
    item = await normalizeItem(item, configuration.defaultValue);
  }
  ALL_ITEM_CONFIGURATIONS[item.type]?.prepareItem?.(item);
};
export {
  prepareItem
};
