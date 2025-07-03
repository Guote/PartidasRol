import { ABFItems } from "../../items/ABFItems.js";
const Migration3AlternativeAct = {
  version: 3,
  title: "Alternative ACT",
  description: "The alternative ACT is going to be an internal item so you dont lose the value.We recommend creating a new one with the corresponding magic route.",
  async updateActor(actor) {
    if (actor.system.mystic.act?.alternative.base.value !== 0) {
      await actor.createInnerItem({
        name: "alternative",
        type: ABFItems.ACT_VIA,
        system: actor.system.mystic.act.alternative
      });
      await actor.createInnerItem({
        name: "alternative",
        type: ABFItems.INNATE_MAGIC_VIA,
        system: {
          base: { value: 0 },
          final: { value: 0 }
        }
      });
    }
    return actor;
  }
};
export {
  Migration3AlternativeAct
};
