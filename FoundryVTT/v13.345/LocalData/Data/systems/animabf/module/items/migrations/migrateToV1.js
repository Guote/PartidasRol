const migrateToV1 = (item) => {
  const needToBeMigrated = item.flags?.version === void 0;
  if (needToBeMigrated) {
    item.flags = {
      ...item.flags,
      version: 1
    };
    if (!item.system && item.data) {
      item.system = item.data;
      delete item.data;
    }
  }
  return item;
};
export {
  migrateToV1
};
