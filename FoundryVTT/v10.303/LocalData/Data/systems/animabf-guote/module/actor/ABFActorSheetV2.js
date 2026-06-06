import { openModDialog } from "../utils/dialogs/openSimpleInputDialog.js";
import ABFFoundryRoll from "../rolls/ABFFoundryRoll.js";
import { splitAsActorAndItemChanges } from "./utils/splitAsActorAndItemChanges.js";
import { unflat } from "./utils/unflat.js";
import { ALL_ITEM_CONFIGURATIONS } from "./utils/prepareItems/constants.js";
import { getFieldValueFromPath } from "./utils/prepareItems/util/getFieldValueFromPath.js";
import { getUpdateObjectFromPath } from "./utils/prepareItems/util/getUpdateObjectFromPath.js";
import { ABFItems } from "../items/ABFItems.js";
import { CREATURE_SUMMON_INITIAL_SYSTEM } from "../types/mystic/CreatureSummonItemConfig.js";
import { CREATURE_INITIAL_SYSTEM } from "../types/domine/CreatureItemConfig.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import { ABFSystemName } from "../../animabf-guote.name.js";
import { getFormula } from "../rolls/utils/getFormula.js";
import { getModifierTerms } from "../rolls/utils/getModifierTerms.js";
import { hasInhumanity, hasZen } from "./utils/humanidad.js";
import ABFSpellbook from "./ABFSpellbook.js";
import { KiCalculatorDialog, KI_STATS } from "../dialogs/domine/KiCalculatorDialog.js";
import { KI_MAINTENANCE_INITIAL_SYSTEM } from "../types/domine/KiMaintenanceItemConfig.js";
export default class ABFActorSheetV2 extends ActorSheet {
  constructor(actor, options) {
    super(actor, options);
    this.i18n = game.i18n;
    this._inventorySort = {
      weapons:      { field: null, dir: 'asc' },
      armors:       { field: null, dir: 'asc' },
      ammo:         { field: null, dir: 'asc' },
      inventory:    { field: null, dir: 'asc' },
      summons:      { field: null, dir: 'asc' },
      incarnations: { field: null, dir: 'asc' },
      psychicPowers:{ field: null, dir: 'asc' },
    };
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
          { dragSelector: ".item-list .item, .weapon-row, .armor-row, .spell-row, .ammo-row", dropSelector: null },
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
    // Ensure individual ki stat visibility flags exist (migration support)
    for (const key of ['kiStr', 'kiAgi', 'kiDex', 'kiCon', 'kiWp', 'kiPow']) {
      if (!sheet.system.ui.resourceVisibility[key]) {
        sheet.system.ui.resourceVisibility[key] = { value: false };
      }
    }
    // Ensure tokenBarVisibility exists (migration for older actors)
    if (!sheet.system.ui.tokenBarVisibility) {
      sheet.system.ui.tokenBarVisibility = {
        hp: { value: false },
        fatigue: { value: false },
        ki: { value: false },
        zeon: { value: false },
        psychicPoints: { value: false },
        shield: { value: false },
      };
    }

    // V2 Enhancements: Calculate equipped weapons for initiative dropdown
    // Sort so Desarmado (isDefault) always appears first
    if (sheet.system?.combat?.weapons) {
      sheet.system.combat.weapons.sort((a, b) =>
        (b.system?.isDefault?.value ? 1 : 0) - (a.system?.isDefault?.value ? 1 : 0)
      );
    }
    sheet.equippedWeapons = sheet.system?.combat?.weapons || [];
    sheet.selectedWeaponId = sheet.system?.combat?.selectedWeaponId?.value || "";
    sheet.selectedWeapons = sheet.equippedWeapons.filter(w => w.system?.isShown?.value);

    // Build display list with effective initiative values and slowest flag for the combat tab
    const naturalTurno = sheet.system?.characteristics?.secondaries?.initiative?.base?.value ?? 0;
    const naturalBase = naturalTurno - 20;
    const weaponEffective = w => naturalBase + (w.system?.initiative?.final?.value ?? 0);

    const desarmadoEntry = sheet.selectedWeapons.find(w => w.system?.isDefault?.value);
    const regularTurnWeapons = sheet.selectedWeapons
      .filter(w => !w.system?.isShield?.value && !w.system?.isDefault?.value);

    const allInitEntries = [
      ...(desarmadoEntry ? [{ name: desarmadoEntry.name, initValue: weaponEffective(desarmadoEntry) }] : []),
      ...regularTurnWeapons.map(w => ({ name: w.name, initValue: weaponEffective(w) })),
    ];
    if (allInitEntries.length === 0) {
      allInitEntries.push({ name: "Natural", initValue: naturalTurno });
    }
    const minInitValue = Math.min(...allInitEntries.map(e => e.initValue));
    sheet.selectedWeaponsDisplay = allInitEntries.map(e => ({
      name: e.name,
      initValue: e.initValue,
      isSlowest: e.initValue === minInitValue,
    }));

    // Calculate effective max HP (max - sacrificed)
    const hp = sheet.system?.characteristics?.secondaries?.lifePoints;
    if (hp) {
      sheet.effectiveMaxHp = hp.max - (hp.sacrificed || 0);
    }

    sheet.totalLevel = sheet.system?.general?.level?.value || 0;

    // Calculate total Ki accumulated (sum of all characteristic accumulated values)
    const kiAccumulation = sheet.system?.domine?.kiAccumulation;
    if (kiAccumulation) {
      const characteristics = ['agility', 'constitution', 'dexterity', 'strength', 'power', 'willPower'];
      sheet.totalKiAccumulated = characteristics.reduce((sum, char) => {
        return sum + (kiAccumulation[char]?.accumulated?.value || 0);
      }, 0);
      sheet.totalKiAccRate = characteristics.reduce((sum, char) => {
        return sum + (kiAccumulation[char]?.final?.value || 0);
      }, 0);
    } else {
      sheet.totalKiAccumulated = 0;
      sheet.totalKiAccRate = 0;
    }

    // Active technique upkeeps for the ki effects table
    sheet.activeTechniqueUpkeeps = this.actor.items
      .filter(i => i.type === 'technique' && (i.system?.roundCost?.value ?? 0) > 0)
      .map(i => ({ id: i.id, name: i.name, roundCost: i.system.roundCost.value, active: i.system?.active?.value ?? false }));

    const KI_STAT_DISPLAY = [
      ['agility', 'Agi'], ['constitution', 'Con'], ['dexterity', 'Des'],
      ['strength', 'Fue'], ['power', 'Pod'], ['willPower', 'Vol']
    ];
    sheet.techniqueRows = (sheet.system?.domine?.techniques ?? []).map(t => {
      const parts = KI_STAT_DISPLAY
        .filter(([s]) => (Number(t.system?.[s]?.value) || 0) > 0)
        .map(([s, label]) => `${label} ${Number(t.system[s].value) || 0}`);
      const total = KI_STAT_DISPLAY.reduce((sum, [s]) => sum + (Number(t.system?.[s]?.value) || 0), 0);
      const kiCostStr = parts.length > 0 ? `${parts.join(', ')} (Total: ${total})` : '—';
      const mant = Number(t.system?.roundCost?.value) || 0;
      return {
        _id: t._id,
        name: t.name,
        system: t.system,
        kiCostStr,
        kiTotal: total,
        mantenimientoStr: mant > 0 ? String(mant) : '—'
      };
    });

    sheet.kiMaintenanceTotalRound =
      (sheet.system?.domine?.kiMaintenances ?? [])
        .filter(m => m.system?.active?.value)
        .reduce((s, m) => s + (m.system?.roundCost?.value || 0), 0)
      + sheet.activeTechniqueUpkeeps
        .filter(t => t.active)
        .reduce((s, t) => s + t.roundCost, 0);

    // Build flattened summonRows (one row per power per summon)
    const evalSummonFormula = (formula, ne) => {
      if (!formula?.trim()) return 0;
      try { return Roll.safeEval(formula.replace(/\[NE\]/gi, ne)); } catch { return 0; }
    };
    const specialization = sheet.system?.mystic?.summoning?.specialization?.value ?? 'ninguna';
    sheet.summonRows = [];
    for (const summon of sheet.system?.mystic?.summons || []) {
      const powers = summon.system?.powers ?? [];
      const multiPower = powers.length > 1;
      for (let i = 0; i < powers.length; i++) {
        const power = powers[i];
        const ne = power.ne?.value ?? 0;
        const base = power.zeon?.base?.value ?? 0;
        const dur = power.duracion?.value;
        sheet.summonRows.push({
          summon,
          powerIndex: i,
          multiPower,
          displayName: multiPower ? `${summon.name} \u2013 ${power.name || '?'}` : summon.name,
          power,
          ne,
          atkFinal:    evalSummonFormula(power.atkFormula?.value, ne),
          defFinal:    evalSummonFormula(power.defFormula?.value, ne),
          damageFinal: evalSummonFormula(power.damageFormula?.value, ne),
          rmFinal:     evalSummonFormula(power.rmFormula?.value, ne),
          zeonFinal:   specialization === 'invocador' ? Math.ceil(base / 2) : base,
          resolvedDuration: (dur && ne > 0) ? dur.replace(/\[NE\]/gi, ne) : '',
        });
      }
    }

    // Inventory / table column sorting
    const _sortVal = (item, field) => ({
      attack:       item.system?.attack?.final?.value,
      block:        item.system?.block?.final?.value,
      damage:       item.system?.damage?.final?.value,
      initiative:   item.system?.initiative?.final?.value,
      critic:       item.system?.critic?.primary?.value ?? item.system?.critic?.value,
      cut:          item.system?.cut?.final?.value,
      impact:       item.system?.impact?.final?.value,
      thrust:       item.system?.thrust?.final?.value,
      heat:         item.system?.heat?.final?.value,
      electricity:  item.system?.electricity?.final?.value,
      cold:         item.system?.cold?.final?.value,
      energy:       item.system?.energy?.final?.value,
      name:         item.name?.toLowerCase(),
      amount:       item.system?.amount?.value,
      weight:       item.system?.weight?.value,
      difficulty:   item.system?.difficulty?.value,
      summonBonus:  item.system?.summonBonus?.value,
      discipline:   item.system?.discipline?.value?.toLowerCase(),
      level:        item.system?.level?.value,
      bonus:        item.system?.bonus?.value,
    })[field] ?? 0;
    const _sortArr = (arr, { field, dir }) => {
      if (!field || !arr?.length) return arr;
      return [...arr].sort((a, b) => {
        const av = _sortVal(a, field), bv = _sortVal(b, field);
        const cmp = typeof av === 'string' ? av.localeCompare(bv, 'es', { numeric: true }) : (av ?? 0) - (bv ?? 0);
        return dir === 'asc' ? cmp : -cmp;
      });
    };
    sheet.system.combat.weapons    = _sortArr(sheet.system.combat.weapons,    this._inventorySort.weapons);
    sheet.system.combat.armors     = _sortArr(sheet.system.combat.armors,     this._inventorySort.armors);
    sheet.system.combat.ammo       = _sortArr(sheet.system.combat.ammo,       this._inventorySort.ammo);
    sheet.system.general.inventory = _sortArr(sheet.system.general.inventory, this._inventorySort.inventory);
    sheet.system.mystic.incarnations  = _sortArr(sheet.system.mystic.incarnations,  this._inventorySort.incarnations);
    sheet.system.psychic.psychicPowers = _sortArr(sheet.system.psychic.psychicPowers, this._inventorySort.psychicPowers);
    // summonRows is pre-computed above — sort it by its own fields
    const _summonSortVal = (row, field) => ({
      name:      row.displayName?.toLowerCase(),
      ne:        row.ne,
      summonDif: row.power?.summonDif?.value,
      zeon:      row.zeonFinal,
    })[field] ?? 0;
    const { field: sField, dir: sDir } = this._inventorySort.summons;
    if (sField && sheet.summonRows?.length) {
      sheet.summonRows = [...sheet.summonRows].sort((a, b) => {
        const av = _summonSortVal(a, sField), bv = _summonSortVal(b, sField);
        const cmp = typeof av === 'string' ? av.localeCompare(bv, 'es', { numeric: true }) : (av ?? 0) - (bv ?? 0);
        return sDir === 'asc' ? cmp : -cmp;
      });
    }
    const _sortHeaders = (section, fields) => {
      const s = this._inventorySort[section];
      return Object.fromEntries(fields.map(f => [f, { active: s.field === f, dir: s.field === f ? s.dir : 'asc' }]));
    };
    sheet.inventorySortHeaders = {
      weapons:      _sortHeaders('weapons',      ['name','attack','block','damage','initiative','critic']),
      armors:       _sortHeaders('armors',       ['name','cut','impact','thrust','heat','electricity','cold','energy']),
      ammo:         _sortHeaders('ammo',         ['name','amount','damage','critic']),
      inventory:    _sortHeaders('inventory',    ['name','amount','weight']),
      summons:      _sortHeaders('summons',      ['name','ne','summonDif','zeon']),
      incarnations: _sortHeaders('incarnations', ['name','difficulty','summonBonus']),
      psychicPowers:_sortHeaders('psychicPowers',['discipline','level','name','bonus']),
    };

    return sheet;
  }
  _buildCommonContextualMenu(itemConfig, html) {
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
    return new ContextMenu(html ? html.find(containerSelector) : $(containerSelector), rowSelector, [
      ...otherItems,
      {
        name: deleteRowMessage,
        icon: '<i class="fas fa-trash fa-fw"></i>',
        condition: (target) => {
          const id = target[0]?.dataset?.itemId;
          if (!id) return true;
          const item = this.actor.items.get(id);
          return !item?.system?.isDefault?.value;
        },
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
  }
  activateListeners(html) {
    super.activateListeners(html);

    // Inline-style the active humanidad toggle pill so it wins over Foundry's global label resets.
    html.find('.v2-humanidad-toggle__opt').each((_, el) => {
      if (el.classList.contains('active')) {
        el.style.setProperty('background', 'rgba(255, 255, 255, 0.4)', 'important');
        el.style.setProperty('color', '#fff', 'important');
        el.style.setProperty('border-color', 'rgba(255, 255, 255, 0.8)', 'important');
        el.style.setProperty('font-weight', 'bold', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('box-shadow', '0 0 0 1px rgba(255, 255, 255, 0.25)', 'important');
      }
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Rollable abilities - click to roll
    html.find(".rollable").click((e) => {
      this._onRoll(e);
    });

    // Combined roll — header button toggles checkbox mode, second click confirms
    html.find('[data-on-click="toggle-combine-mode"]').on('click', async (e) => {
      e.stopPropagation();
      const tabEl = html.find('.v2-tab-skills')[0];
      if (!tabEl) return;
      const isActive = tabEl.classList.contains('v2-combine-active');
      const labelEl = e.currentTarget.querySelector('.v2-combine-label');
      if (!isActive) {
        tabEl.classList.add('v2-combine-active');
        if (labelEl) labelEl.textContent = 'Selecciona habilidades y confirma';
        html.find('.v2-skill-combine-checkbox').prop('checked', false);
        return;
      }
      const checked = html.find('.v2-skill-combine-checkbox:checked');
      const N = checked.length;
      tabEl.classList.remove('v2-combine-active');
      if (labelEl) labelEl.textContent = 'Combinar';
      if (N === 0) return;
      const mod = await openModDialog();
      const modifier = parseInt(mod) || 0;
      const totalLevel = this.actor.system.general.level?.value || 0;
      const humanidad = this.actor.system.flags?.humanidad ?? 'human';
      const values = [];
      const labels = [];
      checked.each((_, el) => {
        let raw = parseInt(el.dataset.rollvalue) || 0;
        if (el.dataset.isCharacteristic === 'true') {
          // Apply 10TO100: stat × 10 → effective bonus + level bonus + inhumanity/zen bonus
          const statVal = raw / 10;
          let effectiveBonus;
          if (hasZen(humanidad)) {
            effectiveBonus = raw;
          } else if (hasInhumanity(humanidad)) {
            effectiveBonus = Math.min(statVal, 13) * 10;
          } else {
            effectiveBonus = Math.min(statVal, 10) * 10;
          }
          let extra = 0;
          if (statVal > 13 && hasZen(humanidad)) extra = 80;
          else if (statVal > 10 && hasInhumanity(humanidad)) extra = 40;
          raw = effectiveBonus + totalLevel * 10 + extra;
        }
        values.push(Math.floor(raw / N / 5) * 5);
        labels.push(el.dataset.label || '?');
      });
      if (modifier !== 0) { values.push(modifier); labels.push('Mod'); }
      const formula = getFormula({ dice: '1d100xa', values, labels });
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `Tirada combinada (${N} habilidades)`,
      });
    });

    // Open capacidades físicas reference journal
    html.find('[data-on-click="open-capacidades-journal"]').on('click', (e) => {
      e.stopPropagation();
      const journal = game.journal.find(j => j.name === 'Capacidades Físicas');
      if (journal) journal.sheet.render(true);
      else ui.notifications.warn('Crea el diario con: ABFMacros.createCapacidadesJournal()');
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
      this._buildCommonContextualMenu(item, html);
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

    // Configurar Barras BarBrawl button — aplica al prototipo y todos los tokens del actor
    html.find('[data-action="configurar-barras-brawl"]').click(async () => {
      const macro = game.macros.find(m => m.name === "Configurar Barras BarBrawl");
      if (!macro) {
        ui.notifications.warn("Macro 'Configurar Barras BarBrawl' no encontrada.");
        return;
      }
      await macro.execute({ targetActor: this.actor });
    });

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

    // Zeon inputs: shrink font when value reaches 4+ digits
    const zeonInputs = html.find('.v2-res--zeon .v2-res__input, .v2-res--zeon-acc .v2-res__input');
    const updateZeonLong = () => zeonInputs.each(function () {
      this.classList.toggle('v2-res__input--long', this.value.length >= 4);
    });
    updateZeonLong();
    zeonInputs.on('change', updateZeonLong);

    // Resource inputs: select-all on focus, delta notation (+3 / -2) on change
    html.find('.v2-res__input').on('focus', function () {
      this.select();
    }).on('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
      }
    }).on('change', function () {
      const raw = this.value.trim();
      if (/^[+-]\d+$/.test(raw)) {
        const base = parseInt(this.defaultValue, 10);
        this.value = isNaN(base) ? this.defaultValue : base + parseInt(raw, 10);
      } else if (raw === '' || isNaN(Number(raw))) {
        this.value = this.defaultValue;
      }
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

    // Click on creature summon link to open linked actor sheet (summoning tab)
    html.find('.creature-summon-link').click(async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this._openLinkedActorSheet(e.currentTarget.dataset.uuid, 'anima.ui.mystic.creatureSummon.notFound');
    });

    // Click on ki creature link to open linked actor sheet (domine tab)
    html.find('.ki-creature-link').click(async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this._openLinkedActorSheet(e.currentTarget.dataset.uuid, 'anima.ui.domine.kiCreatures.notFound');
    });

    // Open Ki Accumulation Calculator from the domine tab
    html.find('[data-on-click="ki-accumulation-calculator"]').click((e) => {
      e.preventDefault();
      KiCalculatorDialog.openForActor(this.actor);
    });
    // Make button draggable to hotbar
    html.find('[data-on-click="ki-accumulation-calculator"]').on('dragstart', (e) => {
      e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'KiCalculator',
        actorId: this.actor.id,
        name: `Ki — ${this.actor.name}`,
        img: '_Recursos/Iconos/kiRitual.png'
      }));
    });

    // Accumulate ki by one round (each stat += its final rate)
    html.find('[data-on-click="ki-accumulate-generic"]').click(async (e) => {
      e.preventDefault();
      const updates = {};
      for (const stat of KI_STATS) {
        const rate = this.actor.system.domine.kiAccumulation[stat]?.final?.value ?? 0;
        const acc  = this.actor.system.domine.kiAccumulation[stat]?.accumulated?.value ?? 0;
        updates[`system.domine.kiAccumulation.${stat}.accumulated.value`] = acc + rate;
      }
      if (Object.keys(updates).length) await this.actor.update(updates);
    });

    // Reset all ki accumulation to 0
    html.find('[data-on-click="ki-reset-accumulation"]').click(async (e) => {
      e.preventDefault();
      const updates = {};
      for (const stat of KI_STATS) {
        updates[`system.domine.kiAccumulation.${stat}.accumulated.value`] = 0;
      }
      await this.actor.update(updates);
    });

    // Ki accumulated row: direct update bypasses form/header priority conflict
    html.find('.v2-ki-acc-input').on('change', async (e) => {
      const field = e.currentTarget.dataset.field;
      if (!field) return;
      await this.actor.update({ [field]: Number(e.currentTarget.value) || 0 });
    });

    // Ki maintenance: add new entry
    html.find('[data-on-click="add-ki-maintenance"]').on('click', async () => {
      await this.actor.createInnerItem({
        type: ABFItems.KI_MAINTENANCE,
        name: 'Nuevo efecto',
        system: KI_MAINTENANCE_INITIAL_SYSTEM
      });
    });

    // Ki maintenance: active toggle
    html.find('.km-active-toggle').on('click', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.closest('[data-item-id]')?.dataset.itemId;
      if (!itemId) return;
      const maintenances = this.actor.system.domine.kiMaintenances ?? [];
      const entry = maintenances.find(m => m._id === itemId);
      if (!entry) return;
      await this.actor.updateInnerItem({
        type: ABFItems.KI_MAINTENANCE,
        id: itemId,
        system: { ...entry.system, active: { value: e.currentTarget.checked } }
      });
    });

    // Ki maintenance: name change
    html.find('.km-name-input').on('change', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.closest('[data-item-id]')?.dataset.itemId;
      if (!itemId) return;
      const maintenances = this.actor.system.domine.kiMaintenances ?? [];
      const entry = maintenances.find(m => m._id === itemId);
      if (!entry) return;
      await this.actor.updateInnerItem({
        type: ABFItems.KI_MAINTENANCE,
        id: itemId,
        name: e.currentTarget.value,
        system: entry.system
      });
    });

    // Ki maintenance: cost change
    html.find('.km-cost-input').on('change', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.closest('[data-item-id]')?.dataset.itemId;
      if (!itemId) return;
      const maintenances = this.actor.system.domine.kiMaintenances ?? [];
      const entry = maintenances.find(m => m._id === itemId);
      if (!entry) return;
      await this.actor.updateInnerItem({
        type: ABFItems.KI_MAINTENANCE,
        id: itemId,
        system: { ...entry.system, roundCost: { value: Number(e.currentTarget.value) || 0 } }
      });
    });

    // Ki maintenance: delete
    html.find('[data-on-click="delete-ki-maintenance"]').on('click', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      if (!itemId) return;
      ABFDialogs.confirm(
        game.i18n.localize('anima.dialogs.items.delete.title'),
        game.i18n.localize('anima.dialogs.items.delete.body'),
        {
          onConfirm: async () => {
            const maintenances = this.actor.system.domine.kiMaintenances ?? [];
            await this.actor.update({
              'system.domine.kiMaintenances': maintenances.filter(m => m._id !== itemId)
            });
          }
        }
      );
    });

    // Inventory column sort headers
    html.find('.inventory-sort-th').click((e) => {
      const { sortTable, sortField } = e.currentTarget.dataset;
      const s = this._inventorySort[sortTable];
      if (s.field === sortField) {
        s.dir = s.dir === 'asc' ? 'desc' : 'asc';
      } else {
        s.field = sortField;
        s.dir = 'asc';
      }
      this.render(false);
    });

    // Click eye button to open weapon item sheet (inventory tab)
    html.find('.weapon-open-sheet').click((e) => {
      e.preventDefault();
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) item.sheet.render(true);
      }
    });

    // Click on psychic power details button to open item sheet (psychic tab)
    html.find('.psychic-power-open-sheet').click((e) => {
      e.preventDefault();
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Click on technique row to open technique item sheet (domine tab)
    html.find('.technique-row').click((e) => {
      if (e.target.closest('button, input')) return;
      e.preventDefault();
      const itemId = e.currentTarget.dataset.itemId;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Technique upkeep active toggle (technique-derived rows in ki effects table)
    html.find('.technique-upkeep-active-toggle').on('click', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      if (!itemId) return;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      await item.update({ 'system.active.value': e.currentTarget.checked });
    });

    // Cast technique button — deducts ki costs from accumulated pools and base ki pool
    html.find('[data-on-click="cast-technique"]').on('click', async (e) => {
      e.stopPropagation();
      const itemId = e.currentTarget.dataset.itemId;
      if (!itemId) return;
      const technique = this.actor.items.get(itemId);
      if (!technique) return;
      const updates = {};
      let totalCost = 0;
      for (const stat of KI_STATS) {
        const cost = Number(technique.system?.[stat]?.value ?? 0);
        if (cost > 0) {
          totalCost += cost;
          const acc = this.actor.system.domine.kiAccumulation[stat].accumulated.value;
          updates[`system.domine.kiAccumulation.${stat}.accumulated.value`] = Math.max(0, acc - cost);
        }
      }
      if (totalCost > 0) {
        const ki = this.actor.system.domine.kiAccumulation.generic.value;
        updates['system.domine.kiAccumulation.generic.value'] = Math.max(0, ki - totalCost);
      }
      if (Object.keys(updates).length > 0) await this.actor.update(updates);
      if ((technique.system?.roundCost?.value ?? 0) > 0) {
        await technique.update({ 'system.active.value': true });
      }
    });

    // Use psychic power — rolls potential (same flow as _onRoll) then posts the power card
    html.find('[data-on-click="use-psychic-power"]').on('click', async (e) => {
      e.stopPropagation();
      const powerId = e.currentTarget.dataset.itemId;
      if (!powerId) return;
      const power = this.actor.items.get(powerId);
      if (!power) return;
      const basePotential = this.actor.system.psychic.psychicPotential.final.value || 0;
      const powerBonus = power.system.bonus?.value || 0;
      const mod = await openModDialog();
      const { values: modValues, labels: modLabels } = getModifierTerms(this.actor.system, 'general-negative-half');
      const formula = getFormula({
        dice: '1d100xa',
        values: [basePotential, powerBonus, ...modValues, mod],
        labels: ['Potencial', 'Bonus', ...modLabels, 'Mod'],
      });
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      roll.roll();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `Rolling ${power.name}`,
      });
      window.ChatCombat._postPsychicPowerCard(this.actor, powerId, roll.total);
    });

    // Per-power active/mantenido checkbox toggle
    html.find('.power-active-checkbox').click(async (e) => {
      e.stopPropagation();
      const { itemId, powerIndex } = e.currentTarget.dataset;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const idx = parseInt(powerIndex);
      const rawPowers = item.system.powers;
      const powers = foundry.utils.deepClone(Array.isArray(rawPowers) ? rawPowers : (rawPowers ? Object.values(rawPowers) : []));
      if (powers[idx]) {
        powers[idx].active.value = e.currentTarget.checked;
        await item.update({ 'system.powers': powers });
      }
    });

    // Per-power NE input — save on change, block row click
    html.find('.power-ne-input').change(async (e) => {
      e.stopPropagation();
      const { itemId, powerIndex } = e.currentTarget.dataset;
      const value = parseInt(e.currentTarget.value) || 0;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const idx = parseInt(powerIndex);
      const rawPowers = item.system.powers;
      const powers = foundry.utils.deepClone(Array.isArray(rawPowers) ? rawPowers : (rawPowers ? Object.values(rawPowers) : []));
      if (powers[idx]) {
        powers[idx].ne.value = value;
        await item.update({ 'system.powers': powers });
      }
    });
    html.find('.power-ne-input').click((e) => e.stopPropagation());

    // Roll summoning for a specific power and update its NE
    html.find('.roll-summon-power').click(async (e) => {
      e.stopPropagation();
      const { itemId, powerIndex } = e.currentTarget.dataset;
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const idx = parseInt(powerIndex);
      const rawPowers = item.system.powers;
      const powers = foundry.utils.deepClone(Array.isArray(rawPowers) ? rawPowers : (rawPowers ? Object.values(rawPowers) : []));
      const power = powers[idx];
      if (!power) return;

      const summoningValue = this.actor.system.mystic.summoning.summon.final.value;
      const mod = await openModDialog();
      const { values: modValues, labels: modLabels } = getModifierTerms(this.actor.system, 'general-negative');
      const formula = getFormula({ values: [summoningValue, ...modValues, mod], labels: ['Convocación', ...modLabels, 'Mod.'] });
      const roll = new ABFFoundryRoll(formula, this.actor.system);
      await roll.roll();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ token: this.actor.token?.document ?? this.actor.token }),
        flavor: powers.length > 1 && power?.name
          ? game.i18n.format('anima.macros.combat.dialog.summoningSummonPower.title', { summon: item.name, power: power.name })
          : game.i18n.format('anima.macros.combat.dialog.summoningSummon.title', { summon: item.name }),
      });

      const difficulty = power.summonDif?.value || 0;
      power.ne.value = Math.max(0, roll.total - difficulty);
      await item.update({ 'system.powers': powers });
    });

    // Click on summon row to open item sheet (at the correct power accordion)
    html.find('.summon-row').click((e) => {
      if (e.target.classList.contains('power-active-checkbox') ||
          e.target.classList.contains('power-ne-input') ||
          e.target.classList.contains('roll-summon-power') ||
          e.target.closest('.roll-summon-power')) return;
      e.preventDefault();
      const { itemId, powerIndex } = e.currentTarget.dataset;
      if (itemId) {
        const item = this.actor.items.get(itemId);
        if (item?.sheet) {
          item.sheet._initialPowerIndex = parseInt(powerIndex) || 0;
          item.sheet.render(true);
        }
      }
    });

    // Double-click preset name to rename inline
    html.find('.preset-name-cell').dblclick((e) => {
      e.preventDefault();
      e.stopPropagation();
      const span = e.currentTarget;
      const row = span.closest('[data-item-id]');
      if (!row) return;
      const itemId = row.dataset.itemId;
      const currentName = span.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.style.cssText = 'width:100%;font-size:inherit;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.5);outline:none;color:inherit;padding:0;';
      span.replaceWith(input);
      input.focus();
      input.select();
      const save = async () => {
        const newName = input.value.trim() || currentName;
        await this.actor.updateEmbeddedDocuments('Item', [{ _id: itemId, name: newName }]);
      };
      input.addEventListener('blur', save);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.removeEventListener('blur', save); span.textContent = currentName; input.replaceWith(span); }
      });
    });

    // Preset row click (opens dialog pre-filled)
    html.find('.preset-row-clickable').click((e) => {
      if (e.target.closest('.preset-quick-attack')) return;
      if (e.target.closest('.preset-delete')) return;
      if (e.target.closest('.preset-name-cell')) return;
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

    // Inline delete for presets
    html.find('.preset-delete').click((e) => {
      e.preventDefault();
      e.stopPropagation();
      const presetId = e.currentTarget.closest('[data-preset-id]')?.dataset.presetId;
      if (!presetId) return;
      ABFDialogs.confirm(
        this.i18n.localize("anima.dialogs.items.delete.title"),
        this.i18n.localize("anima.dialogs.items.delete.body"),
        { onConfirm: () => this.actor.deleteEmbeddedDocuments("Item", [presetId]) }
      );
    });

    // Drag-to-reorder for preset grids
    this._bindPresetDragSort(html, '#attack-presets-context-menu-container',
      () => this.actor.system.combat.attackPresets);
    this._bindPresetDragSort(html, '#defense-presets-context-menu-container',
      () => this.actor.system.combat.defensePresets);

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

    // Open standalone defense dialog button
    html.find('.open-defense-dialog').click((e) => {
      e.preventDefault();
      this._openDefenseDialog();
    });

    // Make the defense button draggable to macro hotbar
    html.find('.open-defense-dialog').on('dragstart', (e) => {
      const actorId = this.actor.id;
      const dragData = {
        type: "ABFDefenseDialog",
        command: `{\nconst _actor = game.actors.get("${actorId}");\nconst _token = canvas.tokens.controlled[0] ?? _actor?.getActiveTokens()[0];\nif (!_token) return ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));\nconst { ChatCombatDefenseDialog } = await import("/systems/animabf-guote/module/combat/chat-combat/ChatCombatDefenseDialog.js");\nnew ChatCombatDefenseDialog(null, _token.document ?? _token, { onDefense: () => {} });\n}`,
        name: `${game.i18n.localize("anima.macros.combat.dialog.defense.title")} - ${this.actor.name}`,
        img: "icons/skills/defense/shield-protect-blue.webp"
      };
      e.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    });

    // Capacidades físicas: TM modes
    html.find('[data-on-click="add-tm-mode"]').on('click', async () => {
      const modes = [...(this.actor.system.flags.tmModes ?? [])];
      modes.push({ _id: foundry.utils.randomID(), label: 'Nuevo modo', mod: 0 });
      await this.actor.update({ 'system.flags.tmModes': modes });
    });

    html.find('.tm-mode-label-input').on('change', async (e) => {
      const modeId = e.currentTarget.closest('[data-mode-id]')?.dataset.modeId;
      if (!modeId) return;
      const modes = (this.actor.system.flags.tmModes ?? []).map(m =>
        m._id === modeId ? { ...m, label: e.currentTarget.value } : m
      );
      await this.actor.update({ 'system.flags.tmModes': modes });
    });

    html.find('.tm-mode-mod-input').on('change', async (e) => {
      const modeId = e.currentTarget.closest('[data-mode-id]')?.dataset.modeId;
      if (!modeId) return;
      const modes = (this.actor.system.flags.tmModes ?? []).map(m =>
        m._id === modeId ? { ...m, mod: Number(e.currentTarget.value) || 0 } : m
      );
      await this.actor.update({ 'system.flags.tmModes': modes });
    });

    html.find('.delete-tm-mode').on('click', async (e) => {
      e.stopPropagation();
      const modeId = e.currentTarget.dataset.modeId;
      if (!modeId) return;
      const modes = (this.actor.system.flags.tmModes ?? []).filter(m => m._id !== modeId);
      await this.actor.update({ 'system.flags.tmModes': modes });
    });

    // Grade selector in spell-maintenances table: auto-fill base costs from the linked spell
    html.on('change', 'select.sm-grade-select[data-spell-id]', async ev => {
      const spellId = ev.currentTarget.dataset.spellId;
      if (!spellId) return;
      const itemId = ev.currentTarget.dataset.itemId;
      if (!itemId) return;
      const grade = ev.currentTarget.value;
      const spell = this.actor.items.get(spellId);
      if (!spell) return;
      const maintenanceCost = spell.system?.grades?.[grade]?.maintenanceCost?.value ?? 0;
      const isDaily = spell.system?.hasDailyMaintenance?.value ?? false;
      const current = this.actor.getInnerItem(ABFItems.SPELL_MAINTENANCE, itemId);
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
   * Bind drag-to-reorder behaviour on a preset grid container.
   * Dragging a preset item over another and dropping reorders them using Foundry's sort system.
   * @param {jQuery} html
   * @param {string} containerSelector - e.g. '#attack-presets-context-menu-container'
   * @param {Function} getPresets - returns the current preset array from actor.system
   */
  _bindPresetDragSort(html, containerSelector, getPresets) {
    const container = html.find(containerSelector)[0];
    if (!container) return;

    let draggedId = null;

    container.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.v2-preset-item[draggable]');
      if (!item) return;
      draggedId = item.dataset.presetId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'preset-reorder', presetId: draggedId }));
      e.stopPropagation(); // prevent Foundry's hotbar drag handler from capturing this
      item.classList.add('v2-preset-item--dragging');
    });

    container.addEventListener('dragend', () => {
      container.querySelectorAll('.v2-preset-item').forEach(el =>
        el.classList.remove('v2-preset-item--dragging', 'v2-preset-item--drag-over'));
      draggedId = null;
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const item = e.target.closest('.v2-preset-item');
      container.querySelectorAll('.v2-preset-item').forEach(el =>
        el.classList.remove('v2-preset-item--drag-over'));
      if (item && item.dataset.presetId !== draggedId) {
        item.classList.add('v2-preset-item--drag-over');
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetItem = e.target.closest('.v2-preset-item');
      if (!targetItem || !draggedId || targetItem.dataset.presetId === draggedId) return;

      const source = this.actor.items.get(draggedId);
      const target = this.actor.items.get(targetItem.dataset.presetId);
      if (!source || !target) return;

      const siblings = getPresets()
        .map(p => this.actor.items.get(p._id))
        .filter(i => i && i._id !== draggedId);

      const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
      await this.actor.updateEmbeddedDocuments('Item',
        sortUpdates.map(u => ({ _id: u.target._id, sort: u.update.sort })));
    });
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

    if (type === 'attack') {
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
        presetData: preset.system,
        presetId: preset._id,
        closeOnSend: true  // Close dialog after sending attack (chat combat mode)
      });
    } else if (type === 'defense') {
      const token = canvas.tokens.controlled[0] ?? this.actor.getActiveTokens()[0];
      if (!token) {
        ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));
        return;
      }
      const tokenDoc = token.document ?? token;
      const { ChatCombatDefenseDialog } = await import('../combat/chat-combat/ChatCombatDefenseDialog.js');
      const dialog = new ChatCombatDefenseDialog(null, tokenDoc, { onDefense: () => {} });
      dialog._loadPresetData(preset.system);
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
   * Open the defense dialog in standalone mode (no attack to respond to)
   */
  async _openDefenseDialog() {
    const token = canvas.tokens.controlled[0] ?? this.actor.getActiveTokens()[0];
    if (!token) {
      ui.notifications.warn(game.i18n.localize("anima.notifications.noTokenSelected"));
      return;
    }
    const tokenDoc = token.document ?? token;
    const { ChatCombatDefenseDialog } = await import('../combat/chat-combat/ChatCombatDefenseDialog.js');
    new ChatCombatDefenseDialog(null, tokenDoc, { onDefense: () => {} });
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
      const enemyTAModifier = combat.enemyTAModifier?.value || 0;
      const criticSelected = combat.criticSelected?.value || (weapon?.system.critic.primary.value) || "impact";

      const baseDamage = unarmed
        ? 10 + actorSystem.characteristics.primaries.strength.mod
        : weapon.system.damage.final.value;
      const finalDamage = Math.floor(((isAccumulation ? (baseDamage + damageBonus) * 1.5 : baseDamage + damageBonus)) / 5) * 5;

      const { values: modTermValues, labels: modTermLabels } = getModifierTerms(actorSystem, "attack");
      let rollModifiers = [attack, getMassAttackBonus(accumulationCount), fatigueUsed * 15, ...modTermValues, modifier];
      let formula = getFormula({
        dice: "1d100xa",
        values: rollModifiers,
        labels: ["HA", `${accumulationCount} at. en masa`, "Cansancio", ...modTermLabels, "Mod"],
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
          enemyTAModifier,
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
      const enemyTAModifier = mystic.enemyTAModifier?.value || 0;

      const { values: modTermValues, labels: modTermLabels } = getModifierTerms(actorSystem, "general-negative");
      let rollModifiers = [magicProjection, getMassAttackBonus(accumulationCount), ...modTermValues, modifier];
      let formula = getFormula({
        dice: isAccumulation ? "2d100khxa" : "1d100xa",
        values: rollModifiers,
        labels: ["Proy. Mag.", `${accumulationCount} at. en masa`, ...modTermLabels, "Mod."],
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
          enemyTAModifier,
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
      const enemyTAModifier = psychic.enemyTAModifier?.value || 0;

      const { values: modTermValues, labels: modTermLabels } = getModifierTerms(actorSystem, "general-negative");
      let rollModifiers = [psychicProjection, ...modTermValues, modifier];
      let formula = getFormula({
        values: rollModifiers,
        labels: ["Proy. Psi.", ...modTermLabels, "Mod."],
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
          enemyTAModifier,
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

    // Handle spell item drops — create as embedded document
    if (data.type === 'Item') {
      const item = await Item.fromDropData(data);
      if (item?.type === 'spell' && item.parent?.id !== this.actor.id) {
        const isDuplicate = this.actor.items.some(i => i.type === 'spell' && i.name === item.name);
        if (isDuplicate) {
          ui.notifications.warn(
            game.i18n.format('anima.ui.mystic.importSpells.alreadyImported', { name: item.name })
          );
          return;
        }
        await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
        return;
      }
      if (item?.type === 'summon' && item.parent?.id !== this.actor.id) {
        await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
        return;
      }
      if (item?.type === ABFItems.PSYCHIC_POWER && item.parent?.id !== this.actor.id) {
        const isDuplicate = this.actor.items.some(i => i.type === ABFItems.PSYCHIC_POWER && i.name === item.name);
        if (isDuplicate) {
          ui.notifications.warn(
            game.i18n.format('anima.ui.psychic.psychicPowers.alreadyImported', { name: item.name })
          );
          return;
        }
        await this.actor.createEmbeddedDocuments('Item', [item.toObject()]);
        return;
      }
      // Non-handled items fall through to default handling
      return super._onDrop(event);
    }

    // Check if dropping an Actor onto the summoning tab area
    if (data.type === 'Actor') {
      const summoningTarget = event.target.closest('.v2-tab-summoning');
      if (summoningTarget) {
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
            ...CREATURE_SUMMON_INITIAL_SYSTEM,
            actorId: { value: droppedActor.id },
            actorUuid: { value: data.uuid }
          }
        });
        return;
      }

      // Check if dropping an Actor onto the domine tab area
      const domineTarget = event.target.closest('.v2-tab-domine');
      if (domineTarget) {
        event.preventDefault();
        const droppedActor = await fromUuid(data.uuid);
        if (!droppedActor) {
          ui.notifications.warn(game.i18n.localize('anima.ui.domine.kiCreatures.notFound'));
          return;
        }

        // Check for duplicates
        const existingCreatures = (this.actor.system.domine?.creatures || []);
        if (existingCreatures.some(c => c.system?.actorUuid?.value === data.uuid)) {
          ui.notifications.warn(game.i18n.localize('anima.ui.domine.kiCreatures.alreadyLinked'));
          return;
        }

        await this.actor.createInnerItem({
          name: droppedActor.name,
          type: ABFItems.CREATURE,
          system: {
            ...CREATURE_INITIAL_SYSTEM,
            actorId: { value: droppedActor.id },
            actorUuid: { value: data.uuid }
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
    if (event.target.tagName === 'INPUT') return;
    const element = event.currentTarget;
    const { dataset } = element;
    if (dataset.roll) {
      const label = dataset.label ? `Rolling ${dataset.label}` : "";
      const mod = await openModDialog();

      const { values: modValues, labels: modLabels } = getModifierTerms(this.actor.system, dataset.modifierType);

      // For initiative rolls: base-20 as "Turno", plus the modifier of the slowest option
      // (Natural +20, or slowest weapon modifier). Mirrors the highlighted entry in the combat tab.
      const weaponInitValues = [];
      const weaponInitLabels = [];
      let initiativeRollValue = dataset.rollvalue;
      let initiativeRollLabel = dataset.label;
      if (dataset.modifierType === "initiative") {
        const naturalTurno = this.actor.system?.characteristics?.secondaries?.initiative?.base?.value ?? 0;
        const naturalBase = naturalTurno - 20;
        initiativeRollValue = naturalBase;
        initiativeRollLabel = "Turno";

        const allWeapons = this.actor.system?.combat?.weapons || [];
        const desarmadoW = allWeapons.find(w => w.system?.isDefault?.value);
        const unarmedMod = desarmadoW?.system?.initiative?.final?.value ?? 20;
        const unarmedEff = naturalBase + unarmedMod;

        const regularWeapons = allWeapons
          .filter(w => w.system?.isShown?.value && !w.system?.isShield?.value && !w.system?.isDefault?.value);

        const wEff = w => naturalBase + (w.system?.initiative?.final?.value ?? 0);
        const slowestWeaponEff = regularWeapons.length > 0
          ? Math.min(...regularWeapons.map(wEff))
          : Infinity;

        if (unarmedEff <= slowestWeaponEff) {
          weaponInitValues.push(unarmedMod);
          weaponInitLabels.push(desarmadoW?.name ?? "Natural");
        } else {
          const slowestW = regularWeapons.reduce((min, w) => wEff(w) <= wEff(min) ? w : min);
          weaponInitValues.push(slowestW.system?.initiative?.final?.value ?? 0);
          weaponInitLabels.push(slowestW.name);
        }
      }

      let formula = getFormula({
        dice: dataset.roll,
        values: [initiativeRollValue, ...modValues, ...weaponInitValues, mod],
        labels: [initiativeRollLabel, ...modLabels, ...weaponInitLabels, "Mod"],
      });
      if (formula.includes("10TO100")) {
        const totalLevel = this.actor.system.general.level?.value || 0;
        const humanidad = this.actor.system.flags?.humanidad ?? 'human';
        const statRaw = parseInt(dataset.rollvalue);
        const statVal = statRaw / 10;

        let effectiveStatBonus;
        if (hasZen(humanidad)) {
          effectiveStatBonus = statRaw;
        } else if (hasInhumanity(humanidad)) {
          effectiveStatBonus = Math.min(statVal, 13) * 10;
        } else {
          effectiveStatBonus = Math.min(statVal, 10) * 10;
        }

        const extraValues = [];
        const extraLabels = [];
        if (statVal > 13 && hasZen(humanidad)) {
          extraValues.push(80);
          extraLabels.push('Zen');
        } else if (statVal > 10 && hasInhumanity(humanidad)) {
          extraValues.push(40);
          extraLabels.push('Inhumanidad');
        }

        formula = getFormula({
          dice: dataset.roll,
          values: [effectiveStatBonus, totalLevel * 10, ...extraValues, ...modValues, mod],
          labels: [dataset.label, "Nivel", ...extraLabels, ...modLabels, "Mod"],
        }).replace("10TO100", "");
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
  async _openLinkedActorSheet(uuid, errorLocKey) {
    if (!uuid) return;
    const actor = await fromUuid(uuid);
    if (actor?.sheet) actor.sheet.render(true);
    else ui.notifications.warn(game.i18n.localize(errorLocKey));
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
