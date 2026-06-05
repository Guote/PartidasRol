import { ABFSystemName } from '../../../animabf-guote.name.js';
import { ABFItems } from '../../items/ABFItems.js';
import { KI_MAINTENANCE_INITIAL_SYSTEM } from '../../types/domine/KiMaintenanceItemConfig.js';

export const KI_STATS = ['agility', 'constitution', 'dexterity', 'strength', 'power', 'willPower'];
const STAT_LABELS = { agility: 'AGI', constitution: 'CON', dexterity: 'DES', strength: 'FUE', power: 'POD', willPower: 'VOL' };
const STAT_SHORT  = { agility: 'Agi', constitution: 'Con', dexterity: 'Des', strength: 'Fue', power: 'Pod', willPower: 'Vol' };

export class KiCalculatorDialog extends FormApplication {
  static async openForActor(actor) {
    const dlg = new KiCalculatorDialog(actor);
    dlg.render(true);
    return dlg;
  }

  constructor(actor, options = {}) {
    super({}, options);
    this.actor = actor;
    this._lastAccRate = { agility: 0, constitution: 0, dexterity: 0, strength: 0, power: 0, willPower: 0 };
    this._accordionOpen = false;
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
    return `Ki — ${this.actor?.name ?? ''}`;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ki-calculator',
      classes: ['abf', 'ki-calculator-dialog'],
      template: `systems/${ABFSystemName}/templates/dialog/domine/ki-calculator-dialog.hbs`,
      width: 500,
      height: 'auto',
      resizable: true,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  _initModalData() {
    const saved = this.actor.system?.macroCookies?.kiCalculator ?? {};
    this.modalData = {
      mode: saved.mode ?? 'generic',
      techniqueId: saved.techniqueId ?? (this.actor.items.find(i => i.type === ABFItems.TECHNIQUE)?.id ?? ''),
      accordionTechniques: [],
      selectedStats: saved.selectedStats ?? {
        strength: true, agility: true, dexterity: true,
        constitution: true, willPower: true, power: true
      },
      statMods: saved.statMods ?? {
        strength: 0, agility: 0, dexterity: 0,
        constitution: 0, willPower: 0, power: 0
      },
      fatigueUsed:      saved.fatigueUsed      ?? 0,
      fullAccumulation: saved.fullAccumulation ?? false,
      castThisRound:    saved.castThisRound    ?? true,
      holdTechnique:    saved.holdTechnique    ?? false,
      continueHolding:  {},
    };
  }

  async getData() {
    if (!this.modalData) this._initModalData();
    const sys = this.actor.system;
    const actorTechniques = this.actor.items.filter(i => i.type === ABFItems.TECHNIQUE);
    const fatigueBonus = this.modalData.fatigueUsed || 0;
    const { mode, techniqueId } = this.modalData;

    // Compute targets first — needed for specific-mode per-stat logic
    let targets = null;
    let targetTechName = '';
    let holdTechniqueLevel = 0;

    if (mode === 'specific' && techniqueId) {
      const technique = actorTechniques.find(t => t.id === techniqueId);
      if (technique) {
        targetTechName = technique.name;
        holdTechniqueLevel = Number(technique.system?.level?.value) || 0;
        targets = {};
        for (const stat of KI_STATS) targets[stat] = Number(technique.system?.[stat]?.value) || 0;
      }
    } else if (mode === 'generic' && this.modalData.accordionTechniques.length > 0) {
      targets = {};
      let hasAny = false;
      for (const stat of KI_STATS) {
        const v = this.modalData.accordionTechniques.reduce((mx, row) => {
          const tech = actorTechniques.find(t => t.id === row.techniqueId);
          return Math.max(mx, tech?.system?.[stat]?.value ?? 0);
        }, 0);
        targets[stat] = v;
        if (v > 0) hasAny = true;
      }
      if (!hasAny) targets = null;
    }

    // Cost string for the selected technique (specific mode)
    let techCostStr = '';
    if (mode === 'specific' && techniqueId) {
      const technique = actorTechniques.find(t => t.id === techniqueId);
      if (technique) {
        const parts = KI_STATS
          .filter(s => (Number(technique.system?.[s]?.value) || 0) > 0)
          .map(s => `${STAT_SHORT[s]} ${Number(technique.system[s].value) || 0}`);
        const total = KI_STATS.reduce((sum, s) => sum + (Number(technique.system?.[s]?.value) || 0), 0);
        const mant = Number(technique.system?.level?.value) || 0;
        const mantStr = mant > 0 ? `Mant. ${mant}` : 'Mant. —';
        techCostStr = parts.length > 0 ? `Coste ${total} (${parts.join(', ')}), ${mantStr}` : mantStr;
      }
    }

    // Held techniques from KI_MAINTENANCE items (excluding the currently selected technique)
    const heldMaintenances = this.actor.system?.domine?.kiMaintenances ?? [];
    const heldTechs = heldMaintenances
      .filter(m => m.system?.active?.value !== false
                 && m.system?.techniqueId?.value
                 && m.system.techniqueId.value !== techniqueId);
    const heldTargets = {};
    for (const stat of KI_STATS) {
      heldTargets[stat] = heldTechs.reduce((sum, m) => {
        if (this.modalData.continueHolding?.[m._id] === false) return sum;
        const tech = actorTechniques.find(t => t.id === m.system.techniqueId.value);
        return sum + (Number(tech?.system?.[stat]?.value) || 0);
      }, 0);
    }
    const heldRows = heldTechs.map(m => {
      const tech = actorTechniques.find(t => t.id === m.system.techniqueId.value);
      return {
        id: m._id,
        techniqueId: m.system.techniqueId.value,
        name: tech?.name ?? m.name,
        level: Number(tech?.system?.level?.value) || 0,
        continueHolding: this.modalData.continueHolding?.[m._id] ?? true,
      };
    });

    // Ki objetivo: total cost of current target(s) + held techs
    let kiTargetTotal = 0;
    const kiTargetParts = [];
    if (targets) {
      for (const stat of KI_STATS) {
        const v = (targets[stat] ?? 0) + (heldTargets[stat] ?? 0);
        if (v > 0) { kiTargetTotal += v; kiTargetParts.push(`${STAT_SHORT[stat]} ${v}`); }
      }
    }
    const kiTargetStr = kiTargetTotal > 0 ? `${kiTargetTotal} (${kiTargetParts.join(', ')})` : null;

    // Accordion rows enriched with cost string for display
    const accordionTechniqueRows = this.modalData.accordionTechniques.map(row => {
      const tech = actorTechniques.find(t => t.id === row.techniqueId);
      if (!tech) return { ...row, costStr: '', hasTech: false };
      const parts = KI_STATS.filter(s => (Number(tech.system?.[s]?.value) || 0) > 0)
        .map(s => `${STAT_SHORT[s]} ${Number(tech.system[s].value)}`);
      const total = KI_STATS.reduce((sum, s) => sum + (Number(tech.system?.[s]?.value) || 0), 0);
      return { ...row, techId: tech.id, costStr: `${total} (${parts.join(', ')})`, hasTech: true };
    });

    // Per-stat cost of held techs being released (continueHolding = false)
    const releaseTargets = {};
    for (const stat of KI_STATS) {
      releaseTargets[stat] = heldRows
        .filter(r => !r.continueHolding)
        .reduce((sum, r) => {
          const tech = actorTechniques.find(t => t.id === r.techniqueId);
          return sum + (Number(tech?.system?.[stat]?.value) || 0);
        }, 0);
    }

    // Per-stat computation
    const statData = {};
    for (const stat of KI_STATS) {
      const raw = Number(sys.domine?.kiAccumulation?.[stat]?.final?.value) || 0;
      if (raw > 0) this._lastAccRate[stat] = raw;
      const accRate = raw > 0 ? raw : (this._lastAccRate[stat] ?? 0);
      const accumulated = Number(sys.domine?.kiAccumulation?.[stat]?.accumulated?.value) || 0;
      const mod = Number(this.modalData.statMods?.[stat]) || 0;
      const accFinal = accRate + mod + fatigueBonus;
      const baseRate = accRate + mod;

      const effectiveRate = accFinal;
      const futureEffRate = baseRate;

      let selected, thisRound, futureRound;
      if (mode === 'specific' && targets) {
        const target = (targets[stat] ?? 0) + (heldTargets[stat] ?? 0);
        const remaining = Math.max(0, target - accumulated);
        selected = (targets[stat] ?? 0) > 0 || (heldTargets[stat] ?? 0) > 0;
        thisRound = selected ? Math.min(Math.max(0, effectiveRate), remaining) : 0;
        futureRound = selected ? Math.max(0, futureEffRate) : 0;
      } else {
        selected = !!(this.modalData.selectedStats?.[stat] ?? true);
        thisRound = selected ? Math.max(0, effectiveRate) : 0;
        futureRound = selected ? Math.max(0, futureEffRate) : 0;
      }
      statData[stat] = { accRate, accumulated, selected, mod, accFinal, thisRound, futureRound };
    }

    // Turns needed — uses combined target (selected + held) so castableThisRound means
    // accumulated covers both, which is required whether continuing to hold or releasing.
    let turnsNeeded = null;
    let castableThisRound = false;
    if (targets) {
      let maxTurns = 0;
      let hasAnyRelevant = false;
      for (const stat of KI_STATS) {
        const t = (targets[stat] ?? 0) + (heldTargets[stat] ?? 0);
        if (!t) continue;
        const { accumulated, thisRound, futureRound } = statData[stat];
        const remaining = Math.max(0, t - accumulated);
        let turns;
        if (remaining === 0) { turns = 0; }
        else if (thisRound === 0) { continue; }
        else if (remaining <= thisRound) { turns = 0; }
        else {
          const after = remaining - thisRound;
          turns = futureRound > 0 ? Math.ceil(after / futureRound) : null;
        }
        if (turns !== null) {
          hasAnyRelevant = true;
          if (turns > maxTurns) maxTurns = turns;
        }
      }
      if (hasAnyRelevant) {
        turnsNeeded = maxTurns;
        castableThisRound = maxTurns === 0;
      }
    }

    // Cast / hold options (specific mode only)
    const showTechOptions = mode === 'specific' && !!techniqueId;
    const castThisRound = showTechOptions ? (this.modalData.castThisRound ?? true) : false;
    const holdTechnique = showTechOptions && !castThisRound ? (this.modalData.holdTechnique ?? false) : false;
    const techAction = castThisRound ? 'cast' : holdTechnique ? 'hold' : 'none';

    // Pool
    const kiPoolValue = sys.domine?.kiAccumulation?.generic?.value ?? 0;
    const kiPoolMax = sys.domine?.kiAccumulation?.generic?.max ?? 0;
    const currentFatigue = sys.characteristics?.secondaries?.fatigue?.value ?? 0;
    const maxFatigue = sys.characteristics?.secondaries?.fatigue?.max ?? 0;

    // Cast ki cost (pool preview): selected tech + released held techs
    let castKiCost = 0;
    if (castThisRound && castableThisRound && techniqueId) {
      const technique = actorTechniques.find(t => t.id === techniqueId);
      if (technique) castKiCost = KI_STATS.reduce((s, stat) => s + (Number(technique.system?.[stat]?.value) || 0), 0);
      castKiCost += KI_STATS.reduce((s, stat) => s + (releaseTargets[stat] ?? 0), 0);
    }

    // Final state preview
    const finalStats = {};
    for (const stat of KI_STATS) {
      const { accumulated, thisRound, selected } = statData[stat];
      if (castThisRound && castableThisRound) {
        const tech = actorTechniques.find(t => t.id === techniqueId);
        const selectedCost = Number(tech?.system?.[stat]?.value) || 0;
        const releaseCost = releaseTargets[stat] ?? 0;
        finalStats[stat] = Math.max(0, accumulated + thisRound - selectedCost - releaseCost);
      } else if (selected && thisRound > 0) {
        finalStats[stat] = accumulated + thisRound;
      } else {
        finalStats[stat] = accumulated;
      }
    }
    const finalFatigue = Math.max(0, currentFatigue - fatigueBonus);
    const finalKiPool = Math.max(0, kiPoolValue - castKiCost);

    const totalAccumulated = KI_STATS.reduce((s, stat) => s + statData[stat].accumulated, 0);
    const finalTotalAccumulated = KI_STATS.reduce((s, stat) => s + finalStats[stat], 0);

    // Pre-built arrays for template
    const statColumns = KI_STATS.map(stat => ({ key: stat, label: STAT_LABELS[stat], ...statData[stat] }));
    const techCostCols = (mode === 'specific' && targets)
      ? KI_STATS.filter(stat => (targets[stat] ?? 0) > 0).map(stat => ({ label: STAT_LABELS[stat], value: targets[stat] }))
      : [];
    const footerInitial = KI_STATS
      .filter(stat => statData[stat].accumulated > 0)
      .map(stat => ({ label: STAT_LABELS[stat], value: statData[stat].accumulated }));
    const footerFinal = KI_STATS
      .filter(stat => finalStats[stat] > 0)
      .map(stat => ({ label: STAT_LABELS[stat], value: finalStats[stat] }));

    return {
      actor: this.actor, actorTechniques, KI_STATS, statColumns, techCostCols,
      mode, techniqueId, accordionTechniques: this.modalData.accordionTechniques, accordionTechniqueRows,
      accordionOpen: this._accordionOpen, selectedStats: this.modalData.selectedStats,
      statMods: this.modalData.statMods, fatigueUsed: this.modalData.fatigueUsed,
      fullAccumulation: this.modalData.fullAccumulation, statData, targets, targetTechName,
      techCostStr, kiTargetTotal, kiTargetStr,
      turnsNeeded, hasTurnsInfo: turnsNeeded !== null, castableThisRound,
      showTechOptions, castThisRound, holdTechnique, holdTechniqueLevel, techAction,
      kiPoolValue, kiPoolMax, currentFatigue, finalStats, finalFatigue, finalKiPool,
      totalAccumulated, finalTotalAccumulated,
      footerInitial, footerFinal,
      heldRows, releaseTargets,
      maxFatigue,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on('change', 'input:not([data-actor-update]), select', () => {
      this._syncFromForm(html);
      this.render(false);
    });

    html.on('change', '[data-actor-update]', async ev => {
      const field = ev.currentTarget.dataset.actorUpdate;
      const value = Number(ev.currentTarget.value) || 0;
      await this.actor.update({ [field]: value });
      this.render(false);
    });

    html.find('.kc-accordion-toggle').on('click', () => {
      this._accordionOpen = !this._accordionOpen;
      if (this._accordionOpen && this.modalData.accordionTechniques.length === 0) {
        this.modalData.accordionTechniques.push({ id: foundry.utils.randomID(), techniqueId: '' });
      }
      this.render(false);
    });

    html.find('[data-action="add-accordion-technique"]').on('click', () => {
      this.modalData.accordionTechniques.push({ id: foundry.utils.randomID(), techniqueId: '' });
      this.render(false);
    });

    html.find('[data-action="remove-accordion-technique"]').on('click', ev => {
      const rowEl = ev.currentTarget.closest('[data-row-id]');
      if (!rowEl) return;
      const id = rowEl.dataset.rowId;
      this.modalData.accordionTechniques = this.modalData.accordionTechniques.filter(r => r.id !== id);
      this.render(false);
    });

    html.find('[data-action="toggle-all-stats"]').on('click', () => {
      this._syncFromForm(html);
      const allSelected = KI_STATS.every(s => this.modalData.selectedStats[s]);
      for (const stat of KI_STATS) this.modalData.selectedStats[stat] = !allSelected;
      this.render(false);
    });

    html.find('[data-action="open-technique-sheet"]').on('click', () => {
      this._syncFromForm(html);
      const tech = this.actor.items.get(this.modalData.techniqueId);
      if (tech) tech.sheet.render(true);
    });

    html.find('[data-action="open-accordion-technique-sheet"]').on('click', ev => {
      this._syncFromForm(html);
      const rowEl = ev.currentTarget.closest('[data-row-id]');
      const id = rowEl?.dataset.rowId;
      const row = this.modalData.accordionTechniques.find(r => r.id === id);
      if (row?.techniqueId) {
        const tech = this.actor.items.get(row.techniqueId);
        if (tech) tech.sheet.render(true);
      }
    });

    html.find('.kc-stat-col').on('click', ev => {
      if (ev.target.closest('.kc-stat-col__mod')) return;
      if (this.modalData.mode !== 'generic') return;
      this._syncFromForm(html);
      const cb = ev.currentTarget.querySelector('[name^="selectedStats."]');
      const stat = cb?.name?.replace('selectedStats.', '');
      if (!stat) return;
      this.modalData.selectedStats[stat] = !this.modalData.selectedStats[stat];
      this.render(false);
    });

    html.find('[data-action="confirm"]').on('click', () => this._onConfirm(html));
    html.find('[data-action="clear"]').on('click', () => { this._initModalData(); this.render(false); });

  }

  _syncFromForm(html) {
    this.modalData.mode = html.find('[name="mode"]:checked').val() ?? 'generic';
    this.modalData.techniqueId = html.find('[name="techniqueId"]').val() ?? '';
    this.modalData.fatigueUsed = Number(html.find('[name="fatigueUsed"]').val()) || 0;
    this.modalData.fullAccumulation = html.find('[name="fullAccumulation"]').prop('checked') === true;
    const techAction = html.find('[name="techAction"]:checked').val() ?? 'cast';
    this.modalData.castThisRound = techAction === 'cast';
    this.modalData.holdTechnique = techAction === 'hold';

    for (const stat of KI_STATS) {
      const cb = html.find(`[name="selectedStats.${stat}"]`);
      if (cb.length) this.modalData.selectedStats[stat] = cb.prop('checked') === true;
      const modEl = html.find(`[name="statMods.${stat}"]`);
      if (modEl.length) this.modalData.statMods[stat] = Number(modEl.val()) || 0;
    }

    this.modalData.accordionTechniques = this.modalData.accordionTechniques.map(row => {
      const val = html.find(`[name="accordion.${row.id}.techniqueId"]`).val();
      return val !== undefined ? { ...row, techniqueId: val } : row;
    });

    const continueHolding = {};
    html.find('input[name^="continueHolding."]').each((_, el) => {
      const id = el.name.replace('continueHolding.', '');
      continueHolding[id] = el.checked;
    });
    this.modalData.continueHolding = continueHolding;
  }

  async _onConfirm(html) {
    Hooks.off('updateActor', this._actorUpdateHandler);
    this._syncFromForm(html);
    const computed = await this.getData();

    await this.actor.update({
      'system.macroCookies.kiCalculator.mode':             computed.mode,
      'system.macroCookies.kiCalculator.techniqueId':      computed.techniqueId,
      'system.macroCookies.kiCalculator.selectedStats':    { ...computed.selectedStats },
      'system.macroCookies.kiCalculator.statMods':         { ...computed.statMods },
      'system.macroCookies.kiCalculator.fullAccumulation': computed.fullAccumulation,
      'system.macroCookies.kiCalculator.fatigueUsed':      computed.fatigueUsed,
      'system.macroCookies.kiCalculator.castThisRound':    computed.castThisRound,
      'system.macroCookies.kiCalculator.holdTechnique':    computed.holdTechnique,
    });

    const updateData = {};

    if ((computed.fatigueUsed || 0) > 0) {
      updateData['system.characteristics.secondaries.fatigue.value'] = computed.finalFatigue;
    }

    if (computed.castThisRound && computed.castableThisRound) {
      const technique = computed.actorTechniques.find(t => t.id === computed.techniqueId);
      if (technique) {
        for (const stat of KI_STATS) {
          const { accumulated, thisRound } = computed.statData[stat];
          const selectedCost = Number(technique.system?.[stat]?.value) || 0;
          const releaseCost = computed.releaseTargets[stat] ?? 0;
          updateData[`system.domine.kiAccumulation.${stat}.accumulated.value`] = Math.max(0, accumulated + thisRound - selectedCost - releaseCost);
        }
        updateData['system.domine.kiAccumulation.generic.value'] = computed.finalKiPool;
      }
    } else {
      for (const stat of KI_STATS) {
        const { selected, thisRound, accumulated } = computed.statData[stat];
        if (selected && thisRound > 0) {
          updateData[`system.domine.kiAccumulation.${stat}.accumulated.value`] = accumulated + thisRound;
        }
      }
    }

    if (Object.keys(updateData).length > 0) await this.actor.update(updateData);

    if (computed.fullAccumulation) {
      const token = this.actor.getActiveTokens()[0];
      if (token && typeof game.cub?.hasCondition === 'function') {
        if (!game.cub.hasCondition('Concentrado', token)) {
          try { game.cub.addCondition('Concentrado', token); } catch {}
        }
      }
    }

    this._sendGMWhisper(computed);

    // Casting: deactivate KI_MAINTENANCE for the selected technique
    if (computed.castThisRound && computed.castableThisRound && computed.techniqueId) {
      const maint = this.actor.items
        .filter(i => i.type === ABFItems.KI_MAINTENANCE)
        .find(i => i.system?.techniqueId?.value === computed.techniqueId);
      if (maint) await maint.update({ 'system.active.value': false });
    }

    // Casting: also deactivate KI_MAINTENANCE for released held techniques (continueHolding = false)
    if (computed.castThisRound && computed.castableThisRound) {
      for (const row of computed.heldRows) {
        if (row.continueHolding) continue;
        const maint = this.actor.items
          .filter(i => i.type === ABFItems.KI_MAINTENANCE)
          .find(i => i.system?.techniqueId?.value === row.techniqueId);
        if (maint) await maint.update({ 'system.active.value': false });
      }
    }

    // Holding: create or activate a KI_MAINTENANCE item linked to this technique
    if (computed.holdTechnique && computed.techniqueId) {
      const technique = computed.actorTechniques.find(t => t.id === computed.techniqueId);
      if (technique) {
        const existingMaint = this.actor.items
          .filter(i => i.type === ABFItems.KI_MAINTENANCE)
          .find(i => i.system?.techniqueId?.value === technique.id);
        if (existingMaint) {
          await existingMaint.update({ 'system.active.value': true });
        } else {
          await this.actor.createInnerItem({
            type: ABFItems.KI_MAINTENANCE,
            name: `Aguantando técnica ${technique.name}`,
            system: {
              ...KI_MAINTENANCE_INITIAL_SYSTEM,
              roundCost: { value: technique.system?.level?.value ?? 0 },
              active: { value: true },
              techniqueId: { value: technique.id },
            }
          });
        }
      }
    }

    this.close();
  }

  _sendGMWhisper(computed) {
    const tokenName = this.actor.getActiveTokens()[0]?.name ?? this.actor.name;

    // black bold + colored shadow — works in Foundry chat (color:#000 is static, shadow uses CSS var)
    const sv = (content, cssVar) =>
      `<b style="color:#000;text-shadow:0 0 6px ${cssVar}">${content}</b>`;

    const totalGained = KI_STATS.reduce((s, stat) => s + computed.statData[stat].thisRound, 0);
    const kiPoolDelta = computed.finalKiPool - computed.kiPoolValue;

    // --- Line 1: deltas + resource indicators (colored glow) ---
    const summaryParts = [];
    if (totalGained > 0) {
      summaryParts.push(`<b>+${totalGained}</b> ${sv('<i class="fas fa-yin-yang"></i>ACUM', 'var(--abf-ki)')}`);
    }
    if (kiPoolDelta !== 0) {
      const sign = kiPoolDelta >= 0 ? '+' : '';
      summaryParts.push(`<b>${sign}${kiPoolDelta}</b> ${sv('<i class="fas fa-yin-yang"></i>', 'var(--abf-ki)')}`);
    }
    if (computed.fatigueUsed > 0) {
      summaryParts.push(`<b>-${computed.fatigueUsed}</b> ${sv('<i class="fas fa-bolt"></i>', 'var(--abf-fatigue)')}`);
    }
    const headerLine = `${tokenName} acumula: ${summaryParts.join(' | ')}`;

    // --- Line 2: technique action ---
    let techLine = '';
    if (computed.castThisRound && computed.castableThisRound && computed.techniqueId) {
      techLine = `Lanza técnica: <b>${computed.targetTechName}</b>`;
    }

    // --- Details accordion (closed by default) ---
    const detailLines = [];
    const currentValParts = [
      sv(`${computed.finalTotalAccumulated} <i class="fas fa-yin-yang"></i>`, 'var(--abf-ki)')
    ];
    if (kiPoolDelta !== 0) {
      currentValParts.push(sv(`${computed.finalKiPool}/${computed.kiPoolMax} <i class="fas fa-yin-yang"></i>`, 'var(--abf-ki)'));
    }
    if (computed.fatigueUsed > 0) {
      currentValParts.push(sv(`${computed.finalFatigue}/${computed.maxFatigue} <i class="fas fa-bolt"></i>`, 'var(--abf-fatigue)'));
    }
    detailLines.push(currentValParts.join(' | '));

    const changedStats = KI_STATS.filter(s => computed.finalStats[s] !== computed.statData[s].accumulated);
    if (changedStats.length > 0) {
      detailLines.push(changedStats.map(s => `${STAT_LABELS[s]} ${computed.finalStats[s]}`).join(' | '));
    }
    if (computed.fullAccumulation) detailLines.push('Concentrado');

    const detailsHtml = `<details><summary>Detalles</summary><small>${detailLines.join('<br>')}</small></details>`;
    const content = [headerLine, techLine].filter(Boolean).join('<br>') + '<br>' + detailsHtml;
    ChatMessage.create({
      content,
      whisper: ChatMessage.getWhisperRecipients('GM').map(u => u.id),
      speaker: ChatMessage.getSpeaker({ actor: this.actor })
    });
  }
}
