/**********************************************************************************
 * Utility Functions and Constants
 **********************************************************************************/
const STAT_NAMES = [
  { name: "agility", abr: "AGI" },
  { name: "constitution", abr: "CON" },
  { name: "dexterity", abr: "DES" },
  { name: "strength", abr: "FUE" },
  { name: "power", abr: "POD" },
  { name: "willPower", abr: "VOL" },
];

const CONDITIONS = {
  USING_KI: "Usando Ki",
};

const DEFAULT_MODE = "noActActions";

/**
 * Fetch the current actor based on the context.
 */
function getCurrentActor() {
  let token, actor;

  if (typeof token !== "undefined") {
    // Scoped in external macro or module
    token = token;
    actor = token.actor;
  } else if (canvas.tokens.controlled?.[0]) {
    token = canvas.tokens.controlled[0];
    actor = token.document.actor;
  } else {
    const defaultActorId = game.users.get(game.userId)._source.character;
    actor = game.actors.get(defaultActorId);
  }

  if (!actor) throw new Error("Selecciona un token");
  console.log({token, actor})
  return { token, actor };
}

/**
 * Retrieve macro cookies from the actor's system data.
 */
function getMacroCookies(actor) {
  return actor.system?.macroCookies?.accumulationMacro || {};
}

/**
 * Fetch accumulation value for a specific stat.
 */
function getAccumulation(actor, stat) {
  return Number(actor.system.domine.kiAccumulation[stat].final.value);
}

/**
 * Fetch old accumulated value for a specific stat.
 */
function getOldAccumulated(actor, stat) {
  return Number(actor.system.domine.kiAccumulation[stat].accumulated.value);
}

/**
 * Fetch old generic accumulated value.
 */
function getOldGenericAccumulated(actor) {
  return Number(
    actor.system.domine.kiAccumulation.generic?.accumulated?.value ?? 0
  );
}

/**
 * Fetch old generic pool value.
 */
function getOldGenericPool(actor) {
  return Number(actor.system.domine.kiAccumulation.generic.value);
}

/**
 * Apply a condition to the actor if not already present.
 */
function applyCondition(actor) {
  if (!game?.cub?.hasCondition(CONDITIONS.USING_KI, actor)) {
    game?.cub?.addCondition(CONDITIONS.USING_KI, actor);
  }
}

/**
 * Update the generic Ki pool.
 */
function updateKi(actor, upkeepKi) {
  if (upkeepKi === 0) return;

  const newValue = getOldGenericPool(actor) - upkeepKi;

  actor.update({
    "system.domine.kiAccumulation.generic.value": newValue,
  });

  applyCondition(actor);
}

/**
 * Generate statInfo with savedCheckbox and lastAccumMod.
 */
function generateStatInfo(macroCookies) {
  return STAT_NAMES.map((stat) => ({
    ...stat,
    savedCheckbox: macroCookies?.[stat.abr],
    lastAccumMod: macroCookies?.mod?.[stat.abr] ?? 0,
  }));
}

/**
 * Generate the current state of accumulations for the chat message.
 */
function generateChatMessage({
  mode,
  initialAccumulation,
  initialGenericAccumulation,
  newValues,
  accumulation,
  upkeepKi,
  fatigueUsed,
  maxKiPool,
}) {
  const messageSections = {
    oldValues: `
      <br>
      Acumulado al inicio de la ronda: <br>
      <small>
        Reserva ${getOldGenericPool(currentActor, actor)}/${maxKiPool}, 
        Acumulado ${initialGenericAccumulation}
      </small>
      <br>
      ${STAT_NAMES.map(
        (stat) => `${stat.abr} ${initialAccumulation[stat.name]}`
      ).join(" ")}
    `,
    upkeep: upkeepKi ? `<br>· Gasta <b>${upkeepKi} ki</b>.` : "",
    fatigue: fatigueUsed ? `<br>· Usa <b>${fatigueUsed} cansancios</b>.` : "",
    accum: accumulation
      ? `<br>· Acumulaciones: <small><small>${STAT_NAMES.map(
          (stat) => `${stat.abr} +${Math.max(0, accumulation[stat.name])}`
        ).join(", ")}. Total +${STAT_NAMES.reduce(
          (sum, stat) => sum + (accumulation[stat.name] || 0),
          0
        )}</small></small>`
      : "",
    someStopped: STAT_NAMES.some(
      (stat) =>
        !accumulation ||
        (!accumulation[stat.name] &&
          getOldAccumulated(currentActor, stat.name) > 0)
    )
      ? `
        <br>· <small>Ha dejado de acumular algunas características:</small> 
        <small><small>
          ${STAT_NAMES.filter(
            (stat) =>
              !accumulation ||
              (!accumulation[stat.name] &&
                getOldAccumulated(currentActor, stat.name) > 0)
          )
            .map((stat) => `${stat.abr} -${initialAccumulation[stat.name]}`)
            .join(" ")}
          , Total -${STAT_NAMES.filter(
            (stat) =>
              !accumulation ||
              (!accumulation[stat.name] &&
                getOldAccumulated(currentActor, stat.name) > 0)
          ).reduce(
            (sum, stat) => sum + getOldAccumulated(currentActor, stat.name),
            0
          )}
        </small></small>
      `
      : "",
    newValues: `
      <br>Acumulado ronda actual: <br>
      <small>
        Reserva ${newValues.generic}/${maxKiPool},
        Acumulado ${newValues.genericAccumulated}
      </small>
      <br>
      ${STAT_NAMES.map(
        (stat) =>
          `${newValues[stat.name] > 0 ? "<b>" : ""} ${stat.abr} ${
            newValues[stat.name]
          } ${newValues[stat.name] > 0 ? "</b>" : ""}`
      ).join("<br>")}
    `,
    endOfRound: `
      <small>
        <br><br>Cuando finalize la ronda, si realizo acciones activas:<br>
        ${STAT_NAMES.map(
          (stat) => `
          ${newValues[stat.name] > 0 ? "<b>" : ""} 
          ${stat.abr} ${
            accumCharacteristics.includes(stat.name)
              ? Math.max(
                  1,
                  newValues[stat.name] -
                    Math.floor(getAccumulation(currentActor, stat.name) / 2)
                )
              : newValues[stat.name]
          }
          ${newValues[stat.name] > 0 ? "</b>" : ""}
        `
        ).join("<br>")}
      </small>
    `,
  };

  return `
    <b>${updateModes[mode].label}</b> la ronda anterior<br>
    ${Object.values(messageSections).join("")}
  `;
}

/**
 * Send a message to the chat with the provided content.
 */
async function sendChatMessage({ content }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({
      token: currentToken,
      actor: currentActor,
    }),
    content: content,
    whisper: game.users.filter((u) => u.isGM).map((u) => u.id),
  });
}

/**********************************************************************************
 * Initialization
 **********************************************************************************/

const { token: currentToken, actor: currentActor } = getCurrentActor();
const macroCookies = getMacroCookies(currentActor);
const statInfo = generateStatInfo(macroCookies);
const maxKiPool = currentActor.system.domine.kiAccumulation.generic.max;

/**********************************************************************************
 * Accumulation Management
 **********************************************************************************/

const updateModes = {
  noActActions: {
    name: "noActActions",
    label: "No he hecho acciones activas",
    info: (statInfo, getOldAccumulated) =>
      statInfo
        .map(
          (stat) =>
            `${stat.abr} ${
              getOldAccumulated(stat.name)
                ? `<b>${getOldAccumulated(stat.name)}</b>`
                : 0
            }`
        )
        .join("<br>"),
  },
  withActActions: {
    name: "withActActions",
    label: "He hecho acciones activas",
    info: (statInfo, getAccumulation, getOldAccumulated, macroCookies) =>
      statInfo
        .map((stat) => {
          const value =
            macroCookies?.[stat.abr] && getOldAccumulated(stat.name)
              ? Math.max(
                  1,
                  getOldAccumulated(stat.name) -
                    Math.floor(getAccumulation(stat.name) / 2)
                )
              : 0;
          return `${stat.abr} ${value ? `<b>${value}</b>` : 0}`;
        })
        .join("<br>"),
  },
  castedTech: {
    name: "castedTech",
    label: "He lanzado alguna técnica",
    info: () => STAT_NAMES.map((stat) => `${stat.abr} 0`).join("<br>"),
  },
};

/**
 * Update accumulations based on the selected mode and inputs.
 */
async function updateAccumulations({
  actor,
  mode = DEFAULT_MODE,
  accumCharacteristics = [],
  accumBonus = {},
  upkeepKi = 0,
  fatigueUsed = 0,
}) {
  if (!updateModes[mode])
    throw new Error("Error obteniendo la acumulación inicial");

  // Initial definitions
  const oldValues = {
    ...STAT_NAMES.reduce(
      (obj, stat) => ({
        ...obj,
        [stat.name]: getOldAccumulated(actor, stat.name),
      }),
      {}
    ),
    genericAccumulated: getOldGenericAccumulated(actor),
    fatigue: actor.system.characteristics.secondaries.fatigue.value,
  };

  // Get initial accumulation for this round
  const initialAccumulation = STAT_NAMES.reduce((acc, stat) => {
    acc[stat.name] =
      mode === updateModes.noActActions.name
        ? macroCookies?.[stat.abr]
          ? getOldAccumulated(actor, stat.name)
          : 0
        : mode === updateModes.withActActions.name
        ? macroCookies?.[stat.abr] && getOldAccumulated(actor, stat.name)
          ? Math.max(
              1,
              getOldAccumulated(actor, stat.name) -
                Math.floor(getAccumulation(actor, stat.name) / 2)
            )
          : 0
        : 0; // castedTech or others
    return acc;
  }, {});

  const initialGenericAccumulation = Object.values(initialAccumulation).reduce(
    (sum, val) => sum + val,
    0
  );

  console.log("initialAccumulation", initialAccumulation);

  // Increase accumulation for this round
  const accumulation = STAT_NAMES.reduce((acc, stat) => {
    acc[stat.name] = accumCharacteristics.includes(stat.name)
      ? getAccumulation(actor, stat.name) +
        (accumBonus[stat.name] || 0) +
        fatigueUsed
      : -getOldAccumulated(actor, stat.name);
    return acc;
  }, {});

  const newValues = {
    ...oldValues,
    fatigue: oldValues.fatigue - fatigueUsed,
    generic: getOldGenericPool(actor) - upkeepKi,
    genericAccumulated: initialGenericAccumulation,
  };

  STAT_NAMES.forEach((stat) => {
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
  updateKi(actor, upkeepKi);
  await actor.update({
    "system.characteristics.secondaries.fatigue.value": newValues.fatigue,
    "system.domine.kiAccumulation.generic.accumulated.value":
      newValues.genericAccumulated,
  });

  const updatePromises = STAT_NAMES.map((stat) =>
    actor.update({
      [`system.domine.kiAccumulation.${stat.name}.accumulated.value`]:
        newValues[stat.name],
    })
  );
  await Promise.all(updatePromises);

  // Generate and send chat message
  const chatContent = generateChatMessage({
    mode,
    initialAccumulation,
    initialGenericAccumulation,
    newValues,
    accumulation,
    upkeepKi,
    fatigueUsed,
    maxKiPool,
  });

  await sendChatMessage({ content: chatContent });
}

/**********************************************************************************
 * Dialog Rendering
 **********************************************************************************/

/**
 * Generate HTML for a single stat column.
 */
function getDialogColumn(stat) {
  const currentStat = statInfo.find((s) => s.abr === stat);
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
          <br>+${getAccumulation(currentActor, currentStat.name)}
          <br>
          <small>Extra mod.</small>
        </label>
        <input 
          style="${
            currentStat.lastAccumMod !== 0
              ? "background-color:rgba(120, 46, 34, 0.25);"
              : ""
          }" 
          id="accumMod-${currentStat.abr}" 
          type="number" 
          value="${currentStat.lastAccumMod}" 
        />
      </center>
      <br>
    </div>
  `;
}

/**
 * Generate the entire dialog HTML content.
 */
function generateDialogContent() {
  const htmlStyle = `
    <style>
      .radio-toolbar-3 {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.19);
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
        padding: 0.5rem 0.2rem;
        font-size: 1rem;
        text-align: center;
        cursor: pointer;
      }
      .radio-toolbar-3 label:hover {
        background-color: #B4B4B4;
        font-weight: 1000;
      }
      .radio-toolbar-3 input[type="radio"] {
        position: fixed;
        opacity: 0;
        pointer-events: none;
      }
      .radio-toolbar-3 input[type="radio"]:checked + label {
        background-color: #782e22;
        color: white;
      }
      .radio-toolbar-3 input[type="radio"]:checked + label + p {
        position: absolute;
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        text-align: center;
        top: 8rem;
        display: block;
      }
      .radio-toolbar-3 p {
        display: none;
      }
    </style>
  `;

  const htmlRadio = `
    ${htmlStyle}
    <div class="radio-toolbar-3">
      ${Object.values(updateModes)
        .map(
          (mode) => `
        <input 
          type="radio" 
          id="${mode.name}" 
          name="mode" 
          value="${mode.name}"
          ${
            macroCookies.updateMode === mode.name
              ? "checked"
              : mode.name === DEFAULT_MODE
              ? "checked"
              : ""
          }
        >
        <label for="${mode.name}">
          ${mode.label}
        </label>
        <p>${mode.info(
          statInfo,
          getAccumulation,
          getOldAccumulated,
          macroCookies
        )}</p>
      `
        )
        .join("")}
    </div>
  `;

  const htmlCostsSection = `
    <center>
      <label>
        Costes de ki (mantenimientos u otros)
        <input 
          style="width:75%;${
            macroCookies.upkeep && macroCookies.upkeep !== 0
              ? "background-color:rgba(120, 46, 34, 0.25);"
              : ""
          }"
          type="number" id="upkeepKi" name="mod" placeholder="0" 
          value="${macroCookies.upkeep ?? 0}" autofocus
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
        STAT_NAMES.some(
          (stat) =>
            !macroCookies?.[stat.abr] &&
            getOldAccumulated(currentActor, stat.name)
        )
          ? `
          <br>
          La ronda anterior dejé de acumular ${STAT_NAMES.filter(
            (stat) =>
              !macroCookies?.[stat.abr] &&
              getOldAccumulated(currentActor, stat.name)
          )
            .map((stat) => stat.abr)
            .join(", ")}, de modo que esas acumulaciones vuelven a 0.
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
      ${STAT_NAMES.map((stat) => getDialogColumn(stat.abr)).join("")}
    </div>
    <form class="flexcol">
      <div class="form-group">
        <center>
          <label for="fatigue">Cansancios usados</label>
          <input style="width:75%" type="number" id="fatigue" name="mod" placeholder="Cansancios usados" value="0">
        </center>
      </div>
    </form>
    <br>
  `;

  return `
    ${htmlUpkeep}
    ${htmlAccumulate}
  `;
}

/**********************************************************************************
 * Event Handlers
 **********************************************************************************/

/**
 * Handle the "Select All" checkbox functionality.
 */
function setupSelectAll() {
  document.getElementById("selectall").addEventListener("click", function () {
    const checked = this.checked;
    document
      .querySelectorAll(".selectedId")
      .forEach((el) => (el.checked = checked));
  });

  document.querySelectorAll(".selectedId").forEach((el) => {
    el.addEventListener("change", function () {
      const allChecked = Array.from(
        document.querySelectorAll(".selectedId")
      ).every((cb) => cb.checked);
      document.getElementById("selectall").checked = allChecked;
    });
  });
}

/**********************************************************************************
 * Main Execution
 **********************************************************************************/

new Dialog({
  title: `Mantenimiento de ki: ${currentActor.name}`,
  content: generateDialogContent(),
  buttons: {
    applyCostsAndAccum: {
      label: `
        <div style="padding: 0.5rem; line-height: 1.3rem">
          Actualizar acumulaciones y pagar costes
        </div>
      `,
      callback: async (html) => {
        const selectedCharacteristics = Array.from(html.find(".selectedId"))
          .filter((cb) => cb.checked)
          .map((cb) => statInfo.find((stat) => stat.abr === cb.id).name);

        const mode =
          html.find('input[name="mode"]:checked').val() || DEFAULT_MODE;
        const fatigue = Number(html.find("#fatigue").val()) || 0;
        const upkeepKi = Number(html.find("#upkeepKi").val()) || 0;

        const accumBonus = {};
        statInfo.forEach((stat) => {
          const value = Number(html.find(`#accumMod-${stat.abr}`).val()) || 0;
          accumBonus[stat.name] = value;
        });

        // Save current selections for the future
        await currentActor.update({
          "system.macroCookies.accumulationMacro.upkeep": upkeepKi,
          "system.macroCookies.accumulationMacro.updateMode": mode,
          ...statInfo.reduce(
            (acc, stat) => ({
              ...acc,
              [`system.macroCookies.accumulationMacro.${stat.abr}`]:
                selectedCharacteristics.includes(stat.name),
              [`system.macroCookies.accumulationMacro.mod.${stat.abr}`]:
                accumBonus[stat.name],
            }),
            {}
          ),
        });

        await updateAccumulations({
          actor: currentActor,
          mode,
          accumCharacteristics: selectedCharacteristics,
          accumBonus,
          upkeepKi,
          fatigueUsed: fatigue,
        });
      },
    },
    applyCosts: {
      label: "Solo pagar costes",
      callback: async (html) => {
        const upkeepKi = Number(html.find("#upkeepKi").val()) || 0;

        // Save only the upkeep costs
        await currentActor.update({
          "system.macroCookies.accumulationMacro.upkeep": upkeepKi,
        });

        // Update Ki pool
        updateKi(currentActor, upkeepKi);

        // Generate and send chat message for applying only costs
        const messageContent = `
          <b>Solo pagar costes</b> ha sido realizado.<br>
          <br>
          · Gasta <b>${upkeepKi} ki</b>.
        `;

        await sendChatMessage({ content: messageContent });
      },
    },
  },
  default: "applyCostsAndAccum",
  render: (html) => {
    setupSelectAll();
  },
  close: () => {},
}).render(true);
