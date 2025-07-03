import { migrateToV1 } from "./migrateToV1.js";
const migrateItem = (item) => {
  return migrateToV1(item);
};
export {
  migrateItem
};
