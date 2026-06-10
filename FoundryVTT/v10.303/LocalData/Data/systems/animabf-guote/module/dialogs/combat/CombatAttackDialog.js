import { Templates } from "../../utils/constants.js";
import { upsertSpellMaintenance } from "../mystic/ZeonCalculatorDialog.js";
import {
  NoneWeaponCritic,
  WeaponCritic,
} from "../../types/combat/WeaponItemConfig.js";
import { attachItemSheetHandler } from "./utils/attachItemSheetHandlers.js";
import ABFFoundryRoll from "../../rolls/ABFFoundryRoll.js";
import { ABFSettingsKeys } from "../../../utils/registerSettings.js";
import { ABFConfig } from "../../ABFConfig.js";
import { getMassAttackBonus } from "../../combat/utils/getMassAttackBonus.js";
import { getFormula } from "../../rolls/utils/getFormula.js";
import { getModifierTerms } from "../../rolls/utils/getModifierTerms.js";
import { applyMasteryFormula } from "../../rolls/utils/applyMasteryFormula.js";
import { normalizePowers } from "../../combat/utils/normalizePowers.js";
import { getPsychichPowerEffect } from "../../combat/utils/getPsychichPowerEffect.js";
import { ChatAttackCard } from "../../combat/chat-combat/ChatAttackCard.js";
import { waitForDice } from "../../combat/utils/waitForDice.js";

const PSYCHIC_CV_BONUS_PER_POINT = 10;

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
      attackAccumulation: hasPreset ? (presetData.accumulationCount?.value ?? 1) : 1,
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
        enemyTAModifier: hasPreset ? (presetData.combat?.enemyTAModifier?.value ?? 0) : (macroCookies?.combat?.enemyTAModifier ?? 0),
        multipleAttackMode: macroCookies?.combat?.multipleAttackMode ?? "normal",
        ataquePrincipal: macroCookies?.combat?.ataquePrincipal ?? 1,
        maniobras: macroCookies?.combat?.maniobras ?? 0,
        committedManiobrasHA: macroCookies?.combat?.committedManiobrasHA ?? 0,
      },
      mystic: {
        modifier: hasPreset ? (presetData.mystic?.modifier?.value ?? 0) : (macroCookies?.mystic?.modifier ?? 0),
        magicProjectionType: hasPreset ? (presetData.mystic?.projectionType?.value ?? "normal") : (macroCookies?.mystic?.magicProjectionType ?? "normal"),
        spellUsed: hasPreset ? (presetData.mystic?.spellUsed?.value || undefined) : (macroCookies?.mystic?.spellUsed ?? undefined),
        spellGrade: hasPreset ? (presetData.mystic?.spellGrade?.value ?? "base") : (macroCookies?.mystic?.spellGrade ?? "base"),
        critic: hasPreset ? (presetData.mystic?.critic?.value ?? NoneWeaponCritic.NONE) : (macroCookies?.mystic?.critic ?? NoneWeaponCritic.NONE),
        damage: hasPreset ? (presetData.mystic?.damage?.value ?? 0) : (macroCookies?.mystic?.damage ?? 0),
        enemyTAModifier: hasPreset ? (presetData.mystic?.enemyTAModifier?.value ?? 0) : (macroCookies?.mystic?.enemyTAModifier ?? 0),
        consumeZeon: hasPreset ? (presetData.mystic?.consumeZeon?.value ?? true) : (macroCookies?.mystic?.consumeZeon ?? true),
        zeonMod: hasPreset ? (presetData.mystic?.zeonMod?.value ?? 0) : (macroCookies?.mystic?.zeonMod ?? 0),
        addToActiveSpells: macroCookies?.mystic?.addToActiveSpells ?? false,
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
        cvProyeccion: hasPreset ? (presetData.psychic?.cvProyeccion?.value ?? 0) : (macroCookies?.psychic?.cvProyeccion ?? 0),
        cvPotencial: hasPreset ? (presetData.psychic?.cvPotencial?.value ?? 0) : (macroCookies?.psychic?.cvPotencial ?? 0),
        critic: hasPreset ? (presetData.psychic?.critic?.value ?? WeaponCritic.ENERGY) : (macroCookies?.psychic?.critic ?? WeaponCritic.ENERGY),
        damage: hasPreset ? (presetData.psychic?.damage?.value ?? 0) : (macroCookies?.psychic?.damage ?? 0),
        enemyTAModifier: hasPreset ? (presetData.psychic?.enemyTAModifier?.value ?? 0) : (macroCookies?.psychic?.enemyTAModifier ?? 0),
        potentialResult: null,
      },
      summon: {
        modifier: hasPreset ? (presetData.summon?.modifier?.value ?? 0) : (macroCookies?.summon?.modifier ?? 0),
        summonUsed: hasPreset ? (presetData.summon?.summonUsed?.value || undefined) : (macroCookies?.summon?.summonUsed ?? undefined),
        powerUsed: hasPreset ? (presetData.summon?.powerUsed?.value ?? 0) : (macroCookies?.summon?.powerUsed ?? 0),
        summon: undefined,
        summonsList: [],
        powers: [],
        multiPower: false,
        summoningBonus: hasPreset ? (presetData.summon?.summoningBonus?.value ?? 0) : (macroCookies?.summon?.summoningBonus ?? 0),
        summoningRolled: false,
        summoningResult: null,
        critic: hasPreset ? (presetData.summon?.critic?.value ?? WeaponCritic.IMPACT) : (macroCookies?.summon?.critic ?? WeaponCritic.IMPACT),
        effectiveDamage: 0,
        enemyTAModifier: hasPreset ? (presetData.summon?.enemyTAModifier?.value ?? 0) : (macroCookies?.summon?.enemyTAModifier ?? 0),
        consumeZeon: hasPreset ? (presetData.summon?.consumeZeon?.value ?? true) : (macroCookies?.summon?.consumeZeon ?? true),
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
    selectedPresetId: "",
  };
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
    this._tabs[0].callback = () => { this.render(); };

    this.render(true);
  }

  static get defaultOptions() {
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
    html.find('input, textarea').on('focus', function () { this.select(); });

    // Open selected spell sheet
    attachItemSheetHandler(html, ".open-spell-sheet", this.attackerActor,
      () => html.find('[name="attacker.mystic.spellUsed"]').val());

    // Open ACT calculator
    html.find(".open-act-calculator").click(() => {
      window.ZeonCalculatorDialog?.openForActor(this.attackerActor);
    });

    // Open selected weapon sheet
    attachItemSheetHandler(html, ".open-weapon-sheet", this.attackerActor,
      () => this.modalData.attacker.combat.weaponUsed);

    // Open selected power sheet
    attachItemSheetHandler(html, ".open-power-sheet", this.attackerActor,
      () => html.find('[name="attacker.psychic.powerUsed"]').val());

    // Open selected summon sheet
    attachItemSheetHandler(html, ".open-summon-sheet", this.attackerActor,
      () => this.modalData.attacker.summon.summonUsed);

    // Load preset selector handler
    html.find(".load-attack-preset").change((e) => {
      const presetId = e.target.value;
      if (!presetId) {
        this.modalData.selectedPresetId = "";
        return;
      }
      const preset = this.attackerActor.system.combat.attackPresets.find(p => p._id === presetId);
      if (!preset) return;
      this.modalData.selectedPresetId = presetId;
      this._loadPresetData(preset.system);
    });

    // Save preset — opens a name-prompt dialog
    html.find(".save-attack-preset").click(() => {
      const attackType = this._tabs[0].active || "combat";
      const defaultName = game.i18n.localize("anima.ui.combat.defaultPresetName.attack");
      new Dialog({
        title: game.i18n.localize("anima.ui.combat.savePreset.title"),
        content: `<form style="padding:0.5rem 0"><div class="form-group">
          <label>${game.i18n.localize("anima.ui.combat.presetName")}</label>
          <input type="text" name="presetName" placeholder="${defaultName}" style="width:100%;margin-top:0.3rem" autofocus>
        </div></form>`,
        buttons: {
          save: {
            icon: '<i class="fas fa-save"></i>',
            label: game.i18n.localize("anima.macros.combat.dialog.savePreset"),
            callback: html => {
              const name = html.find("[name='presetName']").val().trim() || defaultName;
              this._saveAsPreset(attackType, name);
            }
          },
          cancel: { label: "Cancelar" }
        },
        default: "save"
      }).render(true);
    });

    html.find(".clear-maniobra-multiple").click(() => {
      this.modalData.attacker.combat.committedManiobrasHA = 0;
      this.modalData.attacker.combat.ataquePrincipal = 1;
      this.modalData.attacker.combat.maniobras = 0;
      this.attackerActor.update({
        "system.general.modifiers.modManiobras.ha": 0,
        "system.macroCookies.combatAttackDialog.combat.committedManiobrasHA": 0,
        "system.macroCookies.combatAttackDialog.combat.ataquePrincipal": 1,
        "system.macroCookies.combatAttackDialog.combat.maniobras": 0,
      });
      this.render();
    });

    html.find(".send-attack").click(async () => {
      if (this._sending) return;
      this._sending = true;
      const activeTab = this._tabs[0]?.active ?? 'combat';
      const { withoutRoll, attackAccumulation } = this.modalData.attacker;
      const isAttackAccumulation = (attackAccumulation ?? 1) > 1;
      const targetInfos = Array.from(game.user.targets).map(t => ({
        tokenId: t.id,
        name: t.name,
        img: t.document?.texture?.src || t.actor?.img || 'icons/svg/mystery-man.svg'
      }));
      if (this.closeOnSend) { this.close(); } else { this.modalData.attackSent = true; this.render(); }

      if (activeTab === 'combat') {
        const { weapon, criticSelected, modifier, fatigueUsed, damage, weaponUsed, unarmed, enemyTAModifier, multipleAttackMode, ataquePrincipal, maniobras, committedManiobrasHA } = this.modalData.attacker.combat;
        if (typeof damage !== "undefined") {
          const attack = weapon
            ? weapon.system.attack.final.value
            : this.attackerActor.system.combat.attack.final.value;
          const counterAttackBonus = this.modalData.attacker.counterAttackBonus ?? 0;
          const { values: modTermValues, labels: modTermLabels } = getModifierTerms(this.attackerActor.system, "attack");
          const penaltyPerManiobra = multipleAttackMode === 'cadencia' ? -10 : -20;
          // When penalty is already committed to the sheet it's included in modTermValues — don't add it again.
          const isAlreadyCommitted = (committedManiobrasHA ?? 0) !== 0;
          const multipleAttackPenalty = isAlreadyCommitted ? 0 : (maniobras ?? 0) * penaltyPerManiobra;
          let rollModifiers = [attack, getMassAttackBonus(attackAccumulation), counterAttackBonus, fatigueUsed * 15, ...modTermValues, modifier, multipleAttackPenalty];
          let formula = getFormula({
            dice: withoutRoll ? "0" : "1d100xa",
            values: rollModifiers,
            labels: ["HA", `${attackAccumulation} at. en masa`, "Contraataque", "Cansancio", ...modTermLabels, "Mod", "Maniobra (ataques múltiples)"],
          });
          formula = applyMasteryFormula(formula, this.attackerActor.system.combat.attack.base.value);
          const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
          roll.roll();
          if (this.modalData.attacker.showRoll) {
            const { i18n } = game;
            const flavor = weapon
              ? i18n.format("anima.macros.combat.dialog.physicalAttack.title", { weapon: weapon?.name, target: this.modalData.defender.token.name })
              : i18n.format("anima.macros.combat.dialog.physicalAttack.unarmed.title", { target: this.modalData.defender.token.name });
            await roll.toMessage({ speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }), flavor });
            await waitForDice();
          }
          const critic = criticSelected ?? WeaponCritic.IMPACT;
          const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
          const attackResult = {
            type: "combat",
            values: {
              unarmed,
              damage: Math.floor((isAttackAccumulation ? damage.final * 1.5 : damage.final) / 5) * 5,
              enemyTAModifier, attack, weaponUsed, critic, modifier, fatigueUsed,
              roll: rolled, total: roll.total, fumble: roll.fumbled,
            },
          };
          this.hooks.onAttack(attackResult);
          ChatAttackCard.create(this.modalData.attacker.token, attackResult, { weapon, targetInfos });
          Hooks.callAll('animabf.combatAttackSent', this.modalData.attacker.token, attackResult, {
            multipleAttackMode: multipleAttackMode ?? "normal",
            ataquePrincipal: ataquePrincipal ?? 1,
            maniobras: maniobras ?? 0,
          });
          const maniobrasCount = maniobras ?? 0;
          const newCommittedPenalty = (!isAlreadyCommitted && maniobrasCount > 0)
            ? maniobrasCount * penaltyPerManiobra
            : (committedManiobrasHA ?? 0);
          const attackUpdateData = {
            "system.macroCookies.combatAttackDialog": {
              initialTab: "combat",
              combat: { modifier, unarmed, weaponUsed, criticSelected: critic, weapon, damage, enemyTAModifier, multipleAttackMode: multipleAttackMode ?? "normal", ataquePrincipal: ataquePrincipal ?? 1, maniobras: maniobrasCount, committedManiobrasHA: newCommittedPenalty },
            },
          };
          if (!isAlreadyCommitted && maniobrasCount > 0) {
            attackUpdateData["system.general.modifiers.modManiobras.ha"] = newCommittedPenalty;
          }
          this.attackerActor.update(attackUpdateData);
          if (fatigueUsed > 0) {
            const currentFatigue = this.attackerActor.system.characteristics.secondaries.fatigue.value;
            await this.attackerActor.update({
              'system.characteristics.secondaries.fatigue.value': Math.max(0, currentFatigue - fatigueUsed)
            });
          }
        }

      } else if (activeTab === 'mystic') {
        const { spellGrade, spellUsed, modifier, critic, damage, enemyTAModifier, magicProjectionType, consumeZeon, zeonMod, addToActiveSpells } = this.modalData.attacker.mystic;
        if (spellUsed) {
          const magicProjection = this.attackerActor.system.mystic.magicProjection.imbalance.offensive.final.value;
          const baseMagicProjection = this.attackerActor.system.mystic.magicProjection.imbalance.offensive.base.value;
          const { values: modTermValues, labels: modTermLabels } = getModifierTerms(this.attackerActor.system, "general-negative");
          let rollModifiers = [magicProjection, getMassAttackBonus(attackAccumulation), ...modTermValues, modifier];
          let formula = getFormula({
            dice: withoutRoll ? "0" : "1d100xa",
            values: rollModifiers,
            labels: ["Proy. Mag.", `${attackAccumulation} at. en masa`, ...modTermLabels, "Mod."],
          });
          formula = applyMasteryFormula(formula, baseMagicProjection);
          const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
          roll.roll();
          if (this.modalData.attacker.showRoll) {
            const { i18n } = game;
            const { spells } = this.attackerActor.system.mystic;
            const spell = spells.find((w) => w._id === spellUsed);
            const flavor = i18n.format("anima.macros.combat.dialog.magicAttack.title", { spell: spell.name, target: this.modalData.defender.token.name });
            await roll.toMessage({ speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }), flavor });
            await waitForDice();
          }
          const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
          const mysticAttackResult = {
            type: "mystic",
            values: {
              modifier, spellUsed, spellGrade, magicProjection, critic,
              damage: Math.floor((isAttackAccumulation ? damage * 1.5 : damage) / 5) * 5,
              enemyTAModifier, roll: rolled, total: roll.total, fumble: roll.fumbled,
            },
          };
          this.hooks.onAttack(mysticAttackResult);
          ChatAttackCard.create(this.modalData.attacker.token, mysticAttackResult, { targetInfos });
          this.attackerActor.update({
            "system.macroCookies.combatAttackDialog": {
              initialTab: "mystic",
              mystic: { modifier, magicProjectionType, spellUsed, spellGrade, critic, damage, enemyTAModifier, consumeZeon, zeonMod, addToActiveSpells },
            },
          });
          if (addToActiveSpells) {
            const maintenanceCost = this.attackerActor.items.get(spellUsed)?.system?.grades?.[spellGrade]?.maintenanceCost?.value ?? 0;
            const hasDailyMaintenance = this.attackerActor.items.get(spellUsed)?.system?.hasDailyMaintenance?.value ?? false;
            if (maintenanceCost > 0) {
              const spellName = this.attackerActor.items.get(spellUsed)?.name ?? '';
              await upsertSpellMaintenance(this.attackerActor, { spellId: spellUsed, spellName, grade: spellGrade, maintenanceCost, hasDailyMaintenance });
            }
          }
          if (consumeZeon !== false) {
            const selectedSpell = this.attackerActor.items.get(spellUsed);
            const zeonCost = selectedSpell?.system?.grades?.[spellGrade]?.zeon?.value ?? 0;
            const zeonFinal = Math.max(0, zeonCost + (zeonMod ?? 0));
            if (zeonFinal > 0) {
              const currentZeon = this.attackerActor.system.mystic.zeon.value;
              await this.attackerActor.update({
                'system.mystic.zeon.value': Math.max(0, currentZeon - zeonFinal)
              });
            }
            Hooks.callAll('animabf.mysticSpellCast', this.attackerActor);
          }
        }

      } else if (activeTab === 'psychic') {
        const { powerUsed, modifier, psychicPotential, baseProjection, cvProjectionBonus, basePotential, cvPotentialBonus, critic, damage, enemyTAModifier } = this.modalData.attacker.psychic;
        if (powerUsed) {
          const massBonus = getMassAttackBonus(attackAccumulation);
          const { values: psychicModTermValues, labels: psychicModTermLabels } = getModifierTerms(this.attackerActor.system, "general-negative");
          const { values: potentialModTermValues, labels: potentialModTermLabels } = getModifierTerms(this.attackerActor.system, "general-negative-half");
          const projRollModifiers = [baseProjection, cvProjectionBonus, massBonus, ...psychicModTermValues, modifier];
          let formula = getFormula({
            dice: withoutRoll ? "0" : "1d100xa",
            values: projRollModifiers,
            labels: ["Proy. Psi.", "CV", "En masa", ...psychicModTermLabels, "Mod."],
          });
          formula = applyMasteryFormula(formula, this.attackerActor.system.psychic.psychicProjection.base.value);
          const psychicProjectionRoll = new ABFFoundryRoll(formula, this.attackerActor.system);
          psychicProjectionRoll.roll();
          const powers = this.attackerActor.system.psychic.psychicPowers;
          const power = powers.find((w) => w._id === powerUsed);
          const psychicPotentialRoll = new ABFFoundryRoll(
            getFormula({ values: [basePotential, cvPotentialBonus, ...potentialModTermValues, psychicPotential.special], labels: ["Potencial", "CV", ...potentialModTermLabels, "Mod"] }),
            this.modalData.attacker.actor.system
          );
          psychicPotentialRoll.roll();
          if (this.modalData.attacker.showRoll) {
            const { i18n } = game;
            await psychicPotentialRoll.toMessage({ speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }), flavor: i18n.format("anima.macros.combat.dialog.psychicPotential.title") });
            await psychicProjectionRoll.toMessage({ speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }), flavor: i18n.format("anima.macros.combat.dialog.psychicAttack.title", { power: power.name, target: this.modalData.defender.token.name, potential: psychicPotentialRoll.total }) });
            await waitForDice(2);
          }
          const rolled = psychicProjectionRoll.total - projRollModifiers.reduce((a, b) => a + b, 0);
          const psychicAttackResult = {
            type: "psychic",
            values: {
              modifier, powerUsed,
              psychicPotential: psychicPotentialRoll.total,
              psychicProjection: baseProjection + cvProjectionBonus,
              critic,
              damage: Math.floor((isAttackAccumulation ? damage * 1.5 : damage) / 5) * 5,
              enemyTAModifier, roll: rolled, total: psychicProjectionRoll.total, fumble: psychicProjectionRoll.fumbled,
            },
          };
          this.hooks.onAttack(psychicAttackResult);
          ChatAttackCard.create(this.modalData.attacker.token, psychicAttackResult, { targetInfos });
          ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }),
            flavor: `Poder usado: ${power.name} con potencial ${psychicPotentialRoll.total}`,
            content: `Efecto: ${getPsychichPowerEffect(power.system, psychicPotentialRoll.total)}`,
            whisper: game.users.filter((u) => u.isGM).map((u) => u._id),
          });
          this.attackerActor.update({
            "system.macroCookies.combatAttackDialog": {
              initialTab: "psychic",
              psychic: { modifier, powerUsed, critic, damage, enemyTAModifier },
            },
          });
          {
            const cvProyeccion = this.modalData.attacker.psychic.cvProyeccion ?? 0;
            const cvPotencial = this.modalData.attacker.psychic.cvPotencial ?? 0;
            const totalCV = cvProyeccion + cvPotencial;
            if (totalCV > 0) {
              const currentCV = this.attackerActor.system.psychic.psychicPoints.value;
              await this.attackerActor.update({
                'system.psychic.psychicPoints.value': Math.max(0, currentCV - totalCV)
              });
            }
          }
        }

      } else if (activeTab === 'summon') {
        const { summonUsed, modifier, critic, enemyTAModifier, powerUsed, consumeZeon } = this.modalData.attacker.summon;
        if (!summonUsed) {
          ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSummon'));
          return;
        }
        const summon = this.attackerActor.items.get(summonUsed);
        if (!summon) return;
        const powerIdx = parseInt(powerUsed) || 0;
        const powers = normalizePowers(summon.system.powers);
        const power = powers[powerIdx] ?? powers[0];
        const ne = power?.ne?.value ?? 0;
        const evalSummonFormula = (f) => { try { return f?.trim() ? Math.floor(Roll.safeEval(f.replace(/\[NE\]/gi, ne))) : 0; } catch { return 0; } };
        const effectiveHA = evalSummonFormula(power?.atkFormula?.value);
        const effectiveDamage = evalSummonFormula(power?.damageFormula?.value);
        const massBonus = getMassAttackBonus(attackAccumulation);
        const { values: sumModTermValues, labels: sumModTermLabels } = getModifierTerms(this.attackerActor.system, "none");
        const rollModifiers = [effectiveHA, massBonus, ...sumModTermValues, modifier];
        let formula = getFormula({ values: rollModifiers, labels: ["HA Invocación", "En masa", ...sumModTermLabels, "Mod."] });
        if (withoutRoll) { formula = formula.replace("1d100xa", "0"); }
        const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
        roll.roll();
        if (this.modalData.attacker.showRoll) {
          const { i18n } = game;
          await roll.toMessage({ speaker: ChatMessage.getSpeaker({ token: this.modalData.attacker.token }), flavor: i18n.format("anima.macros.combat.dialog.summonAttack.title", { summon: summon.name, target: this.modalData.defender.token.name }) });
          await waitForDice();
        }
        const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
        const summonCritic = critic || power?.critic?.value || WeaponCritic.IMPACT;
        const attackResult = {
          type: "summon",
          values: {
            summonUsed,
            damage: Math.floor((isAttackAccumulation ? effectiveDamage * 1.5 : effectiveDamage) / 5) * 5,
            enemyTAModifier, attack: effectiveHA, critic: summonCritic, modifier, roll: rolled, total: roll.total, fumble: roll.fumbled,
          },
        };
        this.hooks.onAttack(attackResult);
        ChatAttackCard.create(this.modalData.attacker.token, attackResult, { targetInfos });
        this.attackerActor.update({
          "system.macroCookies.combatAttackDialog": {
            initialTab: "summon",
            summon: { modifier, summonUsed, critic: summonCritic, enemyTAModifier, consumeZeon },
          },
        });
        if (consumeZeon !== false) {
          const zeonCost = power?.zeon?.base?.value ?? 0;
          if (zeonCost > 0) {
            const currentZeon = this.attackerActor.system.mystic.zeon.value;
            await this.attackerActor.update({
              'system.mystic.zeon.value': Math.max(0, currentZeon - zeonCost)
            });
          }
          Hooks.callAll('animabf.mysticSpellCast', this.attackerActor);
        }
      }
    });

    this._applyModifiedShading(html);

    // Roll Only Psychic Potential button (attack)
    html.find(".roll-psychic-potential").click(() => {
      const { psychicPotential, basePotential, cvPotentialBonus, powerUsed } = this.modalData.attacker.psychic;
      if (!powerUsed) {
        ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectPower'));
        return;
      }

      const powers = this.attackerActor.system.psychic.psychicPowers;
      const power = powers.find((w) => w._id === powerUsed);
      if (!power) return;

      const { values: potModValues, labels: potModLabels } = getModifierTerms(this.attackerActor.system, "general-negative-half");
      const psychicPotentialRoll = new ABFFoundryRoll(
        getFormula({
          values: [basePotential, cvPotentialBonus, ...potModValues, psychicPotential.special],
          labels: ["Potencial", "CV", ...potModLabels, "Mod"],
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

    // Roll Summoning Only button
    html.find(".roll-summoning").click(async () => {
      const { summonUsed, summoningBonus, powerUsed } = this.modalData.attacker.summon;
      if (!summonUsed) {
        ui.notifications.warn(game.i18n.localize('anima.chat.combat.defense.selectSummon'));
        return;
      }
      const summon = this.attackerActor.items.get(summonUsed);
      if (!summon) return;

      const powerIdx = parseInt(powerUsed) || 0;
      const powers = normalizePowers(summon.system.powers);
      const power = powers[powerIdx] ?? powers[0];
      if (!power) return;

      const summoningValue = this.attackerActor.system.mystic.summoning.summon.final.value;
      const { values: sumModValues, labels: sumModLabels } = getModifierTerms(this.attackerActor.system, "general-negative");
      const rollModifiers = [summoningValue, summoningBonus, ...sumModValues];
      const formula = getFormula({
        values: rollModifiers,
        labels: ["Convocación", "Bonus", ...sumModLabels],
      });

      const roll = new ABFFoundryRoll(formula, this.attackerActor.system);
      roll.roll();

      if (this.modalData.attacker.showRoll) {
        const { i18n } = game;
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({
            token: this.modalData.attacker.token,
          }),
          flavor: powers.length > 1 && power?.name
            ? i18n.format("anima.macros.combat.dialog.summoningSummonPower.title", { summon: summon.name, power: power.name })
            : i18n.format("anima.macros.combat.dialog.summoningSummon.title", { summon: summon.name }),
        });
      }

      const difficulty = power?.summonDif?.value || 0;
      const ne = Math.floor(Math.max(0, roll.total - difficulty));

      this.modalData.attacker.summon.summoningRolled = true;
      this.modalData.attacker.summon.summoningResult = {
        total: roll.total,
        ne,
      };

      // Write NE back: clone the full array, update the target element, save whole array
      const updatedPowers = foundry.utils.deepClone(powers);
      const targetIdx = updatedPowers[powerIdx] ? powerIdx : 0;
      updatedPowers[targetIdx].ne.value = ne;
      await this.attackerActor.updateEmbeddedDocuments('Item', [
        { _id: summon._id, 'system.powers': updatedPowers }
      ]);

      // Re-render dialog (does NOT close) — getData() will re-read updated NE from actor
      this.render();
    });

  }
  getData() {
    const {
      attacker: { combat, mystic, psychic, summon },
      ui,
    } = this.modalData;
    ui.hasFatiguePoints =
      this.attackerActor.system.characteristics.secondaries.fatigue.value > 0;
    const activeTab = this._tabs[0]?.active ?? 'combat';
    const attackSent = this.modalData.attackSent;
    ui.activeTab = activeTab;
    {
      const activePower = this.attackerActor.system.psychic.psychicPowers.find(p => p._id === psychic.powerUsed);
      const powerBonus = activePower?.system.bonus.value || 0;
      // Keep base values separate so formulas can label each term individually
      psychic.baseProjection = this.attackerActor.system.psychic.psychicProjection.imbalance.offensive.final.value;
      psychic.cvProjectionBonus = (psychic.cvProyeccion ?? 0) * PSYCHIC_CV_BONUS_PER_POINT;
      psychic.projectionValue = psychic.baseProjection + psychic.cvProjectionBonus;
      psychic.basePotential = this.attackerActor.system.psychic.psychicPotential.final.value + powerBonus;
      psychic.cvPotentialBonus = (psychic.cvPotencial ?? 0) * PSYCHIC_CV_BONUS_PER_POINT;
      psychic.psychicPotential.final = psychic.basePotential + psychic.cvPotentialBonus + (psychic.psychicPotential.special ?? 0);
    }
    const { weapons } = this.attackerActor.system.combat;
    const weapon =
      weapons.find((w) => w._id === combat.weaponUsed) ?? weapons[0];
    combat.unarmed = weapons.length === 0;
    if (combat.unarmed) {
      combat.cadenceLabel = "120";
      combat.damage.final =
        combat.damage.special +
        10 +
        this.attackerActor.system.characteristics.primaries.strength.mod;
    } else {
      combat.weapon = weapon;
      combat.cadenceLabel = weapon.system.cadence?.value || "120";
      if (!combat.criticSelected) {
        combat.criticSelected = weapon.system.critic.primary.value;
      }
      ui.weaponHasSecondaryCritic =
        weapon.system.critic.secondary.value !== NoneWeaponCritic.NONE;
      combat.damage.final =
        combat.damage.special + weapon.system.damage.final.value;
    }
    // Compute live summary for display in dialog
    {
      const { attackAccumulation, counterAttackBonus } = this.modalData.attacker;
      const isAccumulation = (attackAccumulation ?? 1) > 1;
      const attackValue = combat.unarmed
        ? this.attackerActor.system.combat.attack.final.value
        : (combat.weapon?.system.attack.final.value ?? 0);
      const { values: summaryModTermValues } = getModifierTerms(this.attackerActor.system, "attack");
      const modTermSum = summaryModTermValues.reduce((a, b) => a + b, 0);
      const massBonus = getMassAttackBonus(attackAccumulation ?? 0);
      combat.totalDeclaredAttacks = (combat.ataquePrincipal ?? 1) + (combat.maniobras ?? 0);
      combat.hasCommittedMultipleAttackPenalty = (combat.committedManiobrasHA ?? 0) !== 0;
      combat.attacksLocked = this.modalData.attackSent || combat.hasCommittedMultipleAttackPenalty;
      // When committed, penalty is already in modTermSum via modFinal.attack.final.value — don't add it again.
      const summaryManiobras = combat.hasCommittedMultipleAttackPenalty ? 0 : (combat.maniobras ?? 0);
      const summaryPenaltyPerManiobra = combat.multipleAttackMode === 'cadencia' ? -10 : -20;
      const summaryMultiAttackPenalty = summaryManiobras * summaryPenaltyPerManiobra;
      combat.summary = {
        haFinal: attackValue + ((combat.fatigueUsed ?? 0) * 15) + (combat.modifier ?? 0) + (counterAttackBonus ?? 0) + massBonus + modTermSum + summaryMultiAttackPenalty,
        damage: Math.floor((isAccumulation ? combat.damage.final * 1.5 : combat.damage.final) / 5) * 5,
        enemyTAModifier: (combat.enemyTAModifier ?? 0) + (combat.weapon?.system?.taModifier?.final?.value ?? 0),
        criticSelected: (combat.criticSelected && combat.criticSelected !== NoneWeaponCritic.NONE && combat.criticSelected !== "-") ? combat.criticSelected : null,
      };
    }
    // Mystic summary (always uses offensive projection)
    {
      const { attackAccumulation } = this.modalData.attacker;
      const magicProjection = this.attackerActor.system.mystic.magicProjection.imbalance.offensive.final.value;
      const { values: mysticModTermValues } = getModifierTerms(this.attackerActor.system, "general-negative");
      const mysticModTermSum = mysticModTermValues.reduce((a, b) => a + b, 0);
      const mysticMassBonus = getMassAttackBonus(attackAccumulation ?? 0);
      const isMysticAccum = (attackAccumulation ?? 1) > 1;
      mystic.summary = {
        haFinal: magicProjection + mysticMassBonus + mysticModTermSum + (mystic.modifier ?? 0),
        damage: Math.floor((isMysticAccum ? (mystic.damage ?? 0) * 1.5 : (mystic.damage ?? 0)) / 5) * 5,
        enemyTAModifier: mystic.enemyTAModifier ?? 0,
        criticSelected: (mystic.critic && mystic.critic !== NoneWeaponCritic.NONE && mystic.critic !== "-") ? mystic.critic : null,
      };
    }
    // Mystic zeon cost display
    {
      const selectedSpell = this.attackerActor.items.get(mystic.spellUsed);
      mystic.zeonCost = selectedSpell?.system?.grades?.[mystic.spellGrade]?.zeon?.value ?? 0;
      mystic.zeonFinal = Math.max(0, mystic.zeonCost + (mystic.zeonMod ?? 0));
      mystic.currentZeon = this.attackerActor.system.mystic.zeon.value;
      mystic.zeonAfter = Math.max(0, mystic.currentZeon - (mystic.consumeZeon !== false ? mystic.zeonFinal : 0));
      mystic.maintenanceCost = selectedSpell?.system?.grades?.[mystic.spellGrade]?.maintenanceCost?.value ?? 0;
      mystic.hasDailyMaintenance = selectedSpell?.system?.hasDailyMaintenance?.value ?? false;
    }
    // Psychic summary
    {
      const { attackAccumulation } = this.modalData.attacker;
      const psychicMassBonus = getMassAttackBonus(attackAccumulation ?? 0);
      const isPsychicAccum = (attackAccumulation ?? 1) > 1;
      const { values: psychicSumModTermValues } = getModifierTerms(this.attackerActor.system, "general-negative");
      const psychicModTermSum = psychicSumModTermValues.reduce((a, b) => a + b, 0);
      psychic.summary = {
        haFinal: psychic.projectionValue + (psychic.modifier ?? 0) + psychicMassBonus + psychicModTermSum,
        damage: Math.floor((isPsychicAccum ? (psychic.damage ?? 0) * 1.5 : (psychic.damage ?? 0)) / 5) * 5,
        enemyTAModifier: psychic.enemyTAModifier ?? 0,
        criticSelected: (psychic.critic && psychic.critic !== NoneWeaponCritic.NONE && psychic.critic !== "-") ? psychic.critic : null,
      };
    }
    // Normalize powerUsed to number
    summon.powerUsed = parseInt(summon.powerUsed) || 0;
    // Update summon reference
    // Read summons directly from actor.items (always in sync; actor.system.mystic.summons
    // is repopulated asynchronously via prepareDerivedData and may lag after an item update)
    const summons = this.attackerActor.items.filter(i => i.type === 'summon');
    summon.summonsList = summons;
    const evalSummonF = (f, ne) => { try { return f?.trim() ? Math.floor(Roll.safeEval(f.replace(/\[NE\]/gi, ne))) : 0; } catch { return 0; } };
    if (summon.summonUsed) {
      const selectedSummon = summons.find((s) => s._id === summon.summonUsed);
      if (selectedSummon) {
        summon.summon = selectedSummon;
        const sPowers = normalizePowers(selectedSummon.system.powers);
        summon.powers = sPowers;
        summon.multiPower = sPowers.length > 1;
        const powerIdx = parseInt(summon.powerUsed) || 0;
        const activePower = sPowers[powerIdx] ?? sPowers[0];
        if (!summon.critic || summon.critic === NoneWeaponCritic.NONE) {
          summon.critic = activePower?.critic?.value || WeaponCritic.IMPACT;
        }
        const ne1 = activePower?.ne?.value ?? 0;
        summon.effectiveDamage = evalSummonF(activePower?.damageFormula?.value, ne1);
        summon.activePowerEffect = activePower?.effect?.value || '';
      }
    } else if (summons.length > 0) {
      summon.summonUsed = summons[0]._id;
      summon.summon = summons[0];
      const s0Powers = normalizePowers(summons[0].system.powers);
      summon.powers = s0Powers;
      summon.multiPower = s0Powers.length > 1;
      summon.powerUsed = 0;
      const p0 = s0Powers[0];
      summon.critic = p0?.critic?.value || WeaponCritic.IMPACT;
      const ne0 = p0?.ne?.value ?? 0;
      summon.effectiveDamage = evalSummonF(p0?.damageFormula?.value, ne0);
      summon.activePowerEffect = p0?.effect?.value || '';
    }
    // Summon summary
    summon.summoningValue = this.attackerActor.system.mystic.summoning.summon.final.value;
    if (summon.summon) {
      const sPowers = normalizePowers(summon.summon.system.powers);
      const powerIdx = parseInt(summon.powerUsed) || 0;
      const activeP = sPowers[powerIdx] ?? sPowers[0];
      const neS = activeP?.ne?.value ?? 0;
      const effectiveHA = evalSummonF(activeP?.atkFormula?.value, neS);
      const { attackAccumulation: sAccum } = this.modalData.attacker;
      const summonMassBonus = getMassAttackBonus(sAccum ?? 0);
      const isSummonAccum = (sAccum ?? 1) > 1;
      const { values: summonSumModTermValues } = getModifierTerms(this.attackerActor.system, "none");
      const summonModTermSum = summonSumModTermValues.reduce((a, b) => a + b, 0);
      summon.summary = {
        haFinal: effectiveHA + (summon.modifier ?? 0) + summonMassBonus + summonModTermSum,
        damage: Math.floor((isSummonAccum ? summon.effectiveDamage * 1.5 : summon.effectiveDamage) / 5) * 5,
        enemyTAModifier: summon.enemyTAModifier ?? 0,
        criticSelected: (summon.critic && summon.critic !== NoneWeaponCritic.NONE && summon.critic !== "-") ? summon.critic : null,
      };
    } else {
      summon.summary = null;
    }
    // Summon zeon cost display
    {
      const currentZeon = this.attackerActor.system.mystic.zeon.value;
      summon.currentZeon = currentZeon;
      if (summon.summon) {
        const sPowers = normalizePowers(summon.summon.system.powers);
        const powerIdx = parseInt(summon.powerUsed) || 0;
        const activeP = sPowers[powerIdx] ?? sPowers[0];
        summon.zeonCost = activeP?.zeon?.base?.value ?? 0;
        summon.zeonAfter = Math.max(0, currentZeon - (summon.consumeZeon !== false ? summon.zeonCost : 0));
      } else {
        summon.zeonCost = 0;
        summon.zeonAfter = currentZeon;
      }
    }

    // Shared attack modifiers — used by the single shared section in combat-attack-dialog.hbs
    {
      const tabModifiers = {
        combat: {
          modifierInputName: 'attacker.combat.modifier',
          modifierValue:     combat.modifier ?? 0,
          damageInputName:   'attacker.combat.damage.special',
          damageValue:       combat.damage?.special ?? 0,
          damageDisabled:    attackSent,
          criticInputName:   'attacker.combat.criticSelected',
          criticValue:       combat.criticSelected,
          useCriticWithNone: false,
          enemyTAModifierInputName: 'attacker.combat.enemyTAModifier',
          enemyTAModifierValue:    combat.enemyTAModifier ?? 0,
          summary:           combat.summary,
        },
        mystic: {
          modifierInputName: 'attacker.mystic.modifier',
          modifierValue:     mystic.modifier ?? 0,
          damageInputName:   'attacker.mystic.damage',
          damageValue:       mystic.damage ?? 0,
          damageDisabled:    attackSent,
          criticInputName:   'attacker.mystic.critic',
          criticValue:       mystic.critic,
          useCriticWithNone: true,
          enemyTAModifierInputName: 'attacker.mystic.enemyTAModifier',
          enemyTAModifierValue:    mystic.enemyTAModifier ?? 0,
          summary:           mystic.summary,
        },
        psychic: {
          modifierInputName: 'attacker.psychic.modifier',
          modifierValue:     psychic.modifier ?? 0,
          damageInputName:   'attacker.psychic.damage',
          damageValue:       psychic.damage ?? 0,
          damageDisabled:    attackSent,
          criticInputName:   'attacker.psychic.critic',
          criticValue:       psychic.critic,
          useCriticWithNone: false,
          enemyTAModifierInputName: 'attacker.psychic.enemyTAModifier',
          enemyTAModifierValue:    psychic.enemyTAModifier ?? 0,
          summary:           psychic.summary,
        },
        summon: {
          modifierInputName: 'attacker.summon.modifier',
          modifierValue:     summon.modifier ?? 0,
          damageInputName:   null,
          damageValue:       summon.effectiveDamage ?? 0,
          damageDisabled:    true,
          criticInputName:   'attacker.summon.critic',
          criticValue:       summon.critic,
          useCriticWithNone: false,
          enemyTAModifierInputName: 'attacker.summon.enemyTAModifier',
          enemyTAModifierValue:    summon.enemyTAModifier ?? 0,
          summary:           summon.summary,
        },
      };
      ui.activeAttackModifiers = tabModifiers[activeTab] ?? tabModifiers.combat;
      ui.activeSummary = ui.activeAttackModifiers.summary;
    }

    // hasPsychicPowers / hasMysticSpells: read from actor.items (always in sync;
    // actor.system derived arrays may lag after an item update, same as summons)
    this.modalData.ui.hasPsychicPowers = this.attackerActor.items.some(i => i.type === 'psychicPower');
    this.modalData.ui.hasMysticSpells = this.attackerActor.items.some(i => i.type === 'spell');

    this.modalData.config = ABFConfig;
    return this.modalData;
  }
  async _updateObject(event, formData) {
    // Skip merge if we're loading a preset (to prevent form data from overwriting preset values)
    if (this._loadingPreset) {
      this._loadingPreset = false;
      return;
    }

    if (formData.attacker?.attackAccumulation !== undefined) {
      formData.attacker.attackAccumulation =
        Math.max(1, parseInt(formData.attacker.attackAccumulation) || 1);
    }
    if (formData.attacker?.combat?.ataquePrincipal !== undefined) {
      formData.attacker.combat.ataquePrincipal =
        Math.max(1, parseInt(formData.attacker.combat.ataquePrincipal) || 1);
    }
    if (formData.attacker?.combat?.maniobras !== undefined) {
      formData.attacker.combat.maniobras =
        Math.max(0, parseInt(formData.attacker.combat.maniobras) || 0);
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
    const { combat, mystic, psychic, summon, attackAccumulation, withoutRoll, showRoll } = this.modalData.attacker;
    const isAttackAccumulation = (attackAccumulation ?? 1) > 1;

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
        enemyTAModifier: { value: combat.enemyTAModifier || 0 },
      },
      mystic: {
        modifier: { value: mystic.modifier || 0 },
        projectionType: { value: mystic.magicProjectionType || "normal" },
        spellUsed: { value: mystic.spellUsed || "" },
        spellGrade: { value: mystic.spellGrade || "base" },
        critic: { value: mystic.critic || "-" },
        damage: { value: mystic.damage || 0 },
        enemyTAModifier: { value: mystic.enemyTAModifier || 0 },
        consumeZeon: { value: mystic.consumeZeon ?? true },
        zeonMod: { value: mystic.zeonMod ?? 0 },
      },
      psychic: {
        modifier: { value: psychic.modifier || 0 },
        potentialBonus: { value: psychic.psychicPotential?.special || 0 },
        powerUsed: { value: psychic.powerUsed || "" },
        critic: { value: psychic.critic || "-" },
        damage: { value: psychic.damage || 0 },
        enemyTAModifier: { value: psychic.enemyTAModifier || 0 },
      },
      summon: {
        modifier: { value: summon?.modifier || 0 },
        summonUsed: { value: summon?.summonUsed || "" },
        critic: { value: summon?.critic || "impact" },
        enemyTAModifier: { value: summon?.enemyTAModifier || 0 },
        consumeZeon: { value: summon?.consumeZeon ?? true },
      },
    };

    await this.attackerActor.createEmbeddedDocuments("Item", [{
      name,
      type: "attackPreset",
      system: presetData,
    }]);

    ui.notifications.info(i18n.format("anima.notifications.presetSaved", { name }));
    this.render(false);
  }

  _applyModifiedShading(html) {
    // Number inputs: shade when value differs from default
    html.find('input[type="number"].input, input[type="number"].da-input').each((_, el) => {
      if (!el.name) return;
      const defVal = (el.name === 'attacker.attackAccumulation' || el.name === 'attacker.combat.ataquePrincipal') ? 1 : 0;
      el.classList.toggle('abf-input-modified', (parseFloat(el.value) || 0) !== defVal);
    });

    // Numeric selects (fatigue, CV points): shade when != 0
    ['attacker.combat.fatigueUsed', 'attacker.psychic.cvProyeccion', 'attacker.psychic.cvPotencial'].forEach(name => {
      html.find(`select[name="${name}"]`).each((_, el) => {
        el.classList.toggle('abf-input-modified', parseInt(el.value) !== 0);
      });
    });

    // Combat critic: shade when differs from weapon's primary damage type
    html.find('select[name="attacker.combat.criticSelected"]').each((_, el) => {
      const defaultCritic = this.modalData.attacker.combat.weapon?.system.critic.primary.value;
      el.classList.toggle('abf-input-modified', !!defaultCritic && el.value !== defaultCritic);
    });

    // Psychic critic: default is 'energy'
    html.find('select[name="attacker.psychic.critic"]').each((_, el) => {
      el.classList.toggle('abf-input-modified', el.value !== 'energy');
    });

    // Mystic / summon critics: default is none / '-'
    ['attacker.mystic.critic', 'attacker.summon.critic'].forEach(name => {
      html.find(`select[name="${name}"]`).each((_, el) => {
        const v = el.value;
        el.classList.toggle('abf-input-modified', !!v && v !== '-' && v !== 'none');
      });
    });
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
    attacker.attackAccumulation = Number(presetData.accumulationCount?.value) || 1;
    if (Boolean(presetData.isAccumulation?.value) && attacker.attackAccumulation <= 1) {
      attacker.attackAccumulation = 3;
    }

    // Load combat data
    if (presetData.combat) {
      attacker.combat.modifier = Number(presetData.combat.modifier?.value) || 0;
      attacker.combat.fatigueUsed = Number(presetData.combat.fatigueUsed?.value) || 0;
      attacker.combat.weaponUsed = presetData.combat.weaponUsed?.value || attacker.combat.weaponUsed;
      attacker.combat.criticSelected = presetData.combat.criticSelected?.value || undefined;
      attacker.combat.damage.special = Number(presetData.combat.damageBonus?.value) || 0;
      attacker.combat.enemyTAModifier = Number(presetData.combat.enemyTAModifier?.value) || 0;
    }

    // Load mystic data
    if (presetData.mystic) {
      attacker.mystic.modifier = Number(presetData.mystic.modifier?.value) || 0;
      attacker.mystic.magicProjectionType = presetData.mystic.projectionType?.value || "normal";
      attacker.mystic.spellUsed = presetData.mystic.spellUsed?.value || attacker.mystic.spellUsed;
      attacker.mystic.spellGrade = presetData.mystic.spellGrade?.value || "base";
      attacker.mystic.critic = presetData.mystic.critic?.value || "-";
      attacker.mystic.damage = Number(presetData.mystic.damage?.value) || 0;
      attacker.mystic.enemyTAModifier = Number(presetData.mystic.enemyTAModifier?.value) || 0;
      attacker.mystic.consumeZeon = presetData.mystic.consumeZeon?.value ?? true;
      attacker.mystic.zeonMod = Number(presetData.mystic.zeonMod?.value) || 0;
    }

    // Load psychic data
    if (presetData.psychic) {
      attacker.psychic.modifier = Number(presetData.psychic.modifier?.value) || 0;
      attacker.psychic.psychicPotential.special = Number(presetData.psychic.potentialBonus?.value) || 0;
      attacker.psychic.powerUsed = presetData.psychic.powerUsed?.value || attacker.psychic.powerUsed;
      attacker.psychic.critic = presetData.psychic.critic?.value || "-";
      attacker.psychic.damage = Number(presetData.psychic.damage?.value) || 0;
      attacker.psychic.enemyTAModifier = Number(presetData.psychic.enemyTAModifier?.value) || 0;
    }

    // Load summon data
    if (presetData.summon) {
      attacker.summon.modifier = Number(presetData.summon.modifier?.value) || 0;
      attacker.summon.summonUsed = presetData.summon.summonUsed?.value || attacker.summon.summonUsed;
      attacker.summon.critic = presetData.summon.critic?.value || "impact";
      attacker.summon.enemyTAModifier = Number(presetData.summon.enemyTAModifier?.value) || 0;
      attacker.summon.consumeZeon = presetData.summon.consumeZeon?.value ?? true;
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
