import { ABFSystemName } from '../../../animabf-guote.name.js';

export class ZeonCalculatorDialog extends FormApplication {
  static _perksCache = null;

  static async loadPerks() {
    if (ZeonCalculatorDialog._perksCache) return ZeonCalculatorDialog._perksCache;
    const res = await fetch(`systems/${ABFSystemName}/packs/metamagicPerks.json`);
    const all = await res.json();
    ZeonCalculatorDialog._perksCache = all
      .filter(p => p.levels.some(l => l.zeon_to_accumulate > 0 || l.zeon_reserve > 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
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
    this.modalData = {
      spells: [this._blankSpellRow()],
      fatigue: {
        pointsToUse: 0,
        bonusPerPoint: saved?.fatigueBonusPerPoint ?? 15
      },
      globalExtraAccumulate: 0,
      globalExtraReserve: 0
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
      selectedPerkLevels: []
    };
  }

  async getData() {
    const sys = this.actor.system;
    const actValue = sys.mystic?.act?.main?.final?.value ?? 0;
    const currentAccumulated = sys.mystic?.zeonAccumulated?.value ?? 0;
    const currentZeon = sys.mystic?.zeon?.value ?? 0;
    const zeonMax = sys.mystic?.zeon?.max ?? 0;
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

      return {
        ...row,
        spellName: spell?.name ?? '',
        baseZeon,
        rowAccumulate: baseZeon + perkAccumulate + (row.extraAccumulate || 0),
        rowReserve: perkReserve + (row.extraReserve || 0)
      };
    });

    const totalToAccumulate = spells.reduce((s, r) => s + r.rowAccumulate, 0)
      + (this.modalData.globalExtraAccumulate || 0);
    const totalFromReserve = spells.reduce((s, r) => s + r.rowReserve, 0)
      + (this.modalData.globalExtraReserve || 0);

    const { pointsToUse, bonusPerPoint } = this.modalData.fatigue;
    const fatigueBonus = (pointsToUse || 0) * (bonusPerPoint || 15);
    const thisRound = actValue + fatigueBonus;
    const remaining = Math.max(0, totalToAccumulate - currentAccumulated);

    let turnsNeeded;
    if (actValue === 0) {
      turnsNeeded = null;
    } else if (remaining === 0) {
      turnsNeeded = 0;
    } else if (remaining <= thisRound) {
      turnsNeeded = 1;
    } else {
      turnsNeeded = 1 + Math.ceil((remaining - thisRound) / actValue);
    }

    const canConfirm = actValue > 0;
    let confirmLabel;
    if (!canConfirm) {
      confirmLabel = game.i18n.localize('anima.ui.zeonCalc.confirm.noAct');
    } else if (turnsNeeded === 0) {
      confirmLabel = game.i18n.localize('anima.ui.zeonCalc.confirm.alreadyDone');
    } else if (turnsNeeded === 1) {
      confirmLabel = game.i18n.localize('anima.ui.zeonCalc.confirm.castNow');
    } else {
      confirmLabel = game.i18n.format('anima.ui.zeonCalc.confirm.accumulate', { turns: turnsNeeded });
    }

    return {
      actor: this.actor,
      actorSpells,
      perks: this.perks,
      spells,
      fatigue: this.modalData.fatigue,
      globalExtraAccumulate: this.modalData.globalExtraAccumulate || 0,
      globalExtraReserve: this.modalData.globalExtraReserve || 0,
      actValue,
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
      confirmLabel
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

    html.on('change', 'input, select', () => {
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

    html.find('[data-action="confirm"]').click(() => this._onConfirm(html));
  }

  _syncFromForm(html) {
    this.modalData.fatigue.pointsToUse =
      Number(html.find('[name="fatigue.pointsToUse"]').val()) || 0;
    this.modalData.fatigue.bonusPerPoint =
      Number(html.find('[name="fatigue.bonusPerPoint"]').val()) || 15;
    this.modalData.globalExtraAccumulate =
      Number(html.find('[name="globalExtraAccumulate"]').val()) || 0;
    this.modalData.globalExtraReserve =
      Number(html.find('[name="globalExtraReserve"]').val()) || 0;

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

      return { ...row, spellId, grade, extraAccumulate, extraReserve, comment, selectedPerkLevels };
    });
  }

  async _onConfirm(html) {
    this._syncFromForm(html);
    const computed = await this.getData();

    await this.actor.update({
      'system.macroCookies.zeonCalculator.fatigueBonusPerPoint': computed.fatigue.bonusPerPoint
    });

    const content = this._buildChatContent(computed);
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    ChatMessage.create({
      content,
      whisper: ChatMessage.getWhisperRecipients('GM'),
      speaker
    });

    const updateData = {};
    const fatigueVal = this.actor.system.characteristics.secondaries.fatigue.value;
    updateData['system.characteristics.secondaries.fatigue.value'] =
      Math.max(0, fatigueVal - computed.fatigue.pointsToUse);

    if (computed.turnsNeeded <= 1 && computed.turnsNeeded !== null) {
      updateData['system.mystic.zeon.value'] =
        Math.max(0, computed.currentZeon - (computed.totalToAccumulate + computed.totalFromReserve));
      updateData['system.mystic.zeonAccumulated.value'] = 0;
    } else {
      const addedThisTurn = Math.min(computed.thisRound, computed.remaining);
      updateData['system.mystic.zeonAccumulated.value'] =
        computed.currentAccumulated + addedThisTurn;
    }

    await this.actor.update(updateData);
    this.close();
  }

  _buildChatContent(computed) {
    const lines = [];
    lines.push(`<b>═══ ${game.i18n.localize('anima.ui.zeonCalc.title')} — ${this.actor.name} ═══</b>`);
    lines.push(
      `${game.i18n.localize('anima.ui.zeonCalc.header.act')}: <b>${computed.actValue}</b> &nbsp;|&nbsp; ` +
      `${game.i18n.localize('anima.ui.zeonCalc.header.accumulated')}: <b>${computed.currentAccumulated}</b> &nbsp;|&nbsp; ` +
      `${game.i18n.localize('anima.ui.zeonCalc.header.reserve')}: <b>${computed.currentZeon}/${computed.zeonMax}</b>`
    );
    lines.push('<hr style="margin:0.3rem 0">');

    for (const row of computed.spells) {
      const hasContent = row.spellId || row.extraAccumulate || row.extraReserve || row.selectedPerkLevels.length;
      if (!hasContent) continue;

      lines.push(`<b>${row.spellName || '(sin conjuro)'}</b> (${row.grade}): ${row.baseZeon} Ze base`);

      for (const sel of row.selectedPerkLevels) {
        const perk  = this.perks[sel.perkIndex];
        const level = perk?.levels[sel.levelIndex];
        if (!perk || !level) continue;
        const costStr = level.zeon_to_accumulate
          ? `+${level.zeon_to_accumulate} acum`
          : `+${level.zeon_reserve} reserva`;
        lines.push(`&nbsp;&nbsp;↳ Metamagia: ${perk.name} — ${level.name} (${costStr})`);
      }

      if (row.extraAccumulate) lines.push(`&nbsp;&nbsp;↳ Extra acumulado: +${row.extraAccumulate}`);
      if (row.extraReserve)    lines.push(`&nbsp;&nbsp;↳ Extra reserva: +${row.extraReserve}`);
      if (row.comment)         lines.push(`&nbsp;&nbsp;↳ Nota: <i>${row.comment}</i>`);
      lines.push(`&nbsp;&nbsp;<i>Subtotal: ${row.rowAccumulate} acum / ${row.rowReserve} reserva</i>`);
    }

    lines.push('<hr style="margin:0.3rem 0">');

    if (computed.fatigue.pointsToUse > 0) {
      lines.push(
        `Cansancio: ${computed.fatigue.pointsToUse} pts × +${computed.fatigue.bonusPerPoint} = <b>+${computed.fatigueBonus} Ze</b> extra este turno`
      );
    }
    if (computed.globalExtraAccumulate || computed.globalExtraReserve) {
      lines.push(
        `Modificadores globales: +${computed.globalExtraAccumulate} acum / +${computed.globalExtraReserve} reserva`
      );
    }

    lines.push(`<b>Total a acumular: ${computed.totalToAccumulate}</b>`);
    if (computed.totalFromReserve > 0) {
      lines.push(`<b>Total de reserva: ${computed.totalFromReserve}</b>`);
    }
    lines.push(`Turno actual: ${computed.actValue} + ${computed.fatigueBonus} = <b>${computed.thisRound}</b>`);

    const turnsDisplay = computed.turnsNeeded === null ? '—'
      : computed.turnsNeeded === 0 ? '✓ (ya acumulado)'
      : `${computed.turnsNeeded}`;
    lines.push(`<b>Turnos necesarios: ${turnsDisplay}</b>`);

    return lines.join('<br>');
  }
}
