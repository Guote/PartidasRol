function ABFItemConfigFactory(minimal) {
  if (!minimal.fieldPath) {
    throw new TypeError("TypeError: fieldPath needs to be specified.");
  }
  return {
    getFromDynamicChanges(changes) {
      const path = ["system", "dynamic", ...this.fieldPath.slice(-1)];
      return path.reduce((field, nextKey) => field[nextKey], changes);
    },
    cleanFieldPath(actor) {
      if (this.isInternal) return;
      const currentItems = actor.itemTypes[this.type];
      const path = ["system", ...this.fieldPath];
      const lastKey = path.pop();
      if (!lastKey) return;
      const parentField = path.reduce((field, nextKey) => field[nextKey], actor);
      parentField[lastKey] = parentField[lastKey].filter((i) => currentItems.includes(i));
    },
    addToFieldPath(actor, item) {
      const path = ["system", ...this.fieldPath];
      const lastKey = path.pop();
      const parentField = path.reduce((field, nextKey) => field[nextKey], actor);
      const index = parentField[lastKey].findIndex((i) => i._id === item._id);
      if (index === -1) {
        parentField[lastKey].push(item);
      } else {
        parentField[lastKey][index] = item;
      }
    },
    async resetFieldPath(actor) {
      if (!this.isInternal) this.cleanFieldPath(actor);
      const items = actor.getItemsOf(this.type);
      for (const item of items) {
        await this.onAttach?.(actor, item);
        this.addToFieldPath(actor, item);
        this.prepareItem?.(item);
      }
    },
    async onUpdate(actor, changes) {
      for (const id of Object.keys(changes)) {
        const { name, system } = changes[id];
        const itemData = system ? { id, name, system } : { id, name };
        if (this.isInternal) {
          actor.updateInnerItem({ type: this.type, ...itemData });
        } else {
          await actor.updateItem(itemData);
        }
      }
    },
    ...minimal
  };
}
export {
  ABFItemConfigFactory
};
