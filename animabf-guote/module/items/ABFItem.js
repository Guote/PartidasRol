import { prepareItem } from "./utils/prepareItem/prepareItem.js";
export default class ABFItem extends Item {
    constructor(system, context) {
        super(system, context);
        this.prepareDerivedData();
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        prepareItem(this);
    }
}
