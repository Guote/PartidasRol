let raener = game.actors.find((a) => a.name === "Raener");
let raenerPresenciaDoble = raener.system.general.presence.base.value * 2;

let target = _token.actor;
let rf =
  target.system.characteristics.secondaries.resistances.physical.base.value;

let d = new Dialog({
  title: "RF contra Devorador de Existencia (Raener)",
  content: `
      <form class="flexcol">
        <div class="form-group">
          <label for="mod">Modificador a la RF</label>
          <input type="Number" id="modificador" name="mod" placeholder="Modificador total" autofocus>
        </div>
        <div class="form-group">
          <textarea name="comments" placeholder="Comentarios"></textarea>
        </div>
      </form>
    `,
  buttons: {
    no: {
      icon: '<i class="fas fa-times"></i>',
      label: "Cancelar",
    },
    yes: {
      icon: '<i class="fas fa-check"></i>',
      label: "Sí",
      callback: (html) => {
        let mod = html.find('[name="mod"]').val();
        let comments = html.find('[name="comments"]').val();

        console.log(game);
        const roll = new ABFFoundryRoll(`1d100 + ${rf} + ${mod | 0}`);
        roll.roll();
        roll.toMessage({
          flavor: `Devorador de Existencia: RF contra ${raenerPresenciaDoble}`,
        });

        // Mensaje para el GM con info extra
        let resultado = raenerPresenciaDoble - roll._total;
        let damageHP = Math.max(0, Math.floor(resultado / 2));
        let damageKi = Math.floor(damageHP / 5);

        const newLifePoints =
          target.system.characteristics.secondaries.lifePoints.value - damageHP;
        const newKiPoints = Math.min(
          raener.system.domine.kiAccumulation.generic.value + damageKi,
          raener.system.domine.kiAccumulation.generic.max
        );

        target.update({
          system: {
            characteristics: {
              secondaries: { lifePoints: { value: newLifePoints } },
            },
          },
        });
        raener.update({
          system: {
            domine: { kiAccumulation: { generic: { value: newKiPoints } } },
          },
        });

        ChatMessage.create({
          flavor: `
            Resultado: ${resultado} 
            | Vida: ${damageHP} 
            | Ki: ${damageKi} 
            | Daño aplicado sobre ${target.name} 
            ${comments ? "| " + comments : ""}`,
          whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
        });
      },
    },
  },
  default: "yes",
  render: () => $("#modificador").focus(),
}).render(true);