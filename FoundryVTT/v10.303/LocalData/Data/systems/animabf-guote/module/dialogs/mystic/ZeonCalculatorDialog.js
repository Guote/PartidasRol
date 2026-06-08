import { ABFSystemName } from '../../../animabf-guote.name.js';
import { ABFItems } from '../../items/ABFItems.js';
import { SPELL_MAINTENANCE_INITIAL_SYSTEM } from '../../types/mystic/SpellMaintenanceItemConfig.js';

export async function upsertSpellMaintenance(actor, { spellId, spellName, grade, maintenanceCost, hasDailyMaintenance }) {
  const maintenances = actor.system?.mystic?.spellMaintenances ?? [];
  const existing = spellId
    ? maintenances.find(m => m.system?.spellId?.value === spellId && m.system?.grade?.value === grade)
    : null;

  if (existing) {
    await actor.updateInnerItem({
      type: ABFItems.SPELL_MAINTENANCE,
      id: existing._id,
      system: { ...existing.system, active: { value: true } }
    });
  } else {
    await actor.createInnerItem({
      type: ABFItems.SPELL_MAINTENANCE,
      name: spellName,
      system: {
        ...SPELL_MAINTENANCE_INITIAL_SYSTEM,
        spellId:      { value: spellId ?? '' },
        grade:        { value: grade },
        roundCost:    { value: hasDailyMaintenance ? 0 : maintenanceCost },
        cost:         { value: hasDailyMaintenance ? maintenanceCost : 0 },
        active:       { value: true },
      }
    });
  }
}

export class ZeonCalculatorDialog extends FormApplication {
  static _perksCache = null;

  static async loadPerks() {
    if (ZeonCalculatorDialog._perksCache) return ZeonCalculatorDialog._perksCache;
    const res = await fetch(`systems/${ABFSystemName}/packs/metamagicPerks.json`);
    const all = await res.json();
    ZeonCalculatorDialog._perksCache = all
      .filter(p => p.levels.some(l => l.zeon_to_accumulate > 0 || l.zeon_reserve > 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    return ZeonCalculatorDialog._perksCache;
  }

  static async openForActor(actor) {
    const perks = await ZeonCalculatorDialog.loadPerks();
    const dlg = new ZeonCalculatorDialog(actor, perks);
    dlg.render(true);
    return dlg;
  }

  constructor(actor, perks, options = {}) {
    super({}, options);
    this.actor = actor;
    this.perks = perks;
    this._openDetailsIds = new Set();
    this._lastActMain = 0;
    this._lastActAlt = 0;
    this._initModalData();
    this._actorUpdateHandler = (updatedActor) => {
      if (updatedActor.id === this.actor.id) this.render(false);
    };
    Hooks.on('updateActor', this._actorUpdateHandler);
  }

  async close(...args) {
    Hooks.off('updateActor', this._actorUpdateHandler);
    return super.close(...args);
  }

  get title() {
    return `${game.i18n.localize('anima.ui.zeonCalc.title')} — ${this.actor?.name ?? ''}`;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'zeon-calculator',
      classes: ['abf', 'zeon-calculator-dialog'],
      template: `systems/${ABFSystemName}/templates/dialog/mystic/zeon-calculator-dialog.hbs`,
      title: game.i18n.localize('anima.ui.zeonCalc.title'),
      width: 450,
      height: 'auto',
      resizable: true,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  _initModalData() {
    const saved = this.actor.system?.macroCookies?.zeonCalculator;
    const savedBonus = saved?.fatigueBonusPerPoint ?? 15;
    this.modalData = {
      spells: [this._blankSpellRow()],
      fatigue: {
        pointsToUse: 0,
        bonusPerPoint: savedBonus
      },
      fatigueBonusPerPointDefault: savedBonus,
      actModifier: 0,
      actChoice: 'main',
      accumulationType: 'pure',
      castThisRound: null,
      holdThisRound: false,
      halfAct: false
    };
  }

  _blankSpellRow() {
    return {
      id: foundry.utils.randomID(),
      spellId: '',
      grade: 'base',
      extraAccumulate: 0,
      extraReserve: 0,
      castear: true,
      selectedPerkLevels: [],
      addToActiveSpells: false,
      quantity: 1
    };
  }

  async getData() {
    const sys = this.actor.system;
    const actMainRaw = sys.mystic?.act?.main?.final?.value ?? 0;
    const actAltRaw = sys.mystic?.act?.alternative?.final?.value ?? 0;
    if (actMainRaw > 0) this._lastActMain = actMainRaw;
    if (actAltRaw > 0) this._lastActAlt = actAltRaw;
    const actMainValue = actMainRaw > 0 ? actMainRaw : this._lastActMain;
    const actAltValue = actAltRaw > 0 ? actAltRaw : this._lastActAlt;
    const actChoice = this.modalData.actChoice ?? 'main';
    const actBase = actChoice === 'none' ? 0 : (actChoice === 'alternative' ? actAltValue : actMainValue);
    const actModifier = this.modalData.actModifier || 0;
    const halfAct = this.modalData.halfAct;
    const actFinal = (halfAct ? Math.floor(actBase / 2) : actBase) + actModifier;
    const currentAccumulated = sys.mystic?.zeonAccumulated?.value ?? 0;
    const currentZeon = sys.mystic?.zeon?.value ?? 0;
    const zeonMax = sys.mystic?.zeon?.max ?? 0;
    const currentFatigue = sys.characteristics?.secondaries?.fatigue?.value ?? 0;
    const maxFatigue = sys.characteristics?.secondaries?.fatigue?.max ?? 0;
    const actorSpells = this.actor.items.filter(i => i.type === 'spell');

    const spells = this.modalData.spells.map(row => {
      const spell = actorSpells.find(s => s.id === row.spellId);
      const baseZeon = spell?.system?.grades?.[row.grade]?.zeon?.value ?? 0;

      const perkAccumulate = row.selectedPerkLevels.reduce((sum, sel) => {
        return sum + (this.perks[sel.perkIndex]?.levels[sel.levelIndex]?.zeon_to_accumulate ?? 0);
      }, 0);
      const perkReserve = row.selectedPerkLevels.reduce((sum, sel) => {
        return sum + (this.perks[sel.perkIndex]?.levels[sel.levelIndex]?.zeon_reserve ?? 0);
      }, 0);

      const rowMaintenanceCost = spell?.system?.grades?.[row.grade]?.maintenanceCost?.value ?? 0;
      const rowHasDailyMaintenance = spell?.system?.hasDailyMaintenance?.value ?? false;

      return {
        ...row,
        castear: row.castear !== false,
        spellName: spell?.name ?? '',
        baseZeon,
        rowAccumulate: baseZeon + perkAccumulate + (row.extraAccumulate || 0),
        rowReserve: perkReserve + (row.extraReserve || 0),
        rowMaintenanceCost,
        rowHasDailyMaintenance,
        rowIsUpkeepable: rowMaintenanceCost > 0 || rowHasDailyMaintenance,
        quantity: row.quantity ?? 1
      };
    });

    const heldSpellMaints = (this.actor.system?.mystic?.spellMaintenances ?? [])
      .filter(m => m.system?.active?.value !== false && m.name?.startsWith('Aguantando:'));
    const heldSpellRows = heldSpellMaints.map(m => {
      const spell = actorSpells.find(s => s.id === m.system?.spellId?.value);
      const grade = m.system?.grade?.value ?? 'base';
      const zeonCost = spell?.system?.grades?.[grade]?.zeon?.value ?? 0;
      return { name: m.name.replace('Aguantando: ', ''), grade, zeonCost };
    });
    const heldZeonTotal = heldSpellRows.reduce((s, r) => s + r.zeonCost, 0);

    const activeRows = spells.filter(r => r.castear);
    const totalToAccumulate = activeRows.reduce((s, r) => s + r.rowAccumulate * (r.quantity ?? 1), 0) + heldZeonTotal;
    const totalFromReserve = activeRows.reduce((s, r) => s + r.rowReserve * (r.quantity ?? 1), 0);

    const { pointsToUse, bonusPerPoint } = this.modalData.fatigue;
    const fatigueBonus = (pointsToUse || 0) * (bonusPerPoint || 15);
    const thisRound = actFinal + fatigueBonus;
    const remaining = Math.max(0, totalToAccumulate - currentAccumulated);

    let turnsNeeded;
    if (actFinal === 0) {
      turnsNeeded = null;
    } else if (remaining <= thisRound) {
      turnsNeeded = 0;
    } else {
      turnsNeeded = Math.ceil((remaining - thisRound) / actFinal);
    }

    const isPure = this.modalData.accumulationType === 'pure';
    const canConfirm = true;
    // pure: accumulate full ACT (may overshoot — leftover subject to penalty on cast)
    // specific: cap at remaining so accumulated never exceeds target
    const accumulatedToAdd = actFinal > 0 ? (isPure ? thisRound : Math.min(thisRound, remaining)) : 0;
    const castThisRoundReadonly = turnsNeeded !== 0;
    const castThisRound = turnsNeeded === 0 && this.modalData.castThisRound !== false;
    const leftover = castThisRound
      ? Math.max(0, currentAccumulated + accumulatedToAdd - totalToAccumulate)
      : 0;
    const cleanupPenalty = isPure && leftover > 0 ? -10 : 0;
    const poderValue = sys.characteristics?.primaries?.power?.value ?? 0;
    const holdRounds = !isPure ? poderValue : null;
    const canHold = !isPure && turnsNeeded === 0;
    const holdThisRound = canHold && (this.modalData.holdThisRound ?? false);

    const finalAccumulated = castThisRound ? leftover : (currentAccumulated + accumulatedToAdd);
    const zeonDeductIfCasting = castThisRound ? (totalToAccumulate + totalFromReserve) : 0;
    const finalZeon = Math.max(0, currentZeon - zeonDeductIfCasting);
    const finalFatigue = Math.max(0, currentFatigue - (pointsToUse || 0));

    const gradeLabels = {
      base:         game.i18n.localize('anima.ui.mystic.spell.grade.base.title'),
      intermediate: game.i18n.localize('anima.ui.mystic.spell.grade.intermediate.title'),
      advanced:     game.i18n.localize('anima.ui.mystic.spell.grade.advanced.title'),
      arcane:       game.i18n.localize('anima.ui.mystic.spell.grade.arcane.title'),
    };
    const activeSpellsToAdd = spells.filter(r =>
      r.castear && r.addToActiveSpells && r.rowMaintenanceCost > 0 && r.spellId
    ).map(r => ({ spellName: r.spellName, gradeLabel: gradeLabels[r.grade] ?? r.grade }));

    return {
      actor: this.actor,
      actorSpells,
      perks: this.perks,
      spells,
      fatigue: this.modalData.fatigue,
      fatigueBonusPerPointDefault: this.modalData.fatigueBonusPerPointDefault ?? 15,
      actMainValue,
      actAltValue,
      actBase,
      actModifier,
      actFinal,
      halfAct,
      actChoice,
      accumulationType: this.modalData.accumulationType,
      currentAccumulated,
      currentZeon,
      zeonMax,
      totalToAccumulate,
      totalFromReserve,
      fatigueBonus,
      thisRound,
      remaining,
      turnsNeeded,
      canConfirm,
      canDuplicate: this.modalData.spells.length > 0,
      accumulatedToAdd,
      currentFatigue,
      finalZeon,
      finalAccumulated,
      finalFatigue,
      isPure,
      castThisRound,
      castThisRoundChecked: castThisRound,
      castThisRoundReadonly,
      leftover,
      cleanupPenalty,
      holdRounds,
      heldSpellRows,
      heldSpellMaints,
      canHold,
      holdThisRound,
      activeSpellsToAdd,
      maxFatigue
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('input, textarea').on('focus', function () { this.select(); });

    // Restore open state of perk accordions after each re-render
    html.find('.zc-perks-details').each((_, el) => {
      const rowId = el.closest('[data-row-id]')?.dataset.rowId;
      if (rowId && this._openDetailsIds.has(rowId)) el.open = true;
    });

    html.find('.zc-perks-details').on('toggle', ev => {
      const el = ev.currentTarget;
      const rowId = el.closest('[data-row-id]')?.dataset.rowId;
      if (!rowId) return;
      if (el.open) this._openDetailsIds.add(rowId);
      else this._openDetailsIds.delete(rowId);
    });

    html.on('change', '[data-actor-update]', async ev => {
      const field = ev.currentTarget.dataset.actorUpdate;
      const value = Number(ev.currentTarget.value) || 0;
      await this.actor.update({ [field]: value });
      this.render(false);
    });

    html.on('change', 'input:not([data-actor-update]), select', () => {
      this._syncFromForm(html);
      this.render(false);
    });

    html.find('[data-action="open-spell-sheet"]').click(ev => {
      const spellId = ev.currentTarget.dataset.spellId;
      if (!spellId) return;
      this.actor.items.get(spellId)?.sheet.render(true);
    });

    html.find('[data-action="add-spell"]').click(() => {
      this.modalData.spells.push(this._blankSpellRow());
      this.render(false);
    });

    html.find('[data-action="duplicate-spell"]').click(() => {
      const last = this.modalData.spells.at(-1);
      if (!last) return;
      this.modalData.spells.push({
        ...foundry.utils.deepClone(last),
        id: foundry.utils.randomID(),
        comment: '',
        quantity: 1
      });
      this.render(false);
    });

    html.find('[data-action="remove-spell"]').click(ev => {
      const rowEl = ev.currentTarget.closest('[data-row-id]');
      if (!rowEl) return;
      const id = rowEl.dataset.rowId;
      if (this.modalData.spells.length <= 1) return;
      this.modalData.spells = this.modalData.spells.filter(r => r.id !== id);
      this.render(false);
    });

    html.find('[data-action="clear"]').click(() => {
      this._initModalData();
      this.render(false);
    });

    html.find('[data-action="confirm"]').click(() => this._onConfirm(html));

  }

  _syncFromForm(html) {
    this.modalData.fatigue.pointsToUse =
      Number(html.find('[name="fatigue.pointsToUse"]').val()) || 0;
    this.modalData.fatigue.bonusPerPoint =
      Number(html.find('[name="fatigue.bonusPerPoint"]').val()) || 15;
    this.modalData.actModifier =
      Number(html.find('[name="actModifier"]').val()) || 0;
    this.modalData.actChoice =
      html.find('[name="actChoice"]:checked').val() ?? 'main';
    this.modalData.accumulationType =
      html.find('[name="accumulationType"]:checked').val() ?? 'pure';
    const castThisRoundEl = html.find('[name="castThisRound"]');
    if (!castThisRoundEl.prop('disabled')) {
      this.modalData.castThisRound = castThisRoundEl.prop('checked') === true;
    }
    this.modalData.halfAct =
      html.find('[name="halfAct"]').prop('checked') === true;
    const holdEl = html.find('[name="holdThisRound"]');
    if (holdEl.length) {
      this.modalData.holdThisRound = holdEl.prop('checked') === true;
    }

    this.modalData.spells = this.modalData.spells.map(row => {
      const p = `spell.${row.id}`;
      const spellId = html.find(`[name="${p}.spellId"]`).val() ?? row.spellId;
      const grade   = html.find(`[name="${p}.grade"]`).val() ?? row.grade;
      const extraAccumulate = Number(html.find(`[name="${p}.extraAccumulate"]`).val()) || 0;
      const extraReserve    = Number(html.find(`[name="${p}.extraReserve"]`).val()) || 0;
      const castearEl = html.find(`[name="${p}.castear"]`);
      const castear = castearEl.length ? castearEl.prop('checked') : (row.castear ?? true);
      const selectedPerkLevels = [];
      html.find(`input[type="checkbox"][name^="${p}.perk."]`).each(function () {
        if (!this.checked) return;
        const parts = this.name.split('.');
        const perkIndex  = Number(parts[parts.length - 2]);
        const levelIndex = Number(parts[parts.length - 1]);
        selectedPerkLevels.push({ perkIndex, levelIndex });
      });

      const addToActiveSpells = html.find(`[name="${p}.addToActiveSpells"]`).prop('checked') === true;
      const quantity = Math.max(1, Number(html.find(`[name="${p}.quantity"]`).val()) || 1);

      return { ...row, spellId, grade, extraAccumulate, extraReserve, castear, selectedPerkLevels, addToActiveSpells, quantity };
    });
  }

  async _onConfirm(html) {
    // Unhook before any awaited updates to prevent stale re-renders while closing
    Hooks.off('updateActor', this._actorUpdateHandler);
    this._syncFromForm(html);
    const computed = await this.getData();

    await this.actor.update({
      'system.macroCookies.zeonCalculator.fatigueBonusPerPoint': computed.fatigue.bonusPerPoint
    });

    const updateData = {};

    if (computed.fatigue.pointsToUse > 0) {
      updateData['system.characteristics.secondaries.fatigue.value'] = computed.finalFatigue;
    }

    if (computed.holdThisRound) {
      // Hold: accumulate this round but do not cast; mark spells as held
      if (computed.accumulatedToAdd > 0) {
        updateData['system.mystic.zeonAccumulated.value'] = computed.finalAccumulated;
      }
    } else if (computed.castThisRound) {
      // Casting: deduct spell cost from reserve, set accumulated to leftover
      updateData['system.mystic.zeon.value'] = computed.finalZeon;
      updateData['system.mystic.zeonAccumulated.value'] = computed.leftover;
    } else if (computed.accumulatedToAdd > 0) {
      updateData['system.mystic.zeonAccumulated.value'] = computed.finalAccumulated;
    }

    if (Object.keys(updateData).length > 0) await this.actor.update(updateData);

    if (computed.holdThisRound) {
      // Create "Aguantando:" SPELL_MAINTENANCE items for each active spell row not already held
      for (const row of computed.spells) {
        if (!row.castear || !row.spellId) continue;
        const alreadyHeld = computed.heldSpellMaints.some(
          m => m.system?.spellId?.value === row.spellId && m.system?.grade?.value === row.grade
        );
        if (!alreadyHeld) {
          await this.actor.createInnerItem({
            type: ABFItems.SPELL_MAINTENANCE,
            name: `Aguantando: ${row.spellName}`,
            system: {
              ...SPELL_MAINTENANCE_INITIAL_SYSTEM,
              spellId:   { value: row.spellId },
              grade:     { value: row.grade },
              roundCost: { value: 1 },
              active:    { value: true },
            }
          });
        }
      }
    } else if (computed.castThisRound) {
      await this.actor.update({
        'system.macroCookies.pendingZeonCleanup': {
          isPure: computed.isPure,
          leftover: computed.leftover
        }
      });
      // Deactivate "Aguantando:" maintenance items for spells that were just cast
      for (const row of computed.spells) {
        if (!row.castear || !row.spellId) continue;
        const held = (this.actor.system?.mystic?.spellMaintenances ?? [])
          .find(m => m.name?.startsWith('Aguantando:')
                  && m.system?.spellId?.value === row.spellId
                  && m.system?.grade?.value === row.grade);
        if (held) {
          const inst = this.actor.items.get(held._id);
          if (inst) await inst.update({ 'system.active.value': false });
        }
      }
      if (!game.combat?.active) {
        const penalty = computed.cleanupPenalty;
        const cleanUpdate = { 'system.mystic.zeonAccumulated.value': 0 };
        if (penalty !== 0)
          cleanUpdate['system.mystic.zeon.value'] = Math.max(0, this.actor.system.mystic.zeon.value + penalty);
        await this.actor.update(cleanUpdate);
        await this.actor.update({ 'system.macroCookies.pendingZeonCleanup': null });
      }
    }

    for (const row of computed.spells) {
      if (row.castear && row.addToActiveSpells && row.rowMaintenanceCost > 0 && row.spellId) {
        await upsertSpellMaintenance(this.actor, {
          spellId: row.spellId,
          spellName: row.spellName,
          grade: row.grade,
          maintenanceCost: row.rowMaintenanceCost,
          hasDailyMaintenance: row.rowHasDailyMaintenance,
        });
      }
    }

    this._sendGMWhisper(computed);
    this.close();
  }

  _sendGMWhisper(computed) {
    const tokenName = this.actor.getActiveTokens()[0]?.name ?? this.actor.name;

    // black bold + colored shadow — works in Foundry chat (color:#000 is static, shadow uses CSS var)
    const sv = (content, cssVar) =>
      `<b style="color:#000;text-shadow:0 0 6px ${cssVar}">${content}</b>`;

    // --- Group spells once (reused for action line and details) ---
    const activeRows = computed.spells.filter(r => r.castear && r.spellId);
    const groupMap = new Map();
    for (const row of activeRows) {
      const sortedPerks = [...(row.selectedPerkLevels ?? [])].sort(
        (a, b) => a.perkIndex !== b.perkIndex ? a.perkIndex - b.perkIndex : a.levelIndex - b.levelIndex
      );
      const key = JSON.stringify([row.spellId, row.grade, sortedPerks, row.extraAccumulate ?? 0, row.extraReserve ?? 0]);
      const existing = groupMap.get(key);
      if (existing) existing.quantity += row.quantity ?? 1;
      else groupMap.set(key, { ...row, quantity: row.quantity ?? 1 });
    }
    const grouped = [...groupMap.values()];

    // --- Line 1: deltas + resource indicators (colored glow) ---
    const summaryParts = [];
    const accSign = computed.accumulatedToAdd >= 0 ? '+' : '';
    summaryParts.push(
      `<b>${accSign}${computed.accumulatedToAdd}</b> ${sv('<i class="fas fa-hat-wizard"></i>ACUM', 'var(--abf-zeon)')}`
    );
    if (computed.castThisRound) {
      const reserveDelta = computed.finalZeon - computed.currentZeon;
      const resSign = reserveDelta >= 0 ? '+' : '';
      summaryParts.push(
        `<b>${resSign}${reserveDelta}</b> ${sv('<i class="fas fa-hat-wizard"></i>', 'var(--abf-zeon)')}`
      );
    }
    if (computed.fatigue.pointsToUse > 0) {
      summaryParts.push(
        `<b>-${computed.fatigue.pointsToUse}</b> ${sv('<i class="fas fa-bolt"></i>', 'var(--abf-fatigue)')}`
      );
    }
    const headerLine = `${tokenName} acumula: ${summaryParts.join(' | ')}`;

    // --- Line 2: action (Lanza / Aguanta) ---
    let actionLine = '';
    if (grouped.length > 0 && (computed.castThisRound || computed.holdThisRound)) {
      const verb = computed.holdThisRound ? 'Aguanta' : 'Lanza';
      const spellParts = grouped.map(r => {
        const perkNames = (r.selectedPerkLevels ?? []).map(sel => this.perks[sel.perkIndex]?.name ?? '').filter(Boolean);
        return `<b>${r.quantity}x</b> <b>${r.spellName}</b> (${[r.grade, ...perkNames].join(', ')})`;
      });
      actionLine = `${verb}: ${spellParts.join(', ')}`;
    }

    // --- Details accordion (closed by default) ---
    const detailLines = [];
    const currentValParts = [
      sv(`${computed.finalAccumulated} <i class="fas fa-hat-wizard"></i>ACUM`, 'var(--abf-zeon)')
    ];
    if (computed.castThisRound) {
      currentValParts.push(sv(`${computed.finalZeon}/${computed.zeonMax} <i class="fas fa-hat-wizard"></i>`, 'var(--abf-zeon)'));
    }
    if (computed.fatigue.pointsToUse > 0) {
      currentValParts.push(sv(`${computed.finalFatigue}/${computed.maxFatigue} <i class="fas fa-bolt"></i>`, 'var(--abf-fatigue)'));
    }
    detailLines.push(currentValParts.join(' | '));

    for (const r of grouped) {
      const perkNames = (r.selectedPerkLevels ?? []).map(sel => this.perks[sel.perkIndex]?.name ?? '').filter(Boolean);
      const label = [r.grade, ...perkNames].join(', ');
      const cost = r.rowAccumulate * r.quantity;
      const prefix = r.quantity > 1 ? `${r.quantity}× ` : '';
      detailLines.push(`- ${prefix}${r.spellName} (${label}) — ${cost}`);
    }

    const detailsHtml = `<details><summary>Detalles</summary><small>${detailLines.join('<br>')}</small></details>`;
    const content = [headerLine, actionLine].filter(Boolean).join('<br>') + '<br>' + detailsHtml;
    ChatMessage.create({
      content,
      whisper: ChatMessage.getWhisperRecipients('GM').map(u => u.id),
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }
}
