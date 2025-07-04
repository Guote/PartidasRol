import { DCConfig } from "../apps/dc-config.js";
import { TrapConfig } from "../apps/trap-config.js";
import { setting, i18n, format, log, makeid, MonksEnhancedJournal, quantityname, pricename, currencyname } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";
import { EncounterTemplate } from "../apps/encounter-template.js";
import { getValue, setValue, MEJHelpers } from "../helpers.js";

export class EncounterSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.encounter"),
            template: "modules/monks-enhanced-journal/templates/sheets/encounter.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "description" }],
            dragDrop: [
                { dragSelector: ".document.actor", dropSelector: ".encounter-container" },
                { dragSelector: ".document.item", dropSelector: ".encounter-container" },
                { dragSelector: ".encounter-monsters .item-list .item .item-image", dropSelector: "null" },
                { dragSelector: ".encounter-items .item-list .item .item-name", dropSelector: "null" },
                //{ dragSelector: ".create-encounter", dropSelector: "null" },
                //{ dragSelector: ".create-combat", dropSelector: "null" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.description .tab-inner", ".encounter-content", ".encounter-items", ".encounter-dcs"]
        });
    }

    static get type() {
        return 'encounter';
    }

    static get defaultObject() {
        return { items: [], actors: [], dcs: [], traps: [] };
    }

    async getData() {
        let data = await super.getData();

        if (data.data.flags["monks-enhanced-journal"].monsters) {
            data.data.flags["monks-enhanced-journal"].actors = data.data.flags["monks-enhanced-journal"].monsters;
            this.object.setFlag("monks-enhanced-journal", "actors", data.data.flags["monks-enhanced-journal"].actors);
            this.object.unsetFlag("monks-enhanced-journal", "monsters");
        }

        data.actors = await Promise.all((data.data.flags["monks-enhanced-journal"].actors || []).map(async (ea) => {
            let result = foundry.utils.duplicate(ea);
            let actor = await EnhancedJournalSheet.getDocument(ea);

            if (actor) {
                result.name = actor.name;
                result.img = actor.img;
            } else {
                result.failed = true
            }

            return result;
        }));

        let safeGet = function (container, value) {
            if (config == undefined) return;
            if (config[container] == undefined) return;
            let label = config[container][value];
            return label?.label || label;
        }

        let config = MonksEnhancedJournal.system;

        let dcs = foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.dcs");
        if (dcs) {
            data.dcs = dcs.map(dc => {
                let data = foundry.utils.duplicate(dc);
                if (!data.label) {
                    if (data.attribute == undefined || data.attribute.indexOf(':') < 0)
                        data.label = 'Invalid';
                    else {
                        let [type, value] = dc.attribute.split(':');
                        data.label = safeGet('attributes', value) ||safeGet('abilities', value) || safeGet('skills', value) || safeGet('scores', value) || safeGet('atributos', value) || safeGet('pericias', value) || value;
                        data.label = i18n(data.label);
                    }
                }
                data.img = (data.img == '' ? false : data.img);
                return data;
            });
        }

        data.groups = this.getItemGroups(
            foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.items"),
            foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.type"));

        data.showLocation = game.modules.get("tagger")?.active && game.modules.get("monks-active-tiles")?.active;

        let currency = (data.data.flags['monks-enhanced-journal'].currency || []);
        data.currency = MonksEnhancedJournal.currencies.map(c => {
            return { id: c.id, name: c.name, value: currency[c.id] ?? 0 };
        });

        data.has = {
            monsters: foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.actors")?.length,
            items: foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.items")?.length,
            dcs: foundry.utils.getProperty(data, "data.flags.monks-enhanced-journal.dcs")?.length
        }

        data.canShow = {
            dcs: !!Object.keys(DCConfig.optionList()).length
        }

        return data;
    }

    _documentControls() {
        let ctrls = [
            { text: '<i class="fas fa-search"></i>', type: 'text' },
            { id: 'search', type: 'input', text: i18n("MonksEnhancedJournal.SearchDescription"), callback: this.enhancedjournal.searchText },
            { id: 'show', text: i18n("MonksEnhancedJournal.ShowToPlayers"), icon: 'fa-eye', conditional: game.user.isGM, callback: this.enhancedjournal.doShowPlayers },
            { id: 'edit', text: i18n("MonksEnhancedJournal.EditDescription"), icon: 'fa-pencil-alt', conditional: this.isEditable, callback: () => { this.onEditDescription(); } },
            { id: 'sound', text: i18n("MonksEnhancedJournal.AddSound"), icon: 'fa-music', conditional: this.isEditable, callback: () => { this.onAddSound(); } },
            { id: 'convert', text: i18n("MonksEnhancedJournal.Convert"), icon: 'fa-clipboard-list', conditional: (game.user.isGM && this.isEditable), callback: () => { } }
        ];
        //this.addPolyglotButton(ctrls);
        return ctrls.concat(super._documentControls());
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        //monster
        $('.monster-icon', html).click(this.clickItem.bind(this));
        $('.monster-delete', html).on('click', $.proxy(this._deleteItem, this));
        html.on('dragstart', ".monster-icon", TextEditor._onDragContentLink);
        $('.select-encounter', html).click(this.constructor.selectEncounter.bind(this.object));
        $('.create-encounter', html).click(this.constructor.startEncounter.bind(this.object, false));
        $('.create-combat', html).click(this.constructor.startEncounter.bind(this.object, true));

        //item
        $('.item-icon', html).click(this.clickItem.bind(this));
        $('.item-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.item-edit', html).on('click', this.editItem.bind(this));
        $('.assign-items', html).click(this.constructor.assignItems.bind(this.object));

        //DCs
        $('.dc-create', html).on('click', $.proxy(this.createDC, this));
        $('.dc-edit', html).on('click', $.proxy(this.editDC, this));
        $('.dc-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-dcs .item-name', html).on('click', $.proxy(this.rollDC, this));

        //Traps
        $('.trap-create', html).on('click', $.proxy(this.createTrap, this));
        $('.trap-edit', html).on('click', $.proxy(this.editTrap, this));
        $('.trap-delete', html).on('click', $.proxy(this._deleteItem, this));
        $('.encounter-traps .item-name', html).on('click', $.proxy(this.rollTrap, this));

        $('.item-refill', html).click(this.refillItems.bind(this));
        $('.roll-table', html).click(this.rollTable.bind(this, "actors", false));
        $('.item-name h4', html).click(this._onItemSummary.bind(this));

        $('.refill-all', html).click(this.refillItems.bind(this, 'all'));
    }

    _getSubmitData(updateData = {}) {
        let data = foundry.utils.expandObject(super._getSubmitData(updateData));

        if (data.items) {
            data.flags['monks-enhanced-journal'].items = foundry.utils.duplicate(this.object.getFlag("monks-enhanced-journal", "items") || []);
            for (let item of data.flags['monks-enhanced-journal'].items) {
                let dataItem = data.items[item._id];
                if (dataItem)
                    item = foundry.utils.mergeObject(item, dataItem);
                if (!item.assigned && item.received)
                    delete item.received;
            }
            delete data.items;
        }

        if (data.actors) {
            data.flags['monks-enhanced-journal'].actors = foundry.utils.duplicate(this.object.getFlag("monks-enhanced-journal", "actors") || []);
            for (let actor of data.flags['monks-enhanced-journal'].actors) {
                let dataActor = data.actors[actor.id];
                if (dataActor)
                    actor = foundry.utils.mergeObject(actor, dataActor);
            }
            delete data.actors;
        }

        return foundry.utils.flattenObject(data);
    }

    _canDragDrop(selector) {
        return game.user.isGM || this.object.isOwner;
    }

    _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const target = event.currentTarget;

        const dragData = { from: this.object.uuid };

        let li = $(event.currentTarget).closest('li')[0];
        let type = li.dataset.document || li.dataset.type;
        let id = li.dataset.id;
        dragData.type = type;
        if (type == "Item") {
            let item = this.object.flags["monks-enhanced-journal"]?.items.find(i => i._id == id || i.id == id);
            if (!game.user.isGM && (this.object.flags["monks-enhanced-journal"].purchasing == 'locked' || item?.lock === true)) {
                event.preventDefault();
                return;
            }
            dragData.itemId = id;
            dragData.uuid = this.object.uuid;
            dragData.data = foundry.utils.duplicate(item);

            MonksEnhancedJournal._dragItem = id;
        } else if (type == "Actor") {
            let actor = this.object.flags["monks-enhanced-journal"]?.actors.find(i => i._id == id || i.id == id);
            dragData.uuid = actor.uuid;
        }

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Actor') {
            if (data.groupSelect) {
                for (let actor of data.groupSelect) {
                    await this.addActor({ type: "Actor", uuid: `Actor.${actor}` });
                }
                if (game.MultipleDocumentSelection)
                    game.MultipleDocumentSelection.clearAllTabs();
            } else
                await this.addActor(data);
        }
        else if (data.type == 'Folder') {
            if (!this.object.isOwner)
                return false;
            // Import items from the folder
            let folder = await fromUuid(data.uuid);
            if (folder) {
                for (let item of folder.contents) {
                    if (item instanceof Item) {
                        let itemData = item.toObject();
                        await this.addItem({ data: itemData });
                    }
                }
            }
        }
        else if (data.type == 'Item') {
            if (data.from == this.object.uuid)  //don't drop on yourself
                return;
            if (data.groupSelect) {
                // remove the last 16 characters from the uuid to get the item uuid
                let itemId = data.uuid.substring(0, data.uuid.length - 16);
                for (let item of data.groupSelect) {
                    await this.addItem({ type: "Item", uuid: `${itemId}${item}` });
                }
                if (game.MultipleDocumentSelection)
                    game.MultipleDocumentSelection.clearAllTabs();
            } else
                this.addItem(data);
        }

        log('drop data', event, data);
    }

    async addActor(data) {
        let actor = await this.getItemData(data);

        if (actor) {
            let actors = foundry.utils.duplicate(this.object.getFlag("monks-enhanced-journal", "actors") || []);
            if (!actors.find(a => a.uuid == actor.uuid)) {
                actors.push(actor);
                await this.object.setFlag("monks-enhanced-journal", "actors", actors);
            } else {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.ActorAlreadyInEncounter"));
            }
        }
    }

    async addItem(data) {
        let item;
        if (data.from) {
            item = await EnhancedJournalSheet.getDocument(data);
        } else
            item = await fromUuid(data.uuid);

        if (item) {
            if (getValue(item.system, quantityname()) || (item.type == "spell" && game.system.id == 'dnd5e')) {
                let items = foundry.utils.duplicate(this.object.flags["monks-enhanced-journal"].items || []);

                let itemData = item.toObject();
                if ((itemData.type === "spell") && game.system.id == 'dnd5e') {
                    itemData = await EncounterSheet.createScrollFromSpell(itemData);
                }

                let sysPrice = MEJHelpers.getSystemPrice(item, pricename()); //MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
                let price = MEJHelpers.getPrice(sysPrice);
                let update = {
                    _id: makeid(),
                    flags: {
                        'monks-enhanced-journal': {
                            parentId: item.uuid,
                            quantity: 1,
                            remaining: 1,
                            price: `${price.value} ${price.currency}`
                        }
                    }
                };
                if (game.system.id == "dnd5e") {
                    foundry.utils.setProperty(update, "system.equipped", false);
                }

                items.push(foundry.utils.mergeObject(itemData, update));
                await this.object.setFlag('monks-enhanced-journal', 'items', items);
            } else {
                ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotAddItemType"));
            }
        }
    }

    createDC() {
        let dc = { dc: 10 };
        new DCConfig(dc, this).render(true);
    }

    editDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);
        if (dc != undefined)
            new DCConfig(dc, this).render(true);
    }

    rollDC(event) {
        let item = event.currentTarget.closest('.item');
        let dc = this.object.flags["monks-enhanced-journal"].dcs.find(dc => dc.id == item.dataset.id);

        /*
        let config = (game.system.id == "tormenta20" ? CONFIG.T20 : CONFIG[game.system.id.toUpperCase()]);
        let dctype = 'ability';
        //if (config?.skills[dc.attribute] || config?.pericias[dc.attribute] != undefined)
        //    dctype = 'skill';
        */

        if (game.modules.get("monks-tokenbar")?.active && setting('rolling-module') == 'monks-tokenbar') {
            game.MonksTokenBar.requestRoll(canvas.tokens.controlled, { request: `${dc.attribute}`, dc: dc.dc });
        }
    }

    createTrap() {
        let trap = {};
        new TrapConfig(trap, this).render(true);
    }

    editTrap(event) {
        let item = event.currentTarget.closest('.item');
        let trap = this.object.flags["monks-enhanced-journal"].traps.find(dc => dc.id == item.dataset.id);
        if (trap != undefined)
            new TrapConfig(trap, this).render(true);
    }

    rollTrap(event) {

    }

    static selectEncounter() {
        let tokens = (this.flags['monks-enhanced-journal']?.tokens || []);

        canvas.tokens.activate();
        canvas.hud.note.clear();
        canvas.tokens.releaseAll();
        for (let tokenid of tokens) {
            let token = canvas.tokens.get(tokenid);
            if (token)
                token.control({ releaseOthers: false });
        }
    }

   static async startEncounter(combat) {
        let template = await (EncounterTemplate.fromEncounter(this))?.drawPreview();
        if (template) {
            EncounterSheet.createEncounter.call(this, template, { combat });
        }
    }

    static async createEncounter(templates, options) {
        canvas.tokens.releaseAll();

        let folder = game.folders.find(f => f.name == "Encounter Monsters" && f.folder == undefined);
        if (!folder) {
            let folderData = {
                name: "Encounter Monsters",
                type: "Actor",
                sorting: "m",
                folder: null
            };
            folder = await Folder.create(folderData);
        }

        let tokens = [];
        for (let ea of (this.flags['monks-enhanced-journal']?.actors || [])) {
            let actor = await EnhancedJournalSheet.getDocument(ea);//Actor.implementation.fromDropData(ea);
            if (actor) {
                if (!actor.isOwner) {
                    return ui.notifications.warn(format("MonksEnhancedJournal.msg.YouDontHaveTokenPermissions", { actorname: actor.name }));
                }
                if (actor.compendium) {
                    const actorData = game.actors.fromCompendium(actor);
                    actorData.folder = folder;
                    actor = await Actor.implementation.create(actorData);
                }

                // Prepare the Token data
                let quantity = String(ea.quantity || "1");
                if (quantity.indexOf("d") != -1) {
                    let r = new Roll(quantity);
                    await r.evaluate({ async: true });
                    quantity = r.total;
                } else {
                    quantity = parseInt(quantity);
                    if (isNaN(quantity)) quantity = 1;
                }

                for (let i = 0; i < (quantity || 1); i++) {
                    let data = templates;
                    if (templates instanceof Array) data = templates[parseInt(Math.random() * templates.length)];
                    let template = foundry.utils.duplicate(data);

                    if (!(template instanceof MeasuredTemplate)) {
                        const cls = CONFIG.MeasuredTemplate.documentClass;
                        const doc = new cls(template, { parent: canvas.scene });
                        template = new MeasuredTemplate(doc);

                        let { x, y, direction, distance, angle, width } = template.document;
                        let d = canvas.dimensions;
                        //distance *= (d.size / d.distance);
                        width *= (d.size / d.distance);
                        direction = Math.toRadians(direction);

                        template.position.set(x, y);

                        // Create ray and bounding rectangle
                        template.ray = Ray.fromAngle(x, y, direction, distance);

                        switch (template.document.t) {
                            case "circle":
                                template.shape = template.constructor.getCircleShape(distance);
                                break;
                            case "cone":
                                template.shape = template.constructor.getConeShape(direction, angle, distance);
                                break;
                            case "rect":
                                template.shape = template.constructor.getRectShape(direction, distance);
                                break;
                            case "ray":
                                template.shape = template.constructor.getRayShape(direction, distance, width);
                        }
                    }

                    let newSpot = MonksEnhancedJournal.findVacantSpot(template, { width: actor.prototypeToken.width, height: actor.prototypeToken.height }, tokens, data.center || options.center);
                    let td = await actor.getTokenDocument({ x: newSpot.x, y: newSpot.y, hidden: ea.hidden });
                    //if (ea.hidden)
                    //    td.hidden = true;

                    tokens.push(td);

                    //let token = await cls.createDocuments([td], { parent: canvas.scene });
                    //if (ea.hidden)
                    //    token.update({ hidden: true });

                    //tokenids.push(token.id);
                }
            }
        }

        if (tokens.length) {
            let cls = getDocumentClass("Token");
            let results = await cls.createDocuments(tokens, { parent: canvas.scene });

            let tokenids = (this.flags['monks-enhanced-journal']?.tokens || []).concat(results.map(t => t.id));
            this.setFlag('monks-enhanced-journal', 'tokens', tokenids);

            let that = this;
            window.setTimeout(async function () {
                EncounterSheet.selectEncounter.call(that);
                if (options.combat) {
                    let combatants = await canvas.tokens.toggleCombat();
                    ui.sidebar.activateTab("combat");
                    if (combatants.length) {
                        combatants[0].combat.setFlag("monks-enhanced-journal", "encounterid", that.id);
                    }
                }
            }, 500);
        }
    }

    static async assignItems() {
        let items = foundry.utils.duplicate(this.flags["monks-enhanced-journal"].items || []);
        let currency = this.flags["monks-enhanced-journal"].currency || {};
        items = await super.assignItems(items, currency);
        await this.setFlag('monks-enhanced-journal', 'items', items);

        for (let key of Object.keys(currency))
            currency[key] = 0;

        await this.setFlag('monks-enhanced-journal', 'currency', currency);
    }

    static async itemDropped(id, actor, entry) {
        let item = (entry.getFlag('monks-enhanced-journal', 'items') || []).find(i => i._id == id);
        if (item) {
            let max = foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining");
            let result = await EncounterSheet.confirmQuantity(item, max, "transfer", false);
            if ((result?.quantity ?? 0) > 0) {
                if (foundry.utils.getProperty(item, "flags.monks-enhanced-journal.remaining") < result?.quantity) {
                    ui.notifications.warn(i18n("MonksEnhancedJournal.msg.CannotTransferItemQuantity"));
                    return false;
                }

                this.purchaseItem.call(this, entry, id, result.quantity, { actor, remaining: true });
                result.quantity *= (getValue(item, quantityname()) || 1);   // set the quantity if we're selling quantities of.
                return result;
            }
        }
        return false;
    }

    refillItems(event) {
        let items = foundry.utils.duplicate(this.object.flags["monks-enhanced-journal"].items || []);

        if (event == 'all') {
            for (let item of items) {
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.remaining", foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity"));
            }
            this.object.setFlag('monks-enhanced-journal', 'items', items);
        } else {
            let li = $(event.currentTarget).closest('li')[0];
            let item = items.find(i => i._id == li.dataset.id);
            if (item) {
                foundry.utils.setProperty(item, "flags.monks-enhanced-journal.remaining", foundry.utils.getProperty(item, "flags.monks-enhanced-journal.quantity"));
                this.object.setFlag('monks-enhanced-journal', 'items', items);
            }
        }
    }
}
