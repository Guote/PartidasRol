// ─── Condition names — change here to rename in CUB ─────────────────────────
const USANDO_ENERGIA = "Usando Energia";
const CONT_DEFENSAS = "Cont. Defensas";
const CONT_ATAQUES = "Cont. Ataques";
const ACORRALADO = "Acorralado";

// ─── Named constants ──────────────────────────────────────────────────────────
/** Initiative gap at which a combatant is considered surprised by the active turn. */
const SURPRISE_INITIATIVE_THRESHOLD = 150;
/** Divisor applied each round to free (un-locked) ki accumulation as a partial penalty. */
const KI_ROUND_REDUCTION_DIVISOR = 2;

const ROUND_REMINDER_TEMPLATE = "modules/guote-module/templates/round-reminder.hbs";
const KI_STATS = ['strength', 'agility', 'dexterity', 'constitution', 'willPower', 'power'];
const KI_STAT_LABELS = {
  strength: 'Fue', agility: 'Agi', dexterity: 'Des',
  constitution: 'Con', willPower: 'Vol', power: 'Pod'
};

function getHeldKiPerStat(actor) {
  return KI_STATS.reduce((acc, s) => {
    acc[s] = (actor.system?.domine?.kiMaintenances ?? [])
      .filter(m => m.system?.active?.value !== false && m.system?.techniqueId?.value)
      .reduce((sum, m) => {
        const tech = actor.items.find(i => i.id === m.system.techniqueId.value);
        return sum + (Number(tech?.system?.[s]?.value) || 0);
      }, 0);
    return acc;
  }, {});
}

Hooks.on("init", () => {
  loadTemplates([ROUND_REMINDER_TEMPLATE]);
});

let _ABFSpellbook = null;
Hooks.on("ready", async () => {
  try {
    const mod = await import("/systems/animabf-guote/module/actor/ABFSpellbook.js");
    _ABFSpellbook = mod.default;
  } catch (e) {
    console.warn("[guote-module] Could not import ABFSpellbook:", e);
  }
});

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
    (id) => ownsership[id] === 3 && game.users.get(id).active,
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
    `Actor ${actorName}, with tokenId ${token.id} has ${effectName} active. Triggering macro ${macroName}`,
  );
  await macroToTrigger.execute({ token: token });
};

const applySurprise = (combat) => {
  const effectName = "Sorpresa";
  const preveerName = "Preveer Sorpresa";

  if (combat && combat.started && game.user.isGM) {
    let currentInitiative = game.combat?.combatants?.get(
      game.combat.current.combatantId,
    ).initiative;

    combat.combatants.forEach((comb) => {
      const token = getTokenFromCombatant(comb);
      const shouldBeSurprised = currentInitiative >= comb.initiative + SURPRISE_INITIATIVE_THRESHOLD;

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

Hooks.on("updateCombat", async (combat, delta) => {
  const { currToken } = getCurrentCombatant(combat);

  const isSomeoneMissing = combat?.turns?.some(
    (combatant) => !combatant?.initiative,
  );

  if (
    (delta?.round === 1 || delta.hasOwnProperty("turn")) &&
    !isSomeoneMissing
  ) {
    applySurprise(combat);
  }

  // Round-start: apply ki penalty first so reminder shows post-penalty accumulated values
  if (delta?.round) {
    const kiLossMap = await applyKiPartialPenalty(combat);
    await sendRoundReminder(combat, kiLossMap);
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
    (combatant) => !combatant?.initiative,
  );

  if (!isSomeoneMissing) {
    applySurprise(combat);
  }
});

function getNotificationRecipients(actor) {
  const ownerIds = Object.entries(actor.ownership ?? {})
    .filter(([uid, lvl]) => lvl >= 3 && uid !== 'default')
    .map(([uid]) => uid);
  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  return { ownerIds, gmIds };
}

const cubHas = (name, token) => {
  try {
    return game.cub.hasCondition(name, token);
  } catch {
    return false;
  }
};
const cubAdd = (name, token) => {
  try {
    game.cub.addCondition(name, token);
  } catch {}
};
const cubRemove = (name, token) => {
  try {
    game.cub.removeCondition(name, token);
  } catch {}
};

// ─── Combat conditions ────────────────────────────────────────────────────────

// Defense counter: add "Ha defendido" or increment its SIC counter (max 3)
Hooks.on('animabf.defenseSent', async (defenderToken, defenseResult) => {
  if (!game.user.isGM) return;
  if (!defenseResult.increaseDefenseCounter) return;
  const token = defenderToken?.object ?? defenderToken;
  if (!token) return;
  const actor = token.actor;
  if (!actor) return;

  const effect = actor.effects.find(e => (e.name ?? e.label) === CONT_DEFENSAS);

  if (!effect) {
    // First defense this round — add via CUB (SIC counter auto-starts at 1)
    cubAdd(CONT_DEFENSAS, token);
  } else {
    // Already defending this round — increment SIC counter up to 4
    const ctr = window.ActiveEffectCounter?.getCounter(effect);
    const currentCount = ctr ? (ctr.getValue(effect) ?? 1) : 1;
    if (currentCount < 4) {
      await ctr?.setValue(currentCount + 1, effect);
    }
  }
});

// Guard: prevent double-add from rapid re-entrant calls (e.g. dev hot-reload with two listeners)
const _contAtaquesGuard = new Set();

// Attack counter: add "Cont. Ataques" or decrement its SIC counter
Hooks.on('animabf.combatAttackSent', async (attackerToken, _attackResult, { ataquePrincipal = 1, maniobras = 0 } = {}) => {
  if (!game.user.isGM) return;
  const token = attackerToken?.object ?? attackerToken;
  if (!token) return;
  const actor = token.actor;
  if (!actor) return;

  const total = ataquePrincipal + maniobras;
  if (total <= 1) return;

  // Deduplicate: ignore a second call for the same token within 300ms
  if (_contAtaquesGuard.has(token.id)) return;
  _contAtaquesGuard.add(token.id);
  setTimeout(() => _contAtaquesGuard.delete(token.id), 300);

  const effect = actor.effects.find(e => (e.name ?? e.label) === CONT_ATAQUES);

  if (!effect) {
    cubAdd(CONT_ATAQUES, token);
    const initialCount = total - 1;
    if (initialCount > 1) {
      setTimeout(async () => {
        const addedEffect = actor.effects.find(e => (e.name ?? e.label) === CONT_ATAQUES);
        if (!addedEffect) return;
        const ctr = window.ActiveEffectCounter?.getCounter(addedEffect);
        if (ctr) await ctr.setValue(initialCount, addedEffect);
      }, 500);
    }
  } else {
    const ctr = window.ActiveEffectCounter?.getCounter(effect);
    const currentCount = ctr ? (ctr.getValue(effect) ?? 1) : 1;
    if (currentCount > 1) {
      await ctr?.setValue(currentCount - 1, effect);
    } else {
      cubRemove(CONT_ATAQUES, token);
    }
  }
});

// Acorralado: add when attack beats defense
Hooks.on('animabf.combatResolved', (defenderToken, result) => {
  if (!game.user.isGM) return;
  if (result.defenseSucceeded) return;
  const token = defenderToken?.object ?? defenderToken;
  if (!token) return;
  cubAdd(ACORRALADO, token);
});

// ─── Actor update: Fortalecimiento/Debilitamiento + Usando Energía sync ──────
// NOTE: modFinal.general.final.value is derived by the async prepareActor pipeline and is
// not yet calculated when updateActor fires. Read raw bonus/malus directly instead.
Hooks.on("updateActor", (actor, updateData) => {
  if (!game.user.isGM) return;

  // Fortalecimiento/Debilitamiento — only when modifiers changed
  if (updateData.system?.general?.modifiers) {
    const sob = actor.system.general.modifiers.modSobrenatural;
    const fis = actor.system.general.modifiers.modFisico;
    const modTotal =
      (sob.bonus?.value ?? 0) +
      (sob.malus?.value ?? 0) +
      (fis.bonus?.value ?? 0) +
      (fis.malus?.value ?? 0);
    const token = actor.getActiveTokens()[0];
    const condPlus = "Fortalecimiento";
    const condMinus = "Debilitamiento";

    if (token) {
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
    }
  }

  // Usando Energía sync — only when domine/mystic changed
  if (updateData.system?.mystic || updateData.system?.domine) {
    syncCondition(actor);
  }
});

// ─── Energy condition: apply when a spell is cast from attack/defense dialog ──
Hooks.on("animabf.mysticSpellCast", (actor) => {
  if (!game.user.isGM) return;
  const token = actor.getActiveTokens()[0];
  if (!token) return;
  if (!cubHas(USANDO_ENERGIA, token)) cubAdd(USANDO_ENERGIA, token);
});

// ─── Energy condition: re-check when technique, ki maintenance or spell maintenance changes
Hooks.on("updateItem", (item, updateData) => {
  if (!game.user.isGM) return;
  if (!['technique', 'kiMaintenance', 'spellMaintenance'].includes(item.type)) return;
  const actor = item.actor;
  if (!actor) return;
  syncCondition(actor);
});

// ─── Energy condition sync helper ─────────────────────────────────────────────
function syncCondition(actor) {
  const token = actor.getActiveTokens()[0];
  if (!token) return;
  const shouldHave =
    getTotalKiAccumulated(actor) > 0 ||
    getActorRoundKiUpkeep(actor) > 0 ||
    (actor.system?.mystic?.zeonAccumulated?.value ?? 0) > 0 ||
    getActorRoundUpkeep(actor) > 0;
  if (shouldHave) {
    if (!cubHas(USANDO_ENERGIA, token)) cubAdd(USANDO_ENERGIA, token);
  } else {
    if (cubHas(USANDO_ENERGIA, token)) cubRemove(USANDO_ENERGIA, token);
  }
}

// ─── Zeon helpers ─────────────────────────────────────────────────────────────
function getActorRoundUpkeep(actor) {
  return (actor.system?.mystic?.spellMaintenances ?? [])
    .filter((m) => m.system?.active?.value !== false)
    .reduce(
      (sum, m) =>
        sum +
        (Number(m.system?.roundCost?.value) || 0) +
        (Number(m.system?.roundCostMod?.value) || 0),
      0,
    );
}

async function applyUpkeepCosts(actor) {
  const total = getActorRoundUpkeep(actor);
  if (total <= 0) return;
  const currentZeon = actor.system.mystic.zeon.value;
  await actor.update({
    "system.mystic.zeon.value": Math.max(0, currentZeon - total),
  });
  const { ownerIds, gmIds } = getNotificationRecipients(actor);
  ChatMessage.create({
    content: `<i class="fas fa-hat-wizard"></i> <b>${actor.name}</b>: Mantenimiento aplicado (−${total} reserva).`,
    whisper: [...new Set([...ownerIds, ...gmIds])],
  });
}

// ─── Zeon cleanup ─────────────────────────────────────────────────────────────
async function applyZeonCleanup(actor) {
  const pending = actor.system?.macroCookies?.pendingZeonCleanup;
  const accumulated = actor.system?.mystic?.zeonAccumulated?.value ?? 0;
  const isPure = pending?.isPure ?? true;
  const leftover = pending?.leftover ?? accumulated;
  const penalty = isPure && leftover > 0 ? -10 : 0;

  const update = { "system.mystic.zeonAccumulated.value": 0 };
  if (penalty !== 0)
    update["system.mystic.zeon.value"] = Math.max(
      0,
      actor.system.mystic.zeon.value + penalty,
    );
  await actor.update(update);

  // Deactivate any "Aguantando:" maintenance items — their zeon is now gone
  for (const m of actor.system?.mystic?.spellMaintenances ?? []) {
    if (m.system?.active?.value !== false && m.name?.startsWith('Aguantando:')) {
      const inst = actor.items.get(m._id);
      if (inst) await inst.update({ 'system.active.value': false });
    }
  }
  // syncCondition fires automatically via updateActor hook after the update above

  if (pending)
    await actor.update({ "system.macroCookies.pendingZeonCleanup": null });

  const { ownerIds, gmIds } = getNotificationRecipients(actor);
  const penaltyText =
    penalty < 0 ? ` Penalización: <b>${penalty}</b> reserva.` : "";
  ChatMessage.create({
    content: `<i class="fas fa-hat-wizard"></i> <b>${actor.name}</b>: Zeon limpiado.${penaltyText}`,
    whisper: [...new Set([...ownerIds, ...gmIds])],
  });
}

Hooks.on("deleteCombat", async (combat) => {
  await sendRoundReminder(combat);
});

// ─── Ki helpers ───────────────────────────────────────────────────────────────
function getTotalKiAccumulated(actor) {
  return KI_STATS.reduce(
    (s, stat) => s + (actor.system?.domine?.kiAccumulation?.[stat]?.accumulated?.value ?? 0),
    0
  );
}

function getActorRoundKiUpkeep(actor) {
  const fromMaintenances = (actor.system?.domine?.kiMaintenances ?? [])
    .filter((m) => m.system?.active?.value !== false)
    .reduce((s, m) => s + (Number(m.system?.roundCost?.value) || 0), 0);
  const fromTechniques = (actor.items ?? [])
    .filter((i) => i.type === 'technique' && i.system?.active?.value && i.system?.roundCost?.value > 0)
    .reduce((s, i) => s + (Number(i.system?.roundCost?.value) || 0), 0);
  return fromMaintenances + fromTechniques;
}

async function applyKiUpkeep(actor) {
  const total = getActorRoundKiUpkeep(actor);
  if (total <= 0) return;
  const currentKi = actor.system?.domine?.kiAccumulation?.generic?.value ?? 0;
  await actor.update({ "system.domine.kiAccumulation.generic.value": Math.max(0, currentKi - total) });
  const { ownerIds, gmIds } = getNotificationRecipients(actor);
  ChatMessage.create({
    content: `<i class="fas fa-yin-yang"></i> <b>${actor.name}</b>: Mantenimiento Ki aplicado (−${total} ki).`,
    whisper: [...new Set([...ownerIds, ...gmIds])],
  });
}

async function applyKiCleanup(actor) {
  const updateData = {};
  for (const stat of KI_STATS) {
    updateData[`system.domine.kiAccumulation.${stat}.accumulated.value`] = 0;
  }
  const currentKi = actor.system?.domine?.kiAccumulation?.generic?.value ?? 0;
  updateData["system.domine.kiAccumulation.generic.value"] = Math.max(0, currentKi - 1);
  await actor.update(updateData);
  // syncCondition fires automatically via updateActor hook after the update above

  const { ownerIds, gmIds } = getNotificationRecipients(actor);
  ChatMessage.create({
    content: `<i class="fas fa-yin-yang"></i> <b>${actor.name}</b>: Ki limpiado (−1 reserva ki).`,
    whisper: [...new Set([...ownerIds, ...gmIds])],
  });
}

async function applyKiPartialPenalty(combat) {
  const kiLossMap = new Map();
  if (!game.user.isGM) return kiLossMap;
  const updatePromises = [];
  for (const combatant of combat.combatants) {
    const token = getTokenFromCombatant(combatant);
    const actor = combatant.actor;
    if (!actor || !token) continue;
    if (!cubHas(USANDO_ENERGIA, token)) continue;
    if (cubHas("Concentrado", token)) continue;

    const locked = getHeldKiPerStat(actor);
    const updateData = {};
    let changed = false;
    for (const stat of KI_STATS) {
      const accumulated = actor.system?.domine?.kiAccumulation?.[stat]?.accumulated?.value ?? 0;
      if (accumulated <= 0) continue;
      const accRate = actor.system?.domine?.kiAccumulation?.[stat]?.final?.value ?? 0;
      const reduction = Math.floor(accRate / KI_ROUND_REDUCTION_DIVISOR);
      if (reduction <= 0) continue;
      const lockedStat = locked[stat] ?? 0;
      const free = Math.max(0, accumulated - lockedStat);
      const newAcc = lockedStat + Math.max(0, free - reduction);
      if (newAcc === accumulated) continue;
      updateData[`system.domine.kiAccumulation.${stat}.accumulated.value`] = newAcc;
      changed = true;
      const loss = accumulated - newAcc;
      const lossEntry = kiLossMap.get(actor.id) ?? { kiAccLost: 0, kiAccLostStats: [] };
      lossEntry.kiAccLost += loss;
      lossEntry.kiAccLostStats.push({ label: KI_STAT_LABELS[stat], loss });
      kiLossMap.set(actor.id, lossEntry);
    }
    if (changed) updatePromises.push(actor.update(updateData));
  }
  await Promise.all(updatePromises);
  return kiLossMap;
}

// ─── Unified round reminder ───────────────────────────────────────────────────

/**
 * Collect all combatants that are using energy (USANDO_ENERGIA condition) and
 * return the raw data needed to build their reminder entries.
 * @param {Combat} combat
 * @param {Map<string, {kiAccLost: number, kiAccLostStats: Array}>} kiLossMap
 * @returns {Array<{actor, token, kiAccLost, kiAccLostStats}>}
 */
function _collectEnergyActors(combat, kiLossMap) {
  const collected = [];
  for (const combatant of combat.combatants) {
    const token = getTokenFromCombatant(combatant);
    const actor = combatant.actor;
    if (!actor || !token) continue;
    if (!cubHas(USANDO_ENERGIA, token)) continue;
    const { kiAccLost = 0, kiAccLostStats = [] } = kiLossMap.get(actor.id) ?? {};
    collected.push({ actor, token, kiAccLost, kiAccLostStats });
  }
  return collected;
}

/**
 * Build the per-actor template entry object from a collected energy actor record.
 * @param {{actor, token, kiAccLost: number, kiAccLostStats: Array}} record
 * @returns {Object} entry — shape expected by round-reminder.hbs
 */
function _buildReminderEntry({ actor, token, kiAccLost, kiAccLostStats }) {
  const zeonAcc = actor.system?.mystic?.zeonAccumulated?.value ?? 0;
  const zeonUpkeep = getActorRoundUpkeep(actor);
  const pureLeftoverWarn = !!(
    actor.system?.macroCookies?.pendingZeonCleanup?.isPure &&
    (actor.system?.macroCookies?.pendingZeonCleanup?.leftover ?? 0) > 0
  );
  const kiAcc = getTotalKiAccumulated(actor);
  const kiUpkeep = getActorRoundKiUpkeep(actor);
  const isConcentrado = cubHas("Concentrado", token);

  const heldKiTechniques = (actor.system?.domine?.kiMaintenances ?? [])
    .filter(m => m.system?.active?.value !== false && m.system?.techniqueId?.value)
    .map(m => {
      const tech = actor.items.find(i => i.id === m.system.techniqueId.value);
      return { name: tech?.name ?? m.name, level: Number(tech?.system?.level?.value) || 0 };
    });
  const heldZeonSpells = (actor.system?.mystic?.spellMaintenances ?? [])
    .filter(m => m.system?.active?.value !== false && m.name?.startsWith('Aguantando:'))
    .map(m => {
      const spellId = m.system?.spellId?.value;
      const grade = m.system?.grade?.value ?? 'base';
      const spell = spellId ? actor.items.find(i => i.id === spellId) : null;
      const zeonCost = spell?.system?.grades?.[grade]?.zeon?.value ?? 0;
      return { name: m.name.replace('Aguantando: ', ''), grade, zeonCost };
    });

  const hasKiAccLost = kiAccLost > 0;
  const showGrimoire = !!(zeonAcc || zeonUpkeep);
  const hasUpkeep = kiUpkeep > 0 || zeonUpkeep > 0;
  const hasCleanup = kiAcc > 0 || zeonAcc > 0;

  // Button slots — ordered independently per column so row 1 always pairs
  // the first available upkeep with the first available cleanup, regardless of resource type.
  const upkeepSlots = [];
  if (kiUpkeep > 0) upkeepSlots.push({
    action: 'ki-apply-upkeep', iconClass: 'fas fa-yin-yang', colorClass: 'gzr-icon--ki',
    value: kiUpkeep, tooltip: 'Pagar costes de mantenimiento',
  });
  if (zeonUpkeep > 0) upkeepSlots.push({
    action: 'apply-upkeep', iconClass: 'fas fa-hat-wizard', colorClass: 'gzr-icon--zeon',
    value: zeonUpkeep, tooltip: 'Pagar costes de mantenimiento',
  });

  const cleanupSlots = [];
  if (kiAcc > 0) cleanupSlots.push({
    action: 'ki-cleanup', iconClass: 'fas fa-yin-yang', colorClass: 'gzr-icon--ki',
    acc: kiAcc, hasPenalty: true, penalty: 1,
    tooltip: 'Limpiar ki acumulado.\nSi el turno anterior hemos lanzado alguna técnica o hemos dejado de acumular, al final del turno debemos perder lo que nos quede.\nPerdemos 1 ki de la reserva por tener ki sobrante al dejar de acumular.',
  });
  if (zeonAcc > 0) cleanupSlots.push({
    action: 'zeon-cleanup', iconClass: 'fas fa-hat-wizard', colorClass: 'gzr-icon--zeon',
    acc: zeonAcc, hasPenalty: pureLeftoverWarn, penalty: 10,
    tooltip: `Limpiar zeon acumulado.\nSi el turno anterior hemos lanzado algún conjuro o hemos dejado de acumular, al final del turno debemos perder lo que nos quede.${pureLeftoverWarn ? '\nPerdemos 10 zeon de la reserva por tener zeon sobrante al dejar de acumular.' : ''}`,
  });

  const buttonRows = Array.from(
    { length: Math.max(upkeepSlots.length, cleanupSlots.length) },
    (_, i) => ({ upkeep: upkeepSlots[i] ?? null, cleanup: cleanupSlots[i] ?? null }),
  );

  return {
    actorId: actor.id,
    actorName: actor.name,
    tokenSrc: token?.document?.texture?.src ?? actor.img,
    zeonAcc,
    zeonUpkeep,
    pureLeftoverWarn,
    kiAcc,
    kiAccLost,
    kiAccLostStats,
    hasKiAccLost,
    kiUpkeep,
    isConcentrado,
    heldKiTechniques,
    heldZeonSpells,
    showGrimoire,
    hasUpkeep,
    hasCleanup,
    buttonRows,
  };
}

/**
 * Build the whisper routing maps: one entry list per online player-owner, plus a
 * GM-only list for actors with no online player owner.
 * @param {Array} collected — output of _collectEnergyActors
 * @returns {{ playerActors: Map<string, Array>, gmOnlyEntries: Array }}
 */
function _buildReminderContext(collected) {
  const playerActors = new Map(); // playerId → entries[]
  const gmOnlyEntries = [];

  for (const record of collected) {
    const entry = _buildReminderEntry(record);
    // Ownership: use the player who has this actor as their default character, if online
    const defaultPlayer = game.users.find(
      u => !u.isGM && u.active && u.character?.id === record.actor.id
    );
    if (defaultPlayer) {
      if (!playerActors.has(defaultPlayer.id)) playerActors.set(defaultPlayer.id, []);
      playerActors.get(defaultPlayer.id).push(entry);
    } else {
      gmOnlyEntries.push(entry);
    }
  }

  return { playerActors, gmOnlyEntries };
}

/**
 * Orchestrate the round-end reminder: collect actors → build context → dispatch whispers.
 * @param {Combat} combat
 * @param {Map} [kiLossMap]
 */
async function sendRoundReminder(combat, kiLossMap = new Map()) {
  if (!game.user.isGM) return;

  const gmIds = game.users.filter((u) => u.isGM).map((u) => u.id);
  const collected = _collectEnergyActors(combat, kiLossMap);
  const { playerActors, gmOnlyEntries } = _buildReminderContext(collected);
  const round = combat.round ?? 0;

  for (const [userId, entries] of playerActors) {
    const content = await renderTemplate(ROUND_REMINDER_TEMPLATE, { entries, round });
    ChatMessage.create({ content, whisper: [...new Set([userId, ...gmIds])] });
  }

  if (gmOnlyEntries.length > 0) {
    const content = await renderTemplate(ROUND_REMINDER_TEMPLATE, { entries: gmOnlyEntries, round });
    ChatMessage.create({ content, whisper: gmIds });
  }
}

Hooks.on("renderChatMessage", (msg, html) => {
  // dfce-cm-bottom / whisper class on the <li> constrains width; fix both
  // levels after all other module hooks (chat-portrait, dfce) have settled.
  if (html.find('.gzr-card').length) {
    setTimeout(() => {
      const li = html[0];
      if (li) {
        li.style.setProperty('display', 'flex', 'important');
        li.style.setProperty('flex-direction', 'column', 'important');
        li.style.setProperty('width', '100%', 'important');
        li.style.setProperty('box-sizing', 'border-box', 'important');
      }
      const mc = html.find('.message-content')[0];
      if (mc) {
        mc.style.setProperty('display', 'block', 'important');
        mc.style.setProperty('width', '100%', 'important');
        mc.style.setProperty('box-sizing', 'border-box', 'important');
      }
    }, 0);
  }

  html.find('[data-action="zeon-cleanup"]').on("click", async (ev) => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyZeonCleanup(actor);
  });
  html.find('[data-action="apply-upkeep"]').on("click", async (ev) => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyUpkeepCosts(actor);
  });
  html.find('[data-action="ki-cleanup"]').on("click", async (ev) => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyKiCleanup(actor);
  });
  html.find('[data-action="ki-apply-upkeep"]').on("click", async (ev) => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) await applyKiUpkeep(actor);
  });
  html.find('[data-action="open-actor-sheet"]').on("click", (ev) => {
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (actor) actor.sheet.render(true);
  });
  html.find('[data-action="open-grimoire"]').on("click", (ev) => {
    ev.stopPropagation();
    const actor = game.actors.get(ev.currentTarget.dataset.actorId);
    if (!actor) return;
    if (_ABFSpellbook) {
      _ABFSpellbook.openForActor(actor);
    } else {
      actor.sheet.render(true);
    }
  });
});

/***********************************************************************************
 * Merge Simple Calendar and SmallTime Styles
 **********************************************************************************/
const COLOR_STOPS = [
  { time: 0, color: "#000000" },
  { time: 288, color: "#351984" },
  { time: 432, color: "#db5a23" },
  { time: 504, color: "#d19621" },
  { time: 576, color: "#25c5ed" },
  { time: 864, color: "#25c5ed" },
  { time: 1008, color: "#d19621" },
  { time: 1080, color: "#db5a23" },
  { time: 1152, color: "#351984" },
  { time: 1440, color: "#000000" },
];

function parseColor(hex) {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function interpolateColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function getTimeColor(dayTime) {
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const stop1 = COLOR_STOPS[i];
    const stop2 = COLOR_STOPS[i + 1];
    if (dayTime >= stop1.time && dayTime <= stop2.time) {
      const t = (dayTime - stop1.time) / (stop2.time - stop1.time);
      const c1 = parseColor(stop1.color);
      const c2 = parseColor(stop2.color);
      const [r, g, b] = interpolateColor(c1, c2, t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  return COLOR_STOPS[0].color;
}
Hooks.on("updateWorldTime", (currentWorldTime) => {
  const dayTime = Math.trunc((currentWorldTime % 86400) / 60);
  const timeColor = getTimeColor(dayTime);

  const scCompactWindow = document.getElementById("fsc-if");
  if (!scCompactWindow) return;
  const headerEl = scCompactWindow.querySelector("header.window-header");
  if (!headerEl) return;

  headerEl.style.backgroundColor = timeColor;
});
