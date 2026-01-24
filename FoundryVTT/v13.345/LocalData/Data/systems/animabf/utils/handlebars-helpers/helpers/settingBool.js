const settingBool = {
  name: "settingBool",
  fn: (id, ns) => {
    try {
      if (!id) return false;
      let key = String(id);
      const val = game.settings.get(game.animabf.id, key);
      return !!val;
    } catch (err) {
      console.warn(`[ABF] settingBool helper error:`, err);
      return false;
    }
  }
};
export {
  settingBool
};
