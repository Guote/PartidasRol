let currentToken, currentActor;

if (typeof token !== "undefined") {
  // Scope defined in external macro or module
  currentToken = token;
  currentActor = token.actor;
} else if (canvas.tokens.controlled?.[0]) {
  currentToken = canvas.tokens.controlled[0];
  currentActor = currentToken.document.actor;
} else {
  let defaultActorId = game.users.get(game.userId)._source.character;
  currentActor = game.actors.get(defaultActorId);
}

if (!currentActor) throw new Error("Selecciona un token");

const macroCookies = currentActor.system?.macroCookies?.accumulationMacro;

const statInfo = [
  {
    name: "agility",
    abr: "AGI",
    savedCheckbox: macroCookies?.AGI,
    lastAccumMod: macroCookies?.mod?.AGI ?? 0,
  },
  {
    name: "constitution",
    abr: "CON",
    savedCheckbox: macroCookies?.CON,
    lastAccumMod: macroCookies?.mod?.CON ?? 0,
  },
  {
    name: "dexterity",
    abr: "DES",
    savedCheckbox: macroCookies?.DES,
    lastAccumMod: macroCookies?.mod?.DES ?? 0,
  },
  {
    name: "strength",
    abr: "FUE",
    savedCheckbox: macroCookies?.FUE,
    lastAccumMod: macroCookies?.mod?.FUE ?? 0,
  },
  {
    name: "power",
    abr: "POD",
    savedCheckbox: macroCookies?.POD,
    lastAccumMod: macroCookies?.mod?.POD ?? 0,
  },
  {
    name: "willPower",
    abr: "VOL",
    savedCheckbox: macroCookies?.VOL,
    lastAccumMod: macroCookies?.mod?.VOL ?? 0,
  },
];
const updateModes = {
  fullAccumulate: {
    label: "Acumulación plena",
    name: "fullAccumulate",
  },
  accumulate: {
    label: "Acumulación parcial",
    name: "accumulate",
  },
  spend: {
    label: "Gastar Ki acumulado",
    name: "spend",
  },
  stop: {
    label: "No acumular",
    name: "stopAccum",
  },
  none: { name: "none" },
};

const maxKiPool = currentActor.system.domine.kiAccumulation.generic.max;

const getAccumulation = (stat) => {
  return Number(currentActor.system.domine.kiAccumulation[stat].final.value);
};
const getOldAccumulated = (stat) => {
  return Number(
    currentActor.system.domine.kiAccumulation[stat].accumulated.value
  );
};
const getOldGenericAccumulated = () => {
  return Number(
    currentActor.system.domine.kiAccumulation.generic?.accumulated?.value ?? 0
  );
};
const getOldgenericPool = () => {
  return Number(currentActor.system.domine.kiAccumulation.generic.value);
};

const getDialogColumn = (stat) => {
  let currentStat = statInfo.find((s) => s.abr === stat);

  return `
    <div class="flexcol">
      <center>
        <label>
          <input 
            id="${currentStat.abr}" 
            type="checkbox"
            ${currentStat.savedCheckbox ? "checked" : ""}
          /> 
          <h4>${currentStat.abr}</h4>
        <h4>
          <span style="color:#B22C2C";>
            +${getAccumulation(currentStat.name)}
          </span>
          /
          <span style="color:#782e22";>
          +${Math.round(getAccumulation(currentStat.name) / 2)}
          </span>
        </h4>
        </label>
        <center> <small>Extra mod.</small> 
          <input 
            ${
              currentStat.lastAccumMod !== 0
                ? `style="background-color:rgba(120, 46, 34, 0.25);"`
                : ""
            } 
            id="accumMod-${currentStat.abr}" 
            type="number" value="${
              currentStat.lastAccumMod ?? "0"
            }" /> </center>
        <br>
      </center>
    </div>
  `;
};
const getLostAccum = (statName) => {
  if (getAccumulation(statName) > 1) {
    return -Math.min(
      Math.floor(getAccumulation(statName) / 2),
      getOldAccumulated(statName)
    );
  } else {
    return 0;
  }
};

function updateAcumulation({
  mode = updateModes.fullAccumulate.name,
  accumCharacteristics = statInfo.map((s) => s.name),
  accumBonus,
  fatigueUsed = 0,
  upkeepKi = 0,
  castKi = 0,
}) {
  let messageContent;

  let newValues = {
    agility: getOldAccumulated("agility"),
    constitution: getOldAccumulated("constitution"),
    dexterity: getOldAccumulated("dexterity"),
    strength: getOldAccumulated("strength"),
    power: getOldAccumulated("power"),
    willPower: getOldAccumulated("willPower"),
    generic: getOldgenericPool(),
    genericAccumulated: getOldGenericAccumulated(),
  };
  // Si hay coste de lanzamiento, perdemos las acumulaciones, a menos que solo estemos pagando
  if (castKi > 0) {
    if (mode !== "none") {
      newValues.generic = getOldgenericPool() - castKi;
    } else {
      newValues = {
        agility: 0,
        constitution: 0,
        dexterity: 0,
        strength: 0,
        power: 0,
        willPower: 0,
        generic: getOldgenericPool() - castKi,
        genericAccumulated: 0,
      };
    }
  }
  // Non accumulated stats this round go to 0 accumulation
  statInfo.forEach((stat) => {
    if (!accumCharacteristics.includes(stat.name)) {
      newValues[stat.name] = 0;
      newValues["genericAccumulated"] -= getOldAccumulated(stat.name);
    }
  });

  const updateAccumulations = {
    [updateModes.fullAccumulate.name]: () => {
      // Acumular plenamente
      accumCharacteristics.forEach((stat) => {
        let accumulation =
          getAccumulation(stat) + accumBonus[stat] + fatigueUsed;

        newValues[stat] += accumulation;
        newValues["genericAccumulated"] += accumulation;

        currentActor.update({
          [`system.domine.kiAccumulation.${stat}.accumulated.value`]:
            newValues[stat],
        });
      });
      messageContent = `${currentActor.name} acumula ki <b>de forma plena</b>.`;
    },
    [updateModes.accumulate.name]: () => {
      // Acumular parcialmente
      accumCharacteristics.forEach((stat) => {
        let accumulation =
          Math.ceil(getAccumulation(stat) / 2) + accumBonus[stat] + fatigueUsed;

        newValues[stat] += accumulation;
        newValues["genericAccumulated"] += accumulation;

        currentActor.update({
          [`system.domine.kiAccumulation.${stat}.accumulated.value`]:
            newValues[stat],
        });
      });

      messageContent = `${currentActor.name} acumula ki <b>parcialmente</b>.`;
    },
    [updateModes.stop.name]: () => {
      // Parar de acumular
      newValues["genericAccumulated"] = 0;
      newValues["generic"] = newValues["generic"];
      statInfo
        .map((s) => s.name)
        .forEach((stat) => {
          newValues[stat] = 0;

          currentActor.update({
            [`system.domine.kiAccumulation.${stat}.accumulated.value`]:
              newValues[stat],
          });
        });
      messageContent = `${currentActor.name} <b>no</b> acumula ki.`;
    },
    [updateModes.none.name]: () => {
      // No hacer nada, solo descontar costes
      messageContent = `${currentActor.name} paga algunos costes de ki`;
    },
  };
  if (!game?.cub?.hasCondition("Usando Ki", currentActor)) {
    game?.cub?.addCondition("Usando Ki", currentActor);
  }

  if (updateAccumulations.hasOwnProperty(mode)) {
    let newfatigue = [
      updateModes.accumulate.name,
      updateModes.fullAccumulate.name,
    ].includes(mode)
      ? currentActor.system.characteristics.secondaries.fatigue.value -
        fatigueUsed
      : currentActor.system.characteristics.secondaries.fatigue.value;
    newValues["generic"] = newValues["generic"] - upkeepKi;
    updateAccumulations[mode]();
    console.log(newValues);

    currentActor.update({
      [`system.characteristics.secondaries.fatigue.value`]: newfatigue,
      ["system.domine.kiAccumulation.generic.value"]: newValues["generic"],
      ["system.domine.kiAccumulation.generic.accumulated.value"]:
        newValues["genericAccumulated"],
    });
  } else {
    throw new Error("Algo está mal en el código");
  }

  const getMessageAccumulationInfo = (messageType) => {
    let message = "";
    const getMessage = {
      someStopped: () => {
        let stoppedAccumCharacteristics = statInfo
          .map((stat) => stat.name)
          .filter(
            (stat) =>
              !accumCharacteristics.includes(stat) &&
              getOldAccumulated(stat) > 0
          );
        if (!stoppedAccumCharacteristics.length) return;

        message = `
          <br>· <small>Ha dejado de acumular algunas características:</small> <br> <small><small>
        `;
        statInfo.forEach((stat) => {
          message += `${stat.abr} ${
            stoppedAccumCharacteristics.includes(stat.name)
              ? `-${getOldAccumulated(stat.name)}`
              : `-`
          } `;
        });
        message = `
          ${message}, Total -${stoppedAccumCharacteristics.reduce(
          (sumaAccum, stat) => sumaAccum + getOldAccumulated(stat),
          0
        )}
          </small></small>
        `;
      },
      accum: () => {
        const accumMessage = {
          [updateModes.fullAccumulate.name]: () => {
            message = `
          <br>· Acumulaciones: <br> <small><small>
        `;
            statInfo.forEach((stat) => {
              message += `${stat.abr} ${
                accumCharacteristics.includes(stat.name)
                  ? `+${getAccumulation(stat.name) + accumBonus[stat.name]}`
                  : `-`
              } `;
            });
            message = `
          ${message}, Total +${accumCharacteristics.reduce(
              (sumaAccum, stat) =>
                sumaAccum + getAccumulation(stat) + accumBonus[stat],
              0
            )}
          </small></small>
        `;
          },
          [updateModes.accumulate.name]: () => {
            message = `
            <br>· Acumulaciones (reducidas parcialmente): <br> <small><small>
          `;
            statInfo.forEach((stat) => {
              accumBonus[stat.name];
              message += `${stat.abr} ${
                accumCharacteristics.includes(stat.name)
                  ? `+${
                      Math.ceil(getAccumulation(stat.name) / 2) +
                      accumBonus[stat.name]
                    }`
                  : `-`
              } `;
            });
            message = `
            ${message}, Total +${accumCharacteristics.reduce(
              (sumaAccum, stat) =>
                sumaAccum +
                Math.ceil(getAccumulation(stat) / 2) +
                accumBonus[stat],
              0
            )}
            </small></small>
          `;
          },
        };
        if (
          [
            updateModes.fullAccumulate.name,
            updateModes.accumulate.name,
          ].includes(mode)
        ) {
          accumMessage[mode]();
        }
      },
      oldValues: () => {
        if (mode === "none") return;
        message = `
        <br>
          <br>Acumulado ronda anterior: <br>
            <small>
              Reserva ${getOldgenericPool()}/${maxKiPool}, 
              Acumulado ${getOldGenericAccumulated()}
          <br>
        
        `;
        statInfo.forEach((stat) => {
          message += `${stat.abr} ${getOldAccumulated(stat.name)} `;
        });
        message = `${message}</small><br>`;
      },
      newValues: () => {
        if (mode === "none") return;
        message = `
          <br>Acumulado ronda actual: <br>
              <small>Reserva ${newValues["generic"]} /${maxKiPool},
              Acumulado ${newValues["genericAccumulated"]}</small>
          <br>
        `;
        statInfo.forEach((stat) => {
          message += `
            ${newValues[stat.name] > 0 ? "<b>" : ""} 
              ${stat.abr} ${newValues[stat.name]}
            ${newValues[stat.name] > 0 ? "</b>" : ""}
          `;
        });
      },
      upkeep: () => {
        console.log(`<br>· Gasta <b>${upkeepKi} ki en mantenimiento</b>.`);
        if (upkeepKi === 0) return;
        message = `
        <br>· Gasta <b>${upkeepKi} ki en mantenimiento</b>.
      `;
      },
      cast: () => {
        if (castKi === 0) return;
        message = `
        <br>· Gastó <b>${castKi} ki</b>. <small>Sus acumulaciones han vuelto a 0.</small>
      `;
      },
      lostAccum: () => {
        if (mode !== updateModes.accumulate.name) return;
        message = `
        <br>· Acumulaciones reducidas parcialmente: <br>
        <small><small>
      `;
        statInfo.forEach((stat) => {
          message += `${stat.abr} ${getLostAccum(stat.name) ?? "-"} `;
        });
        message = `${message}, Total ${statInfo.reduce(
          (sumaAccum, stat) => sumaAccum + getLostAccum(stat.name),
          0
        )}</small></small>`;
      },
      fatigue: () => {
        if (
          fatigueUsed === 0 ||
          [updateModes.spend.name, updateModes.stop.name].includes(mode)
        )
          return;

        message = `
          <br>· Usa <b>${fatigueUsed} cansancios</b>: <br>
          <small><small>
        `;
        statInfo.forEach((stat) => {
          message += `
              ${stat.abr} ${
            accumCharacteristics.includes(stat.name) ? `+${fatigueUsed} ` : "0 "
          }
          `;
        });
        message = `${message}, Total +${
          fatigueUsed * accumCharacteristics.length
        }</small></small>`;
      },
    };
    getMessage?.[messageType] ? getMessage[messageType]() : () => null;
    return message;
  };

  let messageAccumulations = `
  ${getMessageAccumulationInfo("oldValues")}
  ${getMessageAccumulationInfo("cast")}
  ${getMessageAccumulationInfo("accum")}
  ${getMessageAccumulationInfo("someStopped")}
  ${getMessageAccumulationInfo("upkeep")}
  ${getMessageAccumulationInfo("fatigue")}
  
  ${
    [
      getMessageAccumulationInfo("upkeep"),
      getMessageAccumulationInfo("fatigue"),
      getMessageAccumulationInfo("accum"),
      getMessageAccumulationInfo("cast"),
      getMessageAccumulationInfo("someStopped"),
    ].some((m) => m !== "")
      ? "<br>"
      : ""
  }
  ${getMessageAccumulationInfo("newValues")}
  `;

  messageContent += `${messageAccumulations}`;

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: actor }),
    content: messageContent,
    whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
  });
}

let stayOpen = false;
let htmlStyle = `
<style>
  .radio-toolbar-3 {
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 3px 8px 0 rgba(0, 0, 0, 0.19);
    width: 100%;
    display: flex;
    overflow: hidden;
    border-radius: 10px;
  }

  .radio-toolbar-3 label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.3rem 0 0.3rem 0;
    font-size: 1rem;
    text-align: center;
}

  .radio-toolbar-3 label:hover {
    background-color: #B4B4B4;
    font-weigth: 1000;
  }
  .radio-toolbar-3 input[id="${updateModes.fullAccumulate.name}"]+label {
    color: #B22C2C;
  }
  .radio-toolbar-3 input[id="${updateModes.accumulate.name}"]+label {
    color: #782e22;
  }

  .radio-toolbar-3 input[type="radio"]:checked+label {
    background-color: #782e22;
    color: white;
  }

  input[type="radio"] {
    position: fixed;
    opacity: 0;
    pointer-events: none;
  }
</style>
`;
let dialogContent = `
  ${htmlStyle}
  <center><h3>Fase de mantenimiento: Pagar costes de Ki</h3></center>
  <small>
  <b>· Lanzamiento:</b> Coste total de las técnicas que he lanzado la <b>ronda anterior</b>. Si he hecho esto, esta ronda comienzo con 0 ki acumulado. <br>
  <b>· Mantenimiento:</b> Costes para mantener efectos <b>durante la ronda actual</b>.<br>
  </small>
  <br>
  <center>
    <div class="flex flex-row">
      <label>
        <small>LANZAMIENTO</small>
        <input type="Number" id="castKi" 
          name="castKi" placeholder="0" 
            value="0" 
        >
      </label> 
      <label>
        <small>MANTENIMIENTO</small>
        <input 
          ${
            macroCookies?.upkeep && macroCookies?.upkeep !== 0
              ? `style="background-color:rgba(120, 46, 34, 0.25);"`
              : ""
          }
          type="Number" id="upkeepKi" name="mod" placeholder="0" 
            value="${macroCookies?.upkeep ?? 0}" autofocus
        >
      </label>
           
    </div>
  </center>
  <br>
  <div>
    <center><h3>Acumulación de ki</h3></center>
  </div>
  <div><small>
    <i>Escoge las características a acumular, el modo de acumulación, y si utilizas cansancios para mejorar la acumulación.</i
    <br><br>
    <b>· Acumulación Plena:</b> Acumulo tanto ki como puedo. Se selecciona <b>si estoy empezando a acumular</b> o <b>si no he realizado acciones activas la ronda anterior.</b><br>
    <b>· Acumulación Parcial:</b> Si la ronda anterior <b>he hecho acciones activas</b>, nuestra acumulación por turno se reduce a la mitad durante esta ronda.<br>
    <b>· Dejar de acumular:</b> El Ki que tengamos acumulado vuelve a la reserva.<br>
    Si dejas de acumular alguna de tus caracerísticas una ronda, esas acumulaciones vuelven a tu reserva.
  </small></div>
  <br>

  <div class="radio-toolbar-3">
    <input 
      type="radio" 
      id="${updateModes.fullAccumulate.name}" 
      name="mode" 
      value="${updateModes.fullAccumulate.name}"
      ${
        macroCookies?.updateMode === updateModes.fullAccumulate.name
          ? "checked"
          : ""
      }
    >
    <label for="${updateModes.fullAccumulate.name}">
      ${updateModes.fullAccumulate.label}
    </label>

    <input 
      type="radio" 
      id="${updateModes.accumulate.name}" 
      name="mode" 
      value="${updateModes.accumulate.name}"
      ${
        macroCookies?.updateMode === updateModes.accumulate.name
          ? "checked"
          : ""
      }
    >
    <label for="${updateModes.accumulate.name}">
      ${updateModes.accumulate.label}
    </label>

    <input 
      type="radio" 
      id="${updateModes.stop.name}" 
      name="mode" 
      value="${updateModes.stop.name}"
      ${macroCookies?.updateMode === updateModes.stop.name ? "checked" : ""}
    >
    <label for="${updateModes.stop.name}">
      ${updateModes.stop.label}
    </label>
  </div>
  <br> 

  <div class="flexrow flex-center">
    ${getDialogColumn("AGI")}
    ${getDialogColumn("CON")}
    ${getDialogColumn("DES")}
    ${getDialogColumn("FUE")}
    ${getDialogColumn("POD")}
    ${getDialogColumn("VOL")}
  </div>
  
  <form class="flexcol">
    <div class="form-group">
    <center><label for="mod">Cansancios usados</label>
      <input type="Number" id="fatigue" name="mod" placeholder="Cansancios usados" value="0">
    </center>
    </div>
  </form>
  <br>            
`;

const getDataAndSaveCookies = (html) => {
  const selectedCharactesistics = statInfo
    .filter((stat) => html[0].querySelector(`#${stat.abr}`).checked)
    .map((selectedStat) => selectedStat.name);
  const mode =
    html[0].querySelector("input[name=mode]:checked")?.value ??
    updateModes.stop.name;
  const fatigue = Number(html[0].querySelector("#fatigue").value);
  const upkeepKi = Number(html[0].querySelector("#upkeepKi").value);
  const castKi = Number(html[0].querySelector("#castKi").value);
  let accumBonus = {};
  statInfo.map(
    (stat) =>
      (accumBonus[stat.name] = Number(
        html[0].querySelector(
          `#accumMod-${statInfo.find((s) => s.name === stat.name).abr}`
        ).value
      ))
  );

  // Save current selections for the future
  currentActor.update({
    "system.macroCookies.accumulationMacro.upkeep": upkeepKi,
    "system.macroCookies.accumulationMacro.updateMode": mode,
  });
  for (stat of statInfo) {
    currentActor.update({
      [`system.macroCookies.accumulationMacro.${stat.abr}`]:
        selectedCharactesistics.includes(stat.name),
      [`system.macroCookies.accumulationMacro.mod.${stat.abr}`]:
        accumBonus[stat.name],
    });
  }

  return {
    selectedCharactesistics: selectedCharactesistics,
    mode: mode,
    fatigue: fatigue,
    upkeepKi: upkeepKi,
    castKi: castKi,
    accumBonus: accumBonus,
  };
};

let d = new Dialog({
  title: `Ki Accumulation: ${currentActor.name}`,
  content: dialogContent,
  buttons: {
    applyCostsAndAccum: {
      label: `<small><small>Actualizar acumulación y pagar costes</small></small>`,
      callback: async (html) => {
        const {
          selectedCharactesistics,
          mode,
          fatigue,
          upkeepKi,
          castKi,
          accumBonus,
        } = getDataAndSaveCookies(html);

        if (
          selectedCharactesistics.length === 0 &&
          [
            updateModes.accumulate.name,
            updateModes.fullAccumulate.name,
          ].includes(mode)
        ) {
          stayOpen = false;
          let errorMsg = "Selecciona al menos un campo a acumular";
          ui.notifications.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          stayOpen = false;

          updateAcumulation({
            mode: mode,
            accumCharacteristics: selectedCharactesistics,
            accumBonus: accumBonus,
            fatigueUsed: fatigue,
            upkeepKi: upkeepKi,
            castKi: castKi,
          });
        }
      },
    },
    applyCosts: {
      label: "Solo pagar costes",
      callback: (html) => {
        const { upkeepKi, castKi } = getDataAndSaveCookies(html);
        console.log("upkeep", upkeepKi);

        updateAcumulation({
          mode: updateModes.none.name,
          upkeepKi: upkeepKi,
          castKi: castKi,
        });
      },
    },
  },
  default: "applyCostsAndAccum",
  close: () => {
    if (stayOpen) {
      stayOpen = false;
      d.render(true);
    }
  },
}).render(true);
