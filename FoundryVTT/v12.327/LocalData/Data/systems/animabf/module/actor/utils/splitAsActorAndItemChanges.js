import { Logger } from "../../../utils/log.js";
const splitAsActorAndItemChanges = (changes) => {
  const actorChanges = {};
  const itemsChanges = {};
  for (const key of Object.keys(changes)) {
    if (key.includes(".data.")) {
      Logger.warn(`Possible old .data. property being used in ${key}`);
    }
    if (key.startsWith("system.dynamic")) {
      if (key.includes("..")) {
        Logger.warn(`Key ${key} is not valid`);
      }
      itemsChanges[key] = changes[key];
    } else {
      actorChanges[key] = changes[key];
    }
  }
  return [actorChanges, itemsChanges];
};
export {
  splitAsActorAndItemChanges
};
