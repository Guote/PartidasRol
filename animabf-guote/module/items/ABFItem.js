import { prepareItem } from "./utils/prepareItem/prepareItem.js";
export default class ABFItem extends Item {
    constructor(data, context) {
        super(data, context);
        this.prepareDerivedData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        prepareItem(this);
    }
}
