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
  var ATK = parseInt(document.getElementById("ATK").value);
  var DEF = parseInt(document.getElementById("DEF").value);
  var TA = parseInt(document.getElementById("TA").value);
  var BDMG = parseInt(document.getElementById("BDMG").value);

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
        Ataque: <input type="number" id="ATK"/><br />
        Defensa: <input type="number" id="DEF"/><br />
        Tipo de Armadura: <input type="number" id="TA" value="0"/><br />
        Daño base: <input type="number" id="BDMG" value="0" /><br />
    </div>`,
  buttons: {
    aceptar: {
      label: "Aceptar",
      callback: () => onSubmit(),
    },
  },
  render: () => $("#ATK").focus(),
});

d.render(true);
