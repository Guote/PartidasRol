import { ABFSettingsKeys } from "../../../utils/registerSettings.js";
export const calculateDamage = (attack, defense, at, damage, halvedAbs = false) => {
    const useCombatTable = game.settings.get('animabf-guote', ABFSettingsKeys.USE_DAMAGE_TABLE);
    const ignoreBaseAbsorption = game.settings.get('animabf-guote', ABFSettingsKeys.IGNORE_BASE_ABSORPTION);
    let baseAbs = ignoreBaseAbsorption ? 0 : 20;
    let diference = attack - defense;
    let percent = 0;
    let abs = at * 10 + baseAbs;

    abs = halvedAbs ? Math.floor(abs / 2) : abs;
    percent = Math.floor((diference - abs) / 10) * 10;
    
    const damageRoundedToCeil10Multiplier = Math.ceil(damage / 10) * 10;
    const dealDamage = (damageRoundedToCeil10Multiplier * percent) / 100;
    return Math.max(dealDamage, 0);
};
