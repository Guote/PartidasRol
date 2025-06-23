import { VERSION_KEYS } from "./MigrationConstants.js";
import { GlobalConfiguration } from "../constants.js";

export const migrateFromV2 = async () => {
    return VERSION_KEYS.V3;
}

/**
 * Now, we have a shortcut settings by user
 */
export const migrateFromV2ForUser = async () => {
    const wholeSettings = game.settings.get('ready-to-use-cards', GlobalConfiguration.shortcuts);
    if(wholeSettings) {
        wholeSettings.hands.displayOtherUsers = false;
        wholeSettings.hands.byUsers = {};
        wholeSettings.hands.byUsers[game.user.id] = {
            displayed: wholeSettings.hands.displayed, 
            bottom: wholeSettings.hands.bottom, 
            left: wholeSettings.hands.left
        };
        wholeSettings.revealed.displayOtherUsers = false;
        wholeSettings.revealed.byUsers = {};
        wholeSettings.revealed.byUsers[game.user.id] = {
            displayed: wholeSettings.revealed.displayed, 
            bottom: wholeSettings.revealed.bottom, 
            left: wholeSettings.revealed.left
        };
        await game.settings.set('ready-to-use-cards', GlobalConfiguration.shortcuts, wholeSettings);
    }

    // A message to warn the player
    const templateLoader = await foundry.applications.handlebars.getTemplate('modules/ready-to-use-cards/resources/migrations/v2usersmessage.hbs');
    const message = templateLoader({});
    ChatMessage.create({
        content: message,
        whisper: [game.user.id],
        speaker: {
            alias: game.i18n.localize("RTUCards.migration.fromV2.message.title")
        }
    });

    return VERSION_KEYS.V3;
}
