/*
This module enhances the Pathfinder 1e system in Foundry VTT by improving condition handling.
It adds new conditions, automates condition effects, and enhances the token UI.
*/

import { MODULE } from './config.js';
import { socket, initializeConditionIds } from './sockets.js';
import { registerConditions, reorderTokenHUDConditions, setupConditionsI18n } from './conditions.js';
import { handleCombatTurn, handleCombatRound, updateFlatFootedTracker, handleFlatFootedOnCombatStart } from './combat.js';
import { handleConfusionForFirstToken, handleConfusionOnCombatStart, getBehaviorData, createConfusionEffectMessage } from './confusion.js';
import { handleBuffAutomation } from './buffs.js';

Hooks.on("init", (app, html, data) => {
  initializeConditionIds();
});

Hooks.on("pf1RegisterConditions", (registry) => {
  registerConditions(registry);
});

Hooks.on('little-helper.i18n', (t) => {
  setupConditionsI18n(t);
});

Hooks.on('renderTokenHUD', (app, html, data) => {
  reorderTokenHUDConditions(html, data);
});

Hooks.on('combatStart', async (combat) => {
  restoreFlatFootedTracker(combat);

  const turnOrder = combat.turns;
  const isSurprise = combat.getFlag(MODULE.ID, 'isSurprise') || false;
  const highestInitiative = Math.max(...combat.combatants.map(c => c.initiative));

  for (const combatant of combat.combatants) {
    const token = canvas.tokens.get(combatant.tokenId);
    if (!token) continue;

    const turnIndex = turnOrder.findIndex(turn => turn.tokenId === combatant.tokenId);

    if (turnIndex !== -1) {
      if (game.settings.get(MODULE.ID, 'autoApplyFF')) {
        await handleFlatFootedOnCombatStart(combat, combatant, token, turnIndex, highestInitiative, isSurprise);
      }

      if (game.settings.get(MODULE.ID, 'handleConfused')) {
        await handleConfusionOnCombatStart(combatant, token, turnOrder);
      }
    }
  }

  updateFlatFootedTracker(combat);
});

Hooks.on('updateCombat', (combat, update, options, userId) => {
  if (((combat.previous?.round === combat.current?.round) || (combat.previous?.round === 0)) && ((combat.previous?.turn === combat.current?.turn) || (combat.previous?.turn === null)) && (combat.previous?.tokenId === combat.turns[0]?.tokenId || combat.previous?.tokenId === null)) return;
  if (update.round !== undefined && game.user.isGM && userId === game.user.id) {
    handleCombatRound(combat, update.round);
  }
  
  if ((update.turn !== undefined && update.turn !== null && combat.combatant) || 
      (update.round !== undefined && combat.turns.length === 1 && combat.combatant)) {
    const combatData = {
      combatantId: combat.combatant.id,
      tokenId: combat.combatant.token.id,
      turn: combat.turn,
      round: combat.round
    };
    
    if (game.user.isGM) {
    handleCombatTurn(combat, combatData);
    updateFlatFootedTracker(combat);
    } else if (!game.user.isGM) {
      checkNextTokenFlatFooted(combat, combatData);
    }
  }
});

/**
 * Check if the token whose turn it is has the flat-footed condition
 * and request the GM to handle it if needed
 * @param {Object} combat - The combat object
 * @param {Object} combatData - The combat data
 */
function checkNextTokenFlatFooted(combat, combatData) {
  const token = canvas.tokens.get(combatData.tokenId);
  if (!token || !token.actor) return;
  
  if (token.actor.statuses.has("flatFooted")) {
    socket.executeAsGM("handleFlatFootedRemoval", combatData.tokenId, combatData.round, combatData.turn);
  }
}

Hooks.on('renderCombatTracker', (app, html, data) => {
  if (!game.settings.get(MODULE.ID, 'autoApplyFF')) return;
  let combatControls;
  if (typeof html.find === "function") {
    combatControls = html.find('#combat-controls');
  } else {
    combatControls = html.querySelector('.combat-controls');
  }

  const isSurprise = data.combat?.getFlag(MODULE.ID, 'isSurprise') || false;
  const isRoundOne = data.combat?.current?.round === 1;
  
  if (isSurprise && isRoundOne) {
    let roundDisplay;
    const surpriseRoundText = game.i18n.localize('PF1-Improved-Conditions.Main.SurpriseRound');
    if (typeof html.find === "function") {
      roundDisplay = html.find('.encounter-title');
      if (roundDisplay.length) {
        roundDisplay.html(`<span style="color: red; font-weight: bold;">${surpriseRoundText}</span>`);
      }
    } else {
      roundDisplay = html.querySelector('.encounter-title');
      if (roundDisplay) {
        roundDisplay.innerHTML = `<span style="color: red; font-weight: bold;">${surpriseRoundText}</span>`;
      }
    }
  }

  if (combatControls && data.combat?.current?.round === 0 && game.user.isGM) {
    if (typeof combatControls.css === 'function') {
      combatControls.css('flex-direction', 'column');
    } else {
      combatControls.style.flexDirection = 'column';
    }

    const surpriseRoundLabel = game.i18n.localize('PF1-Improved-Conditions.Main.SurpriseRound');
    const surpriseRoundButton = $(
      `<a class="combat-control" aria-label="${surpriseRoundLabel}" role="button">
        ${surpriseRoundLabel}
      </a>`
    );

    let beginCombatButton;
    if (typeof combatControls.find === 'function') {
      beginCombatButton = combatControls.find('a[data-control="startCombat"]');
      if (beginCombatButton.length) {
        beginCombatButton.before(surpriseRoundButton);
      } else {
        combatControls.prepend(surpriseRoundButton);
      }
    } else {
      beginCombatButton = combatControls.querySelector('button[data-action="startCombat"]');
      if (beginCombatButton) {
        beginCombatButton.parentNode.insertBefore(surpriseRoundButton[0], beginCombatButton);
      } else {
        combatControls.insertBefore(surpriseRoundButton[0], combatControls.firstChild);
      }
    }

    const resetExemptFlags = async (combat) => {
      const selectedTokens = canvas.tokens.controlled.map(token => token.id);

      const flagPromises = combat.turns.map(async turn => {
        const tokenId = turn.tokenId;
        const token = canvas.tokens.get(tokenId);

        if (token) {
          const isSelected = selectedTokens.includes(tokenId);
          return token.actor.setFlag(MODULE.ID, 'exemptFromSurprise', isSelected);
        }
      });

      await Promise.all(flagPromises);
    };

    surpriseRoundButton.click(async () => {
      const isSurprise = data.combat?.getFlag(MODULE.ID, 'isSurprise') || false;

      await resetExemptFlags(data.combat);

      if (!isSurprise) {
        await data.combat?.setFlag(MODULE.ID, 'isSurprise', true);
      }
      data.combat?.startCombat();
    });

    if (typeof combatControls.on === 'function') {
      combatControls.on('click', 'a[data-control="startCombat"]', async () => {
        const isSurprise = data.combat?.getFlag(MODULE.ID, 'isSurprise') || false;
        await resetExemptFlags(data.combat);
        if (isSurprise) {
          await data.combat?.setFlag(MODULE.ID, 'isSurprise', false);
        }
      });
    } else {
      const startCombatButton = combatControls.querySelector('button[data-action="startCombat"]');
      if (startCombatButton) {
        startCombatButton.addEventListener('click', async () => {
          const isSurprise = data.combat?.getFlag(MODULE.ID, 'isSurprise') || false;
          await resetExemptFlags(data.combat);
          if (isSurprise) {
            await data.combat?.setFlag(MODULE.ID, 'isSurprise', false);
          }
        });
      }
    }
  }
});

Hooks.on("renderChatMessage", (message, html, data) => {
  if (!game.settings.get(MODULE.ID, 'handleConfused')) return;

  let tokenImgs;
  if (typeof html.find === 'function') {
    tokenImgs = html.find('.IC-token img');
    tokenImgs.click(async ev => {
      const tokenUuid = $(ev.currentTarget).closest('.IC-token').data('uuid');
      const tokenDocument = await fromUuid(tokenUuid);
      const token = canvas.tokens.get(tokenDocument.id);
      if (token) {
        token.control({releaseOthers: true});
        canvas.animatePan({x: token.center?.x, y: token.center?.y, duration: 1000});
      }
    });
    tokenImgs.hover(
      async ev => {
        const tokenUuid = $(ev.currentTarget).closest('.IC-token').data('uuid');
        const tokenDocument = await fromUuid(tokenUuid);
        const token = canvas.tokens.get(tokenDocument.id);
        if (token) token._onHoverIn(ev);
      },
      async ev => {
        const tokenUuid = $(ev.currentTarget).closest('.IC-token').data('uuid');
        const tokenDocument = await fromUuid(tokenUuid);
        const token = canvas.tokens.get(tokenDocument.id);
        if (token) token._onHoverOut(ev);
      }
    );
  } else {
    tokenImgs = html.querySelectorAll('.IC-token img');
    tokenImgs.forEach(img => {
      img.addEventListener('click', async ev => {
        const icToken = ev.currentTarget.closest('.IC-token');
        const tokenUuid = icToken?.dataset.uuid;
        const tokenDocument = await fromUuid(tokenUuid);
        const token = canvas.tokens.get(tokenDocument.id);
        if (token) {
          token.control({releaseOthers: true});
          canvas.animatePan({x: token.center?.x, y: token.center?.y, duration: 1000});
        }
      });
      img.addEventListener('mouseenter', async ev => {
        const icToken = ev.currentTarget.closest('.IC-token');
        const tokenUuid = icToken?.dataset.uuid;
        const tokenDocument = await fromUuid(tokenUuid);
        const token = canvas.tokens.get(tokenDocument.id);
        if (token) token._onHoverIn(ev);
      });
      img.addEventListener('mouseleave', async ev => {
        const icToken = ev.currentTarget.closest('.IC-token');
        const tokenUuid = icToken?.dataset.uuid;
        const tokenDocument = await fromUuid(tokenUuid);
        const token = canvas.tokens.get(tokenDocument.id);
        if (token) token._onHoverOut(ev);
      });
    });
  }
});

Hooks.on('updateActor', async (actorDocument, change, options, userId) => {
  if (!actorDocument.isOwner) return;

  let ownerUsers = game.users.filter(u => actorDocument.testUserPermission(u, 'OWNER'));

  let nonGMOwners = ownerUsers.filter(u => !u.isGM);

  let preferredUserId;
  if (nonGMOwners.length > 0) {
    preferredUserId = nonGMOwners[0].id;
  } else {
    preferredUserId = ownerUsers[0].id;
  }

  if (game.user.id !== preferredUserId && !game.user.isGM) return;
  
  const disableSetting = game.settings.get(MODULE.ID, 'disableAtZeroHP');
  const actorType = actorDocument.type;

  if ((disableSetting === 'everyone' || 
     (disableSetting === 'player' && actorType === 'character') || 
     (disableSetting === 'npc' && actorType === 'npc')) && 
    hasHpUpdate(change)) {
    const newHp = getNewHp(actorDocument, change);
    if (newHp === 0) {
        await actorDocument.setCondition("disabled", true);
    }
  }

  if (game.settings.get(MODULE.ID, 'autoApplyED') && hasNegativeLevelUpdate(change)) {
    const newNegativeLevels = getNewNegativeLevels(actorDocument, change);
    if (newNegativeLevels > 0) {
      await actorDocument.setCondition("energyDrained", true);
    } else {
      await actorDocument.setCondition("energyDrained", false);
    }
  }

  if (hasHpUpdate(change)) {
    const newHp = getNewHp(actorDocument, change);
    if (newHp >= 0 && actorDocument.statuses.has("unconscious")) {
      await actorDocument.setCondition("unconscious", false);
    }
  }

  const unconsciousSetting = game.settings.get(MODULE.ID, 'unconsciousAtNegativeHP');
  if (unconsciousSetting !== 'none' && hasHpUpdate(change)) {
    const newHp = getNewHp(actorDocument, change);
    if (newHp < 0) {
      const isNPC = actorDocument.type === 'npc';
      const shouldApply = 
        unconsciousSetting === 'everyone' || 
        (unconsciousSetting === 'npc' && isNPC) ||
        (unconsciousSetting === 'player' && !isNPC);
      
      if (shouldApply) {
        const hardToKill = ["diehard", "ferocity (orc)", "orc ferocity", "ferocity"];
        const hasHTK = actorDocument.items.some(i => 
          i.type === 'feat' && 
          hardToKill.some(htk => htk === i.name.toLowerCase())
        );
        
        if (!hasHTK) {
          await actorDocument.setCondition('unconscious', true);
          await actorDocument.setCondition('prone', true);
        }
      }
    }
  }

  const deadConditionSetting = game.settings.get(MODULE.ID, 'applyDeadCondition');

  if (deadConditionSetting !== 'none' && hasHpUpdate(change)) {
    const newHp = getNewHp(actorDocument, change);
    const conScore = actorDocument.system.abilities.con.total;
    const isNPC = actorDocument.type === 'npc';
    
    let shouldApply = false;
    
    if (deadConditionSetting === 'everyone') {
      shouldApply = newHp <= -conScore;
    } else if (deadConditionSetting === 'npc' && isNPC) {
      shouldApply = newHp <= -conScore;
    } else if (deadConditionSetting === 'player' && !isNPC) {
      shouldApply = newHp <= -conScore;
    } else if (deadConditionSetting === 'player-negative-con-npc-negative-hp') {
      if (isNPC) {
        shouldApply = newHp < 0;
      } else {
        shouldApply = newHp <= -conScore;
      }
    }
    
    if (shouldApply) {
      await actorDocument.setCondition('dead', {overlay: true});
      await actorDocument.setCondition('prone', true);
    }
  }
});

Hooks.on("pf1PreActionUse", async (action) => {
  const actionType = action.action.activation?.type;
  const held = action.action.held || action.item.system.held;
  const token = action.token;
  const actor = token?.actor;

  const grappledHandling = game.settings.get(MODULE.ID, 'grappledHandling');
  if (grappledHandling && actor?.statuses.has("grappled") && held === "2h") {
    if (grappledHandling === "disabled") return;
    if (grappledHandling === "strict") {
      action.shared.reject = true;
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.GrappledTwoHands', { name: token.name }));
    } else if (grappledHandling === "lenient") {
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.GrappledLenient', { name: token.name }));
    }
  }

  const nauseatedHandling = game.settings.get(MODULE.ID, 'nauseatedHandling');
  if (nauseatedHandling && actor?.statuses.has("nauseated")) {
    if (nauseatedHandling === "disabled") return;
    if (nauseatedHandling === "strict" && actionType !== "move") {
      action.shared.reject = true;
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.NauseatedStrict', { name: token.name }));
      return;
    } else if (nauseatedHandling === "lenient") {
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.NauseatedLenient', { name: token.name }));
    }
  }

  const squeezingHandling = game.settings.get(MODULE.ID, 'squeezingHandling');
  if (squeezingHandling && actor?.statuses.has("squeezing")) {
    if (squeezingHandling === "disabled") return;
    if (squeezingHandling === "strict" && (actionType === "attack" || actionType === "aoo")) {
      action.shared.reject = true;
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.SqueezingStrict', { name: token.name }));
    } else if (squeezingHandling === "lenient") {
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.SqueezingLenient', { name: token.name }));
    }
  }
});

Hooks.on('pf1PreActorRollConcentration', (actor, rollContext) => {
  const nauseatedHandling = game.settings.get(MODULE.ID, 'nauseatedHandling');
  if (nauseatedHandling && rollContext.token?.actor?.statuses?.has("nauseated")) {
    if (nauseatedHandling === "disabled") return true;
    const token = rollContext.token;
    if (nauseatedHandling === "strict") {
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.NauseatedStrict', { name: token.name }));
      return false;
    } else if (nauseatedHandling === "lenient") {
      ui.notifications.info(game.i18n.format('PF1-Improved-Conditions.Main.NauseatedLenient', { name: token.name }));
    }
  }
});

Hooks.on("pf1PostActionUse", async (action) => {
  if (game.settings.get(MODULE.ID, 'disableAtZeroHP') ||
  game.settings.get(MODULE.ID, 'handleEntangledGrappled')) {
    const itemSource = action.item;
    const token = action.token;
    const actor = token?.actor;

    if (game.settings.get(MODULE.ID, 'disableAtZeroHP')) {
      const activationTypes = ["nonaction", "passive", "free", "swift", "immediate", "move", "standard", "full", "attack", "aoo", "round", "minute", "hour", "special"]
      const strenuousTypes = ["standard", "full", "attack", "aoo", "round", "minute", "hour"]
      if (strenuousTypes.includes(action.action?.activation?.type)) {
        if (actor && actor?.statuses?.has("disabled")) {
          let hp = actor.system?.attributes?.hp;
          const conScore = actor.system?.abilities?.con?.total;
          const hardToKill = ["diehard", "ferocity (orc)", "orc ferocity", "ferocity"]
          const ability = actor.items.find(item => hardToKill.some(htk => htk === item.name.toLowerCase()));
          let newHp = hp.value - 1;
          
          if(hp.max > 0 && hp.value == 0 && !actor.statuses.has("unconscious")) {
            handleHTK(actor, ability, newHp, conScore);
          } else if(hp.max > 0 && hp.value < 0 && !actor.statuses.has("unconscious") && hp.value >= (conScore * -1)) {
            handleHTK(actor, ability, newHp, conScore);
          }
        }
      }
    }

    if (game.settings.get(MODULE.ID, 'handleEntangledGrappled')) {
      if (itemSource.type == "spell") {
  
          const handleConcentrationCheck = async (spellbook, skipDialog) => {
            if (!actor) return;
              if (actor.statuses.has("entangled")) {
                  await actor.rollConcentration(spellbook, { skipDialog });
              }
  
              if (actor.statuses.has("grappled") && itemSource.system.components?.somatic) {
                  await actor.rollConcentration(spellbook, { skipDialog });
              }
          };
  
          const skipDialog = game.user.isGM;
  
          await handleConcentrationCheck(itemSource.system.spellbook, skipDialog);
      }
    }
  }
});

function hasHpUpdate(updateData) {
  return updateData.system && 
         updateData.system.attributes && 
         updateData.system.attributes.hp && 
         (updateData.system.attributes.hp.value !== undefined || updateData.system.attributes.hp.offset !== undefined);
}

function getNewHp(actor, updateData) {
  if (updateData.system.attributes.hp.value !== undefined) {
    return updateData.system.attributes.hp.value;
  }
  else if (updateData.system.attributes.hp.offset !== undefined) {
    return actor.system.attributes.hp.value;
  }
  return actor.system.attributes.hp.value;
}

function hasNegativeLevelUpdate(updateData) {
  return updateData.system && 
         updateData.system.attributes && 
         updateData.system.attributes.energyDrain !== undefined;
}

function getNewNegativeLevels(actor, updateData) {
  return updateData.system.attributes.energyDrain;
}

async function handleHTK(actor, ability, newHp, conScore) {
  if (newHp < 0 && newHp > -conScore) {
    const choice = await socket.executeAsGM("promptHTKChoice", actor.id);
    if (choice === "fight") {
      await actor.update({"system.attributes.hp.value": newHp});
      return;
    } else {
      await actor.update({"system.attributes.hp.value": newHp});
    }
  } else if (newHp <= -conScore) {
    await actor.update({"system.attributes.hp.value": newHp});
  }
}

function restoreFlatFootedTracker(combat) {
  const trackerData = combat.getFlag(MODULE.ID, 'flatFootedTracker') || {};
  flatFootedTracker.clear();
  for (const [tokenId, data] of Object.entries(trackerData)) {
    flatFootedTracker.set(tokenId, data);
  }
}

const flatFootedTracker = new Map();