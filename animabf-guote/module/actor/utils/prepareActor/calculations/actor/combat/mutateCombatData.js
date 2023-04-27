const applyPosture = (system) => {
  const postures = {
    offensive: { modHA: 20, modHD: -20, flavor: "A la ofensiva" },
    defensive: { modHA: -20, modHD: 20, flavor: "A la defensiva" },
    fullOffense: { modHA: 40, modHD: -999, flavor: "Ataque total" },
    fullDefense: { modHA: -999, modHD: 40, flavor: "Defensa total" },
  };
  const selectedPosture = system.general.modifiers.combatPosture;

  /* 
  const currentActor = game.actors.find(actor => actor.system === system)
  let previousPosture = system.general.modifiers.previousPosture;
  
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
  currentActor.update({ system: { general: {modifiers: {previousPosture: selectedPosture}} } });

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

export const mutateCombatData = (system) => {
  const [postureModHA, postureModHD] = applyPosture(system);

  system.combat.attack.final.value =
    postureModHA === -999
      ? 0
      : system.combat.attack.base.value +
        system.general.modifiers.modFisico.final.value +
        system.general.modifiers.modSobrenatural.final.value +
        postureModHA;
  system.combat.block.final.value =
    postureModHD === -999
      ? 0
      : system.combat.block.base.value +
        system.general.modifiers.modFisico.final.value +
        system.general.modifiers.modSobrenatural.final.value +
        postureModHD;
  system.combat.dodge.final.value =
    postureModHD === -999
      ? 0
      : system.combat.dodge.base.value +
        system.general.modifiers.modFisico.final.value +
        system.general.modifiers.modSobrenatural.final.value +
        postureModHD;
};
