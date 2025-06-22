/**********************************************************************************
 * Common definitions
 */

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

/**********************************************************************************
 * Macro speciofic definitions and constants
 */

const statNames = [
  {
    name: "agility",
    abr: "AGI",
  },
  {
    name: "constitution",
    abr: "CON",
  },
  {
    name: "dexterity",
    abr: "DES",
  },
  {
    name: "strength",
    abr: "FUE",
  },
  {
    name: "power",
    abr: "POD",
  },
  {
    name: "willPower",
    abr: "VOL",
  },
];
const statInfo = statNames.map((stat) => ({
  ...stat,
  savedCheckbox: macroCookies?.[stat.abr],
  lastAccumMod: macroCookies?.mod?.[stat.abr] ?? 0,
}));
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

const updateLastRoundAccum = {
  noActActions: {
    name: "noActActions",
    label: "No he hecho acciones activas",
    info: statInfo.reduce(
      (message, stat) => `
        ${message}
        ${getOldAccumulated(stat.name) ? "<b>" : ""} 
        ${stat.abr} 
        ${macroCookies?.[stat.abr] ? getOldAccumulated(stat.name) : 0}
        ${getOldAccumulated(stat.name) ? "</b>" : ""} 
      `,
      ""
    ),
  },
  withActActions: {
    name: "withActActions",
    label: "He hecho acciones activas",
    info: statInfo.reduce(
      (message, stat) => `
      ${message}
      ${getOldAccumulated(stat.name) ? "<b>" : ""} 
      ${stat.abr} 
      ${
        macroCookies?.[stat.abr] && getOldAccumulated(stat.name)
          ? Math.max(
              1,
              getOldAccumulated(stat.name) -
                Math.floor(getAccumulation(stat.name) / 2)
            )
          : 0
      }
      ${getOldAccumulated(stat.name) ? "</b>" : ""} 
      `,
      ""
    ),
  },
  castedTech: {
    name: "castedTech",
    label: "He lanzado alguna técnica",
    info: statInfo.reduce((message, stat) => `${message}${stat.abr} 0 `, ""),
  },
};

/**********************************************************************************
 * Dialog callback functions
 */
/* const getAccumSummary = (title, keyValue_statNameValue = {}) => {
  const nameToAbr = statNames.map((stat) => ({
    [stat.name]: stat.abr,
  }));
  let message = Object.keys(keyValue_statNameValue).reduce(
    (message, statName) => {
      `${message}${nameToAbr[statName]} ${keyValue_statNameValue[statName]} `;
    },
    ""
  );
  return `
    <br>· ${title}: <br>
    <small>${message}</small>
  `;
}; */
function applyCondition() {
  if (!game?.cub?.hasCondition("Usando Ki", currentActor)) {
    game?.cub?.addCondition("Usando Ki", currentActor);
  }
}
function updateKi({ upkeepKi = 0 }) {
  if ((upkeepKi = 0)) return;
  const newValue = getOldgenericPool() - upkeepKi;

  currentActor.update({
    ["system.domine.kiAccumulation.generic.value"]: newValue,
  });
  applyCondition();
}
function updateAcumulations({
  mode = updateLastRoundAccum.noActActions.name,
  accumCharacteristics = statInfo.map((s) => s.name),
  accumBonus,
  upkeepKi = 0,
  fatigueUsed = 0,
}) {
  if (!Object.keys(updateLastRoundAccum).includes(mode))
    throw new Error("Error obteniendo la acumulación inicial");

  // Initial definitions
  let newValues = {};
  let messageSection = {};
  const oldValues = {
    ...statNames.reduce((obj, stat) => {
      return {
        ...obj,
        [stat.name]: getOldAccumulated(stat.name),
      };
    }, {}),
    genericAccumulated: getOldGenericAccumulated(),
    fatigue: currentActor.system.characteristics.secondaries.fatigue.value,
  };

  // Get initial accumulation for this round
  const initialAccumulations = {
    [updateLastRoundAccum.noActActions.name]: {
      ...statNames.reduce((obj, stat) => {
        return {
          ...obj,
          [stat.name]: macroCookies?.[stat.abr]
            ? getOldAccumulated(stat.name)
            : 0,
        };
      }, {}),
    },
    [updateLastRoundAccum.withActActions.name]: {
      ...statNames.reduce((obj, stat) => {
        return {
          ...obj,
          [stat.name]:
            macroCookies?.[stat.abr] && getOldAccumulated(stat.name)
              ? Math.max(
                  1,
                  getOldAccumulated(stat.name) -
                    Math.floor(getAccumulation(stat.name) / 2)
                )
              : 0,
        };
      }, {}),
    },
    [updateLastRoundAccum.castedTech.name]: {
      ...statNames.reduce((obj, stat) => {
        return {
          ...obj,
          [stat.name]: 0,
        };
      }, {}),
    },
  };
  const initialAccumulation = initialAccumulations[mode];
  const initialGenericAccumulation = Object.values(initialAccumulation).reduce(
    (sum, value) => sum + value,
    0
  );
  console.log("initialAccumulation", initialAccumulation);

  // Increase accumulation for this round
  const accumulation = {
    ...statNames.reduce((obj, stat) => {
      return {
        ...obj,
        [stat.name]: accumCharacteristics.includes(stat.name)
          ? getAccumulation(stat.name) + accumBonus[stat.name] + fatigueUsed
          : -getOldAccumulated(stat.name),
      };
    }, {}),
  };
  newValues = {
    ...oldValues,
    fatigue: oldValues.fatigue - fatigueUsed,
    generic: getOldgenericPool() - upkeepKi,
    genericAccumulated: initialGenericAccumulation,
  };

  statInfo.forEach((stat) => {
    newValues[stat.name] = Math.max(
      0,
      initialAccumulation[stat.name] + accumulation[stat.name]
    );
    newValues.genericAccumulated = Math.max(
      0,
      newValues.genericAccumulated + accumulation[stat.name]
    );
  });

  // Update accumulation values
  updateKi(upkeepKi);
  currentActor.update({
    [`system.characteristics.secondaries.fatigue.value`]: newValues.fatigue,
    ["system.domine.kiAccumulation.generic.accumulated.value"]:
      newValues.genericAccumulated,
  });
  statInfo.forEach((stat) => {
    currentActor.update({
      [`system.domine.kiAccumulation.${stat.name}.accumulated.value`]:
        newValues[stat.name],
    });
  });

  // Whisp details to the GM
  let messageContent = `
  ${updateLastRoundAccum[mode].label} la ronda anterior
  `;

  const messageSections = {
    oldValues: () => {
      let message = `
        <br>
          <br>Acumulado al inicio de la ronda: <br>
            <small>
              Reserva ${getOldgenericPool()}/${maxKiPool}, 
              Acumulado ${initialGenericAccumulation}
          <br>
        `;
      statInfo.forEach((stat) => {
        message += `${stat.abr} ${initialAccumulation[stat.name]} `;
      });
      message = `${message}</small><br>`;
      return message;
    },
    upkeep: () => {
      if (upkeepKi === 0) return "";
      return `
        <br>· Gasta <b>${upkeepKi} ki</b>.
      `;
    },
    fatigue: () => {
      if (fatigueUsed === 0) return "";
      return `
        <br>· Usa <b>${fatigueUsed} cansancios</b>.
      `;
    },
    accum: () => {
      if (!accumCharacteristics.length) return "";
      let message = `
        <br>· Acumulaciones: 
        <br> <small><small>
      `;
      statInfo.forEach((stat) => {
        message = `${message} ${stat.abr} +${Math.max(
          0,
          accumulation[stat.name]
        )}`;
      });
      return `${message}, Total +${accumCharacteristics.reduce(
        (sum, statName) => sum + accumulation[statName],
        0
      )} </small></small>`;
    },
    someStopped: () => {
      let stoppedAccumCharacteristics = statInfo
        .map((stat) => stat.name)
        .filter(
          (stat) =>
            !accumCharacteristics.includes(stat) && getOldAccumulated(stat) > 0
        );
      if (!stoppedAccumCharacteristics.length) return "";

      let message = `
      <br>· <small>Ha dejado de acumular algunas características:</small> <br> <small><small>
      `;
      statInfo.forEach((stat) => {
        message += `${stat.abr} ${
          stoppedAccumCharacteristics.includes(stat.name)
            ? `-${initialAccumulation[stat.name]}`
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
      return message;
    },
    newValues: () => {
      let message = `
          <br>Acumulado ronda actual: <br>
            <small>Reserva ${newValues.generic} /${maxKiPool},
            Acumulado ${newValues.genericAccumulated}</small>
          <br>
        `;
      statInfo.forEach((stat) => {
        message += `
            ${newValues[stat.name] > 0 ? "<b>" : ""} 
              ${stat.abr} ${newValues[stat.name]}
            ${newValues[stat.name] > 0 ? "</b>" : ""}
          `;
      });
      return message;
    },
    endOfRound: () => {
      let message = ` <small>
          <br><br>Cuando finalize la ronda, si realizo acciones activas:<br>
        `;
      statInfo.forEach((stat) => {
        message += `
            ${newValues[stat.name] > 0 ? "<b>" : ""} 
              ${stat.abr} 
              ${
                accumCharacteristics.includes(stat.name)
                  ? Math.max(
                      1,
                      newValues[stat.name] -
                        Math.floor(getAccumulation(stat.name) / 2)
                    )
                  : newValues[stat.name]
              }
            ${newValues[stat.name] > 0 ? "</b>" : ""}
          `;
      });
      return `${message}</small>`;
    },
  };
  messageContent = `
  ${messageContent}
  ${messageSections.oldValues()}
  ${messageSections.upkeep()}
  ${messageSections.fatigue()}
  ${upkeepKi || fatigueUsed ? "<br>" : ""}
  ${messageSections.accum()}
  ${messageSections.someStopped()}
  <br>
  ${messageSections.newValues()}
  ${messageSections.endOfRound()}
  `;

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: actor }),
    content: messageContent,
    whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
  });
}

/**********************************************************************************
 * Dialog section
 */

let stayOpen = false;

const getData = (html) => {
  const selectedCharactesistics = statInfo
    .filter((stat) => html[0].querySelector(`#${stat.abr}`).checked)
    .map((selectedStat) => selectedStat.name);
  const mode =
    html[0].querySelector("input[name=mode]:checked")?.value ??
    updateLastRoundAccum.noActActions.name;
  const fatigue = Number(html[0].querySelector("#fatigue").value);
  const upkeepKi = Number(html[0].querySelector("#upkeepKi").value);
  let accumBonus = {};
  statInfo.map(
    (stat) =>
      (accumBonus[stat.name] = Number(
        html[0].querySelector(
          `#accumMod-${statInfo.find((s) => s.name === stat.name).abr}`
        ).value
      ))
  );

  return {
    selectedCharactesistics: selectedCharactesistics,
    mode: mode,
    fatigue: fatigue,
    upkeepKi: upkeepKi,
    accumBonus: accumBonus,
  };
};
const saveCookies = (html) => {
  const { selectedCharactesistics, mode, upkeepKi, accumBonus } = getData(html);
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
};
const getDialogColumn = (stat) => {
  let currentStat = statInfo.find((s) => s.abr === stat);

  return `
    <div class="flexcol">
      <center>
        <label>
          <input 
            id="${currentStat.abr}" 
            class="selectedId"
            type="checkbox"
            ${currentStat.savedCheckbox ? "checked" : ""}
          /> 
          <br>
          ${currentStat.abr}
          <br>+${getAccumulation(currentStat.name)}
          
        <center> <small>Extra mod.</small> 
        </label>
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
const htmlStyle = `
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
    padding: 0.5rem 0.2rem 0.5rem 0.2rem;
    font-size: 1rem;
    text-align: center;
}

  .radio-toolbar-3 label:hover {
    background-color: #B4B4B4;
    font-weigth: 1000;
    cursor: pointer
  }

  .radio-toolbar-3 input[type="radio"]:checked+label {
    background-color: #782e22;
    color: white;
  }
  .radio-toolbar-3 input[type="radio"]:not(:checked)+label+p {
    display: none;
  }
  .radio-toolbar-3 input[type="radio"]:checked+label+p {
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    left: 0;
    right: 0;
    text-align: center;
    top: 8rem;
  }

  input[type="radio"] {
    position: fixed;
    opacity: 0;
    pointer-events: none;
  }
</style>
`;
const htmlRadio = `
${htmlStyle}
<div class="radio-toolbar-3">
  <input 
    type="radio" 
    id="${updateLastRoundAccum.noActActions.name}" 
    name="mode" 
    value="${updateLastRoundAccum.noActActions.name}"
    ${
      [
        updateLastRoundAccum.withActActions.name,
        updateLastRoundAccum.castedTech.name,
      ].includes(macroCookies?.updateMode)
        ? ""
        : "checked"
    }
  >
  <label for="${updateLastRoundAccum.noActActions.name}">
    ${updateLastRoundAccum.noActActions.label}
  </label>
  <p>${updateLastRoundAccum.noActActions.info}</p>

  <input 
    type="radio" 
    id="${updateLastRoundAccum.withActActions.name}" 
    name="mode" 
    value="${updateLastRoundAccum.withActActions.name}"
    ${
      macroCookies?.updateMode === updateLastRoundAccum.withActActions.name
        ? "checked"
        : ""
    }
  >
  <label for="${updateLastRoundAccum.withActActions.name}">
    ${updateLastRoundAccum.withActActions.label}
  </label>
  <p>${updateLastRoundAccum.withActActions.info}</p>

  <input 
    type="radio" 
    id="${updateLastRoundAccum.castedTech.name}" 
    name="mode" 
    value="${updateLastRoundAccum.castedTech.name}"
    ${
      macroCookies?.updateMode === updateLastRoundAccum.castedTech.name
        ? "checked"
        : ""
    }
  >
  <label for="${updateLastRoundAccum.castedTech.name}">
    ${updateLastRoundAccum.castedTech.label}
  </label>
  <p>${updateLastRoundAccum.castedTech.info}</p>
  
  </div>
`;
const htmlCostsSection = `
  <center>
    <label>
      Costes de ki (mantenimientos u otros)
      <input 
        style="width:75%;${
          macroCookies?.upkeep && macroCookies?.upkeep !== 0
            ? `background-color:rgba(120, 46, 34, 0.25);`
            : ``
        }"
        type="Number" id="upkeepKi" name="mod" placeholder="0" 
          value="${macroCookies?.upkeep ?? 0}" autofocus
      >
    </label>   
    </center>      

<br>
`;
const htmlUpkeep = `
<center><h3>Mantenimiento de inicio de ronda</h3></center>
Dependiendo de lo que haya hecho <b>la ronda anterior</b>, esta ronda mis acumulaciones iniciales pueden ser diferentes.
<br><br>
<center>Acumulaciones al inicio de la ronda actual:</center><br>
<div>
  ${
    statNames.some(
      (stat) => !macroCookies?.[stat.abr] && getOldAccumulated(stat.name)
    )
      ? `
      <br>
      La ronda anterior dejé de acumular ${statNames.reduce(
        (message, stat) =>
          `${message}${
            !macroCookies?.[stat.abr] && getOldAccumulated(stat.name)
              ? `${stat.abr} `
              : ""
          }`,
        ""
      )}, de modo que esas acumulaciones vuelven a 0.
    `
      : ""
  }
  </div>
<br>
${htmlRadio}
<br>
${htmlCostsSection}
`;
const htmlAccumulate = `
<center><h3>Características a acumular esta ronda (<label><input type="checkbox" id="selectall"><small>Todas</small></input></label>) </h3></center>
  Dejaré de acumular las características que no marque. <br>
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
      <input style="width:75%" type="Number" id="fatigue" name="mod" placeholder="Cansancios usados" value="0">
    </center>
    </div>
  </form>
  <br>
`;
const dialogContent = `
  ${htmlUpkeep}
  ${htmlAccumulate}
`;
/* jQuery */
$(document).ready(function () {
  $("#selectall").click(function () {
    $(".selectedId").prop("checked", this.checked);
  });

  $(".selectedId").change(function () {
    var check =
      $(".selectedId").filter(":checked").length == $(".selectedId").length;
    $("#selectall").prop("checked", check);
  });
});

new Dialog({
  title: `Mantenimiento de ki: ${currentActor.name}`,
  content: dialogContent,
  buttons: {
    applyCostsAndAccum: {
      label: `
      <div style="padding: 0.5rem; line-height: 1.3rem">
        Actualizar acumulaciones y pagar costes
      </div>
      `,
      callback: async (html) => {
        const { selectedCharactesistics, mode, fatigue, upkeepKi, accumBonus } =
          getData(html);

        console.log("mode", mode);
        stayOpen = false;

        saveCookies(html);
        updateAcumulations({
          mode: mode,
          accumCharacteristics: selectedCharactesistics,
          accumBonus: accumBonus,
          fatigueUsed: fatigue,
          upkeepKi: upkeepKi,
        });
      },
    },
    applyCosts: {
      label: "Solo pagar costes",
      callback: (html) => {
        const { upkeepKi } = getData(html);

        // Save only the upkeep costs
        currentActor.update({
          "system.macroCookies.accumulationMacro.upkeep": upkeepKi,
        });

        updateKi(upkeepKi);
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
