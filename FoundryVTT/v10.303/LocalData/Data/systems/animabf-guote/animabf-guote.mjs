import { registerSettings } from './utils/registerSettings.js';
import { preloadTemplates } from './utils/preloadTemplates.js';
import ABFActorSheet from './module/actor/ABFActorSheet.js';
import ABFActorSheetV2 from './module/actor/ABFActorSheetV2.js';
import SimpleActorSheet from './module/actor/SimpleActorSheet.js';
import ABFFoundryRoll from './module/rolls/ABFFoundryRoll.js';
import ABFCombat from './module/combat/ABFCombat.js';
import { ABFActor } from './module/actor/ABFActor.js';
import { registerHelpers } from './utils/handlebars-helpers/registerHelpers.js';
import ABFItemSheet from './module/items/ABFItemSheet.js';
import { ABFConfig } from './module/ABFConfig.js';
import ABFItem from './module/items/ABFItem.js';
import { registerCombatWebsocketRoutes } from './module/combat/websocket/registerCombatWebsocketRoutes.js';
import { attachCustomMacroBar } from './utils/attachCustomMacroBar.js';
import { ChatCombatManager } from './module/combat/chat-combat/ChatCombatManager.js';
import { ABFMacros } from './module/macros/ABFMacros.js';
import { registerMasaHooks } from './module/actor/hooks/registerMasaHooks.js';
/* ------------------------------------ */
/* Initialize system */
/* ------------------------------------ */
Hooks.once('init', async () => {
    console.log('AnimaBF | Initializing system');
    // Assign custom classes and constants here
    CONFIG.Actor.documentClass = ABFActor;
    CONFIG.config = ABFConfig;
    window.ABFFoundryRoll = ABFFoundryRoll;
    CONFIG.Dice.rolls = [ABFFoundryRoll, ...CONFIG.Dice.rolls];
    CONFIG.Combat.documentClass = ABFCombat;
    CONFIG.Combat.initiative = {
        formula: '1d100Initiative',
        decimals: 2
    };
    CONFIG.Item.documentClass = ABFItem;
    // Register custom sheets (if any)
    // Actors.unregisterSheet('core', ActorSheet);
    Actors.registerSheet('abf', ABFActorSheet, { makeDefault: true });
    Actors.registerSheet('abf', ABFActorSheetV2);
    Actors.registerSheet('abf', SimpleActorSheet, { label: 'Simple Sheet' });
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet('abf', ABFItemSheet, {
        makeDefault: true
    });
    // Register custom system settings
    registerSettings();
    registerHelpers();
    // Preload Handlebars templates
    await preloadTemplates();
});
/* ------------------------------------ */
/* Setup system */
/* ------------------------------------ */
Hooks.once('setup', () => {
    // Do anything after initialization but before
    // ready
});
/* ------------------------------------ */
/* When ready */
/* ------------------------------------ */
Hooks.once('ready', () => {
    registerCombatWebsocketRoutes();
    attachCustomMacroBar();
    registerMasaHooks();

    // Initialize chat-based combat system
    window.ChatCombat = new ChatCombatManager();

    // Expose macros globally for GM scripts
    window.ABFMacros = ABFMacros;
});
// Handle custom drag-to-hotbar for attack button
Hooks.on('hotbarDrop', async (bar, data, slot) => {
    if (data.type !== 'ABFAttackDialog') return true;
    const command = data.command;
    const name = data.name;
    const img = data.img || 'icons/skills/melee/strike-sword-slashing-red.webp';
    let macro = game.macros.find(m => m.name === name && m.command === command);
    if (!macro) {
        macro = await Macro.create({
            name,
            type: 'script',
            img,
            command,
            flags: { 'animabf-guote': { attackMacro: true } }
        });
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
});

// Add any additional hooks if necessary
// This function allow us to use xRoot in templates to extract the root object in Handlebars template
// So, instead to do ../../../ etc... to obtain rootFolder, use xRoot instead
// https://handlebarsjs.com/guide/expressions.html#path-expressions
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line func-names
Handlebars.JavaScriptCompiler.prototype.nameLookup = function (parent, name) {
    if (name.indexOf('xRoot') === 0) {
        return 'data.root';
    }
    if (/^[0-9]+$/.test(name)) {
        return `${parent}[${name}]`;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
        return `${parent}.${name}`;
    }
    return `${parent}['${name}']`;
};
