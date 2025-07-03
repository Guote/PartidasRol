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

const macroCookies = currentActor.system?.macroCookies?.zeonAccumulation;

const updateModes = {
  fullAccumulate: {
    label: "Acumulación plena",
    name: "fullAccumulate",
  },
  accumulate: {
    label: "Acumulación parcial",
    name: "accumulate",
  },
  stop: {
    label: "No acumular",
    name: "stopAccum",
  },
  wait: {
    label: "Esperar",
    name: "wait",
  },
};

let oldValues = {
  zeon: currentActor.system.mystic.zeon.value,
  accum: currentActor.system.mystic.zeonAccumulated.value,
  fatigue: currentActor.system.characteristics.secondaries.fatigue.value,
};
let zeonACT = currentActor.system.mystic.act.main.final.value;
let zeonBaseTotal = currentActor.system.mystic.zeon.max;

//Check the Acumulation isn't null or it will give errors
if (oldValues.accum == null) {
  oldValues.accum = 0;
}

async function updateAcumulation({
  mode = updateModes.stop.value,
  accumBonus,
  upkeep = 0,
  cast = 0,
  fatigue = 0,
  fatigueAccum,
}) {
  let newValues = {
    zeon: oldValues.zeon,
    accum: oldValues.accum,
    fatigue: oldValues.fatigue,
  };
  if (accumBonus) {
    zeonACT = zeonACT + accumBonus;
  }
  var chatNotification = "<b>" + token.name + "</b>";

  const doExecute = {
    [updateModes.fullAccumulate.name]: () => {
      chatNotification = chatNotification + " acumula de forma plena.";

      //Increase current accumulation
      newValues.accum =
        (cast ? 0 : oldValues.accum) + zeonACT + fatigue * fatigueAccum;
      token.actor.update({
        "system.mystic.zeonAccumulated.value": newValues.accum,
      });
    },
    [updateModes.accumulate.name]: () => {
      chatNotification = chatNotification + " acumula de forma parcial.";

      //Increase current accumulation
      newValues.accum =
        (cast ? 0 : oldValues.accum) +
        Math.floor(zeonACT / 10) * 5 +
        fatigue * fatigueAccum;
      token.actor.update({
        "system.mystic.zeonAccumulated.value": newValues.accum,
      });
    },
    [updateModes.stop.name]: () => {
      chatNotification = chatNotification + " deja de acumular.";
      newValues.accum = 0;
      token.actor.update({
        "system.mystic.zeonAccumulated.value": 0,
      });
    },
  };
  if (mode === updateModes.stop.name) {
    if (game.cub.hasCondition("Usando Zeon", currentActor)) {
      game.cub.removeCondition("Usando Zeon", currentActor);
    }
  } else {
    if (!game.cub.hasCondition("Usando Zeon", currentActor)) {
      game.cub.addCondition("Usando Zeon", currentActor);
    }
  }
  if (doExecute.hasOwnProperty(mode)) {
    doExecute[mode]();
  }

  // Update Zeon
  token.actor.update({
    "system.mystic.oldValues.zeon.value": oldValues.zeon - upkeep - cast,
    "system.characteristics.secondaries.fatigue.value":
      oldValues.fatigue - fatigue,
  });

  chatNotification = `${chatNotification}
  <br><br>
    · Acumulado ronda anterior: <b>${oldValues.accum}</b> <br>
    ${
      cast
        ? `<br>· <small>Lanzó <b>${cast} zeon</b>. Su zeon acumulado vuelve a 0.</small>`
        : ""
    }
    ${
      mode === updateModes.stop.name
        ? `<br>· <small>No acumula</small>`
        : `<br>· <small>Acumulación: +${zeonACT}</small>`
    }
    ${
      mode === updateModes.accumulate.name
        ? `
        <br>· <small> Realizó acciones activas la ronda anterior: -${
          Math.floor(zeonACT / 10) * 5
        }</small>
      `
        : ""
    }
      ${
        upkeep
          ? `<br>· <small>Gasta <b>${upkeep} zeon en mantenimientos</b>.</small>`
          : ""
      }
      ${
        fatigue
          ? `<br>· <small>Usa <b>${fatigue} cansancios</b>: +${
              fatigueAccum * fatigue
            } ACT</small>`
          : ""
      }
      <br><br>
      · Total zeon acumulado: <b>${newValues.accum}</b>
    `;

  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({ token: actor }),
    content: chatNotification,
    whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
  });
}

let styles = `
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

  .radio-toolbar-3 input[type="radio"]:checked+label {
    background-color: #0c5678;
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
${styles}
<center><h3>Costes de Zeon</h3></center>
  <small>
  <b>· Mantenimientos:</b> Pagamos para mantener efectos <b>durante la ronda actual</b>.<br>
  <b>· Lanzamientos:</b> Coste total de hechizos lanzados la <b>ronda anterior</b>. Nuestro total acumulado vuelve a 0, y si queremos volvemos a acumular. <br>
  </small>
  <br>
  <center>
    <div class="flex flex-row">
      <label>
        <small>MANTENIMIENTOS</small>
        <input 
          ${
            macroCookies?.upkeep && macroCookies?.upkeep !== 0
              ? `style="background-color:rgba(120, 46, 34, 0.25);"`
              : ""
          }
          type="Number" id="upkeepZeon" name="upkeep" placeholder="0" 
            value="${macroCookies?.upkeep ?? 0}" autofocus
        >
      </label>
      <label>
      <small>LANZAMIENTOS</small>
        <input type="Number" id="castZeon" 
          name="cast" placeholder="0" 
            value="0" 
        >
      </label>      
    </div>
  </center>
  <br>

  <div>
    <center><h3>Acumulación de Zeon</h3></center>
  </div>
  <div><small>
    <b>· Acumulación Plena:</b> Acumulamos tanto zeon como podemos. Se selecciona si la ronda anterior <b>no</b> hemos realizado ninguna acción activa.<br>
    <b>· Acumulación Parcial:</b> Si la ronda anterior <b>hemos hecho acciones activas o pasivas</b> distintas de acumular o lanzar hechizos, acumulamos perdiendo la mitad de nuestra acumulación por turno.<br>
    <b>· No acumular:</b> Pagamos los costes de zeon que hayamos puesto. Si tenemos zeon acumulado, vuelve a 0.<br>
    
  </small></div>
  <div>
      <center>
      <h2>Zeon acumulado: ${oldValues.accum}</h2>
       Zeon actual: <b>${
         oldValues.zeon
       }</b>, Zeon máximo: <b>${zeonBaseTotal}</b><br>
      </center>
  </div> <br>
  <div class="flexrow flex-center">
      <div class="flexrow">
          <center>
              <h3>ACT Plena</h3> ${zeonACT} <br>
          </center>
      </div>
      <div class="flexrow">
          <center>
              <h3>ACT Parcial</h3> ${Math.round(zeonACT / 2)} <br>
          </center>
      </div>
  </div>

  <br>
  <center>
    <div class="flex flex-row">
      <label>
        <small>CANSANCIOS USADOS</small>
        <input type="Number" id="fatigue" 
          name="fatigue" placeholder="0" 
            value="0" 
        >
      </label> 
      <label>
        <small>BONO POR CANSANCIO</small>
        <input type="Number" id="fatigueAccum" 
          name="fatigueAccum"
          value="${macroCookies?.fatigueAccum ?? "15"}" 
        >
      </label> 
    <label>
      <small>MODIFICADOR ACT</small>
      <input 
        ${
          macroCookies?.accumBonus !== 0
            ? `style="background-color:rgba(120, 46, 34, 0.25);"`
            : ""
        } 
        id="accumBonus" 
        type="number" value="${macroCookies?.accumBonus ?? "0"}" 
      />
    </label>      
    </div>
  </center>

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
  `;
let stayOpen = false;
let d = new Dialog({
  title: `Acumulación de Zeon: ${currentActor.name}`,
  content: dialogContent,
  buttons: {
    confirm: {
      label: "Confirmar",
      callback: (html) => {
        stayOpen = false;
        const accumBonus = Number(html[0].querySelector("#accumBonus").value);
        const mode =
          html[0].querySelector("input[name=mode]:checked")?.value ??
          updateModes.stop.name;
        const fatigue = Number(html[0].querySelector("#fatigue").value);
        const fatigueAccum = Number(
          html[0].querySelector("#fatigueAccum").value
        );
        const upkeep = Number(html[0].querySelector("#upkeepZeon").value);
        const cast = Number(html[0].querySelector("#castZeon").value);

        // Save current selections for the future
        currentActor.update({
          "system.macroCookies.zeonAccumulation.upkeep": upkeep,
          "system.macroCookies.zeonAccumulation.updateMode": mode,
          "system.macroCookies.zeonAccumulation.accumBonus": accumBonus,
          "system.macroCookies.zeonAccumulation.fatigueAccum": fatigueAccum,
        });

        updateAcumulation({
          mode: mode,
          accumBonus: accumBonus,
          upkeep: upkeep,
          cast: cast,
          fatigue: fatigue,
          fatigueAccum: fatigueAccum,
        });
      },
    },
  },
  default: "confirm",
  close: () => {
    if (stayOpen) {
      stayOpen = false;
      d.render(true);
    }
  },
}).render(true);
