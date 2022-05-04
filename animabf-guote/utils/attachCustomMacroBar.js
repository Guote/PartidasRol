import { renderTemplates } from "../module/utils/renderTemplates.js";
import { Templates } from "../module/utils/constants.js";
import { ABFMacros } from "../module/macros/ABFMacros.js";
import { ABFSettingsKeys } from "./registerSettings.js";
import { Log } from "./Log.js";
import { PromptDialog } from "../module/dialogs/PromptDialog.js";
const DEFAULT_GM_MACROS = [
    {
        macroSelectorId: '#custom-hotbar-damage-calculator',
        hotkey: e => e.ctrlKey && e.key === '1',
        fn: () => ABFMacros.damageCalculator()
    },
    {
        macroSelectorId: '#custom-hotbar-send-attack',
        hotkey: e => e.ctrlKey && e.key === '2',
        fn: () => window.Websocket.sendAttack?.()
    }
];
const DEFAULT_USER_MACROS = [
    {
        macroSelectorId: '#custom-hotbar-send-attack-request',
        hotkey: e => e.ctrlKey && e.key === '1',
        fn: () => window.Websocket.sendAttackRequest?.()
    }
];
export const attachCustomMacroBar = async () => {
    const tgame = game;
    const isGM = tgame.user?.isGM;
    const [customHotbarHTML] = await renderTemplates({
        name: Templates.CustomHotBar,
        context: {
            isGM
        }
    });
    $('.system-animabf-guote').append(customHotbarHTML);
    const defaultMacroConfigs = isGM ? DEFAULT_GM_MACROS : DEFAULT_USER_MACROS;
    if (tgame.settings.get('animabf-guote', ABFSettingsKeys.DEVELOP_MODE) && isGM) {
        defaultMacroConfigs.push({
            hotkey: e => e.ctrlKey && e.key === 'd',
            fn() {
                Log.log('Debug');
                return new PromptDialog('This is a test, are you ready to explode?');
            }
        });
    }
    for (const config of defaultMacroConfigs) {
        if (config.macroSelectorId) {
            $(config.macroSelectorId).click(() => {
                config.fn();
            });
        }
    }
    document.addEventListener('keyup', () => {
        for (const config of defaultMacroConfigs) {
            if (config.macroSelectorId) {
                $(config.macroSelectorId).removeClass('hover');
            }
        }
    });
    document.addEventListener('keydown', e => {
        for (const config of defaultMacroConfigs) {
            if (e.ctrlKey && config.macroSelectorId) {
                $(config.macroSelectorId).addClass('hover');
            }
            if (config.hotkey(e)) {
                e.preventDefault();
                config.fn();
            }
        }
    });
};
