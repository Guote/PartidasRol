import { ABFSystemName } from "../../animabf-guote.name.js";

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
    this.activeVia = null; // Will be set to first available via, or 'overview'
    this.actExpanded = false; // Track ACT alternative visibility
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
   * Define the vias in display order
   */
  static get VIAS() {
    return [
      'freeAccess',
      'light', 'darkness',
      'creation', 'destruction',
      'fire', 'water',
      'air', 'earth',
      'essence',
      'illusion', 'necromancy'
    ];
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
   * Get list of vias that have at least one spell
   */
  getAvailableVias(spellsByVia) {
    return ABFSpellbook.VIAS.filter(via => spellsByVia[via]?.length > 0);
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

    // Get spell maintenances
    const spellMaintenances = this.actor.system.mystic?.spellMaintenances || [];

    return {
      ...data,
      actor: this.actor,
      system: this.actor.system,
      mystic,
      spellsByVia: preparedSpells,
      spellMaintenances,
      availableVias,
      activeVia: this.activeVia,
      isOverviewTab,
      overviewTabId: ABFSpellbook.OVERVIEW_TAB,
      viaLabels,
      gradeLabels,
      actExpanded: this.actExpanded,
      totalSpells: this.actor.items.filter(i => i.type === 'spell').length,
      expandedCount: this.expandedSpells.size,
      allExpanded: this.expandedSpells.size === this.actor.items.filter(i => i.type === 'spell').length
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

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

    // Spell grade click (for future casting functionality)
    html.find('.spell-grade').click(ev => {
      ev.stopPropagation();
      const grade = ev.currentTarget.dataset.grade;
      const spellId = ev.currentTarget.dataset.spellId;
      // TODO: Implement spell casting at this grade
      console.log(`ABF Spellbook | Grade clicked: ${grade} for spell ${spellId}`);
      // For now, just log it - future implementation will cast the spell
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

    // Form input changes (save to actor) — overview form + header resources
    html.find('.spellbook-overview input, .spellbook-header__resources input').on('change', async ev => {
      const input = ev.currentTarget;
      const name = input.name;
      const value = input.type === 'number' ? Number(input.value) : input.value;

      if (name) {
        await this.actor.update({ [name]: value });
      }
    });

    // ACT toggle
    html.find('[data-action="toggle-act"]').click(ev => {
      ev.stopPropagation();
      this.actExpanded = !this.actExpanded;
      const alternative = html.find('.spellbook-act__alternative');
      alternative.attr('data-collapsed', !this.actExpanded);
      const icon = ev.currentTarget.querySelector('i');
      icon.classList.toggle('fa-chevron-down', !this.actExpanded);
      icon.classList.toggle('fa-chevron-up', this.actExpanded);
    });

    // Add maintenance
    html.find('[data-action="add-maintenance"]').click(async () => {
      const maintenances = this.actor.system.mystic?.spellMaintenances || [];
      const newMaintenance = {
        _id: foundry.utils.randomID(),
        name: '',
        cost: 0
      };
      await this.actor.update({
        'system.mystic.spellMaintenances': [...maintenances, newMaintenance]
      });
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

    // Rollable clicks (for magic projections)
    html.find('.v2-combat-value__final.rollable').click(async ev => {
      const rollValue = Number(ev.currentTarget.dataset.rollvalue) || 0;
      const label = ev.currentTarget.dataset.label || '';
      const roll = new Roll('1d100xa + @mod', { mod: rollValue });
      await roll.evaluate({ async: true });
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    });
  }

  /**
   * Handle import spells action - imports spells from compendium based on sphere levels
   */
  async _handleImportSpells() {
    // Define sphere-to-via mapping (only the 11 direct sphere matches)
    const sphereVias = ['air', 'creation', 'darkness', 'destruction', 'earth',
                        'essence', 'fire', 'illusion', 'light', 'necromancy', 'water'];

    // Get character's sphere levels
    const spheres = this.actor.system.mystic.magicLevel.spheres;

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

      // Check if via is one of the sphere vias
      if (!sphereVias.includes(via)) return false;

      // Check if character has sufficient level in that sphere
      const sphereLevel = spheres[via]?.value || 0;
      if (level > sphereLevel) return false;

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
