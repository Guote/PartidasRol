const Templates = {
  Dialog: {
    ModDialog: "systems/animabf-guote/templates/dialog/mod-dialog.html",
    DamageCalculator: "systems/animabf-guote/templates/dialog/damage-calculator.hbs",
    newPreparedSpell: "systems/animabf-guote/templates/dialog/new-prepared-spell.hbs",
    newSupernaturalShield: {
      main: "systems/animabf-guote/templates/dialog/new-supernatural-shield/new-supernatural-shield.hbs",
      parts: {
        mystic: "systems/animabf-guote/templates/dialog/new-supernatural-shield/parts/new-mystic-shield.hbs",
        psychic: "systems/animabf-guote/templates/dialog/new-supernatural-shield/parts/new-psychic-shield.hbs"
      }
    },
    newActVia: "systems/animabf-guote/templates/dialog/new-act-via.hbs",
    newPsychicDiscipline: "systems/animabf-guote/templates/dialog/new-psychic-discipline.hbs",
    newMentalPattern: "systems/animabf-guote/templates/dialog/new-mental-pattern.hbs",
    Combat: {
      CombatAttackDialog: {
        main: "systems/animabf-guote/templates/dialog/combat/combat-attack/combat-attack-dialog.hbs",
        parts: {
          combat: "systems/animabf-guote/templates/dialog/combat/combat-attack/parts/combat.hbs",
          mystic: "systems/animabf-guote/templates/dialog/combat/combat-attack/parts/mystic.hbs",
          psychic: "systems/animabf-guote/templates/dialog/combat/combat-attack/parts/psychic.hbs"
        }
      },
      CombatDefenseDialog: {
        main: "systems/animabf-guote/templates/dialog/combat/combat-defense/combat-defense-dialog.hbs",
        parts: {
          combat: "systems/animabf-guote/templates/dialog/combat/combat-defense/parts/combat.hbs",
          damageResistance: "systems/animabf-guote/templates/dialog/combat/combat-defense/parts/damage-resistance.hbs",
          mystic: "systems/animabf-guote/templates/dialog/combat/combat-defense/parts/mystic.hbs",
          psychic: "systems/animabf-guote/templates/dialog/combat/combat-defense/parts/psychic.hbs"
        }
      },
      CombatRequestDialog: "systems/animabf-guote/templates/dialog/combat/combat-request-dialog.hbs",
      GMCombatDialog: "systems/animabf-guote/templates/dialog/combat/gm-combat-dialog.hbs"
    },
    GenericDialog: "systems/animabf-guote/templates/dialog/generic-dialog/generic-dialog.hbs",
    Icons: {
      Accept: "systems/animabf-guote/templates/dialog/parts/check-icon.hbs",
      Cancel: "systems/animabf-guote/templates/dialog/parts/cancel-icon.hbs"
    }
  },
  CustomHotBar: "systems/animabf-guote/templates/custom-hotbar/custom-hotbar.hbs",
  Chat: {
    CombatResult: "systems/animabf-guote/templates/chat/combat-result.hbs"
  },
  Svelte: {
    SvelteApp: "systems/animabf-guote/templates/svelte/svelte-application.html",
    SvelteFormApp: "systems/animabf-guote/templates/svelte/svelte-form-application.html"
  }
};
export {
  Templates
};
