import { SimpleActor } from '../../../systems/worldbuilding/module/actor.js';
import { SwpUtility } from './utility.js';

export class SwpActor extends SimpleActor {

  /** @override */
  getRollData() {
    const data = super.getRollData();

    if (!data.d) {
      data.d = {};
    }

    // Iterate through the derived values.
    if (game.SimpleWorldbuildingPlus.modifiers && Array.isArray(game.SimpleWorldbuildingPlus.modifiers)) {
      for (let modifier of game.SimpleWorldbuildingPlus.modifiers) {
        let flatObj = {};

        flatObj[modifier.key] = SwpUtility._replaceData(modifier.formula, data);
        let fullObj = expandObject(flatObj);

        data.d = mergeObject(data.d, fullObj);
      }
    }

    return data;
  }

}