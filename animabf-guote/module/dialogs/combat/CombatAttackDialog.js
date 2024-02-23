import { Templates } from "../../utils/constants.js";
import {
  NoneWeaponCritic,
  WeaponCritic,
} from "../../types/combat/WeaponItemConfig.js";
import ABFFoundryRoll from "../../rolls/ABFFoundryRoll.js";
import { ABFSettingsKeys } from "../../../utils/registerSettings.js";
import { ABFConfig } from "../../ABFConfig.js";
import { getMassAttackBonus } from "../../combat/utils/getMassAttackBonus.js";
import { getFormula } from "../../rolls/utils/getFormula.js";
import { getPsychichPowerEffect } from "../../combat/utils/getPsychichPowerEffect.js";

const getInitialData = (attacker, defender, options = {}) => {
  const showRollByDefault = !!game.settings.get(
    "animabf-guote",
    ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT
  );
  const isGM = !!game.user?.isGM;
  const attackerActor = attacker.actor;
  const defenderActor = defender.actor;
  const macroCookies = attackerActor.system?.macroCookies?.combatAttackDialog;
  const initialData = {
    ui: {
      isGM,
      hasFatiguePoints:
        attackerActor.system.characteristics.secondaries.fatigue.value > 0,
      weaponHasSecondaryCritic: undefined,
    },
    attacker: {
      token: attacker,
      actor: attackerActor,
      showRoll: !isGM || showRollByDefault,
      withoutRoll: false,
      counterAttackBonus: options.counterAttackBonus,
      isAttackAccumulation: false,
      attackAccumulation: 0,
      combat: {
        fatigueUsed: 0,
        modifier: macroCookies?.combat?.modifier ?? 0,
        unarmed: macroCookies?.combat?.unarmed ?? false,
        weaponUsed: macroCookies?.combat?.weaponUsed ?? undefined,
        criticSelected: macroCookies?.combat?.criticSelected ?? undefined,
        weapon: macroCookies?.combat?.weapon ?? undefined,
        damage: {
          special: macroCookies?.combat?.damage?.special ?? 0,
          final: macroCookies?.combat?.damage?.final ?? 0,
        },
        ignoredTA: macroCookies?.combat?.ignoredTA ?? 0,
      },
      mystic: {
        modifier: macroCookies?.mystic?.modifier ?? 0,
        magicProjectionType:
          macroCookies?.mystic?.magicProjectionType ?? "normal",
        spellUsed: macroCookies?.mystic?.spellUsed ?? undefined,
        spellGrade: macroCookies?.mystic?.spellGrade ?? "base",
        critic: macroCookies?.mystic?.critic ?? NoneWeaponCritic.NONE,
        damage: macroCookies?.mystic?.damage ?? 0,
        ignoredTA: macroCookies?.mystic?.ignoredTA ?? 0,
      },
      psychic: {
        modifier: macroCookies?.psychic?.modifier ?? 0,
        psychicProjection:
          attackerActor.system.psychic.psychicProjection.imbalance.offensive
            .final.value,
        psychicPotential: {
          special: macroCookies?.psychic?.psychicPotential?.special ?? 0,
          final: attackerActor.system.psychic.psychicPotential.final.value,
        },
        powerUsed: macroCookies?.psychic?.powerUsed ?? undefined,
        critic: macroCookies?.psychic?.critic ?? NoneWeaponCritic.NONE,
        damage: macroCookies?.psychic?.damage ?? 0,
        ignoredTA: macroCookies?.psychic?.ignoredTA ?? 0,
      },
    },
    defender: {
      token: defender,
      actor: defenderActor,
    },
    attackSent: false,
    allowed: false,
    config: ABFConfig,
    initialTab: macroCookies?.initialTab ?? "combat",
  };
  console.log(
    "initialData",
    initialData.attacker,
    initialData.attacker.combat, // {... weapon: { name: "2" ...}}
    initialData.attacker.combat.weapon // { name: "asdasd" ...}
  );
  return initialData;
};
export class CombatAttackDialog extends FormApplication {
  constructor(attacker, defender, hooks, options = {}) {
    super(getInitialData(attacker, defender, options));
    this.modalData = getInitialData(attacker, defender, options);
    const { weapons } = this.attackerActor.system.combat;
    if (weapons.length === 0) {
      this.modalData.attacker.combat.unarmed = true;
    }
    this.modalData.allowed = game.user?.isGM || (options.allowed ?? false);
    this.hooks = hooks;
    this.render(true);
  }

  static get defaultOptions() {
    console.log("initialtab");
    return mergeObject(super.defaultOptions, {
      classes: ["abf-dialog combat-attack-dialog no-close"],
      submitOnChange: true,
      closeOnSubmit: false,
      width: null,
      height: null,
      resizable: true,
      template: Templates.Dialog.Combat.CombatAttackDialog.main,
      title: game.i18n.localize("macros.combat.dialog.modal.attack.title"),
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "combat",
        },
      ],
    });
  }
  get attackerActor() {
    return this.modalData.attacker.token.actor;
  }
  updatePermissions(allowed) {
    this.modalData.allowed = allowed;
    this.render();
  }
  async close(options) {
    if (options?.force) {
      return super.close(options);
    }
    // eslint-disable-next-line no-useless-return,consistent-return
    return;
  }
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".send-attack").click(() => {
      const {
        weapon,
        criticSelected,
        modifier,
        fatigueUsed,
        damage,
        weaponUsed,
        unarmed,
        ignoredTA,
      } = this.modalData.attacker.combat;

      const { isAttackAccumulation, attackAccumulation } =
        this.modalData.attacker;
      if (typeof damage !== "undefined") {
        const attack = weapon
          ? weapon.system.attack.final.value
          : this.attackerActor.system.combat.attack.final.value;
        const counterAttackBonus =
          this.modalData.attacker.counterAttackBonus ?? 0;
        let rollModifiers = [
          attack,
          getMassAttackBonus(attackAccumulation),
          counterAttackBonus,
          fatigueUsed * 15,
          modifier,
        ];
        let formula = getFormula({
          dice: isAttackAccumulation ? "2d100khxa" : "1d100xa",
          values: rollModifiers,
          labels: [
            "HA",
            `${attackAccumulation} at. en masa`,
            "Contraataque",
            "Cansancio",
            "Mod",
          ],
        });
        if (this.modalData.attacker.withoutRoll) {
          // Remove the dice from the formula
          formula = formula.replace("1d100xa", "0");
          formula = formula.replace("2d100khxa", "0");
        }
        if (this.attackerActor.system.combat.attack.base.value >= 200) {
          // Mastery reduces the fumble range
          formula = formula.replace("xa", "xamastery");
        }
        const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
        roll.roll();
        if (this.modalData.attacker.showRoll) {
          const { i18n } = game;
          const flavor = weapon
            ? i18n.format("macros.combat.dialog.physicalAttack.title", {
                weapon: weapon?.name,
                target: this.modalData.defender.token.name,
              })
            : i18n.format("macros.combat.dialog.physicalAttack.unarmed.title", {
                target: this.modalData.defender.token.name,
              });
          roll.toMessage({
            speaker: ChatMessage.getSpeaker({
              token: this.modalData.attacker.token,
            }),
            flavor,
          });
        }
        const critic = criticSelected ?? WeaponCritic.IMPACT;
        const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
        this.hooks.onAttack({
          type: "combat",
          values: {
            unarmed,
            damage:
              Math.floor(
                (isAttackAccumulation ? damage.final * 1.5 : damage.final) / 5
              ) * 5,
            ignoredTA: ignoredTA,
            attack,
            weaponUsed,
            critic,
            modifier,
            fatigueUsed,
            roll: rolled,
            total: roll.total,
            fumble: roll.fumbled,
          },
        });
        this.modalData.attackSent = true;
        this.render();

        // Save preferences for next time
        this.attackerActor.update({
          "system.macroCookies.combatAttackDialog": {
            initialTab: "combat",
            combat: {
              modifier: modifier,
              unarmed: unarmed,
              weaponUsed: weaponUsed,
              criticSelected: critic,
              weapon: weapon,
              damage: damage,
              ignoredTA: ignoredTA,
            },
          },
        });
      }
    });
    html.find(".send-mystic-attack").click(() => {
      const {
        magicProjectionType,
        spellGrade,
        spellUsed,
        modifier,
        critic,
        damage,
        ignoredTA,
      } = this.modalData.attacker.mystic;

      const { isAttackAccumulation, attackAccumulation } =
        this.modalData.attacker;
      if (spellUsed) {
        let baseMagicProjection;
        let magicProjection;
        if (magicProjectionType === "normal") {
          magicProjection =
            this.attackerActor.system.mystic.magicProjection.final.value;
          baseMagicProjection =
            this.attackerActor.system.mystic.magicProjection.base.value;
        } else {
          magicProjection =
            this.attackerActor.system.mystic.magicProjection.imbalance.offensive
              .final.value;
          baseMagicProjection =
            this.attackerActor.system.mystic.magicProjection.imbalance.offensive
              .base.value;
        }

        let rollModifiers = [
          magicProjection,
          getMassAttackBonus(attackAccumulation),
          modifier,
        ];
        let formula = getFormula({
          dice: isAttackAccumulation ? "2d100khxa" : "1d100xa",
          values: rollModifiers,
          labels: ["Proy. Mag.", `${attackAccumulation} at. en masa`, "Mod."],
        });

        if (this.modalData.attacker.withoutRoll) {
          // Remove the dice from the formula
          formula = formula.replace("1d100xa", "0");
        }
        if (baseMagicProjection >= 200) {
          // Mastery reduces the fumble range
          formula = formula.replace("xa", "xamastery");
        }
        const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
        roll.roll();
        if (this.modalData.attacker.showRoll) {
          const { i18n } = game;
          const { spells } = this.attackerActor.system.mystic;
          const spell = spells.find((w) => w._id === spellUsed);
          const flavor = i18n.format("macros.combat.dialog.magicAttack.title", {
            spell: spell.name,
            target: this.modalData.defender.token.name,
          });
          roll.toMessage({
            speaker: ChatMessage.getSpeaker({
              token: this.modalData.attacker.token,
            }),
            flavor,
          });
        }
        const rolled = roll.total - rollModifiers;
        this.hooks.onAttack({
          type: "mystic",
          values: {
            modifier,
            spellUsed,
            spellGrade,
            magicProjection,
            critic,
            damage,
            ignoredTA: ignoredTA,
            roll: rolled,
            total: roll.total,
            fumble: roll.fumbled,
          },
        });
        this.modalData.attackSent = true;
        this.render();
        // Save preferences for next time
        this.attackerActor.update({
          "system.macroCookies.combatAttackDialog": {
            initialTab: "mystic",
            mystic: {
              modifier: modifier,
              magicProjectionType: magicProjectionType,
              spellUsed: spellUsed,
              spellGrade: spellGrade,
              critic: critic,
              damage: damage,
              ignoredTA: ignoredTA,
            },
          },
        });
      }
    });
    html.find(".send-psychic-attack").click(() => {
      const {
        powerUsed,
        modifier,
        psychicPotential,
        psychicProjection,
        critic,
        damage,
        ignoredTA,
      } = this.modalData.attacker.psychic;

      if (powerUsed) {
        let rollModifiers = [psychicProjection, modifier];
        let formula = getFormula({
          values: rollModifiers,
          labels: ["Proy. Psi.", "Mod."],
        });

        if (this.modalData.attacker.withoutRoll) {
          // Remove the dice from the formula
          formula = formula.replace("1d100xa", "0");
        }
        if (
          this.attackerActor.system.psychic.psychicProjection.base.value >= 200
        ) {
          // Mastery reduces the fumble range
          formula = formula.replace("xa", "xamastery");
        }
        const psychicProjectionRoll = new ABFFoundryRoll(
          formula,
          this.attackerActor.system
        );
        psychicProjectionRoll.roll();
        const powers = this.attackerActor.system.psychic.psychicPowers;
        const power = powers.find((w) => w._id === powerUsed);
        const psychicPotentialRoll = new ABFFoundryRoll(
          getFormula({
            values: [psychicPotential.final, power.system.bonus.value],
            labels: ["Potencial", "Bono Poder"],
          }),
          this.modalData.attacker.actor.system
        );
        psychicPotentialRoll.roll();

        if (this.modalData.attacker.showRoll) {
          const { i18n } = game;

          psychicPotentialRoll.toMessage({
            speaker: ChatMessage.getSpeaker({
              token: this.modalData.attacker.token,
            }),
            flavor: i18n.format("macros.combat.dialog.psychicPotential.title"),
          });
          const projectionFlavor = i18n.format(
            "macros.combat.dialog.psychicAttack.title",
            {
              power: power.name,
              target: this.modalData.defender.token.name,
              potential: psychicPotentialRoll.total,
            }
          );
          psychicProjectionRoll.toMessage({
            speaker: ChatMessage.getSpeaker({
              token: this.modalData.attacker.token,
            }),
            flavor: projectionFlavor,
          });
        }
        const rolled =
          psychicProjectionRoll.total - psychicProjection - (modifier ?? 0);
        this.hooks.onAttack({
          type: "psychic",
          values: {
            modifier,
            powerUsed,
            psychicPotential: psychicPotentialRoll.total,
            psychicProjection,
            critic,
            damage,
            ignoredTA: ignoredTA,
            roll: rolled,
            total: psychicProjectionRoll.total,
            fumble: psychicProjectionRoll.fumbled,
          },
        });
        this.modalData.attackSent = true;
        this.render();
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({
            token: this.modalData.attacker.token,
          }),
          flavor: `Poder usado: ${power.name} con potencial ${psychicPotentialRoll.total}`,
          content: `Efecto: ${getPsychichPowerEffect(
            power.system,
            psychicPotentialRoll.total
          )}`,
          whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
        });

        // Save preferences for next time
        this.attackerActor.update({
          "system.macroCookies.combatAttackDialog": {
            initialTab: "psychic",
            psychic: {
              modifier: modifier,
              powerUsed: powerUsed,
              critic: critic,
              damage: damage,
              ignoredTA: ignoredTA,
            },
          },
        });
      }
    });
  }
  getData() {
    const {
      attacker: { combat, psychic },
      ui,
    } = this.modalData;
    ui.hasFatiguePoints =
      this.attackerActor.system.characteristics.secondaries.fatigue.value > 0;
    psychic.psychicPotential.final =
      psychic.psychicPotential.special +
      this.attackerActor.system.psychic.psychicPotential.final.value;
    const { weapons } = this.attackerActor.system.combat;
    console.log(combat, weapons, combat.weaponUsed);
    const weapon =
      weapons.find((w) => w._id === combat.weaponUsed) ?? weapons[0];
    combat.unarmed = weapons.length === 0;
    if (combat.unarmed) {
      combat.damage.final =
        combat.damage.special +
        10 +
        this.attackerActor.system.characteristics.primaries.strength.mod;
    } else {
      combat.weapon = weapon;
      if (!combat.criticSelected) {
        combat.criticSelected = weapon.system.critic.primary.value;
      }
      ui.weaponHasSecondaryCritic =
        weapon.system.critic.secondary.value !== NoneWeaponCritic.NONE;
      combat.damage.final =
        combat.damage.special + weapon.system.damage.final.value;
    }
    this.modalData.config = ABFConfig;
    return this.modalData;
  }
  async _updateObject(event, formData) {
    const prevWeapon = this.modalData.attacker.combat.weaponUsed;
    this.modalData = mergeObject(this.modalData, formData);
    if (prevWeapon !== this.modalData.attacker.combat.weaponUsed) {
      this.modalData.attacker.combat.criticSelected = undefined;
    }
    this.render();
  }
}
