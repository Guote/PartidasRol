let currentToken, currentActor;

//TODO: Export from guote-module
const getFormula = ({ dice = "1d100xa", values = [], labels = [""] }) => {
  let formula = `${dice}`;

  for (let i = 0; i < values.length; i++) {
    let value = parseInt(values[i]);
    if (value === 0 || isNaN(value)) continue;

    formula = `
        ${formula} ${value > 0 ? "+" : ""}
        ${value}${labels?.[i] ? `[${labels[i]}]` : ""}`;
  }
  console.log("formula", formula);
  return formula;
};

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
  currentToken = currentActor.getActiveTokens()[0];
}

const psych = currentActor.system.psychic;
const macroCookies = currentActor.system?.macroCookies?.potencialPsiquico;
const proyTypes = {
  offensive: {
    name: "offensive",
    label: "Proyección ofensiva",
  },
  defensive: {
    name: "defensive",
    label: "Proyección defensiva",
  },
};

let htmlPowersOptions = "";
psych.psychicPowers?.forEach((power) => {
  htmlPowersOptions = `${htmlPowersOptions}
  <option value="${power.name}" ${
    macroCookies?.powerUsed === power.name ? "selected" : ""
  }>${power.name} (+${power.system.bonus.value})</option>
  `;
});

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
let htmlRadioSection = `
<br>
  <div class="radio-toolbar-3">
    <input 
      type="radio" 
      id="${proyTypes.offensive.name}" 
      name="mode" 
      value="${proyTypes.offensive.name}"
      ${macroCookies?.proyType === proyTypes.offensive.name ? "checked" : ""}
    >
    <label for="${proyTypes.offensive.name}">
      ${proyTypes.offensive.label}
    </label>

    <input 
      type="radio" 
      id="${proyTypes.defensive.name}" 
      name="mode" 
      value="${proyTypes.defensive.name}"
      ${macroCookies?.proyType === proyTypes.defensive.name ? "checked" : ""}
    >
    <label for="${proyTypes.defensive.name}">
    ${proyTypes.defensive.label}
    </label>
  </div>
`;
let dialogContent = `
${htmlStyle}
<center>
  <div class="flex flex-row">
    <label>
      <h4><b>Potencial Psíquico:</b>
      <br> +${psych.psychicPotential.final.value}</h4>
      Bono extra
      <input 
        ${
          macroCookies?.modPot && macroCookies?.modPot !== 0
            ? `style="background-color:rgba(120, 46, 34, 0.25);"`
            : ""
        }
        type="Number" id="modPot" name="modPot" placeholder="0" 
          value="${macroCookies?.modPot ?? 0}" autofocus
      >
    </label>
    <label>
    <h4><b>Proyección Psíquica:</b> 
    <br>+${
      psych.psychicProjection.imbalance.offensive.final.value
    } / +${psych.psychicProjection.imbalance.defensive.final.value}</h4>
    Bono extra
    <input 
    ${
      macroCookies?.modProy && macroCookies?.modProy !== 0
        ? `style="background-color:rgba(120, 46, 34, 0.25);"`
        : ""
    }
    type="Number" id="modProy" name="modProy" placeholder="0" 
      value="${macroCookies?.modProy ?? 0}"
  >
    </label>      
  </div>
</center>
${htmlRadioSection}
<br>
<center>
  <label>
    <small>Poder usado</small>
    <select id="power">
      <option value="0">Indefinido</option>
      ${htmlPowersOptions}
    </select>
  </label>
</center>
<br>
`;

let d = new Dialog({
  title: `Potencial psíquico: ${currentToken.name}`,
  content: dialogContent,
  buttons: {
    confirm: {
      icon: '<i class="fas fa-check"></i>',
      label: "Confirmar",
      callback: (html) => {
        let modPot = Number(html[0].querySelector("#modPot").value) ?? 0;
        let powerUsed = html[0].querySelector("#power").value;
        let powerUsedData = psych.psychicPowers.find(
          (power) => power.name === powerUsed
        )?.system;
        let modPotPower = powerUsedData?.bonus?.value ?? 0;
        let modProy = Number(html[0].querySelector("#modProy").value) ?? 0;
        const mode =
          html[0].querySelector("input[name=mode]:checked")?.value ??
          "ofensiva";

        let formulaPot = getFormula({
          values: [psych.psychicPotential.final.value, modPotPower, modPot],
          labels: ["Pot", "Poder", "Mod"],
        });
        let formulaProy = getFormula({
          values: [
            psych.psychicProjection.imbalance[proyTypes[mode]?.name].final
              .value,
            modProy,
          ],
          labels: ["Proy", "Mod"],
        });

        const rollPot = new ABFFoundryRoll(formulaPot);
        rollPot.roll();
        rollPot.toMessage({
          flavor: `Potencial psíquico: "${powerUsed}"`,
          speaker: ChatMessage.getSpeaker({ token: actor }),
        });
        const rollProy = new ABFFoundryRoll(formulaProy);
        rollProy.roll();
        rollProy.toMessage({
          flavor: `${proyTypes[mode].label}`,
          speaker: ChatMessage.getSpeaker({ token: actor }),
        });

        // Find actual power used and whisp it to gm
        let difficultyMet =
          Math.max(
            ...[0, 20, 40, 80, 120, 140, 180, 240, 280, 320, 440].filter(
              (key) => rollPot.total > key
            )
          ) ?? 0;
        let powerEffect = powerUsedData?.effects?.[difficultyMet]?.value;

        if (powerEffect) {
          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ token: actor }),
            flavor: `Poder usado: ${powerUsed} con potencial ${difficultyMet}`,
            content: `Efecto: ${powerEffect}`,
            whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
          });
        }

        // Register data to macroCookies
        currentActor.update({
          "system.macroCookies.potencialPsiquico.modPot": modPot,
          "system.macroCookies.potencialPsiquico.powerUsed": powerUsed,
          "system.macroCookies.potencialPsiquico.modProy": modProy,
          "system.macroCookies.potencialPsiquico.proyType": mode,
        });
      },
    },
  },
  confirm: "yes",
  render: () => $("#modificador").focus(),
}).render(true);
