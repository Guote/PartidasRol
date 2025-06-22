import { prepareItem } from "./utils/prepareItem/prepareItem.js";
class ABFItem extends Item {
  async prepareDerivedData() {
    await super.prepareDerivedData();
    await prepareItem(this);
  }
}
export {
  ABFItem as default
};
