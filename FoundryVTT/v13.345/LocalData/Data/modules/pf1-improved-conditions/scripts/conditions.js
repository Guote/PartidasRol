/**
 * Conditions Module for PF1 Improved Conditions
 * Handles registration and management of custom conditions
 */

import { MODULE } from './config.js';

/**
 * Register custom conditions with the PF1 system
 */
export function registerConditions(registry) {
  registry.tracks.push("immobilize");

  const conditions = [
    {
      namespace: "pf1-improved-conditions",
      key: "anchored",
      value: {
        journal: "Compendium.pf1-improved-conditions.Improved-Conditions.JournalEntry.aRktpe0E6gArf9Gi",
        flags: {},
        mechanics: {
          changes: [],
          flags: []
        },
        name: game.i18n.localize("PF1-Improved-Conditions.Anchored.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/anchored.png",
        track: "immobilize"
      }
    },
    {
      namespace: "pf1-improved-conditions",
      key: "burning",
      value: {
        journal: "Compendium.pf1-improved-conditions.Improved-Conditions.JournalEntry.JNftnIniG9UiP8o7",
        flags: {},
        mechanics: {
          changes: [],
          flags: []
        },
        name: game.i18n.localize("PF1-Improved-Conditions.Burning.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/burning.png",
        track: ""
      }
    },
    {
      namespace: "pf1-improved-conditions",
      key: "energyDrained",
      value: {
        journal: "Compendium.pf1.pf1e-rules.JournalEntry.NSqfXaj4MevUR2uJ.JournalEntryPage.onMPh2re6fIeNgNr",
        flags: {},
        mechanics: {
          changes: [],
          flags: []
        },
        name: game.i18n.localize("PF1-Improved-Conditions.EnergyDrained.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/drained.png",
        track: ""
      }
    },
    {
      namespace: "pf1-improved-conditions",
      key: "fascinated",
      value: {
        journal: "Compendium.pf1.pf1e-rules.JournalEntry.NSqfXaj4MevUR2uJ.JournalEntryPage.Hy0MHwpRRr5QxVj5",
        flags: {},
        mechanics: {
          changes: [
            { formula: '-4', target: 'skill.per', type: 'untyped' }
          ],
          flags: []
        },
        name: game.i18n.localize("PF1-Improved-Conditions.Fascinated.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/fascinated.png",
        track: ""
      }
    },
    {
      namespace: "pf1-improved-conditions",
      key: "immobilized",
      value: {
        journal: "Compendium.pf1-improved-conditions.Improved-Conditions.JournalEntry.EveE8ceyzqbicqT0",
        flags: {},
        mechanics: {
          changes: [],
          flags: ["loseDexToAC"]
        },
        name: game.i18n.localize("PF1-Improved-Conditions.Immobilized.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/immobilized.png",
        track: ""
      }
    },
    {
      namespace: "pf1-improved-conditions",
      key: "slowed",
      value: {
        journal: "Compendium.pf1-improved-conditions.Improved-Conditions.JournalEntry.a6akglSId5Isu25j",
        flags: {},
        mechanics: {
          changes: [
            {
              "type": "untyped",
              "operator": "set",
              "formula": "@attributes.speed.land.total / 2",
              "target": "landSpeed"
            },
            {
              "type": "untyped",
              "operator": "set",
              "formula": "@attributes.speed.climb.total / 2",
              "target": "climbSpeed"
            },
            {
              "type": "untyped",
              "operator": "set",
              "formula": "@attributes.speed.swim.total / 2",
              "target": "swimSpeed",
            },
            {
              "type": "untyped",
              "operator": "set",
              "formula": "@attributes.speed.burrow.total / 2",
              "target": "burrowSpeed",
            },
            {
              "type": "untyped",
              "operator": "set",
              "formula": "@attributes.speed.fly.total / 2",
              "target": "flySpeed",
            }
          ],
          flags: []
        },
        name: game.i18n.localize("PF1-Improved-Conditions.Slowed.label"),
        showInAction: true,
        showInDefense: true,
        texture: "modules/pf1-improved-conditions/icons/slowed.png",
        track: ""
      }
    }
  ];

  conditions.forEach(condition => {
    registry.register(condition.namespace, condition.key, condition.value);
  });

  const movementConditions = ["blind", "disabled", "entangled", "exhausted", "grappled"];
  for (const cond of movementConditions) {
    const condition = registry.get(cond);
    if (condition) {
      condition.updateSource({ statuses: new Set(["slowed"]) });
    }
  }

  const entangled = registry.get("entangled");
  if (entangled) {
    entangled.updateSource({ track: "immobilize" });
  }
}

/**
 * Reorder conditions in the Token HUD
 */
export function reorderTokenHUDConditions(html, data) {
  let conditions;
  const isV12 = typeof html.find === 'function';
  if (isV12) {
    conditions = html.find('.status-effects');
  } else {
    conditions = html.querySelectorAll('.status-effects');
  }
  const reorderAllConditions = game.settings.get(MODULE.ID, 'reorderAllConditions');
  const allConditions = pf1.registry.conditions.map(condition => condition._id);

  const conditionEffects = Object.values(data.statusEffects).filter(effect => allConditions.includes(effect.id));
  const buffEffects = Object.values(data.statusEffects).filter(effect => !allConditions.includes(effect.id) && effect.id !== "dead");
  const deadCondition = Object.values(data.statusEffects).filter(effect => effect.id === "dead");

  let sortedEffects;
  if (reorderAllConditions) {
    sortedEffects = Object.values(data.statusEffects).sort((a, b) => a.title.localeCompare(b.title));
  } else {
    const otherConditions = conditionEffects.filter(effect => effect.id !== "dead");
    sortedEffects = otherConditions.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (isV12) {
    conditions.empty();
    if (deadCondition && !reorderAllConditions) {
      const deadIcon = `<img class="effect-control ${deadCondition[0].cssClass}" data-status-id="${deadCondition[0].id}" src="${deadCondition[0].src}" title="${deadCondition[0].title}"/>`;
      conditions.append(deadIcon);
    }
    for (const effect of sortedEffects) {
      const conditionIcon = `<img class="effect-control ${effect.cssClass}" data-status-id="${effect.id}" src="${effect.src}" title="${effect.title}"/>`;
      conditions.append(conditionIcon);
    }
    if (!reorderAllConditions) {
      for (const effect of buffEffects) {
        const buffIcon = `<img class="effect-control ${effect.cssClass}" data-status-id="${effect.id}" src="${effect.src}" title="${effect.title}"/>`;
        conditions.append(buffIcon);
      }
    }
  } else {
    conditions.forEach(el => {
      const icons = Array.from(el.querySelectorAll('img'));
      const iconMap = {};
      icons.forEach(img => {
        iconMap[img.dataset.statusId] = img;
      });
      let newOrder = [];
      if (deadCondition && !reorderAllConditions && deadCondition[0]) {
        if (iconMap[deadCondition[0].id]) newOrder.push(iconMap[deadCondition[0].id]);
      }
      sortedEffects.forEach(effect => {
        if (iconMap[effect.id]) newOrder.push(iconMap[effect.id]);
      });
      if (!reorderAllConditions) {
        buffEffects.forEach(effect => {
          if (iconMap[effect.id]) newOrder.push(iconMap[effect.id]);
        });
      }
      newOrder.forEach(img => el.appendChild(img));
    });
  }
}

/**
 * Setup i18n for conditions in little-helper module
 */
export function setupConditionsI18n(t) {
  t.conditions.anchored = "PF1-Improved-Conditions.Anchored.description";
  t.conditions.energyDrained = "PF1-Improved-Conditions.EnergyDrained.description";
  t.conditions.fascinated = "PF1-Improved-Conditions.Fascinated.description";
  t.conditions.immobilized = "PF1-Improved-Conditions.Immobilized.description";
  t.conditions.slowed = "PF1-Improved-Conditions.Slowed.description";
  t.conditions.burning = "PF1-Improved-Conditions.Burning.description";
} 