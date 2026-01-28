import { MODULE } from './config.js';
import { applyBuffToTargets } from './buffs.js';
export let socket;

Hooks.once("socketlib.ready", () => {
    socket = socketlib.registerModule(MODULE.ID);
    socket.register("applyImmobilize", applyImmobilize);
    socket.register("sendNotification", sendNotification);
    socket.register("promptHTKChoice", promptHTKChoice);
    socket.register("handleFlatFootedRemoval", handleFlatFootedRemoval);
    socket.register("applyBuffToTargetsSocket", applyBuffToTargetsSocket);
});

let immobileConditionIds = new Set();

export function initializeConditionIds() {
    const immobileConditions = ["anchored", "cowering", "dazed", "dying", "helpless", "paralyzed", "petrified", "pinned"];

    pf1.registry.conditions.forEach(condition => {
        if (immobileConditions.includes(condition._id)) {
            immobileConditionIds.add(condition._id);
        }
    });
}

function hasImmobileCondition(token) {
    return token.actor.statuses?.some(status => immobileConditionIds.has(status)) ?? false;
}

async function applyImmobilize(tokenId, limit) {
    if (!game.settings.get(MODULE.ID, 'restrictMovement')) {
        return true;
    }
    const token = canvas.tokens.get(tokenId);
    if (!token) return;

    const currentLimit = token.document.getFlag(MODULE.ID, 'immobilized');

    if (currentLimit !== undefined) {
        await token.document.unsetFlag(MODULE.ID, 'immobilized');
        sendNotificationToOwners(token, "info", game.i18n.localize('PF1-Improved-Conditions.Sockets.MovementRestrictionRemoved'));
    } else {
        await token.document.setFlag(MODULE.ID, 'immobilized', limit);
        sendNotificationToOwners(token, "info", game.i18n.localize('PF1-Improved-Conditions.Sockets.MovementRestrictionApplied'));
    }
}

async function promptHTKChoice(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const content = `<p>${game.i18n.format('PF1-Improved-Conditions.Sockets.HardToKillPrompt', { name: actor.name })}</p>`;
    const options = [game.i18n.localize('PF1-Improved-Conditions.Sockets.ContinueFighting'), game.i18n.localize('PF1-Improved-Conditions.Sockets.FallUnconscious')];
    const choice = await new Promise(resolve => {
        new Dialog({
            title: game.i18n.localize('PF1-Improved-Conditions.Sockets.HardToKillChoice'),
            content,
            buttons: {
                fight: {
                    label: options[0],
                    callback: () => resolve("fight")
                },
                unconscious: {
                    label: options[1],
                    callback: () => resolve("unconscious")
                }
            },
            default: "fight"
        }).render(true);
    });

    return choice;
}

let updatingToken = false;

Hooks.on('preUpdateToken', (tokenDocument, updateData, options, userId) => {
    if (updatingToken) return true;

    const restrictSetting = game.settings.get(MODULE.ID, 'restrictMovement');
    const limit = tokenDocument.getFlag(MODULE.ID, 'immobilized');
    if (limit !== undefined || hasImmobileCondition(tokenDocument)) {
        const currentX = tokenDocument.x;
        const currentY = tokenDocument.y;
        const newX = updateData.x !== undefined ? updateData.x : currentX;
        const newY = updateData.y !== undefined ? updateData.y : currentY;

        const deltaX = Math.abs(newX - currentX);
        const deltaY = Math.abs(newY - currentY);
        const gridSize = canvas.grid.size;
        const maxMove = gridSize * limit;

        if (deltaX > maxMove || deltaY > maxMove) {
            if (restrictSetting === "all" || (restrictSetting === "players" && !game.user.isGM)) {
                if (game.user.id === userId) {
                    const limitFeet = limit * 5;
                    socket.executeAsUser("sendNotification", userId, "warn", game.i18n.localize('PF1-Improved-Conditions.Sockets.MaxMoveWarning', { limitFeet: limitFeet }));
                }
                return false;
            }
        }
    }

    if (game.settings.get(MODULE.ID, 'blindMovementCheck')) {
        const token = canvas.tokens.get(tokenDocument.id);
        if (!token) return;
    
        const hasBlindCondition = token.actor.statuses?.some(status => status === "blind") ?? false;
    
        if (hasBlindCondition && (updateData.x !== undefined || updateData.y !== undefined)) {
            new Dialog({
                title: game.i18n.localize('PF1-Improved-Conditions.Sockets.BlindMovementCheckTitle'),
                content: `<p>${game.i18n.format('PF1-Improved-Conditions.Sockets.BlindMovementCheckPrompt', { name: token.name })}</p>`,
                buttons: {
                    roll: {
                        label: game.i18n.localize('PF1-Improved-Conditions.Sockets.RollAcrobatics'),
                        callback: async () => {
                            const roll = await token.actor.rollSkill("acr");
                            if (roll.rolls[0].total >= 10) {
                                updatingToken = true;
                                await token.document.update(updateData);
                                updatingToken = false;
                            } else {
                                token.actor.setCondition("prone", true);
                                return false
                            }
                        }
                    },
                    cancel: {
                        label: game.i18n.localize('PF1-Improved-Conditions.Common.Cancel'),
                        callback: () => {}
                    }
                },
                default: "roll"
            }).render(true);
            return false;
        };
    };

    return true;
});

function sendNotification(type, message) {
    ui.notifications[type](message);
}

function sendNotificationToOwners(token, type, message) {
    if (token.actor.hasPlayerOwner) {
        const owners = game.users.filter(user => user.id == token.actor.activeOwner.id);
        for (let user of owners) {
            if (token.actor.isOwner) {
                socket.executeAsUser("sendNotification", user.id, type, message);
            }
        }
    } else {
        if (game.user.isGM) {
            socket.executeAsUser("sendNotification", game.user.id, type, message);
        }
    }
}

Hooks.on('pf1ToggleActorCondition', async (actor, condition, enabled) => {
    if (immobileConditionIds.has(condition)) {
        const tokens = actor.getActiveTokens();
        for (const token of tokens) {
            await socket.executeAsGM("applyImmobilize", token.id, enabled ? 0 : null);
        }
    }
});

/**
 * Socket function to handle removing the flat-footed condition when it's a player's turn
 * This will be executed as GM to ensure permission to modify any token
 * @param {String} tokenId - The ID of the token to check for flat-footed removal
 * @param {Number} round - Current combat round
 * @param {Number} turn - Current combat turn
 */
async function handleFlatFootedRemoval(tokenId, round, turn) {
  const token = canvas.tokens.get(tokenId);
  if (!token || !token.actor) return;
  
  const actor = token.actor;
  
  if (!actor.statuses.has("flatFooted")) return;
  
  const combat = game.combat;
  if (!combat) return;
  
  const ffTracker = combat.getFlag(MODULE.ID, "flatFootedTracker") || {};
  const trackerData = ffTracker[tokenId];
  
  if (trackerData) {
    const targetRemovalRound = trackerData.targetRemovalRound || 1;
    
    if (round >= targetRemovalRound) {
      try {
        const isBeingProcessed = combat.getFlag(MODULE.ID, "processingFlatFooted") || {};
        
        if (isBeingProcessed[tokenId]) return;
        
        isBeingProcessed[tokenId] = true;
        await combat.setFlag(MODULE.ID, "processingFlatFooted", isBeingProcessed);
        
        if (actor.statuses.has("flatFooted")) {
          await actor.setCondition("flatFooted", false);
        }
        
        trackerData.removalInfo = {
          removedOnRound: round,
          removedOnTurn: turn
        };
        trackerData.wasFlatFooted = false;
        
        ffTracker[tokenId] = trackerData;
        await combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
        
        isBeingProcessed[tokenId] = false;
        await combat.setFlag(MODULE.ID, "processingFlatFooted", isBeingProcessed);
      } catch (error) {
        console.error("Error in handleFlatFootedRemoval:", error);
        const isBeingProcessed = combat.getFlag(MODULE.ID, "processingFlatFooted") || {};
        isBeingProcessed[tokenId] = false;
        await combat.setFlag(MODULE.ID, "processingFlatFooted", isBeingProcessed);
      }
    }
  }
}

/**
 * Socket handler to apply buffs as GM on behalf of a player
 * @param {Object} buffData - {name, id, pack}
 * @param {Array} targetIds - Array of token IDs
 * @param {Object} duration - Duration object
 */
async function applyBuffToTargetsSocket(buffData, targetIds, duration) {
    const pack = game.packs.get(buffData.pack);
    if (!pack) return;
    const buffDoc = await pack.getDocument(buffData.id);
    if (!buffDoc) return;
    const targets = targetIds.map(id => canvas.tokens.get(id)).filter(Boolean);
    await applyBuffToTargets({ ...buffData, document: buffDoc }, targets, duration);
}