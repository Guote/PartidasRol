import { Logger } from "../../../../../utils/log.js";
import { WSCombatManager } from "../WSCombatManager.js";
import { GMMessageTypes } from "./WSGMCombatMessageTypes.js";
import { UserMessageTypes } from "../user/WSUserCombatMessageTypes.js";
import { GMCombatDialog } from "../../../../dialogs/combat/GMCombatDialog.js";
import { CombatDialogs } from "../../dialogs/CombatDialogs.js";
import { CombatDefenseDialog } from "../../../../dialogs/combat/CombatDefenseDialog.js";
import { CombatAttackDialog } from "../../../../dialogs/combat/CombatAttackDialog.js";
import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
import { canOwnerReceiveMessage } from "../util/canOwnerReceiveMessage.js";
import { getTargetToken } from "../util/getTargetToken.js";
import { assertCurrentScene } from "../util/assertCurrentScene.js";
import { ABFSettingsKeys } from "../../../../../utils/registerSettings.js";
class WSGMCombatManager extends WSCombatManager {
  receive(msg) {
    switch (msg.type) {
      case UserMessageTypes.RequestToAttack:
        this.manageUserAttackRequest(msg);
        break;
      case UserMessageTypes.Attack:
        this.manageUserAttack(msg);
        break;
      case UserMessageTypes.Defend:
        this.manageUserDefense(msg);
        break;
      default:
        Logger.warn("Unknown message", msg);
    }
  }
  async manageUserAttack(msg) {
    if (this.combat) {
      this.combat.updateAttackerData(msg.payload);
      const { attackerToken, defenderToken, defenderActor } = this.combat;
      const { critic } = msg.payload.values;
      const { visible } = msg.payload.values;
      const { projectile } = msg.payload.values;
      const { damage } = msg.payload.values;
      const { distance } = msg.payload.values;
      if (canOwnerReceiveMessage(defenderActor)) {
        const newMsg = {
          type: GMMessageTypes.Attack,
          payload: {
            attackerTokenId: attackerToken.id,
            defenderTokenId: defenderToken.id,
            result: msg.payload
          }
        };
        this.emit(newMsg);
      } else {
        try {
          this.manageDefense(
            attackerToken,
            defenderToken,
            msg.payload.type,
            critic,
            visible,
            projectile,
            damage,
            distance
          );
        } catch (err) {
          if (err) {
            Logger.error(err);
          }
          this.endCombat();
        }
      }
    } else {
      Logger.warn("User attack received but none combat is running");
    }
  }
  manageUserDefense(msg) {
    if (this.combat) {
      this.combat.updateDefenderData(msg.payload);
    } else {
      Logger.warn("User attack received but none combat is running");
    }
  }
  endCombat() {
    if (this.combat) {
      const msg = {
        type: GMMessageTypes.CancelCombat,
        combatId: this.combat.id
      };
      this.emit(msg);
      this.combat.close({ executeHook: false });
      this.combat = void 0;
    }
    if (this.defendDialog) {
      this.defendDialog.close({ force: true });
      this.defendDialog = void 0;
    }
    if (this.attackDialog) {
      this.attackDialog.close({ force: true });
      this.attackDialog = void 0;
    }
  }
  async sendAttack() {
    assertCurrentScene();
    const { user } = this.game;
    if (!user) return;
    const { targets } = user;
    const selectedToken = this.game.scenes?.current?.tokens.find(
      (t) => t.object?.controlled
    );
    if (!selectedToken) {
      ABFDialogs.prompt(
        this.game.i18n.localize("macros.combat.dialog.error.noSelectedToken.title")
      );
      return;
    }
    const targetToken = getTargetToken(selectedToken, targets);
    if (selectedToken?.id) {
      await ABFDialogs.confirm(
        this.game.i18n.format("macros.combat.dialog.attackConfirm.title"),
        this.game.i18n.format("macros.combat.dialog.attackConfirm.body.title", {
          target: targetToken.name
        }),
        {
          onConfirm: () => {
            if (selectedToken?.id && targetToken?.id) {
              this.combat = this.createNewCombat(selectedToken, targetToken);
              this.manageAttack(selectedToken, targetToken);
            }
          }
        }
      );
    } else {
      ABFDialogs.prompt(
        this.game.i18n.localize("macros.combat.dialog.error.noSelectedActor.title")
      );
    }
  }
  async manageUserAttackRequest(msg) {
    if (this.combat) {
      const newMsg = {
        type: GMMessageTypes.RequestToAttackResponse,
        toUserId: msg.senderId,
        payload: {
          allowed: false,
          alreadyInACombat: true
        }
      };
      this.emit(newMsg);
      return;
    }
    const { attackerTokenId, defenderTokenId } = msg.payload;
    const attacker = this.findTokenById(attackerTokenId);
    const defender = this.findTokenById(defenderTokenId);
    if (!attacker || !defender) {
      Logger.warn(
        "Can not handle user attack request due attacker or defender actor do not exist"
      );
      return;
    }
    try {
      if (!this.game.settings.get("animabf-guote", ABFSettingsKeys.AUTO_ACCEPT_COMBAT_REQUESTS)) {
        await CombatDialogs.openCombatRequestDialog({
          attacker: attacker.actor,
          defender: defender.actor
        });
      }
      this.combat = this.createNewCombat(attacker, defender);
      const newMsg = {
        type: GMMessageTypes.RequestToAttackResponse,
        toUserId: msg.senderId,
        payload: { allowed: true }
      };
      this.emit(newMsg);
    } catch (err) {
      if (err) {
        Logger.error(err);
      }
      const newMsg = {
        type: GMMessageTypes.RequestToAttackResponse,
        toUserId: msg.senderId,
        payload: { allowed: false }
      };
      this.emit(newMsg);
    }
  }
  createNewCombat(attacker, defender) {
    return new GMCombatDialog(attacker, defender, {
      onClose: () => {
        this.endCombat();
      },
      onCounterAttack: (bonus) => {
        this.endCombat();
        this.combat = new GMCombatDialog(
          defender,
          attacker,
          {
            onClose: () => {
              this.endCombat();
            },
            onCounterAttack: () => {
              this.endCombat();
            }
          },
          {
            isCounter: true,
            counterAttackBonus: bonus
          }
        );
        if (canOwnerReceiveMessage(defender.actor)) {
          const newMsg = {
            type: GMMessageTypes.CounterAttack,
            payload: {
              attackerTokenId: defender.id,
              defenderTokenId: attacker.id,
              counterAttackBonus: bonus
            }
          };
          this.emit(newMsg);
        } else {
          this.manageAttack(defender, attacker, bonus);
        }
      }
    });
  }
  manageAttack(attacker, defender, bonus) {
    this.attackDialog = new CombatAttackDialog(
      attacker,
      defender,
      {
        onAttack: (result) => {
          this.attackDialog?.close({ force: true });
          this.attackDialog = void 0;
          if (this.combat) {
            this.combat.updateAttackerData(result);
            if (canOwnerReceiveMessage(defender.actor)) {
              const newMsg = {
                type: GMMessageTypes.Attack,
                payload: {
                  attackerTokenId: attacker.id,
                  defenderTokenId: defender.id,
                  result
                }
              };
              this.emit(newMsg);
            } else {
              const { critic } = result.values;
              const { visible } = result.values;
              const { projectile } = result.values;
              const { damage } = result.values;
              const { distance } = result.values;
              try {
                this.manageDefense(
                  attacker,
                  defender,
                  result.type,
                  critic,
                  visible,
                  projectile,
                  damage,
                  distance
                );
              } catch (err) {
                if (err) {
                  Logger.error(err);
                }
                this.endCombat();
              }
            }
          }
        }
      },
      { counterAttackBonus: bonus }
    );
  }
  manageDefense(attacker, defender, attackType, critic, visible, projectile, damage, distance) {
    this.defendDialog = new CombatDefenseDialog(
      {
        token: attacker,
        attackType,
        critic,
        visible,
        projectile,
        damage,
        distance
      },
      defender,
      {
        onDefense: (result) => {
          if (this.defendDialog) {
            this.defendDialog.close({ force: true });
            this.defendDialog = void 0;
            if (this.combat) {
              this.combat.updateDefenderData(result);
            }
          }
        }
      }
    );
  }
}
export {
  WSGMCombatManager
};
