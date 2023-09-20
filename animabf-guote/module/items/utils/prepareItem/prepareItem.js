import ABFItem from '../../ABFItem.js';
import { ABFItems } from '../../ABFItems.js';
import { ALL_ITEM_CONFIGURATIONS, ITEM_CONFIGURATIONS } from '../../../actor/utils/prepareItems/constants.js';
import { normalizeItem } from '../../../actor/utils/prepareActor/utils/normalizeItem.js';
export const prepareItem = async (item) => {
    const configuration = ITEM_CONFIGURATIONS[item.type];
    if (configuration?.defaultValue) {
        item = await normalizeItem(item, configuration.defaultValue);
    }
    ALL_ITEM_CONFIGURATIONS[item.type]?.prepareItem?.(item);
};
