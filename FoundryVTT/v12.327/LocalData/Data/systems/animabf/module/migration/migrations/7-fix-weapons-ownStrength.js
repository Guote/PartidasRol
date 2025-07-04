import { Logger } from "../../../utils/log.js";
const Migration7WeaponsOwnStrength = {
  version: 7,
  title: "Migrate weapons own strength",
  description: "Shoot weapons often has its own strength for calculating the damage modifiers. However, this are sometimes in an old argument `system.weaponFue`.\nAdditionally, weapons have a `system.hasOwnStr` used to distinguish these cases. This migration will ensure weapons have all this values syncronised.",
  filterItems(item) {
    return item.type === "weapon" && !!item.system.isRanged.value;
  },
  filterActors(actor) {
    return actor.getWeapons().filter((w) => w.system.isRanged.value).length !== 0;
  },
  async updateItem(item) {
    if (item.type !== "weapon") {
      Logger.error("Weapon filter in migration not working");
      return;
    }
    if (item.system.weaponStrength.base.value === 0 && item.system.weaponFue?.value) {
      item.system.weaponStrength.base.value = item.system.weaponFue?.value ?? 0;
    }
    item.system.hasOwnStr = { value: !!item.system.weaponStrength.base.value };
    return item;
  }
};
export {
  Migration7WeaponsOwnStrength
};
