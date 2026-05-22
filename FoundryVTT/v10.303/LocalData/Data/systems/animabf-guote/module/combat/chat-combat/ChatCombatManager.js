import { Templates } from '../../utils/constants.js';
import { calculateCombatResult } from '../utils/calculateCombatResult.js';
import { calculateShieldDamage } from '../utils/calculateShieldDamage.js';
import { ChatAttackCard } from './ChatAttackCard.js';
import { CombatAttackDialog } from '../../dialogs/combat/CombatAttackDialog.js';

/**
 * Main controller for the chat-based combat system.
 * Handles hook registration, button listeners, and combat flow orchestration.
 */
export class ChatCombatManager {
    constructor() {
        this._pendingTargets = null;
        this._pendingAttackerTokenId = null;
        this._registerHooks();
        this._registerSocketListeners();
        console.log('AnimaBF | ChatCombatManager initialized');
    }

    /**
     * Register Foundry hooks for chat message rendering and creation
     */
    _registerHooks() {
        Hooks.on('renderChatMessage', (message, html, data) => {
            this._onRenderChatMessage(message, html, data);
        });

        // Listen for attack card creation to handle auto-targeting
        Hooks.on('createChatMessage', (message, options, userId) => {
            this._onCreateChatMessage(message, options, userId);
        });
    }

    /**
     * Handle chat message creation - check for attack cards with pending targets
     * @param {ChatMessage} message
     * @param {Object} options
     * @param {string} userId
     */
    _onCreateChatMessage(message, options, userId) {
        // Only process our own messages
        if (userId !== game.user.id) return;

        const flags = message.flags?.['animabf-guote']?.chatCombat;
        if (!flags || flags.cardType !== 'attack') return;

        // Check if we have pending targets for this attacker
        if (this._pendingTargets && this._pendingTargets.length > 0 &&
            this._pendingAttackerTokenId === flags.attackerTokenId) {

            const targetedTokenIds = this._pendingTargets;
            this._pendingTargets = null;
            this._pendingAttackerTokenId = null;

            // Build target info for card display
            const targetInfos = targetedTokenIds.flatMap(id => {
                const token = canvas.tokens.get(id);
                if (!token) return [];
                return [{ tokenId: id, name: token.name, img: token.document?.texture?.src || token.actor?.img || 'icons/svg/mystery-man.svg' }];
            });

            // Update the card to show pending targets (fire and forget)
            this._updateCardWithTargets(message, flags, targetInfos);

            // Prompt defenders
            this._promptTargetedDefenders(message.id, flags, targetedTokenIds);
        }
    }

    /**
     * Re-render the attack card to include target portrait row, and persist targetInfos in flags.
     * @param {ChatMessage} message
     * @param {Object} flags
     * @param {Array} targetInfos
     */
    async _updateCardWithTargets(message, flags, targetInfos) {
        const displayData = {
            attacker: flags.attackerInfo,
            attackType: flags.attackType,
            attackTotal: flags.attackTotal,
            attackBase: flags.attackBase ?? flags.attackTotal,
            roll: flags.roll,
            fumbled: flags.fumbled,
            baseDamage: flags.baseDamage,
            damageType: flags.damageType,
            damageTypeLabel: flags.damageTypeLabel,
            taReduction: flags.taReduction,
            results: flags.results || [],
            targetInfos,
            pendingTargets: targetInfos,
            isGM: game.user.isGM
        };

        const content = await renderTemplate(Templates.Chat.ChatCombat.AttackCard, displayData);

        await message.update({
            content,
            'flags.animabf-guote.chatCombat.targetInfos': targetInfos
        });
    }

    /**
     * Register socket listeners for cross-client communication
     */
    _registerSocketListeners() {
        game.socket.on('system.animabf-guote', (msg) => {
            if (msg.type === 'chatCombat.defenseAdded') {
                this._handleDefenseAdded(msg.payload);
            }
            if (msg.type === 'chatCombat.damageApplied') {
                this._handleDamageApplied(msg.payload);
            }
            if (msg.type === 'chatCombat.damageUndone') {
                this._handleDamageUndone(msg.payload);
            }
            if (msg.type === 'chatCombat.shieldApplied') {
                this._handleShieldApplied(msg.payload);
            }
            if (msg.type === 'chatCombat.shieldUndone') {
                ui.chat.render();
            }
            if (msg.type === 'chatCombat.promptDefense') {
                this._handlePromptDefense(msg.payload);
            }
            // GM-only: Handle card update requests from players
            if (msg.type === 'chatCombat.requestCardUpdate') {
                this._handleCardUpdateRequest(msg.payload);
            }
        });
    }

    /**
     * Initiate a chat-based attack from the selected token.
     * Opens the attack dialog and creates attack card on completion.
     * If targets are selected, prompts their owners with defense dialogs.
     */
    async sendAttack() {
        // Get selected token as attacker
        const selectedTokens = canvas.tokens.controlled;
        if (selectedTokens.length === 0) {
            ui.notifications.warn(game.i18n.localize('anima.macros.combat.dialog.error.noSelectedToken.title'));
            return;
        }

        const attackerToken = selectedTokens[0].document;

        // Get targeted tokens
        const targetedTokens = Array.from(game.user.targets);
        const targetedTokenIds = targetedTokens.map(t => t.id);

        // Use first target as "defender" for dialog, or attacker as dummy
        const defenderForDialog = targetedTokens.length > 0
            ? targetedTokens[0].document
            : attackerToken;

        // Store targets for use when the attack card is created
        this._pendingTargets = targetedTokenIds;
        this._pendingAttackerTokenId = attackerToken.id;

        // Open attack dialog - the card is auto-created in CombatAttackDialog
        new CombatAttackDialog(
            attackerToken,
            defenderForDialog,
            {
                onAttack: async (attackResult) => {
                    // Attack card is auto-created by CombatAttackDialog
                    // We'll handle targeting in the createChatMessage hook
                }
            },
            { allowed: true, closeOnSend: true }
        );
    }

    /**
     * Prompt targeted token owners with defense dialogs
     * @param {string} attackMessageId
     * @param {Object} attackFlags
     * @param {string[]} targetedTokenIds
     */
    _promptTargetedDefenders(attackMessageId, attackFlags, targetedTokenIds) {
        for (const tokenId of targetedTokenIds) {
            const token = canvas.tokens.get(tokenId);
            if (!token) continue;

            // Find the user who owns this token
            const actor = token.actor;
            if (!actor) continue;

            // Get the owner(s) of this actor
            const owners = game.users.filter(u =>
                !u.isGM && actor.testUserPermission(u, 'OWNER')
            );

            if (owners.length > 0) {
                // Send to first owner
                game.socket.emit('system.animabf-guote', {
                    type: 'chatCombat.promptDefense',
                    payload: {
                        attackMessageId,
                        sessionId: attackFlags.sessionId,
                        attackFlags,
                        defenderTokenId: tokenId,
                        targetUserId: owners[0].id
                    }
                });
            } else if (game.user.isGM) {
                // GM controls this token, open defense dialog directly
                this._openDefenseDialogForToken(attackMessageId, attackFlags, tokenId);
            } else {
                // Player attacking a GM-controlled token — route to active GM
                const activeGM = game.users.find(u => u.isGM && u.active);
                if (activeGM) {
                    game.socket.emit('system.animabf-guote', {
                        type: 'chatCombat.promptDefense',
                        payload: {
                            attackMessageId,
                            sessionId: attackFlags.sessionId,
                            attackFlags,
                            defenderTokenId: tokenId,
                            targetUserId: activeGM.id
                        }
                    });
                }
            }
        }
    }

    /**
     * Handle prompt defense message from another client
     * @param {Object} payload
     */
    async _handlePromptDefense(payload) {
        // Only respond if this is for us
        if (payload.targetUserId !== game.user.id) return;

        this._openDefenseDialogForToken(
            payload.attackMessageId,
            payload.attackFlags,
            payload.defenderTokenId
        );
    }

    /**
     * Open defense dialog for a specific token
     * @param {string} attackMessageId
     * @param {Object} attackFlags
     * @param {string} defenderTokenId
     */
    async _openDefenseDialogForToken(attackMessageId, attackFlags, defenderTokenId) {
        const token = canvas.tokens.get(defenderTokenId);
        if (!token) return;

        const defenderToken = token.document;
        const { ChatCombatDefenseDialog } = await import('./ChatCombatDefenseDialog.js');

        const sessionId = attackFlags.sessionId;

        // We need to get the attack message or create a mock one for the dialog
        let attackMessage = game.messages.get(attackMessageId);
        if (!attackMessage) {
            // Message might have been recreated, find by session
            const currentMessageId = ChatAttackCard._sessionMap.get(sessionId);
            if (currentMessageId) {
                attackMessage = game.messages.get(currentMessageId);
            }
        }

        if (!attackMessage) {
            console.warn('ChatCombatManager: Could not find attack message for defense prompt');
            return;
        }

        new ChatCombatDefenseDialog(
            attackMessage,
            defenderToken,
            {
                onDefense: (defenseResult) => {
                    this._processDefense(attackMessageId, sessionId, attackFlags, defenderToken, defenseResult);
                }
            }
        );
    }

    /**
     * Handle chat message rendering - attach button listeners
     * @param {ChatMessage} message
     * @param {jQuery} html
     * @param {Object} data
     */
    _onRenderChatMessage(message, html, data) {
        const flags = message.flags?.['animabf-guote']?.chatCombat;
        if (!flags) return;

        if (flags.cardType === 'attack') {
            this._attachAttackCardListeners(message, html);
        } else if (flags.cardType === 'spell') {
            this._attachSpellCardListeners(message, html);
        }
    }

    /**
     * Attach click handlers to attack card buttons
     * @param {ChatMessage} message
     * @param {jQuery} html
     */
    _attachAttackCardListeners(message, html) {
        // Defend button
        html.find('.chat-combat-defend-button').click((ev) => {
            ev.preventDefault();
            this._onDefendButtonClick(message);
        });

        // Apply damage buttons (GM only)
        html.find('.chat-combat-apply-damage').click(async (ev) => {
            ev.preventDefault();
            if (!game.user.isGM) return;
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            await this._onApplyDamageClick(message, defenderTokenId);
        });

        // Undo damage buttons (GM only)
        html.find('.chat-combat-undo-damage').click(async (ev) => {
            ev.preventDefault();
            if (!game.user.isGM) return;
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            await this._onUndoDamageClick(message, defenderTokenId);
        });

        // Undo shield buttons (GM only)
        html.find('.chat-combat-undo-shield').click(async (ev) => {
            ev.preventDefault();
            if (!game.user.isGM) return;
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            await this._onUndoShieldClick(message, defenderTokenId);
        });

        // Apply to shield buttons (GM only) — two-click confirmation
        html.find('.chat-combat-apply-shield').click(async (ev) => {
            ev.preventDefault();
            if (!game.user.isGM) return;
            const btn = ev.currentTarget;
            const defenderTokenId = btn.dataset.defenderId;

            if (btn.dataset.pending === 'true') {
                btn.dataset.pending = '';
                await this._onApplyShieldClick(message, defenderTokenId);
            } else {
                const flags = message.flags['animabf-guote'].chatCombat;
                const entry = flags.results.find(r => r.defenderTokenId === defenderTokenId);
                const ignoredTA = Math.max(0, entry.defenderTA - entry.effectiveTA);
                const shieldDamage = calculateShieldDamage(flags.baseDamage, ignoredTA);

                btn.dataset.pending = 'true';
                btn.innerHTML = `<i class="fas fa-shield-alt"></i> -${shieldDamage}`;

                const cancel = (e) => {
                    if (!btn.contains(e.target)) {
                        btn.dataset.pending = '';
                        btn.innerHTML = '<i class="fas fa-shield-alt"></i>';
                        document.removeEventListener('click', cancel);
                    }
                };
                setTimeout(() => document.addEventListener('click', cancel), 0);
            }
        });
    }

    /**
     * Handle Defend button click on attack card
     * @param {ChatMessage} attackMessage
     */
    async _onDefendButtonClick(attackMessage) {
        const defenders = this._getDefenders();

        if (defenders.length === 0) {
            ui.notifications.warn(game.i18n.localize('anima.chat.combat.selectDefender'));
            return;
        }

        // Import defense dialog dynamically to avoid circular dependencies
        const { ChatCombatDefenseDialog } = await import('./ChatCombatDefenseDialog.js');

        // Extract attack data that persists across message deletions
        const attackFlags = attackMessage.flags['animabf-guote'].chatCombat;
        const sessionId = attackFlags.sessionId;
        const attackMessageId = attackMessage.id;

        for (const defender of defenders) {
            new ChatCombatDefenseDialog(
                attackMessage,
                defender,
                {
                    onDefense: (defenseResult) => {
                        this._processDefense(attackMessageId, sessionId, attackFlags, defender, defenseResult);
                    }
                }
            );
        }
    }

    /**
     * Get tokens that should defend
     * - GM with selected tokens: those tokens
     * - Player: their character's token
     * @returns {TokenDocument[]}
     */
    _getDefenders() {
        // GM with selected tokens
        if (game.user.isGM && canvas.tokens.controlled.length > 0) {
            return canvas.tokens.controlled.map(t => t.document);
        }

        // Player's character
        const character = game.user.character;
        if (character) {
            const token = canvas.tokens.placeables.find(
                t => t.actor?.id === character.id
            );
            if (token) return [token.document];
        }

        return [];
    }

    /**
     * Process a defense result - calculate combat and update attack card
     * @param {string} attackMessageId - Original message ID
     * @param {string} sessionId - Session ID for tracking across message recreation
     * @param {Object} attackFlags - Attack data from message flags
     * @param {TokenDocument} defenderToken
     * @param {Object} defenseResult
     */
    async _processDefense(attackMessageId, sessionId, attackFlags, defenderToken, defenseResult) {
        // Calculate combat result
        const combatResult = this._calculateResult(attackFlags, defenseResult);

        // Build extended result with defense data
        const defenderTA = defenseResult.at ?? 0;
        const effectiveTA = Math.max(0, Math.min(10, defenderTA + attackFlags.taReduction));

        const result = {
            ...combatResult,
            defenseTotal: Math.max(0, defenseResult.total),
            defenderTA: defenderTA,
            effectiveTA: effectiveTA,
            defenseSucceeded: Math.max(0, defenseResult.total) > Math.max(0, attackFlags.attackTotal)
        };

        // Check if we can update the card directly (GM or message owner)
        const attackMessage = game.messages.get(attackMessageId) ||
            game.messages.get(ChatAttackCard._sessionMap.get(sessionId));

        const canUpdateDirectly = game.user.isGM ||
            (attackMessage && attackMessage.isAuthor);

        if (canUpdateDirectly) {
            // We have permission - update directly
            const newMessageId = await ChatAttackCard.addDefenderResult(attackMessageId, defenderToken, result, sessionId);

            // Notify other clients
            game.socket.emit('system.animabf-guote', {
                type: 'chatCombat.defenseAdded',
                payload: {
                    attackMessageId: newMessageId,
                    sessionId: sessionId,
                    defenderTokenId: defenderToken.id
                }
            });
        } else {
            // Request GM to update the card for us
            game.socket.emit('system.animabf-guote', {
                type: 'chatCombat.requestCardUpdate',
                payload: {
                    attackMessageId,
                    sessionId,
                    defenderTokenId: defenderToken.id,
                    defenderTokenName: defenderToken.name,
                    defenderTokenImg: defenderToken.texture?.src || defenderToken.actor?.img,
                    result
                }
            });
        }

        Hooks.callAll('animabf.defenseSent', defenderToken, defenseResult);
    }

    /**
     * Calculate combat result using existing utilities
     * @param {Object} attackFlags
     * @param {Object} defenseResult
     * @returns {Object}
     */
    _calculateResult(attackFlags, defenseResult) {
        const attack = Math.max(0, attackFlags.attackTotal);
        const defense = Math.max(0, defenseResult.total);

        // Get appropriate TA based on damage type
        const at = Math.max(0, Math.min(10,
            (defenseResult.at ?? 0)
            + attackFlags.taReduction
        ));

        // For resistance defense, "surprised" means halved absorption
        const halvedAbsorption = defenseResult.type === 'resistance'
            ? defenseResult.surprised
            : false;

        return calculateCombatResult(
            attack,
            defense,
            at,
            attackFlags.baseDamage,
            halvedAbsorption
        );
    }

    /**
     * Handle Apply Damage button click
     * @param {ChatMessage} attackMessage
     * @param {string} defenderTokenId
     */
    async _onApplyDamageClick(attackMessage, defenderTokenId) {
        await ChatAttackCard.applyDamage(attackMessage.id, defenderTokenId);

        // Notify other clients
        game.socket.emit('system.animabf-guote', {
            type: 'chatCombat.damageApplied',
            payload: {
                attackMessageId: attackMessage.id,
                defenderTokenId
            }
        });
    }

    /**
     * Handle Undo Damage button click
     * @param {ChatMessage} attackMessage
     * @param {string} defenderTokenId
     */
    async _onUndoDamageClick(attackMessage, defenderTokenId) {
        await ChatAttackCard.undoDamage(attackMessage.id, defenderTokenId);

        // Notify other clients
        game.socket.emit('system.animabf-guote', {
            type: 'chatCombat.damageUndone',
            payload: {
                attackMessageId: attackMessage.id,
                defenderTokenId
            }
        });
    }

    /**
     * Handle Apply Shield button click
     * @param {ChatMessage} attackMessage
     * @param {string} defenderTokenId
     */
    async _onUndoShieldClick(attackMessage, defenderTokenId) {
        await ChatAttackCard.undoShield(attackMessage.id, defenderTokenId);

        game.socket.emit('system.animabf-guote', {
            type: 'chatCombat.shieldUndone',
            payload: { attackMessageId: attackMessage.id, defenderTokenId }
        });
    }

    async _onApplyShieldClick(attackMessage, defenderTokenId) {
        await ChatAttackCard.applyDamageToShield(attackMessage.id, defenderTokenId);

        game.socket.emit('system.animabf-guote', {
            type: 'chatCombat.shieldApplied',
            payload: {
                attackMessageId: attackMessage.id,
                defenderTokenId
            }
        });
    }

    /**
     * Handle shield applied notification from another client
     * @param {Object} payload
     */
    _handleShieldApplied(payload) {
        ui.chat.render();
    }

    /**
     * Handle defense added notification from another client
     * @param {Object} payload
     */
    _handleDefenseAdded(payload) {
        // Re-render chat to update button states
        ui.chat.render();
    }

    /**
     * Handle damage applied notification from another client
     * @param {Object} payload
     */
    _handleDamageApplied(payload) {
        // Re-render chat to update button states
        ui.chat.render();
    }

    /**
     * Handle damage undone notification from another client
     * @param {Object} payload
     */
    _handleDamageUndone(payload) {
        // Re-render chat to update button states
        ui.chat.render();
    }

    /**
     * Resolve the token to use for the current user.
     * 1 selected → use it; 0 selected → use character's token; otherwise warn + null.
     * @returns {TokenDocument|null}
     */
    _resolveToken() {
        const controlled = canvas.tokens.controlled;
        if (controlled.length === 1) return controlled[0].document;
        if (controlled.length === 0) {
            const character = game.user.character;
            if (character) {
                const token = canvas.tokens.placeables.find(t => t.actor?.id === character.id);
                if (token) return token.document;
            }
        }
        ui.notifications.warn(game.i18n.localize('anima.chat.spellCard.noTokenSelected'));
        return null;
    }

    /**
     * Post a spell-grade chat card from the spellbook.
     * @param {ABFActor} actor
     * @param {string} spellId
     * @param {string} spellGrade - 'base' | 'intermediate' | 'advanced' | 'arcane'
     */
    async _postSpellCard(actor, spellId, spellGrade) {
        const spell = actor.items.get(spellId);
        if (!spell) return;

        const gradeData = spell.system.grades?.[spellGrade];
        const gradeLabel = game.i18n.localize(`anima.ui.mystic.spell.grade.${spellGrade}.title`);

        const token = canvas.tokens.controlled.find(t => t.actor?.id === actor.id)
            ?? canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
        const actorImg = token?.document?.texture?.src ?? actor.img;

        const content = await renderTemplate(
            'systems/animabf-guote/templates/chat/spell-grade-card.hbs',
            {
                actorName: actor.name,
                actorImg,
                spellName: spell.name,
                spellId,
                grade: spellGrade,
                gradeLabel,
                zeonCost: gradeData?.zeon?.value,
                description: gradeData?.description?.value,
            }
        );

        await ChatMessage.create({
            content,
            speaker: ChatMessage.getSpeaker({ actor }),
            flags: {
                'animabf-guote': {
                    chatCombat: {
                        cardType: 'spell',
                        spellId,
                        spellGrade,
                        actorId: actor.id,
                    }
                }
            }
        });
    }

    /**
     * Attach click handlers to spell grade chat card buttons.
     * Removes buttons for users who are not the message sender.
     * @param {ChatMessage} message
     * @param {jQuery} html
     */
    _attachSpellCardListeners(message, html) {
        if (game.user.id !== message.user?.id) {
            html.find('.set-as-attack, .set-as-defense').remove();
            return;
        }

        html.find('.set-as-attack').click((ev) => {
            ev.preventDefault();
            this._onSetAsAttack(message);
        });

        html.find('.set-as-defense').click((ev) => {
            ev.preventDefault();
            this._onSetAsDefense(message);
        });
    }

    /**
     * Handle "Set as Attack" button click on a spell card.
     * Opens CombatAttackDialog with the mystic tab and spell preselected.
     * @param {ChatMessage} message
     */
    async _onSetAsAttack(message) {
        const token = this._resolveToken();
        if (!token) return;

        const flags = message.flags['animabf-guote'].chatCombat;
        const { spellId, spellGrade } = flags;

        const defenderTarget = game.user.targets.first() ?? null;
        const defenderToken = defenderTarget ? defenderTarget.document : token;

        const existingDialog = Object.values(ui.windows).find(
            w => w instanceof CombatAttackDialog && w.modalData?.attacker?.token?.id === token.id
        );

        if (existingDialog) {
            existingDialog.modalData.attacker.mystic.spellUsed = spellId;
            existingDialog.modalData.attacker.mystic.spellGrade = spellGrade;
            existingDialog._tabs[0].active = 'mystic';
            existingDialog.render(false);
        } else {
            new CombatAttackDialog(
                token,
                defenderToken,
                { onAttack: async () => {} },
                {
                    allowed: true,
                    closeOnSend: true,
                    presetData: {
                        attackType: { value: 'mystic' },
                        mystic: {
                            spellUsed: { value: spellId },
                            spellGrade: { value: spellGrade },
                        }
                    }
                }
            );
        }
    }

    /**
     * Handle "Set as Defense" button click on a spell card.
     * Opens ChatCombatDefenseDialog in standalone mode with the spell preselected.
     * @param {ChatMessage} message
     */
    async _onSetAsDefense(message) {
        const token = this._resolveToken();
        if (!token) return;

        const flags = message.flags['animabf-guote'].chatCombat;
        const { spellId, spellGrade } = flags;

        const { ChatCombatDefenseDialog } = await import('./ChatCombatDefenseDialog.js');

        const existingDialog = Object.values(ui.windows).find(
            w => w instanceof ChatCombatDefenseDialog && w.standalone
                && w.defenderToken?.id === token.id
        );

        if (existingDialog) {
            existingDialog.modalData.defender.mystic.spellUsed = spellId;
            existingDialog.modalData.defender.mystic.spellGrade = spellGrade;
            existingDialog._tabs[0].active = 'mystic';
            existingDialog.modalData.ui.activeTab = 'mystic';
            existingDialog.render(false);
        } else {
            new ChatCombatDefenseDialog(
                null,
                token,
                { onDefense: () => {} },
                { spellUsed: spellId, spellGrade }
            );
        }
    }

    /**
     * Handle card update request from a player (GM only)
     * Players can't delete/recreate chat messages, so they request the GM to do it
     * @param {Object} payload
     */
    async _handleCardUpdateRequest(payload) {
        // Only GM should handle this
        if (!game.user.isGM) return;

        const { attackMessageId, sessionId, defenderTokenId, defenderTokenName, defenderTokenImg, result } = payload;

        // Create a mock token document with the necessary info
        const defenderTokenData = {
            id: defenderTokenId,
            name: defenderTokenName,
            texture: { src: defenderTokenImg },
            actor: { img: defenderTokenImg }
        };

        // Update the card
        const newMessageId = await ChatAttackCard.addDefenderResult(
            attackMessageId,
            defenderTokenData,
            result,
            sessionId
        );

        // Notify all clients that defense was added
        game.socket.emit('system.animabf-guote', {
            type: 'chatCombat.defenseAdded',
            payload: {
                attackMessageId: newMessageId,
                sessionId: sessionId,
                defenderTokenId: defenderTokenId
            }
        });
    }
}
