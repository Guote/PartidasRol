import { registerSettings, ABFSettingsKeys } from "./utils/registerSettings.js";
import { Logger } from "./utils/log.js";
import { preloadTemplates } from "./utils/preloadTemplates.js";
import ABFActorSheet from "./module/actor/ABFActorSheet.js";
import ABFFoundryRoll from "./module/rolls/ABFFoundryRoll.js";
import ABFCombat from "./module/combat/ABFCombat.js";
import { ABFActor } from "./module/actor/ABFActor.js";
import { registerHelpers } from "./utils/handlebars-helpers/registerHelpers.js";
import ABFItemSheet from "./module/items/ABFItemSheet.js";
import { ABFConfig } from "./module/ABFConfig.js";
import ABFItem from "./module/items/ABFItem.js";
import ABFActorDirectory from "./module/SidebarDirectories/ABFActorDirectory.js";
import { registerCombatWebsocketRoutes } from "./module/combat/websocket/registerCombatWebsocketRoutes.js";
import { Templates } from "./module/utils/constants.js";
import "./module/dialogs/GenericDialog.js";
import { registerKeyBindings } from "./utils/registerKeyBindings.js";
import { applyMigrations } from "./module/migration/migrate.js";
import { registerGlobalTypes } from "./utils/registerGlobalTypes.js";
import ABFCombatant from "./module/combat/ABFCombatant.js";
import { chatActionHandlers } from "./utils/chatActionHandlers.js";
import { preloadClickHandlers } from "./module/actor/utils/createClickHandlers.js";
import { ABFAttackData } from "./module/combat/ABFAttackData.js";
import { getChatContextMenuFactories } from "./utils/buildChatContextMenu.js";
/* empty css                  */
import { registerSystemOnGame, System } from "./utils/systemMeta.js";
import { resolveTokenName } from "./utils/tokenName.js";
import { FormulaEvaluator } from "./utils/formulaEvaluator.js";
Hooks.once("init", async () => {
  Logger.log("Initializing system");
  registerSystemOnGame();
  Logger.log("Game Id:" + System.id);
  await preloadTemplates();
  CONFIG.Actor.documentClass = ABFActor;
  CONFIG.config = ABFConfig;
  window.ABFFoundryRoll = ABFFoundryRoll;
  CONFIG.Dice.rolls = [ABFFoundryRoll, ...CONFIG.Dice.rolls];
  CONFIG.Combat.documentClass = ABFCombat;
  CONFIG.Combatant.documentClass = ABFCombatant;
  CONFIG.Item.documentClass = ABFItem;
  CONFIG.ui.actors = ABFActorDirectory;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet(System.id, ABFActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet(System.id, ABFItemSheet, {
    makeDefault: true
  });
  registerSettings(System.id);
  registerHelpers();
  registerKeyBindings();
  preloadClickHandlers();
});
Hooks.once("setup", () => {
});
Hooks.once("ready", async () => {
  if (game.user.isGM) {
    const creationVersion = game.settings.get(
      System.id,
      ABFSettingsKeys.WORLD_CREATION_SYSTEM_VERSION
    );
    if (!creationVersion) {
      await game.settings.set(
        System.id,
        ABFSettingsKeys.WORLD_CREATION_SYSTEM_VERSION,
        game.system.version
      );
      console.log(`Registrada versión de creación del mundo: ${game.system.version}`);
    }
  }
  registerCombatWebsocketRoutes();
  applyMigrations();
  registerGlobalTypes();
  game.animabf ??= {};
  game.animabf.api ??= {};
  Object.assign(game.animabf.api, { ABFAttackData });
  game.socket.on("system.animabf", async (p) => {
    if (!game.user.isGM) return;
    if (!p || p.op !== "updateAttackTargets") return;
    const msg = game.messages.get(p.messageId);
    if (!msg) return;
    const kind = msg.getFlag(System.id, "kind");
    if (kind !== "attackData") return;
    const entry = p.entry ?? {};
    const targets = foundry.utils.duplicate(msg.getFlag(System.id, "targets") ?? []);
    const findIndexByKey = (arr, e) => {
      if (e.tokenUuid) {
        const iTok = arr.findIndex((t) => t.tokenUuid === e.tokenUuid);
        if (iTok >= 0) return iTok;
      }
      if (e.actorUuid && !e.tokenUuid) {
        return arr.findIndex((t) => t.actorUuid === e.actorUuid && !t.tokenUuid);
      }
      return -1;
    };
    const i = findIndexByKey(targets, entry);
    if (i >= 0) targets[i] = { ...targets[i], ...entry };
    else targets.push(entry);
    await msg.setFlag(System.id, "targets", targets);
    ui.chat?.updateMessage?.(msg);
  });
});
Hooks.on("renderChatMessage", async (message, html) => {
  html.on("click", ".contractible-button", (e) => {
    $(e.currentTarget).closest(".contractible-group").toggleClass("contracted");
  });
  if (!game.user.isGM) {
    html.find(".only-if-gm").remove();
    html.find('[data-requires-permission="gm"]').remove();
  }
  const speakerActorId = message.speaker?.actor;
  const speakerActor = speakerActorId ? game.actors.get(speakerActorId) : null;
  if (speakerActor && !speakerActor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)) {
    html.find(".only-if-owner").remove();
    html.find('[data-requires-permission="owner"]').remove();
  }
  html.on("click", ".chat-action-button", (e) => {
    const action = e.currentTarget.dataset.action;
    const handler = chatActionHandlers[action];
    if (handler) handler(message, html, e.currentTarget.dataset);
    else console.warn(`No handler found for action: ${action}`);
  });
  if (message.getFlag(System.id, "kind") !== "attackData") return;
  const flags = message.flags?.animabf ?? {};
  const targets = Array.isArray(flags.targets) ? [...flags.targets] : [];
  const rowId = `#animabf-defense-row-${message.id}`;
  const $row = html.find(rowId);
  if (!$row.length) return;
  if (!targets.length) {
    $row.empty();
    if (game.user.isGM) {
      $row.append(
        `<span class="hint" style="opacity:.7;">${game.i18n.localize(
          "chat.attackData.noTargets"
        )}</span>`
      );
    }
    return;
  }
  const order = { pending: 0, rolling: 1, done: 2, expired: 3 };
  targets.sort((a, b) => (order[a.state] ?? 99) - (order[b.state] ?? 99));
  const me = game.user;
  const enriched = targets.map((t) => {
    const actor = t.actorUuid ? game.actors.get(t.actorUuid) : null;
    const canDefend = me.isGM || actor?.testUserPermission?.(me, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    const state = t.state ?? "pending";
    const dot = state === "done" ? "🟢" : state === "rolling" ? "🟠" : state === "expired" ? "⚪" : "🟡";
    const rollerName = state !== "pending" && t.rolledBy ? game.users.get(t.rolledBy)?.name ?? t.rolledBy : null;
    const rollerTitle = rollerName ? game.i18n.format("chat.attackData.rollingBy", { name: rollerName }) : "";
    (() => {
      const id = t.tokenUuid;
      if (!id) return null;
      try {
        if (typeof id === "string" && id.includes(".")) {
          const doc = fromUuidSync(id);
          return doc?.name ?? doc?.document?.name ?? doc?.object?.name ?? null;
        }
        const onCanvas = canvas?.tokens?.get?.(id);
        if (onCanvas) return onCanvas.name ?? onCanvas.document?.name ?? null;
        const sceneId = message.speaker?.scene;
        if (sceneId) {
          const tok = game.scenes?.get(sceneId)?.tokens?.get?.(id);
          if (tok) return tok.name;
        }
        for (const s of game.scenes) {
          const tok = s.tokens?.get?.(id);
          if (tok) return tok.name;
        }
      } catch {
      }
      return null;
    })();
    const tokenLabel = resolveTokenName(
      { tokenUuid: t.tokenUuid, actorUuid: t.actorUuid },
      { message }
    );
    const label = t.label ?? tokenLabel ?? actor?.name ?? game.i18n.localize("chat.common.target");
    return {
      messageId: message.id,
      actorUuid: t.actorUuid ?? "",
      tokenUuid: t.tokenUuid ?? "",
      state,
      stateDot: dot,
      stateLabel: game.i18n.localize(`chat.attackData.state.${state}`),
      rollerName,
      rollerTitle,
      label,
      showDefendButton: !!(canDefend && state === "pending")
    };
  });
  const chipsHTML = await renderTemplate(Templates.Chat.AttackTargetsChips, {
    targets: enriched
  });
  $row.html(chipsHTML);
});
Hooks.on("getChatMessageContextOptions", (_app, menu) => {
  const menuItemFactories = getChatContextMenuFactories();
  for (const makeItem of menuItemFactories) {
    const item = makeItem();
    if (Array.isArray(item)) menu.push(...item);
    else menu.push(item);
  }
});
Hooks.on("chatMessage", (chatLog, message, chatData) => {
  if (!message || !message.includes("@formula{")) return;
  if (chatData._animabfFormulaDone) return;
  const speaker = chatData.speaker || {};
  let actor = null;
  if (speaker.actor) {
    actor = game.actors.get(speaker.actor) ?? actor;
  }
  if (!actor && speaker.token) {
    try {
      const tokenDoc = fromUuidSync(speaker.token);
      actor = tokenDoc?.actor ?? actor;
    } catch (e) {
      console.error("Formula @ speaker.token resolve error", e);
    }
  }
  if (!actor && canvas?.tokens?.controlled?.length) {
    actor = canvas.tokens.controlled[0]?.actor ?? actor;
  }
  const replaced = message.replace(/@formula\{([^}]+)\}/g, (match, inner) => {
    const value = FormulaEvaluator.evaluate(inner, actor);
    return value ?? match;
  });
  if (replaced === message) return;
  chatData._animabfFormulaDone = true;
  chatLog.processMessage(replaced, chatData);
  return false;
});
Hooks.on("renderActiveEffectConfig", (app, html) => {
  const transfer = html.find('input[name="transfer"]');
  if (!transfer.length) return;
  transfer.prop("checked", false);
  transfer.prop("disabled", true);
  transfer.closest(".form-group").hide();
});
Hooks.on("renderTokenHUD", async (hud, html) => {
  const root = hud.element ?? html?.[0];
  if (!root) return;
  const token = hud.object;
  const actor = token?.actor;
  if (!actor) return;
  const flagSystem = game.animabf.id;
  const flagKey = "defensesCounter";
  const defensesCounter = await actor.getFlag(flagSystem, flagKey) ?? {
    accumulated: 0,
    keepAccumulating: true
  };
  const currentValue = Number(defensesCounter.accumulated) || 0;
  const middleCol = root.querySelector(".col.middle");
  if (!middleCol) return;
  let control = middleCol.querySelector(".attribute.abf-flag-value");
  if (!control) {
    control = document.createElement("div");
    control.classList.add("attribute", "abf-flag-value");
    control.dataset.tooltip = "Defensas adicionales";
    control.innerHTML = `
      <label style="margin-right: 4px;">DEF</label>
      <input type="number" name="abfFlagValue" min="0" step="1" value="0">
    `;
    middleCol.prepend(control);
  }
  const input = control.querySelector("input[name='abfFlagValue']");
  if (!input) return;
  input.value = currentValue;
  input.onchange = async (ev) => {
    ev.stopPropagation();
    const newValue = Number(ev.target.value) || 0;
    await actor.setFlag(flagSystem, flagKey, {
      ...defensesCounter,
      accumulated: newValue
    });
  };
});
Handlebars.JavaScriptCompiler.prototype.nameLookup = function(parent, name) {
  if (name.indexOf("xRoot") === 0) {
    return "data.root";
  }
  if (/^[0-9]+$/.test(name)) {
    return `${parent}[${name}]`;
  }
  if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
    return `${parent}.${name}`;
  }
  return `${parent}['${name}']`;
};
