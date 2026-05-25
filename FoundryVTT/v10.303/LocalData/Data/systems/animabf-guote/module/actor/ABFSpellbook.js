import { ABFSystemName } from "../../animabf-guote.name.js";
import { ZeonCalculatorDialog } from "../dialogs/mystic/ZeonCalculatorDialog.js";
import { getFormula } from "../rolls/utils/getFormula.js";
import { getModifierTerms } from "../rolls/utils/getModifierTerms.js";
import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import { ABFItems } from "../items/ABFItems.js";
import { SPELL_MAINTENANCE_INITIAL_SYSTEM } from "../types/mystic/SpellMaintenanceItemConfig.js";

/**
 * A dedicated spellbook window for viewing and managing spells.
 * Displays spells organized by via (sphere) with collapsible spell cards.
 * Includes an overview tab with mystic stats, spheres, and import functionality.
 */
export default class ABFSpellbook extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.expandedSpells = new Set();
    this._linkedMaintenanceIds = new Set();
    this._maintenanceSortAsc = false;
    this.activeVia = null; // Will be set to first available via, or 'overview'
    this._actorUpdateHandler = updatedActor => {
      if (updatedActor.id === this.actor.id) this.render(false);
    };
    Hooks.on('updateActor', this._actorUpdateHandler);
  }

  async close(...args) {
    Hooks.off('updateActor', this._actorUpdateHandler);
    return super.close(...args);
  }

  /**
   * Special tab ID for the overview/stats tab
   */
  static get OVERVIEW_TAB() {
    return '_overview';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "abf-spellbook",
      classes: ["abf", "spellbook"],
      template: `systems/${ABFSystemName}/templates/actor-v2/parts/spellbook/spellbook.hbs`,
      width: 800,
      height: 700,
      resizable: true,
      title: game.i18n.localize("anima.ui.spellbook.title")
    });
  }

  get title() {
    return `${game.i18n.localize("anima.ui.spellbook.title")} - ${this.actor.name}`;
  }

  /**
   * Define the vias in display order (primary spheres first, then subvias)
   */
  static get VIAS() {
    return [
      'freeAccess',
      'light', 'darkness',
      'creation', 'destruction',
      'fire', 'water',
      'air', 'earth',
      'essence',
      'illusion', 'necromancy',
      // Subvias (minor paths that can be linked to a primary sphere)
      'blood', 'chaos', 'death', 'dreams', 'emptiness',
      'knowledge', 'literae', 'musical', 'nobility', 'peace',
      'sin', 'threshold', 'time', 'war'
    ];
  }

  /**
   * Primary sphere vias (have sphere levels in magicLevel.spheres)
   */
  static get SPHERE_VIAS() {
    return ['light', 'darkness', 'fire', 'water', 'earth', 'air', 'creation', 'destruction', 'essence', 'illusion', 'necromancy'];
  }

  /**
   * Minor (sub)via keys — vias that can be selected as a subpath of a primary sphere
   */
  static get SUBVIAS() {
    return ['blood', 'chaos', 'death', 'dreams', 'emptiness', 'knowledge', 'literae', 'musical', 'nobility', 'peace', 'sin', 'threshold', 'time', 'war'];
  }

  /**
   * Get all spells from the actor, organized by via
   */
  getSpellsByVia() {
    const spells = this.actor.items.filter(i => i.type === 'spell');
    const byVia = {};

    for (const via of ABFSpellbook.VIAS) {
      byVia[via] = [];
    }
    // "Other" category for vias not in the main list
    byVia.other = [];

    for (const spell of spells) {
      const via = spell.system.via?.value || 'other';
      if (byVia[via]) {
        byVia[via].push(spell);
      } else {
        byVia.other.push(spell);
      }
    }

    // Sort spells within each via by level
    for (const via of Object.keys(byVia)) {
      byVia[via].sort((a, b) => {
        const levelA = a.system.level?.value || 0;
        const levelB = b.system.level?.value || 0;
        return levelA - levelB;
      });
    }

    return byVia;
  }

  /**
   * Get list of vias that should show as tabs.
   * Always includes freeAccess. Includes any subvia assigned to a sphere
   * (even if it has no spells yet). Includes any via with spells.
   */
  getAvailableVias(spellsByVia) {
    // Collect subvias actively assigned to a primary sphere
    const assignedSubvias = new Set();
    const spheres = this.actor.system.mystic?.magicLevel?.spheres || {};
    for (const sphere of ABFSpellbook.SPHERE_VIAS) {
      const subpath = spheres[sphere]?.subpath;
      if (subpath) assignedSubvias.add(subpath);
    }

    return ABFSpellbook.VIAS.filter(via => {
      if (via === 'freeAccess') return true;           // Always show
      if (spellsByVia[via]?.length > 0) return true;  // Has spells
      if (assignedSubvias.has(via)) return true;       // Assigned subpath
      return false;
    });
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    const spellsByVia = this.getSpellsByVia();
    const availableVias = this.getAvailableVias(spellsByVia);

    // Set active via to overview if not set, or first available spell via if invalid
    if (!this.activeVia) {
      this.activeVia = ABFSpellbook.OVERVIEW_TAB;
    } else if (this.activeVia !== ABFSpellbook.OVERVIEW_TAB && !availableVias.includes(this.activeVia)) {
      this.activeVia = availableVias[0] || ABFSpellbook.OVERVIEW_TAB;
    }

    // Check if we're on the overview tab
    const isOverviewTab = this.activeVia === ABFSpellbook.OVERVIEW_TAB;

    // Get localized via names
    const viaLabels = {};
    for (const via of ABFSpellbook.VIAS) {
      viaLabels[via] = game.i18n.localize(`anima.ui.mystic.spell.via.${via}.title`);
    }
    viaLabels.other = game.i18n.localize("anima.ui.spellbook.otherVia");

    // Get spell type and action type labels
    const spellTypeLabels = {
      attack: game.i18n.localize("anima.ui.mystic.spell.spellType.attack.title"),
      defense: game.i18n.localize("anima.ui.mystic.spell.spellType.defense.title"),
      animatic: game.i18n.localize("anima.ui.mystic.spell.spellType.animatic.title"),
      effect: game.i18n.localize("anima.ui.mystic.spell.spellType.effect.title"),
      detection: game.i18n.localize("anima.ui.mystic.spell.spellType.detection.title"),
      automatic: game.i18n.localize("anima.ui.mystic.spell.spellType.automatic.title")
    };

    const actionTypeLabels = {
      active: game.i18n.localize("anima.ui.mystic.spell.actionType.active.title"),
      passive: game.i18n.localize("anima.ui.mystic.spell.actionType.passive.title")
    };

    // Grade labels
    const gradeLabels = {
      base: game.i18n.localize("anima.ui.mystic.spell.grade.base.title"),
      intermediate: game.i18n.localize("anima.ui.mystic.spell.grade.intermediate.title"),
      advanced: game.i18n.localize("anima.ui.mystic.spell.grade.advanced.title"),
      arcane: game.i18n.localize("anima.ui.mystic.spell.grade.arcane.title")
    };

    // Prepare spells with expanded state
    const preparedSpells = {};
    for (const via of Object.keys(spellsByVia)) {
      preparedSpells[via] = spellsByVia[via].map(spell => ({
        ...spell,
        id: spell.id,
        name: spell.name,
        img: spell.img,
        system: spell.system,
        expanded: this.expandedSpells.has(spell.id),
        spellTypeLabel: spellTypeLabels[spell.system.spellType?.value] || spell.system.spellType?.value,
        actionTypeLabel: actionTypeLabels[spell.system.actionType?.value] || spell.system.actionType?.value
      }));
    }

    // Get mystic system data for overview tab
    const mystic = this.actor.system.mystic || {};

    // Get spell maintenances — enrich with linked-spell metadata for the UI
    const actorSpells = this.actor.items
      .filter(i => i.type === 'spell')
      .sort((a, b) => a.name.localeCompare(b.name));

    let spellMaintenances = (this.actor.system.mystic?.spellMaintenances || []).map(m => {
      const spellIdValue = m.system?.spellId?.value ?? '';
      const roundCostFinal = (Number(m.system?.roundCost?.value) || 0) + (Number(m.system?.roundCostMod?.value) || 0);
      const dayCostFinal = (Number(m.system?.cost?.value) || 0) + (Number(m.system?.dayCostMod?.value) || 0);
      return {
        ...m,
        isLinked: !!spellIdValue || this._linkedMaintenanceIds.has(m._id),
        spellOptions: actorSpells.map(s => ({ id: s.id, name: s.name, selected: s.id === spellIdValue })),
        roundCostFinal,
        dayCostFinal
      };
    });

    if (this._maintenanceSortAsc) {
      spellMaintenances = [...spellMaintenances].sort((a, b) => {
        const nameA = a.name?.trim() ?? '';
        const nameB = b.name?.trim() ?? '';
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, 'es');
      });
    }

    const activeMaintenances = spellMaintenances.filter(m => m.system?.active?.value);
    const maintenanceTotalRound = activeMaintenances.reduce(
      (s, m) => s + (Number(m.system?.roundCost?.value) || 0) + (Number(m.system?.roundCostMod?.value) || 0), 0
    );
    const maintenanceTotalDay = activeMaintenances.reduce(
      (s, m) => s + (Number(m.system?.cost?.value) || 0) + (Number(m.system?.dayCostMod?.value) || 0), 0
    );

    // Build subvia options for the sphere selectors
    const subviaOptions = [
      { value: '', label: '—' },
      ...ABFSpellbook.SUBVIAS.map(via => ({
        value: via,
        label: game.i18n.localize(`anima.ui.mystic.spell.via.${via}.title`)
      }))
    ];

    // Build sphere rows in display order for the template
    const spheres = mystic.magicLevel?.spheres || {};
    const sphereRows = ABFSpellbook.SPHERE_VIAS.map(key => ({
      key,
      label: game.i18n.localize(`anima.ui.mystic.magicLevel.spheres.${key}.title`),
      value: spheres[key]?.value || 0,
      subpath: spheres[key]?.subpath || ''
    }));

    return {
      ...data,
      actor: this.actor,
      system: this.actor.system,
      mystic,
      spellsByVia: preparedSpells,
      spellMaintenances,
      maintenanceSortAsc: this._maintenanceSortAsc,
      maintenanceTotalRound,
      maintenanceTotalDay,
      availableVias,
      activeVia: this.activeVia,
      isOverviewTab,
      overviewTabId: ABFSpellbook.OVERVIEW_TAB,
      viaLabels,
      gradeLabels,
      totalSpells: this.actor.items.filter(i => i.type === 'spell').length,
      expandedCount: this.expandedSpells.size,
      allExpanded: this.expandedSpells.size === this.actor.items.filter(i => i.type === 'spell').length,
      subviaOptions,
      sphereRows
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Zeon accumulation calculator
    html.find('[data-action="open-zeon-calculator"]').click(() => {
      ZeonCalculatorDialog.openForActor(this.actor);
    });
    html.find('[data-action="open-zeon-calculator"]').on('dragstart', ev => {
      ev.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'ZeonCalculator',
        name: 'Calculadora ACT',
        img:  'icons/magic/symbols/runes-star-blue.webp'
      }));
    });

    // Via tab clicks
    html.find('.spellbook-sidetab').click(ev => {
      const via = ev.currentTarget.dataset.via;
      this.activeVia = via;
      this.render(false);
    });

    // Expand/collapse all buttons
    html.find('[data-action="expand-all"]').click(() => {
      const spells = this.actor.items.filter(i => i.type === 'spell');
      for (const spell of spells) {
        this.expandedSpells.add(spell.id);
      }
      this.render(false);
    });

    html.find('[data-action="collapse-all"]').click(() => {
      this.expandedSpells.clear();
      this.render(false);
    });

    // Toggle individual spell (only if not clicking a button)
    html.find('.spell-card__header').click(ev => {
      // Don't toggle if clicking on a button
      if (ev.target.closest('button') || ev.target.closest('[data-action]')) {
        return;
      }
      const spellId = ev.currentTarget.closest('.spell-card').dataset.spellId;
      if (this.expandedSpells.has(spellId)) {
        this.expandedSpells.delete(spellId);
      } else {
        this.expandedSpells.add(spellId);
      }
      this.render(false);
    });

    // Edit spell (open item sheet)
    html.find('[data-action="edit-spell"]').click(ev => {
      ev.stopPropagation();
      const spellId = ev.currentTarget.closest('.spell-card').dataset.spellId;
      const spell = this.actor.items.get(spellId);
      if (spell?.sheet) {
        spell.sheet.render(true);
      }
    });

    // Spell grade click — post spell card to chat with "Set as Attack" / "Set as Defense" buttons
    html.find('.spell-grade').click(ev => {
      ev.stopPropagation();
      const grade = ev.currentTarget.dataset.grade;
      const spellId = ev.currentTarget.dataset.spellId;
      window.ChatCombat._postSpellCard(this.actor, spellId, grade);
    });

    // Delete spell
    html.find('[data-action="delete-spell"]').click(async ev => {
      ev.stopPropagation();
      const spellId = ev.currentTarget.closest('.spell-card').dataset.spellId;
      const spell = this.actor.items.get(spellId);
      if (spell) {
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize("anima.dialogs.items.delete.title"),
          content: `<p>${game.i18n.localize("anima.dialogs.items.delete.body")}</p>`
        });
        if (confirmed) {
          await spell.delete();
          this.expandedSpells.delete(spellId);
          this.render(false);
        }
      }
    });

    // Import spells button
    html.find('[data-action="import-spells"]').click(async () => {
      await this._handleImportSpells();
    });

    // Grade selector in maintenance table: auto-fill base costs from the linked spell
    html.on('change', 'select.sm-grade-select[data-spell-id]', async ev => {
      ev.stopImmediatePropagation();
      const spellId = ev.currentTarget.dataset.spellId;
      if (!spellId) return;
      const itemId = ev.currentTarget.dataset.itemId;
      if (!itemId) return;
      const grade = ev.currentTarget.value;
      const spell = this.actor.items.get(spellId);
      if (!spell) return;
      const maintenanceCost = spell.system?.grades?.[grade]?.maintenanceCost?.value ?? 0;
      const isDaily = spell.system?.hasDailyMaintenance?.value ?? false;
      const current = this.actor.system?.mystic?.spellMaintenances?.find(m => m._id === itemId);
      if (!current) return;
      await this.actor.updateInnerItem({
        type: ABFItems.SPELL_MAINTENANCE,
        id: itemId,
        system: {
          ...current.system,
          grade:     { value: grade },
          roundCost: { value: isDaily ? 0 : maintenanceCost },
          cost:      { value: isDaily ? maintenanceCost : 0 },
        }
      });
      this.render(false);
    });

    // Form input/select changes (save to actor) — overview form + header resources
    const MAINT_PREFIX = 'system.dynamic.spellMaintenances.';
    html.find('.spellbook-overview input, .spellbook-overview select, .spellbook-header__resources input').on('change', async ev => {
      const input = ev.currentTarget;
      const name = input.name;
      if (!name) return;

      if (name.startsWith(MAINT_PREFIX)) {
        const rest = name.slice(MAINT_PREFIX.length);
        const dotIdx = rest.indexOf('.');
        const itemId = dotIdx >= 0 ? rest.slice(0, dotIdx) : rest;
        const fieldPath = dotIdx >= 0 ? rest.slice(dotIdx + 1) : '';
        const current = this.actor.system?.mystic?.spellMaintenances?.find(m => m._id === itemId);
        if (!current) return;

        const value = input.type === 'checkbox' ? input.checked : (input.type === 'number' ? Number(input.value) : input.value);

        if (fieldPath === 'name') {
          await this.actor.updateInnerItem({ type: ABFItems.SPELL_MAINTENANCE, id: itemId, name: value, system: current.system });
        } else if (fieldPath.startsWith('system.')) {
          const systemField = fieldPath.slice(7);
          const system = foundry.utils.deepClone(current.system ?? {});
          foundry.utils.setProperty(system, systemField, value);
          await this.actor.updateInnerItem({ type: ABFItems.SPELL_MAINTENANCE, id: itemId, system });
        }
        return;
      }

      const value = input.type === 'number' ? Number(input.value) : input.value;
      await this.actor.update({ [name]: value });
    });

    // Add maintenance (blank free-text row)
    html.find('[data-action="add-maintenance"]').click(async () => {
      await this.actor.createInnerItem({
        type: ABFItems.SPELL_MAINTENANCE,
        name: '',
        system: SPELL_MAINTENANCE_INITIAL_SYSTEM
      });
      this.render(false);
    });

    // Add maintenance linked to a known spell (shows spell dropdown instead of text input)
    html.find('[data-action="add-maintenance-linked"]').click(async () => {
      const before = new Set((this.actor.system?.mystic?.spellMaintenances ?? []).map(m => m._id));
      await this.actor.createInnerItem({
        type: ABFItems.SPELL_MAINTENANCE,
        name: '',
        system: SPELL_MAINTENANCE_INITIAL_SYSTEM
      });
      const after = this.actor.system?.mystic?.spellMaintenances ?? [];
      const newItem = after.find(m => !before.has(m._id));
      if (newItem) this._linkedMaintenanceIds.add(newItem._id);
      this.render(false);
    });

    // Spell select in linked maintenance rows — update spellId, name, and auto-fill costs
    html.on('change', 'select.sm-spell-select', async ev => {
      ev.stopImmediatePropagation();
      const itemId = ev.currentTarget.dataset.itemId;
      const spellId = ev.currentTarget.value;
      if (!itemId) return;
      const current = this.actor.system?.mystic?.spellMaintenances?.find(m => m._id === itemId);
      if (!current) return;
      const spell = this.actor.items.get(spellId);
      const grade = current.system?.grade?.value || 'base';
      const maintenanceCost = spell?.system?.grades?.[grade]?.maintenanceCost?.value ?? 0;
      const isDaily = spell?.system?.hasDailyMaintenance?.value ?? false;
      this._linkedMaintenanceIds.delete(itemId);
      await this.actor.updateInnerItem({
        type: ABFItems.SPELL_MAINTENANCE,
        id: itemId,
        name: spell?.name ?? '',
        system: {
          ...current.system,
          spellId:   { value: spellId },
          grade:     { value: grade },
          roundCost: { value: isDaily ? 0 : maintenanceCost },
          cost:      { value: isDaily ? maintenanceCost : 0 },
        }
      });
      this.render(false);
    });

    // Sort maintenances by name
    html.find('[data-action="sort-maintenances-by-name"]').click(() => {
      this._maintenanceSortAsc = !this._maintenanceSortAsc;
      this.render(false);
    });

    // Delete maintenance
    html.find('[data-action="delete-maintenance"]').click(async ev => {
      const itemId = ev.currentTarget.dataset.itemId;
      const maintenances = this.actor.system.mystic?.spellMaintenances || [];
      const filtered = maintenances.filter(m => m._id !== itemId);
      await this.actor.update({
        'system.mystic.spellMaintenances': filtered
      });
      this.render(false);
    });

    // Drag & drop spell items onto the spellbook window
    html[0].addEventListener('dragover', ev => {
      if (ev.dataTransfer.types.includes('text/plain')) ev.preventDefault();
    });
    html[0].addEventListener('drop', async ev => {
      await this._onDropSpell(ev);
    });

    // Rollable clicks (rollableDiv divs — e.g. magic projections)
    html.find('.v2-combat-value.rollable').click(async ev => {
      if (ev.target.tagName === 'INPUT') return;
      const element = ev.currentTarget;
      const { dataset } = element;
      if (!dataset.roll) return;
      const mod = await openModDialog();
      const { values: modValues, labels: modLabels } = getModifierTerms(this.actor.system, dataset.modifierType);
      const formula = getFormula({
        dice: dataset.roll,
        values: [dataset.rollvalue, ...modValues, mod],
        labels: [dataset.label, ...modLabels, 'Mod'],
      });
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: dataset.label,
      });
    });
  }

  /**
   * Handle drag & drop of spell items onto the spellbook window.
   * Creates the spell on the actor and navigates to its via tab.
   */
  async _onDropSpell(event) {
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (e) {
      return;
    }

    if (data.type !== 'Item') return;

    const item = await Item.fromDropData(data);
    if (!item || item.type !== 'spell') return;

    // Don't re-add if the spell is already on this actor
    if (item.parent?.id === this.actor.id) return;

    // Duplicate check
    const isDuplicate = this.actor.items.some(i => i.type === 'spell' && i.name === item.name);
    if (isDuplicate) {
      ui.notifications.warn(
        game.i18n.format('anima.ui.mystic.importSpells.alreadyImported', { name: item.name })
      );
      return;
    }

    await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);

    // Navigate to the spell's via tab so the user sees it
    const via = item.system.via?.value;
    if (via && ABFSpellbook.VIAS.includes(via)) {
      this.activeVia = via;
    }

    this.render(false);
  }

  /**
   * Handle import spells action - imports spells from compendium based on sphere levels and selected subpaths
   */
  async _handleImportSpells() {
    const sphereVias = ABFSpellbook.SPHERE_VIAS;

    // Get character's sphere levels
    const spheres = this.actor.system.mystic.magicLevel.spheres;

    // Build a map: via → max level to import
    // A via can be either a primary sphere or a selected subpath of a sphere
    const viaLevelMap = {};
    for (const sphere of sphereVias) {
      const sphereLevel = spheres[sphere]?.value || 0;
      if (sphereLevel > 0) {
        // Primary sphere
        viaLevelMap[sphere] = Math.max(viaLevelMap[sphere] || 0, sphereLevel);
        // Subpath (if any selected)
        const subpath = spheres[sphere]?.subpath || '';
        if (subpath) {
          viaLevelMap[subpath] = Math.max(viaLevelMap[subpath] || 0, sphereLevel);
        }
      }
    }

    // Get existing spell names to avoid duplicates
    const existingSpellNames = new Set(
      this.actor.items.filter(i => i.type === 'spell').map(i => i.name)
    );

    // Get magic compendium
    const pack = game.packs.get('animabf-guote.magic');
    if (!pack) {
      ui.notifications.error(game.i18n.localize("anima.ui.mystic.importSpells.error.noCompendium"));
      return;
    }

    // Get all spells from compendium
    const allSpells = await pack.getDocuments();

    // Filter spells by via and level
    const spellsToImport = allSpells.filter(spell => {
      const via = spell.system.via?.value;
      const level = spell.system.level?.value || 0;

      // freeAccess spells are not imported here
      if (!via || via === 'freeAccess') return false;

      // Check if this via is eligible (primary or subpath) and level is within range
      const maxLevel = viaLevelMap[via];
      if (maxLevel === undefined || level > maxLevel) return false;

      // Check if spell already exists
      if (existingSpellNames.has(spell.name)) return false;

      return true;
    });

    if (spellsToImport.length === 0) {
      ui.notifications.info(game.i18n.localize("anima.ui.mystic.importSpells.noSpells"));
      return;
    }

    // Confirm import
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("anima.ui.mystic.importSpells.confirm.title"),
      content: game.i18n.format("anima.ui.mystic.importSpells.confirm.content", {
        count: spellsToImport.length
      })
    });

    if (!confirmed) return;

    // Create embedded items
    const itemData = spellsToImport.map(spell => ({
      type: 'spell',
      name: spell.name,
      img: spell.img,
      system: spell.system
    }));

    await this.actor.createEmbeddedDocuments('Item', itemData);

    ui.notifications.info(game.i18n.format("anima.ui.mystic.importSpells.success", {
      count: spellsToImport.length
    }));

    // Re-render to show new spells
    this.render(false);
  }

  /**
   * Re-render when the actor updates
   */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    return buttons;
  }

  /**
   * Static method to open spellbook for an actor
   */
  static openForActor(actor) {
    // Check if spellbook is already open for this actor
    const existingApp = Object.values(ui.windows).find(
      app => app instanceof ABFSpellbook && app.actor.id === actor.id
    );

    if (existingApp) {
      existingApp.bringToTop();
      existingApp.render(true);
      return existingApp;
    }

    const spellbook = new ABFSpellbook(actor);
    spellbook.render(true);
    return spellbook;
  }
}
