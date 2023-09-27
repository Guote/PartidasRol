/* const applyPosture = (data) => {
  const postures = {
    offensive: { modHA: 20, modHD: -20, flavor: "A la ofensiva" },
    defensive: { modHA: -20, modHD: 20, flavor: "A la defensiva" },
    fullOffense: { modHA: 40, modHD: -999, flavor: "Ataque total" },
    fullDefense: { modHA: -999, modHD: 40, flavor: "Defensa total" },
  };
  const selectedPosture = data.general.modifiers.combatPosture;

  const raener = game.actors.find((a) => a.system === data);
  const currentActor = game.actors.find((a) => a.name === "Raener");
  let previousPosture = data.general.modifiers.previousPosture;

  if (selectedPosture !== previousPosture) {
    let chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: "",
      flavor: postures[selectedPosture]?.flavor || "Normal",
    };
    ChatMessage.create(chatData, {});
  }

  console.log("data, raener, iguales?", data, raener, data === raener.system);

  console.log(currentActor);
  currentActor.update({
    data: { general: { modifiers: { previousPosture: selectedPosture } } },
  });

  console.log(
    previousPosture,
    selectedPosture,
    postures[selectedPosture?.modHA],
    postures[selectedPosture?.modHD]
  );

  let modHA = postures[selectedPosture]?.modHA || 0;
  let modHD = postures[selectedPosture]?.modHD || 0;

  return [modHA, modHD];
}; */

export const mutateCombatData = (data) => {
  const activeEffectModAtk = data?.activeEffects?.combat?.attack?.final?.value ?? 0
  const activeEffectModDef = (data?.activeEffects?.combat?.block?.final?.value || data?.activeEffects?.combat?.dodge?.final?.value) ?? 0
  /* const [postureModHA, postureModHD] = applyPosture(data); */
  data.combat.attack.final.value = data.combat.attack.base.value + data.general.modifiers.modFinal.attack.final.value + activeEffectModAtk;
  data.combat.block.final.value = data.combat.block.base.value + data.general.modifiers.modFinal.defense.final.value + activeEffectModDef;
  data.combat.dodge.final.value = data.combat.dodge.base.value + data.general.modifiers.modFinal.defense.final.value + activeEffectModDef;
};
