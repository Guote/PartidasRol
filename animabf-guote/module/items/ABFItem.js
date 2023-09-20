import { prepareItem } from './utils/prepareItem/prepareItem.js';
export default class ABFItem extends Item {
    async prepareDerivedData() {
        await super.prepareDerivedData();
        await prepareItem(this);
    }
}
