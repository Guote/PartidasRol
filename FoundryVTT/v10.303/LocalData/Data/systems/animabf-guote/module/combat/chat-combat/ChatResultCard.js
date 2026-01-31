import { Templates } from '../../utils/constants.js';

/**
 * Handles creation and updating of combat result chat cards.
 * The result card displays a table with all defenders and their combat outcomes.
 */
export class ChatResultCard {
    /**
     * Create a new result card for the first defender
     * @param {ChatMessage} attackMessage - The attack chat message
     * @param {TokenDocument} defenderToken - The defending token
     * @param {Object} result - Combat result from calculateCombatResult
     * @returns {Promise<ChatMessage>}
     */
    static async create(attackMessage, defenderToken, result) {
        const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;

        const resultEntry = this._createResultEntry(defenderToken, result);

        const displayData = {
            attacker: attackFlags.attackerInfo,
            attackTotal: attackFlags.attackTotal,
            baseDamage: attackFlags.baseDamage,
            results: [resultEntry]
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.ResultCard, displayData);

        const flags = {
            'animabf-guote': {
                chatCombat: {
                    cardType: 'result',
                    attackMessageId: attackMessage.id,
                    results: [resultEntry]
                }
            }
        };

        return ChatMessage.create({
            content,
            flags,
            speaker: ChatMessage.getSpeaker({ alias: game.i18n.localize('anima.chat.combat.result.title') })
        });
    }

    /**
     * Add a new defender to an existing result card
     * @param {string} resultMessageId - ID of the result chat message
     * @param {TokenDocument} defenderToken - The defending token
     * @param {Object} result - Combat result from calculateCombatResult
     */
    static async addDefender(resultMessageId, defenderToken, result) {
        const resultMessage = game.messages.get(resultMessageId);
        if (!resultMessage) {
            console.warn('ChatResultCard: Result message not found:', resultMessageId);
            return;
        }

        const flags = resultMessage.flags['animabf-guote'].chatCombat;
        const newEntry = this._createResultEntry(defenderToken, result);

        // Check if defender already exists (update instead of add)
        const existingIndex = flags.results.findIndex(
            r => r.defenderTokenId === defenderToken.id
        );

        let updatedResults;
        if (existingIndex >= 0) {
            // Update existing entry
            updatedResults = [...flags.results];
            updatedResults[existingIndex] = newEntry;
        } else {
            // Add new entry
            updatedResults = [...flags.results, newEntry];
        }

        // Get attack message for display data
        const attackMessage = game.messages.get(flags.attackMessageId);
        if (!attackMessage) {
            console.warn('ChatResultCard: Attack message not found:', flags.attackMessageId);
            return;
        }

        const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;

        const displayData = {
            attacker: attackFlags.attackerInfo,
            attackTotal: attackFlags.attackTotal,
            baseDamage: attackFlags.baseDamage,
            results: updatedResults
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.ResultCard, displayData);

        await resultMessage.update({
            content,
            'flags.animabf-guote.chatCombat.results': updatedResults
        });
    }

    /**
     * Apply damage to a defender and update the result card
     * @param {string} resultMessageId - ID of the result chat message
     * @param {string} defenderTokenId - ID of the defender token
     */
    static async applyDamage(resultMessageId, defenderTokenId) {
        const resultMessage = game.messages.get(resultMessageId);
        if (!resultMessage) {
            console.warn('ChatResultCard: Result message not found:', resultMessageId);
            return;
        }

        const flags = resultMessage.flags['animabf-guote'].chatCombat;
        const entryIndex = flags.results.findIndex(
            r => r.defenderTokenId === defenderTokenId
        );

        if (entryIndex < 0) {
            console.warn('ChatResultCard: Defender not found in results:', defenderTokenId);
            return;
        }

        const entry = flags.results[entryIndex];

        // Don't apply if already applied or if it's a counter-attack
        if (entry.damageApplied || entry.canCounter) {
            return;
        }

        // Apply damage to the token's actor
        const token = canvas.tokens.get(defenderTokenId);
        if (token?.actor) {
            await token.actor.applyDamage(entry.damage);
            ui.notifications.info(
                game.i18n.format('anima.chat.combat.result.damageAppliedNotification', {
                    name: entry.defenderName,
                    damage: entry.damage
                })
            );
        }

        // Update the flag to mark damage as applied
        const updatedResults = [...flags.results];
        updatedResults[entryIndex] = { ...entry, damageApplied: true };

        // Get attack message for display data
        const attackMessage = game.messages.get(flags.attackMessageId);
        if (!attackMessage) {
            console.warn('ChatResultCard: Attack message not found:', flags.attackMessageId);
            return;
        }

        const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;

        const displayData = {
            attacker: attackFlags.attackerInfo,
            attackTotal: attackFlags.attackTotal,
            baseDamage: attackFlags.baseDamage,
            results: updatedResults
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.ResultCard, displayData);

        await resultMessage.update({
            content,
            'flags.animabf-guote.chatCombat.results': updatedResults
        });
    }

    /**
     * Create a result entry object for a defender
     * @param {TokenDocument} defenderToken
     * @param {Object} result - Combat result from calculateCombatResult
     * @returns {Object}
     */
    static _createResultEntry(defenderToken, result) {
        return {
            defenderTokenId: defenderToken.id,
            defenderName: defenderToken.name,
            defenderImg: defenderToken.texture?.src || defenderToken.actor?.img,
            canCounter: result.canCounterAttack,
            counterBonus: result.counterAttackBonus || 0,
            damage: result.damage || 0,
            damageApplied: false
        };
    }
}
