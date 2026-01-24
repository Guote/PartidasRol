import { prepareItem } from "./utils/prepareItem/prepareItem.js";
import { ABFItems } from "./ABFItems.js";
class ABFItem extends Item {
  async prepareDerivedData() {
    await super.prepareDerivedData();
    await prepareItem(this);
  }
  toActiveEffectData() {
    if (this.type !== ABFItems.EFFECT) return null;
    const effectData = this.system.effectData ?? {};
    return {
      name: this.name,
      icon: effectData.icon ?? this.img ?? "icons/svg/aura.svg",
      disabled: effectData.disabled ?? true,
      changes: effectData.changes ?? [],
      duration: effectData.duration ?? {},
      transfer: false,
      flags: effectData.flags ?? {}
    };
  }
  async fromActiveEffect(activeEffect) {
    if (this.type !== ABFItems.EFFECT || !activeEffect) return;
    const data = activeEffect.toObject();
    const { name, icon, disabled, changes, duration, flags } = data;
    await this.update({
      name,
      "system.active": !disabled,
      "system.effectData": {
        icon,
        disabled,
        changes,
        duration,
        transfer: false,
        flags
      }
    });
  }
}
export {
  ABFItem as default
};
