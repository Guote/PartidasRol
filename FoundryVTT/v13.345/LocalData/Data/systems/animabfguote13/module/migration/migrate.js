import * as _1FixDefaulFumble from "./migrations/1-fix-defaul-fumble.js";
import * as _10UpdateSpellsStructuredData from "./migrations/10-update-spells-structured-data.js";
import * as _11UpdatePsychicPowersStructuredData from "./migrations/11-update-psychic-powers-structured-data.js";
import * as _2FixMagicProjection from "./migrations/2-fix-magic-projection.js";
import * as _3FixAlternativeAct from "./migrations/3-fix-alternative-act.js";
import * as _4FixPsychicDisciplinesMentalPatterns from "./migrations/4-fix-psychic-disciplines-mental-patterns.js";
import * as _5UpdateSpellsPowers from "./migrations/5-update-spells-powers.js";
import * as _6FixOldModifiers from "./migrations/6-fix-old-modifiers.js";
import * as _7FixWeaponsOwnStrength from "./migrations/7-fix-weapons-ownStrength.js";
import * as _8RemoveUnusedWeaponFue from "./migrations/8-remove-unused-weaponFue.js";
import * as _9FixKiSeals from "./migrations/9-fix-ki-seals.js";
import * as index from "./migrations/index.js";
import { Logger } from "../../utils/log.js";
import "../utils/constants.js";
import { ABFSettingsKeys } from "../../utils/registerSettings.js";
import { ABFActor } from "../actor/ABFActor.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import ABFItem from "../items/ABFItem.js";
import isVersionGreater from "../utils/functions/isVersionGreater.js";
const migrationModules = {
  .../* @__PURE__ */ Object.assign({ "./migrations/1-fix-defaul-fumble.js": _1FixDefaulFumble, "./migrations/10-update-spells-structured-data.js": _10UpdateSpellsStructuredData, "./migrations/11-update-psychic-powers-structured-data.js": _11UpdatePsychicPowersStructuredData, "./migrations/2-fix-magic-projection.js": _2FixMagicProjection, "./migrations/3-fix-alternative-act.js": _3FixAlternativeAct, "./migrations/4-fix-psychic-disciplines-mental-patterns.js": _4FixPsychicDisciplinesMentalPatterns, "./migrations/5-update-spells-powers.js": _5UpdateSpellsPowers, "./migrations/6-fix-old-modifiers.js": _6FixOldModifiers, "./migrations/7-fix-weapons-ownStrength.js": _7FixWeaponsOwnStrength, "./migrations/8-remove-unused-weaponFue.js": _8RemoveUnusedWeaponFue, "./migrations/9-fix-ki-seals.js": _9FixKiSeals, "./migrations/index.js": index }),
  .../* @__PURE__ */ Object.assign({ "./migrations/1-fix-defaul-fumble.js": _1FixDefaulFumble, "./migrations/10-update-spells-structured-data.js": _10UpdateSpellsStructuredData, "./migrations/11-update-psychic-powers-structured-data.js": _11UpdatePsychicPowersStructuredData, "./migrations/2-fix-magic-projection.js": _2FixMagicProjection, "./migrations/3-fix-alternative-act.js": _3FixAlternativeAct, "./migrations/4-fix-psychic-disciplines-mental-patterns.js": _4FixPsychicDisciplinesMentalPatterns, "./migrations/5-update-spells-powers.js": _5UpdateSpellsPowers, "./migrations/6-fix-old-modifiers.js": _6FixOldModifiers, "./migrations/7-fix-weapons-ownStrength.js": _7FixWeaponsOwnStrength, "./migrations/8-remove-unused-weaponFue.js": _8RemoveUnusedWeaponFue, "./migrations/9-fix-ki-seals.js": _9FixKiSeals, "./migrations/index.js": index }),
  .../* @__PURE__ */ Object.assign({ "./migrations/1-fix-defaul-fumble.js": _1FixDefaulFumble, "./migrations/10-update-spells-structured-data.js": _10UpdateSpellsStructuredData, "./migrations/11-update-psychic-powers-structured-data.js": _11UpdatePsychicPowersStructuredData, "./migrations/2-fix-magic-projection.js": _2FixMagicProjection, "./migrations/3-fix-alternative-act.js": _3FixAlternativeAct, "./migrations/4-fix-psychic-disciplines-mental-patterns.js": _4FixPsychicDisciplinesMentalPatterns, "./migrations/5-update-spells-powers.js": _5UpdateSpellsPowers, "./migrations/6-fix-old-modifiers.js": _6FixOldModifiers, "./migrations/7-fix-weapons-ownStrength.js": _7FixWeaponsOwnStrength, "./migrations/8-remove-unused-weaponFue.js": _8RemoveUnusedWeaponFue, "./migrations/9-fix-ki-seals.js": _9FixKiSeals, "./migrations/index.js": index }),
  .../* @__PURE__ */ Object.assign({ "./migrations/1-fix-defaul-fumble.js": _1FixDefaulFumble, "./migrations/10-update-spells-structured-data.js": _10UpdateSpellsStructuredData, "./migrations/11-update-psychic-powers-structured-data.js": _11UpdatePsychicPowersStructuredData, "./migrations/2-fix-magic-projection.js": _2FixMagicProjection, "./migrations/3-fix-alternative-act.js": _3FixAlternativeAct, "./migrations/4-fix-psychic-disciplines-mental-patterns.js": _4FixPsychicDisciplinesMentalPatterns, "./migrations/5-update-spells-powers.js": _5UpdateSpellsPowers, "./migrations/6-fix-old-modifiers.js": _6FixOldModifiers, "./migrations/7-fix-weapons-ownStrength.js": _7FixWeaponsOwnStrength, "./migrations/8-remove-unused-weaponFue.js": _8RemoveUnusedWeaponFue, "./migrations/9-fix-ki-seals.js": _9FixKiSeals, "./migrations/index.js": index })
};
const MigrationList = (() => {
  const registry = {};
  const register = (mig, src) => {
    if (!mig || typeof mig !== "object") return;
    const { id, version, title } = mig;
    if (!id || !version || !title) return;
    if (registry[id]) {
      console.warn(
        `[ABF] migrations: override '${id}' from ${registry[id].__src} with ${src}`
      );
    }
    try {
      Object.defineProperty(mig, "__src", { value: src });
    } catch {
    }
    registry[id] = mig;
  };
  for (const p in migrationModules) {
    const mod = migrationModules[p];
    if (mod?.default) {
      if (Array.isArray(mod.default))
        mod.default.forEach((m) => register(m, `default@${p}`));
      else register(mod.default, `default@${p}`);
    }
    if (Array.isArray(mod?.migrations)) {
      mod.migrations.forEach((m) => register(m, `migrations@${p}`));
    }
    for (const [key, value] of Object.entries(mod)) {
      if (key === "default" || key === "migrations") continue;
      if (value && typeof value === "object") register(value, `${key}@${p}`);
    }
  }
  console.debug(
    `[ABF] migrations loaded (${Object.keys(registry).length})`,
    Object.keys(registry)
  );
  return registry;
})();
function migrationApplies(migration) {
  const createdWith = game.settings.get(game.animabfguote13.id, ABFSettingsKeys.WORLD_CREATION_SYSTEM_VERSION) ?? "0.0.0";
  const applied = game.settings.get(game.animabfguote13.id, ABFSettingsKeys.APPLIED_MIGRATIONS);
  const alreadyApplied = applied[migration.id];
  const wasCreatedAfter = !isVersionGreater(migration.version, createdWith);
  if (alreadyApplied || wasCreatedAfter) return false;
  return true;
}
async function migrateItemCollection(items2, migration, context = {}) {
  if (migration.filterItems) items2 = items2.filter(migration.filterItems);
  const length = items2.length ?? items2.size;
  if (length === 0 || !migration.updateItem) return;
  Logger.log(`Migrating ${length} Items.`);
  const migrated = await Promise.all(items2.map((i) => migration.updateItem(i)));
  const updates = migrated.map((i) => {
    if (!i) return;
    const { _id, name, system } = i;
    return { _id, name, system };
  }).filter((u) => u);
  await ABFItem.updateDocuments(updates, context);
}
async function migrateActorCollection(actors, migration, context = {}) {
  if (migration.filterActors) actors = actors.filter(migration.filterActors);
  const length = actors.length ?? actors.size;
  if (length === 0 || !migration.updateItem && !migration.updateActor) return;
  Logger.log(`Migrating ${length} Actors.`);
  if (migration.updateItem) {
    await Promise.all(
      actors.map(async (a) => migrateItemCollection(a.items, migration, { parent: a }))
    );
  }
  if (migration.updateActor) {
    const migrated = await Promise.all(actors.map((a) => migration.updateActor(a)));
    const updates = migrated.map((a) => {
      if (!a) return;
      const { _id, name, system } = a;
      return { _id, name, system };
    }).filter((u) => !!u);
    await ABFActor.updateDocuments(updates, context);
  }
}
async function migrateUnlinkedActors(scenes, migration, context) {
  const length = items.length || items.size;
  if (length === 0 || !migration.updateItem && !migration.updateActor) return;
  for (const scene of scenes) {
    for (const token of scene.tokens.filter((token2) => !token2.actorLink && token2.actor)) {
      await migrateActorCollection([token.actor], migration, { parent: token });
    }
  }
}
async function migrateWorldItems(migration) {
  if (!migration.updateItem) return;
  await migrateItemCollection(game.items, migration);
}
async function migrateWorldActors(migration) {
  if (!migration.updateActor && !migration.updateItem) return;
  migrateActorCollection(game.actors, migration);
  migrateUnlinkedActors(game.scenes, migration);
}
async function migratePacks(migration) {
  const packTypes = migration.updateItem ? ["Actor", "Item", "Scene"] : ["Actor", "Scene"];
  let packs = await Promise.all(
    game.packs.filter((pack) => packTypes.includes(pack.metadata.type)).map(async (pack) => {
      const packObj = {
        pack,
        wasLocked: pack.locked,
        id: pack.metadata.id,
        type: pack.metadata.type
      };
      await pack.configure({ locked: false });
      packObj.documents = await pack.getDocuments();
      return packObj;
    })
  );
  const migrate = {
    Actor: migrateActorCollection,
    Item: migrateItemCollection,
    Scene: migrateUnlinkedActors
  };
  await Promise.all(
    packs.map((pack) => migrate[pack.type](pack.documents, migration, { pack: pack.id }))
  );
  await Promise.all(
    packs.filter((packObject) => packObject.wasLocked).map(async (packObject) => {
      await packObject.pack.configure({ locked: true });
    })
  );
}
function migrateTokens(migration) {
  if (migration.updateToken) {
    throw new Error(
      "animabfguote13 | Trying to update tokens with a migration, but `migrateTokens()` function in `migrate.js` not defined yet"
    );
  }
}
async function applyMigration(migration) {
  try {
    Logger.log(`Applying migration ${migration.id}.`);
    await migrateWorldItems(migration);
    await migrateWorldActors(migration);
    await migratePacks(migration);
    migrateTokens(migration);
    migration.migrate?.();
    Logger.log(`Migration ${migration.id} completed.`);
    const currentVersion = game.system.version;
    const applied = game.settings.get(
      game.animabfguote13.id,
      ABFSettingsKeys.APPLIED_MIGRATIONS
    );
    applied[migration.id] = currentVersion;
    game.settings.set(game.animabfguote13.id, ABFSettingsKeys.APPLIED_MIGRATIONS, applied);
    await ABFDialogs.prompt(
      game.i18n.format("dialogs.migrations.success", {
        version: migration.version,
        title: migration.title
      })
    );
    return true;
  } catch (err) {
    Logger.error(`Error when trying to apply migration ${migration.version}:
${err}`);
    await ABFDialogs.prompt(
      game.i18n.format("dialogs.migrations.error", {
        version: migration.version,
        error: err
      })
    );
  }
  return false;
}
async function applyMigrations() {
  if (!game.user.isGM) {
    return;
  }
  const migrations = Object.values(MigrationList).filter(
    (migration) => migrationApplies(migration)
  );
  migrations.sort((a, b) => {
    if (a.version !== b.version) return isVersionGreater(a.version, b.version) ? 1 : -1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  for (const migration of migrations) {
    const result = await ABFDialogs.confirm(
      game.i18n.localize("dialogs.migrations.title"),
      `${game.i18n.localize("dialogs.migrations.content")}<br><hr><br><h4>Details of the migration (only English available):</h4><strong>Title:</strong> ${migration.title}<br><strong>Description:</strong> ${migration.description}`
    );
    if (result === "confirm") {
      await applyMigration(migration);
    } else {
      break;
    }
  }
}
export {
  applyMigrations
};
