/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// CONCATENATED MODULE: ./src/utils/constants.ts
const CONSTANTS = {
    module: { name: 'TokenHotbar' },
    socket: { scope: 'module.TokenHotbar' }
};

// CONCATENATED MODULE: ./src/utils/settings.ts

class settings_Settings {
    load(s, isCustomHotbarEnabled) {
        this.hotbarPage = this.getSetting(s, settings_Settings.keys.hotbarPage);
        this.alwaysLinkToActor = this.getSetting(s, settings_Settings.keys.alwaysLinkToActor);
        this.linkToLinkedActor = this.getSetting(s, settings_Settings.keys.linkToLinkedActor) || this.alwaysLinkToActor;
        this.shareHotbar = this.getSetting(s, settings_Settings.keys.shareHotbar);
        this.lockHotbar = this.getSetting(s, settings_Settings.keys.lockHotbar) && this.shareHotbar;
        this.debugMode = this.getSetting(s, settings_Settings.keys.debugMode);
        this.useCustomHotbar = this.getSetting(s, settings_Settings.keys.useCustomHotbar) && isCustomHotbarEnabled;
        return this;
    }
    static _load() {
        var _a;
        return new settings_Settings().load(game.settings, (_a = game.modules.get('custom-hotbar')) === null || _a === void 0 ? void 0 : _a.active);
    }
    getSetting(settings, key) {
        return settings.get(CONSTANTS.module.name, key);
    }
}
settings_Settings.keys = {
    alwaysLinkToActor: 'linkToActor',
    linkToLinkedActor: 'link',
    hotbarPage: 'page',
    shareHotbar: 'share',
    lockHotbar: 'lock',
    debugMode: 'debug',
    useCustomHotbar: 'customHotbar'
};

// CONCATENATED MODULE: ./src/flags/pageFlag.ts

class pageFlag_PageFlag {
    get() {
        const page = localStorage.getItem(`${CONSTANTS.module.name}.activePage`);
        if (page)
            return +page;
        return 1;
    }
    set(page) {
        localStorage.setItem(`${CONSTANTS.module.name}.activePage`, page + '');
    }
}

// CONCATENATED MODULE: ./src/utils/logger.ts
class ConsoleLogger {
    constructor(settings) {
        this.settings = settings;
    }
    error(...message) {
        console.error.apply(null, message);
    }
    warn(...message) {
        console.warn.apply(null, message);
    }
    info(...message) {
        console.info.apply(null, message);
    }
    debug(...message) {
        if (this.settings.debugMode)
            console.debug.apply(null, message);
    }
}

// CONCATENATED MODULE: ./src/hotbar/uiHotbar.ts
const calculatePageSlots = (page) => {
    function range(size, startAt = 0) {
        return [...Array(size).keys()].map(i => i + startAt);
    }
    return range(10, (page - 1) * 10 + 1);
};
const pickPageSlots = (page, allSlots) => {
    return calculatePageSlots(page)
        .reduce((acc, cur) => (acc[cur] = allSlots[cur], acc), {});
};

// CONCATENATED MODULE: ./src/hotbar/customHotbar.ts

class customHotbar_CustomHotbar {
    constructor(settings, hotbar, logger) {
        this.settings = settings;
        this.hotbar = hotbar;
        this.logger = logger;
    }
    toggleHotbar(showTokenBar) {
        return showTokenBar || canvas.tokens.controlled.length === 1 ? this.showTokenHotbar() : this.hideTokenHotbar();
    }
    onTokenHotbarPage() {
        return this.hotbar.page == this.getTokenHotbarPage();
    }
    getTokenHotbarPage() {
        return this.hotbar.page;
    }
    showTokenHotbar() {
        return this.hotbar.expand();
    }
    hideTokenHotbar() {
        return this.hotbar.collapse();
    }
    getMacrosByPage(page) {
        const allSlots = this.hotbar.populator.chbGetMacros() || {};
        const pageSlots = pickPageSlots(page, allSlots);
        return { hotbar: pageSlots };
    }
    setTokenMacros(page, data) {
        this.logger.debug('[Token Hotbar]', 'Updating Custom Hotbar', page, data);
        const continuousTokenHotbar = pickPageSlots(page, data.hotbar);
        const allSlots = this.getAllHotbarMacros();
        const combinedMacros = Object.assign({}, allSlots, continuousTokenHotbar);
        return this.hotbar.populator.chbSetMacros(combinedMacros);
    }
    currentPage() {
        return this.hotbar.page;
    }
    offset(data) {
        return data;
    }
    getAllHotbarMacros() {
        return this.hotbar.populator.chbGetMacros();
    }
}
class customHotbar_SinglePageCustomHotbar extends customHotbar_CustomHotbar {
    onTokenHotbarPage() {
        return true;
    }
    getTokenHotbarPage() {
        return this.settings.hotbarPage;
    }
    getMacrosByPage(page) {
        page = 1;
        const data = super.getMacrosByPage(page);
        const offset = this.calculatePageOffset();
        const offsetSlots = {};
        for (const slot in data.hotbar) {
            offsetSlots[+slot + offset] = data.hotbar[slot];
        }
        return { hotbar: offsetSlots };
    }
    setTokenMacros(page, data) {
        this.logger.debug('[Token Hotbar]', 'Updating Custom Hotbar', page, data);
        const offset = this.calculatePageOffset();
        const offsetSlots = {};
        for (const slot of calculatePageSlots(1)) {
            offsetSlots[slot] = data.hotbar[slot + offset];
        }
        return this.hotbar.populator.chbSetMacros(offsetSlots);
    }
    currentPage() {
        return this.getTokenHotbarPage();
    }
    offset(data) {
        const offset = this.calculatePageOffset();
        const offsetData = {};
        for (const key in data) {
            offsetData[+key + offset] = data[key];
        }
        return offsetData;
    }
    calculatePageOffset() {
        return this.settings.hotbarPage * 10 - 10;
    }
}

// CONCATENATED MODULE: ./src/hotbar/foundryHotbar.ts

class foundryHotbar_FoundryHotbar {
    constructor(settings, hotbar, pageFlag, logger) {
        this.settings = settings;
        this.hotbar = hotbar;
        this.pageFlag = pageFlag;
        this.logger = logger;
    }
    toggleHotbar(showTokenBar) {
        if (showTokenBar) {
            return this.showTokenHotbar();
        }
        else {
            return this.hideTokenHotbar();
        }
    }
    onTokenHotbarPage() {
        return this.hotbar.page == this.getTokenHotbarPage();
    }
    getTokenHotbarPage() {
        return this.settings.hotbarPage;
    }
    showTokenHotbar() {
        if (this.hotbar.page != this.getTokenHotbarPage())
            this.pageFlag.set(this.hotbar.page);
        return this.render(this.getTokenHotbarPage());
    }
    hideTokenHotbar() {
        if (this.hotbar.page != this.getTokenHotbarPage())
            return Promise.resolve();
        return this.render(this.pageFlag.get());
    }
    getMacrosByPage(page) {
        const allSlots = this.getAllHotbarMacros();
        const pageSlots = pickPageSlots(page, allSlots);
        return { hotbar: pageSlots };
    }
    setTokenMacros(page, data) {
        this.logger.debug('[Token Hotbar]', 'Updating Foundry Hotbar', page, data);
        const continuousTokenHotbar = pickPageSlots(page, data.hotbar);
        for (const slot in continuousTokenHotbar) {
            if (!continuousTokenHotbar[slot]) {
                this.unset(continuousTokenHotbar, +slot);
            }
        }
        const allSlots = this.getAllHotbarMacros();
        const combinedMacros = Object.assign({}, allSlots, continuousTokenHotbar);
        return game.user.update({ hotbar: combinedMacros });
    }
    currentPage() {
        return this.hotbar.page;
    }
    offset(data) {
        return data;
    }
    render(page) {
        this.hotbar.page = page;
        return new Promise((resolve) => {
            setTimeout(() => {
                this.hotbar.render();
                resolve();
            }, 5);
        });
    }
    unset(hotbar, slot) {
        delete hotbar[slot];
    }
    getAllHotbarMacros() {
        return game.user.data.hotbar;
    }
}

// CONCATENATED MODULE: ./src/hotbar/uiHotbarFactory.ts




class uiHotbarFactory_UiHotbarFactory {
    constructor(settings) {
        this.settings = settings;
    }
    getFoundryUiObject() {
        if (this.settings.useCustomHotbar) {
            return ui.CustomHotbar;
        }
        return ui.hotbar;
    }
    create() {
        const logger = new ConsoleLogger(this.settings);
        if (this.settings.useCustomHotbar) {
            return new customHotbar_SinglePageCustomHotbar(this.settings, ui.customHotbar, logger);
        }
        else {
            return new foundryHotbar_FoundryHotbar(this.settings, ui.hotbar, new pageFlag_PageFlag(), logger);
        }
    }
}

// CONCATENATED MODULE: ./src/flags/flagStrategies.ts
class FlagsStrategy {
    constructor(actors, tokens) {
        this.actors = actors;
        this.tokens = tokens;
    }
    getEntity(entityId) {
        const entity = this.actors.get(entityId) || this.tokens.get(entityId);
        if (!entity) {
            throw new Error(`No actor or token exists with id '${entityId}'`);
        }
        return entity;
    }
    isToken(entity) {
        return 'actor' in entity;
    }
}
class UserFlagsStrategy extends FlagsStrategy {
    constructor(user, actors, tokens) {
        super(actors, tokens);
        this.user = user;
    }
    get(_entityId) {
        return this.user;
    }
}
class IdentityFlagsStrategy extends FlagsStrategy {
    constructor(actors, tokens) {
        super(actors, tokens);
    }
    get(entityId) {
        return this.getEntity(entityId);
    }
}
class LinkedFlagsStrategy extends FlagsStrategy {
    get(entityId) {
        const entity = this.getEntity(entityId);
        return this.isToken(entity) && entity.data.actorLink && entity.actor
            ? this.actors.get(entity.actor.id)
            : entity;
    }
}
class AlwaysLinkedFlagsStrategy extends FlagsStrategy {
    get(entityId) {
        const entity = this.getEntity(entityId);
        if (this.isToken(entity) && entity.actor)
            return this.actors.get(entity.actor.id);
        return entity;
    }
}

// CONCATENATED MODULE: ./src/hotbar/tokenHotbar.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


class tokenHotbar_TokenHotbar {
    constructor(tokenId, existingMacroIds, hotbarFlags, flagKeyStrategy, logger) {
        this.tokenId = tokenId;
        this.existingMacroIds = existingMacroIds;
        this.hotbarFlags = hotbarFlags;
        this.flagKeyStrategy = flagKeyStrategy;
        this.logger = logger;
    }
    getMacrosByPage(page) {
        const tokenHotbars = this.hotbarFlags.get(this.tokenId);
        const flagKey = this.flagKeyStrategy.get(this.tokenId).id;
        const tokenHotbar = tokenHotbars[flagKey] || {};
        const tokenHotbarPage = {};
        const pageSlots = calculatePageSlots(page);
        for (const slot in tokenHotbar) {
            if (!pageSlots.includes(+slot))
                continue;
            const macroExists = this.existingMacroIds.some(m => m.id === tokenHotbar[slot]);
            if (macroExists) {
                tokenHotbarPage[slot] = tokenHotbar[slot];
            }
        }
        return { hotbar: tokenHotbarPage };
    }
    setTokenMacros(page, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const flagKey = this.flagKeyStrategy.get(this.tokenId).id;
            const tokenHotbars = this.hotbarFlags.get(this.tokenId);
            const tokenHotbar = tokenHotbars[flagKey] || {};
            this.logger.debug('[Token Hotbar]', 'Updating Token Hotbar', page, this.tokenId, flagKey, data);
            const newTokenHotbar = Object.assign({}, tokenHotbar, pickPageSlots(page, data.hotbar));
            tokenHotbars[flagKey] = newTokenHotbar;
            yield this.hotbarFlags.set(this.tokenId, tokenHotbars);
            return true;
        });
    }
    removeTokenMacros(actors, tokens) {
        const flagKey = new IdentityFlagsStrategy(actors, tokens).get(this.tokenId);
        const flags = this.hotbarFlags.get(this.tokenId);
        delete flags[flagKey.id];
        return this.hotbarFlags.set(this.tokenId, flags);
    }
    offset(data) {
        return data;
    }
}

// CONCATENATED MODULE: ./src/utils/foundry.ts
function duplicate(data) {
    return JSON.parse(JSON.stringify(data));
}

// CONCATENATED MODULE: ./src/flags/hotbarFlags.ts


class hotbarFlags_ModuleHotbarFlags {
    constructor(flagStrategy, logger) {
        this.flagStrategy = flagStrategy;
        this.logger = logger;
        this.key = 'hotbar-data';
    }
    get(tokenId) {
        const entity = this.flagStrategy.get(tokenId);
        const flags = entity.getFlag(CONSTANTS.module.name, this.key) || {};
        return duplicate(flags);
    }
    set(tokenId, data) {
        const entity = this.flagStrategy.get(tokenId);
        this.logger.debug('[Token Hotbar]', 'Storing data for token', tokenId, entity, this.key, data);
        this.updateKeysOfEmptySlots(data);
        return entity.setFlag(CONSTANTS.module.name, this.key, data);
    }
    updateKeysOfEmptySlots(data) {
        for (const tokenId in data) {
            for (const slot in data[tokenId]) {
                if (!data[tokenId][slot]) {
                    delete data[tokenId][slot];
                }
            }
        }
    }
}

// CONCATENATED MODULE: ./src/flags/factory.ts



class factory_HotbarFlagsFactory {
    constructor(settings) {
        this.settings = settings;
    }
    create() {
        const factory = new factory_FlagStrategyFactory(this.settings, game, canvas);
        return new hotbarFlags_ModuleHotbarFlags(factory.createFlagStrategy(), new ConsoleLogger(this.settings));
    }
}
class factory_FlagStrategyFactory {
    constructor(settings, game, canvas) {
        this.settings = settings;
        this.game = game;
        this.canvas = canvas;
    }
    createFlagStrategy() {
        if (this.settings.shareHotbar) {
            if (this.settings.alwaysLinkToActor) {
                return new AlwaysLinkedFlagsStrategy(this.game.actors, this.canvas.tokens);
            }
            if (this.settings.linkToLinkedActor) {
                return new LinkedFlagsStrategy(this.game.actors, this.canvas.tokens);
            }
            return new IdentityFlagsStrategy(this.game.actors, this.canvas.tokens);
        }
        return new UserFlagsStrategy(this.game.user, this.game.actors, this.canvas.tokens);
    }
    createFlagKeyStrategy() {
        if (this.settings.alwaysLinkToActor)
            return new AlwaysLinkedFlagsStrategy(this.game.actors, this.canvas.tokens);
        if (this.settings.linkToLinkedActor)
            return new LinkedFlagsStrategy(this.game.actors, this.canvas.tokens);
        return new IdentityFlagsStrategy(this.game.actors, this.canvas.tokens);
    }
}

// CONCATENATED MODULE: ./src/hotbar/deselectedHotbar.ts
var deselectedHotbar_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

class deselectedHotbar_DeselectedHotbar {
    constructor(existingMacroIds, hotbarFlags, logger) {
        this.existingMacroIds = existingMacroIds;
        this.hotbarFlags = hotbarFlags;
        this.logger = logger;
        this.flagKey = 'noTokenControlled';
    }
    getMacrosByPage(page) {
        const tokenHotbars = this.hotbarFlags.get(this.flagKey);
        const tokenHotbar = tokenHotbars[this.flagKey] || {};
        const tokenHotbarPage = {};
        const pageSlots = calculatePageSlots(page);
        for (const slot in tokenHotbar) {
            if (!pageSlots.includes(+slot))
                continue;
            const macroExists = this.existingMacroIds.some(m => m.id === tokenHotbar[slot]);
            if (macroExists) {
                tokenHotbarPage[slot] = tokenHotbar[slot];
            }
        }
        return { hotbar: tokenHotbarPage };
    }
    setTokenMacros(page, data) {
        return deselectedHotbar_awaiter(this, void 0, void 0, function* () {
            const tokenHotbars = this.hotbarFlags.get(this.flagKey);
            const tokenHotbar = tokenHotbars[this.flagKey] || {};
            this.logger.debug('[Token Hotbar]', 'Updating Token Hotbar', page, this.flagKey, this.flagKey, data);
            const newTokenHotbar = Object.assign({}, tokenHotbar, pickPageSlots(page, data.hotbar));
            tokenHotbars[this.flagKey] = newTokenHotbar;
            yield this.hotbarFlags.set(this.flagKey, tokenHotbars);
            return true;
        });
    }
    offset(data) {
        return data;
    }
}

// CONCATENATED MODULE: ./src/hotbar/tokenHotbarFactory.ts






class tokenHotbarFactory_TokenHotbarFactory {
    constructor(settings) {
        this.settings = settings;
    }
    create(tokenId) {
        const logger = new ConsoleLogger(this.settings);
        if (!tokenId) {
            return new deselectedHotbar_DeselectedHotbar(game.macros.entities, new hotbarFlags_ModuleHotbarFlags(new UserFlagsStrategy(game.user, game.actors, canvas.tokens), logger), logger);
        }
        const hotbarFlags = new factory_HotbarFlagsFactory(this.settings);
        const keyStrategy = new factory_FlagStrategyFactory(this.settings, game, canvas);
        return new tokenHotbar_TokenHotbar(tokenId, game.macros.entities, hotbarFlags.create(), keyStrategy.createFlagKeyStrategy(), new ConsoleLogger(this.settings));
    }
    createRemover(tokenId) {
        const hotbarFlags = new factory_HotbarFlagsFactory(this.settings);
        const keyStrategy = new factory_FlagStrategyFactory(this.settings, game, canvas);
        return new tokenHotbar_TokenHotbar(tokenId, game.macros.entities, hotbarFlags.create(), keyStrategy.createFlagKeyStrategy(), new ConsoleLogger(this.settings));
    }
}

// CONCATENATED MODULE: ./src/controller.ts
var controller_awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};




class controller_TokenHotbarController {
    constructor(settings, uiHotbar, socket, tokenHotbar, logger) {
        this.settings = settings;
        this.uiHotbar = uiHotbar;
        this.socket = socket;
        this.tokenHotbar = tokenHotbar;
        this.logger = logger;
    }
    save(user, tokenId, hotbarUpdate) {
        return controller_awaiter(this, void 0, void 0, function* () {
            if (!this.uiHotbar.onTokenHotbarPage())
                return;
            const updates = this.transformHotbarUpdate(hotbarUpdate);
            const hotbarPage = this.uiHotbar.getTokenHotbarPage();
            const oldHotbarMacros = this.uiHotbar.getMacrosByPage(hotbarPage);
            const combinedMacros = Object.assign({}, oldHotbarMacros.hotbar, this.uiHotbar.offset(updates));
            const tokenMacros = this.tokenHotbar.getMacrosByPage(hotbarPage);
            if (this.hasChanges(hotbarPage, combinedMacros, tokenMacros.hotbar)) {
                if (!this.settings.lockHotbar || user.isGM) {
                    this.logger.debug('[Token Hotbar]', 'Applying update', hotbarPage, hotbarUpdate, updates);
                    yield this.tokenHotbar.setTokenMacros(hotbarPage, { hotbar: combinedMacros });
                    if (tokenId)
                        this.triggerReload(user, tokenId);
                }
                else
                    ui.notifications.warn(game.i18n.localize('TokenHotbar.notifications.lockedWarning'));
            }
        });
    }
    triggerReload(user, tokenId) {
        const msg = {
            type: 'updateTokenHotbar',
            userId: user.id,
            tokenId: tokenId
        };
        this.socket.emit('module.TokenHotbar', msg);
    }
    reload() {
        return controller_awaiter(this, void 0, void 0, function* () {
            const hotbarPage = this.uiHotbar.getTokenHotbarPage();
            if (this.uiHotbar.currentPage() != hotbarPage)
                return;
            const tokenHotbarMacros = this.tokenHotbar.getMacrosByPage(hotbarPage);
            const uiHotbarMacros = this.uiHotbar.getMacrosByPage(hotbarPage);
            if (!this.hasChanges(hotbarPage, tokenHotbarMacros.hotbar, uiHotbarMacros.hotbar))
                return;
            return this.load();
        });
    }
    load() {
        return controller_awaiter(this, void 0, void 0, function* () {
            const hotbarPage = this.uiHotbar.getTokenHotbarPage();
            const tokenMacros = this.tokenHotbar.getMacrosByPage(hotbarPage);
            yield this.uiHotbar.setTokenMacros(hotbarPage, tokenMacros);
            this.logger.debug('[Token Hotbar]', 'Rendering Hotbar', tokenMacros.hotbar);
            const macros = Object.values(tokenMacros.hotbar);
            this.uiHotbar.toggleHotbar(macros.length > 0 && macros.every(macro => !!macro));
        });
    }
    hasChanges(page, macros, tokenMacros) {
        const slots = calculatePageSlots(page);
        return slots.some(slot => macros[slot] != tokenMacros[slot]);
    }
    transformHotbarUpdate(hotbarUpdate) {
        return Object.keys(hotbarUpdate).reduce((update, key) => {
            if (isNaN(+key)) {
                update[key.substring(2)] = hotbarUpdate[key];
            }
            else {
                update[key] = hotbarUpdate[key];
            }
            return update;
        }, {});
    }
}
class controller_ControllerFactory {
    constructor(settings) {
        this.settings = settings;
    }
    create(token) {
        return new controller_TokenHotbarController(this.settings, new uiHotbarFactory_UiHotbarFactory(this.settings).create(), game.socket, new tokenHotbarFactory_TokenHotbarFactory(this.settings).create(token === null || token === void 0 ? void 0 : token.id), new ConsoleLogger(this.settings));
    }
}

// CONCATENATED MODULE: ./src/main.ts







Hooks.on('init', () => {
    var _a;
    const hasCustomHotbar = (_a = game.modules.get('custom-hotbar')) === null || _a === void 0 ? void 0 : _a.active;
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.useCustomHotbar, {
        name: 'TokenHotbar.settings.useCustomHotbar.name',
        hint: 'TokenHotbar.settings.useCustomHotbar.hint',
        scope: 'world',
        config: hasCustomHotbar,
        default: false,
        type: Boolean
    });
    if (!hasCustomHotbar) {
        game.settings.set(CONSTANTS.module.name, settings_Settings.keys.useCustomHotbar, false);
    }
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.hotbarPage, {
        name: 'TokenHotbar.settings.page.name',
        hint: 'TokenHotbar.settings.page.hint',
        scope: 'world',
        config: !game.settings.get(CONSTANTS.module.name, settings_Settings.keys.useCustomHotbar),
        default: 5,
        type: Number,
        range: { min: 1, max: 5, step: 1 }
    });
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.linkToLinkedActor, {
        name: 'TokenHotbar.settings.linkToActor.name',
        hint: 'TokenHotbar.settings.linkToActor.hint',
        scope: 'world',
        config: true,
        default: true,
        type: Boolean
    });
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.alwaysLinkToActor, {
        name: 'TokenHotbar.settings.alwaysLinkToActor.name',
        hint: 'TokenHotbar.settings.alwaysLinkToActor.hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.shareHotbar, {
        name: 'TokenHotbar.settings.shareHotbar.name',
        hint: 'TokenHotbar.settings.shareHotbar.hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.lockHotbar, {
        name: 'TokenHotbar.settings.lockHotbar.name',
        hint: 'TokenHotbar.settings.lockHotbar.hint',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register(CONSTANTS.module.name, settings_Settings.keys.debugMode, {
        name: 'TokenHotbar.settings.debugMode.name',
        hint: 'TokenHotbar.settings.debugMode.hint',
        scope: 'client',
        config: true,
        default: false,
        type: Boolean
    });
    console.log('[Token Hotbar]', 'Initialized Token Hotbar');
});
Hooks.on('preUpdateUser', (_, updateData) => {
    var _a, _b;
    const chbFlag = 'custom-hotbar';
    const chbKey = 'chbMacroMap';
    const settings = settings_Settings._load();
    const token = canvas.tokens.controlled[0];
    const controller = new controller_ControllerFactory(settings_Settings._load()).create(token);
    if (settings.useCustomHotbar && ((_b = (_a = updateData.flags) === null || _a === void 0 ? void 0 : _a[chbFlag]) === null || _b === void 0 ? void 0 : _b[chbKey]))
        controller.save(game.user, token === null || token === void 0 ? void 0 : token.id, updateData.flags[chbFlag][chbKey]);
    return true;
});
Hooks.on('updateUser', (_, updateData) => {
    const settings = settings_Settings._load();
    const token = canvas.tokens.controlled[0];
    const controller = new controller_ControllerFactory(settings_Settings._load()).create(token);
    if (!settings.useCustomHotbar && updateData.hotbar)
        controller.save(game.user, token === null || token === void 0 ? void 0 : token.id, updateData.hotbar);
    return true;
});
let controlTokenTimeout;
Hooks.on('controlToken', () => {
    if (controlTokenTimeout)
        clearTimeout(controlTokenTimeout);
    controlTokenTimeout = window.setTimeout(() => {
        const token = canvas.tokens.controlled[0];
        const settings = settings_Settings._load();
        new controller_ControllerFactory(settings)
            .create(token)
            .load();
    }, 100);
});
let sharedRenderTimeout;
function reload(tokenId) {
    const token = canvas.tokens.controlled[0];
    if (!token)
        return;
    const settings = settings_Settings._load();
    const strategy = new factory_FlagStrategyFactory(settings, game, canvas)
        .createFlagStrategy();
    if (canvas.tokens.controlled.length != 1 || !settings.shareHotbar)
        return true;
    if (strategy.get(tokenId).id !== strategy.get(token.id).id)
        return true;
    if (sharedRenderTimeout)
        clearTimeout(sharedRenderTimeout);
    sharedRenderTimeout = window.setTimeout(() => {
        new controller_ControllerFactory(settings_Settings._load())
            .create(token)
            .reload();
    }, 100);
}
Hooks.on('preDeleteToken', (_, token) => {
    new tokenHotbarFactory_TokenHotbarFactory(settings_Settings._load())
        .createRemover(token._id)
        .removeTokenMacros(game.actors, canvas.tokens);
    return true;
});
Hooks.on('preDeleteActor', (actor) => {
    new tokenHotbarFactory_TokenHotbarFactory(settings_Settings._load())
        .createRemover(actor._id)
        .removeTokenMacros(game.actors, canvas.tokens);
    return true;
});
Hooks.on('ready', () => {
    game.socket.on('module.TokenHotbar', msg => {
        new ConsoleLogger(settings_Settings._load()).debug('Token Hotbar | Message received', msg);
        if (msg.type === 'updateTokenHotbar')
            reload(msg.tokenId);
    });
});
Hooks.once('renderCustomHotbar', () => {
    const settings = settings_Settings._load();
    const factory = new uiHotbarFactory_UiHotbarFactory(settings);
    factory.create().toggleHotbar(canvas.tokens.controlled.length === 1);
});


/***/ })
/******/ ]);