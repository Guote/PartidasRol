import { Logger } from "../../utils/log.js";
import { ABFSettingsKeys } from "../../utils/registerSettings.js";
import { ABFActor } from "../actor/ABFActor.js";
import { ABFDialogs } from "../dialogs/ABFDialogs.js";
import ABFItem from "../items/ABFItem.js";
import * as index from "./migrations/index.js";
function migrationApplies(migration) {
  const currentVersion = game.settings.get(
    "animabf",
    ABFSettingsKeys.SYSTEM_MIGRATION_VERSION
  );
  if (currentVersion < migration.version) {
    return true;
  }
  if (game.settings.get("animabf", ABFSettingsKeys.DEVELOP_MODE)) {
    Logger.warn(
      `Migration ${migration.version} needs not to be applied, current system migration version is ${currentVersion}.`
    );
  }
  return false;
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
      "AnimaBF | Trying to update tokens with a migration, but `migrateTokens()` function in `migrate.js` not defined yet"
    );
  }
}
async function applyMigration(migration) {
  try {
    Logger.log(`Applying migration ${migration.version}.`);
    await migrateWorldItems(migration);
    await migrateWorldActors(migration);
    await migratePacks(migration);
    migrateTokens(migration);
    migration.migrate?.();
    Logger.log(`Migration ${migration.version} completed.`);
    game.settings.set(
      "animabf",
      ABFSettingsKeys.SYSTEM_MIGRATION_VERSION,
      migration.version
    );
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
  const migrations = Object.values(index).filter(
    (migration) => migrationApplies(migration)
  );
  migrations.sort((a, b) => a.version - b.version);
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
