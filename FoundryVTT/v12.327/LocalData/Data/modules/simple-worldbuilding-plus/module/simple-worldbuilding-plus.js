import { SimpleWorldbuildingPlusDerivedMenu } from './settings.js';
import { SwpActor } from './actor-overrides.js';
import { SwpActorSheet } from './actor-sheet-overrides.js';
import { SimpleActorSheet } from '../../../systems/worldbuilding/module/actor-sheet.js';

Hooks.once('init', async function() {
  game.SimpleWorldbuildingPlus = {};

  // Add support for derived attributes on the Simple World-building system.
  if (game?.system?.id == 'worldbuilding' || game?.data?.system?.id == 'worldbuilding') {
    CONFIG.Actor.documentClass = SwpActor;

    // Replace the actor sheet with a customized version.
    Actors.unregisterSheet("core", ActorSheet);
    Actors.unregisterSheet("dnd5e", SimpleActorSheet);
    Actors.unregisterSheet("worldbuilding", SimpleActorSheet);
    Actors.registerSheet("worldbuilding", SwpActorSheet, { makeDefault: true });
    Actors.registerSheet("worldbuilding", SimpleActorSheet, { makeDefault: false });
  }

  game.settings.registerMenu('simple-worldbuilding-plus', 'derivedMenu', {
    name: game.i18n.localize('simpleWorldbuildingPlus.settings.derived.name'),
    label: game.i18n.localize('simpleWorldbuildingPlus.settings.derived.label'),
    icon: 'fas fa-bars',
    type: SimpleWorldbuildingPlusDerivedMenu,
    restricted: true
  });

  game.settings.register('simple-worldbuilding-plus', 'derived', {
    scope: 'world',
    config: false,
    default: {},
    type: Object,
  });

  game.settings.register('simple-worldbuilding-plus', 'migrationVersion', {
    scope: 'world',
    config: false,
    default: '1.0.3',
    type: String
  });
});

Hooks.once('ready', () => {
  // Migrate legacy values.
  let migrationVersion = game.settings.get('simple-worldbuilding-plus', 'migrationVersion');
  let content = false;
  if (!foundry.utils.isNewerVersion(migrationVersion, '1.0.3')) {
    // Load the SWP_DERIVED journal entry.
    const swpDerivedJournal = game.journal.getName('SWP_DERIVED');
    if (swpDerivedJournal) {
      // If coming from a v9 world, the journal entry's first page should have the same name.
      content = swpDerivedJournal.pages.getName('SWP_DERIVED')?.text?.content ?? false;
      if (content) {
        // If the content includes a <p> tag, strip it down to the plain text.
        if (content.includes('<p')) {
          const html = document.createElement('div');
          html.innerHTML = content;
          content = html.textContent || html.innerText || '';
        }
        // If the stripped content includes a double pipe, that means we have a
        // potentially valid value and should carry it over to the setting.
        if (content.includes('||')) {
          game.settings.set('simple-worldbuilding-plus', 'derived', {
            swpDerived: content
          });
          swpDerivedJournal.delete();
          ui.notifications.info('simpleWorldbuildingPlus.migrations._104.success', {localize: true, permanent: true});
        }
      }
    }
    // Update migration version.
    game.settings.set('simple-worldbuilding-plus', 'migrationVersion', '1.0.4');
  }

  // Build the map of derived attributes from the module setting.
  let derivedSetting = game.settings.get('simple-worldbuilding-plus', 'derived')?.swpDerived ?? content;
  if (derivedSetting) {
    let entries = [...derivedSetting.matchAll(/\|\|(.*)\|(.*)\|\|/g)];
    game.SimpleWorldbuildingPlus.modifiers = entries.map(m => {
      return {
        key: m[1],
        formula: m[2]
      };
    });
  }
});
