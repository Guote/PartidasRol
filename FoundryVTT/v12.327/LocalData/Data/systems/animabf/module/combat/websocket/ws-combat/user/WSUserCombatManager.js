import { Logger } from "../../../../../utils/log.js";
import { WSCombatManager } from "../WSCombatManager.js";
import { GMMessageTypes } from "../gm/WSGMCombatMessageTypes.js";
import { UserMessageTypes } from "./WSUserCombatMessageTypes.js";
import { CombatAttackDialog } from "../../../../dialogs/combat/CombatAttackDialog.js";
import { CombatDefenseDialog } from "../../../../dialogs/combat/CombatDefenseDialog.js";
import { PromptDialog } from "../../../../dialogs/PromptDialog.js";
import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
import { getTargetToken } from "../util/getTargetToken.js";
import { assertCurrentScene } from "../util/assertCurrentScene.js";
import { assertGMActive } from "../util/assertGMActive.js";
import { getSelectedToken } from "../util/getSelectedToken.js";
class WSUserCombatManager extends WSCombatManager {
  receive(msg) {
    switch (msg.type) {
      case GMMessageTypes.RequestToAttackResponse:
        this.manageAttackRequestResponse(msg);
        break;
      case GMMessageTypes.CancelCombat:
        this.manageCancelCombat();
        break;
      case GMMessageTypes.Attack:
        this.manageDefend(msg);
        break;
      case GMMessageTypes.CounterAttack:
        this.manageCounterAttack(msg);
        break;
      default:
        Logger.warn("Unknown message", msg);
    }
  }
  endCombat() {
    if (this.attackDialog) {
      this.attackDialog.close({ force: true });
      this.attackDialog = void 0;
    }
    if (this.defenseDialog) {
      this.defenseDialog.close({ force: true });
      this.defenseDialog = void 0;
    }
  }
  manageCancelCombat() {
    this.endCombat();
  }
  get user() {
    return this.game.user;
  }
  isMyToken(tokenId) {
    return this.game.canvas.tokens?.ownedTokens.filter((tk) => tk.id === tokenId).length === 1;
  }
  async sendAttackRequest() {
    assertGMActive();
    assertCurrentScene();
    if (!this.user) return;
    const attackerToken = getSelectedToken(this.game);
    const { targets } = this.user;
    const targetToken = getTargetToken(attackerToken, targets);
    await ABFDialogs.confirm(
      this.game.i18n.format("macros.combat.dialog.attackConfirm.title"),
      this.game.i18n.format("macros.combat.dialog.attackConfirm.body.title", {
        target: targetToken.name
      }),
      {
        onConfirm: () => {
          if (attackerToken?.id && targetToken.id) {
            const msg = {
              type: UserMessageTypes.RequestToAttack,
              senderId: this.user.id,
              payload: {
                attackerTokenId: attackerToken.id,
                defenderTokenId: targetToken.id
              }
            };
            this.emit(msg);
            this.attackDialog = new CombatAttackDialog(attackerToken, targetToken, {
              onAttack: (result) => {
                const newMsg = {
                  type: UserMessageTypes.Attack,
                  payload: result
                };
                this.emit(newMsg);
              }
            });
          }
        }
      }
    );
  }
  async manageCounterAttack(msg) {
    const { attackerTokenId, defenderTokenId } = msg.payload;
    if (!this.isMyToken(attackerTokenId)) {
      return;
    }
    const attacker = this.findTokenById(attackerTokenId);
    const defender = this.findTokenById(defenderTokenId);
    this.attackDialog = new CombatAttackDialog(
      attacker,
      defender,
      {
        onAttack: (result) => {
          const newMsg = {
            type: UserMessageTypes.Attack,
            payload: result
          };
          this.emit(newMsg);
        }
      },
      {
        allowed: true,
        counterAttackBonus: msg.payload.counterAttackBonus
      }
    );
  }
  async manageAttackRequestResponse(msg) {
    if (msg.toUserId !== this.user.id) return;
    if (!this.attackDialog) return;
    if (msg.payload.allowed) {
      this.attackDialog.updatePermissions(msg.payload.allowed);
    } else {
      this.endCombat();
      if (msg.payload.alreadyInACombat) {
        new PromptDialog(
          this.game.i18n.localize("macros.combat.dialog.error.alreadyInCombat.title")
        );
      } else {
        new PromptDialog(
          this.game.i18n.localize("macros.combat.dialog.error.requestRejected.title")
        );
      }
    }
  }
  async manageDefend(msg) {
    const { result, attackerTokenId, defenderTokenId } = msg.payload;
    if (!this.isMyToken(defenderTokenId)) {
      return;
    }
    const attacker = this.findTokenById(attackerTokenId);
    const defender = this.findTokenById(defenderTokenId);
    try {
      this.defenseDialog = new CombatDefenseDialog(
        {
          token: attacker,
          attackType: result.type,
          critic: result.values.critic,
          visible: result.values.visible,
          projectile: result.values.projectile,
          damage: result.values.damage,
          distance: result.values.distance
        },
        defender,
        {
          onDefense: (res) => {
            const newMsg = {
              type: UserMessageTypes.Defend,
              payload: res
            };
            this.emit(newMsg);
          }
        }
      );
    } catch (err) {
      if (err) {
        Logger.error(err);
      }
      this.endCombat();
    }
  }
}
export {
  WSUserCombatManager
};
