if (!_token) throw new Error("Selecciona un token");

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

const target = currentActor;

const macroCookies = target.system?.macroCookies?.enLlamas;
const isAccumulation = target.system.general.settings.defenseType.value !== "";
const targetMaxAgiDes = Math.max(
  ...[
    target.system.characteristics.primaries.agility.value,
    target.system.characteristics.primaries.dexterity.value,
  ]
);
const calTA = target.system.combat.totalArmor.at.heat.value;

const getFormula = ({ dice = "1d100xa", values = [], labels = [""] }) => {
  let formula = `${dice}`;

  for (let i = 0; i < values.length; i++) {
    let value = parseInt(values[i]);
    if (value === 0) continue;

    formula = `
        ${formula} ${value > 0 ? "+" : ""}
        ${value}${labels?.[i] ? `[ ${labels[i]} ]` : ""}`;
  }
  return formula;
};

const enLlamasLevels = {
  0: {
    label: "Normal",
    damage: 0,
    increaseperTurn: 0,
    description: "Sin daño",
  },
  100: {
    label: "Prendido",
    damage: 0,
    increaseperTurn: 10,
    description: "Sin daño",
  },
  180: {
    label: "Ardiendo",
    damage: 10,
    reducedByArmor: "all",
    increaseperTurn: 10,
    description: "10 de daño por turno (·5 si es de acumulación)",
  },
  240: {
    label: "En llamas",
    damage: 25,
    reducedByArmor: "all",
    increaseperTurn: 10,
    description: "25 de daño por turno (·5 si es de acumulación)",
  },
  300: {
    label: "Calcinado",
    damage: 50,
    reducedByArmor: "natural",
    increaseperTurn: 10,
    description: "50 de daño por turno (·5 si es de acumulación)",
  },
};
const getStateFromValue = (value = 0) => {
  let currentStateKey =
    Math.max(...Object.keys(enLlamasLevels).filter((key) => value > key)) ?? 0;
  return enLlamasLevels[currentStateKey] ?? enLlamasLevels["0"];
};
const reactions = {
  attack: { name: "attack", label: "Ataque recibido" },
  putOut: { name: "putOut", label: "Tratar de apagarse" },
  nothing: { name: "nothing", label: "No hacer nada" },
};

const styles = `
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
const radioSection = `
<div class="radio-toolbar-3">
<input 
  type="radio" 
  id="${reactions.attack.name}" 
  name="mode" 
  value="${reactions.attack.name}"
  ${macroCookies?.reaction === reactions.attack.name ? "checked" : ""}
>
<label for="${reactions.attack.name}">
  ${reactions.attack.label}
</label>

<input 
  type="radio" 
  id="${reactions.putOut.name}" 
  name="mode" 
  value="${reactions.putOut.name}"
  ${macroCookies?.reaction === reactions.putOut.name ? "checked" : ""}
>
<label for="${reactions.putOut.name}">
  ${reactions.putOut.label}
</label>

<input 
  type="radio" 
  id="${reactions.nothing.name}" 
  name="mode" 
  value="${reactions.nothing.name}"
  ${macroCookies?.reaction === reactions.nothing.name ? "checked" : ""}
>
<label for="${reactions.nothing.name}">
  ${reactions.nothing.label}
</label>
</div>
<br> 
`;
const dialogContent = `
${styles}
  <center><h3>En Llamas. Contador actual : ${
    macroCookies?.value ?? 0
  }</h3></center>
  <b>· ${
    reactions.attack.label
  }:</b><small> Se tira 1d100 + daño recibido + modificadores (+10-40 por ropas inflamables, hasta -60 por armaduas resistentes, -20 por cada Intensidad a la que seas inmune...)</small>.<br>
  <b>·  ${
    reactions.putOut.label
  }:</b> <small> Usar 1 acción activa para rodar o algo similar. Reduce el contador en 1d10 +
    ${targetMaxAgiDes} (Destreza o Agilidad, lo que sea mayor)
    , o más segun la situación.</small><br>
  <b>·  ${
    reactions.nothing.label
  }:</b> <small>Si estás en llamas, el contador sube 10 por turno.</small>  <br>
  <br>

    <form class="flexcol">
      <div class="form-group">
      <center>
        <label>Modificador a la tirada
          <input type="Number" id="mod" name="mod" placeholder="Modificador a la tirada" autofocus>
        </label>
      </center>
      <center>
        <label>Daño recibido
          <input type="Number" id="attackDamage" name="attackDamage" placeholder="Daño sufrido" autofocus>
        </label>
      </center>
      </div>
      <div class="form-group">
        <textarea name="comments" placeholder="Comentarios"></textarea>
      </div>
    </form>
  <br>
`;

const applyDamage = () => {
  // Calculate Damage
  const currentState = getStateFromValue(macroCookies?.value ?? 0);

  let damagePerTurn = isAccumulation
    ? currentState?.damage * 5 - calTA * 5
    : currentState?.damage - calTA * 2;
  damagePerTurn = Math.max(0, damagePerTurn);
  const newLifePoints = Math.max(
    0,
    target.system.characteristics.secondaries.lifePoints.value - damagePerTurn
  );

  target.update({
    "system.characteristics.secondaries.lifePoints.value": newLifePoints,
  });

  return damagePerTurn;
};

const applyReaction = ({ html, inFlamesDamage, reactionName }) => {
  // Get data from html and define variables
  let oldValue = macroCookies?.value ?? 0;
  const oldState = getStateFromValue(oldValue);
  let newValue;
  const mod = Number(html[0].querySelector("#mod").value) ?? 0;
  const damage = Number(html[0].querySelector("#attackDamage").value) ?? 0;
  const comments = html.find('[id="comments"]').val() ?? "";

  const damageFormula = getFormula({
    dice: "1d100",
    values: [macroCookies?.value ?? 0, damage, mod],
    labels: ["Valor previo", "Daño", "Mod"],
  });
  const accumulationDamageFormula = `${
    macroCookies?.value ?? 0
  }[Valor previo] + (${getFormula({
    dice: "1d100",
    values: [damage, mod],
    labels: ["Daño", "Mod"],
  })})/5`;
  const actionCases = {
    [reactions.attack.name]: () => {
      const roll = new ABFFoundryRoll(
        `${isAccumulation ? `${accumulationDamageFormula}` : damageFormula}`
      );
      roll.roll();
      newValue = Math.max(0, roll._total);

      roll.toMessage({
        flavor: `En llamas: ${reactions?.[reactionName]?.label}.`,
        content: `${comments ? `<br>${comments}` : ""}`,
      });
    },
    [reactions.putOut.name]: () => {
      const roll = new ABFFoundryRoll(
        getFormula({
          dice: "-1d10",
          values: [-targetMaxAgiDes, macroCookies?.value ?? 0, mod],
          labels: ["Agi/Des", "Valor previo", "Mod"],
        })
      );
      roll.roll();
      newValue = Math.max(0, roll._total);
      roll.toMessage({
        flavor: `En llamas: ${reactions?.[reactionName]?.label}.`,
        content: `${comments ? `<br>${comments}` : ""}`,
      });
    },
    [reactions.nothing.name]: () => {
      const roll = new ABFFoundryRoll(
        getFormula({
          dice: "0",
          values: [macroCookies?.value ?? 0, 10, mod],
          labels: ["valor previo", "Inacción", "Mod"],
        })
      );
      roll.roll();
      newValue = Math.max(0, roll._total);
      roll.toMessage({
        flavor: `En llamas: ${reactions[reactionName].label}.`,
        content: `${comments ? `<br>${comments}` : ""}`,
      });
    },
  };

  // Apply condition
  newValue = Math.max(0, newValue);
  actionCases[reactionName]();
  if (newValue >= 100) {
    game.cub.addCondition("En Llamas", target);
  } else {
    game.cub.hasCondition("En Llamas", target) &&
      game.cub.removeCondition("En Llamas", target);
  }

  // New "En Llamas" state
  let newState = getStateFromValue(newValue);

  // Guardamos el resultado, para que lo use el hook de guote-module en las rondas posteriores
  target.update({
    "system.macroCookies.enLlamas.value": newValue,
  });

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token: actor }),
    flavor: `En llamas: ${target.name}`,
    content: `
      Estado anterior: ${macroCookies?.value ?? 0} <small>(${
      oldState?.label
    })</small><br>
      ${inFlamesDamage ? `<b>Daño recibido: ${inFlamesDamage} </b><br>` : ""}
      Estado actual: <small>${newValue} (${newState?.label}, ${
      newState.description
    })</small> <br>
    ${comments ? `<br>${comments}` : ""}`,
    whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
  });
};

let d = new Dialog({
  title: `En llamas: ${currentToken.name || target.name}`,
  content: dialogContent,
  buttons: {
    attack: {
      icon: "",
      label: `${reactions.attack?.label}`,
      callback: (html) => {
        const damageSuffered = applyDamage();
        applyReaction({
          html: html,
          reactionName: reactions.attack.name,
          damage: damageSuffered,
        });
      },
    },
    putOut: {
      icon: "",
      label: `<small>${reactions.putOut?.label}</small>`,
      callback: (html) => {
        const damageSuffered = applyDamage();
        applyReaction({
          html: html,
          reactionName: reactions.putOut.name,
          inFlamesDamage: damageSuffered,
        });
      },
    },
    nothing: {
      icon: "",
      label: `${reactions.nothing?.label}`,
      callback: (html) => {
        const damageSuffered = applyDamage();
        applyReaction({
          html: html,
          reactionName: reactions.nothing.name,
          inFlamesDamage: damageSuffered,
        });
      },
    },
  },
  default: "nothing",
  render: () => $("#modificador").focus(),
}).render(true);
