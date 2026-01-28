/**
 * Combat Module for PF1 Improved Conditions
 * Handles combat-related condition implementations
 */

import { MODULE } from './config.js';
import { handleConfusionCondition, handleConfusionOnCombatStart } from './confusion.js';

// TODO: Add functionality to allow conditions to be applied and removed at specific token's turns
// This would allow for timed conditions that start or end on particular combatant's turns
// rather than just the current token's turn

// TODO: Check condition immunities before applying conditions to tokens
// Implement a system to verify if a token/actor has immunity to a specific condition
// before attempting to apply it (e.g., undead immunity to mind-affecting conditions)

/**
 * Handle flat-footed condition at the start of combat
 * @param {Object} combat - The combat object
 * @param {Object} combatant - The current combatant
 * @param {Object} token - The token
 * @param {Number} turnIndex - The turn index
 * @param {Number} highestInitiative - The highest initiative score
 * @param {Boolean} isSurprise - Whether this is a surprise round
 */
export async function handleFlatFootedOnCombatStart(combat, combatant, token, turnIndex, highestInitiative, isSurprise) {
  if (!game.settings.get(MODULE.ID, 'autoApplyFF')) return;
  
  const actor = token.actor;
  if (!actor) return;
  
  if (actor.statuses.has("flatFooted")) return;
  
  const hasUncanny = actor.items.some(i => 
    i.type === "feat" && 
    i.name.toLowerCase().includes("uncanny dodge")
  );
  
  if (hasUncanny) return;
  
  const processedActors = combat.getFlag(MODULE.ID, "flatFootedProcessed") || [];
  if (processedActors.includes(actor.id)) return;
  
  const exemptFromSurprise = actor.getFlag(MODULE.ID, 'exemptFromSurprise') || false;
  const isFlatFootedUntilTurn = (isSurprise && !exemptFromSurprise) || combatant.initiative < highestInitiative;
  
  if (isFlatFootedUntilTurn) {
    await actor.setCondition("flatFooted", true);
    
    const flatFootedInfo = {
      tokenId: token.id,
      wasFlatFooted: true,
      appliedOnRound: 1,
      appliedOnTurn: turnIndex,
      targetRemovalRound: isSurprise && !exemptFromSurprise ? 2 : 1,
      removalInfo: null
    };
    
    const ffTracker = combat.getFlag(MODULE.ID, "flatFootedTracker") || {};
    ffTracker[token.id] = flatFootedInfo;
    await combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
    
    processedActors.push(actor.id);
    await combat.setFlag(MODULE.ID, "flatFootedProcessed", processedActors);
  }
}

/**
 * Restore the flat-footed tracker flags in combat
 * @param {Object} combat - The combat object
 */
export function restoreFlatFootedTracker(combat) {
  const ffTracker = {};
  for (const combatant of combat.combatants) {
    ffTracker[combatant.id] = false;
  }
  combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
}

/**
 * Update the flat-footed tracker in combat
 * @param {Object} combat - The combat object
 */
export function updateFlatFootedTracker(combat) {
  const currentId = combat.combatant?.id;
  
  if (!currentId) return;
  
  const combatant = combat.combatants.get(currentId);
  const tokenId = combatant?.token?.id;
  
  if (!tokenId) return;
  
  const ffTracker = combat.getFlag(MODULE.ID, "flatFootedTracker") || {};
  
  if (ffTracker[tokenId]) {
    ffTracker[tokenId].hasActed = true;
    combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
  }
}

/**
 * Handle a combat turn
 * @param {Object} combat - The combat object
 * @param {Object} combatData - The combat data
 */
export function handleCombatTurn(combat, combatData) {
  const previousTurnData = combat.getFlag(MODULE.ID, "previousTurnData") || {
    round: combat.round,
    turn: combat.turn
  };
  
  const enhancedCombatData = {
    ...combatData,
    previousRound: previousTurnData.round,
    previousTurn: previousTurnData.turn
  };
  
  combat.setFlag(MODULE.ID, "previousTurnData", {
    round: combat.round,
    turn: combat.turn
  });
  
  handleFlatFootedCondition(combat, enhancedCombatData);
  
  if (!(combat.round === 1 && combat.turn === 0)) {
    handleConfusionCondition(combat, combatData);
  }
}

/**
 * Handle the flat-footed condition during combat
 * @param {Object} combat - The combat object
 * @param {Object} combatData - The combat data
 */
export function handleFlatFootedCondition(combat, combatData) {
  if (!game.settings.get(MODULE.ID, 'autoApplyFF')) return;
  
  const currentTokenId = combatData.tokenId;
  const token = canvas.tokens.get(currentTokenId);
  if (!token) return;
  
  const actor = token.actor;
  if (!actor) return;
  
  const currentRound = combat.round;
  const currentTurn = combat.turn;
  const previousTurn = combatData.previousTurn;
  const previousRound = combatData.previousRound;
  
  const ffTracker = combat.getFlag(MODULE.ID, "flatFootedTracker") || {};
  
  const isMovingBackward = 
    (previousRound > currentRound) || 
    (previousRound === currentRound && previousTurn > currentTurn);
  
  if (isMovingBackward) {
    for (const [tokenId, trackerData] of Object.entries(ffTracker)) {
      if (!trackerData || !trackerData.removalInfo) continue;
      
      const { removedOnRound, removedOnTurn } = trackerData.removalInfo;
      
      if (removedOnRound > currentRound || 
          (removedOnRound === currentRound && removedOnTurn > currentTurn)) {
        const targetToken = canvas.tokens.get(tokenId);
        if (targetToken && targetToken.actor) {
          targetToken.actor.setCondition("flatFooted", true);
          
          trackerData.wasFlatFooted = true;
          trackerData.removalInfo = null;
          
          ffTracker[tokenId] = trackerData;
        }
      }
    }
    
    combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
  } else {
    if (actor.statuses.has("flatFooted")) {
      const trackerData = ffTracker[currentTokenId];
      
      if (trackerData) {
        const targetRemovalRound = trackerData.targetRemovalRound || 1;
        
        if (currentRound >= targetRemovalRound) {
          const isBeingProcessed = combat.getFlag(MODULE.ID, "processingFlatFooted") || {};
          
          if (isBeingProcessed[currentTokenId]) return;
          
          isBeingProcessed[currentTokenId] = true;
          combat.setFlag(MODULE.ID, "processingFlatFooted", isBeingProcessed);
          
          actor.setCondition("flatFooted", false);
          
          trackerData.removalInfo = {
            removedOnRound: currentRound,
            removedOnTurn: currentTurn
          };
          trackerData.wasFlatFooted = false;
          
          ffTracker[currentTokenId] = trackerData;
          combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
          
          isBeingProcessed[currentTokenId] = false;
          combat.setFlag(MODULE.ID, "processingFlatFooted", isBeingProcessed);
        }
      }
    }
  }
}

/**
 * Handle the start of a new combat round
 * @param {Object} combat - The combat object
 * @param {Number} round - The round number
 */
export async function handleCombatRound(combat, round) {
  if (round === 0) {
    await resetCombatFlags(combat);
    return;
  }
  
  await combat.unsetFlag(MODULE.ID, "flatFootedProcessed");
  
  const previousRoundData = combat.getFlag(MODULE.ID, "previousRoundData") || { round: 0 };
  const currentRound = round;
  const turnOrder = combat.turns;
  const currentTurn = combat.turn;
  const isSurprise = combat.getFlag(MODULE.ID, 'isSurprise') || false;
  
  // Determine if we're going backwards in rounds
  const isGoingBackwards = previousRoundData.round > currentRound;
  
  // Store current round for next round change
  await combat.setFlag(MODULE.ID, "previousRoundData", { round: currentRound });
  
  // Get the flat-footed tracker
  const ffTracker = combat.getFlag(MODULE.ID, "flatFootedTracker") || {};
  
  if (isGoingBackwards) {
    // We're going back to a previous round - selectively reapply flat-footed
    for (let i = 0; i < turnOrder.length; i++) {
      const combatant = turnOrder[i];
      const tokenId = combatant.token.id;
      const token = canvas.tokens.get(tokenId);
      
      if (!token || !token.actor) continue;
      
      const trackerData = ffTracker[tokenId];
      if (!trackerData) continue;
    
      // Token would be flat-footed if:
      // 1. It had flat-footed in this round
      // 2. Its turn hasn't happened yet in this round OR
      // 3. The round is before the target removal round
      
      const shouldHaveFlatFooted = 
        trackerData.wasFlatFooted &&
        (i >= currentTurn || currentRound < trackerData.targetRemovalRound);
      
      if (shouldHaveFlatFooted && !token.actor.statuses.has("flatFooted")) {
        await token.actor.setCondition("flatFooted", true);
        
        // Reset removal info if it exists
        if (trackerData.removalInfo) {
          trackerData.removalInfo = null;
          ffTracker[tokenId] = trackerData;
        }
      } else if (!shouldHaveFlatFooted && token.actor.statuses.has("flatFooted")) {
        await token.actor.setCondition("flatFooted", false);
      }
    }
    
    // Update the flag
    await combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
  } else if (currentRound === 1) {
    // First round logic - sort by initiative and set up flat-footed
    const sortedTurnOrder = turnOrder.sort((a, b) => b.initiative - a.initiative);
    
    // Get highest initiative for flat-footed comparisons
    const highestInitiative = sortedTurnOrder.length > 0 ? sortedTurnOrder[0].initiative : 0;
    
    // Process each combatant
    for (let i = 0; i < sortedTurnOrder.length; i++) {
      const combatant = sortedTurnOrder[i];
      const token = canvas.tokens.get(combatant.token.id);
      
      if (token && token.actor) {
        // Handle flat-footed
        await handleFlatFootedOnCombatStart(combat, combatant, token, i, highestInitiative, isSurprise);
        
        // Removed: No longer calling handleConfusionOnCombatStart here to avoid duplication
      }
    }
  } else {
    // Normal forward round progression
    // IMPORTANT: For surprise rounds, we DON'T remove flat-footed at the start of round 2
    // Instead, we'll let each token remove it on their own turn
    
    // We only need to handle special cases here, not flat-footed removal
    // The removal happens in handleFlatFootedCondition during each token's turn
    
    // Update the tracker with the new round information
    for (const [tokenId, trackerData] of Object.entries(ffTracker)) {
      if (trackerData && !trackerData.currentRound) {
        trackerData.currentRound = currentRound;
        ffTracker[tokenId] = trackerData;
      }
    }
    
    // Update the tracker
    await combat.setFlag(MODULE.ID, "flatFootedTracker", ffTracker);
    
    // Reset exempt flags for certain conditions
    await resetExemptFlags(combat);
  }
  
  // Initialize flat-footed tracker for this round if needed
  updateFlatFootedTracker(combat);
}

/**
 * Reset exempt flags for all tokens in combat
 * @param {Object} combat - The combat object
 */
export async function resetExemptFlags(combat) {
  for (const combatant of combat.combatants) {
    const token = canvas.tokens.get(combatant.token.id);
    if (token) {
      await token.document.unsetFlag(MODULE.ID, 'exempt-from-confusion-roll');
    }
  }
}

/**
 * Reset all combat flags
 * @param {Object} combat - The combat object
 */
export async function resetCombatFlags(combat) {
  await combat.unsetFlag(MODULE.ID, "flatFootedTracker");
  await combat.unsetFlag(MODULE.ID, "flatFootedProcessed");
  await combat.unsetFlag(MODULE.ID, "processingFlatFooted");
  await combat.unsetFlag(MODULE.ID, "previousTurnData");
  await combat.unsetFlag(MODULE.ID, "previousRoundData");
  await combat.unsetFlag(MODULE.ID, "isSurprise");
  
  for (const combatant of combat.combatants) {
    const token = canvas.tokens.get(combatant.token.id);
    if (token && token.actor && token.actor.statuses.has("flatFooted")) {
      await token.actor.setCondition("flatFooted", false);
    }
  }
  
  await resetExemptFlags(combat);
} 