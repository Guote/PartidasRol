import { WSGMCombatManager } from "./ws-combat/gm/WSGMCombatManager.js";
import { WSUserCombatManager } from "./ws-combat/user/WSUserCombatManager.js";
import { Log } from "../../../utils/Log.js";
export const registerCombatWebsocketRoutes = () => {
    const tgame = game;
    if (tgame.user?.isGM) {
        Log.log('Initialized Combat Manager as GM');
        const combatManager = new WSGMCombatManager(tgame);
        window.Websocket = {
            sendAttack: async () => {
                try {
                    combatManager.sendAttack();
                }
                catch (e) {
                    Log.error(e);
                    combatManager.endCombat();
                }
            }
        };
    }
    else {
        Log.log('Initialized Combat Manager as User');
        const combatManager = new WSUserCombatManager(tgame);
        window.Websocket = {
            sendAttackRequest: async () => {
                try {
                    combatManager.sendAttackRequest();
                }
                catch (e) {
                    Log.error(e);
                    combatManager.endCombat();
                }
            }
        };
    }
};
