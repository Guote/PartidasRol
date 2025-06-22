import { SimpleActor } from '../../../systems/worldbuilding/module/actor.js';
import { SwpUtility } from './utility.js';

export class SwpActor extends SimpleActor {

  /** @override */
  getRollData() {
    const context = super.getRollData();

    if (!context.d) {
      context.d = {};
    }

    // Iterate through the derived values.
    if (game.SimpleWorldbuildingPlus.modifiers && Array.isArray(game.SimpleWorldbuildingPlus.modifiers)) {
      for (let modifier of game.SimpleWorldbuildingPlus.modifiers) {
        let flatObj = {};

        flatObj[modifier.key] = SwpUtility._replaceData(modifier.formula, context);
        let fullObj = expandObject(flatObj);

        context.d = foundry.utils.mergeObject(context.d, fullObj);
      }
    }

    // Add labels to roll data.
    if (!context?.labels) {
      const flattened = foundry.utils.flattenObject(this.system.attributes);
      const labels = {};
      for (let [k, v] of Object.entries(flattened)) {
        if (k.includes('.dtype') && v == 'String') {
          const key = k.replace('.dtype', '');
          labels[key] = foundry.utils.getProperty(this.system.attributes, key)?.value ?? '';
        }

        if (k.includes('.label')) {
          labels[k] = v;
        }
      }
      context.labels = labels;
    }

    return context;
  }

}