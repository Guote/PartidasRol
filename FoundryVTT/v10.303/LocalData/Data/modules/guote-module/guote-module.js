
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getActorFromCombatant = (combatant) => {
  return game.actors.get(combatant.actorId);
};

const getTokenFromCombatant = (combatant) => {
  return canvas.tokens.get(combatant.tokenId);
};
const getCurrentCombatant = (combat) => {
  const combatantId = combat.current.combatantId;
  const combatant = combat.combatants.get(combatantId);
  const activeActor = game.actors.get(combatant.actorId);
  const activeToken = canvas.tokens.get(combatant.tokenId);

  return {
    currCombatant: combatant,
    currActor: activeActor,
    currToken: activeToken,
  };
};
const getMainOwner = (tokenOrActor) => {
  const ownsership = tokenOrActor?.actor?.ownership || tokenOrActor.ownership;
  const activeOwnersId = Object.keys(ownsership).filter(
    (id) => ownsership[id] === 3 && game.users.get(id).active
  );
  return {
    activeOwnersId: activeOwnersId,
  };
};

const triggerMacroIfActiveEffect = async ({
  token,
  effectName,
  macroName,
  extraCondition = true,
}) => {
  const hasEffect = game.cub.hasCondition(effectName, token);
  if (!hasEffect || !extraCondition) return;

  const actorName = token?.name || token?.actor?.name;
  const macroToTrigger = game.macros.find((m) => m.name === macroName);
  console.log(
    `Actor ${actorName}, with tokenId ${token.id} has ${effectName} active. Triggering macro ${macroName}`
  );
  await macroToTrigger.execute({ token: token });
};

const applySurprise = (combat) => {
  // Constants
  const effectName = "Sorpresa";
  const preveerName = "Preveer Sorpresa";

  // Apply only from the GM side
  if (combat && combat.started && game.user.isGM) {
    // Get surprised actors and apply effect
    let currentInitiative = game.combat?.combatants?.get(
      game.combat.current.combatantId
    ).initiative;

    combat.combatants.forEach((comb) => {
      const token = getTokenFromCombatant(comb);
      const shouldBeSurprised = currentInitiative >= comb.initiative + 150;

      if (!shouldBeSurprised && game.cub.hasCondition(effectName, token)) {
        game.cub.removeCondition(effectName, token);
      }

      if (
        shouldBeSurprised &&
        !game.cub.hasCondition(effectName, token) &&
        !game.cub.hasCondition(preveerName, token)
      ) {
        game.cub.addCondition(effectName, token);
      }
    });
  }
};

const triggerMaintenanceMacro = (combat, delta) => {
  // Trigger macros on round start if specific effect is active
  combat.combatants.contents.forEach((comb) => {
    const token = getTokenFromCombatant(comb);
    const { activeOwnersId } = getMainOwner(token);
    const extraCondition =
      (token.isOwner && !game.user.isGM) ||
      (game.user.isGM && activeOwnersId.length === 1);

    triggerMacroIfActiveEffect({
      token: token,
      effectName: "Usando Ki",
      macroName: "Mantenimiento: Ki",
      extraCondition: extraCondition,
    });
  });
};

Hooks.on("updateCombat", async (combat, delta) => {
  const { currToken } = getCurrentCombatant(combat);

  // Update surprise Status on Combat Start and from turn 2 onwards
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  if (
    (delta?.round === 1 || delta.hasOwnProperty("turn")) &&
    !isSomeoneMissing
  ) {
    applySurprise(combat);
  }

  // Trigger macros for current combatant
  // Trigger accumulation and maintenance macros on round start, before rolling
  if (combat.flags.world.newRound === true && delta?.round) {
    triggerMaintenanceMacro(combat, delta);
    await sendZeonRoundReminder(combat);
  }
  // Trigger macro on turn start for current actor
  const conditionEnLlamas = "En Llamas";
  const { activeOwnersId } = getMainOwner(currToken);
  triggerMacroIfActiveEffect({
    token: currToken,
    effectName: conditionEnLlamas,
    macroName: conditionEnLlamas,
    extraCondition:
      currToken.isOwner && (activeOwnersId.length === 1 || !game.user.isGM),
  });
});

Hooks.on("updateCombatant", async function (combatant, data, options, userId) {
  const combat = combatant.parent;
  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative
  );

  // Update surprise Status when last combatant rolls initiative
  if (!isSomeoneMissing) {
    applySurprise(combat);
  }
});

const cubHas = (name, token) => { try { return game.cub.hasCondition(name, token); } catch { return false; } };
const cubAdd = (name, token) => { try { game.cub.addCondition(name, token); } catch { } };
const cubRemove = (name, token) => { try { game.cub.removeCondition(name, token); } catch { } };

const USANDO_ZEON = 'Usando Zeon';

// Apply conditions based on total modifier (physical + supernatural). GM only.
// NOTE: modFinal.general.final.value is derived by the async prepareActor pipeline and is
// not yet calculated when updateActor fires. Read raw bonus/malus directly instead.
Hooks.on('animabf.defenseSent', (defenderToken, defenseResult) => {
  if (defenseResult.type !== 'combat') return;
  if (!defenseResult.increaseDefenseCounter) return;

  const one   = 'Defensas: 1';
  const two   = 'Defensas: 2';
  const three = 'Defensas: 3+';

  const isOne   = cubHas(one,   defenderToken);
  const isTwo   = cubHas(two,   defenderToken);
  const isThree = cubHas(three, defenderToken);

  if (isOne) {
    cubAdd(two, defenderToken);
    setTimeout(() => cubRemove(one, defenderToken), 500);
  } else if (isTwo) {
    cubAdd(three, defenderToken);
    setTimeout(() => cubRemove(two, defenderToken), 500);
  } else if (!isThree) {
    cubAdd(one, defenderToken);
  }
  // isThree → stays at 3+, no change needed
});

Hooks.on("updateActor", (actor, updateData, options, userId) => {
  if (!game.user.isGM) return;
  if (!updateData.system) return; // Skip updates caused by CUB adding/removing conditions

  const sob = actor.system.general.modifiers.modSobrenatural;
  const fis = actor.system.general.modifiers.modFisico;
  const modTotal = (sob.bonus?.value ?? 0) + (sob.malus?.value ?? 0)
                 + (fis.bonus?.value ?? 0) + (fis.malus?.value ?? 0);
  const token = actor.getActiveTokens()[0];
  const condPlus = "Fortalecimiento";
  const condMinus = "Debilitamiento";

  if (!token) return;

  if (modTotal > 0) {
    if (!cubHas(condPlus, token)) cubAdd(condPlus, token);
    if (cubHas(condMinus, token)) cubRemove(condMinus, token);
  } else if (modTotal < 0) {
    if (cubHas(condPlus, token)) cubRemove(condPlus, token);
    if (!cubHas(condMinus, token)) cubAdd(condMinus, token);
  } else {
    if (cubHas(condPlus, token)) cubRemove(condPlus, token);
    if (cubHas(condMinus, token)) cubRemove(condMinus, token);
  }
});

// ─── Zeon: auto-apply "Usando Zeon" when accumulated > 0 ───────────────────
Hooks.on('updateActor', (actor, updateData) => {
  if (!game.user.isGM) return;
  const newAccum = updateData?.system?.mystic?.zeonAccumulated?.value;
  if (newAccum === undefined) return;
  const token = actor.getActiveTokens()[0];
  if (!token) return;
  if (newAccum > 0) {
    if (!cubHas(USANDO_ZEON, token)) cubAdd(USANDO_ZEON, token);
  } else {
    if (cubHas(USANDO_ZEON, token)) cubRemove(USANDO_ZEON, token);
  }
});

// ─── Zeon: apply condition when spell is cast from attack/defense dialog ────
Hooks.on('animabf.mysticSpellCast', (actor) => {
  if (!game.user.isGM) return;
  const token = actor.getActiveTokens()[0];
  if (!token) return;
  if (!cubHas(USANDO_ZEON, token)) cubAdd(USANDO_ZEON, token);
});

// ─── Zeon: upkeep helpers ────────────────────────────────────────────────────
function getActorRoundUpkeep(actor) {
  return (actor.system?.mystic?.spellMaintenances ?? [])
    .filter(m => m.system?.active?.value !== false)
    .reduce((sum, m) =>
      sum + (m.system?.roundCost?.value ?? 0) + (m.system?.roundCostMod?.value ?? 0), 0);
}

async function applyUpkeepCosts(actor) {
  const total = getActorRoundUpkeep(actor);
  if (total <= 0) return;
  const currentZeon = actor.system.mystic.zeon.value;
  await actor.update({ 'system.mystic.zeon.value': Math.max(0, currentZeon - total) });
  const ownerIds = Object.entries(actor.ownership ?? {})
    .filter(([uid, lvl]) => lvl >= 3 && uid !== 'default').map(([uid]) => uid);
  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
  ChatMessage.create({
    content: `<i class="fas fa-hat-wizard"></i> <b>${actor.name}</b>: Mantenimiento aplicado (−${total} reserva).`,
    whisper: [...new Set([...ownerIds, ...gmIds])]
  });
}

// ─── Zeon: round-start / combat-end whisper ─────────────────────────────────
function buildZeonSection(e) {
  const btnStyle = 'width:auto!important;display:inline-flex;align-items:center;font-size:0.8em;padding:1px 6px';
  let html = `<div style="margin-bottom:6px">` +
    `<img src="${e.tokenSrc}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;object-fit:cover"> ` +
    `<b>${e.actor.name}</b>`;
  if (e.accumulated > 0) {
    const warn = e.pending?.isPure && (e.pending?.leftover ?? 0) > 0 ? ' ⚠️ -10 reserva' : '';
    html += `<br>Zeon acumulado: <b>${e.accumulated}</b>${warn} ` +
      `<button data-action="zeon-cleanup" data-actor-id="${e.actor.id}" style="${btnStyle}">` +
      `<i class="fas fa-broom"></i> Limpiar</button>` +
      `<span title="Si lanzaste algún hechizo o has dejado de acumular, tu zeon acumulado debería pasar a 0" style="cursor:help;margin-left:2px">ⓘ</span>`;
  }
  if (e.roundUpkeep > 0) {
    html += `<br>Mantenimiento/asalto: <b>${e.roundUpkeep}</b> ` +
      `<button data-action="apply-upkeep" data-actor-id="${e.actor.id}" style="${btnStyle}">` +
      `<i class="fas fa-coins"></i> Aplicar</button> ` +
      `<button data-action="open-grimoire" data-actor-id="${e.actor.id}" style="${btnStyle}">` +
      `<i class="fas fa-book-open"></i> Grimorio</button>`;
  }
  html += `</div>`;
  return html;
}

async function sendZeonRoundReminder(combat) {
  if (!game.user.isGM) return;
  const playerActors = new Map(); // playerId → entries[]
  const gmOnlyEntries = [];       // actors with no player owner

  for (const combatant of combat.combatants) {
    const token = getTokenFromCombatant(combatant);
    const actor = combatant.actor;
    if (!actor) continue;

    const accumulated = actor.system?.mystic?.zeonAccumulated?.value ?? 0;
    const roundUpkeep = getActorRoundUpkeep(actor);
    if (accumulated === 0 && roundUpkeep === 0) continue;

    const pending = actor.system?.macroCookies?.pendingZeonCleanup;
    const tokenSrc = token?.document?.texture?.src ?? actor.img;
    const entry = { actor, accumulated, roundUpkeep, pending, tokenSrc };

    const playerOwnerIds = Object.entries(actor.ownership ?? {})
      .filter(([uid, lvl]) => lvl >= 3 && uid !== 'default' && !game.users.get(uid)?.isGM)
      .map(([uid]) => uid);

    if (playerOwnerIds.length === 0) {
      gmOnlyEntries.push(entry);
    } else {
      for (const uid of playerOwnerIds) {
        if (!playerActors.has(uid)) playerActors.set(uid, []);
        playerActors.get(uid).push(entry);
      }
    }
  }

  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);

  for (const [userId, entries] of playerActors) {
    ChatMessage.create({
      content: `<i class="fas fa-hat-wizard"></i> <b>Usando Zeon</b>:<br>${entries.map(buildZeonSection).join('')}`,
      whisper: [...new Set([userId, ...gmIds])]
    });
  }

  if (gmOnlyEntries.length > 0) {
    ChatMessage.create({
      content: `<i class="fas fa-hat-wizard"></i> <b>Usando Zeon</b>:<br>${gmOnlyEntries.map(buildZeonSection).join('')}`,
      whisper: gmIds
    });
  }
}

Hooks.on('deleteCombat', async (combat) => {
  await sendZeonRoundReminder(combat);
});

// ─── Zeon: cleanup function ──────────────────────────────────────────────────
async function applyZeonCleanup(actor) {
  const pending = actor.system?.macroCookies?.pendingZeonCleanup;
  const accumulated = actor.system?.mystic?.zeonAccumulated?.value ?? 0;
  const isPure = pending?.isPure ?? true;
  const leftover = pending?.leftover ?? accumulated;
  const penalty = (isPure && leftover > 0) ? -10 : 0;

  const update = { 'system.mystic.zeonAccumulated.value': 0 };
  if (penalty !== 0)
    update['system.mystic.zeon.value'] = Math.max(0, actor.system.mystic.zeon.value + penalty);
  await actor.update(update);

  if (pending) await actor.update({ 'system.macroCookies.pendingZeonCleanup': null });

  const token = actor.getActiveTokens()[0];
  if (token && cubHas(USANDO_ZEON, token)) cubRemove(USANDO_ZEON, token);

  const ownerIds = Object.entries(actor.ownership ?? {})
    .filter(([uid, lvl]) => lvl >= 3 && uid !== 'default').map(([uid]) => uid);
  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
  const penaltyText = penalty < 0 ? ` Penalización: <b>${penalty}</b> reserva.` : '';
  ChatMessage.create({
    content: `<i class="fas fa-hat-wizard"></i> <b>${actor.name}</b>: Zeon limpiado.${penaltyText}`,
    whisper: [...new Set([...ownerIds, ...gmIds])]
  });
}

Hooks.on('renderChatMessage', (msg, html) => {
  html.find('[data-action="zeon-cleanup"]').on('click', async ev => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyZeonCleanup(actor);
  });
  html.find('[data-action="apply-upkeep"]').on('click', async ev => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyUpkeepCosts(actor);
  });
  html.find('[data-action="open-grimoire"]').on('click', ev => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) actor.sheet.render(true);
  });
});

/***********************************************************************************
 * Merge Simple Calendar and SmallTime Styles
 **********************************************************************************/
// Merge Simple Calendar and SmallTime styles
// 1. Define your time-based color stops in minutes (0–1440). For example:
const COLOR_STOPS = [
  { time: 0, color: "#000000" }, // midnight
  { time: 288, color: "#351984" }, // ~4:48  AM (20% of day)
  { time: 432, color: "#db5a23" }, // ~7:12  AM (30%)
  { time: 504, color: "#d19621" }, // ~8:24  AM (35%)
  { time: 576, color: "#25c5ed" }, // ~9:36  AM (40%)
  { time: 864, color: "#25c5ed" }, // ~14:24 PM (60%)
  { time: 1008, color: "#d19621" }, // ~16:48 PM (70%)
  { time: 1080, color: "#db5a23" }, // ~18:00 PM (75%)
  { time: 1152, color: "#351984" }, // ~19:12 PM (80%)
  { time: 1440, color: "#000000" }, // next midnight
];

// Converts a hex color (#RRGGBB) into [r,g,b] array.
function parseColor(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

// Linearly interpolates between two [r,g,b] colors with fraction t in [0..1].
function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Given a dayTime in minutes (0..1439), find the interpolated color.
function getTimeColor(dayTime) {
  // Find the two COLOR_STOPS we’re between
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const stop1 = COLOR_STOPS[i];
    const stop2 = COLOR_STOPS[i + 1];
    if (dayTime >= stop1.time && dayTime <= stop2.time) {
      // fraction of the way from stop1 to stop2
      const t = (dayTime - stop1.time) / (stop2.time - stop1.time);
      const c1 = parseColor(stop1.color);
      const c2 = parseColor(stop2.color);
      const [r, g, b] = interpolateColor(c1, c2, t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  // Fallback if none found (shouldn’t happen if stops cover 0..1440)
  return COLOR_STOPS[0].color;
}
Hooks.on("updateWorldTime", (currentWorldTime) => {
  const dayTime = Math.trunc((currentWorldTime % 86400) / 60);
  const timeColor = getTimeColor(dayTime);

  // Grab the Simple Calendar pop-up and its header
  const scCompactWindow = document.getElementById("fsc-if");
  if (!scCompactWindow) return;
  const headerEl = scCompactWindow.querySelector("header.window-header");
  if (!headerEl) return;

  /* console.log({dayTime, timeColor}) */
  headerEl.style.backgroundColor = timeColor;
});
