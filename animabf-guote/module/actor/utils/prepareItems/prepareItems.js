import { ITEM_CONFIGURATIONS } from "./constants.js";
export const prepareItems = (actor) => {
    for (const item of actor.items.values()) {
        const configuration = ITEM_CONFIGURATIONS[item.type];
        if (configuration) {
            const act = actor
            const { data } = actor.data;
            configuration.onAttach?.(actor.system, item.data);
            configuration.prepareItem?.(item);
        }
        else {
            console.warn(`Item with ${item.type} unrecognized. Skipping...`, { item });
        }
    }
};
