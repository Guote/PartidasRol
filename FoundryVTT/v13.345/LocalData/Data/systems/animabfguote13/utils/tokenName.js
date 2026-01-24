function resolveTokenName({ tokenUuid, actorUuid }, { message } = {}) {
  if (tokenUuid && typeof tokenUuid === "string" && tokenUuid.includes(".")) {
    try {
      const doc = fromUuidSync(tokenUuid);
      const live = doc?.object ?? null;
      return live?.name ?? doc?.name ?? null;
    } catch {
    }
  }
  if (tokenUuid) {
    const live = canvas?.tokens?.get?.(tokenUuid);
    if (live) return live.name ?? live.document?.name ?? null;
  }
  if (actorUuid) {
    const sceneId = message?.speaker?.scene;
    if (sceneId) {
      const tokDoc = game.scenes?.get(sceneId)?.tokens?.find((t) => t.actorId === actorUuid);
      if (tokDoc) return tokDoc.name ?? null;
    }
    for (const s of game.scenes ?? []) {
      const tokDoc = s.tokens?.find((t) => t.actorId === actorUuid);
      if (tokDoc) return tokDoc.name ?? null;
    }
  }
  return actorUuid ? game.actors.get(actorUuid)?.name ?? null : null;
}
export {
  resolveTokenName
};
