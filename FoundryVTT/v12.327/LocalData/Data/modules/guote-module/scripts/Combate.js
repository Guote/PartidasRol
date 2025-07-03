let currentToken, currentActor;

if (typeof token !== "undefined") {
  // Scope defined in external macro or module
  currentToken = token;
  currentActor = token.actor;
} else if (canvas.tokens.controlled?.[0]) {
  currentToken = canvas.tokens.controlled[0];
  currentActor = currentToken.actor;
} else if (canvas.tokens.documentCollection.contents?.[0]) {
  currentToken = canvas.tokens.documentCollection.contents[0];
  currentActor = currentToken.actor;
} else {
  currentActor = game.actors.find((actor) => actor.name === "Abel");
}

let macroCookies = currentActor?.system?.macroCookies?.combat ?? {};

function round5(x) {
  return Math.round(x / 5) * 5;
}

function cuenta(ATK, DEF, TA, BDMG) {
  if (DEF > ATK) {
    return (DEF - ATK) / 2;
  }
  return (BDMG * (ATK - (DEF + TA * 10))) / 100;
}

function onSubmit() {
  var ATK = parseInt(document.getElementById("ATK").value) ?? 0;
  var DEF = parseInt(document.getElementById("DEF").value) ?? 0;
  var TA = parseInt(document.getElementById("TA").value) ?? 0;
  var BDMG = parseInt(document.getElementById("BDMG").value) ?? 0;

  // Save to some local storage
  currentActor.update({
    "system.macroCookies.combat": {
      ATK: ATK,
      DEF: DEF,
      TA: TA,
      BDMG: BDMG,
    },
  });

  let final =
    "<div>HA: " +
    ATK +
    ", HD: " +
    DEF +
    ", TA: " +
    TA +
    ", Daño Base: " +
    BDMG +
    "</div>";
  if (DEF > ATK) {
    final =
      final +
      '<h2>Bono al contraataque: <span style="color:#ff1515">' +
      round5(cuenta(ATK, DEF, TA, BDMG)) +
      "</span></h2>";
  } else {
    final =
      final +
      '<h2>Daño final: <span style="color:#ff1515">' +
      round5(cuenta(ATK, DEF, TA, BDMG)) +
      "</span></h2>";
  }

  ChatMessage.create({
    content: final,
    whisper: game.collections
      .get("User")
      .filter((u) => u.isGM)
      .map((u) => game.data.userId),
  });
}

let d = new Dialog({
  title: "Calcular daño final",
  content: `
    <div> 
        Ataque: <input type="number" id="ATK" value="${
          macroCookies?.ATK ?? ""
        }"/><br />
        Daño base: <input type="number" id="BDMG" value="${
          macroCookies?.BDMG ?? 0
        }" /><br />
        <br />
        Defensa: <input type="number" id="DEF" value="${
          macroCookies?.DEF ?? ""
        }"/><br />
        Tipo de Armadura: <input type="number" id="TA" value="${
          macroCookies?.TA ?? 0
        }"/><br />
    </div>`,
  buttons: {
    aceptar: {
      label: "Aceptar",
      callback: () => onSubmit(),
    },
  },
  render: () => $("#DEF").focus(),
});

d.render(true);
