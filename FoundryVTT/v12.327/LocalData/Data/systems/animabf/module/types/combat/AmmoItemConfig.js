import { ABFItems } from "../../items/ABFItems.js";
import { openSimpleInputDialog } from "../../utils/dialogs/openSimpleInputDialog.js";
import { WeaponCritic } from "./WeaponItemConfig.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const INITIAL_AMMO_DATA = {
  amount: { value: 0 },
  damage: {
    base: { value: 0 },
    final: { value: 0 }
  },
  critic: { value: WeaponCritic.CUT },
  quality: { value: 0 },
  integrity: {
    base: { value: 0 },
    final: { value: 0 }
  },
  breaking: {
    base: { value: 0 },
    final: { value: 0 }
  },
  presence: {
    base: { value: 0 },
    final: { value: 0 }
  },
  special: { value: "" }
};
const AmmoItemConfig = ABFItemConfigFactory({
  type: ABFItems.AMMO,
  isInternal: false,
  defaultValue: INITIAL_AMMO_DATA,
  hasSheet: true,
  fieldPath: ["combat", "ammo"],
  selectors: {
    addItemButtonSelector: "add-ammo",
    containerSelector: "#ammo-context-menu-container",
    rowSelector: ".ammo-row"
  },
  onCreate: async (actor) => {
    const { i18n } = game;
    const name = await openSimpleInputDialog({
      content: i18n.localize("dialogs.items.ammo.content")
    });
    const itemData = {
      name,
      type: ABFItems.AMMO,
      system: INITIAL_AMMO_DATA
    };
    await actor.createItem(itemData);
  }
});
export {
  AmmoItemConfig,
  INITIAL_AMMO_DATA
};
