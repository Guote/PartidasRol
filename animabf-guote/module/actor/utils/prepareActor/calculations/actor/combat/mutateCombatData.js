const applyPosture = (data) => {
  const postures = {
    offensive: { modHA: 20, modHD: -20, flavor: "A la ofensiva" },
    defensive: { modHA: -20, modHD: 20, flavor: "A la defensiva" },
    fullOffense: { modHA: 40, modHD: -999, flavor: "Ataque total" },
    fullDefense: { modHA: -999, modHD: 40, flavor: "Defensa total" },
  };
  const selectedPosture = data.general.modifiers.combatPosture;

  /* 
  const currentActor = game.actors.find(actor => actor.system === data)
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

  console.log(currentActor)
  currentActor.update({ data: { general: {modifiers: {previousPosture: selectedPosture}} } });

  console.log(
    previousPosture,
    selectedPosture,
    postures[selectedPosture?.modHA],
    postures[selectedPosture?.modHD]
  ); */

  let modHA = postures[selectedPosture]?.modHA || 0;
  let modHD = postures[selectedPosture]?.modHD || 0;

  return [modHA, modHD];
};

export const mutateCombatData = (data) => {
  const [postureModHA, postureModHD] = applyPosture(data);

  data.combat.attack.final.value =
    postureModHA === -999
      ? 0
      : data.combat.attack.base.value +
        data.general.modifiers.modFisico.final.value +
        data.general.modifiers.modSobrenatural.final.value +
        postureModHA;
  data.combat.block.final.value =
    postureModHD === -999
      ? 0
      : data.combat.block.base.value +
        data.general.modifiers.modFisico.final.value +
        data.general.modifiers.modSobrenatural.final.value +
        postureModHD;
  data.combat.dodge.final.value =
    postureModHD === -999
      ? 0
      : data.combat.dodge.base.value +
        data.general.modifiers.modFisico.final.value +
        data.general.modifiers.modSobrenatural.final.value +
        postureModHD;
};
