import { Templates } from '../../utils/constants.js';
import { calculateATReductionByQuality } from '../utils/calculateATReductionByQuality.js';

/**
 * Handles creation and updating of attack chat cards for the chat-based combat system.
 * The attack card now includes the results table for all defenders.
 */
export class ChatAttackCard {
    /** @type {Map<string, string>} Maps sessionId to current messageId */
    static _sessionMap = new Map();

    /**
     * Create an attack card from attack dialog result
     * @param {TokenDocument} attackerToken - The attacking token
     * @param {Object} attackResult - Result from CombatAttackDialog hooks.onAttack
     * @param {Object} options - Additional options
     * @param {Object} [options.weapon] - Weapon used (for quality calculation)
     * @returns {Promise<ChatMessage>}
     */
    static async create(attackerToken, attackResult, options = {}) {
        const templatePath = Templates.Chat.ChatCombat.AttackCard;

        // Generate unique session ID for this attack
        const sessionId = foundry.utils.randomID();

        // Calculate TA reduction from weapon quality and ignoredTA
        const weaponTAMod = options.weapon?.system?.taModifier?.final?.value;
        const taReduction = (attackResult.values.ignoredTA || 0) +
            (weaponTAMod !== undefined ? weaponTAMod : calculateATReductionByQuality({ weapon: options.weapon }));

        // Get localized damage type label
        const damageTypeKey = `anima.ui.combat.criticalType.${attackResult.values.critic || 'impact'}`;
        const damageTypeLabel = game.i18n.localize(damageTypeKey);

        // Prepare display data
        const displayData = {
            attacker: {
                name: attackerToken.name,
                img: attackerToken.texture?.src || attackerToken.actor?.img
            },
            attackType: attackResult.type,
            attackTypeLabel: game.i18n.localize(`anima.chat.combat.attackType.${attackResult.type}`),
            attackTotal: attackResult.values.total,
            baseDamage: attackResult.values.damage,
            damageType: attackResult.values.critic,
            damageTypeLabel: damageTypeLabel,
            taReduction: taReduction,
            roll: attackResult.values.roll,
            fumbled: attackResult.values.fumble,
            results: [] // Empty initially, populated when defenders respond
        };

        const content = await renderTemplate(templatePath, displayData);

        // Prepare flags for data persistence
        const flags = {
            'animabf-guote': {
                chatCombat: {
                    cardType: 'attack',
                    sessionId: sessionId,
                    attackerTokenId: attackerToken.id,
                    attackerActorId: attackerToken.actor?.id,
                    attackType: attackResult.type,
                    attackTotal: attackResult.values.total,
                    baseDamage: attackResult.values.damage,
                    damageType: attackResult.values.critic,
                    damageTypeLabel: damageTypeLabel,
                    taReduction: taReduction,
                    roll: attackResult.values.roll,
                    fumbled: attackResult.values.fumble,
                    results: [],
                    attackerInfo: {
                        name: attackerToken.name,
                        img: attackerToken.texture?.src || attackerToken.actor?.img
                    }
                }
            }
        };

        const message = await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ token: attackerToken }),
            content,
            flags
        });

        // Track session -> message mapping
        this._sessionMap.set(sessionId, message.id);

        return message;
    }

    /**
     * Add a defender result to the attack card.
     * Deletes the old message and creates a new one at the bottom of chat.
     * Uses session tracking to handle multiple simultaneous defenders.
     * @param {string} attackMessageId - ID of the attack chat message
     * @param {TokenDocument} defenderToken - The defending token
     * @param {Object} result - Combat result with defense data
     * @param {string} [sessionId] - Optional session ID for tracking
     * @returns {Promise<string>} The new message ID
     */
    static async addDefenderResult(attackMessageId, defenderToken, result, sessionId = null) {
        // Try to find the message - first by ID, then by session
        let attackMessage = game.messages.get(attackMessageId);

        if (!attackMessage && sessionId) {
            // Message was deleted/recreated, find current one by session
            const currentMessageId = this._sessionMap.get(sessionId);
            if (currentMessageId) {
                attackMessage = game.messages.get(currentMessageId);
            }
        }

        if (!attackMessage) {
            console.warn('ChatAttackCard: Attack message not found:', attackMessageId);
            return attackMessageId;
        }

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        const newEntry = this._createResultEntry(defenderToken, result);

        // Check if defender already exists (update instead of add)
        const existingIndex = flags.results.findIndex(
            r => r.defenderTokenId === defenderToken.id
        );

        let updatedResults;
        if (existingIndex >= 0) {
            updatedResults = [...flags.results];
            updatedResults[existingIndex] = newEntry;
        } else {
            updatedResults = [...flags.results, newEntry];
        }

        // Prepare display data
        const displayData = {
            attacker: flags.attackerInfo,
            attackTotal: flags.attackTotal,
            baseDamage: flags.baseDamage,
            damageType: flags.damageType,
            damageTypeLabel: flags.damageTypeLabel,
            taReduction: flags.taReduction,
            results: updatedResults,
            isGM: game.user.isGM
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.AttackCard, displayData);

        // Prepare updated flags
        const updatedFlags = {
            'animabf-guote': {
                chatCombat: {
                    ...flags,
                    results: updatedResults
                }
            }
        };

        // Delete old message and create new one at bottom
        const speaker = attackMessage.speaker;
        await attackMessage.delete();

        const newMessage = await ChatMessage.create({
            speaker,
            content,
            flags: updatedFlags
        });

        // Update session tracking
        if (flags.sessionId) {
            this._sessionMap.set(flags.sessionId, newMessage.id);
        }

        return newMessage.id;
    }

    /**
     * Apply damage to a defender and update the card
     * @param {string} attackMessageId - ID of the attack chat message
     * @param {string} defenderTokenId - ID of the defender token
     */
    static async applyDamage(attackMessageId, defenderTokenId) {
        const attackMessage = game.messages.get(attackMessageId);
        if (!attackMessage) {
            console.warn('ChatAttackCard: Attack message not found:', attackMessageId);
            return;
        }

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        const entryIndex = flags.results.findIndex(
            r => r.defenderTokenId === defenderTokenId
        );

        if (entryIndex < 0) {
            console.warn('ChatAttackCard: Defender not found in results:', defenderTokenId);
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

        await this._updateCard(attackMessage, flags, updatedResults);
    }

    /**
     * Undo damage for a defender and update the card
     * @param {string} attackMessageId - ID of the attack chat message
     * @param {string} defenderTokenId - ID of the defender token
     */
    static async undoDamage(attackMessageId, defenderTokenId) {
        const attackMessage = game.messages.get(attackMessageId);
        if (!attackMessage) {
            console.warn('ChatAttackCard: Attack message not found:', attackMessageId);
            return;
        }

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        const entryIndex = flags.results.findIndex(
            r => r.defenderTokenId === defenderTokenId
        );

        if (entryIndex < 0) {
            console.warn('ChatAttackCard: Defender not found in results:', defenderTokenId);
            return;
        }

        const entry = flags.results[entryIndex];

        // Don't undo if not applied or if it's a counter-attack
        if (!entry.damageApplied || entry.canCounter) {
            return;
        }

        // Undo damage (heal the token's actor)
        const token = canvas.tokens.get(defenderTokenId);
        if (token?.actor) {
            await token.actor.applyDamage(-entry.damage);
            ui.notifications.info(
                game.i18n.format('anima.chat.combat.result.damageUndoneNotification', {
                    name: entry.defenderName,
                    damage: entry.damage
                })
            );
        }

        // Update the flag to mark damage as not applied
        const updatedResults = [...flags.results];
        updatedResults[entryIndex] = { ...entry, damageApplied: false };

        await this._updateCard(attackMessage, flags, updatedResults);
    }

    /**
     * Helper to update the card content and flags
     * @param {ChatMessage} attackMessage
     * @param {Object} flags
     * @param {Array} updatedResults
     */
    static async _updateCard(attackMessage, flags, updatedResults) {
        const displayData = {
            attacker: flags.attackerInfo,
            attackTotal: flags.attackTotal,
            baseDamage: flags.baseDamage,
            damageType: flags.damageType,
            damageTypeLabel: flags.damageTypeLabel,
            taReduction: flags.taReduction,
            results: updatedResults,
            isGM: game.user.isGM
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.AttackCard, displayData);

        await attackMessage.update({
            content,
            'flags.animabf-guote.chatCombat.results': updatedResults
        });
    }

    /**
     * Create a result entry object for a defender
     * @param {TokenDocument} defenderToken
     * @param {Object} result - Combat result with defense data
     * @returns {Object}
     */
    static _createResultEntry(defenderToken, result) {
        return {
            defenderTokenId: defenderToken.id,
            defenderName: defenderToken.name,
            defenderImg: defenderToken.texture?.src || defenderToken.actor?.img,
            defenseTotal: result.defenseTotal || 0,
            defenderTA: result.defenderTA || 0,
            effectiveTA: result.effectiveTA || 0,
            canCounter: result.canCounterAttack,
            counterBonus: result.counterAttackBonus || 0,
            damage: result.damage || 0,
            damageApplied: false
        };
    }
}
