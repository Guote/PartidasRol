import { VERSION_KEYS } from "./MigrationConstants.js";

export const migrateFromV1 = async () => {

    // Old stack values, need to transfer them into new storage system
    let oldStacksSettings =  game.settings.get('ready-to-use-cards', "stacks");
    const newStacksSettings = {};
    const customDeckIds = []; // The one which have been added via hooks

    const someDataInV1 = oldStacksSettings && oldStacksSettings != '';
    if( someDataInV1 ) {
        
        // Loop through each stack
        const registeredDecksKeys = Object.keys(oldStacksSettings);
        for( const deckKey of registeredDecksKeys ) {

            const deck = oldStacksSettings[deckKey];
            const newDeckConfig = {
                actions: {},
                labels: {},
                parameters: {}
            };
            newStacksSettings[deckKey] = newDeckConfig;

            // Parsing V1 data
            //--------------------
            const v1Confs = Object.entries(deck).filter( ([key, used]) => {
                const validKey = ! ["parameters", "actions"].includes(key);
                return validKey && used;
            }).map( ([key, ]) => {
                return key;
            });
            const v1Params = deck.parameters ?? {};

            // Transfering actions on new structure
            //----------------------------
            const actions = newDeckConfig.actions;
            const parameters = newDeckConfig.parameters;
            for( const conf of v1Confs ) {
                switch(conf) {
                    case "fromDeckPeekOn": {
                        actions["peekOnCards-DEDE"] = true;
                        break;
                    }
                    case "fromDeckDealCardsToHand": {
                        actions["dealCard-GHDE"] = true;
                        actions["dealCard-PHDE"] = true;
                        actions["moveCard-DEGH"] = true;
                        actions["moveCard-DEPH"] = true;
                        break;
                    }
                    case "fromDeckDealRevealedCards": {
                        actions["dealCard-GRDE"] = true;
                        actions["dealCard-PRDE"] = true;
                        actions["moveCard-DEGR"] = true;
                        actions["moveCard-DEPR"] = true;
                        break;
                    }
                    case "fromDeckDiscardDirectly": {
                        actions["moveCard-DEDI"] = true;
                        break;
                    }
                    case "fromDeckResetAll": {
                        actions["resetDeck-DEDE"] = true;
                        break;
                    }
                    case "fromDeckShuffleRemainingCards": {
                        actions["shuffleDeck-DEDE"] = true;
                        break;
                    }
                    case "fromDeckLoopThroughFaces": {
                        actions["flipCard-DEDE"] = true;
                        break;
                    }
                    case "fromDeckRotateCard": {
                        actions["rotateCard-DEDE"] = true;
                        break;
                    }
                    case "fromHandDrawCard": {
                        actions["drawDeckCard-GHDE"] = true;
                        actions["drawDeckCard-PHDE"] = true;
                        break;
                    }
                    case "fromHandPlayCard": {
                        actions["playCard-GHDI"] = true;
                        actions["playCard-PHDI"] = true;
                        break;
                    }
                    case "fromHandPlayMultiple": {
                        actions["playCard-GHDI"] = true;
                        actions["playCard-PHDI"] = true;
                        parameters["playCard-play-playMode"] = "multipleCards";
                        break;
                    }
                    case "fromHandRevealCard": {
                        actions["transferCards-GHGR"] = true;
                        actions["transferCards-PHPR"] = true;
                        break;
                    }
                    case "fromHandExchangeCard": {
                        actions["exchangeCard-GHDI"] = true;
                        actions["exchangeCard-PHDI"] = true;
                        break;
                    }
                    case "fromHandExchangeWithPlayer": {
                        actions["exchangeCard-GHPH"] = true;
                        actions["exchangeCard-PHGH"] = true;
                        actions["exchangeCard-PHPH"] = true;
                        break;
                    }
                    case "fromHandDiscardCard": {
                        actions["moveCard-GHDI"] = true;
                        actions["moveCard-PHDI"] = true;
                        break;
                    }
                    case "fromHandRotateCard": {
                        actions["rotateCard-GHGH"] = true;
                        actions["rotateCard-PHPH"] = true;
                        break;
                    }
                    case "fromHandLoopThroughFaces": {
                        actions["flipCard-GHGH"] = true;
                        actions["flipCard-PHPH"] = true;
                        break;
                    }
                    case "fromRevealedDrawCard": {
                        actions["drawDeckCard-GRDE"] = true;
                        actions["drawDeckCard-PRDE"] = true;
                        break;
                    }
                    case "fromRevealedPlayCard": {
                        actions["playCard-GRDI"] = true;
                        actions["playCard-PRDI"] = true;
                        break;
                    }
                    case "fromRevealedPlayMultiple": {
                        actions["playCard-GRDI"] = true;
                        actions["playCard-PRDI"] = true;
                        parameters["playCard-play-playMode"] = "multipleCards";
                        break;
                    }
                    case "fromRevealedBackToHand": {
                        actions["transferCards-GRGH"] = true;
                        actions["transferCards-PRPH"] = true;
                        break;
                    }
                    case "fromRevealedDiscardCard": {
                        actions["moveCard-GRDI"] = true;
                        actions["moveCard-PRDI"] = true;
                        break;
                    }
                    case "fromRevealedRotateCard": {
                        actions["rotateCard-GRGR"] = true;
                        actions["rotateCard-PRPR"] = true;
                        break;
                    }
                    case "fromRevealedLoopThroughFaces": {
                        actions["flipCard-GRGR"] = true;
                        actions["flipCard-PRPR"] = true;
                        break;
                    }
                    case "fromRevealedExchangeCard": {
                        actions["exchangeCard-GRDI"] = true;
                        actions["exchangeCard-PRDI"] = true;
                        break;
                    }
                    case "fromRevealedExchangeWithPlayer": {
                        actions["exchangeCard-GRPR"] = true;
                        actions["exchangeCard-PRGR"] = true;
                        actions["exchangeCard-PRPR"] = true;
                        break;
                    }
                    case "fromDiscardBackToDeck": {
                        actions["moveCard-DIDE"] = true;
                        break;
                    }
                    case "fromDiscardRotateCard": {
                        actions["rotateCard-DIDI"] = true;
                        break;
                    }
                    case "fromDiscardLoopThroughFaces": {
                        actions["flipCard-DIDI"] = true;

                        if( v1Params.hasOwnProperty("removeBackFace") ) {
                            const backRemoved = deck.parameters.removeBackFace;
                            if( backRemoved ) {
                                parameters["flipCard-flip-includeBack"] = '0'; // Default value is set to 1
                            }
                        }
                        break;
                    }
                    case "fromDiscardResetAll": {
                        actions["resetDiscard-DIDI"] = true;
                        break;
                    }
                    default: {
                        console.warn("RTUC - MigrationService | V1 : unknwon conf: " + conf );
                    }
                }
            }

            // Transfering parameters on new structure
            //----------------------------
            Object.entries(v1Params).forEach( ([key, value]) => {
                const newKey = "core-" + key;
                parameters[newKey] = value;
            });
            if( parameters.hasOwnProperty("core-overrideConf") ) {
                // For deck added via code, force the overrideConf to be sure everything won't be lost if the other module hasn't been updated
                customDeckIds.push(deckKey);
                parameters["core-overrideConf"] = true;
            }
        }

        // Some parameters were transfered to each stack key
        //------------------------------------
        const everyHandsPeekOn = game.settings.get('ready-to-use-cards', "everyHandsPeekOn");
        const everyHandsDiscardAll = game.settings.get('ready-to-use-cards', "everyHandsDiscardAll");
        const everyRevealedDiscardAll = game.settings.get('ready-to-use-cards', "everyRevealedDiscardAll");
        for( const deckKey of registeredDecksKeys ) {
            const deckSettings = newStacksSettings[deckKey];
            
            deckSettings.actions["peekOnCards-PHPH"] = everyHandsPeekOn;
            
            const allDisardAllowed = everyHandsDiscardAll || everyRevealedDiscardAll;
            deckSettings.parameters["moveCards-discardOne-discardAll"] = allDisardAllowed ? "1" : "0";
        }
    }

    // A message to warn the GM
    if( someDataInV1 ) {
        const templateLoader = await getTemplate('modules/ready-to-use-cards/resources/migrations/v1message.hbs');
        const message = templateLoader({customDeckIds});
        ChatMessage.create({
            content: message,
            whisper: game.users.filter(u => u.isGM).map(u => u._id),
            speaker: {
                alias: game.i18n.localize("RTUCards.migration.fromV1.message.title")
            }
        });
    }


    await game.settings.set('ready-to-use-cards', "stacksV2", newStacksSettings);
    return VERSION_KEYS.V2;
}
