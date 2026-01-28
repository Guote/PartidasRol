export const MODULE = {ID: "pf1-improved-conditions"};

Hooks.once('init', () => {
  game.settings.register(MODULE.ID, 'reorderAllConditions', {
    name: "Reorder All Conditions Alphabetically",
    hint: 'Toggle to reorder all conditions alphabetically or only new conditions added by this module.',
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE.ID, 'automaticBuffs', {
    name: 'Enable Automatic Buffs',
    hint: 'When enabled, the module will attempt to find and apply matching buffs when spells or consumables are used.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register(MODULE.ID, 'buffAutomationMode', {
    name: 'Buff Automation Mode',
    hint: 'Choose how strict the buff automation should be when no targets are selected.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "strict": "Strict (Block actions without targets)",
      "lenient": "Lenient (Allow, but notify if no targets)"
    },
    default: "strict"
  });
  
  game.settings.register(MODULE.ID, 'buffTargetFiltering', {
    name: 'Buff Target Filtering',
    hint: 'Choose how buff targets are filtered. "By Disposition" only applies buffs to targets with the same disposition as the caster, "All Targets" applies buffs to all selected targets, and "Manual Selection" prompts you to choose which targets receive the buff.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "byDisposition": "By Disposition (Only same disposition)",
      "allTargets": "All Targets (No filtering)",
      "manualSelection": "Manual Selection (Choose targets)"
    },
    default: "byDisposition"
  });
  
  game.settings.registerMenu(MODULE.ID, 'buffCompendiaSelector', {
    name: 'Select Buff Compendia',
    label: 'Select Compendia',
    hint: 'Choose which compendia to include when searching for buff items.',
    icon: 'fas fa-book',
    type: BuffCompendiaSelector,
    restricted: true
  });

  const defaultCompendia = ["pf1.buffs"];
  if (game.packs.get("pf-content.pf-buffs")) {
    defaultCompendia.push("pf-content.pf-buffs");
  }

  game.settings.register(MODULE.ID, 'customBuffCompendia', {
    name: 'Custom Buff Compendia',
    hint: 'Select additional compendia containing buffs to include in the automated buff search.',
    scope: 'world',
    config: false,
    type: Array,
    default: defaultCompendia,
  });

  game.settings.register(MODULE.ID, 'handleConfused', {
    name: 'Automate Confused Condition Actions',
    hint: 'Enable to automatically generate a message at the start of each round to determine the actions of confused tokens.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE.ID, 'restrictMovement', {
    name: "Restrict Movement",
    hint: "Choose who is restricted from moving when affected by immobilizing conditions such as 'anchored', 'cowering', 'dazed', 'dying', 'helpless', 'paralyzed', 'petrified', or 'pinned'. 'Players Only' allows GMs to always move tokens. 'Disabled' will allow all movement.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "all": "All (GM and Players)",
      "players": "Players Only (GM can always move)",
      "disabled": "Disabled"
    },
    default: "disabled",
  });

  game.settings.register(MODULE.ID, 'autoApplyFF', {
    name: "Auto Apply Flat-Footed Condition",
    hint: "Enable to automatically apply the flat-footed condition to any token with an initiative roll result lower than the highest when combat begins.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE.ID, 'blindMovementCheck', {
    name: 'Enable Blind Movement Notification',
    hint: 'Enable to notify users to roll an Acrobatics check when a blind token attempts to move.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE.ID, 'disableAtZeroHP', {
    name: 'Apply Disabled Condition at 0 HP',
    hint: 'Automatically apply the disabled condition based on the selected option.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
        "none": "No one",
        "npc": "NPC Only",
        "player": "Player Only",
        "everyone": "Everyone"
    },
    default: "everyone"
  });

  game.settings.register(MODULE.ID, 'autoApplyED', {
    name: 'Auto Apply Energy Drain',
    hint: 'Enable to automatically apply the energy drain condition to any token with negative levels.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE.ID, 'handleEntangledGrappled', {
    name: 'Concentration Check for Entangled and Grappled',
    hint: 'Enable to prompt users to roll a concentration check when tokens with the entangled or grappled condition attempt to cast spells.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE.ID, 'grappledHandling', {
    name: 'Grappled Action Handling',
    hint: 'Choose how actions requiring two hands should be handled when grappled: Strict, Lenient, or Disabled.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "disabled": "Disabled (No restrictions)",
      "strict": "Strict (Block two-handed actions)",
      "lenient": "Lenient (Allow with warning)"
    },
    default: "strict"
  });  
  
  game.settings.register(MODULE.ID, 'nauseatedHandling', {
    name: 'Nauseated Action Handling',
    hint: 'Choose how actions are handled when affected by the nauseated condition: Strict, Lenient, or Disabled.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "disabled": "Disabled (No restrictions)",
      "strict": "Strict (Block non-move actions)",
      "lenient": "Lenient (Allow with warning)"
    },
    default: "strict"
  });
  
  game.settings.register(MODULE.ID, 'squeezingHandling', {
    name: 'Squeezing Action Handling',
    hint: 'Choose how actions are handled when affected by the squeezing condition: Strict, Lenient, or Disabled.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      "disabled": "Disabled (No restrictions)",
      "strict": "Strict (Block attack actions)",
      "lenient": "Lenient (Allow with warning)"
    },
    default: "strict"
  });  

  game.settings.register(MODULE.ID, 'unconsciousAtNegativeHP', {
      name: 'Apply Unconscious Condition at Negative HP',
      hint: 'Automatically apply the unconscious condition based on the selected option.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
          "none": "No one",
          "npc": "NPC Only",
          "player": "Player Only",
          "everyone": "Everyone"
      },
      default: "everyone"
  });

  const isMonksCombatDetailsActive = game.modules.get('monks-combat-details')?.active;
  const monksAutoDefeatedSetting = isMonksCombatDetailsActive ? game.settings.get('monks-combat-details', 'auto-defeated') : 'none';
  const defaultApplyDeadCondition = monksAutoDefeatedSetting !== 'none' ? false : true;
  
  game.settings.register(MODULE.ID, 'applyDeadCondition', {
    name: 'Apply Dead Condition at Negative Constitution HP',
    hint: `Automatically apply the dead condition based on the selected option.${isMonksCombatDetailsActive ? ' Enabling this option will disable the Monks Combat Details auto defeated setting.' : ''}`,
    scope: 'world',
    config: true,
    type: String,
    choices: {
        "none": "No one",
        "npc": "NPC Only",
        "player": "Player Only",
        "player-negative-con-npc-negative-hp": "Player (Negative Con), NPC (Negative HP)",
        "everyone": "Everyone"
    },
    default: defaultApplyDeadCondition ? "everyone" : "none",
    onChange: async (value) => {
      if (value !== "none" && isMonksCombatDetailsActive) {
        const choice = await Dialog.confirm({
            title: "Conflict with Monks Combat Details",
            content: "Enabling this setting will disable the auto-defeated setting of Monks Combat Details. Do you want to proceed?",
            yes: () => true,
            no: () => false,
            defaultYes: false
        });
        if (choice) {
            await game.settings.set('monks-combat-details', 'auto-defeated', 'none');
            ui.notifications.info("Monks Combat Details auto-defeated setting has been disabled.");
        } else {
            await game.settings.set(MODULE.ID, 'applyDeadCondition', 'none');
            ui.notifications.warn("Apply Dead Condition setting has been disabled.");
        };
      };
    }
  });

  game.settings.registerMenu(MODULE.ID, 'modifierNameSettings', {
    name: 'Customize Buff/Spell Modifiers',
    label: 'Customize Modifiers',
    hint: 'Edit the display names for common buff/spell modifiers (e.g., Lesser, Greater, Mass, Communal, etc.)',
    icon: 'fas fa-pen',
    type: ModifierNameSettingsForm,
    restricted: true
  });

  game.settings.register(MODULE.ID, 'modifierNames', {
    name: 'Buff/Spell Modifier Names',
    hint: 'Stores the custom names for buff/spell modifiers.',
    scope: 'world',
    config: false,
    type: Object,
    default: {
      lesser: 'Lesser',
      minor: 'Minor',
      improved: 'Improved',
      greater: 'Greater',
      major: 'Major',
      supreme: 'Supreme',
      mass: 'Mass',
      communal: 'Communal'
    }
  });

  game.settings.register(MODULE.ID, 'communalHandling', {
    name: 'Communal Spell Duration Handling',
    hint: 'Choose how communal spell durations are divided among targets: divide evenly (prompt if not possible), or always prompt the caster to divide.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      even: 'Divide Evenly (Prompt if impossible)',
      prompt: 'Always Prompt Caster'
    },
    default: 'even'
  });

  game.settings.register(MODULE.ID, 'personalTargeting', {
    name: 'Personal Spell Targeting',
    hint: 'Choose whether personal spells can target tokens other than the caster.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      allow: 'Allow targets other than the caster',
      deny: 'Deny targets that are not the caster'
    },
    default: 'deny'
  });
});

/**
 * Dialog for selecting buff compendia
 */
class BuffCompendiaSelector extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "buff-compendia-selector",
      title: "Select Buff Compendia",
      template: `modules/${MODULE.ID}/templates/buff-compendia-selector.html`,
      classes: ["sheet"],
      width: 500,
      height: "auto",
      closeOnSubmit: true
    });
  }
  
  /** @override */
  async getData() {
    const selectedCompendia = game.settings.get(MODULE.ID, 'customBuffCompendia');
    const includeWorldBuffs = selectedCompendia.includes("__world__");

    const systemBuffsPack = game.packs.get("pf1.buffs");
    const pfContentBuffsPack = game.packs.get("pf-content.pf-buffs");
    const specialCompendia = [];
    if (systemBuffsPack && systemBuffsPack.ownership !== ("LIMITED" || CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
      let displayName = systemBuffsPack.title;
      if (displayName && displayName.includes('.')) displayName = game.i18n.localize(displayName);
      specialCompendia.push({
        id: systemBuffsPack.collection,
        name: displayName,
        isSelected: selectedCompendia.includes(systemBuffsPack.collection)
      });
    }
    if (pfContentBuffsPack && pfContentBuffsPack.ownership !== ("LIMITED" || CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)) {
      let displayName = pfContentBuffsPack.title;
      if (displayName && displayName.includes('.')) displayName = game.i18n.localize(displayName);
      specialCompendia.push({
        id: pfContentBuffsPack.collection,
        name: displayName,
        isSelected: selectedCompendia.includes(pfContentBuffsPack.collection)
      });
    }

    const itemCompendia = game.packs.filter(pack =>
      (pack.metadata.type === "Item" || pack.documentName === "Item") &&
      pack.collection !== "pf1.buffs" &&
      pack.collection !== "pf-content.pf-buffs" &&
      pack.ownership?.PLAYER !== ("LIMITED" || CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED)
    );

    const compendiaWithBuffs = [];
    for (const pack of itemCompendia) {
      try {
        const index = await pack.getIndex();
        if (index.some(entry => entry.type === "buff")) {
          let displayName = pack.title;
          if (displayName && displayName.includes('.')) {
            displayName = game.i18n.localize(displayName);
          }
          compendiaWithBuffs.push({
            id: pack.collection,
            name: displayName,
            isSelected: selectedCompendia.includes(pack.collection)
          });
        }
      } catch (e) {
        console.warn(`${MODULE.ID} | Could not index compendium ${pack.collection}:`, e);
      }
    }

    compendiaWithBuffs.sort((a, b) => a.name.localeCompare(b.name));

    const allCompendia = [...specialCompendia, ...compendiaWithBuffs];

    return {
      compendia: allCompendia,
      includeWorldBuffs
    };
  }
  
  /** @override */
  async _updateObject(event, formData) {
    const selectedCompendia = [];
    for (const [key, value] of Object.entries(formData)) {
      if (key.startsWith('compendium-') && value) {
        const compendiumId = key.substring(11);
        selectedCompendia.push(compendiumId);
      }
    }
    
    if (formData.includeWorldBuffs) {
      selectedCompendia.push("__world__");
    }
    
    await game.settings.set(MODULE.ID, 'customBuffCompendia', selectedCompendia);
    ui.notifications.info(`${MODULE.ID} | Saved custom buff compendia (${selectedCompendia.length} selected)`);
  }
}

Hooks.on('renderSettingsConfig', (app, html, data) => {
  let tab;
  if (typeof html.find === 'function') {
    tab = html.find('section.tab[data-tab="pf1-improved-conditions"]');
  } else {
    tab = html.querySelector('section.tab[data-tab="pf1-improved-conditions"]');
  }

  function findFormGroup(selector) {
    if (!tab) return null;
    if (typeof html.find === 'function') {  
      return tab.find(selector).closest('.form-group');
    } else {
      const el = tab.querySelector(selector);
      return el ? el.closest('.form-group') : null;
    }
  }

  const automaticBuffsRow = findFormGroup('input[name="pf1-improved-conditions.automaticBuffs"]');
  const buffSelectorRow = findFormGroup('button[data-key="pf1-improved-conditions.buffCompendiaSelector"]');
  const modifierNameSettingsRow = findFormGroup('button[data-key="pf1-improved-conditions.modifierNameSettings"]');
  const buffAutomationModeRow = findFormGroup('select[name="pf1-improved-conditions.buffAutomationMode"]');
  const buffTargetFilteringRow = findFormGroup('select[name="pf1-improved-conditions.buffTargetFiltering"]');
  const communalHandlingRow = findFormGroup('select[name="pf1-improved-conditions.communalHandling"]');
  const personalTargetingRow = findFormGroup('select[name="pf1-improved-conditions.personalTargeting"]');

  if (automaticBuffsRow && buffSelectorRow) {
    if (typeof html.find === 'function') {
      buffSelectorRow.detach().insertAfter(automaticBuffsRow);
    } else {
      automaticBuffsRow.parentNode.insertBefore(buffSelectorRow, automaticBuffsRow.nextSibling);
    }
  }

  if (buffSelectorRow && modifierNameSettingsRow) {
    if (typeof html.find === 'function') {
      modifierNameSettingsRow.detach().insertAfter(buffSelectorRow);
    } else {
      buffSelectorRow.parentNode.insertBefore(modifierNameSettingsRow, buffSelectorRow.nextSibling);
    }
  }

  if (buffTargetFilteringRow && communalHandlingRow) {
    if (typeof html.find === 'function') {
      communalHandlingRow.detach().insertAfter(buffTargetFilteringRow);
    } else {
      buffTargetFilteringRow.parentNode.insertBefore(communalHandlingRow, buffTargetFilteringRow.nextSibling);
    }
  }

  if (communalHandlingRow && personalTargetingRow) {
    if (typeof html.find === 'function') {
      personalTargetingRow.detach().insertAfter(communalHandlingRow);
    } else {
      communalHandlingRow.parentNode.insertBefore(personalTargetingRow, communalHandlingRow.nextSibling);
    }
  }

  let automaticBuffsCheckbox;
  if (typeof html.find === 'function') {
    automaticBuffsCheckbox = automaticBuffsRow.find('input');
  } else {
    automaticBuffsCheckbox = automaticBuffsRow ? automaticBuffsRow.querySelector('input') : null;
  }

  const isEnabled = automaticBuffsCheckbox
    ? (typeof html.find === 'function'
        ? automaticBuffsCheckbox.prop('checked')
        : automaticBuffsCheckbox.checked)
    : false;

  toggleBuffSettingsVisibility(isEnabled, [buffSelectorRow, modifierNameSettingsRow, buffAutomationModeRow, buffTargetFilteringRow, communalHandlingRow, personalTargetingRow]);

  if (automaticBuffsCheckbox) {
    if (typeof html.find === 'function') {
      automaticBuffsCheckbox.on('change', function() {
        const isChecked = $(this).prop('checked');
        toggleBuffSettingsVisibility(isChecked, [buffSelectorRow, modifierNameSettingsRow, buffAutomationModeRow, buffTargetFilteringRow, communalHandlingRow, personalTargetingRow]);
      });
    } else {
      automaticBuffsCheckbox.addEventListener('change', function() {
        toggleBuffSettingsVisibility(this.checked, [buffSelectorRow, modifierNameSettingsRow, buffAutomationModeRow, buffTargetFilteringRow, communalHandlingRow, personalTargetingRow]);
      });
    }
  }

  function toggleBuffSettingsVisibility(show, elements) {
    elements.forEach(element => {
      if (!element) return;
      if (typeof html.find === 'function') {
        if (show) element.show();
        else element.hide();
      } else {
        element.style.display = show ? '' : 'none';
      }
    });
  }
});

class ModifierNameSettingsForm extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'modifier-name-settings-form',
      title: 'Customize Buff/Spell Modifiers',
      template: `modules/${MODULE.ID}/templates/modifier-name-settings-form.html`,
      width: 400,
      height: 'auto',
      closeOnSubmit: true
    });
  }

  getData() {
    const modifierNames = game.settings.get(MODULE.ID, 'modifierNames') || {};
    modifierNames.lesser ||= 'Lesser';
    modifierNames.minor ||= 'Minor';
    modifierNames.improved ||= 'Improved';
    modifierNames.greater ||= 'Greater';
    modifierNames.major ||= 'Major';
    modifierNames.supreme ||= 'Supreme';
    modifierNames.mass ||= 'Mass';
    modifierNames.communal ||= 'Communal';
    return modifierNames;
  }

  async _updateObject(event, formData) {
    const modifierNames = {
      lesser: formData.lesser?.trim() || 'Lesser',
      minor: formData.minor?.trim() || 'Minor',
      improved: formData.improved?.trim() || 'Improved',
      greater: formData.greater?.trim() || 'Greater',
      major: formData.major?.trim() || 'Major',
      supreme: formData.supreme?.trim() || 'Supreme',
      mass: formData.mass?.trim() || 'Mass',
      communal: formData.communal?.trim() || 'Communal'
    };
    await game.settings.set(MODULE.ID, 'modifierNames', modifierNames);
    ui.notifications.info(`${MODULE.ID} | Saved custom modifier names.`);
  }
}