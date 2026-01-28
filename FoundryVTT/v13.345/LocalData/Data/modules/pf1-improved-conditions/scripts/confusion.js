/**
 * Confusion Module for PF1 Improved Conditions
 * Handles automation for confused condition behaviors
 */

import { MODULE } from './config.js';

/**
 * Gets the behavior data for a confused actor based on the roll result
 * @param {Object} actor - The actor object
 * @param {Number} rollResult - The d100 roll result
 * @returns {Object} The behavior data
 */
export function getBehaviorData(actor, rollResult) {
  if (rollResult <= 25) {
    return { id: 1, description: game.i18n.localize("PF1-Improved-Conditions.Confused.Effects.1") };
  } else if (rollResult <= 50) {
    return { id: 2, description: game.i18n.localize("PF1-Improved-Conditions.Confused.Effects.2") };
  } else if (rollResult <= 75) {
    const meleeItems = actor.items.filter(i => 
      i.type === "attack" && 
      i.system.attackType === "weapon" && 
      i.system.actionType === "mwak" &&
      !i.system.broken
    );
    
    if (meleeItems.length > 0) {
      const selectedItem = meleeItems[Math.floor(Math.random() * meleeItems.length)];
      
      const strMod = actor.system.abilities.str.mod;
      const baseDamage = selectedItem.system.damage.parts.length ? selectedItem.system.damage.parts[0][0] : "1d3";
      const damageTypes = selectedItem.system.damage.parts.length && selectedItem.system.damage.parts[0][1] ? 
                          [selectedItem.system.damage.parts[0][1]] : ["bludgeoning"];
      
      return { 
        id: 3, 
        description: game.i18n.localize("PF1-Improved-Conditions.Confused.Effects.3a"),
        itemName: selectedItem.name,
        damageFormula: `${baseDamage} + ${strMod}`,
        damageTypes: damageTypes,
        itemUsed: selectedItem
      };
    } else {
      return { 
        id: 3, 
        description: game.i18n.localize("PF1-Improved-Conditions.Confused.Effects.3b"),
        damageFormula: "1d3",
        damageTypes: ["bludgeoning"]
      };
    }
  } else {
    return { id: 4, description: game.i18n.localize("PF1-Improved-Conditions.Confused.Effects.4") };
  }
}

/**
 * Process the confused condition for a token during combat
 * @param {Object} combat - The combat object
 * @param {Object} combatData - The combat data
 */
export async function handleConfusionCondition(combat, combatData) {
  if (!game.settings.get(MODULE.ID, 'handleConfused')) return;

  const token = canvas.tokens.get(combatData.tokenId);
  if (!token) return;

  const actor = token.actor;
  if (!actor) return;

  const isConfused = actor.statuses.has("confused");
  if (!isConfused) return;

  const roll = new Roll("1d100");
  await roll.evaluate();
  const result = roll.total;

  const behavior = getBehaviorData(actor, result);

  const isHiddenOrInvisible = token.document.hidden || actor.statuses.has("invisible");
  const whisperTargets = getWhisperTargets(actor, isHiddenOrInvisible);

  if (behavior.id === 3) {
    const damageRoll = new pf1.dice.DamageRoll(behavior.damageFormula, {}, {
      damageType: behavior.damageTypes,
      type: "normal"
    });
    
    await damageRoll.evaluate();
    
    createConfusionEffectMessage({
      token,
      behavior,
      damageRoll,
      damageTypes: behavior.damageTypes,
      itemUsed: behavior.itemUsed,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  } else {
    createConfusionEffectMessage({
      token,
      behavior,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  }
}

/**
 * Determine which users to whisper a message to (for hidden/invisible tokens)
 * @param {Object} actor - The actor
 * @param {Boolean} isHiddenOrInvisible - Whether the token is hidden or invisible
 * @returns {Array} Array of user IDs to whisper to
 */
function getWhisperTargets(actor, isHiddenOrInvisible) {
  if (!isHiddenOrInvisible) return [];
  
  const whisperTargets = [];
  
  const gmUsers = game.users.filter(u => u.isGM);
  whisperTargets.push(...gmUsers.map(u => u.id));
  
  if (actor.hasPlayerOwner) {
    const ownerUsers = game.users.filter(u => actor.testUserPermission(u, "OWNER") && !u.isGM);
    whisperTargets.push(...ownerUsers.map(u => u.id));
  }
  
  return [...new Set(whisperTargets)];
}

/**
 * Create a chat message for the confusion effect
 * @param {Object} params - Parameters for creating the message
 */
export function createConfusionEffectMessage({
  token,
  behavior,
  damageRoll = null,
  damageTypes = null,
  itemUsed = null,
  speakerAlias = "Confusion Effect",
  whisper = [],
  isPrivate = false,
}) {
  if (!token) return;

  let tokenContent = `
    <div class="IC-token" data-uuid="${token.document.uuid}" style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: center;">
        <img src="${token.document.texture.src}" title="${token.name}" width="72" height="72" style="margin-bottom: 8px; cursor: pointer;"/>
      </div>
      <span style="text-align: center; display: block;">${token.name} ${behavior.description}</span>
    </div>
  `;

  if (damageRoll) {
    const description = behavior.description
      .replace("{itemName}", behavior.itemName || "fists")
      .replace("{damage}", `<span class="confusion-damage">${damageRoll.total} ${damageTypes.join(", ")}</span>`);

    tokenContent = `
      <div class="IC-token" data-uuid="${token.document.uuid}" style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: center;">
          <img src="${token.document.texture.src}" title="${token.name}" width="72" height="72" style="margin-bottom: 8px; cursor: pointer;"/>
        </div>
        <span style="text-align: center; display: block;">${token.name} ${description}</span>
      </div>
    `;
  }

  const messageData = {
    user: game.user.id,
    speaker: {
      scene: canvas.scene.id,
      token: token.id,
      alias: speakerAlias
    },
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    content: tokenContent,
    whisper: whisper.length > 0 ? whisper : null
  };

  if (damageRoll) {
    const fullDamage = damageRoll.total;
    const halfDamage = Math.floor(damageRoll.total / 2);
    
    messageData.rolls = [damageRoll];
    messageData.flavor = `Damage: ${damageTypes.join(", ")}`;
    messageData.flags = {
      "better-damage": {
        damageRoll: true,
        damageTotal: damageRoll.total,
        damageTypes: damageTypes
      }
    };
    
    damageRoll.render().then(rollContent => {
      const buttonsHtml = `
        <div class="card-buttons flexrow">
          <button type="button" data-action="applyDamage" data-value="${fullDamage}" data-damage-types="${damageTypes.join(',')}">Apply</button>
          <button type="button" data-action="applyDamage" data-value="${halfDamage}" data-damage-types="${damageTypes.join(',')}">Apply Half</button>
        </div>
      `;
      
      messageData.content += rollContent + buttonsHtml;
      ChatMessage.create(messageData);
    });
  } else {
    ChatMessage.create(messageData);
  }
}

/**
 * Handle confusion when combat starts - only for the first token in the turn order
 * @param {Object} combatant - The combatant
 * @param {Object} token - The token
 * @param {Array} turnOrder - The combat turn order
 */
export async function handleConfusionOnCombatStart(combatant, token, turnOrder) {
  if (!game.settings.get(MODULE.ID, 'handleConfused')) return;
  
  const firstTurn = turnOrder[0];
  if (!firstTurn || combatant.id !== firstTurn.id) return;
  
  const actor = token.actor;
  if (!actor) return;
  
  const isConfused = actor.statuses.has("confused");
  if (!isConfused) return;
  
  const roll = new Roll("1d100");
  await roll.evaluate();
  const result = roll.total;
  
  const behavior = getBehaviorData(actor, result);
  
  const isHiddenOrInvisible = token.document.hidden || actor.statuses.has("invisible");
  const whisperTargets = getWhisperTargets(actor, isHiddenOrInvisible);
  
  if (behavior.id === 3) {
    const damageRoll = new pf1.dice.DamageRoll(behavior.damageFormula, {}, {
      damageType: behavior.damageTypes,
      type: "normal"
    });
    
    await damageRoll.evaluate();
    
    createConfusionEffectMessage({
      token,
      behavior,
      damageRoll,
      damageTypes: behavior.damageTypes,
      itemUsed: behavior.itemUsed,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  } else {
    createConfusionEffectMessage({
      token,
      behavior,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  }
}

/**
 * Handle confusion for the first token in combat
 * @param {Object} token - The token
 */
export async function handleConfusionForFirstToken(token) {
  if (!game.settings.get(MODULE.ID, 'handleConfused')) return;
  
  const actor = token.actor;
  if (!actor) return;
  
  const isConfused = actor.statuses.has("confused");
  if (!isConfused) return;
  
  const roll = new Roll("1d100");
  await roll.evaluate();
  const result = roll.total;
  
  const behavior = getBehaviorData(actor, result);
  
  const isHiddenOrInvisible = token.document.hidden || actor.statuses.has("invisible");
  const whisperTargets = getWhisperTargets(actor, isHiddenOrInvisible);
  
  if (behavior.id === 3) {
    const damageRoll = new pf1.dice.DamageRoll(behavior.damageFormula, {}, {
      damageType: behavior.damageTypes,
      type: "normal"
    });
    
    await damageRoll.evaluate();
    
    createConfusionEffectMessage({
      token,
      behavior,
      damageRoll,
      damageTypes: behavior.damageTypes,
      itemUsed: behavior.itemUsed,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  } else {
    createConfusionEffectMessage({
      token,
      behavior,
      whisper: whisperTargets,
      isPrivate: isHiddenOrInvisible
    });
  }
}

/**
 * Handle private messages for hidden/invisible tokens
 * @param {Object} actor - The actor
 * @param {Object} token - The token
 * @param {String} tokenContent - The token content HTML
 * @param {Object} privateMessages - The private messages object
 */
export function handlePrivateMessage(actor, token, tokenContent, privateMessages) {
  const activeOwner = actor.activeOwner?.id;
  const gmId = game.users.find(user => user.isGM).id;
  const whisperIds = new Set([activeOwner, gmId]);
  const whisperKey = Array.from(whisperIds).sort().join(',');

  if (!privateMessages[whisperKey]) {
    privateMessages[whisperKey] = {
      content: `<div class="confusion-message-content">`,
      whisper: Array.from(whisperIds),
      tokenCount: 0
    };
  }
  privateMessages[whisperKey].content += tokenContent;
  privateMessages[whisperKey].tokenCount += 1;
}

/**
 * Send private messages for hidden/invisible tokens
 * @param {Object} privateMessages - The private messages object
 */
export function sendPrivateMessages(privateMessages) {
  Object.values(privateMessages).forEach(message => {
    if (message.tokenCount > 1) {
      message.content = message.content.replace(/<\/div><div class="IC-token"/g, '</div><div style="border-top: 2px solid black; margin: 8px 0;"></div><div class="IC-token"');
    }
    message.content += `</div>`;
    createConfusionEffectMessage({
      content: message.content,
      token: null,
      damageRoll: null,
      behavior: null,
      damageTypes: null,
      itemUsed: null,
      speakerAlias: "Confusion Effect",
      whisper: message.whisper,
      isPrivate: true
    });
  });
} 