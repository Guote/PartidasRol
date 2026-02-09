import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { splitAsActorAndItemChanges } from "./utils/splitAsActorAndItemChanges.js";
import { unflat } from "./utils/unflat.js";
import { ALL_ITEM_CONFIGURATIONS } from "./utils/prepareItems/constants.js";
import { getFieldValueFromPath } from "./utils/prepareItems/util/getFieldValueFromPath.js";
import { getUpdateObjectFromPath } from "./utils/prepareItems/util/getUpdateObjectFromPath.js";
import { ABFItems } from "../items/ABFItems.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import { ABFSystemName } from "../../animabf-guote.name.js";
import { getFormula } from "../rolls/utils/getFormula.js";
import ABFSpellbook from "./ABFSpellbook.js";
export default class ABFActorSheetV2 extends ActorSheet {
  constructor(actor, options) {
    super(actor, options);
    this.buildCommonContextualMenu = (itemConfig) => {
      const {
        selectors: { containerSelector, rowSelector },
        fieldPath,
      } = itemConfig;
      const deleteRowMessage =
        itemConfig.contextMenuConfig?.customDeleteRowMessage ??
        this.i18n.localize("anima.contextualMenu.common.options.delete");
      const customCallbackFn = itemConfig.onDelete;
      const otherItems =
        itemConfig.contextMenuConfig?.buildExtraOptionsInContextMenu?.(
          this.actor
        ) ?? [];
      if (!itemConfig.isInternal && itemConfig.hasSheet) {
        otherItems.push({
          name: this.i18n.localize("anima.contextualMenu.common.options.edit"),
          icon: '<i class="fas fa-edit fa-fw"></i>',
          callback: (target) => {
            const { itemId } = target[0].dataset;
            if (itemId) {
              const item = this.actor.items.get(itemId);
              if (item?.sheet) {
                item.sheet.render(true);
              } else {
                console.warn("Item sheet was not found for item:", item);
              }
            } else {
              console.warn("Item ID was not found for target:", target);
            }
          },
        });
      }
      return new ContextMenu($(containerSelector), rowSelector, [
        ...otherItems,
        {
          name: deleteRowMessage,
          icon: '<i class="fas fa-trash fa-fw"></i>',
          callback: (target) => {
            if (!customCallbackFn && !fieldPath) {
              console.warn(
                `buildCommonContextualMenu: no custom callback and configuration set, could not delete the item: ${itemConfig.type}`
              );
            }
            if (customCallbackFn) {
              customCallbackFn(this.actor, target);
            } else {
              const id = target[0].dataset.itemId;
              if (!id) {
                throw new Error(
                  "Data id missing. Are you sure to set data-item-id to rows?"
                );
              }
              ABFDialogs.confirm(
                this.i18n.localize("anima.dialogs.items.delete.title"),
                this.i18n.localize("anima.dialogs.items.delete.body"),
                {
                  onConfirm: () => {
                    if (fieldPath) {
                      if (this.actor.getEmbeddedDocument("Item", id)) {
                        this.actor.deleteEmbeddedDocuments("Item", [id]);
                      } else {
                        let items = getFieldValueFromPath(
                          this.actor.system,
                          fieldPath
                        );
                        items = items.filter((item) => item._id !== id);
                        const dataToUpdate = {
                          system: getUpdateObjectFromPath(items, fieldPath),
                        };
                        this.actor.update(dataToUpdate);
                      }
                    }
                  },
                }
              );
            }
          },
        },
      ]);
    };
    this.i18n = game.i18n;
    this.position.width = this.getWidthDependingFromContent();
  }
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      ...{
        classes: ["abf", "sheet", "actor", "actor-sheet-v2"],
        template: `systems/${ABFSystemName}/templates/actor/actor-sheet-v2.hbs`,
        width: 650,
        height: 900,
        resizable: true,
        submitOnChange: true,
        tabs: [
          {
            navSelector: ".sheet-tabs",
            contentSelector: ".sheet-body",
            initial: "combat",
          },
          {
            navSelector: ".mystic-tabs",
            contentSelector: ".mystic-body",
            initial: "mystic-main",
          },
          {
            navSelector: ".psychic-tabs",
            contentSelector: ".psychic-body",
            initial: "psychic-main",
          },
        ],
        // Enable dragging item rows to the macro hotbar
        // Note: .rollable elements are handled manually in activateListeners
        dragDrop: [
          { dragSelector: ".item-list .item", dropSelector: null },
          { dragSelector: ".weapon-row", dropSelector: null },
          { dragSelector: ".armor-row", dropSelector: null },
          { dragSelector: ".spell-row", dropSelector: null },
          { dragSelector: ".ammo-row", dropSelector: null },
        ],
      },
    };
  }
  get template() {
    return `systems/${ABFSystemName}/templates/actor/actor-sheet-v2.hbs`;
  }
  bringToTop() {
    if (this.rendered && this.element && this.element[0]) {
      super.bringToTop();
    }
  }
  async close(options) {
    super.close(options);
    this.position.width = this.getWidthDependingFromContent();
  }
  getWidthDependingFromContent() {
    // V2 uses consistent 650px width - spells are now in a separate spellbook window
    return 650;
  }
  async getData(options) {
    const sheet = await super.getData(options);

    // Ensure system data is available for all actor types
    if (this.actor.type === "character") {
      await sheet.actor.prepareDerivedData();
    }
    sheet.system = sheet.actor.system;
    sheet.config = CONFIG.config;

    // Ensure resourceVisibility exists for older actors (migration support)
    if (!sheet.system.ui.resourceVisibility) {
      sheet.system.ui.resourceVisibility = {
        hp: { value: true },
        fatigue: { value: true },
        destiny: { value: true },
        zeon: { value: sheet.system.ui.tabVisibility?.mystic?.value || false },
        zeonAccumulated: { value: sheet.system.ui.tabVisibility?.mystic?.value || false },
        ki: { value: sheet.system.ui.tabVisibility?.domine?.value || false },
        kiAccumulated: { value: sheet.system.ui.tabVisibility?.domine?.value || false },
        psychicPoints: { value: sheet.system.ui.tabVisibility?.psychic?.value || false },
        shield: { value: (sheet.system.ui.tabVisibility?.mystic?.value || sheet.system.ui.tabVisibility?.psychic?.value) || false }
      };
    }

    // V2 Enhancements: Calculate equipped weapons for initiative dropdown
    sheet.equippedWeapons = sheet.system?.combat?.weapons || [];
    sheet.selectedWeaponId = sheet.system?.combat?.selectedWeaponId?.value || "";

    // Calculate initiative with selected weapon bonus
    const baseInitiative = sheet.system?.characteristics?.secondaries?.initiative?.final?.value || 0;
    const selectedWeapon = sheet.equippedWeapons.find(w => w._id === sheet.selectedWeaponId);
    const weaponInitBonus = selectedWeapon?.system?.initiative?.final?.value || 0;
    sheet.initiativeWithWeapon = baseInitiative + weaponInitBonus;

    // Calculate effective max HP (max - sacrificed)
    const hp = sheet.system?.characteristics?.secondaries?.lifePoints;
    if (hp) {
      sheet.effectiveMaxHp = hp.max - (hp.sacrificed || 0);
    }

    // Total level across all classes
    sheet.totalLevel = (sheet.system?.general?.levels || []).reduce(
      (sum, level) => sum + (level.system?.level || 0),
      0
    );

    // Calculate total Ki accumulated (sum of all characteristic accumulated values)
    const kiAccumulation = sheet.system?.domine?.kiAccumulation;
    if (kiAccumulation) {
      const characteristics = ['strength', 'agility', 'dexterity', 'constitution', 'willPower', 'power'];
      sheet.totalKiAccumulated = characteristics.reduce((sum, char) => {
        return sum + (kiAccumulation[char]?.accumulated?.value || 0);
      }, 0);
    } else {
      sheet.totalKiAccumulated = 0;
    }

    return sheet;
  }
  activateListeners(html) {
    super.activateListeners(html);
    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Rollable abilities - click to roll
    html.find(".rollable").click((e) => {
      this._onRoll(e);
    });

    // Make rollable elements draggable to the macro hotbar
    // We manually bind these since they're not standard Foundry items
    html.find(".rollable").each((_, el) => {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", (ev) => this._onDragStartRollable(ev), false);
    });

    html.find(".contractible-button").click((e) => {
      const { contractibleItemId } = e.currentTarget.dataset;
      if (contractibleItemId) {
        const ui = this.actor.system.ui;
        ui.contractibleItems = {
          ...ui.contractibleItems,
          [contractibleItemId]: !ui.contractibleItems[contractibleItemId],
        };
        this.actor.update({ system: { ui } });
      }
    });
    for (const item of Object.values(ALL_ITEM_CONFIGURATIONS)) {
      this.buildCommonContextualMenu(item);
      // Ensure item rows have draggable attribute (dragDrop config handles the event binding)
      html.find(item.selectors.rowSelector).each((_, row) => {
        row.setAttribute("draggable", "true");
      });
      html
        .find(`[data-on-click="${item.selectors.addItemButtonSelector}"]`)
        .click(() => {
          item.onCreate(this.actor);
        });
    }

    // V2 Quick Actions
    html.find(".v2-quick-action").click((e) => {
      const action = e.currentTarget.dataset.action;
      this._onQuickAction(action);
    });

    // Spellbook button (opens separate window)
    html.find('[data-action="open-spellbook"]').click((e) => {
      e.preventDefault();
      ABFSpellbook.openForActor(this.actor);
    });

    // Expandable sections (e.g., sacrificed HP)
    html.find(".v2-res__expand-toggle").click((e) => {
      const toggle = e.currentTarget;
      const targetId = toggle.dataset.expand;
      const target = html.find(`[data-expand-target="${targetId}"]`);

      toggle.classList.toggle("expanded");
      target.toggleClass("expanded");
    });

    // General modifier click - switch to effects tab
    html.find(".v2-header__gen-mod").click((e) => {
      e.preventDefault();
      const tabToActivate = e.currentTarget.dataset.tab;
      if (tabToActivate) {
        this._tabs[0].activate(tabToActivate);
      }
    });

    // TA block and other elements with data-action="open-tab"
    html.find('[data-action="open-tab"]').click((e) => {
      e.preventDefault();
      const tabToActivate = e.currentTarget.dataset.tab;
      if (tabToActivate) {
        this._tabs[0].activate(tabToActivate);
      }
    });

    // Click on item name to open item sheet
    html.find('.item-link').click((e) => {
      e.preventDefault();
      const itemId = e.currentTarget.closest('[data-item-id]')?.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });
  }

  /**
   * Handle quick action button clicks
   * @param {string} action - The action to perform
   */
  async _onQuickAction(action) {
    switch (action) {
      case "rest":
        await this._handleRest();
        break;
      case "half-rest":
        await this._handleHalfRest();
        break;
      case "import-spells":
        await this._handleImportSpells();
        break;
      default:
        console.warn(`Unknown quick action: ${action}`);
    }
  }

  /**
   * Handle full rest action - restore fatigue and heal based on regeneration
   */
  async _handleRest() {
    const hp = this.actor.system.characteristics.secondaries.lifePoints;
    const fatigue = this.actor.system.characteristics.secondaries.fatigue;
    const regen = this.actor.system.characteristics.secondaries.regeneration;

    // Calculate effective max HP (max - sacrificed)
    const effectiveMax = hp.max - (hp.sacrificed || 0);

    // Calculate healing amount from resting regeneration
    const healAmount = regen?.resting?.value || 10;
    const newHp = Math.min(hp.value + healAmount, effectiveMax);

    await this.actor.update({
      "system.characteristics.secondaries.fatigue.value": fatigue.max,
      "system.characteristics.secondaries.lifePoints.value": newHp
    });

    // Notify the user
    ui.notifications.info(game.i18n.localize("anima.notifications.rested"));
  }

  /**
   * Handle half rest action - restore half fatigue, no HP recovery
   */
  async _handleHalfRest() {
    const fatigue = this.actor.system.characteristics.secondaries.fatigue;

    // Restore half of max fatigue (rounded up)
    const halfFatigue = Math.ceil(fatigue.max / 2);
    const newFatigue = Math.min(fatigue.value + halfFatigue, fatigue.max);

    await this.actor.update({
      "system.characteristics.secondaries.fatigue.value": newFatigue
    });

    // Notify the user
    ui.notifications.info(game.i18n.localize("anima.notifications.halfRested"));
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
  }
  /**
   * Handle dragstart events for items and rollable abilities
   * @param {DragEvent} event - The drag event
   * @override
   */
  _onDragStart(event) {
    const element = event.currentTarget;

    // Check if this is a rollable element (not an item row)
    if (element.classList.contains("rollable") && element.dataset.roll) {
      const dragData = {
        type: "Roll",
        actorId: this.actor.id,
        label: element.dataset.label || "Roll",
        roll: element.dataset.roll,
        rollValue: element.dataset.rollvalue,
        rollLabel: element.dataset.label
      };
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      return;
    }

    // Check if this is an item row with data-item-id
    if (element.dataset.itemId) {
      const item = this.actor.items.get(element.dataset.itemId);
      if (item) {
        const dragData = {
          type: "Item",
          actorId: this.actor.id,
          data: item.toObject(),
          uuid: item.uuid
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        return;
      }
    }

    // Fall back to default behavior
    super._onDragStart(event);
  }

  /**
   * Handle dragstart specifically for rollable elements (skills, characteristics, etc.)
   * @param {DragEvent} event - The drag event
   */
  _onDragStartRollable(event) {
    const element = event.currentTarget;

    if (!element.dataset.roll) {
      console.log("ABF | _onDragStartRollable: No roll data on element");
      return;
    }

    const dragData = {
      type: "Roll",
      actorId: this.actor.id,
      label: (element.dataset.label || "Roll").trim(),
      roll: element.dataset.roll,
      rollValue: element.dataset.rollvalue,
      rollLabel: (element.dataset.label || "Roll").trim()
    };

    console.log("ABF | _onDragStartRollable: Setting drag data", dragData);
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

    // Set drag image (optional - creates a ghost image while dragging)
    if (event.dataTransfer.setDragImage) {
      const dragImage = document.createElement("div");
      dragImage.textContent = dragData.label;
      dragImage.style.cssText = "position: absolute; top: -1000px; background: #6e2917; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;";
      document.body.appendChild(dragImage);
      event.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => dragImage.remove(), 0);
    }
  }

  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const { dataset } = element;
    if (dataset.roll) {
      const label = dataset.label ? `Rolling ${dataset.label}` : "";
      const mod = await openModDialog();
      console.log(dataset);
      let formula = getFormula({
        dice: dataset.roll,
        values: [dataset.rollvalue, mod],
        labels: [`${dataset.label}`, "Mod"],
      });
      if (formula.includes("10TO100")) {
        let totalLevel = this.actor.system.general.levels.reduce((sum, item) => sum + (item.system.level || 0), 0);
        console.log("entramos", {totalLevel})
        formula = getFormula({
          dice: dataset.roll,
          values: [dataset.rollvalue, totalLevel*10, mod],
          labels: [`${dataset.label}`, "Nivel", "Mod"],
        }).replace("10TO100","");
      }
      if (parseInt(dataset.extra) >= 200)
        formula = formula.replace("xa", "xamastery");
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
      });
    }
  }
  async _updateObject(event, formData) {
    // Handle header resource inputs (prefixed with _header.)
    // Header inputs use _header.system.X.Y to avoid duplicate names with tab inputs
    // Map them to the real paths, giving header priority over tab values
    Object.keys(formData).forEach((key) => {
      if (key.startsWith("_header.")) {
        const realKey = key.substring(8); // Remove "_header." prefix
        formData[realKey] = formData[key];
        delete formData[key];
      }
    });

    // Ensure name is never blank (use current name if form submits empty)
    if (!formData.name || formData.name.trim() === "") {
      formData.name = this.actor.name;
    }

    // Auto-enable resource visibility when tab visibility is enabled
    const currentUI = this.actor.system.ui;

    // Mystic tab -> enable zeon, zeonAccumulated, shield
    if (formData["system.ui.tabVisibility.mystic.value"] === true &&
        !currentUI.tabVisibility.mystic.value) {
      formData["system.ui.resourceVisibility.zeon.value"] = true;
      formData["system.ui.resourceVisibility.zeonAccumulated.value"] = true;
      formData["system.ui.resourceVisibility.shield.value"] = true;
    }

    // Domine tab -> enable ki, kiAccumulated
    if (formData["system.ui.tabVisibility.domine.value"] === true &&
        !currentUI.tabVisibility.domine.value) {
      formData["system.ui.resourceVisibility.ki.value"] = true;
      formData["system.ui.resourceVisibility.kiAccumulated.value"] = true;
    }

    // Psychic tab -> enable psychicPoints, shield
    if (formData["system.ui.tabVisibility.psychic.value"] === true &&
        !currentUI.tabVisibility.psychic.value) {
      formData["system.ui.resourceVisibility.psychicPoints.value"] = true;
      formData["system.ui.resourceVisibility.shield.value"] = true;
    }

    // We have to parse all qualities in order to convert from it selectable to integers to make calculations
    Object.keys(formData).forEach((key) => {
      if (key.includes("quality")) {
        formData[key] = parseInt(formData[key], 10);
      }
    });
    const [actorChanges, itemChanges] = splitAsActorAndItemChanges(formData);
    await this.updateItems(itemChanges);
    return super._updateObject(event, actorChanges);
  }
  async updateItems(_changes) {
    if (!_changes || Object.keys(_changes).length === 0) return;
    const changes = unflat(_changes);
    for (const item of Object.values(ALL_ITEM_CONFIGURATIONS)) {
      const fromDynamicChanges = item.getFromDynamicChanges(changes);
      if (fromDynamicChanges) {
        await item.onUpdate(this.actor, fromDynamicChanges);
      }
    }
  }
}
