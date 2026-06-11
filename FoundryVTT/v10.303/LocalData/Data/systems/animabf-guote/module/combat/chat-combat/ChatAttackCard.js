import { Templates } from '../../utils/constants.js';
import { calculateTAModifierByQuality } from '../utils/calculateATReductionByQuality.js';
import { calculateShieldDamage } from '../utils/calculateShieldDamage.js';

/**
 * Handles creation and updating of attack chat cards for the chat-based combat system.
 * The attack card now includes the results table for all defenders.
 */
export class ChatAttackCard {
    /** @type {Map<string, string>} Maps sessionId to current messageId */
    static _sessionMap = new Map();

    /** @type {Map<string, {entries: Array, resolvers: Array, timer: number}>} Pending micro-batch per session */
    static _pendingBatch = new Map();

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

        // taReduction: signed modifier to enemy TA (negative = reduces TA).
        // Both taModifier.final.value and calculateTAModifierByQuality use the same sign convention.
        const weaponTAMod = options.weapon?.system?.taModifier?.final?.value;
        const weaponATMod = weaponTAMod !== undefined
          ? weaponTAMod
          : calculateTAModifierByQuality(options.weapon?.system?.quality?.value ?? 0);
        const taReduction = (attackResult.values.enemyTAModifier || 0) + weaponATMod;

        // Get localized damage type label
        const damageTypeKey = `anima.ui.combat.criticalType.${attackResult.values.critic || 'impact'}`;
        const damageTypeLabel = game.i18n.localize(damageTypeKey);

        const attackRoll = attackResult.values.roll || 0;
        const attackTotal = attackResult.values.total || 0;
        const targetInfos = options.targetInfos || [];

        // Prepare display data
        const displayData = {
            attacker: {
                name: attackerToken.name,
                img: attackerToken.texture?.src || attackerToken.actor?.img
            },
            attackerTokenId: attackerToken.id,
            attackType: attackResult.type,
            attackTypeLabel: game.i18n.localize(`anima.chat.combat.attackType.${attackResult.type}`),
            attackTotal,
            attackBase: attackTotal - attackRoll,
            baseDamage: attackResult.values.damage,
            damageType: attackResult.values.critic,
            damageTypeLabel: damageTypeLabel,
            taReduction: taReduction,
            roll: attackRoll,
            fumbled: attackResult.values.fumble,
            results: [],
            targetInfos,
            pendingTargets: targetInfos,
            isGM: game.user.isGM
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
                    attackTotal,
                    attackBase: attackTotal - attackRoll,
                    baseDamage: attackResult.values.damage,
                    damageType: attackResult.values.critic,
                    damageTypeLabel: damageTypeLabel,
                    taReduction: taReduction,
                    roll: attackRoll,
                    fumbled: attackResult.values.fumble,
                    results: [],
                    targetInfos,
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
     * Batches concurrent calls (same event-loop tick) into a single card update,
     * so N simultaneous defenses produce 1 message.update() instead of N.
     * @param {string} attackMessageId - ID of the attack chat message
     * @param {TokenDocument} defenderToken - The defending token
     * @param {Object} result - Combat result with defense data
     * @param {string} [sessionId] - Optional session ID for tracking
     * @returns {Promise<string>} The new message ID
     */
    static addDefenderResult(attackMessageId, defenderToken, result, sessionId = null) {
        const key = sessionId || attackMessageId;
        return new Promise((resolve, reject) => {
            let batch = this._pendingBatch.get(key);
            if (!batch) {
                batch = { entries: [], resolvers: [] };
                this._pendingBatch.set(key, batch);
            }
            batch.entries.push({ defenderToken, result });
            batch.resolvers.push({ resolve, reject });

            clearTimeout(batch.timer);
            batch.timer = setTimeout(() => this._flushBatch(attackMessageId, key, sessionId), 0);
        });
    }

    static async _flushBatch(attackMessageId, key, sessionId) {
        const batch = this._pendingBatch.get(key);
        if (!batch) return;
        this._pendingBatch.delete(key);

        try {
            const msgId = await this._doAddMultipleResults(attackMessageId, batch.entries, sessionId);
            batch.resolvers.forEach(({ resolve }) => resolve(msgId));
        } catch (err) {
            batch.resolvers.forEach(({ reject }) => reject(err));
        }
    }

    static async _doAddMultipleResults(attackMessageId, entries, sessionId) {
        let attackMessage = game.messages.get(attackMessageId);

        if (!attackMessage && sessionId) {
            const currentMessageId = this._sessionMap.get(sessionId);
            if (currentMessageId) attackMessage = game.messages.get(currentMessageId);
        }

        if (!attackMessage) {
            console.warn('ChatAttackCard: Attack message not found:', attackMessageId);
            return attackMessageId;
        }

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        let updatedResults = [...flags.results];

        for (const { defenderToken, result } of entries) {
            const newEntry = this._createResultEntry(defenderToken, result, flags.attackerTokenId, flags.baseDamage);
            const existingIndex = updatedResults.findIndex(r => r.defenderTokenId === defenderToken.id);
            if (existingIndex >= 0) updatedResults[existingIndex] = newEntry;
            else updatedResults.push(newEntry);
        }

        await this._updateCard(attackMessage, flags, updatedResults);
        return attackMessage.id;
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
     * Apply attack damage to the defender's supernatural shield.
     * Shield absorbs baseDamage + 10 per ignored TA. Overflow goes to HP.
     * @param {string} attackMessageId
     * @param {string} defenderTokenId
     */
    static async applyDamageToShield(attackMessageId, defenderTokenId) {
        const attackMessage = game.messages.get(attackMessageId);
        if (!attackMessage) {
            console.warn('ChatAttackCard: Attack message not found:', attackMessageId);
            return;
        }

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        const entryIndex = flags.results.findIndex(r => r.defenderTokenId === defenderTokenId);
        if (entryIndex < 0) {
            console.warn('ChatAttackCard: Defender not found in results:', defenderTokenId);
            return;
        }

        const entry = flags.results[entryIndex];
        if (entry.damageApplied || entry.shieldApplied) return;

        const ignoredTA = entry.defenderTA - entry.effectiveTA;
        const shieldDamage = calculateShieldDamage(flags.baseDamage, ignoredTA);

        const token = canvas.tokens.get(defenderTokenId);
        if (token?.actor) {
            const currentShield = token.actor.system.mystic.shield.value || 0;
            const absorbed = Math.min(currentShield, shieldDamage);
            const hpDamage = Math.max(0, shieldDamage - absorbed);
            const newShieldValue = Math.max(0, currentShield - shieldDamage);

            await token.actor.update({ 'system.mystic.shield.value': newShieldValue });
            if (hpDamage > 0) {
                await token.actor.applyDamage(hpDamage);
            }

            ui.notifications.info(
                game.i18n.format('anima.chat.combat.result.shieldAppliedNotification', {
                    name: entry.defenderName,
                    absorbed,
                    hpDamage
                })
            );
        }

        const updatedResults = [...flags.results];
        updatedResults[entryIndex] = { ...entry, shieldApplied: true, shieldAbsorbed: absorbed, shieldOverflowHp: hpDamage };
        await this._updateCard(attackMessage, flags, updatedResults);
    }

    /**
     * Undo a previously applied shield action.
     * @param {string} attackMessageId
     * @param {string} defenderTokenId
     */
    static async undoShield(attackMessageId, defenderTokenId) {
        const attackMessage = game.messages.get(attackMessageId);
        if (!attackMessage) return;

        const flags = attackMessage.flags['animabf-guote'].chatCombat;
        const entryIndex = flags.results.findIndex(r => r.defenderTokenId === defenderTokenId);
        if (entryIndex < 0) return;

        const entry = flags.results[entryIndex];
        if (!entry.shieldApplied) return;

        const token = canvas.tokens.get(defenderTokenId);
        if (token?.actor) {
            const currentShield = token.actor.system.mystic.shield.value || 0;
            await token.actor.update({ 'system.mystic.shield.value': currentShield + (entry.shieldAbsorbed || 0) });
            if (entry.shieldOverflowHp > 0) {
                await token.actor.applyDamage(-entry.shieldOverflowHp);
            }
        }

        const updatedResults = [...flags.results];
        updatedResults[entryIndex] = { ...entry, shieldApplied: false, shieldAbsorbed: 0, shieldOverflowHp: 0 };
        await this._updateCard(attackMessage, flags, updatedResults);
    }

    /**
     * Helper to update the card content and flags
     * @param {ChatMessage} attackMessage
     * @param {Object} flags
     * @param {Array} updatedResults
     */
    static async _updateCard(attackMessage, flags, updatedResults) {
        const targetInfos = flags.targetInfos || [];
        const displayData = {
            attacker: flags.attackerInfo,
            attackerTokenId: flags.attackerTokenId,
            attackTotal: flags.attackTotal,
            attackBase: flags.attackBase ?? flags.attackTotal,
            roll: flags.roll,
            baseDamage: flags.baseDamage,
            damageType: flags.damageType,
            damageTypeLabel: flags.damageTypeLabel,
            taReduction: flags.taReduction,
            results: updatedResults,
            targetInfos,
            pendingTargets: targetInfos.filter(t => !updatedResults.some(r => r.defenderTokenId === t.tokenId)),
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
    static _createResultEntry(defenderToken, result, attackerTokenId = null, baseDamage = 0) {
        const damage = result.damage || 0;
        return {
            defenderTokenId: defenderToken.id,
            defenderName: defenderToken.name,
            defenderImg: defenderToken.texture?.src || defenderToken.actor?.img,
            defenseTotal: Math.max(0, result.defenseTotal || 0),
            defenderTA: result.defenderTA || 0,
            effectiveTA: result.effectiveTA || 0,
            canCounter: result.canCounterAttack,
            counterBonus: result.counterAttackBonus || 0,
            damage,
            damageModifier: result.damageModifier || 0,
            defenseSucceeded: result.defenseSucceeded ?? false,
            damageApplied: false,
            shieldApplied: false,
            attackerTokenId
        };
    }
}
