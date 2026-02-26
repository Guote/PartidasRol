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
          { dragSelector: null, dropSelector: ".v2-tab-summoning" },
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

    // Ensure summoning/grimoire tabVisibility exists (migration for older actors)
    if (!sheet.system.ui.tabVisibility.summoning) {
      sheet.system.ui.tabVisibility.summoning = { value: sheet.system.ui.tabVisibility.mystic?.value || false };
    }
    if (!sheet.system.ui.tabVisibility.grimoire) {
      sheet.system.ui.tabVisibility.grimoire = { value: sheet.system.ui.tabVisibility.mystic?.value || false };
    }

    // Ensure resourceVisibility exists for older actors (migration support)
    if (!sheet.system.ui.resourceVisibility) {
      sheet.system.ui.resourceVisibility = {
        hp: { value: true },
        sacrificedLife: { value: false },
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
    // Ensure sacrificedLife exists (may be missing on actors created before this field)
    if (!sheet.system.ui.resourceVisibility.sacrificedLife) {
      sheet.system.ui.resourceVisibility.sacrificedLife = { value: false };
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

    // Combine roll buttons
    html.find(".v2-combine-btn").click((e) => {
      this._onCombineRoll(e);
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
    html.find('.item-link:not(.preset-edit)').click((e) => {
      e.preventDefault();
      const itemId = e.currentTarget.closest('[data-item-id]')?.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Click on incarnation row to open incarnation item sheet (but not on checkbox/input)
    html.find('.incarnation-row').click((e) => {
      if (e.target.classList.contains('incarnation-toggle') || e.target.classList.contains('incarnation-summon-bonus')) return;
      e.preventDefault();
      const itemId = e.currentTarget.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Incarnation active toggle — only one at a time
    html.find('.incarnation-toggle').click(async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      const isChecked = e.currentTarget.checked;
      const tokens = this.actor.getActiveTokens();

      if (isChecked) {
        // Deactivate all other incarnations first
        const updates = this.actor.items
          .filter(i => i.type === ABFItems.INCARNATION && i.id !== itemId && i.system.active?.value)
          .map(i => ({ _id: i.id, 'system.active.value': false }));
        updates.push({ _id: itemId, 'system.active.value': true });
        await this.actor.updateEmbeddedDocuments('Item', updates);
        if (tokens.length > 0) game?.cub?.addCondition('Encarnado', tokens);
      } else {
        await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.active.value': false }]);
        const stillActive = this.actor.items.some(
          i => i.type === ABFItems.INCARNATION && i.id !== itemId && i.system.active?.value
        );
        if (!stillActive && tokens.length > 0) game?.cub?.removeCondition('Encarnado', tokens);
      }
    });

    // Incarnation summonBonus inline edit
    html.find('.incarnation-summon-bonus').change(async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      const value = parseInt(e.currentTarget.value) || 0;
      await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, 'system.summonBonus.value': value }]);
    });
    html.find('.incarnation-summon-bonus').click((e) => e.stopPropagation());

    // Click on creature summon link to open linked actor sheet
    html.find('.creature-summon-link').click(async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uuid = e.currentTarget.dataset.uuid;
      if (uuid) {
        const actor = await fromUuid(uuid);
        if (actor?.sheet) {
          actor.sheet.render(true);
        } else {
          ui.notifications.warn(game.i18n.localize('anima.ui.mystic.creatureSummon.notFound'));
        }
      }
    });

    // Click on summon row to open summon item sheet
    html.find('.summon-row').click((e) => {
      e.preventDefault();
      const itemId = e.currentTarget.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Preset row click (opens dialog pre-filled)
    html.find('.preset-row-clickable').click((e) => {
      // Don't trigger if clicking the quick attack button
      if (e.target.closest('.preset-quick-attack')) return;
      e.preventDefault();
      const presetId = e.currentTarget.dataset.presetId;
      const presetType = e.currentTarget.dataset.presetType;
      this._openPresetDialog(presetType, presetId);
    });

    // Quick attack (sends immediately to chat)
    html.find('.preset-quick-attack').click((e) => {
      e.preventDefault();
      e.stopPropagation();
      const presetId = e.currentTarget.dataset.presetId;
      this._executeQuickAttack(presetId);
    });

    // Open attack dialog button
    html.find('.open-attack-dialog').click((e) => {
      e.preventDefault();
      this._openAttackDialog();
    });

    // Make the attack button draggable to macro hotbar
    html.find('.open-attack-dialog').on('dragstart', (e) => {
      const actorId = this.actor.id;
      const dragData = {
        type: "ABFAttackDialog",
        command: `{\nconst _actor = game.actors.get("${actorId}");\nconst _token = canvas.tokens.controlled[0] ?? _actor?.getActiveTokens()[0];\nconst _target = game.user.targets.first();\nif (!_token) return ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));\nconst { CombatAttackDialog } = await import("/systems/animabf-guote/module/dialogs/combat/CombatAttackDialog.js");\nnew CombatAttackDialog(_token, _target ?? _token, { onAttack: () => {} }, { allowed: true, closeOnSend: true });\n}`,
        name: `${game.i18n.localize("anima.macros.combat.dialog.attack.title")} - ${this.actor.name}`,
        img: "icons/skills/melee/strike-sword-slashing-red.webp"
      };
      e.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
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
   * Open the attack or defense dialog pre-filled with preset data
   * @param {string} type - The preset type ('attack' or 'defense')
   * @param {string} presetId - The preset item ID
   */
  async _openPresetDialog(type, presetId) {
    const preset = this.actor.items.get(presetId);
    if (!preset) {
      console.warn(`Preset with ID ${presetId} not found`);
      return;
    }

    // Get selected token and target
    const token = canvas.tokens.controlled[0] ?? this.actor.getActiveTokens()[0];
    const target = game.user.targets.first();

    if (!token) {
      ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));
      return;
    }

    if (type === 'attack') {
      // Import and open CombatAttackDialog with preset data
      const { CombatAttackDialog } = await import('../dialogs/combat/CombatAttackDialog.js');
      new CombatAttackDialog(token, target ?? token, {
        onAttack: () => {}
      }, {
        allowed: true,
        presetData: preset.system,
        presetId: preset._id,
        closeOnSend: true  // Close dialog after sending attack (chat combat mode)
      });
    } else if (type === 'defense') {
      // For defense presets, just show a notification - can only be used when defending
      ui.notifications.info(game.i18n.localize("anima.notifications.defensePresetInfo"));
    }
  }

  /**
   * Open the attack dialog without preset data (new attack)
   */
  async _openAttackDialog() {
    // Get selected token and target
    const token = canvas.tokens.controlled[0] ?? this.actor.getActiveTokens()[0];
    const target = game.user.targets.first();

    if (!token) {
      ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));
      return;
    }

    const { CombatAttackDialog } = await import('../dialogs/combat/CombatAttackDialog.js');
    new CombatAttackDialog(token, target ?? token, {
      onAttack: () => {}
    }, {
      allowed: true,
      closeOnSend: true  // Close dialog after sending attack (chat combat mode)
    });
  }

  /**
   * Execute a quick attack directly to chat using preset data
   * @param {string} presetId - The preset item ID
   */
  async _executeQuickAttack(presetId) {
    const preset = this.actor.items.get(presetId);
    if (!preset) {
      console.warn(`Preset with ID ${presetId} not found`);
      return;
    }

    // Get selected token and target
    const token = canvas.tokens.controlled[0] ?? this.actor.getActiveTokens()[0];
    const target = game.user.targets.first();

    if (!token) {
      ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));
      return;
    }

    const presetData = preset.system;
    const attackType = presetData.attackType?.value || "combat";

    // Import required modules
    const { ChatAttackCard } = await import('../combat/chat-combat/ChatAttackCard.js');
    const { default: ABFFoundryRoll } = await import('../rolls/ABFFoundryRoll.js');
    const { getFormula } = await import('../rolls/utils/getFormula.js');
    const { getMassAttackBonus } = await import('../combat/utils/getMassAttackBonus.js');

    const actorSystem = this.actor.system;
    const withoutRoll = presetData.withoutRoll?.value ?? false;
    const showRoll = presetData.showRoll?.value ?? true;
    const isAccumulation = presetData.isAccumulation?.value ?? false;
    const accumulationCount = presetData.accumulationCount?.value ?? 0;

    if (attackType === "combat") {
      const combat = presetData.combat || {};
      const weaponId = combat.weaponUsed?.value;
      const weapons = actorSystem.combat.weapons;
      const weapon = weaponId ? weapons.find(w => w._id === weaponId) : weapons[0];
      const unarmed = !weapon;

      const attack = weapon
        ? weapon.system.attack.final.value
        : actorSystem.combat.attack.final.value;

      const fatigueUsed = combat.fatigueUsed?.value || 0;
      const modifier = combat.modifier?.value || 0;
      const damageBonus = combat.damageBonus?.value || 0;
      const ignoredTA = combat.ignoredTA?.value || 0;
      const criticSelected = combat.criticSelected?.value || (weapon?.system.critic.primary.value) || "impact";

      const baseDamage = unarmed
        ? 10 + actorSystem.characteristics.primaries.strength.mod
        : weapon.system.damage.final.value;
      const finalDamage = Math.floor(((isAccumulation ? (baseDamage + damageBonus) * 1.5 : baseDamage + damageBonus)) / 5) * 5;

      let rollModifiers = [attack, getMassAttackBonus(accumulationCount), fatigueUsed * 15, modifier];
      let formula = getFormula({
        dice: "1d100xa",
        values: rollModifiers,
        labels: ["HA", `${accumulationCount} at. en masa`, "Cansancio", "Mod"],
      });

      if (withoutRoll) {
        formula = formula.replace("1d100xa", "0");
      }
      if (actorSystem.combat.attack.base.value >= 200) {
        formula = formula.replace("xa", "xamastery");
      }

      const roll = new ABFFoundryRoll(formula, actorSystem);
      await roll.roll();

      if (showRoll) {
        const flavor = weapon
          ? game.i18n.format("anima.macros.combat.dialog.physicalAttack.title", {
              weapon: weapon.name,
              target: target?.name || "?"
            })
          : game.i18n.format("anima.macros.combat.dialog.physicalAttack.unarmed.title", {
              target: target?.name || "?"
            });
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({ token }),
          flavor,
        });
      }

      const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
      const attackResult = {
        type: "combat",
        values: {
          unarmed,
          damage: finalDamage,
          ignoredTA,
          attack,
          weaponUsed: weaponId,
          critic: criticSelected,
          modifier,
          fatigueUsed,
          roll: rolled,
          total: roll.total,
          fumble: roll.fumbled,
        },
      };

      ChatAttackCard.create(token, attackResult, { weapon });

    } else if (attackType === "mystic") {
      const mystic = presetData.mystic || {};
      const projectionType = mystic.projectionType?.value || "normal";
      const spellId = mystic.spellUsed?.value;
      const spells = actorSystem.mystic.spells;
      const spell = spellId ? spells.find(s => s._id === spellId) : null;

      if (!spell) {
        ui.notifications.warn(game.i18n.localize("anima.notifications.noSpellSelected"));
        return;
      }

      const magicProjection = projectionType === "normal"
        ? actorSystem.mystic.magicProjection.final.value
        : actorSystem.mystic.magicProjection.imbalance.offensive.final.value;
      const baseMagicProjection = projectionType === "normal"
        ? actorSystem.mystic.magicProjection.base.value
        : actorSystem.mystic.magicProjection.imbalance.offensive.base.value;

      const modifier = mystic.modifier?.value || 0;
      const critic = mystic.critic?.value || "-";
      const damage = mystic.damage?.value || 0;
      const ignoredTA = mystic.ignoredTA?.value || 0;

      let rollModifiers = [magicProjection, getMassAttackBonus(accumulationCount), modifier];
      let formula = getFormula({
        dice: isAccumulation ? "2d100khxa" : "1d100xa",
        values: rollModifiers,
        labels: ["Proy. Mag.", `${accumulationCount} at. en masa`, "Mod."],
      });

      if (withoutRoll) {
        formula = formula.replace("1d100xa", "0");
      }
      if (baseMagicProjection >= 200) {
        formula = formula.replace("xa", "xamastery");
      }

      const roll = new ABFFoundryRoll(formula, actorSystem);
      await roll.roll();

      if (showRoll) {
        const flavor = game.i18n.format("anima.macros.combat.dialog.magicAttack.title", {
          spell: spell.name,
          target: target?.name || "?"
        });
        roll.toMessage({
          speaker: ChatMessage.getSpeaker({ token }),
          flavor,
        });
      }

      const rolled = roll.total - rollModifiers.reduce((a, b) => a + b, 0);
      const mysticAttackResult = {
        type: "mystic",
        values: {
          modifier,
          spellUsed: spellId,
          spellGrade: mystic.spellGrade?.value || "base",
          magicProjection,
          critic,
          damage,
          ignoredTA,
          roll: rolled,
          total: roll.total,
          fumble: roll.fumbled,
        },
      };

      ChatAttackCard.create(token, mysticAttackResult);

    } else if (attackType === "psychic") {
      const psychic = presetData.psychic || {};
      const powerId = psychic.powerUsed?.value;
      const powers = actorSystem.psychic.psychicPowers;
      const power = powerId ? powers.find(p => p._id === powerId) : null;

      if (!power) {
        ui.notifications.warn(game.i18n.localize("anima.notifications.noPowerSelected"));
        return;
      }

      const psychicProjection = actorSystem.psychic.psychicProjection.imbalance.offensive.final.value;
      const modifier = psychic.modifier?.value || 0;
      const potentialBonus = psychic.potentialBonus?.value || 0;
      const psychicPotentialBase = actorSystem.psychic.psychicPotential.final.value;
      const critic = psychic.critic?.value || "-";
      const damage = psychic.damage?.value || 0;
      const ignoredTA = psychic.ignoredTA?.value || 0;

      let rollModifiers = [psychicProjection, modifier];
      let formula = getFormula({
        values: rollModifiers,
        labels: ["Proy. Psi.", "Mod."],
      });

      if (withoutRoll) {
        formula = formula.replace("1d100xa", "0");
      }
      if (actorSystem.psychic.psychicProjection.base.value >= 200) {
        formula = formula.replace("xa", "xamastery");
      }

      const projectionRoll = new ABFFoundryRoll(formula, actorSystem);
      await projectionRoll.roll();

      const potentialFormula = getFormula({
        values: [psychicPotentialBase + potentialBonus, power.system.bonus.value],
        labels: ["Potencial", "Bono Poder"],
      });
      const potentialRoll = new ABFFoundryRoll(potentialFormula, actorSystem);
      await potentialRoll.roll();

      if (showRoll) {
        potentialRoll.toMessage({
          speaker: ChatMessage.getSpeaker({ token }),
          flavor: game.i18n.format("anima.macros.combat.dialog.psychicPotential.title"),
        });
        const flavor = game.i18n.format("anima.macros.combat.dialog.psychicAttack.title", {
          power: power.name,
          target: target?.name || "?",
          potential: potentialRoll.total,
        });
        projectionRoll.toMessage({
          speaker: ChatMessage.getSpeaker({ token }),
          flavor,
        });
      }

      const rolled = projectionRoll.total - psychicProjection - modifier;
      const psychicAttackResult = {
        type: "psychic",
        values: {
          modifier,
          powerUsed: powerId,
          psychicPotential: potentialRoll.total,
          psychicProjection,
          critic,
          damage,
          ignoredTA,
          roll: rolled,
          total: projectionRoll.total,
          fumble: projectionRoll.fumbled,
        },
      };

      ChatAttackCard.create(token, psychicAttackResult);
    }
  }
  /**
   * Handle drop events - supports dropping actors onto summoning tab as creature summons
   * @param {DragEvent} event - The drop event
   * @override
   */
  async _onDrop(event) {
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (e) {
      return super._onDrop(event);
    }

    // Check if dropping an Actor onto the summoning tab area
    if (data.type === 'Actor') {
      const target = event.target.closest('.v2-tab-summoning');
      if (target) {
        event.preventDefault();
        const droppedActor = await fromUuid(data.uuid);
        if (!droppedActor) {
          ui.notifications.warn(game.i18n.localize('anima.ui.mystic.creatureSummon.notFound'));
          return;
        }

        // Check for duplicates
        const existing = (this.actor.system.mystic?.creatureSummons || []);
        if (existing.some(cs => cs.system?.actorUuid?.value === data.uuid)) {
          ui.notifications.warn(game.i18n.localize('anima.ui.mystic.creatureSummon.alreadyLinked'));
          return;
        }

        await this.actor.createInnerItem({
          name: droppedActor.name,
          type: ABFItems.CREATURE_SUMMON,
          system: {
            actorId: { value: droppedActor.id },
            actorUuid: { value: data.uuid },
            notes: { value: '' }
          }
        });
        return;
      }
    }

    return super._onDrop(event);
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
  async _onCombineRoll(event) {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;
    const { dataset } = element;
    const skillValue = parseInt(dataset.rollvalue) || 0;
    const label = dataset.label || "";
    const mod = await openModDialog();
    const modifier = parseInt(mod) || 0;
    const combinedValue = Math.floor((skillValue + modifier) / 2);
    const formula = getFormula({
      dice: "1d100xa",
      values: [combinedValue],
      labels: [label],
    });
    const roll = new ABFFoundryRoll(formula, this.actor.system);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${game.i18n.localize("anima.ui.skills.combine")}: ${label} (${combinedValue})`,
    });
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

    // Mystic tab -> enable zeon, zeonAccumulated, shield, grimoire, summoning
    if (formData["system.ui.tabVisibility.mystic.value"] === true &&
        !currentUI.tabVisibility.mystic.value) {
      formData["system.ui.resourceVisibility.zeon.value"] = true;
      formData["system.ui.resourceVisibility.zeonAccumulated.value"] = true;
      formData["system.ui.resourceVisibility.shield.value"] = true;
      formData["system.ui.tabVisibility.grimoire.value"] = true;
      formData["system.ui.tabVisibility.summoning.value"] = true;
    }

    // Mystic tab unchecked -> also uncheck grimoire and summoning
    if (formData["system.ui.tabVisibility.mystic.value"] === false &&
        currentUI.tabVisibility.mystic.value) {
      formData["system.ui.tabVisibility.grimoire.value"] = false;
      formData["system.ui.tabVisibility.summoning.value"] = false;
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
