(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._handleOpen = void 0;
/**
 * The PDFoundry API.
 *
 * You can access the API with `ui.PDFoundry`.
 * @moduledefinition API
 */
const Util_1 = require("./Util");
const StaticViewer_1 = __importDefault(require("./viewer/StaticViewer"));
const Settings_1 = __importDefault(require("./Settings"));
const PDFCache_1 = __importDefault(require("./cache/PDFCache"));
const PDFType_1 = require("./common/types/PDFType");
const FillableViewer_1 = __importDefault(require("./viewer/FillableViewer"));
/**
 * Open the specified PDF in a provided viewer
 * @param viewer
 * @param url
 * @param page
 * @param cache
 * @internal
 */
async function _handleOpen(viewer, url, page, cache) {
    if (cache) {
        const cachedBytes = await PDFCache_1.default.getCache(url);
        // If we have a cache hit open the cached data
        if (cachedBytes) {
            await viewer.open(cachedBytes, page);
        }
        else {
            // Otherwise we should open it by url
            await viewer.open(url, page);
            // And when the download is complete set the cache
            viewer.download().then((bytes) => {
                PDFCache_1.default.setCache(url, bytes);
            });
        }
    }
    else {
        await viewer.open(url, page);
    }
}
exports._handleOpen = _handleOpen;
/**
 * The PDFoundry API
 *
 * You can access the API with `ui.PDFoundry`.
 * @module API
 */
class Api {
    /**
     * Get a full theme definition by id.
     * @param id The unique id of the theme to lookup.
     */
    static getTheme(id) {
        return Api._availableThemes[id] ?? null;
    }
    /**
     * Get the currently enabled theme id.
     */
    static get activeTheme() {
        const id = Settings_1.default.get(Settings_1.default.SETTINGS_KEY.VIEWER_THEME);
        return Api._availableThemes[id];
    }
    /**
     * Get a map of themes available for use.
     */
    static get availableThemes() {
        const themesMap = {};
        for (const key of Object.keys(Api._availableThemes)) {
            themesMap[key] = Api._availableThemes[key].name;
        }
        return themesMap;
    }
    /**
     * Register a theme for use with PDFoundry. You must register a theme before `ready`. Do so in `setup`.
     * @param id The unique id of the theme. Providing an already existing id will over-write the existing theme.
     * @param name The user-facing display name of the theme.
     * @param filePath The relative path of the theme css file
     */
    static registerTheme(id, name, filePath) {
        if (!filePath.endsWith('.css')) {
            throw new Error('You may only register css files as themes.');
        }
        if (Api._availableThemes.hasOwnProperty(id)) {
            console.warn(`PDFoundry theme with id of "${id}" is already registered!`);
        }
        this._availableThemes[id] = {
            id,
            name,
            filePath,
        };
    }
    // </editor-fold>
    /**
     * A reference to the unclassified utility functions.
     * @category Utility
     */
    static get Utilities() {
        return {
            getRoutePrefix: Util_1.getRoutePrefix,
            getAbsoluteURL: Util_1.getAbsoluteURL,
            validateAbsoluteURL: Util_1.validateAbsoluteURL,
            isEntityPDF: Util_1.isEntityPDF,
            getPDFData: Util_1.getPDFData,
            setPDFData: Util_1.setPDFData,
            deletePDFData: Util_1.deletePDFData,
            canOpenPDF: Util_1.canOpenPDF,
            getUserIdsExceptMe: Util_1.getUserIdsExceptMe,
        };
    }
    // <editor-fold desc="GetPDFData Methods">
    /**
     * Find a PDF containing journal entry from the journals directory using a specified comparer.
     * @param comparer The function to compare PDF data with.
     * @param allowInvisible If true, PDFs hidden from the active user will be returned.
     * @category PDFData
     */
    static findPDFEntity(comparer, allowInvisible = true) {
        return game.journal.find((journalEntry) => {
            if (!(0, Util_1.isEntityPDF)(journalEntry)) {
                return false;
            }
            const pdfData = (0, Util_1.getPDFData)(journalEntry);
            if (pdfData === undefined) {
                return false;
            }
            return (journalEntry.visible || allowInvisible) && comparer(pdfData);
        });
    }
    /**
     * Helper method. Alias for {@link Api.findPDFData} with a comparer that searches by PDF Code.
     * @param code Which code to search for a PDF with.
     * @param allowInvisible See allowVisible on {@link findPDFEntity}
     * @category PDFData
     */
    static findPDFDataByCode(code, allowInvisible = true) {
        return Api.findPDFData((data) => {
            return data.code === code;
        }, allowInvisible);
    }
    /**
     * Helper method. Alias for {@link Api.findPDFData} with a comparer that searches by PDF Name.
     * @param name Which name to search for a PDF with.
     * @param caseInsensitive If a case insensitive search should be done.
     * @param allowInvisible See allowVisible on {@link findPDFEntity}
     * @category PDFData
     */
    static findPDFDataByName(name, caseInsensitive = true, allowInvisible = true) {
        if (caseInsensitive) {
            return Api.findPDFData((data) => {
                return data.name.toLowerCase() === name.toLowerCase();
            }, allowInvisible);
        }
        else {
            return Api.findPDFData((data) => {
                return data.name === name;
            }, allowInvisible);
        }
    }
    /**
     * Finds a PDF entity created by the user and constructs a {@link PDFData} object of the resulting PDF's data.
     * @param comparer A comparison function that will be used.
     * @param allowInvisible See allowVisible on {@link findPDFEntity}
     * @category PDFData
     */
    static findPDFData(comparer, allowInvisible = true) {
        const pdf = this.findPDFEntity(comparer, allowInvisible);
        if (pdf === null) {
            return undefined;
        }
        return (0, Util_1.getPDFData)(pdf);
    }
    // </editor-fold>
    // <editor-fold desc="OpenPDF Methods">
    /**
     * Open the PDF with the provided code to the specified page.
     * Helper for {@link findPDFDataByCode} then {@link openPDF}.
     * @category Open
     */
    static async openPDFByCode(code, options) {
        const pdf = this.findPDFDataByCode(code);
        if (pdf === undefined) {
            const error = game.i18n.localize('PDFOUNDRY.ERROR.NoPDFWithCode');
            ui.notifications.error(error);
            return Promise.reject(error);
        }
        return this.openPDF(pdf, options);
    }
    /**
     * Open the PDF with the provided code to the specified page.
     * Helper for {@link findPDFDataByCode} then {@link openPDF}.
     * @category Open
     */
    static async openPDFByName(name, options) {
        const pdf = this.findPDFDataByName(name);
        if (pdf === undefined) {
            const message = game.i18n.localize('PDFOUNDRY.ERROR.NoPDFWithName');
            const error = new Error(message);
            ui.notifications.error(error.message);
            return Promise.reject(error);
        }
        return this.openPDF(pdf, options);
    }
    /**
     * Open the provided {@link PDFData} to the specified page.
     * @param pdf The PDF to open. See {@link Api.findPDFData}.
     * @param options The specified options for PDFs.
     * @category Open
     */
    static async openPDF(pdf, options) {
        if (options === undefined) {
            options = {};
        }
        let { url, offset, cache } = pdf;
        if (typeof offset === 'string') {
            if (offset === '') {
                offset = 0;
            }
            else {
                offset = parseInt(offset);
            }
        }
        else if (offset === null) {
            offset = 0;
        }
        if (!(0, Util_1.validateAbsoluteURL)(url)) {
            url = (0, Util_1.getAbsoluteURL)(url);
        }
        if (options.page !== undefined) {
            options.page = options.page + offset;
        }
        let viewer;
        switch (pdf.type) {
            case PDFType_1.PDFType.Static:
                viewer = new StaticViewer_1.default(pdf);
                viewer.render(true);
                await _handleOpen(viewer, url, options.page, cache);
                break;
            case PDFType_1.PDFType.Fillable:
                if (!(options.entity instanceof JournalEntry)) {
                    throw new Error('Provided entity was not a journal entry.');
                }
                viewer = new FillableViewer_1.default(options.entity, pdf);
                viewer.render(true);
                await _handleOpen(viewer, url, options.page, cache);
                break;
            case PDFType_1.PDFType.Actor:
                throw new Error('Actor sheets can only be opened through the actor.sheet accessor.');
        }
        return viewer;
    }
    /**
     * Open a URL as a static PDF. For form fillable PDFs you muse use {@link Api.openPDF}
     * @param url The URL to open (must be absolute).
     * @param page Which page to open to. Must be >= 1.
     * @param cache If URL based caching should be used.
     * @category Open
     */
    static async openURL(url, page = 1, cache = true) {
        if (isNaN(page) || page <= 0) {
            throw new Error(`Page must be > 0, but ${page} was given.`);
        }
        if (!(0, Util_1.validateAbsoluteURL)(url)) {
            url = (0, Util_1.getAbsoluteURL)(url);
        }
        const viewer = new StaticViewer_1.default();
        viewer.render(true);
        await _handleOpen(viewer, url, page, cache);
        return viewer;
    }
    /**
     * Shows the user manual to the active user.
     * @category Utility
     */
    static async showHelp() {
        await Settings_1.default.set(Settings_1.default.SETTINGS_KEY.HELP_SEEN, true);
        const lang = game.i18n.lang;
        let manualPath = (0, Util_1.getAbsoluteURL)(`${Settings_1.default.PATH_ASSETS}/manual/${lang}/manual.pdf`);
        // @ts-ignore
        const manualExists = await srcExists(manualPath);
        if (!manualExists) {
            manualPath = (0, Util_1.getAbsoluteURL)(`${Settings_1.default.PATH_ASSETS}/manual/en/manual.pdf`);
        }
        const pdfData = {
            name: game.i18n.localize('PDFOUNDRY.MANUAL.Name'),
            type: PDFType_1.PDFType.Static,
            code: '',
            offset: 0,
            url: manualPath,
            cache: false,
        };
        return Api.openPDF(pdfData);
    }
}
exports.default = Api;
/**
 * Enable additional debug information for the specified category.
 * @category Debug
 */
Api.DEBUG = {
    // TODO
    /**
     * When set to true, enables the logging event names and arguments to console.
     */
    EVENTS: false,
};
// <editor-fold desc="Static Methods">
Api._availableThemes = {};

},{"./Settings":3,"./Util":5,"./cache/PDFCache":14,"./common/types/PDFType":21,"./viewer/FillableViewer":31,"./viewer/StaticViewer":32}],2:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setup_1 = __importDefault(require("./Setup"));
Setup_1.default.run();

},{"./Setup":4}],3:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importDefault(require("./Api"));
/**
 * Internal settings and helper methods for PDFoundry.
 * @internal
 */
class Settings {
    static get PATH_MODULE() {
        return `modules/${Settings.MODULE_NAME}`;
    }
    static get PATH_ASSETS() {
        return `${Settings.PATH_MODULE}/assets`;
    }
    static get PATH_LOCALE() {
        return `${Settings.PATH_MODULE}/locale`;
    }
    static get PATH_TEMPLATES() {
        return `${Settings.PATH_MODULE}/templates`;
    }
    static get PATH_PDFJS() {
        return `${Settings.PATH_MODULE}/pdfjs`;
    }
    static get SOCKET_NAME() {
        return `module.${Settings.MODULE_NAME}`;
    }
    static initialize() {
        Settings.register(Settings.SETTINGS_KEY.CACHE_SIZE, {
            name: game.i18n.localize('PDFOUNDRY.SETTINGS.CacheSizeName'),
            hint: game.i18n.localize('PDFOUNDRY.SETTINGS.CacheSizeHint'),
            scope: 'user',
            type: Number,
            default: 256,
            config: true,
            onChange: async (mb) => {
                if (Settings.get(Settings.SETTINGS_KEY.CACHE_SIZE) === mb) {
                    return;
                }
                mb = Math.round(mb);
                mb = Math.max(mb, 64);
                mb = Math.min(mb, 1024);
                await Settings.set(Settings.SETTINGS_KEY.CACHE_SIZE, mb);
            },
        });
        Settings.register(Settings.SETTINGS_KEY.EXISTING_VIEWER, {
            name: game.i18n.localize('PDFOUNDRY.SETTINGS.ShowInExistingViewerName'),
            hint: game.i18n.localize('PDFOUNDRY.SETTINGS.ShowInExistingViewerHint'),
            scope: 'user',
            type: Boolean,
            default: true,
            config: true,
        });
        Settings.register(Settings.SETTINGS_KEY.VIEWER_THEME, {
            name: game.i18n.localize('PDFOUNDRY.SETTINGS.ViewerThemeName'),
            hint: game.i18n.localize('PDFOUNDRY.SETTINGS.ViewerThemeHint'),
            scope: 'user',
            type: String,
            default: 'fantasy',
            choices: Api_1.default.availableThemes,
            config: true,
        });
        Settings.register(Settings.SETTINGS_KEY.HELP_SEEN, {
            scope: 'user',
            type: Boolean,
            default: false,
            config: false,
        });
        Settings.register(Settings.SETTINGS_KEY.DATA_VERSION, {
            scope: 'world',
            type: String,
            default: undefined,
            config: false,
        });
    }
    /**
     * Wrapper around game.settings.register. Ensures scope is correct.
     * @param key
     * @param data
     * @internal
     */
    static register(key, data) {
        game.settings.register(Settings.MODULE_NAME, key, data);
    }
    /**
     * Wrapper around game.settings.get. Ensures scope is correct.
     * @param key
     * @internal
     */
    static get(key) {
        return game.settings.get(Settings.MODULE_NAME, key);
    }
    /**
     * Wrapper around game.settings.set. Ensures scope is correct.
     * @param key
     * @param value
     * @internal
     */
    static async set(key, value) {
        return game.settings.set(Settings.MODULE_NAME, key, value);
    }
}
exports.default = Settings;
Settings.MODULE_NAME = 'pdfoundry';
Settings.CSS_CLASS = 'pdf-app';
Settings.MENU_KEY = 'PDFoundrySettings';
Settings.SETTINGS_KEY = {
    EXISTING_VIEWER: 'ShowInExistingViewer',
    CACHE_SIZE: 'CacheSize',
    VIEWER_THEME: 'ViewerTheme',
    HELP_SEEN: 'HelpSeen',
    DATA_VERSION: 'DataVersion',
};
Settings.FLAGS_KEY = {
    // PDF Data
    PDF_DATA: 'PDFData',
    // Actor Sheets
    FORM_DATA: 'FormData',
    SHEET_ID: 'ActorSheet',
    // Canvas Notes
    PAGE_NUMBER: 'PageNumber',
};

},{"./Api":1}],4:[function(require,module,exports){
"use strict";
/*
 * Copyright 2022 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("./Util");
const PreloadEvent_1 = __importDefault(require("./socket/events/PreloadEvent"));
const Socket_1 = require("./socket/Socket");
const Settings_1 = __importDefault(require("./Settings"));
const PDFCache_1 = __importDefault(require("./cache/PDFCache"));
const Api_1 = __importDefault(require("./Api"));
const HTMLEnricher_1 = __importDefault(require("./enricher/HTMLEnricher"));
const TinyMCEPlugin_1 = __importDefault(require("./enricher/TinyMCEPlugin"));
const PDFActorSheetAdapter_1 = __importDefault(require("./app/PDFActorSheetAdapter"));
const PDFType_1 = require("./common/types/PDFType");
const PDFConfig_1 = require("./app/PDFConfig");
const FixMissingTypes_1 = __importDefault(require("./commands/FixMissingTypes"));
const PurgeCache_1 = __importDefault(require("./commands/PurgeCache"));
const MigrateLegacy_1 = require("./migrate/MigrateLegacy");
/**
 * A collection of methods used for setting up the API & system state.
 * @internal
 */
class Setup {
    /**
     * Run setup tasks.
     */
    static run() {
        if (hasProperty(ui, 'PDFoundry')) {
            Hooks.once('init', async () => {
                let d = new Dialog({
                    title: 'PDFoundry: Error',
                    content: [
                        '<div style="text-align: justify; margin: 0; padding: 0;">',
                        '<h1 style="color: red">PDFoundry Is Already Installed</h1>',
                        '<p style="font-weight: bold">You have enabled the module version of PDFoundry, but the system you ' +
                            'are using already has PDFoundry installed.</p>',
                        '<p>1. If you installed PDFoundry using a nightly build, uninstall and reinstall your system with the ' +
                            '"Game Systems" menu in Foundry VTT setup, or simply update the system if an update is available. ' +
                            'Your world data is safe either way.</p>',
                        '<p>2. If the system you are using comes with PDFoundry already installed - you must use that version of ' +
                            'PDFoundry by disabling the module version.</p>',
                        '<p style="font-weight: bold">The module version of PDFoundry will not function.</p>',
                        '</div>',
                    ].join(''),
                    default: '',
                    buttons: {},
                });
                d.render(true);
            });
            return;
        }
        // Register the PDFoundry APi on the UI
        ui['PDFoundry'] = Api_1.default;
        // Register the PDF sheet with the class picker
        Setup.setupSheets();
        // Setup tasks requiring that FVTT is loaded
        Hooks.once('ready', Setup.lateRun);
        Hooks.on('renderJournalDirectory', Setup.createJournalButton);
        Hooks.on('renderJournalDirectory', Setup.hookListItems);
        // getItemDirectoryEntryContext - Setup context menu for 'Open PDF' links
        Hooks.on('getJournalDirectoryEntryContext', Setup.getJournalContextOptions);
        // Cogwheel settings menu
        Hooks.on('renderSettings', Setup.onRenderSettings);
        // Load base themes
        Setup.registerThemes();
        // Patch the TextEnricher with a proxy
        HTMLEnricher_1.default.patchEnrich();
        // Bind click handlers to renderers
        Hooks.on('renderApplication', (app, html) => HTMLEnricher_1.default.bindRichTextLinks(html));
        Hooks.on('renderItemSheet', (app, html) => HTMLEnricher_1.default.bindRichTextLinks(html));
        Hooks.on('renderActorSheet', (app, html) => HTMLEnricher_1.default.bindRichTextLinks(html));
        Hooks.on('renderChatMessage', (app, html) => HTMLEnricher_1.default.bindRichTextLinks(html));
    }
    /**
     * Late setup tasks happen when the system is loaded
     */
    static lateRun() {
        // Register socket event handlers
        Socket_1.Socket.initialize();
        // Chat command processing
        Hooks.on('chatMessage', Setup.onChatMessage);
        // Canvas notes processing
        Hooks.on('renderNoteConfig', Setup.onNoteConfig);
        Hooks.on('hoverNote', Setup.onNoteHover);
        // Register TinyMCE drag + drop events
        TinyMCEPlugin_1.default.Register();
        return new Promise(async () => {
            // Initialize the settings
            Settings_1.default.initialize();
            await PDFCache_1.default.initialize();
            if ((0, MigrateLegacy_1.legacyMigrationRequired)()) {
                (0, MigrateLegacy_1.migrateLegacy)().then(() => {
                    Settings_1.default.set(Settings_1.default.SETTINGS_KEY.DATA_VERSION, 'v0.6.0');
                });
            }
            // PDFoundry is ready
            // Setup.userLogin();
        });
    }
    /**
     * Register the PDF sheet and unregister invalid sheet types from it.
     */
    static setupSheets() {
        // Register actor "sheet"
        Actors.registerSheet(Settings_1.default.MODULE_NAME, PDFActorSheetAdapter_1.default);
    }
    /**
     * Get additional context menu icons for PDF items
     * @param html
     * @param options
     */
    static getJournalContextOptions(html, options) {
        const getJournalEntryFromLi = (html) => {
            const id = html.data('document-id');
            return game.journal.get(id);
        };
        const shouldAdd = (entityHtml) => {
            const journalEntry = getJournalEntryFromLi(entityHtml);
            return (0, Util_1.isEntityPDF)(journalEntry) && (0, Util_1.getPDFData)(journalEntry)?.type !== PDFType_1.PDFType.Actor;
        };
        if (game.user.isGM) {
            options.unshift({
                name: game.i18n.localize('PDFOUNDRY.CONTEXT.PreloadPDF'),
                icon: '<i class="fas fa-download fa-fw"></i>',
                condition: shouldAdd,
                callback: (entityHtml) => {
                    const journalEntry = getJournalEntryFromLi(entityHtml);
                    const pdf = (0, Util_1.getPDFData)(journalEntry);
                    if (pdf === undefined) {
                        return;
                    }
                    const { url } = pdf;
                    const event = new PreloadEvent_1.default(null, (0, Util_1.getAbsoluteURL)(url));
                    event.emit();
                    PDFCache_1.default.preload(url);
                },
            });
        }
        options.unshift({
            name: game.i18n.localize('PDFOUNDRY.CONTEXT.OpenPDF'),
            icon: '<i class="far fa-file-pdf"></i>',
            condition: shouldAdd,
            callback: (entityHtml) => {
                const journalEntry = getJournalEntryFromLi(entityHtml);
                const pdf = (0, Util_1.getPDFData)(journalEntry);
                if (pdf === undefined) {
                    return;
                }
                if (pdf.type === PDFType_1.PDFType.Actor) {
                    throw new Error(`Unhandled PDF context type ${pdf.type}`);
                }
                else {
                    Api_1.default.openPDF(pdf, {
                        entity: journalEntry,
                    });
                }
            },
        });
    }
    static userLogin() {
        if (!game.user.isGM) {
            return;
        }
        let viewed;
        try {
            viewed = Settings_1.default.get(Settings_1.default.SETTINGS_KEY.HELP_SEEN);
        }
        catch (error) {
            viewed = false;
        }
        finally {
            if (!viewed) {
                Api_1.default.showHelp();
            }
        }
    }
    static onChatMessage(app, content, options) {
        content = content.toLocaleLowerCase();
        for (let command of Setup.COMMANDS) {
            if (command.execute(content)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Hook handler for rendering the settings tab
     */
    static onRenderSettings(settings, html, data) {
        // const icon = '<i class="far fa-file-pdf"></i>';
        // const button = $(`<button>${icon} ${game.i18n.localize('PDFOUNDRY.SETTINGS.OpenHelp')}</button>`);
        // button.on('click', Api.showHelp);
        //
        // html.find('#settings-documentation').append(button);
    }
    static async createPDF() {
        const journalEntry = (await JournalEntry.create({
            name: game.i18n.localize('PDFOUNDRY.MISC.NewPDF'),
            [`flags.${Settings_1.default.MODULE_NAME}.${Settings_1.default.FLAGS_KEY.PDF_DATA}.type`]: PDFType_1.PDFType.Static,
        }));
        new PDFConfig_1.PDFConfig(journalEntry).render(true);
    }
    static createJournalButton(app, html) {
        if (!game.user.isGM) {
            return;
        }
        const button = $(`<button class="create-pdf"><i class="fas fa-file-pdf"></i> ${game.i18n.localize('PDFOUNDRY.MISC.CreatePDF')}</button>`);
        button.on('click', () => {
            Setup.createPDF();
        });
        let footer = html.find('.directory-footer');
        if (footer.length === 0) {
            footer = $(`<footer class="directory-footer"></footer>`);
            html.append(footer);
        }
        footer.append(button);
    }
    static hookListItems(app, html) {
        const lis = html.find('li.journalentry');
        for (const li of lis) {
            const target = $(li);
            const id = target.data('document-id');
            const journalEntry = game.journal.get(id);
            if ((0, Util_1.isEntityPDF)(journalEntry)) {
                target.find('h4').on('click', (event) => {
                    event.stopImmediatePropagation();
                    if (journalEntry.isOwner) {
                        Setup.onClickPDFName(journalEntry);
                    }
                    else {
                        Setup.onClickPDFThumbnail(journalEntry);
                    }
                });
                const pdfData = (0, Util_1.getPDFData)(journalEntry);
                if (pdfData) {
                    const thumbnail = $(`<img class="pdf-thumbnail" src="${Settings_1.default.PATH_ASSETS}/pdf_icon.svg" alt="PDF Icon">`);
                    target.append(thumbnail);
                    switch (pdfData.type) {
                        case PDFType_1.PDFType.Static:
                        case PDFType_1.PDFType.Fillable:
                            target.find('img').on('click', (event) => {
                                event.stopImmediatePropagation();
                                Setup.onClickPDFThumbnail(journalEntry);
                            });
                            break;
                        case PDFType_1.PDFType.Actor:
                            // Actors can't be opened by link
                            thumbnail.css('filter', 'grayscale(100%)');
                            break;
                    }
                }
            }
        }
    }
    static onClickPDFName(journalEntry) {
        new PDFConfig_1.PDFConfig(journalEntry).render(true);
    }
    static onClickPDFThumbnail(journalEntry) {
        const pdfData = (0, Util_1.getPDFData)(journalEntry);
        if (pdfData) {
            switch (pdfData.type) {
                case PDFType_1.PDFType.Static:
                    Api_1.default.openPDF(pdfData);
                    break;
                case PDFType_1.PDFType.Fillable:
                    Api_1.default.openPDF(pdfData, {
                        entity: journalEntry,
                    });
                    break;
                case PDFType_1.PDFType.Actor:
                    // Pass - no functionality
                    break;
            }
        }
    }
    static onNoteConfig(app, html, data) {
        const journalId = data.data.entryId;
        const journal = game.journal.get(journalId);
        if ((0, Util_1.isEntityPDF)(journal)) {
            const container = $(`<div class="form-group"></div>`);
            const label = $(`<label>${game.i18n.localize('PDFOUNDRY.COMMON.PageNumber')}</label>`);
            let pageNumber = data.data['flags']?.[Settings_1.default.MODULE_NAME]?.[Settings_1.default.FLAGS_KEY.PAGE_NUMBER];
            if (pageNumber === undefined) {
                pageNumber = '';
            }
            const subContainer = $(`<div class="form-fields"></div>`);
            const input = $(`<input type="number" name="flags.${Settings_1.default.MODULE_NAME}.${Settings_1.default.FLAGS_KEY.PAGE_NUMBER}" value="${pageNumber}" data-dtype="String">`);
            subContainer.append(input);
            container.append(label);
            container.append(subContainer);
            html.find('button[type=submit]').before(container);
        }
    }
    static onNoteHover(note, enter) {
        if (!enter) {
            return;
        }
        const journal = note.entry;
        const pdf = (0, Util_1.getPDFData)(journal);
        if ((0, Util_1.isEntityPDF)(journal) && pdf) {
            note.mouseInteractionManager.callbacks['clickLeft2'] = () => {
                let pageText = note.data.flags?.[Settings_1.default.MODULE_NAME]?.[Settings_1.default.FLAGS_KEY.PAGE_NUMBER];
                let pageNumber = 0;
                if (typeof pageText === 'string') {
                    try {
                        pageNumber = parseInt(pageText);
                    }
                    catch (e) {
                        pageNumber = 0;
                    }
                }
                else if (typeof pageText === 'number') {
                    pageNumber = pageText;
                }
                if (pageNumber === 0) {
                    Api_1.default.openPDF(pdf);
                }
                else {
                    Api_1.default.openPDF(pdf, {
                        page: pageNumber,
                    });
                }
            };
        }
    }
    static registerThemes() {
        const themes = [
            {
                id: 'fantasy',
                name: 'Fantasy (Default)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/fantasy.css`,
            },
            {
                id: 'dark',
                name: 'Dark',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/default-dark.css`,
            },
            {
                id: 'light',
                name: 'Light',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/default-light.css`,
            },
            {
                id: 'net-runner-dark',
                name: 'Net Runner',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/net-runner.css`,
            },
            {
                id: 'gay-pride-light',
                name: 'Gay Pride (Light)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/gay-pride-light.css`,
            },
            {
                id: 'gay-pride-dark',
                name: 'Gay Pride (Dark)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/gay-pride-dark.css`,
            },
            {
                id: 'trans-light',
                name: 'Trans Pride (Light)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/trans-pride-light.css`,
            },
            {
                id: 'trans-dark',
                name: 'Trans Pride (Dark)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/trans-pride-dark.css`,
            },
            {
                id: 'nonbinary-light',
                name: 'Non-binary Pride (Light)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/nonbinary-pride-light.css`,
            },
            {
                id: 'nonbinary-dark',
                name: 'Non-binary Pride (Dark)',
                filePath: `${Settings_1.default.PATH_MODULE}/themes/nonbinary-pride-dark.css`,
            },
        ];
        for (const theme of themes) {
            Api_1.default.registerTheme(theme.id, theme.name, theme.filePath);
        }
    }
}
exports.default = Setup;
Setup.COMMANDS = [new FixMissingTypes_1.default(), new PurgeCache_1.default()];

},{"./Api":1,"./Settings":3,"./Util":5,"./app/PDFActorSheetAdapter":8,"./app/PDFConfig":9,"./cache/PDFCache":14,"./commands/FixMissingTypes":16,"./commands/PurgeCache":17,"./common/types/PDFType":21,"./enricher/HTMLEnricher":22,"./enricher/TinyMCEPlugin":23,"./migrate/MigrateLegacy":24,"./socket/Socket":25,"./socket/events/PreloadEvent":26}],5:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserIdsExceptMe = exports.canOpenPDF = exports.deletePDFData = exports.setPDFData = exports.getPDFData = exports.isEntityPDF = exports.validateAbsoluteURL = exports.getAbsoluteURL = exports.getRoutePrefix = void 0;
const Settings_1 = __importDefault(require("./Settings"));
const PDFType_1 = require("./common/types/PDFType");
const Whitelist_1 = require("./common/Whitelist");
// *************
// URL HELPERS
// *************
// <editor-fold desc='URL Helpers">
/**
 * Gets the correct route prefix used to support servers using a route prefix.
 * Appended to all window.location paths.
 * @module Utilities
 */
function getRoutePrefix() {
    let prefixArr = window.location.pathname.split('/');
    prefixArr.pop(); // don't want the 'game' at the end
    return prefixArr.join('/');
}
exports.getRoutePrefix = getRoutePrefix;
/**
 * Convert a relative URL to a absolute URL by prepending the window origin to the relative URL.
 * If the URL is of a white listed domain, will simply return the provided URL.
 * @param dataUrl A url to be validated.
 * @see {@link DOMAIN_WHITELIST}
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function getAbsoluteURL(dataUrl) {
    // Some domains are white listed, these should be considered absolute already
    for (const domain of Whitelist_1.DOMAIN_WHITELIST) {
        if (dataUrl.includes(domain)) {
            return dataUrl;
        }
    }
    return `${window.origin}${getRoutePrefix()}/${dataUrl}`;
}
exports.getAbsoluteURL = getAbsoluteURL;
/**
 * Returns true if the URL starts with the origin or the domain is one of the
 *  white listed domains.
 * @param dataUrl A url to be validated.
 * @see {@link DOMAIN_WHITELIST}
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function validateAbsoluteURL(dataUrl) {
    // Some domains are white listed
    for (const domain of Whitelist_1.DOMAIN_WHITELIST) {
        if (dataUrl.includes(domain)) {
            return true;
        }
    }
    return dataUrl.startsWith(window.origin);
}
exports.validateAbsoluteURL = validateAbsoluteURL;
// </editor-fold>
// *************
// DATA HELPERS
// *************
// <editor-fold desc='Data Helpers">
/**
 * Returns true if the provided entity contains PDF data
 * @param entity The entity to check. Only JournalEntities are allowed to be PDFs natively.
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function isEntityPDF(entity) {
    return entity !== undefined && entity !== null && entity.getFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.PDF_DATA) !== undefined;
}
exports.isEntityPDF = isEntityPDF;
/**
 * Pull relevant data from an journal entry, creating a {@link PDFData} object.
 * @param journalEntry The journal entry to pull data from.
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function getPDFData(journalEntry) {
    if (journalEntry === undefined || journalEntry === null) {
        return undefined;
    }
    const pdfData = journalEntry.getFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.PDF_DATA);
    if (pdfData === undefined) {
        return undefined;
    }
    pdfData.name = journalEntry.name;
    return pdfData;
}
exports.getPDFData = getPDFData;
/**
 * Set one or more {@link PDFData} attributes to the provided values. Makes no changes to fields that
 *  are not specified. If you wish to update the PDF name, use Entity.update as normal in Foundry.
 * @param journalEntry The PDF to update the data on.
 * @param pdfData A partial mapping of a {@link PDFData} object.
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function setPDFData(journalEntry, pdfData) {
    return journalEntry.setFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.PDF_DATA, pdfData);
}
exports.setPDFData = setPDFData;
/**
 * Deletes a key from the PDF data. Requires the value of the key to be set to null.
 * @param journalEntry The journal entry to delete the key from.
 * @param pdfData A mapping of {key: null} pairs to delete.
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function deletePDFData(journalEntry, pdfData) {
    const update = {};
    // TODO: Feature request to use Symbols to perform this type of operation
    for (const key of Object.keys(pdfData)) {
        update[`flags.${Settings_1.default.MODULE_NAME}.${Settings_1.default.FLAGS_KEY.PDF_DATA}.-=${key}`] = null;
    }
    return journalEntry.update(update);
}
exports.deletePDFData = deletePDFData;
/**
 * Returns true or false if all required data is set such that the PDF is possible to open.
 *  Does not guarantee any specific data for a type of open (e.g. opening as a fillable PDF)
 *  only that the static viewer is able to open the PDF.
 * @param pdfData The PDF data to check.
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function canOpenPDF(pdfData) {
    if (PDFType_1.PDFType[pdfData.type] === undefined) {
        return false;
    }
    return !(pdfData.url === undefined || pdfData.url === '');
}
exports.canOpenPDF = canOpenPDF;
// </editor-fold>
// *************
// USER HELPERS
// *************
// <editor-fold desc='User Helpers">
/**
 * Return all users ids except the current user
 * @see {@link Api.Utilities}
 * @module Utilities
 */
function getUserIdsExceptMe() {
    return game
        .users.filter((user) => {
        return user.id !== game.userId;
    })
        .map((user) => user.id);
}
exports.getUserIdsExceptMe = getUserIdsExceptMe;
// </editor-fold>

},{"./Settings":3,"./common/Whitelist":18,"./common/types/PDFType":21}],6:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PDFType_1 = require("../common/types/PDFType");
const SelectApp_1 = __importDefault(require("./SelectApp"));
const Util_1 = require("../Util");
/**
 * Selects an actor sheet in a pop up window.
 * @internal
 */
class ActorSheetSelect extends SelectApp_1.default {
    get selectTitle() {
        return 'PDFOUNDRY.VIEWER.SelectSheet';
    }
    get selectId() {
        return 'actor-sheet';
    }
    get selectLabel() {
        return 'PDFOUNDRY.VIEWER.SelectSheet';
    }
    get selectOptions() {
        const journals = game.journal.filter((entry) => {
            return (0, Util_1.isEntityPDF)(entry) && (0, Util_1.getPDFData)(entry)?.type === PDFType_1.PDFType.Actor;
        });
        return journals.map((entry) => {
            return {
                text: entry.data.name,
                value: entry.id,
            };
        });
    }
}
exports.default = ActorSheetSelect;

},{"../Util":5,"../common/types/PDFType":21,"./SelectApp":11}],7:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
const header_1 = require("../common/helpers/header");
/**
 * Basic app to allow the user to see data keys for actor sheets
 * @internal
 */
class PDFActorDataBrowser extends Application {
    constructor(actor, options) {
        super(options);
        this.actor = actor;
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = `${Settings_1.default.PATH_TEMPLATES}/app/pdf-actor-data-browser.html`;
        options.width = 600;
        options.height = 400;
        options.resizable = true;
        return options;
    }
    get title() {
        return `${this.actor.name}`;
    }
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        buttons.unshift(header_1.BUTTON_GITHUB);
        buttons.unshift(header_1.BUTTON_KOFI);
        buttons.unshift({
            class: 'pdf-sheet-refresh',
            icon: 'fas fa-sync',
            label: game.i18n.localize('PDFOUNDRY.MISC.Refresh'),
            onclick: () => this.render(),
        });
        return buttons;
    }
    getData(options) {
        const data = super.getData(options);
        let DangerLevel;
        (function (DangerLevel) {
            DangerLevel[DangerLevel["Safe"] = 0] = "Safe";
            DangerLevel[DangerLevel["Low"] = 1] = "Low";
            DangerLevel[DangerLevel["High"] = 2] = "High";
            DangerLevel[DangerLevel["Critical"] = 3] = "Critical";
        })(DangerLevel || (DangerLevel = {}));
        const flatten = (data, current = '', danger = DangerLevel.Safe) => {
            let results = [];
            window['actorData'] = this.actor.data.data;
            const path = (curr, ...next) => {
                if (curr.length > 0) {
                    for (let i = 0; i < next.length; i++) {
                        curr = `${curr}.${next[i]}`;
                    }
                    return curr;
                }
                else {
                    return `${next}`;
                }
            };
            const wrap = (value) => {
                return `\{\{${value}\}\}`;
            };
            const boundDanger = (curr, next) => {
                if (curr < next) {
                    return next;
                }
                return curr;
            };
            if (data === null)
                return results;
            if (data === undefined)
                return results;
            if (typeof data === 'object') {
                for (const [key, value] of Object.entries(data)) {
                    if (Array.isArray(value)) {
                        // Case 1 : The value is an array
                        if (value.length === 0) {
                            results.push({
                                key: path(current, key),
                                danger: DangerLevel.Critical,
                                value: wrap('Empty Array, do not use!'),
                            });
                        }
                        else {
                            for (let i = 0; i < value.length; i++) {
                                const next = value[i];
                                results = [...results, ...flatten(next, path(current, key, i), boundDanger(danger, DangerLevel.High))];
                            }
                        }
                    }
                    else if (typeof value === 'object') {
                        // Case 2 : The value is an object
                        if (value === null || value === undefined) {
                            results.push({
                                key: path(current, key),
                                danger: DangerLevel.High,
                                value: wrap('Null/Undefined, be cautious!'),
                            });
                        }
                        else if (isObjectEmpty(value)) {
                            results.push({
                                key: path(current, key),
                                danger: DangerLevel.Critical,
                                value: wrap('Empty Object, do not use!'),
                            });
                        }
                        else {
                            for (let [key2, value2] of Object.entries(value)) {
                                results = [...results, ...flatten(value2, path(current, key, key2), boundDanger(danger, DangerLevel.Low))];
                            }
                        }
                    }
                    else if (typeof value === 'function') {
                        // Case 3 : Base Case : The value is a function
                        results.push({
                            key: path(current, key),
                            danger: boundDanger(danger, DangerLevel.Critical),
                            value: wrap('Function, do not use!'),
                        });
                    }
                    else {
                        // Case 4 : Base Case : The value is a primitive
                        results.push({
                            key: path(current, key),
                            danger: boundDanger(danger, DangerLevel.Safe),
                            value: value.toString(),
                        });
                    }
                }
            }
            else if (typeof data === 'function') {
                // Case 3 : Base Case : The value is a function
                results.push({
                    key: current,
                    danger: boundDanger(danger, DangerLevel.Critical),
                    value: wrap('Function, do not use!'),
                });
            }
            else {
                // Case 4 : Base Case : The value is a primitive
                results.push({
                    key: current,
                    danger: boundDanger(danger, DangerLevel.Safe),
                    value: data,
                });
            }
            return results;
        };
        const icons = {
            [DangerLevel.Safe]: '<i class="fas fa-check-circle"></i>',
            [DangerLevel.Low]: '<i class="fas fa-question-circle"></i>',
            [DangerLevel.High]: '<i class="fas fa-exclamation-triangle"></i>',
            [DangerLevel.Critical]: '<i class="fas fa-radiation-alt"></i>',
        };
        const tooltips = {
            [DangerLevel.Safe]: game.i18n.localize('PDFOUNDRY.MISC.DANGER.Safe'),
            [DangerLevel.Low]: game.i18n.localize('PDFOUNDRY.MISC.DANGER.Low'),
            [DangerLevel.High]: game.i18n.localize('PDFOUNDRY.MISC.DANGER.High'),
            [DangerLevel.Critical]: game.i18n.localize('PDFOUNDRY.MISC.DANGER.Critical'),
        };
        data['paths'] = flatten(this.actor.data.data, 'data');
        data['paths'].push({
            key: 'name',
            value: this.actor.name,
            danger: DangerLevel.Safe,
        });
        data['paths'].sort((a, b) => a.key.localeCompare(b.key));
        data['paths'] = data['paths'].map((element) => {
            let splitRoll = element['key'].split('.');
            splitRoll.shift();
            return {
                ...element,
                icon: icons[element.danger],
                roll: `@${splitRoll.join('.')}`,
                tooltip: tooltips[element.danger],
            };
        });
        return data;
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('i.copy').on('click', async (event) => {
            const target = $(event.currentTarget);
            await navigator.clipboard.writeText(target.data('value'));
            ui.notifications.info(game.i18n.localize('PDFOUNDRY.MISC.CopiedToClipboard'));
        });
    }
    render(force, options) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.render.bind(this), 10000);
        return super.render(force, options);
    }
    close() {
        clearTimeout(this.timeout);
        return super.close();
    }
}
exports.default = PDFActorDataBrowser;

},{"../Settings":3,"../common/helpers/header":20}],8:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActorViewer_1 = __importDefault(require("../viewer/ActorViewer"));
const Settings_1 = __importDefault(require("../Settings"));
/**
 * Adapts a FillableViewer to function as a ActorSheet
 * @internal
 */
class PDFActorSheetAdapter extends ActorSheet {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(actor, options) {
        super(actor, options);
        this._options = options;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    get viewer() {
        return this._viewer;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    activateListeners(html) {
        $(this.element).css('display', 'none');
        this.form = $(html).first().get(0);
        super.activateListeners(html);
    }
    async _onSubmit(...args) {
        // PDFoundry handles data in the FillableViewer
        return;
    }
    async getData() {
        return mergeObject(await super.getData(), await this._viewer.getData());
    }
    _updateObject(event, formData) {
        return super._updateObject(event, formData);
    }
    render(force, options) {
        if (!this._viewer) {
            const sheetId = this.actor.getFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.SHEET_ID);
            this._viewer = new ActorViewer_1.default(this.actor, sheetId, this, this._options);
        }
        // If this window is already open, don't re-render
        if (this._state === Application.RENDER_STATES.RENDERED) {
            return this;
        }
        this._viewer.render(force, options);
        return super.render(force, options);
    }
    // TODO: Sandbox compatibility - should force this class to extend CONFIG class instead.
    async scrollbarSet() {
        return;
    }
    async close() {
        if (this._viewer) {
            await this._viewer.close();
            // @ts-ignore
            delete this._viewer;
        }
        return super.close();
    }
}
exports.default = PDFActorSheetAdapter;

},{"../Settings":3,"../viewer/ActorViewer":29}],9:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFConfig = void 0;
const Settings_1 = __importDefault(require("../Settings"));
const Api_1 = __importDefault(require("../Api"));
const Util_1 = require("../Util");
const PDFType_1 = require("../common/types/PDFType");
const header_1 = require("../common/helpers/header");
/**
 * Extends the base ItemSheet for linked PDF viewing.
 * @private
 */
class PDFConfig extends FormApplication {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(journalEntry, options) {
        super(journalEntry, options);
    }
    // <editor-fold desc="Static Properties">
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.classes = [...options.classes, Settings_1.default.CSS_CLASS];
        options.template = `${Settings_1.default.PATH_TEMPLATES}/sheet/pdf-config.html`;
        options.width = 650;
        options.height = 'auto';
        return options;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    get title() {
        return this.object.name;
    }
    get id() {
        return `pdf-${this.object.id}`;
    }
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        buttons.unshift(header_1.BUTTON_GITHUB);
        buttons.unshift(header_1.BUTTON_KOFI);
        buttons.unshift(header_1.BUTTON_HELP);
        return buttons;
    }
    get isEditable() {
        // @ts-ignore TODO: 0.8.x compat
        return this.object.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OWNER);
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    activateListeners(html) {
        super.activateListeners(html);
        const urlInput = html.find('#data-url');
        const offsetInput = html.find('#data-offset');
        // Default behavior opens the file picker in this form setup, override
        html.find('input').on('keypress', (event) => {
            if (event.key === 'Enter') {
                this._onSubmit(event, { preventClose: true });
            }
        });
        html.find('input, select').on('input', (event) => {
            this._onSubmit(event, { preventClose: true });
        });
        // Browse button
        html.find('#pdf-browse').on('click', async (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.picker =
                this.picker ??
                    new FilePicker({
                        // @ts-ignore TODO
                        callback: () => {
                            this._onSubmit(new Event('input'), { preventClose: true });
                        },
                    });
            // @ts-ignore TODO: Foundry Types
            this.picker.extensions = ['.pdf'];
            this.picker.field = urlInput[0];
            if (!this.filepickers.includes(this.picker)) {
                this.filepickers.push(this.picker);
            }
            let urlValue = urlInput.val();
            if (urlValue !== undefined) {
                await this.picker.browse(urlValue.toString().trim());
            }
            this.picker.render(true);
        });
        // Test pdf settings button
        html.find('#pdf-test').on('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            let urlValue = urlInput.val();
            let offsetValue = offsetInput.val();
            if (urlValue === null || urlValue === undefined)
                return;
            if (offsetValue === null || offsetValue === undefined)
                return;
            urlValue = urlValue.toString();
            urlValue = (0, Util_1.getAbsoluteURL)(urlValue);
            if (offsetValue.toString().trim() === '') {
                offsetValue = 0;
            }
            offsetValue = parseInt(offsetValue);
            Api_1.default.openURL(urlValue, 5 + offsetValue, false);
        });
    }
    getData() {
        const data = super.getData();
        data['types'] = Object.entries(PDFType_1.PDFType).map(([key]) => {
            return {
                value: PDFType_1.PDFType[key],
                text: `PDFOUNDRY.MISC.PDFTYPE.${key}`,
            };
        });
        data['dataPath'] = `flags.${Settings_1.default.MODULE_NAME}.${Settings_1.default.FLAGS_KEY.PDF_DATA}`;
        data['flags'] = (0, Util_1.getPDFData)(this.object);
        data['name'] = this.object.data.name;
        return data;
    }
    async _updateObject(event, formData) {
        await this.object.update(formData);
    }
    // @ts-ignore TODO
    submit({ updateData }) {
        // @ts-ignore TODO
        return super.submit({ updateData });
    }
}
exports.PDFConfig = PDFConfig;

},{"../Api":1,"../Settings":3,"../Util":5,"../common/helpers/header":20,"../common/types/PDFType":21}],10:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
/**
 * An application that allows selection of players.
 * @private
 */
class PlayerSelect extends Application {
    constructor(ids, cb, options) {
        super(options);
        this._ids = ids;
        this._callback = cb;
    }
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.classes = ['sheet', 'item'];
        options.template = `${Settings_1.default.PATH_TEMPLATES}/app/pdf-player-select.html`;
        // @ts-ignore
        options.width = 'auto';
        options.height = 'auto';
        options.title = game.i18n.localize('PDFOUNDRY.VIEWER.SelectPlayers');
        return options;
    }
    getData(options) {
        const data = super.getData(options);
        const users = [];
        for (const id of this._ids) {
            users.push({
                name: game.users.get(id).name,
                id,
            });
        }
        users.sort((a, b) => a.name.localeCompare(b.name));
        data['users'] = users;
        return data;
    }
    activateListeners(html) {
        super.activateListeners(html);
        const button = $(html).find('#confirm');
        button.on('click', () => {
            this._callback(this.collectIds());
            this.close();
        });
    }
    /**
     * Collect selected ids from the html
     */
    collectIds() {
        const ids = [];
        const checkboxes = $(this.element).find('input[type=checkbox]');
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = $(checkboxes[i]);
            if (checkbox.prop('checked')) {
                ids.push(checkbox.prop('id'));
            }
        }
        return ids;
    }
}
exports.default = PlayerSelect;

},{"../Settings":3}],11:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
/**
 * Base class for app that uses a select drop down
 * @internal
 */
class SelectApp extends Application {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(callback, currentValue, options) {
        super(options);
        this._current = currentValue;
        this._callback = callback;
    }
    // <editor-fold desc="Static Properties">
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.classes = [...options.classes, Settings_1.default.CSS_CLASS];
        options.template = `${Settings_1.default.PATH_TEMPLATES}/app/select-app.html`;
        options.width = 200;
        options.height = 'auto';
        return options;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    get title() {
        return game.i18n.localize(this.selectTitle);
    }
    get id() {
        return this.unique ? this.selectId : super.id;
    }
    /**
     * Should duplicate of this app be allowed
     * @protected
     */
    get unique() {
        return true;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    getData(options) {
        const data = super.getData(options);
        data['data'] = {
            id: this.selectId,
            label: this.selectLabel,
            selected: this._current,
            options: this.selectOptions,
        };
        return data;
    }
    activateListeners(html) {
        super.activateListeners(html);
        const button = html.find(`button#${this.selectId}-confirm`);
        button.on('click', async (event) => {
            event.preventDefault();
            const select = html.find(`#${this.selectId}`);
            const value = select.val();
            if (value !== this._current && this._callback !== undefined) {
                this._callback(value, select.find('option:selected').text());
            }
            await this.close();
        });
    }
}
exports.default = SelectApp;

},{"../Settings":3}],12:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheError = void 0;
/**
 * An error that occurs during cache operations
 * @private
 */
class CacheError extends Error {
    constructor(index, store, message) {
        super(`Error in ${index}>${store}: ${message}`);
    }
}
exports.CacheError = CacheError;

},{}],13:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const CacheError_1 = require("./CacheError");
/**
 * Class that deals with getting/setting from an indexed db
 * Mostly exists to separate logic for the PDFCache from logic
 * dealing with the database
 * @private
 */
class CacheHelper {
    constructor(indexName, storeNames, version) {
        this._indexName = `${indexName}`;
        this._storeNames = storeNames;
        this._version = version;
    }
    static async createAndOpen(indexName, storeNames, version) {
        const helper = new CacheHelper(indexName, storeNames, version);
        await helper.open();
        return helper;
    }
    get ready() {
        return this._db !== undefined;
    }
    newTransaction(storeName) {
        const transaction = this._db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        return { transaction, store };
    }
    open() {
        const that = this;
        return new Promise(function (resolve, reject) {
            const request = indexedDB.open(that._indexName, that._version);
            request.onsuccess = function (event) {
                that._db = this.result;
                resolve();
            };
            request.onupgradeneeded = function (event) {
                that._db = this.result;
                for (let i = 0; i < that._storeNames.length; i++) {
                    try {
                        // Create object store if it doesn't exist
                        that._db.createObjectStore(that._storeNames[i], {});
                    }
                    catch (error) {
                        // Otherwise pass
                    }
                }
                resolve();
            };
            request.onerror = function (event) {
                // @ts-ignore
                reject(event.target.error);
            };
        });
    }
    set(key, value, storeName, force = false) {
        return new Promise((resolve, reject) => {
            if (!this._db) {
                throw new CacheError_1.CacheError(this._indexName, storeName, 'Database is not initialized.');
            }
            else {
                const that = this;
                let { transaction, store } = this.newTransaction(storeName);
                // Propagate errors upwards, otherwise they fail silently
                transaction.onerror = function (event) {
                    // @ts-ignore
                    reject(event.target.error);
                };
                const keyRequest = store.getKey(key);
                keyRequest.onsuccess = function (event) {
                    // key already exists in the store
                    if (keyRequest.result) {
                        // should we force the new value by deleting the old?
                        if (force) {
                            that.del(key, storeName).then(() => {
                                ({ transaction, store } = that.newTransaction(storeName));
                                store.add(value, key);
                                resolve();
                            });
                        }
                        else {
                            throw new CacheError_1.CacheError(that._indexName, storeName, `Key ${key} already exists.`);
                        }
                    }
                    else {
                        store.add(value, key);
                        resolve();
                    }
                };
            }
        });
    }
    get(key, storeName) {
        return new Promise((resolve, reject) => {
            if (!this._db) {
                throw new CacheError_1.CacheError(this._indexName, storeName, 'Database is not initialized.');
            }
            else {
                let { transaction, store } = this.newTransaction(storeName);
                // Propagate errors upwards, otherwise they fail silently
                transaction.onerror = function (event) {
                    // @ts-ignore
                    reject(event.target.error);
                };
                const getRequest = store.get(key);
                getRequest.onsuccess = function (event) {
                    resolve(this.result);
                };
                getRequest.onerror = function (event) {
                    // @ts-ignore
                    reject(event.target.error);
                };
            }
        });
    }
    del(key, storeName) {
        return new Promise((resolve, reject) => {
            try {
                const { transaction, store } = this.newTransaction(storeName);
                transaction.onerror = function (event) {
                    // @ts-ignore
                    reject(event.target.error);
                };
                transaction.oncomplete = function (event) {
                    resolve();
                };
                store.delete(key);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    keys(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const { transaction, store } = this.newTransaction(storeName);
                const keysRequest = store.getAllKeys();
                keysRequest.onsuccess = function () {
                    resolve(keysRequest.result);
                };
                keysRequest.onerror = function (event) {
                    // @ts-ignore
                    reject(event.target.error);
                };
                return;
            }
            catch (error) {
                reject(error);
            }
        });
    }
    clr(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const { store } = this.newTransaction(storeName);
                const keys = store.getAllKeys();
                keys.onsuccess = (result) => {
                    const promises = [];
                    for (const key of keys.result) {
                        promises.push(this.del(key, storeName));
                    }
                    Promise.all(promises).then(() => {
                        resolve();
                    });
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.default = CacheHelper;

},{"./CacheError":12}],14:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
const CacheHelper_1 = __importDefault(require("./CacheHelper"));
/**
 * Handles caching for PDFs
 * @private
 */
class PDFCache {
    // <editor-fold desc="Static Properties">
    /**
     * Max size of the cache for the active user, defaults to 256 MB.
     */
    static get MAX_BYTES() {
        return Settings_1.default.get(Settings_1.default.SETTINGS_KEY.CACHE_SIZE) * 2 ** 20;
    }
    // </editor-fold>
    static async initialize() {
        PDFCache._cacheHelper = await CacheHelper_1.default.createAndOpen(PDFCache.IDB_NAME, [PDFCache.CACHE, PDFCache.META], PDFCache.IDB_VERSION);
    }
    /**
     * Get meta information about a provided key (url).
     * @param key
     */
    static async getMeta(key) {
        try {
            return await PDFCache._cacheHelper.get(key, PDFCache.META);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Set meta information about a provided key (url). See {@link CacheData}.
     * @param key
     * @param meta
     */
    static async setMeta(key, meta) {
        await PDFCache._cacheHelper.set(key, meta, PDFCache.META, true);
    }
    /**
     * Get the byte array representing the key (url) from the user's cache.
     * @param key
     */
    static async getCache(key) {
        try {
            const bytes = await PDFCache._cacheHelper.get(key, PDFCache.CACHE);
            const meta = {
                dateAccessed: new Date().toISOString(),
                size: bytes.length,
            };
            await PDFCache.setMeta(key, meta);
            return bytes;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Set the value of the cache for the specific key (url) to the provided byte array.
     * @param key
     * @param bytes
     */
    static async setCache(key, bytes) {
        const meta = {
            dateAccessed: new Date().toISOString(),
            size: bytes.length,
        };
        await PDFCache._cacheHelper.set(key, bytes, PDFCache.CACHE, true);
        await PDFCache.setMeta(key, meta);
        await this.prune();
    }
    /**
     * Preload the PDF at the specified key (url), caching it immediately.
     * @param key
     */
    static preload(key) {
        return new Promise(async (resolve, reject) => {
            const cachedBytes = await PDFCache.getCache(key);
            if (cachedBytes !== null && cachedBytes.byteLength > 0) {
                resolve();
                return;
            }
            const response = await fetch(key);
            if (response.ok) {
                const fetchedBytes = new Uint8Array(await response.arrayBuffer());
                if (fetchedBytes.byteLength > 0) {
                    await PDFCache.setCache(key, fetchedBytes);
                    resolve();
                    return;
                }
                else {
                    reject('Fetch failed.');
                }
            }
            else {
                reject('Fetch failed.');
            }
        });
    }
    /**
     * Prune the active user's cache until it is below the user's cache size limit.
     */
    static async prune() {
        const keys = await this._cacheHelper.keys(PDFCache.META);
        let totalBytes = 0;
        let metas = [];
        for (const key of keys) {
            const meta = await this._cacheHelper.get(key, PDFCache.META);
            meta.dateAccessed = Date.parse(meta.dateAccessed);
            meta.size = parseInt(meta.size);
            totalBytes += meta.size;
            metas.push({
                key,
                meta,
            });
        }
        metas = metas.sort((a, b) => {
            return a.meta.dateAccessed - b.meta.dateAccessed;
        });
        for (let i = 0; i < metas.length; i++) {
            if (totalBytes < PDFCache.MAX_BYTES) {
                break;
            }
            const next = metas[i];
            await this._cacheHelper.del(next.key, PDFCache.META);
            await this._cacheHelper.del(next.key, PDFCache.CACHE);
            totalBytes -= next.meta.size;
        }
    }
    /**
     * Clear the PDF cache
     */
    static async clear() {
        const keys = await this._cacheHelper.keys(PDFCache.META);
        for (const key of keys) {
            await this._cacheHelper.del(key, PDFCache.META);
            await this._cacheHelper.del(key, PDFCache.CACHE);
        }
    }
}
exports.default = PDFCache;
PDFCache.IDB_NAME = 'PDFoundry';
PDFCache.IDB_VERSION = 1;
PDFCache.CACHE = `Cache`;
PDFCache.META = `Meta`;

},{"../Settings":3,"./CacheHelper":13}],15:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Chat command processor
 * @internal
 */
class ChatCommand {
    // <editor-fold desc="Getters & Setters">
    get CommandPrefix() {
        return `/pdfoundry`;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    /**
     * Execute the command, returning true if the command completes successfully
     * @param content
     */
    execute(content) {
        const realArgs = content.split(' ');
        if (realArgs[0] !== this.CommandPrefix) {
            return false;
        }
        if (realArgs[1] !== this.CommandName) {
            return false;
        }
        // pop first two args
        realArgs.shift();
        realArgs.shift();
        this.run(realArgs)
            .then(() => {
            let message = game.i18n.localize('PDFOUNDRY.COMMANDS.Success');
            message = message.replace('$COMMAND_NAME$', this.CommandName);
            ui.notifications.info(message);
        })
            .catch((error) => {
            let message = game.i18n.localize('PDFOUNDRY.COMMANDS.Failure');
            message = message.replace('$COMMAND_NAME$', this.CommandName);
            ui.notifications.error(message);
            console.error(error);
        });
        return true;
    }
}
exports.default = ChatCommand;

},{}],16:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const PDFType_1 = require("../common/types/PDFType");
const ChatCommand_1 = __importDefault(require("./ChatCommand"));
/**
 * Fixes missing types
 * @internal
 */
class FixMissingTypes extends ChatCommand_1.default {
    // <editor-fold desc="Getters & Setters">
    get CommandName() {
        return 'fix-missing-types';
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    async run(args) {
        let fixedPDFs = 0;
        const journals = game.journal.filter((je) => (0, Util_1.getPDFData)(je) !== undefined && (0, Util_1.getPDFData)(je)?.type === undefined);
        for (const journalEntry of journals) {
            await (0, Util_1.setPDFData)(journalEntry, {
                type: PDFType_1.PDFType.Static,
            });
            fixedPDFs += 1;
        }
        // @ts-ignore
        ui.journal.render();
        if (fixedPDFs > 0) {
            ui.notifications.info(game.i18n.localize('PDFOUNDRY.COMMANDS.FixMissingTypesSuccess'));
        }
        else {
            ui.notifications.info(game.i18n.localize('PDFOUNDRY.COMMANDS.FixMissingTypesFailure'));
        }
    }
}
exports.default = FixMissingTypes;

},{"../Util":5,"../common/types/PDFType":21,"./ChatCommand":15}],17:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ChatCommand_1 = __importDefault(require("./ChatCommand"));
const PDFCache_1 = __importDefault(require("../cache/PDFCache"));
/**
 * @internal
 */
class PurgeCache extends ChatCommand_1.default {
    // <editor-fold desc="Getters & Setters">
    get CommandName() {
        return 'purge-cache';
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    async run(args) {
        await PDFCache_1.default.clear();
        ui.notifications.info(game.i18n.localize('PDFOUNDRY.COMMANDS.PurgeCacheSuccess'));
    }
}
exports.default = PurgeCache;

},{"../cache/PDFCache":14,"./ChatCommand":15}],18:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_WHITELIST = void 0;
/**
 * The domain white list includes domains that are allowed other than 'localhost' or
 *  the equivalent domain the user is running the server on.
 */
exports.DOMAIN_WHITELIST = ['amazonaws.com', 'digitaloceanspaces.com', 'assets.forge-vtt.com', 'wasabisys.com', 'backblazeb2.com'];

},{}],19:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importDefault(require("../../Api"));
const Settings_1 = __importDefault(require("../../Settings"));
/**
 * @internal
 */
class EventStore {
    constructor() {
        this._map = new Map();
    }
    /**
     * Turn on an event callback for the specified event.
     * @param eventName
     * @param callback
     */
    on(eventName, callback) {
        if (!this._map.has(eventName)) {
            this._map.set(eventName, []);
        }
        const callbacks = this._map.get(eventName);
        for (let i = 0; i < callbacks.length; i++) {
            if (callbacks[i] === callback)
                return;
        }
        callbacks.push(callback);
    }
    /**
     * Like {@see on} but only fires once.
     * @param eventName
     * @param callback
     */
    once(eventName, callback) {
        const that = this;
        const wrapper = function (...args) {
            callback(args);
            that.off(eventName, wrapper);
        };
        that.on(eventName, wrapper);
    }
    /**
     * Turn off an event callback for the specified event.
     * @param eventName
     * @param callback
     */
    off(eventName, callback) {
        if (!this._map.has(eventName)) {
            this._map.set(eventName, []);
        }
        const callbacks = this._map.get(eventName);
        for (let i = 0; i < callbacks.length; i++) {
            if (callbacks[i] === callback) {
                callbacks.splice(i, 1);
            }
        }
    }
    /**
     * Fire an event and forward the args to all handlers
     * @param eventName
     * @param args
     */
    fire(eventName, ...args) {
        if (Api_1.default.DEBUG.EVENTS) {
            console.debug(`${Settings_1.default.MODULE_NAME.toUpperCase()}::${eventName}`);
            console.debug(args);
        }
        if (!this._map.has(eventName)) {
            return;
        }
        const callbacks = this._map.get(eventName);
        for (const callback of callbacks) {
            callback(...args);
        }
    }
}
exports.default = EventStore;

},{"../../Api":1,"../../Settings":3}],20:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUTTON_KOFI = exports.BUTTON_HELP = exports.BUTTON_GITHUB = void 0;
const Api_1 = __importDefault(require("../../Api"));
/**
 * Github link header button.
 * @internal
 */
exports.BUTTON_GITHUB = {
    class: 'pdf-sheet-github',
    icon: 'fas fa-external-link-alt',
    label: 'PDFoundry',
    onclick: () => window.open('https://github.com/Djphoenix719/PDFoundry', '_blank'),
};
/**
 * Manual link header button.
 * @internal
 */
exports.BUTTON_HELP = {
    class: 'pdf-sheet-manual',
    icon: 'fas fa-question-circle',
    label: 'Help',
    onclick: () => Api_1.default.showHelp(),
};
/**
 * Shameless shill link
 * @internal
 */
exports.BUTTON_KOFI = {
    class: 'pdf-sheet-kofi',
    icon: 'fas fa-coffee',
    label: '',
    onclick: () => window.open('https://ko-fi.com/djsmods', '_blank'),
};

},{"../../Api":1}],21:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFType = void 0;
/**
 * The type of PDF file, as specified by the user.
 * @module API
 */
var PDFType;
(function (PDFType) {
    /**
     * Static PDFs contain no form fillable elements.
     */
    PDFType["Static"] = "static";
    /**
     * Fillable PDFs are not linked to actor sheets, but do contain form fillable elements.
     */
    PDFType["Fillable"] = "fillable";
    /**
     * Actor-linked PDFs store their data on the actor, so they can represent actors.
     */
    PDFType["Actor"] = "actor";
})(PDFType = exports.PDFType || (exports.PDFType = {}));

},{}],22:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importDefault(require("../Api"));
/**
 * @private
 * Enriches TinyMCE editor content
 */
class HTMLEnricher {
    static patchEnrich() {
        const oldEnrich = TextEditor.enrichHTML;
        // @ts-ignore
        TextEditor.enrichHTML = function (html, options) {
            html = oldEnrich.apply(this, [html, options]);
            html = HTMLEnricher.enrichAll(html);
            return html;
        };
    }
    static bindRichTextLinks(html) {
        html.find('a.pdfoundry-link').on('click', (event) => {
            event.preventDefault();
            // This will always be an anchor
            const target = $(event.currentTarget);
            const ref = target.data('ref');
            const page = target.data('page');
            // ref can match name or code
            let pdfData = Api_1.default.findPDFData((data) => {
                return data.name === ref || data.code === ref;
            });
            if (!pdfData) {
                ui.notifications.error(`Unable to find a PDF with a name or code matching ${ref}.`);
                return;
            }
            if (page === 0) {
                Api_1.default.openPDF(pdfData);
            }
            else {
                Api_1.default.openPDF(pdfData, {
                    page,
                });
            }
        });
    }
    /**
     * Replace the first @PDF link in the text with a rich link.
     * @param text
     */
    static enrich(text) {
        const sPos = text.indexOf('@');
        const ePos = text.indexOf('}', sPos);
        const enrichMe = text.slice(sPos, ePos + 1);
        const lBracket = enrichMe.indexOf('[');
        const rBracket = enrichMe.indexOf(']');
        const lCurly = enrichMe.indexOf('{');
        const rCurly = enrichMe.indexOf('}');
        // Required character is missing
        if (lBracket === -1 || rBracket === -1 || lCurly === -1 || rCurly === -1) {
            throw new Error(game.i18n.localize('PDFOUNDRY.ENRICH.InvalidFormat'));
        }
        // Order is not correct
        if (rCurly < lCurly || lCurly < rBracket || rBracket < lBracket) {
            throw new Error(game.i18n.localize('PDFOUNDRY.ENRICH.InvalidFormat'));
        }
        const options = enrichMe.slice(lBracket + 1, rBracket);
        // Multiple dividers are not supported
        if (options.indexOf('|') !== options.lastIndexOf('|')) {
            throw new Error(game.i18n.localize('PDFOUNDRY.ENRICH.InvalidFormat'));
        }
        let linkText = enrichMe.slice(lCurly + 1, rCurly);
        // Empty names are not supported
        if (linkText === undefined || linkText === '') {
            throw new Error(game.i18n.localize('PDFOUNDRY.ENRICH.EmptyLinkText'));
        }
        let pageNumber = 0;
        const [nameOrCode, queryString] = options.split('|');
        // Getting the PDF without invisible PDFs to check permissions
        let pdfData = Api_1.default.findPDFData((data) => {
            return data.name === nameOrCode || data.code === nameOrCode;
        }, false);
        if (pdfData) {
            // Case 1 - User has permissions to see the PDF
            if (queryString !== undefined && queryString !== '') {
                const [_, pageString] = queryString.split('=');
                try {
                    pageNumber = parseInt(pageString);
                }
                catch (error) {
                    // Ignore page number
                }
            }
            if (pageNumber < 0) {
                throw new Error('PDFOUNDRY.ERROR.PageMustBePositive');
            }
            const i18nOpen = game.i18n.localize('PDFOUNDRY.ENRICH.LinkTitleOpen');
            const i18nPage = game.i18n.localize('PDFOUNDRY.ENRICH.LinkTitlePage');
            const linkTitle = `${i18nOpen} ${nameOrCode} ${i18nPage} ${pageNumber}`;
            const result = `<a class="pdfoundry-link" title="${linkTitle}" data-ref="${nameOrCode}" data-page="${pageNumber}">${linkText}</a>`;
            return text.slice(0, sPos) + result + text.slice(ePos + 1);
        }
        else {
            // Case 2 - User does not have permissions to see the PDF
            return text.slice(0, sPos) + linkText + text.slice(ePos + 1);
        }
    }
    /**
     * Replace all rich text markup with appropriate rich text HTML in the specified text.
     * @param text
     */
    static enrichAll(text) {
        while (text.includes('@PDF')) {
            text = HTMLEnricher.enrich(text);
        }
        return text;
    }
}
exports.default = HTMLEnricher;

},{"../Api":1}],23:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
/**
 * @private
 * A plugin for TinyMCE that handles Drag + Drop
 */
class TinyMCEPlugin {
    /**
     * Register plugin with Foundry + TinyMCE
     */
    static Register() {
        // @ts-ignore
        tinyMCE.PluginManager.add(TinyMCEPlugin.pluginName, function (editor) {
            editor.on('BeforeSetContent', (event) => TinyMCEPlugin.Handle(event));
        });
        CONFIG.TinyMCE.plugins = `${TinyMCEPlugin.pluginName} ${CONFIG.TinyMCE.plugins}`;
    }
    static Handle(event) {
        if (event.initial)
            return;
        if (!event.selection || event.set !== undefined) {
            return;
        }
        const initialContent = event.content;
        const lBracket = initialContent.indexOf('[');
        const rBracket = initialContent.indexOf(']');
        const entityId = initialContent.slice(lBracket + 1, rBracket);
        const entity = game.journal.get(entityId);
        if (entity === undefined || !(0, Util_1.isEntityPDF)(entity)) {
            return;
        }
        const pdfData = (0, Util_1.getPDFData)(entity);
        if (pdfData === undefined) {
            return;
        }
        const codeOrName = pdfData.code ? pdfData.code : pdfData.name;
        event.content = `@PDF[${codeOrName}|page=1]{${pdfData.name}}`;
    }
}
exports.default = TinyMCEPlugin;
TinyMCEPlugin.pluginName = 'PDFoundry_HTMLEnrich_Drop';

},{"../Util":5}],24:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLegacy = exports.legacyMigrationRequired = void 0;
const PDFType_1 = require("../common/types/PDFType");
const Util_1 = require("../Util");
const Settings_1 = __importDefault(require("../Settings"));
/**
 * Should this migration run
 * @internal
 */
function legacyMigrationRequired() {
    if (Settings_1.default.get(Settings_1.default.SETTINGS_KEY.DATA_VERSION) === 'undefined') {
        if (game.items.find((i) => i.data.type === 'PDFoundry_PDF') !== null) {
            return true;
        }
        else {
            Settings_1.default.set(Settings_1.default.SETTINGS_KEY.DATA_VERSION, 'v0.6.0');
            return false;
        }
    }
    else {
        return false;
    }
}
exports.legacyMigrationRequired = legacyMigrationRequired;
/**
 * Open the migration window for migration
 * @internal
 */
function migrateLegacy() {
    return new Promise(async (resolve, reject) => {
        let d = new Dialog({
            title: 'PDFoundry: Migration Required',
            content: [
                '<h1>Migration Required</h1>',
                '<p>PDFoundry must convert legacy items to the new Journal format; You will not be able to use PDFoundry until you do.</p>',
                '<p>If you wish to backup your world - just in case - you may do so now.</p>',
                '<p>Please note folder structure will not be preserved.</p>',
            ].join(''),
            buttons: {
                proceed: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Migrate Now',
                    callback: () => {
                        convert()
                            .then(() => resolve())
                            .catch(() => reject());
                    },
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Remind Me Later',
                    callback: () => resolve(),
                },
            },
            default: 'cancel',
        });
        d.render(true);
    });
}
exports.migrateLegacy = migrateLegacy;
/**
 * Run the conversion
 * @internal
 */
async function convert() {
    const items = game.items.filter((i) => i.data.type === 'PDFoundry_PDF');
    for (const item of items) {
        let pdfData = getLegacyData(item);
        // @ts-ignore
        const permission = item.data.permission;
        const journalEntry = (await JournalEntry.create({
            name: pdfData.name,
            permission,
        }));
        // @ts-ignore
        delete pdfData.name;
        await (0, Util_1.setPDFData)(journalEntry, pdfData);
        await item.delete({});
    }
    // @ts-ignore
    ui.journal.render();
}
/**
 * Get legacy PDF data & type
 * @param item
 * @internal
 */
function getLegacyData(item) {
    const typeMap = {
        PDFoundry_PDF: PDFType_1.PDFType.Static,
        PDFoundry_FillablePDF: PDFType_1.PDFType.Fillable,
        PDFoundry_FillableActor: PDFType_1.PDFType.Actor,
    };
    // @ts-ignore
    let type = typeMap[item.data.data.pdf_type] ?? PDFType_1.PDFType.Static;
    return {
        name: item.data.name,
        // @ts-ignore
        url: item.data.data.url,
        // @ts-ignore
        code: item.data.data.code,
        // @ts-ignore
        offset: item.data.data.offset,
        // @ts-ignore
        cache: item.data.data.cache,
        type,
    };
}

},{"../Settings":3,"../Util":5,"../common/types/PDFType":21}],25:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socket = void 0;
const PreloadEvent_1 = __importDefault(require("./events/PreloadEvent"));
const Api_1 = __importDefault(require("../Api"));
const Settings_1 = __importDefault(require("../Settings"));
const SetViewEvent_1 = __importDefault(require("./events/SetViewEvent"));
const PDFCache_1 = __importDefault(require("../cache/PDFCache"));
/**
 * @private
 */
class Socket {
    static initialize() {
        // @ts-ignore TODO
        game.socket.on(Settings_1.default.SOCKET_NAME, (event) => {
            try {
                const { userIds, type, payload } = event;
                // null = all users, otherwise check if this event effects us
                if (userIds !== null && !userIds.includes(game.userId)) {
                    return;
                }
                if (type === SetViewEvent_1.default.EVENT_TYPE) {
                    Socket.handleSetView(payload);
                    return;
                }
                else if (type === PreloadEvent_1.default.EVENT_TYPE) {
                    Socket.handlePreloadPDF(payload);
                    return;
                }
                else {
                    if (type.includes('PDFOUNDRY')) {
                        console.error(`Event of type ${type} has no handler.`);
                        return;
                    }
                }
            }
            catch (e) {
                // Pass
            }
        });
    }
    static handleSetView(data) {
        if (Settings_1.default.get(Settings_1.default.SETTINGS_KEY.EXISTING_VIEWER)) {
            function appIsViewer(app) {
                return app['pdfData'] !== undefined;
            }
            for (const app of Object.values(ui.windows)) {
                if (!appIsViewer(app)) {
                    continue;
                }
                const pdfData = app.pdfData;
                if (data.pdfData.url === pdfData.url) {
                    app.page = data.page;
                    return;
                }
            }
            // App not found, fall through.
        }
        Api_1.default.openPDF(data.pdfData, {
            page: data.page,
        });
    }
    static handlePreloadPDF(data) {
        PDFCache_1.default.preload(data.url);
    }
}
exports.Socket = Socket;

},{"../Api":1,"../Settings":3,"../cache/PDFCache":14,"./events/PreloadEvent":26,"./events/SetViewEvent":27}],26:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SocketEvent_1 = __importDefault(require("./SocketEvent"));
/**
 * @private
 */
class PreloadEvent extends SocketEvent_1.default {
    constructor(userIds, url) {
        super(userIds);
        this.url = url;
    }
    static get EVENT_TYPE() {
        return `${super.EVENT_TYPE}/PRELOAD_PDF`;
    }
    get type() {
        return PreloadEvent.EVENT_TYPE;
    }
    getPayload() {
        const payload = super.getPayload();
        payload.url = this.url;
        return payload;
    }
}
exports.default = PreloadEvent;

},{"./SocketEvent":28}],27:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SocketEvent_1 = __importDefault(require("./SocketEvent"));
/**
 * @private
 */
class SetViewEvent extends SocketEvent_1.default {
    constructor(userIds, pdfData, page) {
        super(userIds);
        this.pdfData = pdfData;
        this.page = page;
    }
    static get EVENT_TYPE() {
        return `${super.EVENT_TYPE}/SET_VIEW`;
    }
    get type() {
        return SetViewEvent.EVENT_TYPE;
    }
    getPayload() {
        const payload = super.getPayload();
        payload.pdfData = this.pdfData;
        payload.page = this.page;
        return payload;
    }
}
exports.default = SetViewEvent;

},{"./SocketEvent":28}],28:[function(require,module,exports){
"use strict";
/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../../Settings"));
/**
 * @private
 */
class SocketEvent {
    constructor(userIds) {
        this.userIds = userIds;
    }
    /**
     * The type of this event.
     */
    static get EVENT_TYPE() {
        return 'PDFOUNDRY';
    }
    /**
     * Get any data that will be sent with the event.
     */
    getPayload() {
        return {};
    }
    emit() {
        // @ts-ignore TODO
        game.socket.emit(Settings_1.default.SOCKET_NAME, {
            type: this.type,
            userIds: this.userIds,
            payload: this.getPayload(),
        });
    }
}
exports.default = SocketEvent;

},{"../../Settings":3}],29:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
const ActorSheetSelect_1 = __importDefault(require("../app/ActorSheetSelect"));
const Util_1 = require("../Util");
const PDFActorSheetAdapter_1 = __importDefault(require("../app/PDFActorSheetAdapter"));
const FillableViewer_1 = __importDefault(require("./FillableViewer"));
const PDFActorDataBrowser_1 = __importDefault(require("../app/PDFActorDataBrowser"));
/**
 * The FillableViewer class provides an interface for displaying, serializing, and observing form-fillable PDFs,
 *  all while connecting their data to a specific actor. Extends the Fillable Viewer.
 * @module API
 */
class ActorViewer extends FillableViewer_1.default {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(actor, pdfData, sheet, options) {
        super(actor, pdfData, options);
        this.document = actor;
        this.actorSheet = sheet;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    get title() {
        return this.document.name;
    }
    /**
     * Get the URL for the current sheet from the actor flags.
     */
    getSheetId() {
        return this.document.getFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.SHEET_ID);
    }
    /**
     * Save the URL for the current sheet to the actor flags.
     * @param value
     */
    async setSheetId(value) {
        if (typeof value === 'string') {
            return this.document.setFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.SHEET_ID, value);
        }
        else {
            return this.document.unsetFlag(Settings_1.default.MODULE_NAME, Settings_1.default.FLAGS_KEY.SHEET_ID);
        }
    }
    /**
     * Get pdf data for the currently set PDF sheet id
     */
    getSheetPdf() {
        const id = this.getSheetId();
        if (id === undefined)
            return undefined;
        return (0, Util_1.getPDFData)(game.journal.get(id));
    }
    _getHeaderButtons() {
        const buttons = [];
        buttons.unshift({
            label: 'Close',
            class: 'close',
            icon: 'fas fa-times',
            // actor sheet is responsible for our clean up
            onclick: (ev) => this.actorSheet.close(),
        });
        // @ts-ignore
        const canConfigure = game.user.isGM || (this.document.owner && game.user.can('TOKEN_CONFIGURE'));
        if (this.options['editable'] && canConfigure) {
            buttons.unshift({
                // @ts-ignore TODO 0.8.x
                label: this.token ? 'Token' : 'Prototype Token',
                class: 'configure-token',
                icon: 'fas fa-user-circle',
                // @ts-ignore TODO 0.8.x
                onclick: (ev) => this.actorSheet._onConfigureToken(ev),
            });
            buttons.unshift({
                label: 'Sheet',
                class: 'configure-sheet',
                icon: 'fas fa-cog',
                // @ts-ignore TODO 0.8.x
                onclick: (ev) => this.actorSheet._onConfigureSheet(ev),
            });
            buttons.unshift({
                class: 'pdf-sheet-select',
                icon: 'fas fa-user-cog',
                label: game.i18n.localize('PDFOUNDRY.VIEWER.SelectSheet'),
                onclick: () => {
                    const current = this.getSheetId();
                    new ActorSheetSelect_1.default(async (id) => {
                        await this.setSheetId(id);
                        await this.actorSheet.close();
                        const sheet = this.getSheetPdf();
                        if (!sheet) {
                            await this.setSheetId(undefined);
                        }
                        await this.actorSheet.render(true);
                    }, current).render(true);
                },
            });
            if (game.user.isGM) {
                buttons.unshift({
                    class: 'pdf-browse-data',
                    icon: 'fas fa-search',
                    label: game.i18n.localize('PDFOUNDRY.VIEWER.InspectData'),
                    onclick: () => {
                        new PDFActorDataBrowser_1.default(this.document).render(true);
                    },
                });
            }
        }
        return buttons;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    async onViewerReady() {
        super.onViewerReady();
        const sheet = this.getSheetPdf();
        if (sheet) {
            const url = (0, Util_1.getAbsoluteURL)(sheet.url);
            await this.open(url);
        }
    }
    async open(pdfSource, page) {
        if (pdfSource instanceof Uint8Array) {
            throw new Error('Actor Sheets must be opened by ID');
        }
        try {
            await super.open(pdfSource, page);
        }
        catch (error) {
            // @ts-ignore TODO: THIS IS SUPER FUCKING HACK AND THE WHOLE FLOW NEEDS TO BE ANALYZED
            if (!(await srcExists(pdfSource))) {
                ui.notifications.error(game.i18n.localize('PDFOUNDRY.ERROR.FileNotFound'));
                await this.setSheetId(undefined);
            }
            await this.actorSheet.close();
            new PDFActorSheetAdapter_1.default(this.document, this.options).render(true);
        }
    }
}
exports.default = ActorViewer;

},{"../Settings":3,"../Util":5,"../app/ActorSheetSelect":6,"../app/PDFActorDataBrowser":7,"../app/PDFActorSheetAdapter":8,"./FillableViewer":31}],30:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Settings_1 = __importDefault(require("../Settings"));
const events_1 = __importDefault(require("../common/helpers/events"));
const header_1 = require("../common/helpers/header");
const Api_1 = __importDefault(require("../Api"));
const Util_1 = require("../Util");
/**
 * The base viewer class from which all other types of viewers inherit.
 * @see {@link StaticViewer}
 * @see {@link FillableViewer}
 * @see {@link ActorViewer}
 * @module API
 */
class BaseViewer extends Application {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(options) {
        super(options);
        this._eventStore = new events_1.default();
    }
    // <editor-fold desc="Static Properties">
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.classes = ['app', 'window-app', 'pdfoundry-viewer'];
        options.template = `${Settings_1.default.PATH_TEMPLATES}/app/viewer/static.html`;
        options.title = game.i18n.localize('PDFOUNDRY.VIEWER.ViewPDF');
        options.width = 8.5 * 100 + 64;
        options.height = 11 * 100 + 64;
        options.resizable = true;
        return options;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    /**
     * Finish the download and return the byte array for the file.
     * @returns A promise that resolves to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array|Uint8Array}
     *  of file bytes once that download is finished. You can pass this to a viewer to open it, or do something else with it.
     */
    download() {
        return new Promise(async (resolve) => {
            const viewer = await this.getViewer();
            let timeout;
            const returnOrWait = () => {
                if (viewer.downloadComplete) {
                    resolve(viewer.pdfDocument.getData());
                    return;
                }
                timeout = setTimeout(returnOrWait, 50);
            };
            returnOrWait();
        });
    }
    /**
     * Open a PDF
     * @param pdfSource A URL or byte array to open.
     * @param page The initial page to open to
     */
    async open(pdfSource, page) {
        const pdfjsViewer = await this.getViewer();
        if (typeof page === 'string') {
            page = parseInt(page);
        }
        if (page) {
            pdfjsViewer.initialBookmark = `page=${page}`;
        }
        await pdfjsViewer.initializedPromise;
        await pdfjsViewer.open(pdfSource);
        await pdfjsViewer.pdfViewer.pagesPromise;
        // See #19 - fixes other scroll modes not loading with initial bookmark
        if (page && pdfjsViewer.page !== page) {
            pdfjsViewer.page = page;
        }
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    /**
     * Get the currently viewed page.
     */
    get page() {
        return this._viewer.page;
    }
    /**
     * Set the currently viewed page.
     * @param value
     */
    set page(value) {
        this._viewer.page = value;
    }
    /**
     * Returns the localized name of the window title.
     * @override
     */
    get title() {
        return game.i18n.localize('PDFOUNDRY.VIEWER.ViewPDF');
    }
    /**
     * Wait for the internal PDFjs viewer to be ready and usable.
     */
    getViewer() {
        if (this._viewer) {
            return Promise.resolve(this._viewer);
        }
        return new Promise((resolve) => {
            let timeout;
            const returnOrWait = () => {
                // If our window has finished initializing...
                if (this._frame) {
                    // If PDFjs has finished initializing...
                    if (this._frame.contentWindow && this._frame.contentWindow['PDFViewerApplication']) {
                        const viewer = this._frame.contentWindow['PDFViewerApplication'];
                        resolve(viewer);
                        return;
                    }
                }
                // If any ifs fall through, try again in a few ms
                timeout = setTimeout(returnOrWait, 5);
            };
            returnOrWait();
        });
    }
    /**
     * Wait for the internal PDFjs eventBus to be ready and usable.
     */
    getEventBus() {
        if (this._eventBus) {
            return Promise.resolve(this._eventBus);
        }
        return new Promise((resolve) => {
            this.getViewer().then((viewer) => {
                let timeout;
                const returnOrWait = () => {
                    if (viewer.eventBus) {
                        resolve(viewer.eventBus);
                        return;
                    }
                    timeout = setTimeout(returnOrWait, 5);
                };
                returnOrWait();
            });
        });
    }
    // </editor-fold>
    // <editor-fold desc="Foundry Overrides">
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        buttons.unshift(header_1.BUTTON_GITHUB);
        buttons.unshift(header_1.BUTTON_KOFI);
        return buttons;
    }
    /**
     * @internal
     */
    async getData(options) {
        const data = await super.getData(options);
        data.viewerFramePath = `${Settings_1.default.PATH_PDFJS}/web/viewer.html`;
        return data;
    }
    async activateListeners(html) {
        this.onViewerOpening();
        super.activateListeners(html);
        this._frame = html.parent().find('iframe.pdfViewer').get(0);
        this.getViewer().then(async (viewer) => {
            this._viewer = viewer;
            const theme = Api_1.default.activeTheme;
            const frameDocument = $(this._frame.contentDocument);
            frameDocument.on('click', () => this.bringToTop());
            const head = frameDocument.find('head');
            head.append($(`<link href="${(0, Util_1.getAbsoluteURL)(theme.filePath)}" rel="stylesheet" type="text/css" media="all">`));
            this.onViewerOpened();
            this.getEventBus().then((eventBus) => {
                this._eventBus = eventBus;
                this._eventBus.on('pagerendered', this.onPageRendered.bind(this));
                this._eventBus.on('pagechanging', this.onPageChanging.bind(this));
                this._eventBus.on('updateviewarea', this.onViewAreaUpdated.bind(this));
                this._eventBus.on('scalechanging', this.onScaleChanging.bind(this));
                this.onViewerReady();
            });
        });
        // _getHeaderButtons does not permit title attributes used for tooltips...
        $(html).parents().parents().find('.pdf-sheet-show-players').prop('title', game.i18n.localize('PDFOUNDRY.VIEWER.ShowToPlayersTitle'));
    }
    /**
     * Close the application and un-register references to it within UI mappings
     * This function returns a Promise which resolves once the window closing animation concludes
     */
    async close() {
        this.onViewerClosing();
        await super.close();
        this.onViewerClosed();
    }
    // </editor-fold>
    // <editor-fold desc="Events">
    /**
     * Fires when the viewer window first starts opening
     * @protected
     */
    onViewerOpening() {
        this._eventStore.fire('viewerOpening', this);
    }
    /**
     * Fires when the viewer window is fully opened, but not yet ready
     * @protected
     */
    onViewerOpened() {
        this._eventStore.fire('viewerOpened', this);
    }
    /**
     * Fires when the viewer window is fully opened and is ready for use
     * @protected
     */
    onViewerReady() {
        this._eventStore.fire('viewerReady', this);
    }
    /**
     * Fires when the viewer window first starts closing
     * @protected
     */
    onViewerClosing() {
        this._eventStore.fire('viewerClosing', this);
    }
    /**
     * Fires when the viewer window is fully closed
     * @protected
     */
    onViewerClosed() {
        this._eventStore.fire('viewerClosed', this);
    }
    /**
     * Occurs during scrolling when a page passes the breakpoint
     * @param event
     * @protected
     */
    onPageChanging(event) {
        this._eventStore.fire('pageChanging', this, {
            pageLabel: event.pageLabel,
            pageNumber: event.pageNumber,
        });
    }
    /**
     * Occurs when a new page is loaded and rendered
     * @param event
     * @protected
     */
    onPageRendered(event) {
        this._eventStore.fire('pageRendered', this, {
            pageNumber: event.pageNumber,
            pageLabel: event.source.pageLabel,
            width: event.source.width,
            height: event.source.height,
            rotation: event.source.rotation,
            scale: event.source.scale,
            canvas: event.source.canvas,
            div: event.source.div,
            error: event.source.error,
        });
    }
    /**
     * Occurs when the zoom is changed or window scrolled
     * @param event
     * @protected
     */
    onViewAreaUpdated(event) {
        this._eventStore.fire('viewAreaUpdated', this, {
            top: event.location.top,
            left: event.location.left,
            pageNumber: event.location.pageNumber,
            rotation: event.location.rotation,
            scale: event.location.scale,
        });
    }
    /**
     * Occurs when the zoom is changed
     * @param event
     * @protected
     */
    onScaleChanging(event) {
        this._eventStore.fire('scaleChanging', this, {
            presetValue: event.presetValue,
            scale: event.scale,
        });
    }
    /**
     * Register a callback to occur when an event fires. See individual events for descriptions and use {@link Api.DEBUG.EVENTS} to log and analyze events.
     * @param eventName
     * @param callback
     * @category Events
     */
    on(eventName, callback) {
        this._eventStore.on(eventName, callback);
    }
    /**
     * Deregister an event that has been registered with {@link on} or {@link once}.
     * @param eventName
     * @param callback
     * @category Events
     */
    off(eventName, callback) {
        this._eventStore.off(eventName, callback);
    }
    /**
     * Like {@link on} but only fires on the next occurrence.
     * @param eventName
     * @param callback
     * @category Events
     */
    once(eventName, callback) {
        this._eventStore.once(eventName, callback);
    }
}
exports.default = BaseViewer;

},{"../Api":1,"../Settings":3,"../Util":5,"../common/helpers/events":19,"../common/helpers/header":20}],31:[function(require,module,exports){
"use strict";
/*
 * Copyright 2022 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseViewer_1 = __importDefault(require("./BaseViewer"));
const Settings_1 = __importDefault(require("../Settings"));
// TODO: Move to wrapped input model to standardize inputs.
//  Current code is insane and has too much branching.
//  Factory should be used to create the wrapped inputs.
// /**
//  * Wraps an input to standardize operations over various HTML elements.
//  * @internal
//  */
// abstract class FormInput<TElement extends HTMLElement, TValue> {
//     protected _element: TElement;
//     protected _name: string;
//     protected _value: TValue;
//
//     public static IsOfType(element: HTMLElement) {
//         return false;
//     }
//
//     /**
//      * Return the HTML element for this input.
//      */
//     public get element() {
//         return this._element;
//     }
//
//     /**
//      * Return the name of this input.
//      */
//     public get name() {
//         return this._name;
//     }
//
//     protected constructor(name: string, element: TElement, value: TValue) {
//         this._name = name;
//         this._element = element;
//         this._value = value;
//
//         $(this._element).attr('name', this._name);
//     }
//
//     /**
//      * Get the value of this input.
//      */
//     public abstract get value();
//
//     /**
//      * Set the value of this input.
//      * @param newValue The value to set to.
//      */
//     public abstract set value(newValue: TValue);
//
//     public abstract onInputChanged(event: JQuery.ChangeEvent);
// }
//
// class InputInput extends FormInput<HTMLInputElement, string> {
//     public static IsOfType(element: HTMLElement): element is HTMLInputElement {
//         return element.tagName === 'INPUT';
//     }
//
//     onInputChanged(event: JQuery.ChangeEvent) {}
//
//     public get value() {
//         return this._value;
//     }
//
//     public set value(newValue: string) {
//         this._value = newValue;
//     }
// }
/**
 * Handles base form fillable support, can be used as a stand alone form fillable viewer.
 * @module API
 */
class FillableViewer extends BaseViewer_1.default {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(document, pdfData, options) {
        super(options);
        this.document = document;
        this.pdfData = pdfData;
        this.bindHooks();
    }
    // <editor-fold desc="Static Properties">
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = `${Settings_1.default.PATH_TEMPLATES}/app/viewer/fillable.html`;
        return options;
    }
    // </editor-fold>
    // <editor-fold desc="Static Methods">
    /**
     * Validate the data path of the key.
     * @param path
     */
    static dataPathValid(path) {
        return !path.includes('_id');
    }
    /**
     * Fix keys by removing invalid characters
     * @param key
     */
    static fixKey(key) {
        if (key.startsWith(`data.`)) {
            return key;
        }
        key = key.trim();
        return key.replace(/\s/g, '_');
    }
    /**
     * Resolve a key path to the proper flattened key
     * @param key
     */
    static resolveKeyPath(key) {
        if (key === 'name')
            return key;
        if (key.startsWith(`data.`)) {
            return this.fixKey(key);
        }
        return `flags.${Settings_1.default.MODULE_NAME}.${Settings_1.default.FLAGS_KEY.FORM_DATA}.${this.fixKey(key)}`;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    get title() {
        return this.document.name ?? super.title;
    }
    flattenEntity() {
        const data = flattenObject({
            name: this.document.name,
            data: this.document.data['data'],
            flags: this.document.data['flags'],
        });
        // Do not allow non-data keys to make it into the flat object
        for (const key of Object.keys(data)) {
            if (!FillableViewer.dataPathValid(key)) {
                delete data[key];
            }
        }
        return data;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    bindHooks() {
        if (this.document['uuid'].startsWith('Actor')) {
            Hooks.on('updateActor', this.onUpdateEntity.bind(this));
        }
        else if (this.document['uuid'].startsWith('Item')) {
            Hooks.on('updateItem', this.onUpdateEntity.bind(this));
        }
    }
    unbindHooks() {
        if (this.document['uuid'].startsWith('Actor')) {
            Hooks.off('updateActor', this.onUpdateEntity.bind(this));
        }
        else if (this.document['uuid'].startsWith('Item')) {
            Hooks.off('updateItem', this.onUpdateEntity.bind(this));
        }
    }
    elementIsCheckbox(element) {
        return element.tagName === 'INPUT' && element.getAttribute('type') === 'checkbox';
    }
    elementIsInput(element) {
        return (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && element.getAttribute('type') !== 'radio';
    }
    elementIsSelect(element) {
        return element.tagName === 'SELECT';
    }
    elementIsRadio(element) {
        return element.tagName === 'INPUT' && element.getAttribute('type') === 'radio';
    }
    onPageRendered(event) {
        const POLL_INTERVAL = 5;
        const MAX_POLL_TIME = 250;
        const container = $(event.source.div);
        new Promise((resolve, reject) => {
            let timeout;
            let totalWait = 0;
            let elements;
            const returnOrWait = () => {
                elements = container.find('input, textarea, select');
                if (elements.length > 0) {
                    clearTimeout(timeout);
                    resolve(elements);
                    return;
                }
                else if (totalWait < MAX_POLL_TIME) {
                    totalWait += POLL_INTERVAL;
                    timeout = setTimeout(returnOrWait, POLL_INTERVAL);
                }
                else {
                    reject({
                        message: 'Page did not render in the allowed time.',
                        event,
                    });
                }
            };
            returnOrWait();
        })
            .then((elements) => {
            if (this.container === undefined || this.container.length === 0) {
                this.container = $(container.parents().find('#viewerContainer'));
            }
            this.initializeInputs(elements);
            elements.on('change', this.onInputChanged.bind(this));
            super.onPageRendered(event);
        })
            .catch((reason) => console.error(reason));
    }
    onInputChanged(event) {
        const element = event.currentTarget;
        let value = '';
        let key = $(element).attr('name');
        if (key === undefined) {
            return;
        }
        key = FillableViewer.resolveKeyPath(key);
        if (!FillableViewer.dataPathValid(key)) {
            return;
        }
        if (this.elementIsCheckbox(element)) {
            value = this.getCheckInputValue($(element));
        }
        else if (this.elementIsInput(element)) {
            value = this.getTextInputValue($(element));
        }
        else if (this.elementIsSelect(element)) {
            value = this.getTextInputValue($(element));
        }
        else if (this.elementIsRadio(element)) {
            value = this.getRadioInputValue($(element));
        }
        this.update(this.resolveDelta(this.flattenEntity(), {
            [key]: value,
        })).then((result) => {
            const elementsToUpdate = this.container.find('input, textarea, select');
            this.initializeInputs(elementsToUpdate);
        });
    }
    initializeInputs(elements) {
        const oldData = this.flattenEntity();
        const newData = duplicate(oldData);
        // Load data from sheet as initialization data
        // Fill in existing data where it exists on the actor
        let write = false;
        for (const element of elements) {
            let key = element.getAttribute('name');
            if (key === null || !FillableViewer.dataPathValid(key)) {
                continue;
            }
            key = FillableViewer.resolveKeyPath(key);
            if (this.elementIsCheckbox(element)) {
                write = this.initializeCheckInput($(element), key, newData) || write;
            }
            else if (this.elementIsInput(element)) {
                write = this.initializeTextInput($(element), key, newData) || write;
            }
            else if (this.elementIsSelect(element)) {
                write = this.initializeTextInput($(element), key, newData) || write;
            }
            else if (this.elementIsRadio(element)) {
                write = this.initializeRadioInput($(element), key, newData) || write;
            }
            else {
                console.error('Unsupported input type in PDF.');
            }
        }
        if (write) {
            this.update(this.resolveDelta(oldData, newData));
        }
    }
    resolveDelta(oldData, newData) {
        // Flags must be fully resolved
        const delta = { ...flattenObject({ flags: this.document.data['flags'] }) };
        for (const [key, newValue] of Object.entries(newData)) {
            const oldValue = oldData[key];
            // Arrays dont make sense on PDFs which are not dynamic
            if (Array.isArray(newValue) || Array.isArray(oldValue)) {
                delete delta[key];
                continue;
            }
            // Skip matching values
            if (oldValue !== undefined && newValue === oldValue) {
                continue;
            }
            delta[key] = newValue;
        }
        return delta;
    }
    refreshTitle() {
        $(this.element).find('.window-title').text(this.title);
    }
    onUpdateEntity(actor, data, options, id) {
        if (data._id !== this.document.id) {
            return;
        }
        const args = duplicate(data);
        // @ts-ignore
        delete args['_id'];
        const elementsToUpdate = this.container.find('input, textarea, select');
        this.initializeInputs(elementsToUpdate);
        this.refreshTitle();
    }
    async update(delta) {
        // data must be expanded to set properly
        // TODO: Flags seem to be always set - delta needs checking
        return this.document.update(expandObject(delta));
    }
    initializeTextInput(input, key, data) {
        let value = data[key];
        if (value === undefined) {
            // If value does not exist on actor yet, load from sheet
            const inputValue = input.val();
            if (inputValue) {
                // Actor changes were made
                data[key] = inputValue.toString();
                return true;
            }
        }
        else {
            // Otherwise initialize input value to actor value
            this.setTextInput(input, value);
        }
        return false;
    }
    initializeCheckInput(input, key, data) {
        let value = data[key];
        if (value === undefined) {
            const inputValue = input.attr('checked') !== undefined;
            // Actor changes were made
            data[key] = inputValue.toString();
            return true;
        }
        else {
            this.setCheckInput(input, value);
        }
        return false;
    }
    initializeRadioInput(input, key, data) {
        let value = data[key];
        if (value === undefined || value === '') {
            data[key] = this.getRadioInputValue(input);
            return true;
        }
        else {
            // if we're looking at the right radio for the group enable it
            if (data[key] === input.attr('id')) {
                this.setCheckInput(input, 'true');
            }
            else {
                this.setCheckInput(input, 'false');
            }
        }
        return false;
    }
    setTextInput(input, value) {
        input.val(value);
    }
    setCheckInput(input, value) {
        if (value === 'true') {
            input.attr('checked', 'true');
        }
        else {
            input.removeAttr('checked');
        }
    }
    getTextInputValue(input) {
        const value = input.val();
        if (!value) {
            return '';
        }
        return value.toString().trim();
    }
    getCheckInputValue(input) {
        return (window.getComputedStyle(input.get(0), ':before').content !== 'none').toString();
    }
    getRadioInputValue(input) {
        const name = input.attr('name');
        const elements = $(this.container).find(`input[name="${name}"]`);
        for (let i = 0; i < elements.length; i++) {
            const element = elements.get(i);
            if (window.getComputedStyle(element, ':before').content !== 'none') {
                return element.id;
            }
        }
        return '';
    }
    async close() {
        // await this.setActorData(this.actorData);
        if (this._viewer) {
            await this._viewer.close();
        }
        this.unbindHooks();
        return super.close();
    }
}
exports.default = FillableViewer;

},{"../Settings":3,"./BaseViewer":30}],32:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021 Andrew Cuccinello
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseViewer_1 = __importDefault(require("./BaseViewer"));
const PlayerSelect_1 = __importDefault(require("../app/PlayerSelect"));
const Util_1 = require("../Util");
const SetViewEvent_1 = __importDefault(require("../socket/events/SetViewEvent"));
const PDFType_1 = require("../common/types/PDFType");
/**
 * The PDFoundry StaticViewer class opens PDFs and provides event hooks for observing the viewer.
 * Static viewers display a PDF but do not render or instantiate any fillable fields or their data.
 *
 * You cannot create a new instance of this class, you must do so with the API.
 *
 * See {@link Api.openPDF}, {@link Api.openPDFByCode}, {@link Api.openPDFByName}, {@link Api.openURL}
 *  which all return a promise which resolve with an instance of this class.
 * @module API
 */
class StaticViewer extends BaseViewer_1.default {
    // </editor-fold>
    // <editor-fold desc="Constructor & Initialization">
    constructor(pdfData, options) {
        super(options);
        if (pdfData === undefined) {
            pdfData = {
                name: game.i18n.localize('PDFOUNDRY.VIEWER.ViewPDF'),
                code: '',
                offset: 0,
                url: '',
                type: PDFType_1.PDFType.Static,
                cache: false,
            };
        }
        this._pdfData = pdfData;
    }
    // </editor-fold>
    // <editor-fold desc="Getters & Setters">
    /**
     * Returns a copy of the PDFData this viewer is using.
     * Changes to this data will not reflect in the viewer.
     */
    get pdfData() {
        return duplicate(this._pdfData);
    }
    get title() {
        let title = this._pdfData.name;
        if (this._pdfData.code !== '') {
            title = `${title} (${this._pdfData.code})`;
        }
        return title;
    }
    // </editor-fold>
    // <editor-fold desc="Foundry Overrides">
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        buttons.unshift({
            class: 'pdf-sheet-show-players',
            icon: 'fas fa-eye',
            label: game.i18n.localize('PDFOUNDRY.VIEWER.ShowToPlayersText'),
            onclick: (event) => this.showTo(event),
        });
        return buttons;
    }
    // </editor-fold>
    // <editor-fold desc="Instance Methods">
    /**
     * Show the current page to GMs.
     */
    showTo(event) {
        const pdfData = this.pdfData;
        pdfData.offset = 0;
        const ids = (0, Util_1.getUserIdsExceptMe)();
        if (event.shiftKey) {
            new SetViewEvent_1.default(ids, pdfData, this.page).emit();
        }
        else {
            new PlayerSelect_1.default(ids, (filteredIds) => {
                new SetViewEvent_1.default(filteredIds, pdfData, this.page).emit();
            }).render(true);
        }
    }
}
exports.default = StaticViewer;

},{"../Util":5,"../app/PlayerSelect":10,"../common/types/PDFType":21,"../socket/events/SetViewEvent":27,"./BaseViewer":30}]},{},[2])

//# sourceMappingURL=bundle.js.map
