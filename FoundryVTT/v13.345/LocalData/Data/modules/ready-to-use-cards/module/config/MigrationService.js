import { GlobalConfiguration } from "../constants.js";
import { VERSION_KEYS } from "./MigrationConstants.js";
import { migrateFromV1, migrateFromV1ForUser } from "./MigrationV1.js";
import { migrateFromV2, migrateFromV2ForUser } from "./MigrationV2.js";

const VERSIONS = [
    {key: VERSION_KEYS.V1, applyMigration: migrateFromV1 },
    {key: VERSION_KEYS.V2, applyMigration: migrateFromV2},
    {key: VERSION_KEYS.V3},
];
const VERSIONS_FOR_USER = [
    {key: VERSION_KEYS.V1, applyMigration: migrateFromV1ForUser},
    {key: VERSION_KEYS.V2, applyMigration: migrateFromV2ForUser },
    {key: VERSION_KEYS.V3},
];

export class MigrationService {

    async applyMigration() {
        let currentVersion = this.currentVersion;
        while( currentVersion.applyMigration ) {
            console.log("RTUC - MigrationService | Applying patch from version " + currentVersion.key );
            const newVersionKey = await currentVersion.applyMigration();
            await game.settings.set('ready-to-use-cards', GlobalConfiguration.version, newVersionKey);

            currentVersion = this.currentVersion;
        }

        let currentVersionForUser = this.currentVersionForUser;
        while( currentVersionForUser.applyMigration ) {
            console.log("RTUC - MigrationService | Applying user patch from version " + currentVersionForUser.key );
            const newVersionKey = await currentVersionForUser.applyMigration();
            await game.settings.set('ready-to-use-cards', GlobalConfiguration.versionForUser, newVersionKey);

            currentVersionForUser = this.currentVersionForUser;
        }
    }

    get currentVersion() {
        const val = game.settings.get('ready-to-use-cards', GlobalConfiguration.version);
        return VERSIONS.find( v => v.key === val ) ?? VERSIONS[0];
    }

    get currentVersionForUser() {
        const val = game.settings.get('ready-to-use-cards', GlobalConfiguration.versionForUser);
        return VERSIONS_FOR_USER.find( v => v.key === val ) ?? VERSIONS_FOR_USER[0];
    }
}