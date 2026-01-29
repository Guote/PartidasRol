import { Templates } from '../../utils/constants.js';

/**
 * Handles creation of defense chat cards for the chat-based combat system.
 */
export class ChatDefenseCard {
    /**
     * Create a defense card showing the defender's response
     * @param {ChatMessage} attackMessage - The attack chat message being defended against
     * @param {TokenDocument} defenderToken - The defending token
     * @param {Object} defenseResult - Result from ChatCombatDefenseDialog onDefense callback
     * @returns {Promise<ChatMessage>}
     */
    static async create(attackMessage, defenderToken, defenseResult) {
        const templatePath = Templates.Chat.ChatCombat.DefenseCard;
        const defenderActor = defenderToken.actor;

        // Get defense type label
        let defenseTypeLabel;
        if (defenseResult.type === 'combat') {
            defenseTypeLabel = game.i18n.localize(
                `macros.combat.dialog.defenseType.${defenseResult.defenseType}.title`
            );
        } else if (defenseResult.type === 'mystic') {
            defenseTypeLabel = game.i18n.localize('anima.ui.tabs.mystic');
        } else if (defenseResult.type === 'psychic') {
            defenseTypeLabel = game.i18n.localize('anima.ui.tabs.psychic');
        } else {
            defenseTypeLabel = defenseResult.type;
        }

        // Prepare display data
        const displayData = {
            defender: {
                name: defenderToken.name,
                img: defenderToken.texture?.src || defenderActor?.img
            },
            defenseType: defenseResult.type,
            defenseTypeLabel: defenseTypeLabel,
            defenseTotal: defenseResult.total,
            roll: defenseResult.roll,
            armorValues: defenseResult.armorValues || {},
            hasArmorValues: defenseResult.armorValues && Object.keys(defenseResult.armorValues).length > 0
        };

        const content = await renderTemplate(templatePath, displayData);

        // Prepare flags for data persistence
        const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;
        const flags = {
            'animabf-guote': {
                chatCombat: {
                    cardType: 'defense',
                    attackMessageId: attackMessage.id,
                    defenderTokenId: defenderToken.id,
                    defenderActorId: defenderActor?.id,
                    defenseType: defenseResult.type,
                    defenseTotal: defenseResult.total,
                    armorValues: defenseResult.armorValues,
                    roll: defenseResult.roll,
                    defenderInfo: {
                        name: defenderToken.name,
                        img: defenderToken.texture?.src || defenderActor?.img
                    }
                }
            }
        };

        return ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ token: defenderToken }),
            content,
            flags
        });
    }
}
