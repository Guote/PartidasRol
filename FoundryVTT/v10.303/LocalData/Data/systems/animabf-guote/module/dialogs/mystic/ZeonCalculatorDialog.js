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
      useAlternativeAct: false,
      accumulationType: 'pure',
      castThisRound: false,
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
      comment: '',
      selectedPerkLevels: [],
      addToActiveSpells: false
    };
  }

  async getData() {
    const sys = this.actor.system;
    const actMainValue = sys.mystic?.act?.main?.final?.value ?? 0;
    const actAltValue = sys.mystic?.act?.alternative?.final?.value ?? 0;
    const actBase = this.modalData.useAlternativeAct ? actAltValue : actMainValue;
    const actModifier = this.modalData.actModifier || 0;
    const halfAct = this.modalData.halfAct;
    const actFinal = (halfAct ? Math.floor(actBase / 2) : actBase) + actModifier;
    const currentAccumulated = sys.mystic?.zeonAccumulated?.value ?? 0;
    const currentZeon = sys.mystic?.zeon?.value ?? 0;
    const zeonMax = sys.mystic?.zeon?.max ?? 0;
    const currentFatigue = sys.characteristics?.secondaries?.fatigue?.value ?? 0;
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
        spellName: spell?.name ?? '',
        baseZeon,
        rowAccumulate: baseZeon + perkAccumulate + (row.extraAccumulate || 0),
        rowReserve: perkReserve + (row.extraReserve || 0),
        rowMaintenanceCost,
        rowHasDailyMaintenance
      };
    });

    const totalToAccumulate = spells.reduce((s, r) => s + r.rowAccumulate, 0);
    const totalFromReserve = spells.reduce((s, r) => s + r.rowReserve, 0);

    const { pointsToUse, bonusPerPoint } = this.modalData.fatigue;
    const fatigueBonus = (pointsToUse || 0) * (bonusPerPoint || 15);
    const thisRound = actFinal + fatigueBonus;
    const remaining = Math.max(0, totalToAccumulate - currentAccumulated);

    let turnsNeeded;
    if (actFinal === 0) {
      turnsNeeded = null;
    } else if (remaining === 0) {
      turnsNeeded = 0;
    } else if (remaining <= thisRound) {
      turnsNeeded = 1;
    } else {
      turnsNeeded = 1 + Math.ceil((remaining - thisRound) / actFinal);
    }

    const isPure = this.modalData.accumulationType === 'pure';
    const canConfirm = true;
    // pure: accumulate full ACT (may overshoot — leftover subject to penalty on cast)
    // specific: cap at remaining so accumulated never exceeds target
    const accumulatedToAdd = actFinal > 0 ? (isPure ? thisRound : Math.min(thisRound, remaining)) : 0;
    const castThisRound = this.modalData.castThisRound && (turnsNeeded !== null && turnsNeeded <= 1);
    const leftover = castThisRound
      ? Math.max(0, currentAccumulated + accumulatedToAdd - totalToAccumulate)
      : 0;
    const cleanupPenalty = isPure && leftover > 0 ? -10 : 0;
    const poderValue = sys.characteristics?.primaries?.power?.value ?? 0;
    const holdRounds = !isPure ? poderValue : null;

    const finalAccumulated = castThisRound ? leftover : (currentAccumulated + accumulatedToAdd);
    const zeonDeductIfCasting = castThisRound ? (totalToAccumulate + totalFromReserve) : 0;
    const finalZeon = Math.max(0, currentZeon - zeonDeductIfCasting);
    const finalFatigue = Math.max(0, currentFatigue - (pointsToUse || 0));

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
      useAlternativeAct: this.modalData.useAlternativeAct,
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
      leftover,
      cleanupPenalty,
      holdRounds
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

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
        comment: ''
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
    this.modalData.useAlternativeAct =
      html.find('[name="useAlternativeAct"]:checked').val() === 'true';
    this.modalData.accumulationType =
      html.find('[name="accumulationType"]:checked').val() ?? 'pure';
    this.modalData.castThisRound =
      html.find('[name="castThisRound"]').prop('checked') === true;
    this.modalData.halfAct =
      html.find('[name="halfAct"]').prop('checked') === true;

    this.modalData.spells = this.modalData.spells.map(row => {
      const p = `spell.${row.id}`;
      const spellId = html.find(`[name="${p}.spellId"]`).val() ?? row.spellId;
      const grade   = html.find(`[name="${p}.grade"]`).val() ?? row.grade;
      const extraAccumulate = Number(html.find(`[name="${p}.extraAccumulate"]`).val()) || 0;
      const extraReserve    = Number(html.find(`[name="${p}.extraReserve"]`).val()) || 0;
      const comment = html.find(`[name="${p}.comment"]`).val() ?? '';

      const selectedPerkLevels = [];
      html.find(`input[type="checkbox"][name^="${p}.perk."]`).each(function () {
        if (!this.checked) return;
        const parts = this.name.split('.');
        const perkIndex  = Number(parts[parts.length - 2]);
        const levelIndex = Number(parts[parts.length - 1]);
        selectedPerkLevels.push({ perkIndex, levelIndex });
      });

      const addToActiveSpells = html.find(`[name="${p}.addToActiveSpells"]`).prop('checked') === true;

      return { ...row, spellId, grade, extraAccumulate, extraReserve, comment, selectedPerkLevels, addToActiveSpells };
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

    if (computed.castThisRound) {
      // Casting: deduct spell cost from reserve, set accumulated to leftover
      updateData['system.mystic.zeon.value'] = computed.finalZeon;
      updateData['system.mystic.zeonAccumulated.value'] = computed.leftover;
    } else if (computed.accumulatedToAdd > 0) {
      updateData['system.mystic.zeonAccumulated.value'] = computed.finalAccumulated;
    }

    if (Object.keys(updateData).length > 0) await this.actor.update(updateData);

    if (computed.castThisRound) {
      await this.actor.update({
        'system.macroCookies.pendingZeonCleanup': {
          isPure: computed.isPure,
          leftover: computed.leftover
        }
      });
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
      if (row.addToActiveSpells && row.rowMaintenanceCost > 0 && row.spellId) {
        await upsertSpellMaintenance(this.actor, {
          spellId: row.spellId,
          spellName: row.spellName,
          grade: row.grade,
          maintenanceCost: row.rowMaintenanceCost,
          hasDailyMaintenance: row.rowHasDailyMaintenance,
        });
      }
    }

    this.close();
  }
}
