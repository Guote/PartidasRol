export var ABFSettingsKeys;
(function (ABFSettingsKeys) {
    ABFSettingsKeys["AUTO_ACCEPT_COMBAT_REQUESTS"] = "AUTO_ACCEPT_COMBAT_REQUESTS";
    ABFSettingsKeys["ROUND_DAMAGE_IN_MULTIPLES_OF_5"] = "ROUND_DAMAGE_IN_MULTIPLES_OF_5";
    ABFSettingsKeys["SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT"] = "SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT";
    ABFSettingsKeys["USE_DAMAGE_TABLE"] = "USE_DAMAGE_TABLE";
    ABFSettingsKeys["DEVELOP_MODE"] = "DEVELOP_MODE";
})(ABFSettingsKeys || (ABFSettingsKeys = {}));
export const registerSettings = () => {
    const typedGame = game;
    typedGame.settings.register('animabf-guote', ABFSettingsKeys.AUTO_ACCEPT_COMBAT_REQUESTS, {
        name: 'anima.ui.systemSettings.autoAcceptCombatRequests.title',
        hint: 'anima.ui.systemSettings.autoAcceptCombatRequests.hint.title',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
    typedGame.settings.register('animabf-guote', ABFSettingsKeys.ROUND_DAMAGE_IN_MULTIPLES_OF_5, {
        name: 'anima.ui.systemSettings.roundDamageInMultiplesOf5.title',
        hint: 'anima.ui.systemSettings.roundDamageInMultiplesOf5.hint.title',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    typedGame.settings.register('animabf-guote', ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT, {
        name: 'anima.ui.systemSettings.sendRollMessagesOnCombatByDefault.title',
        hint: 'anima.ui.systemSettings.sendRollMessagesOnCombatByDefault.hint.title',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    typedGame.settings.register('animabf-guote', ABFSettingsKeys.USE_DAMAGE_TABLE, {
        name: 'anima.ui.systemSettings.useCombatTable.title',
        hint: 'anima.ui.systemSettings.useCombatTable.hint.title',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
    typedGame.settings.register('animabf-guote', ABFSettingsKeys.DEVELOP_MODE, {
        name: 'Develop mode',
        hint: 'Activate certain access to information. Only for developers',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
};
