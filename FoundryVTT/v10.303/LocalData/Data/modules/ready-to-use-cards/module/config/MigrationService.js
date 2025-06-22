import { GlobalConfiguration } from "../constants.js";
import { VERSION_KEYS } from "./MigrationConstants.js";
import { migrateFromV1 } from "./MigrationV1.js";

const VERSIONS = [
    {key: VERSION_KEYS.V1, applyMigration: migrateFromV1 },
    {key: VERSION_KEYS.V2}
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
    }

    get currentVersion() {
        const val = game.settings.get('ready-to-use-cards', GlobalConfiguration.version);
        return VERSIONS.find( v => v.key === val ) ?? VERSIONS[0];
    }

}