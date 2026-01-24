async function updateAttackTargetsFlag(messageId, entry) {
  const msg = game.messages.get(messageId);
  entry?.tokenUuid ?? "";
  entry?.actorUuid ?? "";
  const findIndexByKey = (arr, e) => {
    if (e.tokenUuid) {
      const iTok = arr.findIndex((t) => t.tokenUuid === e.tokenUuid);
      if (iTok >= 0) return iTok;
    }
    if (e.actorUuid && !e.tokenUuid) {
      return arr.findIndex((t) => t.actorUuid === e.actorUuid && !t.tokenUuid);
    }
    return -1;
  };
  const canDirect = game.user.isGM || msg && (msg.user?.id === game.user.id || msg.isAuthor);
  if (canDirect && msg) {
    const targets = foundry.utils.duplicate(
      msg.getFlag(game.animabf.id, "targets") ?? []
    );
    const i = findIndexByKey(targets, entry);
    if (i >= 0) targets[i] = { ...targets[i], ...entry };
    else targets.push(entry);
    await msg.setFlag(game.animabf.id, "targets", targets);
    ui.chat?.updateMessage?.(msg);
    return true;
  }
  game.socket.emit("system.animabf", {
    op: "updateAttackTargets",
    messageId,
    entry,
    from: game.user.id
  });
  return false;
}
export {
  updateAttackTargetsFlag
};
