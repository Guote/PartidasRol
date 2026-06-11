import { Templates } from '../../utils/constants.js';
import { calculateCombatResult } from '../utils/calculateCombatResult.js';
import { calculateShieldDamage } from '../utils/calculateShieldDamage.js';
import { ChatAttackCard } from './ChatAttackCard.js';
import { CombatAttackDialog } from '../../dialogs/combat/CombatAttackDialog.js';
import { getPsychichPowerEffect } from '../utils/getPsychichPowerEffect.js';

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
     * Handle chat message creation - prompt defenders for targeted tokens
     * @param {ChatMessage} message
     * @param {Object} options
     * @param {string} userId
     */
    async _onCreateChatMessage(message, options, userId) {
        // Only process our own messages
        if (userId !== game.user.id) return;

        const flags = message.flags?.['animabf-guote']?.chatCombat;
        if (!flags || flags.cardType !== 'attack') return;

        const targetInfos = flags.targetInfos || [];
        if (targetInfos.length === 0) return;

        this._promptTargetedDefenders(message.id, flags, targetInfos.map(t => t.tokenId));
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
            attackerTokenId: flags.attackerTokenId,
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
                this._rerenderMessage(msg.payload?.attackMessageId);
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
     * Resolve which online user should handle defense for an actor.
     * Priority: player with actor as default character > player with OWNER permission > active GM.
     * @param {Actor} actor
     * @returns {User|null}
     */
    _resolveDefenseTarget(actor) {
        const byDefault = game.users.find(u => !u.isGM && u.active && u.character?.id === actor.id);
        if (byDefault) return byDefault;
        const byOwner = game.users.find(u => !u.isGM && u.active && actor.testUserPermission(u, 'OWNER'));
        if (byOwner) return byOwner;
        return game.users.find(u => u.isGM && u.active) ?? null;
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
            const actor = token.actor;
            if (!actor) continue;

            const targetUser = this._resolveDefenseTarget(actor);
            if (!targetUser) continue;

            if (targetUser.id === game.user.id) {
                this._openDefenseDialogForToken(attackMessageId, attackFlags, tokenId);
            } else {
                game.socket.emit('system.animabf-guote', {
                    type: 'chatCombat.promptDefense',
                    payload: {
                        attackMessageId,
                        sessionId: attackFlags.sessionId,
                        attackFlags,
                        defenderTokenId: tokenId,
                        targetUserId: targetUser.id
                    }
                });
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
            html.find('.message-portrait').hide();
            this._attachAttackCardListeners(message, html);
        } else if (flags.cardType === 'defenseNotification') {
            html.find('.chat-combat-scroll-btn').click((ev) => {
                ev.preventDefault();
                const targetId = ev.currentTarget.dataset.targetMessageId;
                const el = document.querySelector(`#chat-log [data-message-id="${targetId}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        } else if (flags.cardType === 'spell') {
            this._attachSpellCardListeners(message, html);
        } else if (flags.cardType === 'psychicPower') {
            this._attachPsychicPowerCardListeners(message, html);
        }
    }

    /**
     * Attach click handlers to attack card buttons.
     * Resolves token names, shows/hides owner-only elements per client.
     * @param {ChatMessage} message
     * @param {jQuery} html
     */
    _attachAttackCardListeners(message, html) {
        const flags = message.flags['animabf-guote'].chatCombat;

        // --- Attacker name + portrait ---
        const attackerToken = canvas.tokens.get(flags.attackerTokenId);
        html.find('.chat-combat-attacker-name-display').text(
            this._getTokenDisplayName(attackerToken) ?? flags.attackerInfo?.name ?? '???'
        );

        // Inject attacker portrait via JS (bypasses Foundry sanitizer which strips src on paths with spaces).
        // Use stored flags.attackerInfo.img — canvas.tokens.get() returns a Token placeable whose
        // .texture is a PIXI.Texture (no .src), not a TokenDocument.
        const attackerImg = flags.attackerInfo?.img || attackerToken?.document?.texture?.src || attackerToken?.actor?.img;
        if (attackerImg) {
            const $row = html.find('.chat-combat-attacker-row');
            let $portrait = $row.find('.chat-combat-portrait');
            if (!$portrait.length) {
                $portrait = $('<img class="chat-combat-portrait" alt="" />');
                $row.prepend($portrait);
            }
            $portrait.attr('src', attackerImg);
        }

        // --- Attacker details accordion: show only if owner ---
        const attackerIsOwner = game.user.isGM ||
            attackerToken?.actor?.testUserPermission(game.user, 'OWNER');
        if (attackerIsOwner) {
            html.find('.chat-combat-owner-details').show();
        }

        // --- Pending targets: hide defend button for non-owners, resolve names ---
        html.find('.chat-combat-pending-target').each((_, chip) => {
            const $chip = $(chip);
            const btn = $chip.find('.chat-combat-pending-defend')[0];
            if (!btn) return;
            const token = canvas.tokens.get(btn.dataset.defenderId);
            const isOwner = game.user.isGM || token?.actor?.testUserPermission(game.user, 'OWNER');
            if (!isOwner) $chip.find('.chat-combat-pending-defend').remove();
            $chip.find('.chat-combat-pending-name-display').text(
                this._getTokenDisplayName(token) ?? $chip.find('.chat-combat-pending-name-display').text()
            );
        });

        html.find('.chat-combat-pending-defend').click(async (ev) => {
            ev.preventDefault();
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            await this._openDefenseDialogForToken(message.id, flags, defenderTokenId);
        });

        // --- Per-defender result entries ---
        html.find('.chat-combat-result-entry').each((_, row) => {
            const $row = $(row);
            const defenderTokenId = row.dataset.defenderId;
            const token = canvas.tokens.get(defenderTokenId);
            const isOwner = game.user.isGM || token?.actor?.testUserPermission(game.user, 'OWNER');

            // Resolve defender display name
            $row.find('.chat-combat-defender-name-display').text(
                this._getTokenDisplayName(token) ?? $row.find('.chat-combat-defender-name-display').text()
            );

            if (isOwner) {
                // Show owner button, hide plain span
                $row.find('.chat-combat-outcome-btn').show();
                $row.find('.chat-combat-outcome-span').hide();

                // Show defender details accordion (inside same entry div)
                html.find(`.chat-combat-result-entry[data-defender-id="${defenderTokenId}"] .chat-combat-defender-details`).show();

                // Shield button: compute live values and show if applicable
                const applyShieldBtn = $row.find('.chat-combat-apply-shield-btn');
                if (applyShieldBtn.length && token?.actor) {
                    const currentShield = token.actor.system?.mystic?.shield?.value || 0;
                    if (currentShield > 0) {
                        const entry = flags.results.find(r => r.defenderTokenId === defenderTokenId);
                        const ignoredTA = Math.max(0, (entry?.defenderTA || 0) - (entry?.effectiveTA || 0));
                        const shieldDmg = calculateShieldDamage(flags.baseDamage, ignoredTA);
                        const shieldBreaks = currentShield <= shieldDmg;

                        if (shieldBreaks) {
                            const hpDmg = shieldDmg - currentShield;
                            let html = `<div class="chat-combat-shield-row chat-combat-shield-broken"><i class="fas fa-shield-virus"></i> ${currentShield}</div>`;
                            if (hpDmg > 0) html += `<div class="chat-combat-shield-row"><i class="fas fa-heart-broken"></i> ${hpDmg}</div>`;
                            applyShieldBtn.html(html);
                        } else {
                            applyShieldBtn.html(`<div class="chat-combat-shield-row"><i class="fas fa-shield-virus"></i> ${shieldDmg}</div>`);
                        }
                        applyShieldBtn.show();
                    }
                }

                // Undo-shield: always show for owners when it's in the applied state
                $row.find('.chat-combat-undo-shield-btn').show();
            }
        });

        // --- Defend button ---
        html.find('.chat-combat-defend-button').click((ev) => {
            ev.preventDefault();
            this._onDefendButtonClick(message);
        });

        // --- Apply damage (outcome cell button, not applied) ---
        html.find('.chat-combat-damage-btn:not(.chat-combat-applied)').click(async (ev) => {
            ev.preventDefault();
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            const token = canvas.tokens.get(defenderTokenId);
            if (!game.user.isGM && !token?.actor?.testUserPermission(game.user, 'OWNER')) return;
            await this._onApplyDamageClick(message, defenderTokenId);
        });

        // --- Undo damage (outcome cell button, applied state) ---
        html.find('.chat-combat-damage-btn.chat-combat-applied').click(async (ev) => {
            ev.preventDefault();
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            const token = canvas.tokens.get(defenderTokenId);
            if (!game.user.isGM && !token?.actor?.testUserPermission(game.user, 'OWNER')) return;
            await this._onUndoDamageClick(message, defenderTokenId);
        });

        // --- Counterattack button ---
        html.find('.chat-combat-counter-btn').click(async (ev) => {
            ev.preventDefault();
            const { defenderId, attackerTokenId, counterBonus } = ev.currentTarget.dataset;
            const token = canvas.tokens.get(defenderId);
            if (!game.user.isGM && !token?.actor?.testUserPermission(game.user, 'OWNER')) return;
            await this._onCounterAttackClick(token?.document, attackerTokenId, parseInt(counterBonus) || 0);
        });

        // --- Apply to shield ---
        html.find('.chat-combat-apply-shield-btn').click(async (ev) => {
            ev.preventDefault();
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            const token = canvas.tokens.get(defenderTokenId);
            if (!game.user.isGM && !token?.actor?.testUserPermission(game.user, 'OWNER')) return;
            await this._onApplyShieldClick(message, defenderTokenId);
        });

        // --- Undo shield ---
        html.find('.chat-combat-undo-shield-btn').click(async (ev) => {
            ev.preventDefault();
            const defenderTokenId = ev.currentTarget.dataset.defenderId;
            const token = canvas.tokens.get(defenderTokenId);
            if (!game.user.isGM && !token?.actor?.testUserPermission(game.user, 'OWNER')) return;
            await this._onUndoShieldClick(message, defenderTokenId);
        });
    }

    /**
     * Get the display name for a canvas token, respecting module overrides and permission settings.
     * Falls back to '???' when the current user lacks Observer or higher permission.
     * @param {Token|null} token - canvas Token placeable
     * @returns {string}
     */
    _getTokenDisplayName(token) {
        if (!token) return '???';
        // Use nameplate text when available — respects modules like Illandril's Token Name Display
        if (token.nameplate?.text) return token.nameplate.text;
        const isObserver = game.user.isGM || token.actor?.testUserPermission(game.user, 'OBSERVER');
        return isObserver ? (token.document?.name ?? '???') : '???';
    }

    /**
     * Open a counterattack dialog: the former defender attacks back at the original attacker.
     * @param {TokenDocument} defenderToken - the new attacker (was defending)
     * @param {string} attackerTokenId - token ID of the original attacker (new target)
     * @param {number} counterBonus
     */
    async _onCounterAttackClick(defenderToken, attackerTokenId, counterBonus) {
        if (!defenderToken) {
            ui.notifications.warn(game.i18n.localize('anima.chat.combat.selectDefender'));
            return;
        }
        const attackerPlaceable = canvas.tokens.get(attackerTokenId);
        const targetToken = attackerPlaceable?.document ?? defenderToken;

        new CombatAttackDialog(
            defenderToken,
            targetToken,
            { onAttack: async () => {} },
            {
                allowed: true,
                closeOnSend: true,
                counterAttackBonus: counterBonus,
                counterAttackOnly: true
            }
        );
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
        const atAfterSurprise = defenseResult.surprised ? Math.floor(defenderTA / 2) : defenderTA;
        const effectiveTA = Math.max(0, Math.min(10, atAfterSurprise + attackFlags.taReduction));

        const result = {
            ...combatResult,
            defenseTotal: Math.max(0, defenseResult.total),
            defenderTA: defenderTA,
            effectiveTA: effectiveTA,
            defenseSucceeded: Math.max(0, defenseResult.total) > Math.max(0, attackFlags.attackTotal),
            damageModifier: defenseResult.damageModifier || 0
        };

        Hooks.callAll('animabf.combatResolved', defenderToken, result);

        // Check if we can update the card directly (GM or message owner)
        const attackMessage = game.messages.get(attackMessageId) ||
            game.messages.get(ChatAttackCard._sessionMap.get(sessionId));

        const canUpdateDirectly = game.user.isGM ||
            (attackMessage && attackMessage.isAuthor);

        if (canUpdateDirectly) {
            // We have permission - update directly
            const newMessageId = await ChatAttackCard.addDefenderResult(attackMessageId, defenderToken, result, sessionId);

            // Post a scroll-to-card notification so the card doesn't get lost in chat
            await this._postDefenseNotification(defenderToken, newMessageId);

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

        // Halve AT if surprised BEFORE applying attacker's taReduction
        const atBase = defenseResult.at ?? 0;
        const atAfterSurprise = defenseResult.surprised ? Math.floor(atBase / 2) : atBase;
        const at = Math.max(0, Math.min(10, atAfterSurprise + attackFlags.taReduction));

        // damageModifier reduces the attacker's base damage before the % formula
        const effectiveBaseDamage = attackFlags.baseDamage + (defenseResult.damageModifier || 0);

        return calculateCombatResult(attack, defense, at, effectiveBaseDamage);
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
        this._rerenderMessage(payload.attackMessageId);
    }

    /**
     * Handle defense added notification from another client
     * @param {Object} payload
     */
    _handleDefenseAdded(payload) {
        this._rerenderMessage(payload.attackMessageId);
    }

    /**
     * Handle damage applied notification from another client
     * @param {Object} payload
     */
    _handleDamageApplied(payload) {
        this._rerenderMessage(payload.attackMessageId);
    }

    /**
     * Handle damage undone notification from another client
     * @param {Object} payload
     */
    _handleDamageUndone(payload) {
        this._rerenderMessage(payload.attackMessageId);
    }

    /**
     * Post a minimal notification message with a scroll-to-card button.
     * Called after a defense is resolved so the updated attack card can be found
     * even if it has been pushed up the chat log by subsequent dice rolls.
     * @param {TokenDocument|{id:string,name:string}} defenderToken
     * @param {string} attackMessageId
     */
    async _postDefenseNotification(defenderToken, attackMessageId) {
        // Prefer the live canvas token document so getSpeaker resolves portrait/scene correctly
        const tokenDoc = canvas.tokens.get(defenderToken.id)?.document ?? defenderToken;
        const speaker = ChatMessage.getSpeaker({ token: tokenDoc });
        const gmIds = game.users.filter(u => u.isGM).map(u => u.id);

        const content = `<div class="chat-combat-notification"><i class="fas fa-shield-alt"></i><span>${defenderToken.name} respondió al ataque.</span><button class="chat-combat-scroll-btn" data-target-message-id="${attackMessageId}"><i class="fas fa-arrow-up"></i> Ver tarjeta</button></div>`;
        await ChatMessage.create({
            content,
            speaker,
            whisper: gmIds,
            flags: {
                'animabf-guote': {
                    chatCombat: {
                        cardType: 'defenseNotification',
                        targetMessageId: attackMessageId
                    }
                }
            }
        });
    }

    /**
     * Re-render a single chat message by ID without re-rendering the whole log.
     * @param {string} messageId
     */
    _rerenderMessage(messageId) {
        if (!messageId) return;
        const message = game.messages.get(messageId);
        if (message) ui.chat.updateMessage(message);
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
     * Post a psychic power chat card with the potential roll result and effect.
     * @param {ABFActor} actor
     * @param {string} powerId
     * @param {number} potentialTotal
     */
    async _postPsychicPowerCard(actor, powerId, potentialTotal) {
        const power = actor.items.get(powerId);
        if (!power) return;

        const effect = getPsychichPowerEffect(power.system, potentialTotal);

        const token = canvas.tokens.controlled.find(t => t.actor?.id === actor.id)
            ?? canvas.tokens.placeables.find(t => t.actor?.id === actor.id);
        const actorImg = token?.document?.texture?.src ?? actor.img;

        const content = await renderTemplate(
            'systems/animabf-guote/templates/chat/psychic-power-card.hbs',
            { actorName: actor.name, actorImg, powerName: power.name, powerId, potentialTotal, effect }
        );

        await ChatMessage.create({
            content,
            speaker: ChatMessage.getSpeaker({ actor }),
            flags: {
                'animabf-guote': {
                    chatCombat: {
                        cardType: 'psychicPower',
                        powerId,
                        potentialTotal,
                        actorId: actor.id,
                    }
                }
            }
        });
    }

    /**
     * Attach click handlers to psychic power chat card buttons.
     * Removes buttons for users who are not the message sender.
     * @param {ChatMessage} message
     * @param {jQuery} html
     */
    _attachPsychicPowerCardListeners(message, html) {
        if (game.user.id !== message.user?.id) {
            html.find('.set-as-psychic-attack').remove();
            return;
        }

        html.find('.set-as-psychic-attack').click((ev) => {
            ev.preventDefault();
            this._onSetAsPsychicAttack(message);
        });
    }

    /**
     * Handle "Atacar" button click on a psychic power card.
     * Opens CombatAttackDialog with the psychic tab and power preselected.
     * @param {ChatMessage} message
     */
    async _onSetAsPsychicAttack(message) {
        const token = this._resolveToken();
        if (!token) return;

        const flags = message.flags['animabf-guote'].chatCombat;
        const { powerId } = flags;

        const defenderTarget = game.user.targets.first() ?? null;
        const defenderToken = defenderTarget ? defenderTarget.document : token;

        const existingDialog = Object.values(ui.windows).find(
            w => w instanceof CombatAttackDialog && w.modalData?.attacker?.token?.id === token.id
        );

        if (existingDialog) {
            existingDialog.modalData.attacker.psychic.powerUsed = powerId;
            existingDialog._tabs[0].active = 'psychic';
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
                        attackType: { value: 'psychic' },
                        psychic: {
                            powerUsed: { value: powerId },
                        }
                    }
                }
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

        // Post a scroll-to-card notification so the card doesn't get lost in chat
        await this._postDefenseNotification(defenderTokenData, newMessageId);

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
