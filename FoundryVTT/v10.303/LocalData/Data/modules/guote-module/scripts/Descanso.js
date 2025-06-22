let myContent = `
    Días descansando <input id="resting" type="number" value="1" />
`;

new Dialog({
  title: "Descanso",
  content: myContent,
  buttons: {
    button1: {
      label: "Descansar",
      callback: (html) => myCallback(html),
      icon: `<i class="fas fa-check"></i>`,
    },
  },
}).render(true);

function myCallback(html) {
  let restingDays = parseInt(html.find("input#resting").val());

  let actor = _token.actor;
  let hp = actor.system.characteristics.secondaries.lifePoints;
  let fatigue = actor.system.characteristics.secondaries.fatigue;
  //let penFisico = actor.system.general.modifiers.modFisico.final
  let ki = actor.system.domine.kiAccumulation.generic;
  let zeon = actor.system.mystic.zeon;
  let cv = actor.system.psychic.psychicPoints;

  let regHp =
    Math.min(restingDays *
      Math.floor(
        (actor.system.characteristics.primaries.constitution.value ?? 5 * 4) / 5
      ) * 5,
      hp.max - hp.value
    );
  let regFatigue =
    Math.min(fatigue.max, fatigue.max - fatigue.value);
  let regKi = Math.min(ki.max, ki.max - ki.value);
  let dailyCosts = !actor.system.mystic.spellMaintenances.length
    ? 0
    : restingDays *actor.system.mystic.spellMaintenances.reduce(
        (accumulator, currentValue) =>
          accumulator + currentValue.system.cost.value,
        0
      );
  let regZeon =
    Math.min(
      restingDays *actor.system.mystic.zeonRegeneration.final.value,
      zeon.max - zeon.value
    );
  let regCv = Math.min(cv.max, cv.max - cv.value);

  let newHp = hp.value + regHp;
  let newFatigue = fatigue.value + regFatigue;
  let newKi = ki.value + regKi;
  let newZeon = zeon.value + regZeon;
  let newCv = cv.value + regCv;

  console.log(`
descansa${restingDays > 1 ? `${restingDays} días` : ``}: 
| Vida: ${newHp} (+${regHp})
| Cansancio: ${newFatigue} (+${regFatigue})
| Ki: ${newKi} (+${regHp})
| Zeon: ${newZeon} (+${regZeon})
| CV: ${newCv} (+${regCv})`);

  actor.update({
    data: {
      characteristics: {
        secondaries: {
          lifePoints: { value: newHp },
          fatigue: { value: newFatigue },
        },
      },
      mystic: {
        zeon: { value: newZeon },
      },
      domine: { kiAccumulation: { generic: { value: newKi } } },
      psychic: {
        psychicPoints: { value: newCv },
      },
    },
  });

  ChatMessage.create({
    flavor: `
        ${actor.name} descansa${restingDays > 1 ? `${restingDays} días` : ``}: 
      | Vida: ${newHp} (+${regHp})
      | Cansancio: ${newFatigue} (+${regFatigue})
      | Ki: ${newKi} (+${regKi})
      | Zeon: ${newZeon} (+${regZeon})
      | CV: ${newCv} (+${regCv})`,
    whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
  });
}