(async () => {
  let effectsToDelete = _token.actor.effects
    .filter((e) => e.sourceName === "None")
    .map((e) => {
      return e.id;
    }); // documents api expects array of ids
  await token.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
})();
