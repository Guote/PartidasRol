const System = {
  get id() {
    return game.system?.id ?? "animabfguote13";
  },
  get title() {
    return game.system?.title ?? "Anima Beyond Fantasy";
  },
  get version() {
    return game.system?.version ?? "0.0.0";
  },
  get socketScope() {
    return `system.${this.id}`;
  },
  get flagsScope() {
    return this.id;
  }
};
function registerSystemOnGame() {
  const id = System.id;
  game[id] ??= {};
  const bucket = game[id];
  bucket.id = id;
  bucket.system = {
    id,
    title: System.title,
    version: System.version,
    socketScope: System.socketScope,
    flagsScope: System.flagsScope
  };
  if (game.animabfguote13 && game.animabfguote13 !== bucket) {
    try {
      const src = game.animabfguote13;
      for (const k of Object.keys(src)) {
        if (bucket[k] === void 0) bucket[k] = src[k];
      }
    } catch (_) {
    }
  }
  game.animabfguote13 = bucket;
}
export {
  System,
  registerSystemOnGame
};
