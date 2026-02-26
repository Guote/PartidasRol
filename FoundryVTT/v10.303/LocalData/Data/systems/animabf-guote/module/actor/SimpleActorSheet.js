import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import { getFormula } from "../rolls/utils/getFormula.js";
import { ABFSystemName } from "../../animabf-guote.name.js";

/**
 * Simple Actor Sheet - Compact sheet with edit/ready modes
 */
export default class SimpleActorSheet extends ActorSheet {
  constructor(actor, options) {
    super(actor, options);
    this._editMode = false;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ["abf", "sheet", "actor", "simple-sheet"],
      template: `systems/${ABFSystemName}/templates/actor/simple-actor-sheet.hbs`,
      width: 650,
      height: 600,
      submitOnChange: true,
      resizable: true,
    };
  }

  get template() {
    return `systems/${ABFSystemName}/templates/actor/simple-actor-sheet.hbs`;
  }

  async getData(options) {
    const data = await super.getData(options);

    if (this.actor.type === "character") {
      await this.actor.prepareDerivedData();
      data.system = this.actor.system;
    }

    data.editMode = this._editMode;
    data.config = CONFIG.config;

    // Prepare weapons from items
    data.weapons = this.actor.items.filter(i => i.type === "weapon" && i.system.equipped?.value);

    // Prepare armors from items
    data.armors = this.actor.items.filter(i => i.type === "armor" && i.system.equipped?.value);

    // Prepare secondary abilities with their final values
    data.secondaries = this._prepareSecondaries();

    // Get special abilities notes (separate)
    data.essentialAbilitiesNote = this.actor.items.find(i => i.type === "note" && i.name === "Habilidades Esenciales");
    data.powersNote = this.actor.items.find(i => i.type === "note" && i.name === "Poderes");
    // Fallback to old combined note
    data.specialAbilitiesNote = this.actor.items.find(i => i.type === "note" && i.name === "Habilidades Especiales");

    // Check if actor has mystic/psychic/domine content
    const mystic = this.actor.system.mystic || {};
    const psychic = this.actor.system.psychic || {};
    const domine = this.actor.system.domine || {};

    // Prepare magic level spheres (non-zero only for display)
    const spheres = mystic.magicLevel?.spheres || {};
    const sphereLabels = {
      light: "Luz", darkness: "Oscuridad", fire: "Fuego", water: "Agua",
      earth: "Tierra", air: "Aire", creation: "Creación", destruction: "Destrucción",
      essence: "Esencia", illusion: "Ilusión", necromancy: "Necromancia",
    };
    data.magicLevelSpheres = Object.entries(sphereLabels).map(([key, label]) => ({
      key, label, value: spheres[key]?.value || 0,
    }));
    data.hasNonZeroSpheres = data.magicLevelSpheres.some(s => s.value > 0);
    data.nonZeroSpheres = data.magicLevelSpheres.filter(s => s.value > 0);

    // Prepare summoning data
    const summoning = mystic.summoning || {};
    data.hasSummoning = (summoning.summon?.base?.value > 0) ||
                        (summoning.control?.base?.value > 0) ||
                        (summoning.bind?.base?.value > 0) ||
                        (summoning.banish?.base?.value > 0);
    data.summoning = {
      summon: summoning.summon?.base?.value || 0,
      control: summoning.control?.base?.value || 0,
      bind: summoning.bind?.base?.value || 0,
      banish: summoning.banish?.base?.value || 0,
    };

    data.hasMystic = (mystic.zeon?.max > 0) ||
                     (mystic.act?.main?.final?.value > 0) ||
                     (mystic.act?.main?.base?.value > 0) ||
                     (mystic.magicProjection?.base?.value > 0) ||
                     (mystic.magicProjection?.imbalance?.offensive?.base?.value > 0) ||
                     data.hasNonZeroSpheres ||
                     data.hasSummoning;

    data.hasPsychic = (psychic.psychicPoints?.max > 0) ||
                      (psychic.psychicProjection?.base?.value > 0) ||
                      (psychic.psychicProjection?.imbalance?.offensive?.base?.value > 0) ||
                      (psychic.psychicPotential?.base?.value > 0);

    data.hasDomine = (domine.martialKnowledge?.max?.value > 0) ||
                     (domine.kiAccumulation?.generic?.max > 0) ||
                     (domine.kiAccumulation?.generic?.value > 0);

    // Get spells count for grimoire button
    data.spellCount = this.actor.items.filter(i => i.type === "spell").length;
    data.psychicPowerCount = this.actor.items.filter(i => i.type === "psychicPower").length;
    data.techniqueCount = this.actor.items.filter(i => i.type === "technique").length;

    // Custom notes (all note items except the reserved ones)
    const reservedNotes = ["Habilidades Esenciales", "Poderes", "Habilidades Especiales"];
    data.customNotes = this.actor.items.filter(i => i.type === "note" && !reservedNotes.includes(i.name));

    return data;
  }

  _prepareSecondaries() {
    const sec = this.actor.system.secondaries || {};
    const result = [];

    const categories = {
      athletics: ['acrobatics', 'athleticism', 'ride', 'swim', 'climb', 'jump', 'piloting'],
      vigor: ['composure', 'featsOfStrength', 'withstandPain'],
      perception: ['notice', 'search', 'track'],
      intellectual: ['animals', 'science', 'law', 'herbalLore', 'history', 'tactics', 'medicine', 'memorize', 'navigation', 'occult', 'appraisal', 'magicAppraisal'],
      social: ['style', 'intimidate', 'leadership', 'persuasion', 'trading', 'streetwise', 'etiquette'],
      subterfuge: ['lockPicking', 'disguise', 'hide', 'theft', 'stealth', 'trapLore', 'poisons'],
      creative: ['art', 'dance', 'forging', 'runes', 'alchemy', 'animism', 'music', 'sleightOfHand', 'ritualCalligraphy', 'jewelry', 'tailoring', 'puppetMaking'],
    };

    for (const [catKey, skills] of Object.entries(categories)) {
      const cat = sec[catKey];
      if (!cat) continue;

      for (const skillKey of skills) {
        const skill = cat[skillKey];
        if (skill && skill.final?.value > 0) {
          result.push({
            key: skillKey,
            name: game.i18n.localize(`anima.ui.secondaries.${skillKey}.title`),
            value: skill.final.value,
          });
        }
      }
    }

    return result;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Toggle edit mode
    html.find('.toggle-edit-mode').click(() => {
      this._editMode = !this._editMode;
      this.render(false);
    });

    // Collapsible sections
    html.find('.sec-header').click(ev => {
      const section = $(ev.currentTarget).closest('.collapsible-sec');
      section.toggleClass('collapsed');
    });

    // Grimoire buttons - open main sheet on mystic/psychic/domine tab
    html.find('.open-grimoire').click(() => this._openMainSheet('mystic'));
    html.find('.open-psychic-powers').click(() => this._openMainSheet('psychic'));
    html.find('.open-techniques').click(() => this._openMainSheet('domine'));

    // Custom notes: Add Section
    html.find('.add-custom-section').click(() => this._onAddCustomSection());

    // Custom notes: Delete Section
    html.find('.delete-custom-section').click(ev => {
      const noteId = $(ev.currentTarget).data('note-id');
      if (noteId) {
        const item = this.actor.items.get(noteId);
        if (item) item.delete();
      }
    });

    // Rollable items (only in ready mode)
    if (!this._editMode) {
      // Primary characteristics
      html.find('.roll-primary').click(ev => this._onRollPrimary(ev));

      // Secondary abilities
      html.find('.roll-secondary').click(ev => this._onRollSecondary(ev));

      // Combat rolls
      html.find('.roll-combat').click(ev => this._onRollCombat(ev));

      // Weapon attacks
      html.find('.roll-weapon').click(ev => this._onRollWeapon(ev));

      // Resistance rolls
      html.find('.roll-resistance').click(ev => this._onRollResistance(ev));
    }
  }

  /**
   * Open the main actor sheet on a specific tab
   */
  _openMainSheet(tab) {
    // Get all registered sheets for this actor
    const sheets = Object.values(this.actor.apps).filter(app => app !== this);

    // Find or create the main ABFActorSheet
    let mainSheet = sheets.find(s => s.constructor.name === "ABFActorSheet");

    if (!mainSheet) {
      // Create new instance of ABFActorSheet
      const ABFActorSheet = CONFIG.Actor.sheetClasses.character["abf.ABFActorSheet"]?.cls;
      if (ABFActorSheet) {
        mainSheet = new ABFActorSheet(this.actor, { tab });
      }
    }

    if (mainSheet) {
      mainSheet.render(true, { tab });
    }
  }

  async _onRollPrimary(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const stat = el.dataset.stat;
    const value = parseInt(el.dataset.value) || 0;
    const label = el.dataset.label || stat;

    const mod = await openModDialog();
    const formula = getFormula({
      dice: "1d100xa",
      values: [value * 10, mod],
      labels: [label, "Mod"],
    });

    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${label} (x10)`,
    });
  }

  async _onRollSecondary(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const value = parseInt(el.dataset.value) || 0;
    const label = el.dataset.label;

    const mod = await openModDialog();
    const formula = getFormula({
      dice: "1d100xa",
      values: [value, mod],
      labels: [label, "Mod"],
    });

    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
    });
  }

  async _onRollCombat(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const type = el.dataset.type; // attack, block, dodge
    const value = parseInt(el.dataset.value) || 0;
    const label = el.dataset.label;

    const mod = await openModDialog();
    const formula = getFormula({
      dice: "1d100xa",
      values: [value, mod],
      labels: [label, "Mod"],
    });

    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
    });
  }

  async _onRollWeapon(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const weaponId = el.dataset.weaponId;
    const type = el.dataset.type; // attack, block, damage
    const weapon = this.actor.items.get(weaponId);

    if (!weapon) return;

    const combat = this.actor.system.combat;
    let value = 0;
    let label = weapon.name;
    let dice = "1d100xa";

    if (type === "attack") {
      value = (combat.attack?.final?.value || 0) + (weapon.system.attack?.final?.value || 0);
      label = `${weapon.name} - HA`;
    } else if (type === "block") {
      value = (combat.block?.final?.value || 0) + (weapon.system.block?.final?.value || 0);
      label = `${weapon.name} - HD`;
    } else if (type === "damage") {
      value = weapon.system.damage?.final?.value || 0;
      label = `${weapon.name} - Daño`;
      dice = "1d10";
    }

    const mod = await openModDialog();
    const formula = getFormula({
      dice: dice,
      values: [value, mod],
      labels: [label, "Mod"],
    });

    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
    });
  }

  async _onRollResistance(event) {
    event.preventDefault();
    const el = event.currentTarget;
    const value = parseInt(el.dataset.value) || 0;
    const label = el.dataset.label;

    const mod = await openModDialog();
    const formula = getFormula({
      dice: "1d100xa",
      values: [value, mod],
      labels: [label, "Mod"],
    });

    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
    });
  }

  async _onAddCustomSection() {
    const content = `<form><div class="form-group">
      <label>Título de la sección:</label>
      <input type="text" name="title" autofocus>
    </div></form>`;

    new Dialog({
      title: "Añadir Sección",
      content,
      buttons: {
        add: {
          icon: '<i class="fas fa-plus"></i>',
          label: "Añadir",
          callback: async (html) => {
            const title = html.find('[name="title"]').val()?.trim();
            if (title) {
              await this.actor.createEmbeddedDocuments("Item", [{
                name: title,
                type: "note",
                system: { description: { value: "" } },
              }]);
            }
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancelar",
        },
      },
      default: "add",
    }).render(true);
  }

  async _updateObject(event, formData) {
    // Handle special abilities notes updates
    if (formData.essentialAbilitiesContent !== undefined) {
      await this._updateOrCreateNote("Habilidades Esenciales", formData.essentialAbilitiesContent);
      delete formData.essentialAbilitiesContent;
    }
    if (formData.powersContent !== undefined) {
      await this._updateOrCreateNote("Poderes", formData.powersContent);
      delete formData.powersContent;
    }

    // Handle custom note updates
    const customNoteKeys = Object.keys(formData).filter(k => k.startsWith("customNote_"));
    for (const key of customNoteKeys) {
      const noteId = key.substring("customNote_".length);
      const noteItem = this.actor.items.get(noteId);
      if (noteItem) {
        await noteItem.update({ "system.description.value": formData[key] });
      }
      delete formData[key];
    }

    return super._updateObject(event, formData);
  }

  /**
   * Update or create a note item with the given name and content
   */
  async _updateOrCreateNote(name, content) {
    const existingNote = this.actor.items.find(i => i.type === "note" && i.name === name);

    if (content && content.trim().length > 0) {
      if (existingNote) {
        await existingNote.update({ "system.description.value": content });
      } else {
        await this.actor.createEmbeddedDocuments("Item", [{
          name: name,
          type: "note",
          system: { description: { value: content } }
        }]);
      }
    } else if (existingNote) {
      // Remove note if content is empty
      await existingNote.delete();
    }
  }
}
