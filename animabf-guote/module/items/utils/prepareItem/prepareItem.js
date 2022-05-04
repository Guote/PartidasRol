import { ABFItems } from "../../ABFItems.js";
import { ALL_ITEM_CONFIGURATIONS } from "../../../actor/utils/prepareItems/constants.js";
export const prepareItem = (item) => {
    if (item.type === ABFItems.WEAPON) {
        ALL_ITEM_CONFIGURATIONS[item.type]?.prepareItem?.(item);
    }
};
