import { autoRollDefenseAgainstAttack } from "../../module/combat/autoRollDefenseAgainstAttack.js";
import { Templates } from "../../module/utils/constants.js";
import { updateAttackTargetsFlag } from "../updateAttackTargetsFlag.js";
import { openModDialog } from "../../module/utils/dialogs/openSimpleInputDialog.js";
async function autoDefendActionHandler(message, _html, ds) {
  try {
    const msg = game.messages.get(ds.messageId ?? message?.id ?? null);
    const attackData = (typeof ds.attackData === "string" ? safeParseJSON(ds.attackData) : ds.attackData) ?? msg?.getFlag(game.animabfguote13.id, "attackData") ?? msg?.flags?.animabfguote13?.attackData ?? null;
    if (!attackData) return ui.notifications?.warn("Datos de ataque no disponibles.");
    const tokens = (canvas.tokens?.controlled ?? []).filter((t) => canDefendWithToken(t));
    if (!tokens.length)
      return ui.notifications?.warn("No hay tokens seleccionados válidos.");
    const mod = await openModDialog();
    const entries = [];
    for (const tok of tokens) {
      const r = await autoRollDefenseAgainstAttack({
        defenderToken: tok,
        attackData,
        defenseMod: mod
      });
      if (msg?.id) {
        await updateAttackTargetsFlag(msg.id, {
          actorUuid: r.actor.id,
          tokenUuid: r.token?.document?.uuid ?? tok?.document?.uuid ?? r.token?.uuid ?? tok?.uuid ?? tok?.id ?? "",
          state: "done",
          rolledBy: game.user.id,
          defenseResult: r.defenseData.toJSON?.() ?? r.defenseData,
          updatedAt: Date.now()
        });
      }
      entries.push(entryFromAuto(r, tok));
    }
    const tokenForSpeaker = tokens[0] ?? null;
    const tokenName = tokenForSpeaker?.name ?? tokenForSpeaker?.document?.name ?? tokens[0]?.actor?.name ?? "";
    const speaker = tokenForSpeaker ? { ...ChatMessage.getSpeaker({ token: tokenForSpeaker }), alias: tokenName } : ChatMessage.getSpeaker({ actor: tokens[0]?.actor });
    const content = await renderTemplate(Templates.Chat.MultiDefenseResult, {
      attackLabel: attackData?.weaponId ? game.i18n.localize?.("chat.attackData.title") ?? "Ataque" : "Ataque",
      entries,
      hasRemaining: entries.some((e) => !e.applied && e.damageFinal > 0),
      messageId: randomID()
    });
    const cm = await ChatMessage.create({
      content,
      speaker,
      flags: {
        animabfguote13: {
          kind: "multiDefenseResult",
          sourceAttackMessageId: msg?.id ?? null,
          batch: { createdAt: Date.now() },
          entries: entries.map((e) => ({ ...e, applied: false }))
        }
      }
    });
    const content2 = await renderTemplate(Templates.Chat.MultiDefenseResult, {
      attackLabel: attackData?.weaponId ? game.i18n.localize?.("chat.attackData.title") ?? "Ataque" : "Ataque",
      entries: cm.getFlag(game.animabfguote13.id, "entries") ?? entries,
      hasRemaining: (cm.getFlag(game.animabfguote13.id, "entries") ?? entries).some(
        (e) => !e.applied && e.damageFinal > 0
      ),
      messageId: cm.id
    });
    await cm.update({ content: content2 });
  } catch (err) {
    console.error("[ABF] autoDefendActionHandler error:", err);
    ui.notifications?.error("No se pudo ejecutar la defensa automática.");
  }
}
const action = "auto-defend";
function canDefendWithToken(tok) {
  if (!tok?.actor) return false;
  if (game.user.isGM) return true;
  return tok.actor.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}
function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function entryFromAuto(r, tok) {
  return {
    actorId: r.actor.id,
    tokenId: r.token?.id ?? tok?.id ?? "",
    label: r.token?.name ?? tok?.name ?? r.actor.name,
    defenseTotal: Number(r.defenseTotal ?? 0),
    damageFinal: Number(
      r.combatResult?.damageFinal ?? r.combatResult?.damage?.final ?? r.combatResult?.finalDamage ?? r.combatResult?.damage ?? 0
    ),
    hasCounter: !!r.combatResult?.hasCounterAttack,
    counterAttackValue: Number(r.combatResult?.counterAttackValue ?? 0),
    applied: false
  };
}
export {
  action,
  autoDefendActionHandler as default
};
