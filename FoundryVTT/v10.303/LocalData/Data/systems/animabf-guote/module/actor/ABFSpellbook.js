import { ABFSystemName } from "../../animabf-guote.name.js";

/**
 * A dedicated spellbook window for viewing and managing spells.
 * Displays spells organized by via (sphere) with collapsible spell cards.
 */
export default class ABFSpellbook extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.expandedSpells = new Set();
    this.activeVia = null; // Will be set to first available via
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "abf-spellbook",
      classes: ["abf", "spellbook"],
      template: `systems/${ABFSystemName}/templates/actor/spellbook/spellbook.hbs`,
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

    // Set active via to first available if not set or invalid
    if (!this.activeVia || !availableVias.includes(this.activeVia)) {
      this.activeVia = availableVias[0] || null;
    }

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

    return {
      ...data,
      actor: this.actor,
      spellsByVia: preparedSpells,
      availableVias,
      activeVia: this.activeVia,
      viaLabels,
      gradeLabels,
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
