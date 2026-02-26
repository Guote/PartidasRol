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
import { ChatAttackCard } from "../../combat/chat-combat/ChatAttackCard.js";

const getInitialData = (attacker, defender, options = {}) => {
  const showRollByDefault = !!game.settings.get(
    "animabf-guote",
    ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT
  );
  const isGM = !!game.user?.isGM;
  const attackerActor = attacker.actor;
  const defenderActor = defender?.actor;
  const macroCookies = attackerActor.system?.macroCookies?.combatAttackDialog;

  // Check if preset data was provided
  const presetData = options.presetData;
  const hasPreset = !!presetData;

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
      showRoll: hasPreset ? (presetData.showRoll?.value ?? (!isGM || showRollByDefault)) : (!isGM || showRollByDefault),
      withoutRoll: hasPreset ? (presetData.withoutRoll?.value ?? false) : false,
      counterAttackBonus: options.counterAttackBonus,
      isAttackAccumulation: hasPreset ? (presetData.isAccumulation?.value ?? false) : false,
      attackAccumulation: hasPreset ? (presetData.accumulationCount?.value ?? 0) : 0,
      combat: {
        fatigueUsed: hasPreset ? (presetData.combat?.fatigueUsed?.value ?? 0) : 0,
        modifier: hasPreset ? (presetData.combat?.modifier?.value ?? 0) : (macroCookies?.combat?.modifier ?? 0),
        unarmed: macroCookies?.combat?.unarmed ?? false,
        weaponUsed: hasPreset ? (presetData.combat?.weaponUsed?.value || undefined) : (macroCookies?.combat?.weaponUsed ?? undefined),
        criticSelected: hasPreset ? (presetData.combat?.criticSelected?.value || undefined) : (macroCookies?.combat?.criticSelected ?? undefined),
        weapon: macroCookies?.combat?.weapon ?? undefined,
        damage: {
          special: hasPreset ? (presetData.combat?.damageBonus?.value ?? 0) : (macroCookies?.combat?.damage?.special ?? 0),
          final: macroCookies?.combat?.damage?.final ?? 0,
        },
        ignoredTA: hasPreset ? (presetData.combat?.ignoredTA?.value ?? 0) : (macroCookies?.combat?.ignoredTA ?? 0),
      },
      mystic: {
        modifier: hasPreset ? (presetData.mystic?.modifier?.value ?? 0) : (macroCookies?.mystic?.modifier ?? 0),
        magicProjectionType: hasPreset ? (presetData.mystic?.projectionType?.value ?? "normal") : (macroCookies?.mystic?.magicProjectionType ?? "normal"),
        spellUsed: hasPreset ? (presetData.mystic?.spellUsed?.value || undefined) : (macroCookies?.mystic?.spellUsed ?? undefined),
        spellGrade: hasPreset ? (presetData.mystic?.spellGrade?.value ?? "base") : (macroCookies?.mystic?.spellGrade ?? "base"),
        critic: hasPreset ? (presetData.mystic?.critic?.value ?? NoneWeaponCritic.NONE) : (macroCookies?.mystic?.critic ?? NoneWeaponCritic.NONE),
        damage: hasPreset ? (presetData.mystic?.damage?.value ?? 0) : (macroCookies?.mystic?.damage ?? 0),
        ignoredTA: hasPreset ? (presetData.mystic?.ignoredTA?.value ?? 0) : (macroCookies?.mystic?.ignoredTA ?? 0),
      },
      psychic: {
        modifier: hasPreset ? (presetData.psychic?.modifier?.value ?? 0) : (macroCookies?.psychic?.modifier ?? 0),
        psychicProjection:
          attackerActor.system.psychic.psychicProjection.imbalance.offensive
            .final.value,
        psychicPotential: {
          special: hasPreset ? (presetData.psychic?.potentialBonus?.value ?? 0) : (macroCookies?.psychic?.psychicPotential?.special ?? 0),
          final: attackerActor.system.psychic.psychicPotential.final.value,
        },
        powerUsed: hasPreset ? (presetData.psychic?.powerUsed?.value || undefined) : (macroCookies?.psychic?.powerUsed ?? undefined),
        critic: hasPreset ? (presetData.psychic?.critic?.value ?? NoneWeaponCritic.NONE) : (macroCookies?.psychic?.critic ?? NoneWeaponCritic.NONE),
        damage: hasPreset ? (presetData.psychic?.damage?.value ?? 0) : (macroCookies?.psychic?.damage ?? 0),
        ignoredTA: hasPreset ? (presetData.psychic?.ignoredTA?.value ?? 0) : (macroCookies?.psychic?.ignoredTA ?? 0),
        potentialResult: null,
      },
      summon: {
        modifier: hasPreset ? (presetData.summon?.modifier?.value ?? 0) : (macroCookies?.summon?.modifier ?? 0),
        summonUsed: hasPreset ? (presetData.summon?.summonUsed?.value || undefined) : (macroCookies?.summon?.summonUsed ?? undefined),
        summon: undefined,
        summoningRolled: false,
        summoningResult: null,
        critic: hasPreset ? (presetData.summon?.critic?.value ?? WeaponCritic.IMPACT) : (macroCookies?.summon?.critic ?? WeaponCritic.IMPACT),
        effectiveDamage: 0,
        ignoredTA: hasPreset ? (presetData.summon?.ignoredTA?.value ?? 0) : (macroCookies?.summon?.ignoredTA ?? 0),
      },
    },
    defender: {
      token: defender,
      actor: defenderActor,
    },
    attackSent: false,
    allowed: false,
    config: ABFConfig,
    initialTab: hasPreset ? (presetData.attackType?.value ?? "combat") : (macroCookies?.initialTab ?? "combat"),
    presetId: options.presetId,
    presetName: "",
    selectedPresetId: "",
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
    this.closeOnSend = options.closeOnSend ?? false;

    // Set initial tab based on preset data or saved preferences
    const initialTab = this.modalData.initialTab || "combat";
    this._tabs[0].active = initialTab;

    this.render(true);
  }

  static get defaultOptions() {
    console.log("initialtab");
    return mergeObject(super.defaultOptions, {
      classes: ["abf-dialog", "combat-attack-dialog"],
      submitOnChange: true,
      closeOnSubmit: false,
      width: null,
      height: null,
      resizable: true,
      template: Templates.Dialog.Combat.CombatAttackDialog.main,
      title: game.i18n.localize("anima.macros.combat.dialog.modal.attack.title"),
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
    return super.close(options);
  }
  activateListeners(html) {
    super.activateListeners(html);

    // Preset name input handler - track value and update button disabled state
    const presetInput = html.find(".preset-name-input");
    const saveButton = html.find(".save-attack-preset");

    // Update button disabled state based on input value
    const updateSaveButtonState = () => {
      const hasValue = presetInput.val()?.trim().length > 0;
      saveButton.prop("disabled", !hasValue);
    };

    // Listen for input changes (keyup for real-time feedback)
    presetInput.on("input keyup", (e) => {
      // Save value to modalData so it survives re-renders
      this.modalData.presetName = e.target.value;
      updateSaveButtonState();
    });

    // Initial state check
    updateSaveButtonState();

    // Load preset selector handler
    html.find(".load-attack-preset").change((e) => {
      const presetId = e.target.value;
      if (!presetId) {
        // "New attack" selected - reset to defaults
        this.modalData.selectedPresetId = "";
        return;
      }

      // Find the preset and load its data
      const preset = this.attackerActor.system.combat.attackPresets.find(p => p._id === presetId);
      if (!preset) return;

      this.modalData.selectedPresetId = presetId;
      this._loadPresetData(preset.system);
    });

    // Save preset button handler
    saveButton.click(async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const name = this.modalData.presetName?.trim();
      if (!name) return; // Button should be disabled, but double-check

      // Get the current active tab as the attack type
      const attackType = this._tabs[0].active || "combat";

      await this._saveAsPreset(attackType, name);

      // Clear input and update state
      this.modalData.presetName = "";
      presetInput.val("");
      updateSaveButtonState();
    });

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
          dice: isAttackAccumulation ? "1d100xa" : "1d100xa",
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
            ? i18n.format("anima.macros.combat.dialog.physicalAttack.title", {
                weapon: weapon?.name,
                target: this.modalData.defender.token.name,
              })
            : i18n.format("anima.macros.combat.dialog.physicalAttack.unarmed.title", {
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
        const attackResult = {
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
        };
        this.hooks.onAttack(attackResult);

        // Post attack card to chat for chat-based combat system
        ChatAttackCard.create(this.modalData.attacker.token, attackResult, { weapon });

        // Close dialog or show loading indicator
        if (this.closeOnSend) {
          this.close();
        } else {
          this.modalData.attackSent = true;
          this.render();
        }

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
          const flavor = i18n.format("anima.macros.combat.dialog.magicAttack.title", {
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
        const mysticAttackResult = {
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
        };
        this.hooks.onAttack(mysticAttackResult);

        // Post attack card to chat for chat-based combat system
        ChatAttackCard.create(this.modalData.attacker.token, mysticAttackResult);

        // Close dialog or show loading indicator
        if (this.closeOnSend) {
          this.close();
        } else {
          this.modalData.attackSent = true;
          this.render();
        }
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
    // Roll Only Psychic Potential button (attack)
    html.find(".roll-psychic-potential").click(() => {
      const { psychicPotential, powerUsed } = this.modalData.attacker.psychic;
      if (!powerUsed) {
        ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectPower'));
        return;
      }
      const powers = this.attackerActor.system.psychic.psychicPowers;
      const power = powers.find((w) => w._id === powerUsed);
      if (!power) return;

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
          flavor: i18n.format("anima.macros.combat.dialog.psychicPotential.title"),
        });
      }

      // Show psychic power effect as GM whisper
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

      this.modalData.attacker.psychic.potentialResult = {
        total: psychicPotentialRoll.total,
      };

      // Re-render (does NOT close)
      this.render();
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
            flavor: i18n.format("anima.macros.combat.dialog.psychicPotential.title"),
          });
          const projectionFlavor = i18n.format(
            "anima.macros.combat.dialog.psychicAttack.title",
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
        const psychicAttackResult = {
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
        };
        this.hooks.onAttack(psychicAttackResult);

        // Post attack card to chat for chat-based combat system
        ChatAttackCard.create(this.modalData.attacker.token, psychicAttackResult);

        // Close dialog or show loading indicator
        if (this.closeOnSend) {
          this.close();
        } else {
          this.modalData.attackSent = true;
          this.render();
        }
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

    // Roll Summoning Only button
    html.find(".roll-summoning").click(() => {
      const { summonUsed, modifier } = this.modalData.attacker.summon;
      if (!summonUsed) {
        ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSummon'));
        return;
      }
      const summons = this.attackerActor.system.mystic.summons;
      const summon = summons.find((s) => s._id === summonUsed);
      if (!summon) return;

      const summoningValue = this.attackerActor.system.mystic.summoning.summon.final.value;
      const rollModifiers = [summoningValue, modifier];
      let formula = getFormula({
        values: rollModifiers,
        labels: ["Convocación", "Mod."],
      });

      if (this.modalData.attacker.withoutRoll) {
        formula = formula.replace("1d100xa", "0");
      }

      const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
      roll.roll();

      if (this.modalData.attacker.showRoll) {
        const { i18n } = game;
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({
            token: this.modalData.attacker.token,
          }),
          flavor: i18n.format("anima.macros.combat.dialog.summoningSummon.title", {
            summon: summon.name,
          }),
        });
      }

      const difficulty = summon.system.summonDif.value || 0;
      const excess = Math.max(0, roll.total - difficulty);
      const bonusPoints = Math.floor(excess / 10);

      this.modalData.attacker.summon.summoningRolled = true;
      this.modalData.attacker.summon.summoningResult = {
        total: roll.total,
        excess,
        bonusPoints,
      };

      // Re-render dialog (does NOT close)
      this.render();
    });

    // Send Summon Attack button
    html.find(".send-summon-attack").click(() => {
      const { summonUsed, modifier, critic, ignoredTA } = this.modalData.attacker.summon;
      if (!summonUsed) {
        ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSummon'));
        return;
      }
      const summons = this.attackerActor.system.mystic.summons;
      const summon = summons.find((s) => s._id === summonUsed);
      if (!summon) return;

      const effectiveHA = (summon.system.baseAtk.value || 0) + (summon.system.bonusAtk.value || 0);
      const effectiveDamage = (summon.system.damage.value || 0) + (summon.system.bonusDamage.value || 0);

      const rollModifiers = [effectiveHA, modifier];
      let formula = getFormula({
        values: rollModifiers,
        labels: ["HA Invocación", "Mod."],
      });

      if (this.modalData.attacker.withoutRoll) {
        formula = formula.replace("1d100xa", "0");
      }

      const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
      roll.roll();

      if (this.modalData.attacker.showRoll) {
        const { i18n } = game;
        const flavor = i18n.format("anima.macros.combat.dialog.summonAttack.title", {
          summon: summon.name,
          target: this.modalData.defender.token.name,
        });
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({
            token: this.modalData.attacker.token,
          }),
          flavor,
        });
      }

      const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
      const summonCritic = critic || summon.system.critic.value || WeaponCritic.IMPACT;
      const attackResult = {
        type: "summon",
        values: {
          summonUsed,
          damage: Math.floor(effectiveDamage / 5) * 5,
          ignoredTA,
          attack: effectiveHA,
          critic: summonCritic,
          modifier,
          roll: rolled,
          total: roll.total,
          fumble: roll.fumbled,
        },
      };
      this.hooks.onAttack(attackResult);

      ChatAttackCard.create(this.modalData.attacker.token, attackResult);

      if (this.closeOnSend) {
        this.close();
      } else {
        this.modalData.attackSent = true;
        this.render();
      }

      this.attackerActor.update({
        "system.macroCookies.combatAttackDialog": {
          initialTab: "summon",
          summon: {
            modifier,
            summonUsed,
            critic: summonCritic,
            ignoredTA,
          },
        },
      });
    });
  }
  getData() {
    const {
      attacker: { combat, psychic, summon },
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
    // Update summon reference
    const { summons } = this.attackerActor.system.mystic;
    if (summon.summonUsed) {
      const selectedSummon = summons.find((s) => s._id === summon.summonUsed);
      if (selectedSummon) {
        summon.summon = selectedSummon;
        if (!summon.critic || summon.critic === NoneWeaponCritic.NONE) {
          summon.critic = selectedSummon.system.critic.value || WeaponCritic.IMPACT;
        }
        summon.effectiveDamage = (selectedSummon.system.damage.value || 0) + (selectedSummon.system.bonusDamage.value || 0);
      }
    } else if (summons.length > 0) {
      summon.summonUsed = summons[0]._id;
      summon.summon = summons[0];
      summon.critic = summons[0].system.critic.value || WeaponCritic.IMPACT;
      summon.effectiveDamage = (summons[0].system.damage.value || 0) + (summons[0].system.bonusDamage.value || 0);
    }

    this.modalData.config = ABFConfig;
    return this.modalData;
  }
  async _updateObject(event, formData) {
    // Skip merge if we're loading a preset (to prevent form data from overwriting preset values)
    if (this._loadingPreset) {
      this._loadingPreset = false;
      return;
    }

    const prevWeapon = this.modalData.attacker.combat.weaponUsed;
    this.modalData = mergeObject(this.modalData, formData);
    if (prevWeapon !== this.modalData.attacker.combat.weaponUsed) {
      this.modalData.attacker.combat.criticSelected = undefined;
    }
    this.render();
  }

  /**
   * Save current attack configuration as a preset
   * @param {string} attackType - The type of attack ('combat', 'mystic', or 'psychic')
   * @param {string} name - The preset name
   */
  async _saveAsPreset(attackType = "combat", name) {
    const { i18n } = game;
    const { combat, mystic, psychic, summon, isAttackAccumulation, attackAccumulation, withoutRoll, showRoll } = this.modalData.attacker;

    const presetData = {
      attackType: { value: attackType },
      withoutRoll: { value: withoutRoll || false },
      showRoll: { value: showRoll ?? true },
      isAccumulation: { value: isAttackAccumulation || false },
      accumulationCount: { value: attackAccumulation || 0 },
      combat: {
        modifier: { value: combat.modifier || 0 },
        fatigueUsed: { value: combat.fatigueUsed || 0 },
        weaponUsed: { value: combat.weaponUsed || "" },
        criticSelected: { value: combat.criticSelected || "-" },
        damageBonus: { value: combat.damage?.special || 0 },
        ignoredTA: { value: combat.ignoredTA || 0 },
      },
      mystic: {
        modifier: { value: mystic.modifier || 0 },
        projectionType: { value: mystic.magicProjectionType || "normal" },
        spellUsed: { value: mystic.spellUsed || "" },
        spellGrade: { value: mystic.spellGrade || "base" },
        critic: { value: mystic.critic || "-" },
        damage: { value: mystic.damage || 0 },
        ignoredTA: { value: mystic.ignoredTA || 0 },
      },
      psychic: {
        modifier: { value: psychic.modifier || 0 },
        potentialBonus: { value: psychic.psychicPotential?.special || 0 },
        powerUsed: { value: psychic.powerUsed || "" },
        critic: { value: psychic.critic || "-" },
        damage: { value: psychic.damage || 0 },
        ignoredTA: { value: psychic.ignoredTA || 0 },
      },
      summon: {
        modifier: { value: summon?.modifier || 0 },
        summonUsed: { value: summon?.summonUsed || "" },
        critic: { value: summon?.critic || "impact" },
        ignoredTA: { value: summon?.ignoredTA || 0 },
      },
    };

    await this.attackerActor.createEmbeddedDocuments("Item", [{
      name,
      type: "attackPreset",
      system: presetData,
    }]);

    ui.notifications.info(i18n.format("anima.notifications.presetSaved", { name }));
  }

  /**
   * Load preset data into the dialog
   * @param {Object} presetData - The preset system data to load
   */
  _loadPresetData(presetData) {
    const { attacker } = this.modalData;

    // Load common settings - ensure boolean conversion
    attacker.withoutRoll = Boolean(presetData.withoutRoll?.value);
    attacker.showRoll = presetData.showRoll?.value !== false; // Default true
    attacker.isAttackAccumulation = Boolean(presetData.isAccumulation?.value);
    attacker.attackAccumulation = Number(presetData.accumulationCount?.value) || 0;

    // Load combat data
    if (presetData.combat) {
      attacker.combat.modifier = Number(presetData.combat.modifier?.value) || 0;
      attacker.combat.fatigueUsed = Number(presetData.combat.fatigueUsed?.value) || 0;
      attacker.combat.weaponUsed = presetData.combat.weaponUsed?.value || attacker.combat.weaponUsed;
      attacker.combat.criticSelected = presetData.combat.criticSelected?.value || undefined;
      attacker.combat.damage.special = Number(presetData.combat.damageBonus?.value) || 0;
      attacker.combat.ignoredTA = Number(presetData.combat.ignoredTA?.value) || 0;
    }

    // Load mystic data
    if (presetData.mystic) {
      attacker.mystic.modifier = Number(presetData.mystic.modifier?.value) || 0;
      attacker.mystic.magicProjectionType = presetData.mystic.projectionType?.value || "normal";
      attacker.mystic.spellUsed = presetData.mystic.spellUsed?.value || attacker.mystic.spellUsed;
      attacker.mystic.spellGrade = presetData.mystic.spellGrade?.value || "base";
      attacker.mystic.critic = presetData.mystic.critic?.value || "-";
      attacker.mystic.damage = Number(presetData.mystic.damage?.value) || 0;
      attacker.mystic.ignoredTA = Number(presetData.mystic.ignoredTA?.value) || 0;
    }

    // Load psychic data
    if (presetData.psychic) {
      attacker.psychic.modifier = Number(presetData.psychic.modifier?.value) || 0;
      attacker.psychic.psychicPotential.special = Number(presetData.psychic.potentialBonus?.value) || 0;
      attacker.psychic.powerUsed = presetData.psychic.powerUsed?.value || attacker.psychic.powerUsed;
      attacker.psychic.critic = presetData.psychic.critic?.value || "-";
      attacker.psychic.damage = Number(presetData.psychic.damage?.value) || 0;
      attacker.psychic.ignoredTA = Number(presetData.psychic.ignoredTA?.value) || 0;
    }

    // Load summon data
    if (presetData.summon) {
      attacker.summon.modifier = Number(presetData.summon.modifier?.value) || 0;
      attacker.summon.summonUsed = presetData.summon.summonUsed?.value || attacker.summon.summonUsed;
      attacker.summon.critic = presetData.summon.critic?.value || "impact";
      attacker.summon.ignoredTA = Number(presetData.summon.ignoredTA?.value) || 0;
    }

    // Switch to the preset's attack type tab
    const attackType = presetData.attackType?.value ?? "combat";
    this._tabs[0].active = attackType;

    // Set flag to prevent _updateObject from overwriting our changes
    this._loadingPreset = true;

    // Force full re-render to show loaded data
    this.render(true);
  }
}
