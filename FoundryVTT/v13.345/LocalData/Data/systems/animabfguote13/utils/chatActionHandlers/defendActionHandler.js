import { DefenseConfigurationDialog } from "../../module/dialogs/DefenseConfigurationDialog.js";
async function defendActionHandler(message, _html, dataset) {
  try {
    const msg = game.messages.get(dataset.messageId ?? message?.id);
    if (!msg)
      return ui.notifications?.warn(game.i18n.localize("chat.common.msgNotFound"));
    const attackData = (typeof dataset.attackData === "string" ? safeParseJSON(dataset.attackData) : dataset.attackData) || msg.getFlag(game.animabfguote13.id, "attackData") || msg.flags?.animabfguote13?.attackData || null;
    if (!attackData)
      return ui.notifications?.warn(game.i18n.localize("chat.defend.noAttackData"));
    const weaponId = dataset.weaponId ?? attackData?.weaponId;
    const controlled = canvas.tokens?.controlled ?? [];
    if (controlled.length > 1) {
      return ui.notifications?.warn(
        game.i18n.localize("chat.defend.multiSelectedNotSupported")
      );
    }
    let defenderToken = controlled[0] ?? autoPickOwnableTargetToken(msg) ?? game.user?.character?.getActiveTokens?.()?.[0] ?? null;
    if (!defenderToken) {
      return ui.notifications?.warn(game.i18n.localize("chat.defend.pickAToken"));
    }
    if (!game.user.isGM) {
      const ok = defenderToken.actor?.testUserPermission?.(
        game.user,
        CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
      if (!ok)
        return ui.notifications?.warn(game.i18n.localize("chat.defend.noPermission"));
    }
    let attackerToken = message?.speaker?.token ? canvas.tokens.get(message.speaker.token) : null;
    if (!attackerToken && attackData.attackerId) {
      attackerToken = canvas.tokens.placeables.find((t) => t.actor?.id === attackData.attackerId) ?? null;
    }
    new DefenseConfigurationDialog(
      {
        defender: defenderToken,
        attacker: attackerToken ?? void 0,
        weaponId,
        attackData,
        messageId: msg.id
      },
      { allowed: true }
    ).render(true);
  } catch (err) {
    console.error("[ABF] defendActionHandler error:", err);
    ui.notifications?.error(game.i18n.localize("chat.defend.openFailed"));
  }
}
const action = "defend";
function safeParseJSON(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function autoPickOwnableTargetToken(msg) {
  try {
    const targets = msg.getFlag(game.animabfguote13.id, "targets");
    if (!Array.isArray(targets) || targets.length !== 1) return null;
    const t = targets[0];
    let tok = t.tokenUuid ? canvas.tokens.get(t.tokenUuid) : null;
    if (!tok && t.actorUuid) {
      tok = canvas.tokens.placeables.find((tt) => tt.actor?.id === t.actorUuid) ?? null;
    }
    if (!tok) return null;
    if (game.user.isGM) return tok;
    const isOwner = tok.actor?.testUserPermission?.(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    );
    return isOwner ? tok : null;
  } catch {
    return null;
  }
}
export {
  action,
  defendActionHandler as default
};
