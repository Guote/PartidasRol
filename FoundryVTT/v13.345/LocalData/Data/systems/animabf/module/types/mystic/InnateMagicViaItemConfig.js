import { ABFItems } from "../../items/ABFItems.js";
import { ABFItemConfigFactory } from "../ABFItemConfig.js";
const INITIAL_INNATE_MAGIC_VIA_DATA = {
  base: { value: 0 },
  final: { value: 0 }
};
const InnateMagicViaItemConfig = ABFItemConfigFactory({
  type: ABFItems.INNATE_MAGIC_VIA,
  isInternal: true,
  fieldPath: ["mystic", "innateMagic", "via"],
  selectors: {
    containerSelector: "#innate-magic-vias-context-menu-container",
    rowSelector: ".innate-magic-via-row"
  }
});
export {
  INITIAL_INNATE_MAGIC_VIA_DATA,
  InnateMagicViaItemConfig
};
