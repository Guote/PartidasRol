/**
* Author: FloRad
* Content License: All Rights Reserved Pinnacle Entertainment, Inc
* Software License: Apache License, Version 2.0
*/
class SwadeMeasuredTemplate extends foundry.canvas.placeables
    .MeasuredTemplate {
    handlers = {};
    /**
     * A factory method to create a SwadeMeasuredTemplate instance using provided preset
     * @param preset the preset to use.
     * @param item the item the preset is attached to.
     * @returns SwadeTemplate | null
     */
    static fromPreset(preset, item) {
        const existingPreview = CONFIG.SWADE.activeMeasuredTemplatePreview;
        if (existingPreview && !existingPreview._destroyed) {
            existingPreview.destroy({ children: true });
        }
        CONFIG.SWADE.activeMeasuredTemplatePreview = this._constructPreset(preset, item);
        if (CONFIG.SWADE.activeMeasuredTemplatePreview)
            CONFIG.SWADE.activeMeasuredTemplatePreview.drawPreview();
    }
    static _constructPreset(preset, item) {
        // Prepare template data
        const templateBaseData = {
            user: game.user?.id,
            distance: 0,
            direction: 0,
            x: 0,
            y: 0,
            fillColor: game.user?.color,
            flags: item ? { swade: { origin: item.uuid } } : {},
        };
        const presetPrototype = CONFIG.SWADE.measuredTemplatePresets.find((c) => c.button.name === preset);
        if (!presetPrototype)
            return null;
        //Set template data based on preset option
        const template = new CONFIG.MeasuredTemplate.documentClass(foundry.utils.mergeObject(templateBaseData, presetPrototype.data), {
            parent: canvas.scene ?? undefined,
        });
        //Return the template constructed from the item data
        return new this(template);
    }
    /** Creates a preview of the template */
    drawPreview() {
        const initialLayer = canvas.activeLayer;
        // Draw the template and switch to the template layer
        this.draw();
        this.layer.activate();
        this.layer.preview?.addChild(this);
        // Activate interactivity
        this.activatePreviewListeners(initialLayer);
    }
    /** Activate listeners for the template preview */
    activatePreviewListeners(initialLayer) {
        let moveTime = 0;
        // Update placement (mouse-move)
        this.handlers.mm = (event) => {
            event.stopPropagation();
            const now = Date.now(); // Apply a 20ms throttle
            if (now - moveTime <= 20)
                return;
            const center = event.data.getLocalPosition(this.layer);
            const snapped = canvas.grid.getSnappedPoint(center, {
                mode: CONST.GRID_SNAPPING_MODES.CENTER,
                resolution: 2,
            });
            this.document.updateSource({ x: snapped?.x, y: snapped?.y });
            this.refresh();
            moveTime = now;
        };
        // Cancel the workflow (right-click)
        this.handlers.rc = (event) => {
            this.layer._onDragLeftCancel(event);
            this._removeListenersFromCanvas();
            initialLayer.activate();
        };
        // Confirm the workflow (left-click)
        this.handlers.lc = (event) => {
            this.handlers.rc(event);
            const dest = canvas.grid.getSnappedPoint(this.document, {
                mode: CONST.GRID_SNAPPING_MODES.CENTER,
                resolution: 2,
            });
            this.document.updateSource(dest);
            canvas.scene?.createEmbeddedDocuments('MeasuredTemplate', [
                this.document.toObject(),
            ]);
        };
        // Rotate the template by 3 degree increments (mouse-wheel)
        this.handlers.mw = (event) => {
            if (event.ctrlKey)
                event.preventDefault(); // Avoid zooming the browser window
            event.stopPropagation();
            const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
            const snap = event.shiftKey ? delta : 5;
            this.document.updateSource({
                direction: this.document.direction + snap * Math.sign(event.deltaY),
            });
            this.refresh();
        };
        // Activate listeners
        canvas.stage.on('mousemove', this.handlers.mm);
        canvas.stage.on('mousedown', this.handlers.lc);
        canvas.app.view.oncontextmenu = this.handlers.rc;
        canvas.app.view.onwheel = this.handlers.mw;
    }
    destroy(...args) {
        CONFIG.SWADE.activeMeasuredTemplatePreview = null;
        this._removeListenersFromCanvas();
        return super.destroy(...args);
    }
    /** Remove the mouse listeners from the canvas */
    _removeListenersFromCanvas() {
        canvas.stage.off('mousemove', this.handlers.mm);
        canvas.stage.off('mousedown', this.handlers.lc);
        canvas.app.view.oncontextmenu = null;
        canvas.app.view.onwheel = null;
    }
    _computeShape() {
        const { angle, t } = this.document;
        const gridWidth = this.document.width;
        const { angle: direction, distance } = this.ray;
        if (t === CONST.MEASURED_TEMPLATE_TYPES.CONE)
            return this._getConeShape(direction, angle, distance, gridWidth);
        return super._computeShape();
    }
    _getConeShape(direction, angle, distance, gridWidth) {
        // Special case to handle the base SWADE cone rather than a normal cone definition
        if (angle === 0) {
            const coneEndRadius = game.canvas.grid.size * gridWidth * 0.5; //Halved because gridWidth is the diameter
            const coneLength = distance - coneEndRadius; //Calculate where the cone ends and the circle begins
            const da = 3;
            const c = Ray.fromAngle(0, 0, direction, coneLength);
            const angles = Array.fromRange(180 / da)
                .map((a) => 180 / -2 + a * da)
                .concat([180 / 2]);
            // Get the cone shape as a polygon
            const rays = angles.map((a) => Ray.fromAngle(0, 0, direction + Math.toRadians(a), coneEndRadius));
            const points = rays
                .reduce((arr, r) => {
                return arr.concat([c.B.x + r.B.x, c.B.y + r.B.y]);
            }, [0, 0])
                .concat([0, 0]);
            return new PIXI.Polygon(points);
        }
        else {
            // honestly don't know why super.getConeShape() isn't working but it's not
            return MeasuredTemplate.getConeShape(direction, angle, distance);
        }
    }
    highlightGrid() {
        //return early if te object doesn't actually exist yet
        if (!this.shape)
            return;
        const highlightRAW = game.settings.get('swade', 'highlightTemplate');
        //defer to the core highlighting if the setting is off
        if (!highlightRAW)
            return super.highlightGrid();
        const color = Number(this.document.fillColor);
        const border = Number(this.document.borderColor);
        //get the highlight layer and prep it
        const layer = canvas.interface.grid.getHighlightLayer(this.highlightId);
        if (!layer)
            return;
        layer.clear();
        //get the shape of the template and prep it
        const shape = this.shape.clone();
        if ('points' in shape) {
            shape.points = shape.points.map((p, i) => {
                if (i % 2)
                    return this.y + p;
                else
                    return this.x + p;
            });
        }
        else {
            shape.x += this.x;
            shape.y += this.y;
        }
        //draw the actual shape
        this._highlightGridArea(layer, { color, border, shape });
    }
    /** A re-implementation of `BaseGrid#highlightGridPosition()` to force gridless behavior */
    _highlightGridArea(layer, { color, border, alpha = 0.25, shape }) {
        layer.beginFill(color, alpha);
        if (border)
            layer.lineStyle(2, border, Math.min(alpha * 1.5, 1.0));
        layer.drawShape(shape).endFill();
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
const constants$1 = {
    /** @enum */
    ARMOR_LOCATIONS: {
        HEAD: 'head',
        TORSO: 'torso',
        LEGS: 'legs',
        ARMS: 'arms',
    },
    /** @enum */
    TEMPLATE_PRESET: {
        CONE: 'swcone',
        SCONE: 'swscone',
        STREAM: 'stream',
        SBT: 'sbt',
        MBT: 'mbt',
        LBT: 'lbt',
    },
    /** @enum */
    STATUS_EFFECT_EXPIRATION: {
        StartOfTurnAuto: 0,
        StartOfTurnPrompt: 1,
        EndOfTurnAuto: 2,
        EndOfTurnPrompt: 3,
    },
    /** @enum */
    ADVANCE_TYPE: {
        EDGE: 0,
        SINGLE_SKILL: 1,
        TWO_SKILLS: 2,
        ATTRIBUTE: 3,
        HINDRANCE: 4,
    },
    /** @enum */
    RANK: {
        NOVICE: 0,
        SEASONED: 1,
        VETERAN: 2,
        HEROIC: 3,
        LEGENDARY: 4,
    },
    /** @enum */
    EQUIP_STATE: {
        STORED: 0,
        CARRIED: 1,
        OFF_HAND: 2,
        EQUIPPED: 3,
        MAIN_HAND: 4,
        TWO_HANDS: 5,
    },
    /**
     * Array position corresponds to value of EQUIP_STATE
     * @enum
     */
    EQUIP_STATE_ICONS: [
        'fas fa-archive',
        'fas fa-shopping-bag',
        'fas fa-hand-paper',
        'fas fa-tshirt',
        'fas fa-hand-paper fa-flip-horizontal',
        'fas fa-sign-language',
    ],
    /** @enum */
    RELOAD_TYPE: {
        NONE: 'none',
        SELF: 'self',
        SINGLE: 'single',
        FULL: 'full',
        MAGAZINE: 'magazine',
        BATTERY: 'battery',
        PP: 'pp',
    },
    /** @enum */
    GRANT_ON: {
        ADDED: 0,
        CARRIED: 1,
        READIED: 2,
    },
    /** @enum */
    CONSUMABLE_TYPE: {
        REGULAR: 'regular',
        MAGAZINE: 'magazine',
        BATTERY: 'battery',
    },
    /** @enum */
    ABILITY_TYPE: {
        SPECIAL: 'special',
        ARCHETYPE: 'archetype',
    },
    /** @enum */
    ACTION_TYPE: {
        TRAIT: 'trait',
        DAMAGE: 'damage',
        RESIST: 'resist',
        MACRO: 'macro',
    },
    /** @enum */
    MACRO_ACTOR: {
        DEFAULT: 'default',
        SELF: 'self',
        TARGET: 'target',
    },
    /** @enum */
    ROLL_RESULT: {
        CRITFAIL: -1,
        FAIL: 0,
        SUCCESS: 1,
        RAISE: 2,
    },
    /** @enum */
    ROLL_TYPE: {
        ANY: 0,
        TRAIT: 1,
        ATTACK: 2,
        DAMAGE: 3,
    },
    /** @enum */
    ADDITIONAL_STATS_TYPE: {
        STRING: 'String',
        NUMBER: 'Number',
        BOOLEAN: 'Boolean',
        DIE: 'Die',
        SELECT: 'Selection',
    },
    /** @enum */
    TOUR_TAB_PARENTS: {
        SIDEBAR: 'sidebar',
        GAMESETTINGS: 'settings',
        CONFIGURATOR: 'configurator',
        ACTOR: 'actor',
        ITEM: 'item',
        TWEAKS: 'tweaks',
    },
    /** @enum */
    REQUIREMENT_TYPE: {
        WILDCARD: 'wildCard',
        RANK: 'rank',
        ATTRIBUTE: 'attribute',
        SKILL: 'skill',
        EDGE: 'edge',
        HINDRANCE: 'hindrance',
        ANCESTRY: 'ancestry',
        POWER: 'power',
        OTHER: 'other',
    },
    /** @enum */
    RESERVED_SWID: {
        DEFAULT: 'none',
        ANY: 'any',
    },
    /** @enum */
    HINDRANCE_SEVERITY: {
        MAJOR: 'major',
        MINOR: 'minor',
        EITHER: 'either',
    },
    /** @enum */
    WEAPON_RANGE_TYPE: {
        MELEE: 0,
        RANGED: 1,
        MIXED: 2,
    },
    /** @enum */
    INIT_MESSAGE_TYPE: {
        OFF: 'off',
        COMPACT: 'compact',
        LARGE: 'large',
    },
    /** @enum */
    ARMOR_STACKING: {
        CORE: 'core',
        SWPF: 'swpf',
    },
    /**@enum */
    SUPPLY_LEVEL: {
        VERY_HIGH: 3,
        HIGH: 2,
        LOW: 1,
        OUT: 0,
    },
    PHYSICAL_ITEMS: [
        'weapon',
        'armor',
        'shield',
        'consumable',
        'gear',
    ],
    CREW_ROLE: {
        OPERATOR: 'operator',
        GUNNER: 'gunner',
        OTHER: 'other',
    },
};

/** @internal */
const statusEffects = [
    {
        img: 'systems/swade/assets/icons/status/status_shaken.svg',
        id: 'shaken',
        _id: 'shaken0000000000',
        name: 'SWADE.Shaken',
        duration: {
            rounds: 1,
        },
        changes: [
            {
                key: 'system.status.isShaken',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
            loseTurnOnHold: true,
        },
    },
    {
        img: 'icons/svg/stoned.svg',
        id: 'incapacitated',
        _id: 'incapacitated000',
        name: 'SWADE.Incap',
        changes: [
            {
                key: 'system.status.isIncapacitated',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
    },
    {
        img: 'icons/svg/skull.svg',
        id: 'dead',
        _id: 'dead000000000000',
        name: 'COMBAT.CombatantDefeated',
        statuses: ['incapacitated'],
    },
    {
        img: 'systems/swade/assets/icons/status/status_aiming.svg',
        id: 'aiming',
        _id: 'aiming0000000000',
        name: 'SWADE.Aiming',
    },
    {
        img: 'systems/swade/assets/icons/status/status_enraged.svg',
        id: 'berserk',
        _id: 'berserk000000000',
        name: 'SWADE.Berserk',
        duration: {
            rounds: 10,
        },
        changes: [
            {
                key: 'system.attributes.strength.die.sides',
                value: '2',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
            {
                key: 'system.stats.toughness.value',
                value: '2',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
            {
                key: 'system.wounds.ignored',
                value: '1',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        },
    },
    {
        img: 'systems/swade/assets/icons/status/status_wild_attack.svg',
        id: 'wild-attack',
        _id: 'wildattack000000',
        name: 'SWADE.WildAttack',
        duration: {
            rounds: 0,
        },
        changes: [
            {
                key: 'system.status.isVulnerable',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
            {
                key: 'system.stats.globalMods.attack',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
                value: '2',
            },
            {
                key: 'system.stats.globalMods.damage',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
                value: '2',
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        },
        statuses: ['vulnerable'],
    },
    {
        img: 'systems/swade/assets/icons/status/status_defending.svg',
        id: 'defending',
        _id: 'defending0000000',
        name: 'SWADE.Defending',
        duration: {
            rounds: 1,
        },
        changes: [
            {
                key: 'system.stats.parry.value',
                value: '4',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
        },
    },
    {
        img: 'systems/swade/assets/icons/status/status_holding.svg',
        id: 'holding',
        _id: 'holding000000000',
        name: 'SWADE.Holding',
    },
    {
        img: 'systems/swade/assets/icons/status/status_bound.svg',
        id: 'bound',
        _id: 'bound00000000000',
        name: 'SWADE.Bound',
        changes: [
            {
                key: 'system.status.isBound',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
            {
                key: 'system.status.isDistracted',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        flags: { swade: { related: { entangled: {} } } },
        statuses: ['distracted'], // , 'entangled' // TODO: After status effect handling rework
    },
    {
        img: 'systems/swade/assets/icons/status/status_entangled.svg',
        id: 'entangled',
        _id: 'entangled0000000',
        name: 'SWADE.Entangled',
        changes: [
            {
                key: 'system.status.isEntangled',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
            {
                key: 'system.status.isVulnerable',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        statuses: ['vulnerable'],
    },
    {
        img: 'systems/swade/assets/icons/status/status_frightened.svg',
        id: 'frightened',
        _id: 'frightened000000',
        name: 'SWADE.Frightened',
        changes: [
            {
                key: 'system.initiative.hasHesitant',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
                priority: 99, //High priority to make sure the effect overrides existing effects
            },
            {
                key: 'system.initiative.hasLevelHeaded',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'false',
                priority: 99, //High priority to make sure the effect overrides existing effects
            },
            {
                key: 'system.initiative.hasImpLevelHeaded',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'false',
                priority: 99, //High priority to make sure the effect overrides existing effects
            },
            {
                key: 'system.initiative.hasQuick',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'false',
                priority: 99, //High priority to make sure the effect overrides existing effects
            },
        ],
    },
    {
        img: 'systems/swade/assets/icons/status/status_distracted.svg',
        id: 'distracted',
        _id: 'distracted000000',
        name: 'SWADE.Distr',
        duration: {
            rounds: 1,
        },
        changes: [
            {
                key: 'system.status.isDistracted',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        },
    },
    {
        img: 'systems/swade/assets/icons/status/status_encumbered.svg',
        id: 'encumbered',
        _id: 'encumbered000000',
        name: 'SWADE.Encumbered',
        changes: [
            {
                key: 'system.details.encumbrance.isEncumbered',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
    },
    {
        img: 'systems/swade/assets/icons/status/status_prone.svg',
        id: 'prone',
        _id: 'prone00000000000',
        name: 'SWADE.Prone',
        changes: [
            {
                key: 'system.stats.parry.value',
                value: '-2',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
            {
                key: '@Skill{Fighting}[system.die.modifier]',
                value: '-2',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
        ],
    },
    {
        img: 'systems/swade/assets/icons/status/status_stunned.svg',
        id: 'stunned',
        _id: 'stunned000000000',
        name: 'SWADE.Stunned',
        duration: {
            rounds: 1,
        },
        changes: [
            {
                key: 'system.status.isStunned',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
            loseTurnOnHold: true,
        },
        flags: {
            swade: {
                related: {
                    distracted: {},
                    prone: {},
                    vulnerable: { '-=duration': null },
                },
            },
        },
        // statuses: ['distracted', 'prone', 'vulnerable'], // TODO: After status effect handling rework
    },
    {
        img: 'systems/swade/assets/icons/status/status_vulnerable.svg',
        id: 'vulnerable',
        _id: 'vulnerable000000',
        name: 'SWADE.Vuln',
        duration: {
            rounds: 1,
        },
        changes: [
            {
                key: 'system.status.isVulnerable',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                value: 'true',
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
        },
    },
    {
        img: 'systems/swade/assets/icons/status/status_bleeding_out.svg',
        id: 'bleeding-out',
        _id: 'bleedingout00000',
        name: 'SWADE.BleedingOut',
        duration: {
            rounds: 1,
        },
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        },
    },
    {
        img: 'systems/swade/assets/icons/status/status_diseased.svg',
        id: 'diseased',
        _id: 'diseased00000000',
        name: 'SWADE.Diseased',
    },
    {
        img: 'systems/swade/assets/icons/status/status_heart_attack.svg',
        id: 'heart-attack',
        _id: 'heartattack00000',
        name: 'SWADE.HeartAttack',
    },
    {
        img: 'systems/swade/assets/icons/status/status_on_fire.svg',
        id: 'on-fire',
        _id: 'onfire0000000000',
        name: 'SWADE.OnFire',
    },
    {
        img: 'systems/swade/assets/icons/status/status_poisoned.svg',
        id: 'poisoned',
        _id: 'poisoned00000000',
        name: 'SWADE.Poisoned',
    },
    {
        img: 'systems/swade/assets/icons/status/status_cover_shield.svg',
        id: 'cover-shield',
        _id: 'covershield00000',
        name: 'SWADE.Cover.Shield',
    },
    {
        img: 'systems/swade/assets/icons/status/status_cover.svg',
        id: 'cover',
        _id: 'cover00000000000',
        name: 'SWADE.Cover._name',
    },
    {
        img: 'systems/swade/assets/icons/status/status_reach.svg',
        id: 'reach',
        _id: 'reach00000000000',
        name: 'SWADE.Reach',
    },
    {
        img: 'systems/swade/assets/icons/status/status_torch.svg',
        id: 'torch',
        _id: 'torch00000000000',
        name: 'SWADE.Torch',
    },
    {
        img: 'systems/swade/assets/icons/status/status_burrowing.svg',
        id: 'burrowing',
        _id: 'burrowing0000000',
        name: 'SWADE.Burrowing',
        changes: [
            {
                key: 'system.pace.base',
                value: 'burrow',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            },
        ],
    },
    {
        img: 'systems/swade/assets/icons/status/status_flying.svg',
        id: 'flying',
        _id: 'flying0000000000',
        name: 'SWADE.Flying',
        changes: [
            {
                key: 'system.pace.base',
                value: 'fly',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            },
        ],
    },
    {
        id: 'invisible',
        _id: 'invisible0000000',
        name: 'EFFECT.StatusInvisible',
        img: 'icons/svg/invisible.svg',
    },
    {
        img: 'icons/svg/blind.svg',
        id: 'blind',
        _id: 'blind00000000000',
        name: 'EFFECT.StatusBlind',
    },
    {
        img: 'systems/swade/assets/icons/status/status_coldbodied.svg',
        id: 'cold-bodied',
        _id: 'coldbodied000000',
        name: 'SWADE.ColdBodied',
    },
    {
        img: 'systems/swade/assets/icons/status/status_smite.svg',
        id: 'smite',
        _id: 'smite00000000000',
        name: 'SWADE.Smite',
    },
    {
        img: 'systems/swade/assets/icons/status/status_protection.svg',
        id: 'protection',
        _id: 'protection000000',
        name: 'SWADE.Protection',
        duration: {
            rounds: 5,
        },
        changes: [
            {
                key: 'system.stats.toughness.value',
                value: '0',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
            {
                key: 'system.stats.toughness.armor',
                value: '0',
                mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
            },
        ],
        system: {
            expiration: constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        },
    },
];

/* eslint-disable @typescript-eslint/naming-convention */
/** @internal */
const PACKAGE_ID = 'swade';
/** @internal */
const SWADE = {
    ASCII: `
  ███████╗██╗    ██╗ █████╗ ██████╗ ███████╗
  ██╔════╝██║    ██║██╔══██╗██╔══██╗██╔════╝
  ███████╗██║ █╗ ██║███████║██║  ██║█████╗
  ╚════██║██║███╗██║██╔══██║██║  ██║██╔══╝
  ███████║╚███╔███╔╝██║  ██║██████╔╝███████╗
  ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝`,
    attributes: {
        agility: {
            long: 'SWADE.AttrAgi',
            short: 'SWADE.AttrAgiShort',
        },
        smarts: {
            long: 'SWADE.AttrSma',
            short: 'SWADE.AttrSmaShort',
        },
        spirit: {
            long: 'SWADE.AttrSpr',
            short: 'SWADE.AttrSprShort',
        },
        strength: {
            long: 'SWADE.AttrStr',
            short: 'SWADE.AttrStrShort',
        },
        vigor: {
            long: 'SWADE.AttrVig',
            short: 'SWADE.AttrVigShort',
        },
    },
    bennies: {
        templates: {
            refresh: 'systems/swade/templates/chat/bennies/benny-refresh.hbs',
            refreshAll: 'systems/swade/templates/chat/bennies/benny-refresh-all.hbs',
            add: 'systems/swade/templates/chat/bennies/benny-add.hbs',
            spend: 'systems/swade/templates/chat/bennies/benny-spend.hbs',
            gmadd: 'systems/swade/templates/chat/bennies/benny-gmadd.hbs',
            joker: 'systems/swade/templates/chat/jokers-wild.hbs',
        },
    },
    conviction: {
        // icon: 'systems/swade/assets/bennie.webp',
        templates: {
            start: 'systems/swade/templates/chat/conviction/start.hbs',
            end: 'systems/swade/templates/chat/conviction/end.hbs',
        },
    },
    vehicles: {
        maxHandlingPenalty: -4,
    },
    settingConfig: {
        settings: [
            'coreSkills',
            'coreSkillsCompendium',
            'enableConviction',
            'jokersWild',
            'vehicleMods',
            'vehicleEnergy',
            'vehicleEdges',
            'vehicleSkills',
            'enableWoundPace',
            'ammoManagement',
            'ammoFromInventory',
            'npcAmmo',
            'vehicleAmmo',
            'noPowerPoints',
            'alwaysGeneralPP',
            'wealthType',
            'currencyName',
            'npcsUseCurrency',
            'hardChoices',
            'dumbLuck',
            'grittyDamage',
            'woundCap',
            'unarmoredHero',
            'heroesNeverDie',
            'injuryTable',
            'actionDeck',
            'applyEncumbrance',
            'actionDeckDiscardPile',
            'pcStartingCurrency',
            'npcStartingCurrency',
            'armorStacking',
            'staticGmBennies',
            'gmBennies',
            'bennyImageSheet',
            'bennyImage3DFront',
            'bennyImage3DBack',
            '3dBennyFrontBump',
            '3dBennyBackBump',
        ],
    },
    diceConfig: { flags: {} },
    statusEffects: statusEffects,
    negativeStatusEffects: [
        'shaken',
        'incapacitated',
        'dead',
        'bound',
        'entangled',
        'frightened',
        'distracted',
        'encumbered',
        'prone',
        'stunned',
        'vulnerable',
        'bleeding-out',
        'diseased',
        'heart-attack',
        'on-fire',
        'poisoned',
        'blind',
    ],
    wildCardIcons: {
        regular: 'systems/swade/assets/ui/wildcard.svg',
        compendium: 'systems/swade/assets/ui/wildcard-dark.svg',
    },
    measuredTemplatePresets: [
        {
            data: { t: CONST.MEASURED_TEMPLATE_TYPES.CONE, distance: 4, width: 2 },
            button: {
                name: constants$1.TEMPLATE_PRESET.SCONE,
                title: 'SWADE.Templates.SmallCone.Long',
                icon: 'fa-solid fa-location-minus fa-rotate-90',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.SCONE);
                },
            },
        },
        {
            data: { t: CONST.MEASURED_TEMPLATE_TYPES.CONE, distance: 9, width: 3 },
            button: {
                name: constants$1.TEMPLATE_PRESET.CONE,
                title: 'SWADE.Templates.Cone.Long',
                icon: 'fa-solid fa-location-plus fa-rotate-90',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.CONE);
                },
            },
        },
        {
            data: {
                t: foundry.CONST.MEASURED_TEMPLATE_TYPES.RAY,
                distance: 12,
                width: 1,
            },
            button: {
                name: constants$1.TEMPLATE_PRESET.STREAM,
                title: 'SWADE.Templates.Stream.Long',
                icon: 'fa-solid fa-rectangle-wide',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.STREAM);
                },
            },
        },
        {
            data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 1 },
            button: {
                name: constants$1.TEMPLATE_PRESET.SBT,
                title: 'SWADE.Templates.Small.Long',
                icon: 'fa-solid fa-circle-1 fa-2xs',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.SBT);
                },
            },
        },
        {
            data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 2 },
            button: {
                name: constants$1.TEMPLATE_PRESET.MBT,
                title: 'SWADE.Templates.Medium.Long',
                icon: 'fa-solid fa-circle-2 fa-sm',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.MBT);
                },
            },
        },
        {
            data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 3 },
            button: {
                name: constants$1.TEMPLATE_PRESET.LBT,
                title: 'SWADE.Templates.Large.Long',
                icon: 'fa-solid fa-circle-3 fa-lg',
                visible: true,
                button: true,
                onClick: () => {
                    SwadeMeasuredTemplate.fromPreset(constants$1.TEMPLATE_PRESET.LBT);
                },
            },
        },
    ],
    activeMeasuredTemplatePreview: null,
    abilitySheet: {
        special: {
            dropdown: 'SWADE.SpecialAbility',
        },
        ancestry: {
            dropdown: 'SWADE.Ancestry',
        },
        archetype: {
            dropdown: 'SWADE.Archetype',
        },
    },
    prototypeRollGroups: [
        {
            name: 'SWADE.ModTrait',
            modifiers: [
                { label: 'SWADE.Running', value: -2 },
                { label: 'SWADE.TargetVulnerable', value: '+2' },
                { label: 'SWADE.Encumbered', value: -2 },
                { label: 'SWADE.Unfamiliar.2', value: -2 },
                { label: 'SWADE.Unfamiliar.4', value: -4 },
            ],
            rollType: constants$1.ROLL_TYPE.TRAIT,
        },
        {
            name: 'SWADE.ModAttack',
            modifiers: [
                { label: 'SWADE.Aiming', value: '+2' },
                { label: 'SWADE.Snapfire', value: -2 },
                { label: 'SWADE.UnstablePlatform', value: -2 },
                { label: 'SWADE.CalledShot.Hand', value: -4 },
                { label: 'SWADE.CalledShot.HeadOrVitals', value: -4 },
                { label: 'SWADE.CalledShot.Limbs', value: -2 },
                { label: 'SWADE.DesperateAttack.2', value: '+2' },
                { label: 'SWADE.DesperateAttack.4', value: '+4' },
            ],
            rollType: constants$1.ROLL_TYPE.ATTACK,
        },
        {
            name: 'SWADE.ModDamage',
            modifiers: [
                { label: 'SWADE.CalledShot.HeadOrVitals', value: '+4' },
                { label: 'SWADE.Weakness', value: '+4' },
                { label: 'SWADE.Resistance', value: -4 },
                { label: 'SWADE.DesperateAttack.2', value: -2 },
                { label: 'SWADE.DesperateAttack.4', value: -4 },
            ],
            rollType: constants$1.ROLL_TYPE.DAMAGE,
        },
        {
            name: 'SWADE.Range._name',
            modifiers: [
                { label: 'SWADE.Range.Medium', value: -2 },
                { label: 'SWADE.Range.Long', value: -4 },
                { label: 'SWADE.Range.Extreme', value: -8 },
            ],
            rollType: constants$1.ROLL_TYPE.TRAIT,
        },
        {
            name: 'SWADE.Cover._name',
            modifiers: [
                { label: 'SWADE.Cover.Light', value: -2 },
                { label: 'SWADE.Cover.Medium', value: -4 },
                { label: 'SWADE.Cover.Heavy', value: -6 },
                { label: 'SWADE.Cover.Total', value: -8 },
            ],
            rollType: constants$1.ROLL_TYPE.TRAIT,
        },
        {
            name: 'SWADE.Illumination._name',
            modifiers: [
                { label: 'SWADE.Illumination.Dim', value: -2 },
                { label: 'SWADE.Illumination.Dark', value: -4 },
                { label: 'SWADE.Illumination.Pitch', value: -6 },
            ],
            rollType: constants$1.ROLL_TYPE.TRAIT,
        },
    ],
    CONST: constants$1,
    ranks: [
        'SWADE.Ranks.Novice',
        'SWADE.Ranks.Seasoned',
        'SWADE.Ranks.Veteran',
        'SWADE.Ranks.Heroic',
        'SWADE.Ranks.Legendary',
    ],
    scales: [
        'SWADE.Scales.Names.Tiny',
        'SWADE.Scales.Names.VerySmall',
        'SWADE.Scales.Names.Small',
        'SWADE.Scales.Names.Normal',
        'SWADE.Scales.Names.Large',
        'SWADE.Scales.Names.Huge',
        'SWADE.Scales.Names.Gargantuan',
    ],
    textSearch: {
        actor: [
            'system.category',
            'system.details.archetype',
            'system.details.appearance',
            'system.details.notes',
            'system.details.goals',
            'system.details.biography.value',
            'system.details.species.name',
            'system.details.advances.rank',
            'classification',
            'description',
        ],
        adventure: [],
        cards: [],
        item: [
            'system.description',
            'system.notes',
            'system.subtype',
            'system.arcane',
            'system.trapping',
        ],
        journalentry: [
            'pages'
        ],
        macro: [],
        playlist: [],
        rolltable: [],
        scene: [],
    },
    swid: {
        ignoreSystem: false,
    },
};

class Logger {
    static PACKAGE_ID = PACKAGE_ID;
    static LOG_LEVEL = {
        Debug: 0,
        Log: 1,
        Info: 2,
        Warn: 3,
        Error: 4,
    };
    static log({ msg, level, options: { force, toast, permanent, localize } = {}, }) {
        const isDebugging = game.modules
            .get('_dev-mode')
            //@ts-expect-error adding an API to the module data is common practice
            ?.api?.getPackageDebugValue(Logger.PACKAGE_ID);
        const prefix = Logger.PACKAGE_ID + ' | ';
        switch (level) {
            case Logger.LOG_LEVEL.Error:
                console.error(prefix, localize ? game.i18n.localize(msg) : msg);
                if (toast)
                    ui.notifications.error(msg.toString(), {
                        permanent,
                        localize,
                        console: false,
                    });
                break;
            case Logger.LOG_LEVEL.Warn:
                console.warn(prefix, localize ? game.i18n.localize(msg) : msg);
                if (toast)
                    ui.notifications.warn(msg.toString(), {
                        permanent,
                        localize,
                        console: false,
                    });
                break;
            case Logger.LOG_LEVEL.Info:
                console.info(prefix, localize ? game.i18n.localize(msg) : msg);
                if (toast)
                    ui.notifications.info(msg.toString(), {
                        permanent,
                        localize,
                        console: false,
                    });
                break;
            case Logger.LOG_LEVEL.Debug:
                if (!force && !isDebugging)
                    break;
                console.debug(prefix, localize ? game.i18n.localize(msg) : msg);
                if (toast)
                    ui.notifications.info(msg.toString(), {
                        permanent,
                        localize,
                        console: false,
                    });
                break;
            case Logger.LOG_LEVEL.Log:
            default:
                if (!force && !isDebugging)
                    break;
                console.log(prefix, localize ? game.i18n.localize(msg) : msg);
                if (toast)
                    ui.notifications.info(msg.toString(), { permanent, console: false });
                break;
        }
    }
    static error(msg, options) {
        Logger.log({ msg, level: Logger.LOG_LEVEL.Error, options });
    }
    static warn(msg, options) {
        Logger.log({ msg, level: Logger.LOG_LEVEL.Warn, options });
    }
    static info(msg, options) {
        Logger.log({ msg, level: Logger.LOG_LEVEL.Info, options });
    }
    static debug(msg, options) {
        Logger.log({ msg, level: Logger.LOG_LEVEL.Debug, options });
    }
}
ui.notifications;

/**
 * @internal
 * @param string The string to look for
 * @param localize Switch which determines if the string is a localization key
 */
function notificationExists(string, localize = true) {
    let stringToFind = string;
    if (localize)
        stringToFind = game.i18n.localize(string);
    const active = ui.notifications.active || [];
    return active.some((n) => n.text() === stringToFind);
}
/** @internal */
async function shouldShowBennyAnimation() {
    const value = game.user?.getFlag('swade', 'dsnShowBennyAnimation');
    const defaultValue = foundry.utils.getProperty(SWADE, 'diceConfig.flags.dsnShowBennyAnimation.default');
    if (typeof value === 'undefined') {
        await game.user?.setFlag('swade', 'dsnShowBennyAnimation', defaultValue);
        return defaultValue;
    }
    else {
        return value;
    }
}
/**
 * @internal
 * @param traitName The name of the trait to be found
 * @param actor The actor to find it from
 * @returns Returns a string of the trait name in the data model if it's an attribute or an Item if it is a skill. If it can find neither an attribute nor a skill then it returns null
 */
function getTrait(traitName, actor) {
    let trait = undefined;
    for (const attr of Object.keys(SWADE.attributes)) {
        const attributeName = game.i18n.localize(SWADE.attributes[attr].long);
        if (attributeName === traitName) {
            trait = attr;
        }
    }
    if (!trait) {
        trait = actor.items.find((i) => i.type === 'skill' && i.name === traitName);
    }
    if (!trait) {
        trait = actor.items.find((i) => i.type === 'skill' && i.system.swid === slugify(traitName));
    }
    return trait;
}
/** @internal */
async function reshuffleActionDeck() {
    const deck = game.cards?.get(game.settings.get('swade', 'actionDeck'));
    await deck?.recall({ chatNotification: false });
    await deck?.shuffle({ chatNotification: false });
}
/**
 * @internal
 * A generic reducer function that can be used to reduce an array of trait roll modifiers into a string that can be parsed by the Foundry VTT Roll class
 * @param acc The accumulator string
 * @param cur The current trait roll modifier
 * @returns A string which contains all trait roll modifiers, reduced into a parsable string
 */
function modifierReducer(acc, cur) {
    if (typeof cur.value === 'string' && cur.value.startsWith('@')) {
        return (acc += '+' + cur.value);
    }
    return (acc += `${cur.value}[${cur.label}]`);
}
/** Normalize a given modifier value to a string for display and evaluation */
function normalizeRollModifiers(mod) {
    let normalizedValue;
    if (typeof mod.value === 'string') {
        //if the modifier starts with a reserved symbol take it as is
        if (mod.value[0].match(/[@+-]/)) {
            normalizedValue = mod.value;
        }
        else if (Number.isNumeric(mod.value)) {
            normalizedValue = mod.value ? signedNumberString(mod.value) : '+0';
        }
        else {
            normalizedValue = '+' + mod.value;
        }
    }
    else if (typeof mod.value === 'number') {
        normalizedValue = signedNumberString(mod.value);
    }
    else {
        throw new Error('Invalid modifier value ' + mod.value);
    }
    return {
        value: normalizedValue,
        label: mod.label,
        ignore: mod.ignore,
    };
}
function signedNumberString(value) {
    if (typeof value === 'number')
        return (value < 0 ? '' : '+') + value;
    else
        return '+0';
}
function addUpModifiers(acc, cur) {
    if (cur.ignore)
        return acc;
    return (acc += Number(cur.value));
}
/** @internal */
function firstOwner(doc) {
    /* null docs could mean an empty lookup, null docs are not owned by anyone */
    if (!doc)
        return;
    const ownership = (doc instanceof TokenDocument ? doc.actor?.ownership : doc.ownership) ?? {};
    const playerOwners = Object.entries(ownership)
        .filter(([id, level]) => {
        const user = game.users?.get(id);
        return (user?.active &&
            !user.isGM &&
            level === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
    })
        .map(([id, _level]) => id);
    if (playerOwners.length > 0) {
        return game.users?.get(playerOwners[0]);
    }
    /* if no online player owns this actor, fall back to first GM */
    return firstGM();
}
/**
 * @internal
 * Players first, then GM
 */
function isFirstOwner(doc) {
    return firstOwner(doc)?.isSelf;
}
/** @internal */
function firstGM() {
    return game.users.activeGM;
}
/** @internal */
function isFirstGM() {
    return firstGM()?.isSelf ?? false;
}
/** @internal */
function getRankFromAdvance(advance) {
    if (advance <= 3) {
        return constants$1.RANK.NOVICE;
    }
    else if (advance.between(4, 7)) {
        return constants$1.RANK.SEASONED;
    }
    else if (advance.between(8, 11)) {
        return constants$1.RANK.VETERAN;
    }
    else if (advance.between(12, 15)) {
        return constants$1.RANK.HEROIC;
    }
    else {
        return constants$1.RANK.LEGENDARY;
    }
}
/** @internal */
function getScaleName(scaleMod) {
    const modMax = 6;
    if (scaleMod < -6) {
        return game.i18n.format('SWADE.Scales.SmallerThan', {
            scale: getScaleName(-6),
        });
    }
    if (scaleMod > modMax) {
        return game.i18n.format('SWADE.Scales.LargerThan', {
            scale: getScaleName(modMax),
        });
    }
    const index = Math.floor((scaleMod + modMax) / 2);
    return SWADE.scales[index];
}
/** @internal */
function getRankFromAdvanceAsString(advance) {
    return SWADE.ranks[getRankFromAdvance(advance)];
}
/** @internal */
async function copyToClipboard(textToCopy) {
    await game.clipboard.copyPlainText(textToCopy);
    ui.notifications.info('Copied to clipboard');
}
/** @internal */
function getStatusEffectDataById(idToSearchFor) {
    const filter = (e) => e.id === idToSearchFor;
    const data = CONFIG.statusEffects.find(filter) || SWADE.statusEffects.find(filter);
    // Future deprecation - removing this would require deeper API changes
    // foundry.utils.logCompatibilityWarning(
    //   'You are accessing `game.swade.util.getStatusEffectDataById`. ' +
    //     'This is now deprecated in favor of `ActiveEffect.fromStatusEffect`, which returns a temporary active effect for use',
    //   {
    //     since: '4.0',
    //     until: '5.0',
    //   },
    // );
    return data;
}
/** @internal */
function getDieSidesRange(minimumSides, maximumSides) {
    const options = [
        { key: 1, label: '1' },
        { key: 4, label: 'd4' },
        { key: 6, label: 'd6' },
        { key: 8, label: 'd8' },
        { key: 10, label: 'd10' },
        { key: 12, label: 'd12' },
        { key: 14, label: 'd12+1' },
        { key: 16, label: 'd12+2' },
        { key: 18, label: 'd12+3' },
        { key: 20, label: 'd12+4' },
        { key: 22, label: 'd12+5' },
        { key: 24, label: 'd12+6' },
    ];
    return options.filter((x) => x.key >= minimumSides && x.key <= maximumSides);
}
/** @internal */
function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
}
/**
 * @internal
 * @source https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#examples
 */
function deepFreeze(object) {
    // Retrieve the property names defined on object
    const propNames = Reflect.ownKeys(object);
    // Freeze properties before freezing self
    for (const name of propNames) {
        const value = object[name];
        if ((value && typeof value === 'object') || typeof value === 'function') {
            deepFreeze(value);
        }
    }
    return Object.freeze(object);
}
/** @internal */
function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
/** Separates an array into a series of smaller arrays of a given size */
function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        result.push(chunk);
    }
    return result;
}
/** Maps a number from a given range to an equivalent number of another range */
function mapRange(num, inMin, inMax, outMin, outMax) {
    if (inMin === inMax || outMin === outMax)
        return 0;
    const mapped = ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    return Math.clamp(mapped, outMin, outMax);
}
/**
 * @param arr The array to count in
 * @param condition A function that represents a condition and returns a boolean
 * @returns the number of items in the array that fulfill the condition
 */
function count(arr, condition) {
    return arr.filter(condition).length;
}
/** Takes an input and returns the slugged string of it. */
function slugify(input) {
    const slugged = String(input)
        .normalize('NFKD') // split accented characters into their base characters and diacritical marks
        .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
        .toLowerCase() // convert to lowercase
        .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
        .replace(/\s+/g, '-') // replace spaces with hyphens
        .replace(/-+/g, '-') // remove consecutive hyphens
        .replace(/^-+/g, '') //remove leading hyphens
        .replace(/-+$/g, '') //remove trailing hyphens
        .trim(); // trim leading or trailing whitespace
    Logger.debug([input, slugged]);
    return slugged;
}
/**
 * Convert a template string into HTML DOM nodes
 * @param str The template string
 * @returns The template HTML
 */
function stringToHTML(str) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, 'text/html');
    return doc.body.firstElementChild;
}
/**
 * Utility function to create an HTML element for the purpose of storing embed content.
 * TODO: Evaluate if this is better somewhere else
 * @param objectToEmbed The object that the embed is for
 * @param template The handlebars template path to use
 * @param className The class name to attach to the outermost element for purposes of controlled styling
 */
async function createEmbedElement(objectToEmbed, template, className) {
    const content = await foundry.applications.handlebars.renderTemplate(template, objectToEmbed);
    const elem = document.createElement('div');
    elem.classList;
    elem.className = className.join(' ');
    elem.innerHTML = content;
    return elem;
}
/**
 * Searches world items and compendium collections for all items that match the given SWID, optionally narrowing down the search by item type
 * @param swid the swid to look for
 * @param type An optional item type for narrowing the possible list of resulting items
 * @returns a list of items that has matched the swid and type
 */
async function getItemsBySwid(swid, type) {
    //get world items first
    let items = game.items.filter((i) => i.system.swid === swid);
    //filter by type if necessary
    if (type)
        items = items.filter((i) => i.type === type);
    //get compendium items next
    let itemPacks = game.packs.filter((p) => p.documentName === 'Item');
    //remove system compendium
    if (SWADE.swid.ignoreSystem) {
        itemPacks = itemPacks.filter((p) => p.metadata.packageName !== 'swade');
    }
    for (const pack of itemPacks) {
        await pack.getIndex();
        const index = pack.index.filter((i) => i.system?.swid === swid);
        const ids = index.map((e) => e._id);
        if (ids.length < 1)
            continue;
        const query = { _id__in: ids };
        //filter by type if necessary
        if (type)
            query.type = type;
        const documents = await pack.getDocuments(query);
        items.push(...documents);
    }
    return items;
}

/**
 * Produce short, plaintext summaries of the most important aspects of an Actor's character sheet.
 */
class CharacterSummarizer {
    actor;
    summary;
    constructor(actor) {
        this.actor = actor;
        if (!CharacterSummarizer.isSupportedActorType(actor)) {
            ui.notifications.error(game.i18n.format('SWADE.CharacterSummaryTypeErr', { type: actor.type }));
            this.summary = '';
            return;
        }
        this.summary = this._makeSummary();
    }
    static isSupportedActorType(char) {
        return char.type === 'character' || char.type === 'npc';
    }
    static summarizeCharacters(chars) {
        for (const char of chars) {
            const s = new game.swade.CharacterSummarizer(char);
            CharacterSummarizer._showDialog(s);
        }
    }
    static _showDialog(summarizer) {
        if (summarizer.getSummary() === '')
            return;
        const d = new Dialog({
            title: game.i18n.localize('SWADE.CharacterSummary'),
            content: summarizer.getSummary(),
            buttons: {
                close: {
                    label: game.i18n.localize('SWADE.Ok'),
                },
                copyHtml: {
                    label: game.i18n.localize('SWADE.CopyHtml'),
                    callback: () => {
                        summarizer.copySummaryHtml();
                    },
                },
                copyMarkdown: {
                    label: game.i18n.localize('SWADE.CopyMarkdown'),
                    callback: () => {
                        summarizer.copySummaryMarkdown();
                    },
                },
            },
            default: 'close',
        });
        d.render(true);
    }
    // Util method for calling this code from macros
    getSummary() {
        return this.summary;
    }
    copySummaryHtml() {
        copyToClipboard(this.summary);
    }
    copySummaryMarkdown() {
        // as the HTML is so simple here, just going to convert
        // it inline.
        const markdownSummary = this.summary
            .replace(/<\/?p>/g, '\n')
            .replace(/<br\/?>/g, '\n')
            .replace(/<\/?strong>/g, '*')
            .replace(/<h1>/g, '# ')
            .replace(/<\/h1>/g, '\n')
            .replace(/&mdash;/g, '—');
        copyToClipboard(markdownSummary);
    }
    _makeSummary() {
        let summary = `<h1>${this.actor.name}</h1>`;
        // Basic character information block
        summary +=
            '<p><strong>' + game.i18n.localize('SWADE.Ancestry') + '</strong>: ';
        summary +=
            this.actor.ancestry?.name ??
                foundry.utils.getProperty(this.actor.system, 'details.species.name');
        summary +=
            '<br/><strong>' + game.i18n.localize('SWADE.Rank') + '</strong>: ';
        summary += foundry.utils.getProperty(this.actor.system, 'advances.rank');
        summary +=
            ' (' + foundry.utils.getProperty(this.actor.system, 'advances.value');
        summary += ' ' + game.i18n.localize('SWADE.Adv');
        summary +=
            ')<br/><strong>' + game.i18n.localize('SWADE.Bennies') + '</strong>: ';
        summary +=
            foundry.utils.getProperty(this.actor.system, 'bennies.max') + '</p>';
        // Attributes
        const attributes = new Array();
        attributes.push(game.i18n.localize('SWADE.AttrAgiShort') +
            ' ' +
            this._formatDieStat(this.actor, 'attributes.agility.die'));
        attributes.push(game.i18n.localize('SWADE.AttrSmaShort') +
            ' ' +
            this._formatDieStat(this.actor, 'attributes.smarts.die'));
        attributes.push(game.i18n.localize('SWADE.AttrSprShort') +
            ' ' +
            this._formatDieStat(this.actor, 'attributes.spirit.die'));
        attributes.push(game.i18n.localize('SWADE.AttrStrShort') +
            ' ' +
            this._formatDieStat(this.actor, 'attributes.strength.die'));
        attributes.push(game.i18n.localize('SWADE.AttrVigShort') +
            ' ' +
            this._formatDieStat(this.actor, 'attributes.vigor.die'));
        summary += this._formatList(attributes, game.i18n.localize('SWADE.Attributes'));
        // Speed, pace, toughness
        summary +=
            '<p><strong>' +
                game.i18n.localize('SWADE.Pace') +
                '</strong>: ' +
                foundry.utils.getProperty(this.actor.system, 'stats.speed.value') +
                ', ';
        summary +=
            '<strong>' +
                game.i18n.localize('SWADE.Parry') +
                '</strong>: ' +
                foundry.utils.getProperty(this.actor.system, 'stats.parry.value') +
                ', ';
        summary +=
            '<strong>' +
                game.i18n.localize('SWADE.Tough') +
                '</strong>: ' +
                foundry.utils.getProperty(this.actor.system, 'stats.toughness.value');
        summary +=
            ' (' +
                foundry.utils.getProperty(this.actor.system, 'stats.toughness.armor') +
                ')</p>';
        // Items - skills, powers, gear, etc
        const skills = new Array();
        const edges = new Array();
        const hindrances = new Array();
        const weaponsAndArmour = new Array();
        const gear = new Array();
        const powers = new Array();
        const abilities = new Array();
        const consumables = new Array();
        for (const item of this.actor.items) {
            switch (item.type) {
                case 'skill':
                    skills.push(item.name + ' ' + this._formatDieStat(item, 'die'));
                    break;
                case 'edge':
                    edges.push(item.name);
                    break;
                case 'hindrance':
                    hindrances.push(item.name);
                    break;
                case 'weapon':
                    weaponsAndArmour.push(`${item.name} (${item.system.damage}, ${item.system.range}, ` +
                        `${game.i18n.localize('SWADE.Ap')}${item.system.ap}, ` +
                        `${game.i18n.localize('SWADE.RoF')}${item.system.rof})`);
                    break;
                case 'armor':
                    weaponsAndArmour.push(`${item.name} (${item.system.armor})`);
                    break;
                case 'shield':
                    weaponsAndArmour.push(`${item.name} (+${item.system.parry} / ${item.system.cover})`);
                    break;
                case 'gear':
                    gear.push(item.name);
                    break;
                case 'power':
                    powers.push(item.name);
                    break;
                case 'ability':
                    abilities.push(item.name);
                    break;
                case 'consumable':
                    consumables.push(item.name);
                    break;
                case 'action':
                    continue; //skip the rendering of actions
                default:
                    Logger.error(`Item ${item.name} has unknown type ${item.type}`, {
                        toast: true,
                    });
            }
        }
        summary += this._formatList(skills, game.i18n.localize('SWADE.Skills'));
        summary += this._formatList(edges, game.i18n.localize('SWADE.Edges'));
        summary += this._formatList(hindrances, game.i18n.localize('SWADE.Hindrances'));
        summary += this._formatList(weaponsAndArmour, game.i18n.localize('SWADE.WeaponsAndArmor'));
        summary += this._formatList(consumables, game.i18n.localize('SWADE.Consumable.Consumables'));
        summary += this._formatList(gear, game.i18n.localize('SWADE.Inv'));
        summary += this._formatList(powers, game.i18n.localize('SWADE.Pow'));
        summary += this._formatList(abilities, game.i18n.localize('SWADE.SpecialAbilities'));
        // Additional stats
        const additionalStats = new Array();
        for (const key in this.actor.system.additionalStats) {
            const stat = this.actor.system.additionalStats[key];
            switch (stat.dtype) {
                case 'Selection':
                case 'String':
                    additionalStats.push(`${stat.label}: ${stat.value}`);
                    break;
                case 'Number':
                    if (stat.hasMaxValue) {
                        additionalStats.push(`${stat.label}: ${stat.value}/${stat.max}`);
                    }
                    else {
                        additionalStats.push(`${stat.label}: ${stat.value}`);
                    }
                    break;
                case 'Die':
                    additionalStats.push(`${stat.label}: ${stat.value}` +
                        this._formatModifier(stat.modifier));
                    break;
                case 'Boolean':
                    if (stat.value) {
                        additionalStats.push(`${stat.label}: ${game.i18n.localize('SWADE.Yes')}`);
                    }
                    else {
                        additionalStats.push(`${stat.label}: ${game.i18n.localize('SWADE.No')}`);
                    }
                    break;
                default:
                    Logger.error(`For ${key}, cannot process additionalStat of type ${stat.dtype}`, { toast: true });
            }
        }
        summary += this._formatList(additionalStats, game.i18n.localize('SWADE.AddStats'));
        return summary;
    }
    _formatList(list, name) {
        if (list.length === 0) {
            list.push('&mdash;');
        }
        list.sort((a, b) => a.localeCompare(b));
        let val = `<p><strong>${name}</strong>: `;
        val += list.join(', ');
        val += '</p>';
        return val;
    }
    _formatDieStat(document, dataKey) {
        const sides = foundry.utils.getProperty(document.system, dataKey + '.sides');
        const modifier = foundry.utils.getProperty(document.system, dataKey + '.modifier');
        const val = `d${sides}` + this._formatModifier(modifier);
        return val;
    }
    _formatModifier(modifier) {
        if (modifier === undefined || modifier === null || modifier === 0) {
            return '';
        }
        if (!!modifier && !String(modifier).match(/^[+-]/)) {
            modifier = '+' + modifier;
        }
        return modifier;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$c, HandlebarsApplicationMixin: HandlebarsApplicationMixin$d } = foundry.applications.api;
class ChoiceDialog extends HandlebarsApplicationMixin$d(ApplicationV2$c) {
    constructor({ parent, choiceSet, resolve, ...options }) {
        super(options);
        this.#callback = resolve;
        this.#parent = parent;
        this.selection = choiceSet;
    }
    #callback;
    #parent;
    #keyDownListener;
    static asPromise(ctx) {
        return new Promise((resolve) => new ChoiceDialog({ ...ctx, resolve }).render({ force: true }));
    }
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE ChoiceDialog',
            contentClasses: ['standard-form'],
        },
        classes: ['swade', 'choice-dialog', 'swade-application'],
        tag: 'form',
        form: {
            handler: ChoiceDialog.onSubmit,
        },
        actions: {
            close: ChoiceDialog.#onClose,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/choice-dialog.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    async _onRender(_context, _options) {
        if (!this.#keyDownListener) {
            this.#keyDownListener = this.#onKeyDown.bind(this);
            document.addEventListener('keydown', this.#keyDownListener);
        }
    }
    static onSubmit(_event, _form, _formData) {
        this.customSubmit();
    }
    customSubmit() {
        this.selection.choice = this.getSelection();
        return this.close();
    }
    getSelection() {
        const radio = this.element.querySelector('input[name="choiceset"]:checked');
        if (!radio)
            return null;
        return Number(radio?.value);
    }
    static #onClose(_event, _target) {
        this.close();
    }
    _onClose(options) {
        super._onClose(options);
        this.#callback(this.selection);
        document.removeEventListener('keydown', this.#keyDownListener);
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            parent: this.#parent,
            prompt: this.selection.title,
            choices: this.selection.choices.map((choice, index) => ({
                ...choice,
                value: index,
            })),
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-solid fa-check-double',
                    label: 'SWADE.ButtonSubmit',
                },
                {
                    type: 'button',
                    icon: 'fa-solid fa-times',
                    label: 'Close',
                    action: 'close',
                },
            ],
        });
        return context;
    }
    #onKeyDown(event) {
        // Close dialog
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            return this.close();
        }
        // Confirm default choice or add a modifier
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            return this.customSubmit();
        }
    }
}

class SwadeRoll extends Roll {
    constructor(formula, data, options = {}) {
        super(formula, data, options);
    }
    static CHAT_TEMPLATE = 'systems/swade/templates/chat/dice/swade-roll.hbs';
    static fromRoll(roll) {
        const newRoll = new this(roll.formula, roll.data, roll.options);
        Object.assign(newRoll, roll);
        return newRoll;
    }
    static async rerollFree(event) {
        event.preventDefault();
        const target = event.currentTarget;
        const id = target.closest('.message').dataset.messageId;
        const msg = game.messages.get(id, { strict: true });
        const speaker = msg['speaker'];
        const roll = msg['rolls'][0];
        roll.rerollMode = 'free';
        const evaluated = await roll.reroll();
        await evaluated.toMessage({
            speaker: speaker,
            flavor: msg.flavor,
            flags: msg.flags,
            whisper: msg.whisper,
            blind: msg.blind,
        }, {
            rollMode: msg.getFlag('swade', 'rollMode') ??
                game.settings.get('core', 'rollMode'),
        });
    }
    static async rerollBenny(event) {
        event.preventDefault();
        const target = event.currentTarget;
        const id = target.closest('.message').dataset.messageId;
        const msg = game.messages.get(id, { strict: true });
        const speaker = msg['speaker'];
        const roll = msg['rolls'][0];
        const actor = ChatMessage.getSpeakerActor(speaker);
        const isGmBenny = !!target.dataset.gmBenny;
        const spender = isGmBenny && game.user?.isGM ? game.user : actor;
        if (!spender?.bennies) {
            return ui.notifications.warn('SWADE.NoBennies', { localize: true });
        }
        await spender?.spendBenny();
        roll.rerollMode = 'benny';
        roll.applyReroll(actor);
        const evaluated = await roll.reroll();
        await evaluated.toMessage({
            speaker: speaker,
            flavor: msg.flavor,
            flags: msg.flags,
            whisper: msg.whisper,
            blind: msg.blind,
        }, {
            rollMode: msg.getFlag('swade', 'rollMode') ??
                game.settings.get('core', 'rollMode'),
        });
    }
    set rerollMode(mode) {
        this.options['rerollMode'] = mode;
    }
    get rerollMode() {
        return this.options['rerollMode'];
    }
    set modifiers(mods) {
        this.options['modifiers'] = mods;
    }
    get modifiers() {
        const mods = this.options['modifiers'] ?? [];
        return mods.map(normalizeRollModifiers);
    }
    setRerollable(rerollable) {
        this.options['rerollable'] = rerollable;
    }
    setMessageId(messageId) {
        this.options['messageId'] = messageId;
    }
    setRollType(rollType) {
        this.options['rollType'] = rollType;
    }
    get messageId() {
        return this.options['messageId'];
    }
    get isRerollable() {
        return this.options['rerollable'] ?? false;
    }
    get isCritfail() {
        return false;
    }
    get isCritFailConfirmationRoll() {
        return this.options['critfailConfirmationRoll'];
    }
    get rollType() {
        return this.options['rollType'];
    }
    async getRenderData(flavor, isPrivate = false, displayResult = true) {
        if (!this._evaluated)
            await this.evaluate();
        const chatData = {
            isPrivate: isPrivate,
            displayResult: displayResult,
            flavor: isPrivate ? null : flavor,
            user: game.user?.id,
            tooltip: isPrivate ? '' : await this.getTooltip(),
            total: this.total,
            formulaParts: this._formatFormulaParts(),
            rerollable: this.isRerollable,
        };
        return chatData;
    }
    async toMessage(messageData = {}, { rollMode = 'publicroll', create = true, } = {}) {
        // Perform the roll, if it has not yet been rolled
        if (!this._evaluated)
            await this.evaluate();
        const existingRolls = messageData.rolls ?? [];
        messageData = foundry.utils.mergeObject({
            user: game.user.id,
            sound: CONFIG.sounds.dice,
            'flags.swade.rollMode': rollMode,
        }, messageData);
        messageData.rolls = [...existingRolls, this];
        // Either create the message or just return the chat data
        const cls = getDocumentClass('ChatMessage');
        const msg = new cls(messageData);
        // Either create or return the data
        if (create)
            return cls.create(msg.toObject(), { rollMode });
        if (rollMode)
            msg.applyRollMode(rollMode);
        return msg.toObject();
    }
    async _getToMessageContent(messageData) {
        return messageData.content ?? '';
    }
    async render({ flavor, template = this.constructor.CHAT_TEMPLATE, isPrivate = false, displayResult = true, } = {}) {
        const data = await this.getRenderData(flavor, isPrivate, displayResult);
        return foundry.applications.handlebars.renderTemplate(template, data);
    }
    getRerollLabel() {
        if (this.rerollMode === 'benny') {
            return game.i18n.localize('SWADE.RerollWithBenny');
        }
        if (this.rerollMode === 'free') {
            return game.i18n.localize('SWADE.FreeReroll');
        }
    }
    /**
     * Applies reroll bonuses to the current roll
     * @param _actor The actor making a reroll
     * @returns If the roll was modified
     */
    applyReroll(_actor) {
        Logger.warn('This function must be implemented on a subsidiary class');
        return false;
    }
    _formatFormulaParts() {
        const result = new Array();
        for (const term of this.terms) {
            if (term instanceof foundry.dice.terms.PoolTerm) {
                // Compute dice from the pool
                for (const roll of term.rolls) {
                    const faces = roll.terms[0]['faces'];
                    const total = roll.total ?? 0;
                    let img = '';
                    if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
                        img = `icons/svg/d${faces}-grey.svg`;
                    }
                    result.push({
                        img,
                        die: true,
                        result: total,
                        class: this._getRollClass(roll),
                        hint: roll.dice[0].flavor,
                    });
                }
            }
            else if (term instanceof foundry.dice.terms.Die) {
                // Grab the right dice
                const faces = term.faces;
                let total = 0;
                term.results.forEach((result) => {
                    total += result.result;
                });
                let img = '';
                if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
                    img = `icons/svg/d${faces}-grey.svg`;
                }
                result.push({
                    img,
                    class: this._getDieClass(term),
                    result: total,
                    die: true,
                    hint: term.flavor,
                });
            }
            else {
                result.push({
                    result: term.expression,
                    hint: term.flavor,
                });
            }
        }
        return result;
    }
    _getDieClass(die) {
        const faces = die.faces;
        let total = 0;
        die.results.forEach((result) => {
            total += result.result;
        });
        if (die.results[0].result === 1)
            return 'min';
        if (total > faces)
            return 'exploded';
        return 'color';
    }
    _getRollClass(roll) {
        const faces = roll.terms[0]['faces'];
        const total = roll.total ?? 0;
        if (total > faces)
            return 'exploded';
        if (roll.dice.some((d) => d.results[0].result === 1))
            return 'min';
        return '';
    }
}

class DamageRoll extends SwadeRoll {
    static CHAT_TEMPLATE = 'systems/swade/templates/chat/dice/damage-roll.hbs';
    constructor(formula, data = {}, options = {}) {
        options.rollType ??= "damage";
        super(formula, data, options);
    }
    get isRerollable() {
        return this.options['rerollable'] ?? true;
    }
    set targetNumber(tn) {
        this.options['targetNumber'] = tn;
    }
    // Damage is almost never going to have a targetNumber of 4, arguably should just return an error
    // TOFIX: targetNumber is not currently a valid option in the interface, either remove these paths or fix the interface setup and possibly bump these functions to SwadeRoll
    get targetNumber() {
        return this.options['targetNumber'];
    }
    // Returns -1 if target number isn't set, 0 on a fail, 1 on a success, 2 or more for raises
    get successes() {
        if (this.targetNumber === undefined) {
            console.warn('No target number set for damage roll');
            return constants$1.ROLL_RESULT.CRITFAIL;
        }
        if ((this.total ?? 0) < this.targetNumber)
            return constants$1.ROLL_RESULT.FAIL;
        if ((this.total ?? 0) < this.targetNumber + 4)
            return constants$1.ROLL_RESULT.SUCCESS;
        return Math.max(Math.floor(((this.total ?? 0) - this.targetNumber) / 4) + 1, 0); // raises get to be 2+
    }
    get isCritfail() {
        return false;
    }
    get isCritFailConfirmationRoll() {
        return false;
    }
    get ap() {
        return this.options['ap'] ?? 0;
    }
    set ap(ap) {
        this.options['ap'] = ap;
    }
    get isHeavyWeapon() {
        return this.options['isHeavyWeapon'] ?? false;
    }
    set isHeavyWeapon(isHeavyWeapon) {
        this.options['isHeavyWeapon'] = isHeavyWeapon;
    }
    applyReroll(actor) {
        if (!actor ||
            !('stats' in actor.system) ||
            !('bennyDamage' in actor.system.stats.globalMods)) {
            return false;
        }
        if (actor.system.stats.globalMods.bennyDamage?.length > 0) {
            let adjustRoll = false;
            for (const mod of actor.system.stats.globalMods.bennyDamage) {
                const hasMod = this.modifiers.find((m) => m.label === mod.label);
                if (!hasMod) {
                    adjustRoll = true;
                    this.options['modifiers'].push(mod);
                    this.terms.push(new foundry.dice.terms.OperatorTerm({ operator: '+' }), new foundry.dice.terms.StringTerm({
                        term: String(mod.value),
                        options: { flavor: mod.label },
                    }));
                }
            }
            if (adjustRoll) {
                this.resetFormula();
                return true;
            }
        }
        return false;
    }
}

class WildDie extends foundry.dice.terms.Die {
    static get defaultTermData() {
        return {
            number: 1,
            faces: 6,
            modifiers: ['x'],
            options: { flavor: game.i18n.localize('SWADE.WildDie') },
        };
    }
    constructor(termData = {}) {
        termData = foundry.utils.mergeObject(WildDie.defaultTermData, termData);
        const user = game.user;
        if (game.dice3d) {
            // Get the user's configured Wild Die data.
            const dieSystem = user?.getFlag('swade', 'dsnWildDiePreset') || 'none';
            const colorSet = user?.getFlag('swade', 'dsnWildDie');
            // If the color preset is not none
            if (dieSystem !== 'none') {
                // If dieSystem is defined... (new users might not have one defined)
                {
                    // Set the color preset.
                    foundry.utils.setProperty(termData, 'options.colorset', colorSet);
                    // Set the system value.
                    foundry.utils.setProperty(termData, 'options.appearance.system', dieSystem);
                    // Get the die model for the respective die type
                    const dicePreset = game.dice3d?.DiceFactory?.systems[dieSystem]?.dice?.find((d) => d.type === `d${termData?.faces}`);
                    if (dicePreset) {
                        if (dicePreset.modelFile && !dicePreset.modelLoaded) {
                            // Load the modelFile
                            dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
                        }
                        dicePreset.loadTextures();
                    }
                }
            }
        }
        super(termData);
    }
}

class TraitRoll extends SwadeRoll {
    static async confirmCritfail(msg) {
        const label = game.i18n.localize('SWADE.Rolls.Critfail.ConfirmDie');
        const options = { critfailConfirmationRoll: true };
        const roll = await new SwadeRoll(`1d6[${label}]`, {}, options).evaluate();
        await game.dice3d?.showForRoll(roll, game.user, true, msg['whisper'] || null, msg['blind'], undefined, msg['speaker']);
        const previousRolls = msg['rolls'];
        previousRolls.forEach((r) => r.dice.forEach((d) => d.results.forEach((i) => (i.hidden = true))));
        await msg.update({ rolls: [roll, ...previousRolls] });
    }
    constructor(formula, data = {}, options = {}) {
        options.rollType ??= "trait";
        super(formula, data, options);
    }
    static CHAT_TEMPLATE = 'systems/swade/templates/chat/dice/trait-roll.hbs';
    get isValidTraitRoll() {
        return this.#termIsPoolTerm(this.terms[0]);
    }
    get isCritfail() {
        const term = this.terms[0];
        if (!this.#termIsPoolTerm(term) || !this._evaluated)
            return undefined;
        const wildDie = term.dice.find((d) => d instanceof WildDie);
        const majorityOfDiceAreOne = count(term.dice, (d) => d.total === 1) > term.dice.length / 2;
        if (wildDie)
            return majorityOfDiceAreOne && wildDie.total === 1;
        return majorityOfDiceAreOne;
    }
    get groupRoll() {
        return this.options['groupRoll'] ?? false;
    }
    set groupRoll(groupRoll) {
        this.options['groupRoll'] = groupRoll;
    }
    get isRerollable() {
        return this.options['rerollable'] ?? true;
    }
    get isCritFailConfirmationRoll() {
        return false;
    }
    set targetNumber(tn) {
        this.options['targetNumber'] = tn;
    }
    get targetNumber() {
        return this.options['targetNumber'] ?? 4;
    }
    /**
     * @returns Critfail: -1, Fail: 0, Success: 1, Raises: 2 or more
     */
    get successes() {
        if (this.isCritfail)
            return constants$1.ROLL_RESULT.CRITFAIL;
        if ((this.total ?? 0) < this.targetNumber)
            return constants$1.ROLL_RESULT.FAIL;
        if ((this.total ?? 0) < this.targetNumber + 4)
            return constants$1.ROLL_RESULT.SUCCESS;
        return Math.max(Math.floor(((this.total ?? 0) - this.targetNumber) / 4) + 1, 0);
    }
    async getRenderData(flavor, isPrivate = false) {
        const data = await super.getRenderData(flavor, isPrivate);
        data.resultParts = this._formatResultParts();
        return data;
    }
    clone() {
        const cloned = super.clone();
        if (cloned.terms[0] instanceof foundry.dice.terms.PoolTerm) {
            for (const poolPart of cloned.terms[0].rolls) {
                poolPart.terms.forEach((part, i, terms) => {
                    if (part instanceof foundry.dice.terms.Die &&
                        part.flavor === game.i18n.localize('SWADE.WildDie')) {
                        terms[i] = new WildDie({ faces: part.faces });
                    }
                });
            }
        }
        return cloned;
    }
    async toMessage(messageData = {}, { rollMode = 'publicroll', create = true, } = {}) {
        foundry.utils.setProperty(messageData, 'flags.swade.targets', Array.from(game.user.targets).map((t) => {
            return { name: t.name, uuid: t.document.uuid };
        }));
        return super.toMessage(messageData, { rollMode, create });
    }
    applyReroll(actor) {
        if (!actor ||
            !('stats' in actor.system) ||
            !('bennyTrait' in actor.system.stats.globalMods))
            return false;
        if (actor.system.stats.globalMods.bennyTrait?.length > 0) {
            let adjustRoll = false;
            for (const mod of actor.system.stats.globalMods.bennyTrait) {
                const hasMod = this.modifiers.find((m) => m.label === mod.label);
                if (!hasMod) {
                    adjustRoll = true;
                    this.options['modifiers'].push(mod);
                    this.terms.push(new foundry.dice.terms.OperatorTerm({ operator: '+' }), new foundry.dice.terms.StringTerm({
                        term: String(mod.value),
                        options: { flavor: mod.label },
                    }));
                }
            }
            if (adjustRoll) {
                this.resetFormula();
                return true;
            }
        }
        return false;
    }
    _formatResultParts() {
        const result = new Array();
        if (!this.isValidTraitRoll)
            return result;
        const pool = this.terms[0];
        //clone the terms and remove the pool;
        const mods = this.terms.slice(1);
        //cut up the modifiers and add them up into a single number
        const modTotal = chunkArray(mods, 2).reduce((acc, cur) => {
            const [op, num] = cur;
            return (acc += Number(`${op.total?.toString().trim()}${num.total}`));
        }, 0);
        for (let i = 0; i < pool.rolls.length; i++) {
            const roll = pool.rolls[i];
            const faces = roll.terms[0]['faces'];
            if (pool.results[i].discarded)
                continue; //skip discard results
            let img = '';
            if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
                img = `icons/svg/d${faces}-grey.svg`;
            }
            //add the modifier total to each result of the base pool
            result.push({
                img,
                result: roll.total + modTotal,
                class: this._getRollClass(roll),
                die: true,
                hint: roll.dice[0].flavor,
            });
        }
        return result;
    }
    #termIsPoolTerm(term) {
        return term instanceof foundry.dice.terms.PoolTerm;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$b, HandlebarsApplicationMixin: HandlebarsApplicationMixin$c } = foundry.applications.api;
class RollDialog extends HandlebarsApplicationMixin$c(ApplicationV2$b) {
    constructor({ ctx, resolve, ...options }) {
        super(options);
        this.#ctx = ctx;
        this.#callback = resolve;
    }
    #callback;
    #filters = this.#createFiltersHandlers();
    #isResolved = false;
    #extraButtonUsed = false;
    #keydownListener;
    #ctx;
    static asPromise(ctx) {
        return new Promise((resolve) => new RollDialog({ ctx, resolve }).render({ force: true }));
    }
    static DEFAULT_OPTIONS = {
        window: {
            contentClasses: ['standard-form'],
        },
        classes: ['swade', 'roll-dialog', 'swade-application'],
        position: {
            width: 400,
            height: 'auto',
        },
        filters: [{ inputSelector: '.searchBox', contentSelector: '.selections' }],
        tag: 'form',
        form: {
            handler: RollDialog.onSubmit,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false,
        },
        actions: {
            close: RollDialog.#onClose,
            addModifier: RollDialog.#onAddModifier,
            addPreset: RollDialog.#onAddPreset,
            toggleList: RollDialog.#onToggleList,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/roll-dialog.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    get ctx() {
        return this.#ctx;
    }
    get rollCls() {
        //@ts-expect-error JS somehow resolves that as a function
        return this.ctx.roll.constructor;
    }
    get title() {
        return this.ctx.title ?? 'SWADE RollDialog';
    }
    get rollMode() {
        return this.form.querySelector('#rollMode')
            .value;
    }
    get isTraitRoll() {
        return this.ctx.roll instanceof TraitRoll;
    }
    get isDamageRoll() {
        return this.ctx.roll instanceof DamageRoll;
    }
    get isAttack() {
        return this.ctx?.item?.type === 'weapon' && this.isTraitRoll;
    }
    get modifiers() {
        return this.ctx.mods;
    }
    #createFiltersHandlers() {
        return this.options.filters.map((f) => {
            f.callback = this._onSearchFilter.bind(this);
            return new foundry.applications.ux.SearchFilter(f);
        });
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.#filters.forEach((f) => f.bind(this.element));
        if (!this.#keydownListener) {
            this.#keydownListener = this.#onKeyDown.bind(this);
            document.addEventListener('keydown', this.#keydownListener);
        }
        this.element
            .querySelector('.new-modifier-value')
            ?.addEventListener('input', (ev) => {
            const addModButton = this.element.querySelector('.add-modifier');
            if (addModButton)
                addModButton.disabled = !ev.target?.value?.length;
        });
    }
    static #onToggleList(_event, target) {
        const style = getComputedStyle(target);
        const html = this.element;
        html.querySelector('.fa-solid.fa-caret-right')?.classList.toggle('rotate');
        const dropdown = html.querySelector('.dropdown');
        if (dropdown) {
            dropdown.style.width = style.width;
            dropdown.classList.toggle('collapsed');
        }
    }
    _onChangeForm(formConfig, event) {
        super._onChangeForm(formConfig, event);
        const target = event.target;
        if (!target)
            return;
        if (target.type === 'checkbox') {
            const index = Number(target.dataset.index);
            this.modifiers[index].ignore = !target.checked;
            this.render();
        }
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            rollModes: CONFIG.Dice.rollModes,
            modGroups: new Array(),
            extraButtonLabel: '',
            rollMode: game.settings.get('core', 'rollMode'),
            modifiers: this.modifiers
                .map(normalizeRollModifiers)
                .map(this.#fillModifierLabels.bind(this)),
            formula: this.#buildRollForEvaluation().formula.replace(/(?<={[^}]*?),/g, ', '),
            isTraitRoll: this.isTraitRoll,
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-solid fa-dice',
                    cssClass: 'submit-roll',
                    label: 'SWADE.Roll',
                },
                {
                    type: 'button',
                    icon: 'fa-solid fa-times',
                    action: 'close',
                    label: 'Close',
                },
            ],
        });
        if (this.isDamageRoll ||
            (this.isTraitRoll && !this.ctx.actor?.isWildcard)) {
            context.buttons.splice(1, 0, {
                type: 'submit',
                icon: 'fa-regular fa-square-plus',
                cssClass: 'submit-roll',
                name: 'extra',
                label: this.isDamageRoll ? 'SWADE.RollRaise' : 'SWADE.GroupRoll',
            });
        }
        CONFIG.SWADE.prototypeRollGroups.forEach((m) => {
            if (m.rollType === constants$1.ROLL_TYPE.TRAIT && !this.isTraitRoll)
                return;
            if (m.rollType === constants$1.ROLL_TYPE.ATTACK && !this.isAttack)
                return;
            if (m.rollType === constants$1.ROLL_TYPE.DAMAGE && !this.isDamageRoll)
                return;
            context.modGroups.push(m);
        });
        return context;
    }
    static async onSubmit(event, _form, formData) {
        this.#extraButtonUsed = event.submitter?.name === 'extra';
        const expanded = foundry.utils.expandObject(formData.object);
        Object.values(expanded.modifiers ?? []).forEach((v, i) => (this.modifiers[i].ignore = !v.active));
        if (expanded.map && expanded.map !== 0) {
            this.modifiers.push({
                label: game.i18n.localize('SWADE.MAPenalty.Label'),
                value: expanded.map,
            });
        }
        //add any unsubmitted modifiers, evaluate and resolve the promise
        this.#addModifier();
        this.#resolve(await this.#evaluateRoll());
    }
    static #onClose(_event, _target) {
        return this.close();
    }
    _onClose(options) {
        super._onClose(options);
        // Fallback if the roll has not yet been resolved
        if (!this.#isResolved)
            this.#callback(null);
        document.removeEventListener('keydown', this.#keydownListener);
    }
    async #evaluateRoll() {
        this.#checkForAndAddBonusDamage();
        const roll = this.#buildRollForEvaluation();
        const terms = roll.terms;
        //Add the Wild Die for a group roll of
        if (this.#extraButtonUsed &&
            this.isTraitRoll &&
            !this.ctx.actor?.isWildcard) {
            const traitPool = terms[0];
            if (traitPool instanceof foundry.dice.terms.PoolTerm) {
                const wildDie = new WildDie();
                const wildRoll = this.rollCls.fromTerms([wildDie]);
                traitPool.rolls.push(wildRoll);
                traitPool.terms.push(wildRoll.formula);
            }
        }
        //recreate the roll
        const finalizedRoll = this.rollCls.fromTerms(terms, roll.options);
        if (finalizedRoll instanceof TraitRoll) {
            finalizedRoll.groupRoll =
                this.#extraButtonUsed && !this.ctx.actor?.isWildcard;
        }
        //evaluate
        await finalizedRoll.evaluate();
        if (finalizedRoll instanceof DamageRoll) {
            finalizedRoll.ap = this.ctx.ap ?? 0;
            finalizedRoll.isHeavyWeapon = this.ctx.isHeavyWeapon ?? false;
        }
        finalizedRoll.setRerollable(this.ctx.roll.isRerollable);
        finalizedRoll.setRollType(this.ctx.roll.rollType);
        // Convert the roll to a chat message and return it
        const msg = await finalizedRoll.toMessage({
            flavor: this.ctx.flavor,
            speaker: this.ctx.speaker,
        }, { rollMode: this.rollMode });
        // TODO: Remove type annotation after toMessage gets fixed upstream in types
        finalizedRoll.setMessageId(msg?.id);
        return finalizedRoll;
    }
    _onSearchFilter(_event, _query, rgx, html) {
        for (const li of Array.from(html.children)) {
            if (li.classList.contains('group-header'))
                continue;
            const btn = li.querySelector('.add-preset');
            const name = btn?.textContent;
            const match = rgx.test(foundry.applications.ux.SearchFilter.cleanQuery(name));
            li.style.display = match ? 'block' : 'none';
        }
    }
    #buildRollForEvaluation() {
        const formula = this.ctx.roll.formula +
            this.modifiers
                .filter((v) => !v.ignore) //remove the disabled modifiers
                .map(normalizeRollModifiers)
                .reduce(modifierReducer, '');
        // Create new roll from pure formula text
        const intermediateRoll = new this.rollCls(formula, this.#getRollData());
        const oldTerms = this.ctx.roll.terms;
        const newTerms = intermediateRoll.terms;
        // Replace "duplicate" terms with the originals to retain any extra data set on them
        newTerms.splice(0, oldTerms.length, ...oldTerms);
        const roll = this.rollCls.fromTerms(newTerms);
        roll.modifiers = this.modifiers;
        return roll;
    }
    #fillModifierLabels(mod) {
        if (typeof mod.value === 'string' && mod.value.startsWith('@')) {
            const key = mod.value.split('@')[1];
            const rollData = this.#getRollData();
            const value = rollData[key];
            const match = value.match(/\[(\w+)\]/); //extract the roll flavor text
            if (value && match)
                mod.label = match[1];
        }
        mod.label ||= game.i18n.localize('SWADE.Addi');
        return mod;
    }
    #resolve(roll) {
        this.#isResolved = true;
        this.#callback(roll);
        this.close();
    }
    /** add a + if no +/- is present in the situational mod */
    #sanitizeModifierInput(modifier) {
        if (modifier.startsWith('@'))
            return modifier;
        if (!modifier[0].match(/[+-]/))
            return '+' + modifier;
        return modifier;
    }
    #getRollData() {
        if (this.ctx.actor)
            return this.ctx.actor.getRollData(false);
        return this.ctx.item?.actor?.getRollData(false) ?? {};
    }
    #checkForAndAddBonusDamage() {
        if (this.#extraButtonUsed && this.ctx.item && !this.ctx.actor) {
            const bonusDamageDice = this.ctx.item?.['system']['bonusDamageDice'];
            const bonusDamageDieType = this.ctx.item?.['system']['bonusDamageDie'];
            this.modifiers.push({
                label: game.i18n.localize('SWADE.BonusDamage'),
                value: `+${bonusDamageDice ?? 1}d${bonusDamageDieType}x`,
            });
        }
    }
    static #onAddModifier(_event, _target) {
        this.#addModifier();
        this.render({ force: true });
    }
    /** Reads the modifier inputs, sanitizes them and adds the values to the mod array */
    #addModifier() {
        const label = this.form?.querySelector('.new-modifier-label')?.value;
        const value = this.form?.querySelector('.new-modifier-value')?.value;
        if (value) {
            this.modifiers.push({
                label: label || game.i18n.localize('SWADE.Addi'),
                value: this.#sanitizeModifierInput(value),
            });
        }
    }
    static #onAddPreset(_event, target) {
        const group = CONFIG.SWADE.prototypeRollGroups.find((v) => v.name === target.dataset.group);
        const modifier = group?.modifiers[Number(target.dataset.index)];
        if (modifier) {
            this.modifiers.push({
                label: modifier.label,
                value: modifier.value,
            });
        }
        this.render({ force: true });
    }
    #onKeyDown(event) {
        // Close dialog
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            return this.close();
        }
        // Confirm default choice or add a modifier
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            const modValue = this.form?.querySelector('.new-modifier-value')?.value;
            if (modValue) {
                this.#addModifier();
                return this.render();
            }
            else {
                return this.submit();
            }
        }
    }
}

class AddStatsValueField extends foundry.data.fields.DataField {
    constructor(options = {}) {
        super(options);
    }
    _cast(value) {
        if (typeof value !== 'string')
            return value;
        if (['true', 'false'].includes(value))
            return value === 'true';
        if (Number.isNumeric(value))
            return Number(value);
        return value;
    }
    _validateType(value, _options = {}) {
        const validTypes = ['string', 'number', 'boolean'];
        if (!!value && !validTypes.includes(foundry.utils.getType(value))) {
            throw new Error('must be text, a number, or a boolean');
        }
    }
}

const fields$6 = foundry.data.fields;
function makeAdditionalStatsSchema() {
    return new fields$6.TypedObjectField(new fields$6.SchemaField({
        label: new fields$6.StringField({
            nullable: false,
            label: 'SWADE.AdditionalStats.Label',
        }),
        dtype: new fields$6.StringField({
            nullable: false,
            required: true,
            choices: Object.values(constants$1.ADDITIONAL_STATS_TYPE),
            label: 'SWADE.AdditionalStats.Type',
        }),
        hasMaxValue: new fields$6.BooleanField({
            label: 'SWADE.AdditionalStats.HasMaxValue',
        }),
        value: new AddStatsValueField({ label: 'SWADE.AdditionalStats.Value' }),
        max: new AddStatsValueField({ label: 'SWADE.AdditionalStats.MaxLabel' }),
        optionString: new fields$6.StringField({
            required: false,
            initial: undefined,
            label: 'SWADE.AdditionalStats.OptionLabel',
        }),
        modifier: new fields$6.StringField({
            required: false,
            initial: undefined,
            label: 'SWADE.Modifier',
        }),
    }), { initial: {}, label: 'SWADE.AddStats' });
}

function makeDiceField(initial = 4, label = 'SWADE.DieSides') {
    return new foundry.data.fields.NumberField({
        label,
        initial,
        min: 0,
        integer: true,
        nullable: false,
    });
}
function makeTraitDiceFields() {
    const fields = foundry.data.fields;
    return {
        die: new fields.SchemaField({
            sides: makeDiceField(),
            modifier: new fields.NumberField({
                label: 'SWADE.TraitMod',
                initial: 0,
                integer: true,
                nullable: false,
            }),
        }),
        'wild-die': new fields.SchemaField({
            sides: makeDiceField(6, 'SWADE.WildDieSides'),
        }),
    };
}
/**
 * @param die The die to adjust
 * @returns the properly adjusted trait die
 */
function boundTraitDie(die) {
    const sides = die.sides;
    if (sides < 4 && sides !== 1) {
        die.sides = 4;
    }
    else if (sides > 12) {
        const difference = sides - 12;
        die.sides = 12;
        die.modifier += difference / 2;
    }
    return die;
}

var index$a = /*#__PURE__*/Object.freeze({
    __proto__: null,
    boundTraitDie: boundTraitDie,
    makeAdditionalStatsSchema: makeAdditionalStatsSchema,
    makeDiceField: makeDiceField,
    makeTraitDiceFields: makeTraitDiceFields
});

const fields$5 = foundry.data.fields;
/** source for regex: https://ihateregex.io/expr/url-slug/ */
// eslint-disable-next-line @typescript-eslint/naming-convention
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/g;
const itemDescription = () => ({
    description: new fields$5.HTMLField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Desc',
    }),
    notes: new fields$5.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Notes',
    }),
    source: new fields$5.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Source',
    }),
    swid: new fields$5.StringField({
        initial: constants$1.RESERVED_SWID.DEFAULT,
        blank: false,
        required: true,
        label: 'SWADE.SWID.Long',
        validate: (value, _options) => {
            validateSwid(value);
        },
    }),
    ...additionalStats(),
});
const builder = () => ({
    build: new fields$5.SchemaField({
        cost: new fields$5.NumberField({ label: 'SWADE.BuildCost' }),
        // Null means unlimited. Nonlinear options should be implemented as separate choices.
        limit: new fields$5.NumberField({
            label: 'SWADE.BuildLimit',
            initial: 1,
            integer: true,
            min: 1,
        }),
        level: new fields$5.NumberField({
            label: 'SWADE.BuildLevel',
            initial: 1,
            integer: true,
            min: 1,
        }),
    }),
});
const physicalItem = () => ({
    quantity: new fields$5.NumberField({ initial: 1, label: 'SWADE.Quantity' }),
    weight: new fields$5.NumberField({ initial: 0, label: 'SWADE.Weight' }),
    price: new fields$5.NumberField({ initial: 0, label: 'SWADE.Price' }),
});
const arcaneDevice = () => ({
    isArcaneDevice: new fields$5.BooleanField({ label: 'SWADE.ArcaneDevice' }),
    arcaneSkillDie: new fields$5.SchemaField({
        sides: makeDiceField(),
        modifier: new fields$5.NumberField({ initial: 0, label: 'SWADE.Modifier' }),
    }),
    powerPoints: new fields$5.ObjectField({ label: 'SWADE.PP' }),
});
const equippable = () => ({
    equippable: new fields$5.BooleanField({ label: 'SWADE.Equippable' }),
    equipStatus: new fields$5.NumberField({ initial: 1, label: 'SWADE.Equipped' }),
});
const vehicular = () => ({
    isVehicular: new fields$5.BooleanField({ label: 'SWADE.VehicleMod' }),
    mods: new fields$5.NumberField({ initial: 1, label: 'SWADE.Mods' }),
});
const bonusDamage = () => ({
    bonusDamageDie: makeDiceField(6),
    bonusDamageDice: new fields$5.NumberField({
        initial: 1,
        label: 'SWADE.NumberOfDice.Label',
    }),
});
const actions = () => ({
    actions: new fields$5.SchemaField({
        trait: new fields$5.StringField({ initial: '', label: 'SWADE.Trait' }),
        traitMod: new fields$5.StringField({ initial: '', label: 'SWADE.TraitMod' }),
        dmgMod: new fields$5.StringField({ initial: '', label: 'SWADE.DmgMod' }),
        additional: new fields$5.TypedObjectField(new fields$5.SchemaField({
            name: new fields$5.StringField({
                blank: false,
                nullable: false,
                label: 'SWADE.Name',
            }),
            type: new fields$5.StringField({
                initial: constants$1.ACTION_TYPE.TRAIT,
                choices: Object.values(constants$1.ACTION_TYPE),
                label: 'Type',
            }),
            dice: new fields$5.NumberField({ initial: undefined, required: false }),
            resourcesUsed: new fields$5.NumberField({
                initial: undefined,
                required: false,
                label: 'SWADE.ResourcesUsed.Label',
            }),
            modifier: new fields$5.StringField({
                initial: undefined,
                required: false,
                label: 'SWADE.Modifier',
            }),
            override: new fields$5.StringField({
                initial: undefined,
                required: false,
                label: 'SWADE.ActionsOverride',
            }),
            ap: new fields$5.NumberField({
                initial: undefined,
                required: false,
                nullable: true,
                label: 'SWADE.Name',
            }),
            uuid: new fields$5.DocumentUUIDField({
                type: 'Macro',
                nullable: true,
                required: true,
                blank: false,
                initial: null,
                label: 'UUID',
            }),
            macroActor: new fields$5.StringField({
                initial: constants$1.MACRO_ACTOR.DEFAULT,
                required: false,
                choices: Object.values(constants$1.MACRO_ACTOR),
                label: 'DOCUMENT.Actor',
            }),
            isHeavyWeapon: new fields$5.BooleanField({
                initial: false,
                required: false,
                label: 'SWADE.HeavyWeapon',
            }),
        }), { initial: {} }),
    }),
    ...bonusDamage(),
});
const activities = () => ({
    activities: new fields$5.SetField(new fields$5.StringField({ blank: false, nullable: false }), {
        label: 'SWADE.Actions.Activities.Label',
        hint: 'SWADE.Actions.Activities.Hint',
    }),
});
const favorite = () => ({
    favorite: new fields$5.BooleanField({ label: 'SWADE.Favorite' }),
});
const templates = () => ({
    templates: new fields$5.SchemaField({
        cone: new fields$5.BooleanField({ label: 'SWADE.Cone.Short' }),
        stream: new fields$5.BooleanField({ label: 'SWADE.Stream.Short' }),
        small: new fields$5.BooleanField({ label: 'SWADE.Small.Short' }),
        medium: new fields$5.BooleanField({ label: 'SWADE.Medium.Short' }),
        large: new fields$5.BooleanField({ label: 'SWADE.Large.Short' }),
    }, { label: 'SWADE.Templates.Possible' }),
});
const additionalStats = () => ({
    additionalStats: makeAdditionalStatsSchema(),
});
const category = () => ({
    category: new fields$5.StringField({ initial: '', label: 'SWADE.Category' }),
});
const grantEmbedded = () => ({
    ...grants(),
    grantOn: new fields$5.NumberField({
        initial: constants$1.GRANT_ON.CARRIED,
        label: 'SWADE.ItemGrants.When',
    }),
});
const grants = () => ({
    grants: new fields$5.ArrayField(
    //TODO create schema field for item grants
    new fields$5.SchemaField({
        uuid: new fields$5.DocumentUUIDField({
            type: 'Item',
            nullable: false,
            required: true,
            label: 'SWADE.Item',
        }),
        img: new fields$5.StringField({
            initial: null,
            nullable: true,
            label: 'Image',
        }),
        name: new fields$5.StringField({
            initial: null,
            nullable: true,
            label: 'SWADE.Name',
        }),
        mutation: new fields$5.ObjectField({
            required: false,
            label: 'SWADE.ItemGrants.Mutation',
        }),
    })),
});
const choiceSets = () => ({
    choiceSets: new fields$5.ArrayField(new fields$5.SchemaField({
        title: new fields$5.StringField({ initial: '', required: true }),
        choice: new fields$5.NumberField({ initial: null, nullable: true }),
        choices: new fields$5.ArrayField(new fields$5.SchemaField({
            name: new fields$5.StringField({ initial: '', required: true }),
            addToName: new fields$5.BooleanField({
                initial: true,
                nullable: false,
            }),
            mutation: new fields$5.ObjectField({
                required: false,
                label: 'SWADE.ItemGrants.Mutation',
            }),
        })),
    })),
});
function validateSwid(value) {
    //`any` is a reserved word
    if (value === constants$1.RESERVED_SWID.ANY) {
        return new foundry.data.validation.DataModelValidationFailure({
            unresolved: true,
            invalidValue: value,
            message: 'any is a reserved SWID!',
        });
    }
    //if the value matches the regex we have likely a valid swid
    if (!value.match(SLUG_REGEX)) {
        return new foundry.data.validation.DataModelValidationFailure({
            unresolved: true,
            invalidValue: value,
            message: value + ' is not a valid SWID!',
        });
    }
}

var common = /*#__PURE__*/Object.freeze({
    __proto__: null,
    SLUG_REGEX: SLUG_REGEX,
    actions: actions,
    activities: activities,
    additionalStats: additionalStats,
    arcaneDevice: arcaneDevice,
    bonusDamage: bonusDamage,
    builder: builder,
    category: category,
    choiceSets: choiceSets,
    equippable: equippable,
    favorite: favorite,
    grantEmbedded: grantEmbedded,
    grants: grants,
    itemDescription: itemDescription,
    physicalItem: physicalItem,
    templates: templates,
    validateSwid: validateSwid,
    vehicular: vehicular
});

class SwadeBaseItemData extends foundry.abstract.TypeDataModel {
    /** @inheritdoc */
    static defineSchema() {
        return {
            ...itemDescription(),
            ...choiceSets(),
            ...additionalStats(),
        };
    }
    get isPhysicalItem() {
        return false;
    }
    get actor() {
        return this.parent?.actor;
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        /// @ts-expect-error This should suffice as a type guard
        if ('activities' in this)
            this._prepareActivities();
    }
    async rollAdditionalStat(stat) {
        const statData = this.additionalStats[stat];
        //return early if there's no data to roll or if it's not a die stat
        if (!statData ||
            !statData.value ||
            statData.dtype !== constants$1.ADDITIONAL_STATS_TYPE.DIE)
            return;
        let modifier = statData.modifier || '';
        if (modifier && !modifier.match(/^[+-]/)) {
            modifier = '+' + modifier;
        }
        const roll = new SwadeRoll(`${statData.value}${modifier}`, this.actor?.getRollData() ?? {});
        await roll.evaluate();
        const message = await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: statData.label,
        });
        return message;
    }
    /**
     * Shared utility method for preparing activities on the item.
     * WARNING: Only call on items that actually support Activities
     */
    _prepareActivities() {
        if (!this.actor || typeof this.activities === 'undefined')
            return;
        const resolved = Array.from(this.activities).flatMap((activity) => this.actor.getItemsBySwid(activity, 'action'));
        for (const item of resolved) {
            const actions = Object.entries(item.system.actions.additional);
            for (const [key, action] of actions) {
                this.actions.additional[item.system.swid + '-' + key] = {
                    ...action,
                    name: action.name + ' (' + item.name + ')',
                    resolved: true,
                };
            }
        }
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.actor?.type === 'group' && !this.isPhysicalItem) {
            ui.notifications?.warn('Groups can only hold physical items!');
            return false;
        }
        // set a default image
        if (!data.img) {
            this.parent?.updateSource({
                img: `systems/swade/assets/icons/${data.type}.svg`,
            });
        }
        //set a swid
        if (!data.system?.swid ||
            data.system?.swid === constants$1.RESERVED_SWID.DEFAULT) {
            this.updateSource({ swid: slugify(data.name) });
        }
    }
    /** Prepare any fields that are formulas  */
    prepareFormulaFields() { }
}

class SwadePhysicalItemData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...physicalItem(),
            ...builder(),
        };
    }
    get isPhysicalItem() {
        return true;
    }
    async _preUpdate(changed, options, user) {
        await super._preUpdate(changed, options, user);
        const diff = foundry.utils.diffObject(this.toObject(), changed);
        if (!!this.parent?.actor &&
            foundry.utils.hasProperty(diff, 'system.equipStatus')) {
            //toggle all active effects when an item equip status changes
            const newState = foundry.utils.getProperty(diff, 'system.equipStatus');
            const updates = this.parent.effects.map((ae) => {
                return {
                    _id: ae.id,
                    disabled: newState < constants$1.EQUIP_STATE.OFF_HAND,
                };
            });
            await this.parent.updateEmbeddedDocuments('ActiveEffect', updates);
        }
    }
}

var index$9 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    SwadeBaseItemData: SwadeBaseItemData,
    SwadePhysicalItemData: SwadePhysicalItemData
});

class SwadeItem extends Item {
    static RANGE_REGEX = /[0-9]+\/*/g;
    static migrateData(data) {
        super.migrateData(data);
        if (data.flags?.swade?.embeddedPowers) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [key, item] of data.flags.swade.embeddedPowers) {
                if (item.system && !item.data)
                    continue;
                item.system = { ...item.data };
                delete item.data;
            }
        }
        if (data?.system?.grants) {
            for (const grant of data.system.grants) {
                const uuid = grant.uuid;
                if (uuid.startsWith('Compendium.') && !uuid.includes('.Item.')) {
                    const arr = uuid.split('.');
                    arr.splice(arr.length - 1, 0, 'Item');
                    grant.uuid = arr.join('.');
                }
                //bad UUID with multiple Item strings
                if (uuid.split('.').filter((v) => v === 'Item').length > 1) {
                    const arr = uuid.split('.').filter((v) => v !== 'Item'); //remove all instances of Item
                    arr.unshift('Item'); // add a single Item to the front
                    grant.uuid = arr.join('.');
                }
            }
        }
        // eslint-disable-next-line deprecation/deprecation
        if (data.type === 'ability' &&
            ['ancestry', 'race'].includes(data.system?.subtype)) {
            data.type = 'ancestry';
        }
        return data;
    }
    /**
     * An object that tracks which tracks the changes to the data model which were applied by active effects
     */
    overrides = {};
    get isMeleeWeapon() {
        return this.system['isMelee'] ?? false;
    }
    get range() {
        // Validates that this item type has a range property
        if (!('range' in this.system) || !this.system.range)
            return;
        //match the range string via Regex
        const match = this.system.range.match(SwadeItem.RANGE_REGEX);
        //return early if nothing is found
        if (!match)
            return;
        //split the string and convert the values to numbers
        const ranges = match.join('').split('/');
        //make sure the array is 4 values long
        const increments = Array.from({ ...ranges, length: 4 }, (v) => Number(v) || 0);
        return {
            short: increments[0],
            medium: increments[1],
            long: increments[2],
            extreme: increments[3] || increments[2] * 4,
        };
    }
    /**
     * @returns whether this item can be an arcane device
     */
    get canBeArcaneDevice() {
        if ('canBeArcaneDevice' in this.system)
            return this.system.canBeArcaneDevice;
        return false;
    }
    get isArcaneDevice() {
        if (!this.canBeArcaneDevice)
            return false;
        return foundry.utils.getProperty(this, 'system.isArcaneDevice');
    }
    /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
    get powerPointObject() {
        if ('_powerPoints' in this.system) {
            return this.system._powerPoints;
        }
        else if (this.isArcaneDevice) {
            return foundry.utils.getProperty(this, 'system.powerPoints');
        }
        return null;
    }
    get isReadied() {
        if ('isReadied' in this.system)
            return this.system.isReadied;
        return false;
    }
    get isPhysicalItem() {
        return this.system instanceof SwadePhysicalItemData;
    }
    get canHaveCategory() {
        if ('canHaveCategory' in this.system)
            return this.system.canHaveCategory;
        return this.isPhysicalItem;
    }
    get embeddedPowers() {
        const flagContent = this.getFlag('swade', 'embeddedPowers') ?? [];
        return new Map(flagContent);
    }
    get canGrantItems() {
        return (this.isPhysicalItem ||
            ('canGrantItems' in this.system ? this.system.canGrantItems : false));
    }
    get grantsItems() {
        if (!this.canGrantItems)
            return [];
        return foundry.utils.getProperty(this, 'system.grants');
    }
    get hasGranted() {
        return this.getFlag('swade', 'hasGranted') ?? [];
    }
    get grantedBy() {
        if (this.parent) {
            return this.parent.items.find((i) => i.hasGranted.includes(this.id));
        }
    }
    get modifier() {
        if ('modifier' in this.system)
            return this.system.modifier;
        return 0;
    }
    get traitModifiers() {
        const modifiers = new Array();
        // Ensure `this` is properly referenced
        const itemName = this?.name ?? game.i18n.localize('SWADE.Item'); // Use optional chaining to prevent errors
        if (foundry.utils.getProperty(this, 'system.actions.traitMod')) {
            modifiers.push({
                label: `${itemName} ${game.i18n.localize('SWADE.ItemTraitMod')}`, // Combine name and localized string
                value: foundry.utils.getProperty(this, 'system.actions.traitMod'),
            });
        }
        if (this.system?.traitModifiers) {
            // Ensure `this.system` exists before accessing properties
            modifiers.push(...this.system.traitModifiers);
        }
        return modifiers;
    }
    get usesAmmoFromInventory() {
        if ('usesAmmoFromInventory' in this.system)
            return !!this.system.usesAmmoFromInventory;
        return false;
    }
    // Special implementation to help with modifiers on temp docs
    clone(data = {}, options = {}) {
        if (options.save)
            return super.clone(data, options);
        if (this.parent)
            this.parent._embeddedPreparation = true;
        const item = super.clone(data, options);
        if (item.parent) {
            delete item.parent._embeddedPreparation;
        }
        return item;
    }
    prepareEmbeddedDocuments() {
        super.prepareEmbeddedDocuments();
        if (!this.actor || this.actor._embeddedPreparation)
            this.applyModifiers();
    }
    /**
     * Apply modifier effects to this item.
     */
    applyModifiers() {
        const overrides = {};
        const changes = [];
        // TODO: In v13 just use the getter on the embedded collection
        for (const effect of this.effects.filter((e) => e.type === 'modifier')) {
            if (!effect.active)
                continue;
            changes.push(...effect.changes.map((change) => {
                const c = foundry.utils.deepClone(change);
                c.effect = effect;
                c.priority = c.priority ?? c.mode * 10;
                return c;
            }));
        }
        changes.sort((a, b) => a.priority - b.priority);
        // Apply all changes
        for (const change of changes) {
            if (!change.key)
                continue;
            const changes = change.effect.apply(this, change);
            Object.assign(overrides, changes);
        }
        // Expand the set of final overrides
        this.overrides = foundry.utils.expandObject(overrides);
    }
    async rollDamage(options = {}) {
        const modifiers = new Array();
        let damage = '';
        if (options.dmgOverride) {
            damage = options.dmgOverride;
        }
        else if ('damage' in this.system && this.system.damage) {
            damage = this.system.damage;
        }
        else {
            return null;
        }
        const label = this.name;
        let ap = options.ap ?? foundry.utils.getProperty(this, 'system.ap') ?? 0;
        const isHeavyWeapon = foundry.utils.getProperty(this, 'system.isHeavyWeapon') ||
            options.isHeavyWeapon;
        let apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} 0`;
        if (this.actor && 'stats' in this.actor.system) {
            this.actor?.system.stats.globalMods.ap.forEach((e) => {
                ap += Number(e.value);
            });
        }
        if (ap) {
            apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
        }
        const rollParts = [damage];
        //Additional Mods
        if (this.actor && 'stats' in this.actor.system) {
            modifiers.push(...this.actor.system.stats.globalMods.damage);
        }
        if (options.additionalMods) {
            modifiers.push(...options.additionalMods);
        }
        const terms = DamageRoll.parse(rollParts.join(''), this.actor?.getRollData() ?? {});
        const baseRoll = new Array();
        for (const term of terms) {
            if (term instanceof foundry.dice.terms.Die) {
                if (!term.modifiers.includes('x') && Number(term.faces) > 1) {
                    term.modifiers.push('x');
                }
                if (!term.flavor) {
                    term.options.flavor = game.i18n.localize('SWADE.BaseDamage');
                }
                baseRoll.push(term.formula);
            }
            else if (term instanceof foundry.dice.terms.StringTerm) {
                baseRoll.push(this._makeExplodable(term.term));
            }
            else if (term instanceof foundry.dice.terms.NumericTerm) {
                baseRoll.push(term.formula);
            }
            else {
                baseRoll.push(term.expression);
            }
        }
        //Conviction Modifier
        if (this.parent &&
            'details' in this.parent.system &&
            game.settings.get('swade', 'enableConviction') &&
            foundry.utils.getProperty(this.parent.system, 'details.conviction.active')) {
            modifiers.push({
                label: game.i18n.localize('SWADE.Conv'),
                value: '+1d6x',
            });
        }
        let flavour = '';
        if (options.flavour) {
            flavour = ` - ${options.flavour}`;
        }
        //Joker Modifier
        if (this.parent?.hasJoker) {
            modifiers.push({
                label: game.i18n.localize('SWADE.Joker'),
                value: this.parent.getFlag('swade', 'jokerBonus') ?? 2,
            });
        }
        const roll = new DamageRoll(baseRoll.join(''), {}, { modifiers });
        if ('isRerollable' in options)
            roll.setRerollable(!!options.isRerollable);
        /**
         * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
         * Returning `false` in a hook callback will cancel the roll entirely
         * @category Hooks
         * @param {SwadeActor} actor                The actor that owns the item which rolls the damage
         * @param {SwadeItem} item                  The item that is used to create the damage value
         * @param {DamageRoll} roll                 The built base roll, without any modifiers
         * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
         * @param {IRollOptions} options            The options passed into the roll function
         */
        Hooks.call('swadeRollDamage', this.actor, this, roll, modifiers, options);
        if (options.suppressChat) {
            return DamageRoll.fromTerms([
                ...roll.terms,
                ...DamageRoll.parse(roll.modifiers.reduce(modifierReducer, ''), this.getRollData()),
            ]);
        }
        const finalFlavor = `${label} ${game.i18n.localize('SWADE.Dmg')}${apFlavor}${flavour}`;
        // Roll and return
        return RollDialog.asPromise({
            roll: roll,
            mods: modifiers,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: finalFlavor,
            title: `${label} ${game.i18n.localize('SWADE.Dmg')}`,
            item: this,
            ap: ap,
            isHeavyWeapon: isHeavyWeapon,
        });
    }
    async setEquipState(state) {
        const equipState = constants$1.EQUIP_STATE;
        Logger.debug(`Trying to set state ${getKeyByValue(equipState, state)} on item ${this.name} with type ${this.type}`);
        if ('_rejectEquipState' in this.system &&
            this.system._rejectEquipState(state)) {
            Logger.warn('You cannot set this state on the item ' + this.name, {
                toast: true,
            });
            return this.system.equipStatus;
        }
        await this.update({ 'system.equipStatus': state });
        return state;
    }
    getRollData() {
        return super.getRollData();
    }
    async getChatData(enrichOptions = {}) {
        // Item properties
        const chips = 'getChatChips' in this.system
            ? await this.system.getChatChips(enrichOptions)
            : new Array();
        //Additional actions
        const itemActions = foundry.utils.getProperty(this, 'system.actions.additional');
        const actions = new Array();
        for (const action in itemActions) {
            actions.push({
                key: action,
                type: itemActions[action].type,
                name: itemActions[action].name,
            });
        }
        const hasAmmoManagement = 'hasAmmoManagement' in this.system && this.system.hasAmmoManagement;
        const hasMagazine = hasAmmoManagement &&
            'reloadType' in this.system &&
            this.system.reloadType === constants$1.RELOAD_TYPE.MAGAZINE;
        const hasDamage = !!foundry.utils.getProperty(this, 'system.damage');
        const hasTrait = !!foundry.utils.getProperty(this, 'system.actions.trait');
        const hasReloadButton = 'hasReloadButton' in this.system && this.system.hasReloadButton;
        const additionalActions = foundry.utils.getProperty(this, 'system.actions.additional') || {};
        const actionValues = Object.values(additionalActions);
        const hasTraitActions = actionValues.some((v) => v.type === constants$1.ACTION_TYPE.TRAIT);
        const hasDamageActions = actionValues.some((v) => v.type === constants$1.ACTION_TYPE.DAMAGE);
        const hasResistRolls = actionValues.some((v) => v.type === constants$1.ACTION_TYPE.RESIST);
        const hasMacros = actionValues.some((v) => v.type === constants$1.ACTION_TYPE.MACRO);
        const hasTemplates = 'templates' in this.system &&
            Object.values(this.system.templates).some(Boolean);
        const effects = [];
        for (const effect of this.effects.filter((e) => !e.transfer && e.type !== 'modifier')) {
            effects.push(await foundry.applications.ux.TextEditor.implementation.enrichHTML(effect.link));
        }
        const data = {
            description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.system.description, enrichOptions),
            chips: chips,
            actions: actions,
        };
        const templateData = {
            item: this,
            data,
            effects,
            hasAmmoManagement,
            hasMagazine,
            hasReloadButton,
            hasDamage,
            hasTrait,
            hasTemplates,
            showDamageRolls: hasDamage || hasDamageActions,
            trait: foundry.utils.getProperty(this, 'system.actions.trait'),
            showTraitRolls: hasTrait || hasTraitActions,
            hasResistRolls,
            hasMacros,
            powerPoints: this.powerPointObject,
            settingRules: {
                noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
            },
        };
        return templateData;
    }
    /** A shorthand function to roll skills directly */
    async roll(options = {}) {
        //return early if there's no parent or this isn't a skill
        if (!('canRoll' in this.system) || !this.system.canRoll)
            return null;
        return this.parent.rollSkill(this.id, options);
    }
    async deleteDialog(options) {
        if (!this.parent)
            return super.deleteDialog(options);
        const type = game.i18n.localize(`TYPES.Item.${this.type}`);
        const proceed = await foundry.applications.api.DialogV2.confirm({
            rejectClose: false,
            window: {
                title: `${game.i18n.format('DOCUMENT.Delete', { type })}: ${this.name}`,
            },
            content: `<h3>${game.i18n.localize('AreYouSure')}</h3><p>${game.i18n.format('SWADE.DeleteFromParentWarningPermanent', { name: this.name, parent: this.parent.name })}</p>`,
        });
        if (!proceed)
            return false;
        return this.delete();
    }
    /**
     * Assembles data and creates a chat card for the item
     * @returns the rendered chat card
     */
    async show() {
        // Basic template rendering data
        if (!this.actor)
            return;
        // Basic chat message data
        const chatData = {
            type: 'itemCard',
            title: this.name,
            author: game.user?.id,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
            speaker: ChatMessage.getSpeaker({
                actor: this.parent,
                token: this.actor?.token,
                scene: this.actor?.token?.parent,
                alias: this.parent?.name,
            }),
            system: { uuid: this.uuid },
            flags: { core: { canPopout: true } },
        };
        const msgClass = getDocumentClass('ChatMessage');
        if (game.settings.get('swade', 'hideNpcItemChatCards') &&
            this.actor?.type === 'npc') {
            chatData.whisper = game.users.filter((u) => u.isGM).map((u) => u.id);
        }
        else {
            // Apply the roll mode to the message
            msgClass.applyRollMode(chatData, game.settings.get('core', 'rollMode') ?? 'roll');
        }
        // Create the chat message
        const chatCard = await msgClass.create(chatData);
        Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user.id);
        return chatCard;
    }
    canExpendResources(resourcesUsed = 1) {
        if ('_canExpendResources' in this.system) {
            return this.system._canExpendResources(resourcesUsed);
        }
        else
            return true;
    }
    async consume(charges = 1) {
        if (!('_getUsageUpdates' in this.system))
            return;
        const usage = this.system._getUsageUpdates(charges);
        if (!usage)
            return;
        /**
         * A hook event that is fired before an item is consumed, giving the opportunity to programmatically adjust the usage and/or trigger custom logic
         * @category Hooks
         * @param item               The item that is used being consumed
         * @param charges            The charges used.
         * @param usage              The determined usage updates that resulted from consuming this item
         */
        Hooks.call('swadePreConsumeItem', this, charges, usage);
        const { actorUpdates, itemUpdates, resourceUpdates } = usage;
        let updatedItems = new Array();
        // Persist the updates
        if (!foundry.utils.isEmpty(itemUpdates)) {
            await this.update(itemUpdates);
        }
        if (!foundry.utils.isEmpty(actorUpdates)) {
            await this.actor?.update(actorUpdates);
        }
        if (resourceUpdates.length) {
            updatedItems = (await this.actor?.updateEmbeddedDocuments('Item', resourceUpdates));
        }
        /**
         * A hook event that is fired after an item is consumed but before cleanup happens
         * @category Hooks
         * @param item               The item that is used being consumed
         * @param charges            The charges used.
         * @param usage              The determined usage updates that resulted from consuming this item
         */
        Hooks.call('swadeConsumeItem', this, charges, usage);
        if ('messageOnUse' in this.system && this.system.messageOnUse) {
            await this.#createChargeUsageMessage(charges);
        }
        await this.#postConsumptionCleanup(updatedItems);
    }
    async reload() {
        const ammoManagement = game.settings.get('swade', 'ammoManagement');
        if (!('reload' in this.system) || !ammoManagement)
            return false;
        else
            return this.system.reload();
    }
    async removeAmmo() {
        if ('removeAmmo' in this.system)
            this.system.removeAmmo();
    }
    async grantEmbedded(target = this.parent) {
        if (!this.canGrantItems || !target)
            return;
        const grantChain = await this.getItemGrantChain();
        for (const link of grantChain) {
            if (link.grant.mutation) {
                link.item.updateSource(link.grant.mutation);
            }
        }
        //create the items
        const grantedItems = (await SwadeItem.createDocuments(grantChain.map((l) => l.item.toObject()), {
            parent: target,
            renderSheet: undefined,
            isItemGrant: true,
        })) ?? [];
        const created = grantedItems.map((i) => i.id);
        await this.setFlag('swade', 'hasGranted', created);
        Logger.debug([this.name, this.hasGranted]);
    }
    /**
     * Renders a dialog to confirm the swid change and if accepted updates the SWID on the item.
     * @returns The generated swid or undefined if no change was made.
     */
    async regenerateSWID() {
        const html = `
    <div class="warning-message">
      <p>${game.i18n.localize('SWADE.SWID.ChangeWarning2')}</p>
      <p>${game.i18n.localize('SWADE.SWID.ChangeWarning3')}</p>
    </div>
    `;
        const confirmation = await Dialog.confirm({
            title: game.i18n.localize('SWADE.SWID.Regenerate'),
            content: html,
            defaultYes: false,
            options: {
                classes: [...Dialog.defaultOptions.classes, 'swade-app'],
            },
        });
        if (!confirmation)
            return;
        const swid = slugify(this.name);
        await this.update({ 'system.swid': swid });
        return swid;
    }
    /** @returns a flattened array of item grants, going down the chain of grants */
    async getItemGrantChain(ignored = new Set()) {
        if (!this.canGrantItems || ignored.has(this.uuid))
            return [];
        ignored.add(this.uuid);
        const grantedItems = (await Promise.all(this.grantsItems.map((g) => fromUuid(g.uuid)))).filter((i) => !!i);
        const grants = [];
        for (const item of grantedItems) {
            const grant = this.grantsItems.find((g) => g.uuid === item.uuid);
            const choiceUpdate = await item.handleChoices(foundry.utils.mergeObject(item.toObject(), grant.mutation ?? {}));
            grants.push({
                item: new SwadeItem(foundry.utils.mergeObject(item.toObject(), choiceUpdate)),
                grant: this.grantsItems.find((g) => g.uuid === item.uuid),
            });
        }
        const children = await Promise.all(grants.flatMap((g) => g.item.getItemGrantChain(ignored)));
        return [...new Set([...grants, ...children.deepFlatten()])];
    }
    async removeGranted(target = this.parent) {
        if (this.hasGranted.length < 1)
            return;
        //grab the granted ids and put them into a set to filter possible duplicates
        const granted = new Set(
        //filter the list of granted items to only try and remove the ones that still exist on the parent
        this.hasGranted.filter((grant) => this.parent?.items.has(grant)));
        granted.delete(this.id); //delete self in case there are circular dependencies.
        await target?.deleteEmbeddedDocuments('Item', Array.from(granted));
        await this.unsetFlag('swade', 'hasGranted');
    }
    async #postConsumptionCleanup(updatedItems) {
        for (const update of updatedItems) {
            const item = this.parent?.items.get(update.id);
            if (item && item.system._shouldDelete) {
                await item.delete();
            }
        }
        if ('_shouldDelete' in this.system && this.system._shouldDelete) {
            await this.delete();
        }
    }
    _makeExplodable(expression) {
        // Make all dice of a roll able to explode
        const diceRegExp = /\d*d\d+[^kdrxc]/g;
        expression = expression + ' '; // Just because of my poor reg_exp foo
        const diceStrings = expression.match(diceRegExp) || [];
        const used = new Array();
        for (const match of diceStrings) {
            if (used.indexOf(match) === -1) {
                expression = expression.replace(new RegExp(match.slice(0, -1), 'g'), match.slice(0, -1) + 'x');
                used.push(match);
            }
        }
        return expression;
    }
    async #createChargeUsageMessage(charges) {
        const msgClass = getDocumentClass('ChatMessage');
        const createData = {
            speaker: msgClass.getSpeaker({ actor: this.actor }),
            content: game.i18n.format('SWADE.Consumable.ChargesUsed', {
                charges,
                name: this.name,
            }),
        };
        msgClass.applyRollMode(createData, game.settings.get('core', 'rollMode') ?? 'roll');
        return msgClass.create(createData);
    }
    async refreshFromCompendium() {
        if (!this.isOwned) {
            ui.notifications.error(game.i18n.localize('SWADE.NotOwnedError'));
            return null;
        }
        if (this.grantsItems.length > 0) {
            ui.notifications.error(game.i18n.localize('SWADE.GrantsItemsError'));
            return null;
        }
        const newItem = await this.findSimilarInCompendium();
        if (!newItem) {
            ui.notifications.warn(game.i18n.localize('SWADE.NoUpdatedItemFound'));
            return null;
        }
        const updates = {
            name: newItem.name,
            img: newItem.img,
            system: foundry.utils.deepClone(newItem.system),
        };
        foundry.utils.mergeObject(updates, {
            'system.favorite': 'favorite' in this.system ? this.system.favorite : null,
            'system.equipStatus': 'equipStatus' in this.system ? this.system.equipStatus : null,
            'system.quantity': 'quantity' in this.system ? this.system.quantity : null,
        });
        await this.update(updates);
        return this;
    }
    async findSimilarInCompendium() {
        const sourceId = this._stats.compendiumSource;
        let possibleItem = null;
        if (sourceId) {
            possibleItem = (await fromUuid(sourceId));
            if (possibleItem)
                return possibleItem;
        }
        const searchFields = [
            { name: 'system.source', weight: 15 },
            { name: 'name', weight: 10 },
            { name: 'img', weight: 6 },
            { name: 'system.category', weight: 1 },
            { name: 'system.swid', weight: 4 },
        ];
        let possibleItemWeight = 20;
        for (const pack of game.packs) {
            if (pack.metadata.system !== 'swade' || pack.metadata.type !== 'Item') {
                continue;
            }
            const documents = await pack.getDocuments({ type: this.type });
            for (const potentialItem of documents) {
                let currentWeight = 0;
                for (const search of searchFields) {
                    if (foundry.utils.getProperty(potentialItem, search.name) ==
                        foundry.utils.getProperty(this, search.name)) {
                        currentWeight += search.weight;
                    }
                }
                if (currentWeight > possibleItemWeight) {
                    possibleItem = potentialItem;
                    possibleItemWeight = currentWeight;
                }
            }
        }
        return possibleItem;
    }
    async handleChoices(data) {
        const choiceUpdate = {};
        if (data.system?.choiceSets?.length > 0) {
            for (const choiceSet of data.system.choiceSets) {
                if (choiceSet.choice !== null)
                    continue;
                Object.assign(choiceSet, await ChoiceDialog.asPromise({ choiceSet: choiceSet, parent: this }));
                if (choiceSet.choice === null)
                    continue;
                const mutationOption = choiceSet.choices[choiceSet.choice] ?? {};
                const update = mutationOption.mutation ?? {};
                if (mutationOption.addToName) {
                    update.name = data.name + ` (${mutationOption.name})`;
                }
                foundry.utils.mergeObject(choiceUpdate, update);
            }
            foundry.utils.mergeObject(choiceUpdate, {
                'system.choiceSets': data.system.choiceSets,
            });
        }
        return choiceUpdate;
    }
    async _preCreate(data, options, user) {
        const canCreate = await super._preCreate(data, options, user);
        if (canCreate === false)
            return false;
        const choiceUpdate = await this.handleChoices(data);
        if (Object.keys(choiceUpdate).length > 0) {
            this.updateSource(choiceUpdate);
        }
    }
    async _preDelete(options, user) {
        await super._preDelete(options, user);
        if (this.parent)
            await this.removeGranted();
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if (userId !== game.userId)
            return; //return early to prevent multi-application
        const grantOn = foundry.utils.getProperty(this, 'system.grantOn');
        if (this.canGrantItems &&
            this.parent &&
            grantOn &&
            foundry.utils.hasProperty(changed, 'system.equipStatus')) {
            const equipStatus = foundry.utils.getProperty(this, 'system.equipStatus');
            const shouldGrant = (grantOn === constants$1.GRANT_ON.CARRIED &&
                equipStatus >= constants$1.EQUIP_STATE.CARRIED) ||
                (grantOn === constants$1.GRANT_ON.READIED && this.isReadied);
            if (shouldGrant && this.hasGranted.length <= 0) {
                this.grantEmbedded();
            }
            else if (!shouldGrant) {
                this.removeGranted();
            }
        }
    }
    static async _onCreateOperation(items, operation, user) {
        if (!operation.isItemGrant && user.isSelf) {
            for (const item of items) {
                const grantOn = foundry.utils.getProperty(item, 'system.grantOn');
                const equipStatus = foundry.utils.getProperty(item, 'system.equipStatus');
                const nonPhysGranter = [
                    'edge',
                    'ability',
                    'ancestry',
                    'hindrance',
                ].includes(item.type);
                const shouldGrant = grantOn === constants$1.GRANT_ON.ADDED ||
                    nonPhysGranter ||
                    (grantOn === constants$1.GRANT_ON.CARRIED &&
                        equipStatus === constants$1.EQUIP_STATE.CARRIED) ||
                    (grantOn === constants$1.GRANT_ON.READIED && item.isReadied);
                if (item.canGrantItems && item.isEmbedded && shouldGrant) {
                    await item.grantEmbedded();
                }
            }
        }
        await super._onCreateOperation(items, operation, user);
    }
}

/**
 * A helper class for Item chat card logic
 */
class ItemChatCardHelper {
    static async onChatCardAction(event) {
        event.preventDefault();
        // Extract card data
        const button = event.target;
        button.disabled = true;
        const card = button.closest('.chat-card');
        const messageId = card.closest('.message').dataset.messageId;
        const message = game.messages?.get(messageId);
        const action = button.dataset.action;
        const additionalMods = new Array();
        //save the message ID if we're doing automated ammo management
        SWADE['itemCardMessageId'] = messageId;
        // Get the Actor from a synthetic Token
        // This is a variable type because we might switch it later if this turns out
        // to be a resistance-type trait roll.
        let actor = this.getChatCardActor(card);
        if (!actor)
            return null;
        // Get the Item
        const item = actor.items.get(card.dataset.itemId);
        if (!item) {
            Logger.error(`The requested item ${card.dataset.itemId} does not exist on Actor ${actor.name}`, { toast: true });
            return null;
        }
        if (actor.type === 'vehicle') {
            actor = (await actor.getDriver()) ?? actor;
        }
        const actionObj = foundry.utils.getProperty(item, 'system.actions.additional.' + action);
        // "Resist" types target the actor with a currently selected token, not the
        // one that spawned the chat card. So swap that actor in.
        if (actionObj?.type === constants$1.ACTION_TYPE.RESIST) {
            // swap the selected token's actor in as the target for the roll
            if (!canvas?.tokens || canvas.tokens.controlled.length !== 1) {
                ui.notifications.warn('SWADE.NoTokenSelectedForResistRoll', {
                    localize: true,
                });
                button.disabled = false;
                return null;
            }
            actor = canvas.tokens.controlled[0].actor ?? actor;
        }
        else if (!actor.isOwner &&
            !message.isAuthor &&
            actionObj?.type !== constants$1.ACTION_TYPE.MACRO) {
            // For non-resist types, don't allow a roll unless the message author is the user clicking the button or it's a macro action
            button.disabled = false;
            return null;
        }
        //if it's a power and the No Power Points rule is in effect
        if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
            const ppCost = card.querySelector('input.pp-adjust').value;
            let modifier = Math.ceil(ppCost / 2);
            modifier = Math.min(modifier * -1, modifier);
            if (action === 'formula' || actionObj?.type === 'trait') {
                additionalMods.push({
                    label: game.i18n.localize('TYPES.Item.power'),
                    value: modifier,
                });
            }
        }
        if (action === 'template') {
            const template = button.dataset.template;
            SwadeMeasuredTemplate.fromPreset(template, item);
            button.disabled = false;
            return null;
        }
        if (!actor)
            return null;
        const roll = await this.handleAction(item, actor, action, {
            additionalMods,
            event: event?.originalEvent,
        });
        //Only refresh the card if there is a roll and the item isn't a power
        if (roll && item.type !== 'power')
            await this.refreshItemCard(actor);
        // Re-enable the button
        button.disabled = false;
        return roll;
    }
    static getChatCardActor(card) {
        // Case 1 - a synthetic actor from a Token
        const tokenKey = card.dataset.tokenId;
        if (tokenKey) {
            const [sceneId, tokenId] = tokenKey.split('.');
            const scene = game.scenes?.get(sceneId);
            if (!scene)
                return null;
            const token = scene.tokens.get(tokenId);
            if (!token)
                return null;
            return token.actor;
        }
        // Case 2 - use Actor ID directory
        const actorId = card.dataset.actorId;
        return game.actors?.get(actorId) ?? null;
    }
    /**
     * Handles the basic skill/damage/reload AND the additional actions
     * @param item
     * @param actor
     * @param action
     */
    static async handleAction(item, actor, action, { additionalMods = [], event, }) {
        let roll = null;
        switch (action) {
            case 'damage':
                roll = await this.handleDamageAction(item, actor, additionalMods);
                break;
            case 'formula':
                roll = await this.handleFormulaAction(item, actor, additionalMods);
                break;
            case 'arcane-device':
                roll = await actor.makeArcaneDeviceSkillRoll(foundry.utils.getProperty(item, 'system.arcaneSkillDie'));
                break;
            case 'reload':
                await item.reload();
                await this.refreshItemCard(actor);
                break;
            case 'consume':
                await item.consume();
                await this.refreshItemCard(actor);
                break;
            default:
                roll = await this.handleAdditionalActions(item, actor, action, {
                    mods: additionalMods,
                    event,
                });
                // No need to call the hook here, as handleAdditionalActions already calls the hook
                // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
                break;
        }
        return roll;
    }
    static async handleFormulaAction(item, actor, additionalMods = []) {
        const traitName = foundry.utils.getProperty(item, 'system.actions.trait');
        if (!item.canExpendResources()) {
            // TODO: Refactor to be more accurate & more general (probably grab from the PP cost box?)
            Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
            return null;
        }
        additionalMods.push(...item.traitModifiers);
        const trait = getTrait(traitName, actor);
        const roll = await this.doTraitAction(trait, actor, {
            additionalMods,
            item: item,
        });
        if (roll && !item.isMeleeWeapon)
            await item.consume();
        this.callActionHook(actor, item, 'formula', roll);
        return roll;
    }
    static async handleDamageAction(item, actor, additionalMods = []) {
        const dmgMod = ItemChatCardHelper.getDamageMod(item);
        if (dmgMod)
            additionalMods.push(dmgMod);
        const roll = await item.rollDamage({ additionalMods });
        this.callActionHook(actor, item, 'damage', roll);
        return roll;
    }
    /**
     * Handles misc actions
     * @param item The item that this action is used on
     * @param actor The actor who has the item
     * @param key The action key
     * @returns the evaluated roll
     */
    static async handleAdditionalActions(item, actor, key, { mods = [], event }) {
        const action = foundry.utils.getProperty(item, `system.actions.additional.${key}`);
        // if there isn't actually any action then return early
        if (!action)
            return null;
        let roll = null;
        if (action.type === constants$1.ACTION_TYPE.TRAIT ||
            action.type === constants$1.ACTION_TYPE.RESIST) {
            //set the trait name and potentially override it via the action
            const traitName = action.override ||
                foundry.utils.getProperty(item, 'system.actions.trait');
            //find the trait and either get the skill item or the key of the attribute
            const trait = getTrait(traitName, actor);
            if (action.modifier) {
                mods.push({
                    label: action.name,
                    value: action.modifier,
                });
            }
            if (item.type === 'weapon') {
                if (!item.canExpendResources(action.resourcesUsed ?? 1)) {
                    Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
                    return null;
                }
            }
            mods.push(...item.traitModifiers);
            roll = await this.doTraitAction(trait, actor, {
                flavour: action.name,
                rof: action.dice,
                additionalMods: mods,
                item: item,
            });
            if (roll &&
                item.type === 'weapon' &&
                action.type === constants$1.ACTION_TYPE.TRAIT) {
                await item.consume(action.resourcesUsed ?? 1);
            }
        }
        else if (action.type === constants$1.ACTION_TYPE.DAMAGE) {
            //Do Damage stuff
            const dmgMod = ItemChatCardHelper.getDamageMod(item);
            if (dmgMod)
                mods.push(dmgMod);
            if (action.modifier) {
                mods.push({
                    label: action.name,
                    value: action.modifier,
                });
            }
            roll = await item.rollDamage({
                dmgOverride: action.override,
                isHeavyWeapon: action.isHeavyWeapon,
                flavour: action.name,
                additionalMods: mods,
                ap: action.ap,
            });
        }
        else if (action.type === constants$1.ACTION_TYPE.MACRO) {
            if (!action.uuid)
                return null;
            const macro = (await fromUuid(action.uuid));
            if (!macro) {
                Logger.warn(game.i18n.format('SWADE.CouldNotFindMacro', { uuid: action.uuid }), { toast: true });
            }
            let targetActor;
            let targetToken;
            if (action.macroActor === constants$1.MACRO_ACTOR.SELF) {
                targetActor = item.actor;
            }
            else if (action.macroActor === constants$1.MACRO_ACTOR.TARGET) {
                targetToken = game.user.targets.first();
                if (targetToken)
                    targetActor = targetToken.actor;
                if (!targetActor) {
                    ui.notifications.error('SWADE.CouldNotFindTarget', {
                        localize: true,
                    });
                    return null;
                }
            }
            await macro?.execute({
                actor: targetActor,
                item,
                token: targetToken,
                event,
            });
            return null;
        }
        this.refreshItemCard(actor);
        this.callActionHook(actor, item, key, roll);
        return roll;
    }
    static async doTraitAction(trait, actor, options) {
        const rollSkill = trait instanceof SwadeItem || !trait;
        const rollAttribute = typeof trait === 'string';
        if (rollSkill) {
            //get the id from the item or null if there was no trait
            const id = trait instanceof SwadeItem ? trait.id : null;
            return actor.rollSkill(id, options);
        }
        else if (rollAttribute) {
            return actor.rollAttribute(trait, options);
        }
        else {
            return null;
        }
    }
    static async refreshItemCard(actor, messageId) {
        //get ChatMessage and remove temporarily stored id from CONFIG object
        let message;
        if (messageId) {
            message = game.messages?.get(messageId);
        }
        else {
            message = game.messages?.get(SWADE['itemCardMessageId']);
            delete SWADE['itemCardMessageId'];
        }
        if (!message)
            return; //solves for the case where ammo management isn't turned on so there's no errors
        // Some chat cards have buttons that can be clicked by other actors in the game,
        // eg. resistance actions. When this happens, we cannot update the chat card, as
        // the acting Actor does not own the card. Skip over these cases; there is no
        // update necessary. Card updates are for things like ammo management and only make sense
        // when they're being done by the actor that owns the card.
        if (!message.isAuthor)
            return;
        const content = new DOMParser().parseFromString(message.content, 'text/html');
        const messageData = content.querySelector('.chat-card.item-card').dataset;
        const item = actor.items.get(messageData.itemId);
        function setTextIfPresent(selector, text) {
            const field = content.querySelector(selector);
            if (field)
                field.textContent = text;
        }
        if (item?.type === 'weapon') {
            const currentShots = item.system.currentShots;
            const maxShots = item.system.shots;
            //update message content
            setTextIfPresent('.ammo-counter .current-shots', currentShots);
            setTextIfPresent('.ammo-counter .max-shots', maxShots);
        }
        if (item?.type === 'power') {
            const arcane = item.system.arcane || 'general';
            const curPP = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.value`);
            const maxPP = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.max`);
            //update message content
            setTextIfPresent('.pp-counter .current-pp', curPP);
            setTextIfPresent('.pp-counter .max-pp', maxPP);
        }
        if (item?.type === 'consumable') {
            //update message content
            const charges = item.system.charges;
            setTextIfPresent('.pp-counter .current-pp', charges.value);
            setTextIfPresent('.pp-counter .max-pp', charges.max);
        }
        if (item?.isArcaneDevice) {
            const currentPP = foundry.utils.getProperty(item, 'system.powerPoints.value');
            const maxPP = foundry.utils.getProperty(item, 'system.powerPoints.max');
            //update message content
            setTextIfPresent('.pp-counter .current-pp', currentPP);
            setTextIfPresent('.pp-counter .max-pp', maxPP);
        }
        //update the message and render the chatlog/chat popout
        await message.update({ content: content.body.innerHTML });
        // ui.chat?.render(true);
        for (const appId in message.apps) {
            const app = message.apps[appId];
            if (app.rendered) {
                app.render(true);
            }
        }
    }
    /** @internal */
    static callActionHook(actor, item, action, roll) {
        if (!roll)
            return; // Do not trigger the hook if the roll was cancelled
        /** @category Hooks */
        Hooks.call('swadeAction', actor, item, action, roll, game.userId);
    }
    static getDamageMod(item) {
        const value = foundry.utils.getProperty(item, 'system.actions.dmgMod');
        if (!value)
            return null;
        // Ensure `item.name` exists to avoid errors
        const itemName = item?.name ?? game.i18n.localize('SWADE.Item');
        // Localize the label and include the item name
        let label = `${itemName} ${game.i18n.localize('SWADE.ItemDmgMod')}`;
        // If the value starts with "@", use an empty label
        if (value.startsWith('@')) {
            label = ''; // Empty label for a modifier
        }
        return { label, value };
    }
}

class SwadeSocketHandler {
    identifier = 'system.swade';
    /** registers all the socket listeners */
    registerSocketListeners() {
        game.socket?.on(this.identifier, (data) => {
            switch (data.type) {
                case 'deleteConvictionMessage':
                    this.#onDeleteConvictionMessage(data);
                    break;
                case 'newRound':
                    this.#onNewRound(data);
                    break;
                case 'removeStatusEffect':
                    this.#onRemoveStatusEffect(data);
                    break;
                case 'giveBennies':
                    this.#onGiveBenny(data);
                    break;
                case 'promptInitiative':
                    this.#onPromptInitiative(data);
                    break;
                default:
                    this.#onUnknownSocket(data.type);
                    break;
            }
        });
    }
    emit(data) {
        return game.socket?.emit(this.identifier, data);
    }
    deleteConvictionMessage(messageId) {
        this.emit({
            type: 'deleteConvictionMessage',
            messageId,
            userId: game.userId,
        });
    }
    #onDeleteConvictionMessage(data) {
        const message = game.messages?.get(data.messageId);
        //only delete the message if the user is a GM and the event emitter is one of the recipients
        if (game.user.isGM && message?.whisper.includes(data.userId)) {
            message?.delete();
        }
    }
    removeStatusEffect(uuid) {
        this.emit({
            type: 'removeStatusEffect',
            effectUUID: uuid,
        });
    }
    async #onRemoveStatusEffect(data) {
        const effect = (await fromUuid(data.effectUUID));
        if (isFirstOwner(effect.parent)) {
            effect.expire();
        }
    }
    newRound(combatId) {
        this.emit({
            type: 'newRound',
            combatId: combatId,
        });
    }
    //advance round
    async #onNewRound(data) {
        const combat = game.combats.get(data.combatId, { strict: true });
        if (isFirstGM())
            combat.nextRound();
    }
    giveBenny(users, actors) {
        this.emit({ type: 'giveBennies', users, actors });
    }
    async #onGiveBenny(data) {
        if (data.users.includes(game.userId)) {
            // If specific actors were specified, only give bennies to those actors instead of the user's default, and also don't give bennies to the GM
            if (data.actors) {
                for (const a of data.actors) {
                    const actor = fromUuidSync(a);
                    actor.getBenny();
                }
            }
            else
                await game.user?.getBenny();
        }
    }
    promptInitiative(combatId, userId, combatantId) {
        if (!game.user?.isGM)
            return;
        this.emit({
            type: 'promptInitiative',
            userId,
            combatId,
            combatantIds: [combatantId],
        });
    }
    #onPromptInitiative(data) {
        if (game.userId !== data.userId)
            return;
        const combat = game.combats.get(data.combatId, { strict: true });
        combat.rollInitiative(data.combatantIds);
    }
    #onUnknownSocket(type) {
        console.warn(`The socket event ${type} is not supported`);
    }
}

const fields$4 = foundry.data.fields;
function makePaceField(label, initial = null) {
    return new fields$4.NumberField({
        nullable: true,
        integer: true,
        min: 0,
        initial,
        label,
    });
}
function definePaceSchema() {
    return {
        base: new fields$4.StringField({
            required: true,
            initial: 'ground',
            choices: {
                ground: 'SWADE.Movement.Pace.Ground.Label',
                fly: 'SWADE.Movement.Pace.Fly.Label',
                swim: 'SWADE.Movement.Pace.Swim.Label',
                burrow: 'SWADE.Movement.Pace.Burrow.Label',
            },
            label: 'SWADE.Movement.Pace.Base.Label',
            hint: 'SWADE.Movement.Pace.Base.Hint',
        }),
        ground: makePaceField('SWADE.Movement.Pace.Ground.Label', 6),
        fly: makePaceField('SWADE.Movement.Pace.Fly.Label'),
        swim: makePaceField('SWADE.Movement.Pace.Swim.Label'),
        burrow: makePaceField('SWADE.Movement.Pace.Burrow.Label'),
        running: new fields$4.SchemaField({
            die: makeDiceField(6, 'SWADE.RunningDie'),
            mod: new fields$4.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.RunningMod',
            }),
        }),
    };
}
class PaceSchemaField extends foundry.data.fields.SchemaField {
    constructor() {
        super(definePaceSchema(), { label: 'SWADE.Pace' });
    }
    static get paceKeys() {
        return ['ground', 'fly', 'swim', 'burrow'];
    }
    _validateType(value, options) {
        let result = super._validateType(value, options);
        if (!value?.base)
            return result;
        if (value[value.base] === null) {
            if (!result || typeof result === 'boolean') {
                result = new foundry.data.validation.DataModelValidationFailure({});
            }
            result.fields[this.fieldPath] =
                new foundry.data.validation.DataModelValidationFailure({
                    invalidValue: value.base,
                    message: game.i18n.localize('SWADE.Validation.InvalidBasePace'),
                });
            throw result.asError();
        }
        return result;
    }
    _castChangeDelta(delta) {
        //@ts-expect-error Protected prototype property
        return fields$4.NumberField.prototype._castChangeDelta(delta);
    }
    // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
    _applyChangeAdd(value, delta, _model, _change) {
        for (const key of PaceSchemaField.paceKeys) {
            value[key] += delta;
        }
        return value;
    }
    // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
    _applyChangeMultiply(value, delta, _model, _change) {
        for (const key of PaceSchemaField.paceKeys) {
            if (value[key] !== null)
                value[key] *= delta;
        }
        return value;
    }
    // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
    _applyChangeDowngrade(value, delta, _model, _change) {
        for (const key of PaceSchemaField.paceKeys) {
            if (value[key] !== null)
                value[key] = Math.min(value[key], delta);
        }
        return value;
    }
    // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
    _applyChangeUpgrade(value, delta, _model, _change) {
        for (const key of PaceSchemaField.paceKeys) {
            if (value[key] !== null)
                value[key] = Math.max(value[key], delta);
        }
        return value;
    }
    // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
    _applyChangeOverride(value, delta, _model, _change) {
        for (const key of PaceSchemaField.paceKeys) {
            value[key] = delta;
        }
        return value;
    }
}

function renameActionProperties(source) {
    if (!source.actions)
        return;
    const actions = source.actions;
    if (!actions.trait && actions.skill) {
        actions.trait = actions.skill;
        delete actions.skill;
    }
    if (!actions.traitMod && actions.skillMod) {
        actions.traitMod = actions.skillMod;
        delete actions.skillMod;
    }
    for (const [id, action] of Object.entries(actions.additional ?? {})) {
        if (id.startsWith('-=') && action === null)
            continue; //skip null actions, happens on delete
        //remap skill to trait type actions
        action.type = action.type === 'skill' ? 'trait' : action.type;
        //set the new properties
        if (!action.resourcesUsed && action.shotsUsed) {
            action.resourcesUsed = action.shotsUsed;
            delete action.shotsUsed;
        }
        if (!action.dice && action.rof) {
            if (typeof action.rof === 'string') {
                if (Number.isNumeric(action.rof))
                    action.dice = Number(action.rof);
            }
            else if (typeof action.rof === 'number') {
                action.dice = action.rof;
            }
            delete action.rof;
        }
        if (!action.modifier && (action.skillMod || action.dmgMod)) {
            if (action.type === constants$1.ACTION_TYPE.TRAIT) {
                action.modifier = action.skillMod;
            }
            if (action.type === constants$1.ACTION_TYPE.DAMAGE) {
                action.modifier = action.dmgMod;
            }
            delete action.skillMod;
            delete action.dmgMod;
        }
        if (!action.override && (action.skillOverride || action.dmgOverride)) {
            if (action.type === constants$1.ACTION_TYPE.TRAIT) {
                action.override = action.skillOverride;
            }
            if (action.type === constants$1.ACTION_TYPE.DAMAGE) {
                action.override = action.dmgOverride;
            }
            delete action.skillOverride;
            delete action.dmgOverride;
        }
    }
}
function renameRaceToAncestry(source) {
    if (source.subtype === 'race')
        source.subtype = 'ancestry';
}
function convertRequirementsToList(source) {
    if (!source.requirements ||
        Array.isArray(source.requirements) ||
        Object.keys(source.requirements).every((k) => Number.isNumeric(k))) {
        return;
    }
    const oldValue = source.requirements['value'];
    const mapped = oldValue
        .split(',')
        .filter(Boolean)
        .map((r) => r.trim()) //trim excess whitespaces before we do the actual mapping
        .map((requirement) => {
        if (SWADE.ranks.includes(requirement)) {
            return {
                type: constants$1.REQUIREMENT_TYPE.RANK,
                value: SWADE.ranks.indexOf(requirement),
            };
        }
        if (requirement === game.i18n.localize('SWADE.WildCard') ||
            requirement === 'Wild Card') {
            return {
                type: constants$1.REQUIREMENT_TYPE.WILDCARD,
                value: true,
            };
        }
        return {
            type: constants$1.REQUIREMENT_TYPE.OTHER,
            label: requirement,
        };
    });
    //make sure at least 1 rank requirement is present in case none could be detected
    if (!mapped.find((r) => r.type === constants$1.REQUIREMENT_TYPE.RANK)) {
        mapped.unshift({
            type: constants$1.REQUIREMENT_TYPE.RANK,
            value: constants$1.RANK.NOVICE,
        });
    }
    source.requirements = mapped;
}

class AbilityData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...favorite(),
            ...category(),
            ...grants(),
            ...builder(),
            subtype: new fields.StringField({
                initial: constants$1.ABILITY_TYPE.SPECIAL,
                choices: Object.values(constants$1.ABILITY_TYPE),
                textSearch: true,
                label: 'SWADE.Subtype',
            }),
            grantsPowers: new fields.BooleanField({
                label: 'SWADE.GrantsPowers',
            }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        renameRaceToAncestry(source);
        return super.migrateData(source);
    }
    get canHaveCategory() {
        return true;
    }
    get canGrantItems() {
        return true;
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        //Stop Archetypes from being added to the actor as an item if the actor already has one
        const subType = this.subtype;
        if (subType === constants$1.ABILITY_TYPE.ARCHETYPE &&
            !!this.parent.actor?.archetype) {
            ui.notifications?.warn('SWADE.Validation.OnlyOneArchetype', {
                localize: true,
            });
            return false;
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/ability-embeds.hbs', ['item-embed', 'ability']);
    }
}

function actionProperties(data) {
    const options = {
        since: '3.1',
        until: '4.0',
    };
    const descriptor = { configurable: true };
    Object.defineProperties(data.actions, {
        skill: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'trait'), options);
                return data.actions.trait;
            },
            set: (skill) => {
                foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'trait'), options);
                data.actions.trait = skill;
            },
        },
        skillMod: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning(getReplacementMessage('skillMod', 'traitMod'), options);
                return data.actions.traitMod;
            },
            set: (skillMod) => {
                foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'traitMod'), options);
                data.actions.traitMod = skillMod;
            },
        },
    });
    for (const action of Object.values(data.actions.additional)) {
        Object.defineProperties(action, {
            rof: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning(getReplacementMessage('rof', 'dice'), options);
                    return action.dice;
                },
                set: (rof) => {
                    foundry.utils.logCompatibilityWarning(getReplacementMessage('rof', 'dice'), options);
                    action.dice = rof;
                },
            },
            shotsUsed: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning(getReplacementMessage('shotsUsed', 'resourcesUsed'), options);
                    return action.resourcesUsed;
                },
                set: (shots) => {
                    foundry.utils.logCompatibilityWarning(getReplacementMessage('shotsUsed', 'resourcesUsed'), options);
                    action.resourcesUsed = shots;
                },
            },
            skillOverride: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning('The skillOverride and dmgOverride properties have been combined into a new property named override', options);
                    return action.override;
                },
                set: (skillOverride) => {
                    foundry.utils.logCompatibilityWarning('The skillOverride and dmgOverride properties have been combined into a new property named override', options);
                    action.override = skillOverride;
                },
            },
            skillMod: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning('The skillMod and dmgMod properties have been combined into a new property named modifier', options);
                    return action.modifier;
                },
                set: (skillMod) => {
                    foundry.utils.logCompatibilityWarning('The skillMod and dmgMod properties have been combined into a new property named modifier', options);
                    action.modifier = skillMod;
                },
            },
            dmgOverride: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning('The skillOverride and dmgOverride properties have been combined into a new property named override', options);
                    return action.override;
                },
                set: (dmgOverride) => {
                    foundry.utils.logCompatibilityWarning('The skillOverride and dmgOverride properties have been combined into a new property named override', options);
                    action.override = dmgOverride;
                },
            },
            dmgMod: {
                ...descriptor,
                get: () => {
                    foundry.utils.logCompatibilityWarning('The skillMod and dmgMod properties have been combined into a new property named modifier', options);
                    return action.modifier;
                },
                set: (dmgMod) => {
                    foundry.utils.logCompatibilityWarning('The skillMod and dmgMod properties have been combined into a new property named modifier', options);
                    action.modifier = dmgMod;
                },
            },
        });
    }
}
function getReplacementMessage(old, newName) {
    return `The ${old} property has been depreciated in favor of the more aptly named ${newName} property`;
}

var _shims = /*#__PURE__*/Object.freeze({
    __proto__: null,
    actionProperties: actionProperties
});

class ActionData extends SwadeBaseItemData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...favorite(),
            ...category(),
            ...templates(),
            ...actions(),
            hidden: new foundry.data.fields.BooleanField({
                initial: false,
                label: 'SWADE.Actions.Hidden.Label',
                hint: 'SWADE.Actions.Hidden.Hint',
            }),
        };
    }
    static migrateData(source) {
        renameActionProperties(source);
        return super.migrateData(source);
    }
    get canHaveCategory() {
        return true;
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/action-embeds.hbs', ['item-embed', 'action']);
    }
    _applyShims() {
        actionProperties(this);
    }
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    #triggerActivityUpdate() {
        const items = this.parent.actor?.items.filter((i) => 'activities' in i.system && i.system.activities.has(this.swid)) ?? [];
        for (const item of items) {
            item._safePrepareData();
            item.sheet.render();
        }
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if (foundry.utils.hasProperty(changed, 'system.actions'))
            this.#triggerActivityUpdate();
    }
    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        this.#triggerActivityUpdate();
    }
    _onDelete(options, userId) {
        super._onDelete(options, userId);
        this.#triggerActivityUpdate();
    }
}

class AncestryData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...grants(),
            threshold: new foundry.data.fields.NumberField({
                integer: true,
                initial: 2,
            }),
        };
    }
    get canGrantItems() {
        return true;
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        //Stop Ancestries/Archetypes from being added to the actor as an item if the actor already has one
        if (this.parent.actor?.ancestry) {
            ui.notifications.warn('SWADE.Validation.OnlyOneAncestry', {
                localize: true,
            });
            return false;
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/ancestry-embeds.hbs', ['item-embed', 'ancestry']);
    }
}

function ensureWeightsAreNumeric(source) {
    if (!Object.hasOwn(source, 'weight'))
        return; // return early in case of update
    if (source.weight === null || typeof source.weight === 'number')
        return;
    if (typeof source.weight === 'string') {
        // remove all symbols that aren't numeric or a decimal point
        source.weight = Number(source.weight.replaceAll(/[^0-9.]/g, ''));
    }
}
function ensurePricesAreNumeric(source) {
    if (!Object.hasOwn(source, 'price'))
        return; // return early in case of update
    if (source.price === null || typeof source.price === 'number')
        return;
    if (typeof source.price === 'string') {
        // remove all symbols that aren't numeric or a decimal point
        source.price = Number(source.price.replaceAll(/[^0-9.]/g, ''));
    }
}
function ensureAPisNumeric(source) {
    if (!Object.hasOwn(source, 'ap'))
        return; // return early in case of update
    if (source.ap === null || typeof source.ap === 'number')
        return;
    if (Number.isNumeric(source.ap)) {
        source.ap = Number(source.ap);
        return;
    }
    source.ap = 0; // set the ap to 0 as a default
}
function ensureRoFisNumeric(source) {
    if (!Object.hasOwn(source, 'rof'))
        return; // return early in case of update
    if (source.rof === null || typeof source.rof === 'number')
        return;
    if (Number.isNumeric(source.rof)) {
        source.rof = Number(source.rof);
        return;
    }
    source.rof = 1; // set the rof to 1 as a default
}
function ensureShotsAreNumeric(source) {
    if (Object.hasOwn(source, 'shots') &&
        source.shots !== null &&
        typeof source.shots !== 'number') {
        source.shots = null;
    }
    if (Object.hasOwn(source, 'currentShots') &&
        source.currentShots !== null &&
        typeof source.currentShots !== 'number') {
        source.currentShots = null;
    }
}
function ensurePowerPointsAreNumeric$1(source) {
    if (!Object.hasOwn(source, 'pp'))
        return; // return early in case of update
    if (source.pp === null || typeof source.pp === 'number')
        return;
    if (Number.isNumeric(source.pp)) {
        source.pp = Number(source.pp);
        return;
    }
    source.pp = 0; // set the pp to 0 as a default
}

class ArmorData extends SwadePhysicalItemData {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...equippable(),
            ...arcaneDevice(),
            ...actions(),
            ...activities(),
            ...favorite(),
            ...category(),
            ...grantEmbedded(),
            minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
            armor: new fields.NumberField({ initial: 0, label: 'SWADE.Armor' }),
            toughness: new fields.NumberField({ initial: 0, label: 'SWADE.Tough' }),
            isNaturalArmor: new fields.BooleanField({ label: 'SWADE.NaturalArmor' }),
            isHeavyArmor: new fields.BooleanField({ label: 'SWADE.HeavyArmor' }),
            locations: new fields.SchemaField({
                head: new fields.BooleanField({ label: 'SWADE.Head' }),
                torso: new fields.BooleanField({ initial: true, label: 'SWADE.Torso' }),
                arms: new fields.BooleanField({ label: 'SWADE.Arms' }),
                legs: new fields.BooleanField({ label: 'SWADE.Legs' }),
            }),
            energy: new fields.SchemaField({
                value: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'SWADE.Energy.Value',
                }),
                max: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'SWADE.Energy.Max',
                }),
                enabled: new fields.BooleanField({ label: 'SWADE.Energy.Enable' }),
            }, { label: 'SWADE.Energy.Label' }),
            mods: new fields.SchemaField({
                value: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'SWADE.Mods',
                }),
                max: new fields.NumberField({
                    integer: true,
                    initial: 0,
                    label: 'SWADE.MaxMods',
                }),
            }),
        };
    }
    static migrateData(source) {
        ensurePricesAreNumeric(source);
        ensureWeightsAreNumeric(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    get canBeArcaneDevice() {
        return true;
    }
    get isReadied() {
        return Number(this.equipStatus) > constants$1.EQUIP_STATE.CARRIED;
    }
    async getChatChips(enrichOptions) {
        const chips = new Array();
        for (const [location, covered] of Object.entries(this.locations)) {
            if (!covered)
                continue;
            chips.push({
                text: game.i18n.localize(`SWADE.${location.charAt(0).toUpperCase() + location.slice(1)}`),
            });
        }
        if (this.isReadied) {
            chips.push({
                icon: '<i class="fas fa-tshirt"></i>',
                title: game.i18n.localize('SWADE.Equipped'),
            });
        }
        else {
            chips.push({
                icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
                title: game.i18n.localize('SWADE.Unequipped'),
            });
        }
        chips.push({
            icon: '<i class="fas fa-shield-alt"></i>',
            title: game.i18n.localize('SWADE.Armor'),
            text: this.armor,
        }, {
            icon: '<i class="fas fa-dumbbell"></i>',
            text: this.minStr,
        }, {
            icon: '<i class="fas fa-sticky-note"></i>',
            text: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.notes ?? '', enrichOptions),
            title: game.i18n.localize('SWADE.Notes'),
        });
        return chips;
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.parent?.actor?.type === 'npc') {
            this.updateSource({ equipStatus: constants$1.EQUIP_STATE.EQUIPPED });
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/armor-embeds.hbs', ['item-embed', 'armor']);
    }
}

class ConsumableData extends SwadePhysicalItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...equippable(),
            ...favorite(),
            ...category(),
            ...actions(),
            ...activities(),
            ...grantEmbedded(),
            charges: new fields.SchemaField({
                value: new fields.NumberField({ initial: 1, label: 'SWADE.Charges' }),
                max: new fields.NumberField({ initial: 1, label: 'SWADE.ChargesMax' }),
            }),
            messageOnUse: new fields.BooleanField({
                initial: true,
                label: 'SWADE.MessageOnUse.Label',
            }),
            destroyOnEmpty: new fields.BooleanField({
                label: 'SWADE.DestroyOnEmpty',
            }),
            subtype: new fields.StringField({
                initial: constants$1.CONSUMABLE_TYPE.REGULAR,
                choices: Object.values(constants$1.CONSUMABLE_TYPE),
                textSearch: true,
                label: 'SWADE.Subtype',
            }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        ensurePricesAreNumeric(source);
        ensureWeightsAreNumeric(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    /** @inheritdoc */
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    /** Used by SwadeItem.#postConsumptionCleanup */
    get _shouldDelete() {
        return this.destroyOnEmpty && this.quantity === 0 && this.parent.isOwned;
    }
    /** Used by SwadeItem.setEquipState */
    _rejectEquipState(state) {
        return state > constants$1.EQUIP_STATE.CARRIED;
    }
    /** Used by SwadeItem.consume */
    _getUsageUpdates(chargesToUse) {
        const actorUpdates = {};
        const itemUpdates = {};
        const resourceUpdates = new Array();
        //gather variables
        const currentCharges = Number(this.charges.value);
        const maxCharges = Number(this.charges.max);
        const quantity = Number(this.quantity);
        const maxChargesOnStack = (quantity - 1) * maxCharges + currentCharges;
        //abort early if too much is being used
        if (chargesToUse > maxChargesOnStack) {
            ui.notifications.warn('SWADE.Consumable.NotEnoughCharges', {
                localize: true,
            });
            return false;
        }
        const totalRemainingCharges = maxChargesOnStack - chargesToUse;
        const newQuantity = Math.ceil(totalRemainingCharges / maxCharges);
        let newCharges = totalRemainingCharges % maxCharges;
        if (newCharges === 0 && newQuantity < quantity && newQuantity !== 0) {
            newCharges = maxCharges;
        }
        //write updates
        itemUpdates['system.quantity'] = Math.max(0, newQuantity);
        itemUpdates['system.charges.value'] = newCharges;
        return { actorUpdates, itemUpdates, resourceUpdates };
    }
    async _preUpdate(changed, options, user) {
        await super._preUpdate(changed, options, user);
        if (foundry.utils.hasProperty(changed, 'system.quantity') &&
            this.subtype !== constants$1.CONSUMABLE_TYPE.REGULAR &&
            this.charges.value !== 0 &&
            this.charges.value !== this.charges.max) {
            if ((changed.system?.quantity ?? 0) > 1 &&
                this.charges.value < this.charges.max) {
                delete changed.system.quantity;
                Logger.warn('Partially filled magazines can only have a quantity of 1', { toast: true });
            }
        }
        if (foundry.utils.hasProperty(changed, 'system.charges.max') &&
            this.subtype === constants$1.CONSUMABLE_TYPE.BATTERY) {
            foundry.utils.setProperty(changed, 'system.charges.max', 100);
        }
        if (foundry.utils.getProperty(changed, 'system.subtype') ===
            constants$1.CONSUMABLE_TYPE.BATTERY) {
            foundry.utils.setProperty(changed, 'system.charges.max', 100);
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/consumable-embeds.hbs', ['item-embed', 'consumable']);
    }
}

class RequirementsField extends foundry.abstract
    .DataModel {
    static get sortOrder() {
        return [
            constants$1.REQUIREMENT_TYPE.WILDCARD,
            constants$1.REQUIREMENT_TYPE.RANK,
            constants$1.REQUIREMENT_TYPE.ATTRIBUTE,
            constants$1.REQUIREMENT_TYPE.SKILL,
            constants$1.REQUIREMENT_TYPE.EDGE,
            constants$1.REQUIREMENT_TYPE.HINDRANCE,
            constants$1.REQUIREMENT_TYPE.ANCESTRY,
            constants$1.REQUIREMENT_TYPE.POWER,
            constants$1.REQUIREMENT_TYPE.OTHER,
        ];
    }
    /** Returns a sorting function to sort requirements */
    static sortFunction(order = this.sortOrder) {
        return (a, b) => order.indexOf(a.type) - order.indexOf(b.type);
    }
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            /**The type of requirement */
            type: new fields.StringField({
                choices: Object.values(constants$1.REQUIREMENT_TYPE),
                initial: constants$1.REQUIREMENT_TYPE.RANK,
                required: true,
                label: 'Type',
            }),
            /** The actual requirement value, such as an attribute, skill or edge swid */
            selector: new fields.StringField({
                required: true,
                validate: validateSwid,
                label: 'SWADE.Requirements.Editor.SWID',
            }),
            /** For attribute and skill requirements this is used  to denote the die type, for Ranks it is used to denote the rank*/
            value: new AddStatsValueField({
                initial: '',
                required: true,
                label: 'SWADE.Requirements.Editor.Value',
            }),
            /** A simple label, for display */
            label: new fields.StringField({ required: false }),
            combinator: new fields.StringField({
                initial: 'and',
                choices: ['and', 'or'],
                label: 'SWADE.Requirements.Combinator',
            }),
        };
    }
    toString() {
        switch (this.type) {
            case constants$1.REQUIREMENT_TYPE.WILDCARD:
                return this.value
                    ? game.i18n.localize('SWADE.WildCard')
                    : game.i18n.localize('SWADE.Extra');
            case constants$1.REQUIREMENT_TYPE.RANK:
                return SWADE.ranks[this.value];
            case constants$1.REQUIREMENT_TYPE.ATTRIBUTE:
                return `${SWADE.attributes[this.selector]?.long} d${this.value}+`;
            case constants$1.REQUIREMENT_TYPE.SKILL:
                return `${this.label} d${this.value}+`;
            case constants$1.REQUIREMENT_TYPE.POWER:
                return `<i>${this.label}</i>`;
            case constants$1.REQUIREMENT_TYPE.EDGE:
            case constants$1.REQUIREMENT_TYPE.HINDRANCE:
            case constants$1.REQUIREMENT_TYPE.ANCESTRY:
            case constants$1.REQUIREMENT_TYPE.OTHER:
            default:
                return this.label ?? '';
        }
    }
}

class EdgeData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...favorite(),
            ...category(),
            ...grants(),
            isArcaneBackground: new fields.BooleanField({ label: 'SWADE.ArcBack' }),
            requirements: new fields.ArrayField(new fields.EmbeddedDataField(RequirementsField), {
                label: 'SWADE.Req',
                initial: [
                    {
                        type: constants$1.REQUIREMENT_TYPE.RANK,
                        value: SWADE.ranks[constants$1.RANK.NOVICE],
                        combinator: 'and',
                        selector: '',
                    },
                ],
                validate: (value, _options) => {
                    const failures = new foundry.data.validation.DataModelValidationFailure({
                        unresolved: true,
                    });
                    const ranksInvalid = this.#checkRankRequirements(value);
                    if (ranksInvalid) {
                        failures.elements.push({
                            id: 'rank',
                            name: 'Rank',
                            failure: ranksInvalid,
                        });
                    }
                    const wildCardsInvalid = this.#checkWildCardRequirements(value);
                    if (wildCardsInvalid) {
                        failures.elements.push({
                            id: 'wildCard',
                            name: 'Wild Card',
                            failure: wildCardsInvalid,
                        });
                    }
                    if (failures.elements.length)
                        return failures;
                },
            }),
        };
    }
    get requirementString() {
        return (this.requirements ?? {}).reduce((accumulator, current, index, list) => {
            accumulator += current.toString();
            if (index !== list.length - 1) {
                switch (current.combinator) {
                    case 'or':
                        accumulator +=
                            ' ' + game.i18n.localize('SWADE.Requirements.Or') + ' ';
                        break;
                    case 'and':
                        accumulator += ', ';
                        break;
                }
            }
            return accumulator;
        }, '');
    }
    static migrateData(source) {
        convertRequirementsToList(source);
        return super.migrateData(source);
    }
    static #checkRankRequirements(value) {
        const rankRequirements = count(value, (v) => v.type === constants$1.REQUIREMENT_TYPE.RANK);
        if (rankRequirements > 1) {
            return new foundry.data.validation.DataModelValidationFailure({
                message: 'Cannot have more than one rank requirement',
            });
        }
    }
    static #checkWildCardRequirements(value) {
        const wildcard = count(value, (v) => v.type === constants$1.REQUIREMENT_TYPE.WILDCARD);
        if (wildcard > 1) {
            return new foundry.data.validation.DataModelValidationFailure({
                message: 'Cannot have more than one Wild Card/Extra requirement',
            });
        }
    }
    get canHaveCategory() {
        return true;
    }
    get canGrantItems() {
        return true;
    }
    async getChatChips() {
        const chips = new Array();
        chips.push({
            text: this.requirementString,
        });
        if (this.isArcaneBackground) {
            chips.push({ text: game.i18n.localize('SWADE.Arcane') });
        }
        return chips;
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/edge-embeds.hbs', ['item-embed', 'edge']);
    }
}

class GearData extends SwadePhysicalItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...equippable(),
            ...arcaneDevice(),
            ...vehicular(),
            ...actions(),
            ...activities(),
            ...favorite(),
            ...category(),
            ...grantEmbedded(),
            isAmmo: new fields.BooleanField({ label: 'SWADE.ItemIsAmmo' }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        ensurePricesAreNumeric(source);
        ensureWeightsAreNumeric(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    get canBeArcaneDevice() {
        return true;
    }
    get isReadied() {
        return Number(this.equipStatus) > constants$1.EQUIP_STATE.CARRIED;
    }
    /** Used by SwadeItem.consume */
    _getUsageUpdates(chargesToUse) {
        const actorUpdates = {};
        const itemUpdates = {};
        const resourceUpdates = new Array();
        itemUpdates['system.quantity'] = Number(this.quantity) - chargesToUse;
        return { actorUpdates, itemUpdates, resourceUpdates };
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.parent?.actor?.type === 'npc') {
            this.updateSource({ equipStatus: constants$1.EQUIP_STATE.EQUIPPED });
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/gear-embeds.hbs', ['item-embed', 'gear']);
    }
}

class HindranceData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...favorite(),
            ...grants(),
            severity: new fields.StringField({
                choices: Object.values(constants$1.HINDRANCE_SEVERITY),
                initial: constants$1.HINDRANCE_SEVERITY.EITHER,
                blank: false,
                label: 'SWADE.HindranceSeverity.Label',
            }),
            major: new fields.BooleanField({ label: 'SWADE.MajHind' }),
        };
    }
    get isMajor() {
        return (this.severity === constants$1.HINDRANCE_SEVERITY.MAJOR ||
            (this.severity === constants$1.HINDRANCE_SEVERITY.EITHER &&
                this.major === true));
    }
    get canGrantItems() {
        return true;
    }
    async getChatChips() {
        return [
            {
                text: this.isMajor
                    ? game.i18n.localize('SWADE.Major')
                    : game.i18n.localize('SWADE.Minor'),
            },
        ];
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/hindrance-embeds.hbs', ['item-embed', 'hindrance']);
    }
}

class ForeignDocumentUUIDField extends foundry.data.fields.DocumentUUIDField {
    static get _defaults() {
        return foundry.utils.mergeObject(super._defaults, {
            nullable: true,
            readonly: false,
            idOnly: false,
        });
    }
    initialize(value, _model, _options = {}) {
        if (this.idOnly)
            return () => value;
        const typeClass = getDocumentClass(this.type);
        return () => {
            try {
                const doc = fromUuidSync(value);
                if (doc instanceof typeClass)
                    return doc;
                return value;
            }
            catch (error) {
                console.error(error);
                return value ?? null;
            }
        };
    }
    toObject(value) {
        return value?.uuid ?? value;
    }
    _toInput(config) {
        if (!config.options) {
            // Prepare array of visible options
            const collection = game.scenes.viewed?.tokens;
            const options = (collection ?? []).reduce((arr, doc) => {
                if (!doc.visible || !doc.actor)
                    return arr;
                arr.push({ value: doc.actor.uuid, label: doc.name });
                return arr;
            }, []);
            Object.assign(config, { options });
        }
        // Allow blank
        if (!this.required || this.nullable)
            config.blank ??= '';
        // Create select input
        return foundry.applications.fields.createSelectInput(config);
    }
}

class FormulaField extends foundry.data.fields.StringField {
    _cast(value) {
        if (typeof value !== 'string') {
            value = value?.toString() ?? '';
        }
        else {
            if (game.settings.get('core', 'language') !== 'en') {
                value = value
                    .replace(new RegExp('^' + game.i18n.localize('SWADE.AttrSma')), '@sma')
                    .replace(new RegExp('^' + game.i18n.localize('SWADE.AttrSmaShortPowerRange')), '@sma');
            }
            value = value
                .replace(/^-/, '') // Core, HYPHEN-MINUS, only remove at beginning as minus may be used in formulas
                .replace(/–/, '') // SFC, EN DASH not minus, so safe to remove
                .replace(/—/, '') // EM DASH not minus, so safe to remove
                .replace(/―/, '') // FIGURE DASH not minus, so safe to remove
                .replace(/―/, '') // HORIZONTAL BAR not minus, so safe to remove
                .replace(/( )(x)([ ]*[0-9])*/g, '$1*$3') // core rules power ranges, turns ' x 5' and ' x5' into '*5' (matches <space><x><optional space><number>)
                .replace(/×/g, '*') // U+00D7 Multiplication Sign, used e.g. in Fantasy Companion power ranges
                .replace(/^Smarts/, '@sma')
                .replace(/^Sm/, '@sma');
            return value;
        }
    }
    _validateType(value, _options = {}) {
        if (!value)
            console.log(this);
        if (this.blank && Number(value) === 0)
            return true;
        return Roll.validate(value);
    }
}

class FormulaDerivedValueField extends FormulaField {
    initialize(value, model, _options) {
        value = this._cast(value);
        if (!model.parent?.actor)
            return 0;
        const rollData = model.parent?.actor?.getRollData();
        const roll = new Roll(value, rollData);
        const simplifiedTerms = new Array();
        for (const term of roll.terms) {
            const simplified = this.#simplifyTerm(term);
            if (Array.isArray(simplified))
                simplifiedTerms.push(...simplified);
            else
                simplifiedTerms.push(simplified);
        }
        roll.terms = simplifiedTerms;
        const evaluated = new Roll(roll.resetFormula()).evaluateSync();
        return evaluated.total;
    }
    #simplifyTerm(term) {
        if (term instanceof foundry.dice.terms.DiceTerm) {
            return new foundry.dice.terms.NumericTerm({
                number: (term.number ?? 1) * (term.faces ?? 0),
            });
        }
        if (term instanceof foundry.dice.terms.ParentheticalTerm) {
            term.roll.terms = term.roll.terms.map(this.#simplifyTerm.bind(this));
            term.roll = new Roll(term.roll.resetFormula());
            term.term = term.roll.formula;
            return term;
        }
        return term;
    }
}

class LocalDocumentField extends foundry.data.fields.ForeignDocumentField {
    _cast(value) {
        if (typeof value === 'string')
            return value;
        if (value instanceof this.model)
            return value._id;
        throw new Error(`The value provided to a ${this.constructor.name} must be a ${this.model.name} instance.`);
    }
    initialize(value, model, _options) {
        if (this.idOnly)
            return value;
        if (model?.pack &&
            !foundry.utils.isSubclass(this.model, foundry.documents.BaseFolder))
            return null;
        if (!value)
            return null;
        return () => model.parent?.collections[this.model.collectionName].get(value);
    }
    _toInput(config = {}) {
        // Prepare array of visible options
        const collection = config.actor?.collections[this.model.collectionName] ?? [];
        const value = typeof config.value === 'string' ? config.value : config.value?.id;
        const current = collection.get(value);
        let hasCurrent = false;
        const options = collection.reduce((arr, doc) => {
            if (this.options.types?.length && !this.options.types.includes(doc.type))
                return arr;
            if (!doc.visible)
                return arr;
            if (doc === current)
                hasCurrent = true;
            arr.push({ value: doc.id, label: doc.name });
            return arr;
        }, []);
        if (current && !hasCurrent)
            options.unshift({ value: config.value, label: current.name });
        Object.assign(config, { options });
        // Allow blank
        if (!this.required || this.nullable)
            config.blank = '';
        // Create select input
        return foundry.applications.fields.createSelectInput(config);
    }
}

/**
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 * @param model The class of DataField which should be embedded in this field.
 * @param options Options which configure the behavior of the field.
 */
class MappingField extends foundry.data.fields.ObjectField {
    constructor(model, options = {}) {
        if (!(model instanceof foundry.data.fields.DataField)) {
            throw new Error('MappingField must have a DataField as its contained element');
        }
        super(options);
        this.model = model;
    }
    static get _defaults() {
        return foundry.utils.mergeObject(super._defaults, {
            initialKeys: null,
            initialValue: null,
            initialKeysOnly: false,
        });
    }
    _cleanType(value, options) {
        Object.entries(value).forEach(([k, v]) => (value[k] = this.model.clean(v, options)));
        return value;
    }
    getInitialValue(data) {
        let keys = this.initialKeys;
        const initial = super.getInitialValue(data);
        if (!keys || !foundry.utils.isEmpty(initial))
            return initial;
        if (!(keys instanceof Array))
            keys = Object.keys(keys);
        for (const key of keys)
            initial[key] = this._getInitialValueForKey(key);
        return initial;
    }
    /**
     * Get the initial value for the provided key.
     * @param key Key within the object being built.
     * @param object  Any existing mapping data.
     * @returns Initial value based on provided field type.
     */
    _getInitialValueForKey(key, object) {
        const initial = this.model.getInitialValue({});
        return this.initialValue?.(key, initial, object) ?? initial;
    }
    _validateType(value, options = {}) {
        if (foundry.utils.getType(value) !== 'Object')
            throw new Error('must be an Object');
        const errors = this._validateValues(value, options);
        if (!foundry.utils.isEmpty(errors)) {
            const depth = this.fieldPath.split('.').length + 1;
            const indent = '\n' + ' '.repeat(depth * 2);
            let msg = '';
            for (const [key, err] of Object.entries(errors)) {
                const name = !!value[key].name || !!value[key].label
                    ? `${key} (${value[key].name || value[key].label})`
                    : key;
                const errString = err.toString().replaceAll('\n', indent);
                msg += indent + name + ': ' + errString;
            }
            throw new foundry.data.validation.DataModelValidationError(msg);
        }
    }
    /**
     * Validate each value of the object.
     * @param value The object to validate.
     * @param options Validation options.
     * @returns An object of value-specific errors by key.
     */
    _validateValues(value, options) {
        const errors = {};
        for (const [k, v] of Object.entries(value)) {
            const error = this.model.validate(v, options);
            if (error)
                errors[k] = error;
        }
        return errors;
    }
    initialize(value, model, options = {}) {
        if (!value)
            return value;
        const obj = {};
        const initialKeys = this.initialKeys instanceof Array
            ? this.initialKeys
            : Object.keys(this.initialKeys ?? {});
        const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
        for (const key of keys) {
            const data = value[key] ?? this._getInitialValueForKey(key, value);
            obj[key] = this.model.initialize(data, model, options);
        }
        return obj;
    }
    _getField(path) {
        if (path.length === 0)
            return this;
        else if (path.length === 1)
            return this.model;
        path.shift();
        return this.model._getField(path);
    }
}

function makeBaseMemberSchema() {
    return {
        uuid: new ForeignDocumentUUIDField({
            type: 'Actor',
            required: true,
            nullable: false,
            validate: (value, _options) => {
                if (value.startsWith('Compendium')) {
                    return new foundry.data.validation.DataModelValidationFailure({
                        unresolved: true,
                        invalidValue: value,
                        message: 'Cannot contain an actor from a Compendium!',
                    });
                }
            },
        }),
    };
}
class MemberField extends foundry.data.fields.SchemaField {
    constructor(schema, options) {
        super({ ...schema, ...makeBaseMemberSchema() }, options);
    }
}

var index$8 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AddStatsValueField: AddStatsValueField,
    ForeignDocumentUUIDField: ForeignDocumentUUIDField,
    FormulaDerivedValueField: FormulaDerivedValueField,
    FormulaField: FormulaField,
    LocalDocumentField: LocalDocumentField,
    MappingField: MappingField,
    MemberField: MemberField,
    PaceSchemaField: PaceSchemaField,
    RequirementsField: RequirementsField
});

class PowerData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...actions(),
            ...activities(),
            ...favorite(),
            ...templates(),
            rank: new fields.StringField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Rank',
            }),
            pp: new fields.NumberField({ initial: 0, label: 'SWADE.PP' }),
            damage: new FormulaField({
                initial: '',
                blank: true,
                label: 'SWADE.Dmg',
            }),
            range: new fields.StringField({
                initial: '@sma',
                label: 'SWADE.Range._name',
            }),
            duration: new fields.StringField({ initial: '', label: 'SWADE.Dur' }),
            trapping: new fields.StringField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Trap',
            }),
            arcane: new fields.StringField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Arcane',
            }),
            ap: new fields.NumberField({ initial: 0, label: 'SWADE.Ap' }),
            innate: new fields.BooleanField({ label: 'SWADE.InnatePower' }),
            modifiers: new fields.ArrayField(new fields.ObjectField(), {
                label: 'SWADE.Modifiers',
            }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        ensurePowerPointsAreNumeric$1(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    prepareFormulaFields() {
        const field = new FormulaDerivedValueField();
        const cleaned = field.clean(this.range);
        if (Roll.validate(cleaned)) {
            this.range = String(field.initialize(cleaned, this));
        }
    }
    /** @inheritdoc */
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    // Called by SwadeItem.powerPoints
    get _powerPoints() {
        const actor = this.parent.actor;
        const arcane = this.arcane || 'general';
        const value = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.value`);
        const max = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.max`);
        return { value, max };
    }
    get ppModifiers() {
        let cost = this.pp;
        const modifiers = [];
        for (const e of this.parent.effects.filter((e) => e.type === 'modifier' && e.active)) {
            cost += e.system.cost ?? 0;
            modifiers.push(e.name);
        }
        const formatter = game.i18n.getListFormatter({ type: 'unit' });
        return { cost, modifierList: formatter.format(modifiers) };
    }
    async getChatChips() {
        return [
            { text: this.rank },
            { text: this.arcane },
            { text: this.pp + game.i18n.localize('SWADE.PPAbbreviation') },
            {
                icon: '<i class="fas fa-ruler"></i>',
                text: this.range,
                title: game.i18n.localize('SWADE.Range._name'),
            },
            {
                icon: '<i class="fas fa-shield-alt"></i>',
                text: this.ap,
                title: game.i18n.localize('SWADE.Ap'),
            },
            {
                icon: '<i class="fas fa-hourglass-half"></i>',
                text: this.duration,
                title: game.i18n.localize('SWADE.Dur'),
            },
            { text: this.trapping },
        ];
    }
    _canExpendResources(resourcesUsed = 1) {
        if (!this.parent.actor)
            return false;
        if (game.settings.get('swade', 'noPowerPoints'))
            return true;
        const arcane = this.arcane || 'general';
        const ab = this.parent.actor.system.powerPoints[arcane];
        return ab.value >= resourcesUsed;
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/power-embeds.hbs', ['item-embed', 'power']);
    }
}

class ShieldData extends SwadePhysicalItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...equippable(),
            ...arcaneDevice(),
            ...actions(),
            ...activities(),
            ...favorite(),
            ...category(),
            ...grantEmbedded(),
            minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
            parry: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.Parry',
            }),
            cover: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.Cover._name',
            }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        ensurePricesAreNumeric(source);
        ensureWeightsAreNumeric(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    /** @inheritdoc */
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    get canBeArcaneDevice() {
        return true;
    }
    get isReadied() {
        return Number(this.equipStatus) > constants$1.EQUIP_STATE.CARRIED;
    }
    async getChatChips(enrichOptions) {
        const chips = new Array();
        if (this.isReadied) {
            chips.push({
                icon: '<i class="fas fa-tshirt"></i>',
                title: game.i18n.localize('SWADE.Equipped'),
            });
        }
        else {
            chips.push({
                icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
                title: game.i18n.localize('SWADE.Unequipped'),
            });
        }
        chips.push({
            icon: '<i class="fas fa-user-shield"></i>',
            text: this.parry,
            title: game.i18n.localize('SWADE.Parry'),
        }, {
            icon: '<i class="fas fas fa-umbrella"></i>',
            text: this.cover,
            title: game.i18n.localize('SWADE.Cover._name'),
        }, {
            icon: '<i class="fas fa-dumbbell"></i>',
            text: this.minStr,
        }, {
            icon: '<i class="fas fa-sticky-note"></i>',
            text: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.notes ?? '', enrichOptions),
            title: game.i18n.localize('SWADE.Notes'),
        });
        return chips;
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.parent?.actor?.type === 'npc') {
            this.updateSource({ equipStatus: constants$1.EQUIP_STATE.EQUIPPED });
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/shield-embeds.hbs', ['item-embed', 'shield']);
    }
}

class SkillData extends SwadeBaseItemData {
    /** @inheritdoc */
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...makeTraitDiceFields(),
            attribute: new foundry.data.fields.StringField({
                initial: '',
                label: 'SWADE.Attribute',
            }),
            isCoreSkill: new foundry.data.fields.BooleanField({
                label: 'SWADE.CoreSkill',
            }),
        };
    }
    prepareBaseData() {
        this.effects ??= new Array();
    }
    prepareDerivedData() {
        this.die = boundTraitDie(this.die);
        this['wild-die'].sides = Math.min(this['wild-die'].sides, 12);
    }
    get modifier() {
        let mod = this.die.modifier;
        const attribute = this.attribute;
        const globals = this.parent.actor?.system.stats.globalMods;
        mod += this.effects?.reduce(addUpModifiers, 0);
        mod += globals?.trait.reduce(addUpModifiers, 0) ?? 0;
        if (attribute)
            mod += globals?.[attribute]?.reduce(addUpModifiers, 0);
        return mod;
    }
    get canRoll() {
        return !!this.parent.actor;
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/skill-embeds.hbs', ['item-embed', 'skill']);
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if (!this.actor)
            return;
        //gather all vehicle documents
        const allVehicles = game.actors
            .filter((a) => a.type === 'vehicle')
            .concat(game.scenes.contents
            .flatMap((scene) => scene.tokens.contents)
            .filter((token) => !token.actorLink)
            .map((token) => token.actor)
            .filter((doc) => doc?.type === 'vehicle'));
        //filter down to only the vehicles this skill's actor is an operator of
        const filtered = allVehicles.filter((vehicle) => vehicle.system.crew.members.find((m) => m.uuid === this.actor?.uuid &&
            m.role === constants.CREW_ROLE.OPERATOR));
        for (const vehicle of filtered) {
            //possibly trigger dataprep again
            if ([
                vehicle.system.driver.skill,
                vehicle.system.driver.skillAlternative,
            ].includes(this.parent.name)) {
                vehicle.reset();
                vehicle.sheet?.render();
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$a, HandlebarsApplicationMixin: HandlebarsApplicationMixin$b } = foundry.applications.api;
class Reloadinator extends HandlebarsApplicationMixin$b(ApplicationV2$a) {
    constructor({ weapon, magazines, resolve, ...options }) {
        super(options);
        this.#callback = resolve;
        this.magazines = magazines;
        this.weapon = weapon;
    }
    #callback;
    #isResolved = false;
    #wantsToDiscard = false;
    static asPromise(ctx) {
        return new Promise((resolve) => new Reloadinator({ ...ctx, resolve }).render({ force: true }));
    }
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE.Magazine.Select',
        },
        position: {
            width: 400,
            height: 'auto',
        },
        classes: ['swade', 'magazine-manager', 'swade-application'],
        actions: {
            selectMag: Reloadinator.#onSelectMag,
            discard: Reloadinator.#onDiscard,
        },
    };
    static PARTS = {
        main: { template: 'systems/swade/templates/apps/reload-manager.hbs' },
    };
    get loadedAmmo() {
        return this.weapon.getFlag('swade', 'loadedAmmo');
    }
    get noShotsInWeapon() {
        return (this.weapon.type === 'weapon' && this.weapon.system.currentShots === 0);
    }
    static #onDiscard(_event, target) {
        this.#wantsToDiscard = target.checked;
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            magazineGroups: this.#prepareOptionList(),
            canDiscard: this.weapon.system.currentShots === 0 && this.loadedAmmo,
        });
        return context;
    }
    _onClose(options) {
        super._onClose(options);
        if (!this.#isResolved)
            this.#callback(false);
    }
    static async #onSelectMag(event, target) {
        event.preventDefault();
        if (this.weapon.type !== 'weapon')
            return;
        const selected = this.#selectOption(target.dataset.itemId);
        if (selected?.type !== 'consumable')
            return;
        const currentShots = this.weapon.system.currentShots;
        const magContent = selected.system.charges.value;
        //return early if the new and old mag have the same content as there's nothing to do
        if (currentShots === magContent)
            return;
        const stackSize = selected.system.quantity;
        const discardEmpty = this.#wantsToDiscard && this.noShotsInWeapon && this.loadedAmmo;
        //discard empty magazine if desired
        if (discardEmpty || !this.loadedAmmo) {
            await this.#loadFromInventory(selected, stackSize);
            await this.#loadIntoWeapon(selected);
        }
        else if (stackSize > 0) {
            await this.#exchangeMagWithStack(selected, stackSize);
            await this.#loadIntoWeapon(selected);
        }
        else {
            //last resort: just update the charges
            await this.#loadIntoWeapon(selected);
            await this.#updateSelectedMag(selected, currentShots);
        }
        this.#resolve();
    }
    #selectOption(id) {
        return this.magazines.find((i) => i.id === id);
    }
    #resolve() {
        this.#isResolved = true;
        this.#callback(true);
        this.close();
    }
    #prepareOptionList() {
        const groups = Object.fromEntries(this.magazines.map((m) => [m.name, []]));
        const filteredMags = this.magazines.filter((m) => m.system.charges.value > 0);
        for (const mag of filteredMags) {
            if (mag.type !== 'consumable')
                continue;
            const charges = foundry.utils.getProperty(mag, 'system.charges.value');
            const capacity = foundry.utils.getProperty(mag, 'system.charges.max');
            const isBattery = mag.system.subtype === constants$1.CONSUMABLE_TYPE.BATTERY;
            groups[mag.name].push({
                id: mag.id,
                name: mag.name,
                charges,
                capacity,
                percentage: Math.round((charges / capacity) * 100),
                quantity: mag.system.quantity > 1 ? mag.system.quantity : undefined,
                showPercentage: isBattery,
            });
        }
        Object.values(groups).forEach((v) => v.sort((a, b) => b.percentage - a.percentage));
        return groups;
    }
    /** set the shots in the weapon and the selected magazine/battery */
    async #loadIntoWeapon(selected) {
        if (selected.type !== 'consumable')
            return;
        const selectedToInsert = foundry.utils.mergeObject(selected.toObject(), {
            'system.quantity': 1,
        });
        let shots = 0;
        if (selected.system.subtype === constants$1.CONSUMABLE_TYPE.MAGAZINE) {
            shots = selected.system.charges.value;
        }
        else if (selected.system.subtype === constants$1.CONSUMABLE_TYPE.BATTERY) {
            shots = this.#getShotsFromBatteryFill(selected);
        }
        await this.weapon.update({
            'system.currentShots': shots,
            'flags.swade.loadedAmmo': selectedToInsert,
        });
    }
    /** simply overwrite the old magazine with the new one to "discard" the old one */
    async #loadFromInventory(selected, stackSize) {
        if (stackSize > 1) {
            await selected.update({ 'system.quantity': stackSize - 1 });
        }
        else {
            await selected.delete();
        }
    }
    async #exchangeMagWithStack(selected, stackSize) {
        if (selected.type !== 'consumable')
            return;
        //find an existing magazine stack we can add to
        const emptyMagStack = this.magazines.find((m) => m.type === 'consumable' && m.system.charges.value === 0);
        //if there's no existing stack or we're doing a partial reload.
        if (!emptyMagStack || (!this.noShotsInWeapon && this.loadedAmmo)) {
            const subtype = selected.system.subtype;
            let newCharges = 0;
            const currentShots = this.weapon.system.currentShots;
            //get the new charges value based on current shots and consumable subtype.
            if (subtype === constants$1.CONSUMABLE_TYPE.MAGAZINE) {
                newCharges = currentShots;
            }
            else if (subtype === constants$1.CONSUMABLE_TYPE.BATTERY) {
                newCharges = this.#getBatteryFillFromShots(currentShots);
            }
            //copy the selected consumable and set the new charges on the clone.
            await selected.clone({ 'system.quantity': 1, 'system.charges.value': newCharges }, { save: true });
        }
        else {
            //else increase the stack by 1
            await emptyMagStack.update({
                'system.quantity': emptyMagStack.system.quantity + 1,
            });
        }
        //lastly, decrease the stack size of the selected mag or delete it entirely.
        const newStackSize = stackSize - 1;
        if (newStackSize > 0) {
            await selected.update({ 'system.quantity': newStackSize });
        }
        else {
            await selected.delete();
        }
    }
    async #updateSelectedMag(selected, currentShots) {
        let shots = 0;
        const subtype = selected.system.subtype;
        if (subtype === constants$1.CONSUMABLE_TYPE.MAGAZINE) {
            shots = currentShots;
        }
        else if (subtype === constants$1.CONSUMABLE_TYPE.BATTERY) {
            shots = this.#getBatteryFillFromShots(currentShots);
        }
        await selected.update({ 'system.charges.value': shots });
    }
    #getBatteryFillFromShots(currentShots) {
        if (this.weapon.type !== 'weapon')
            return 0;
        const per = (currentShots / this.weapon.system.shots) * 100;
        return Math.ceil(per);
    }
    #getShotsFromBatteryFill(battery) {
        if (this.weapon.type !== 'weapon' || battery.type !== 'consumable') {
            return 0;
        }
        const factor = battery.system.charges.value / 100;
        return Math.ceil(this.weapon.system.shots * factor);
    }
}

class WeaponData extends SwadePhysicalItemData {
    /** @inheritdoc */
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            ...super.defineSchema(),
            ...equippable(),
            ...arcaneDevice(),
            ...vehicular(),
            ...actions(),
            ...activities(),
            ...favorite(),
            ...templates(),
            ...category(),
            ...grantEmbedded(),
            damage: new FormulaField({ initial: '', label: 'SWADE.Dmg' }),
            range: new fields.StringField({
                initial: '',
                label: 'SWADE.Range._name',
            }),
            rangeType: new fields.NumberField({
                integer: true,
                nullable: true,
                initial: null,
                choices: Object.values(constants$1.WEAPON_RANGE_TYPE),
                label: 'SWADE.Weapon.RangeType.Label',
            }),
            rof: new fields.NumberField({ initial: 1, label: 'SWADE.RoF' }),
            ap: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.AP',
            }),
            parry: new fields.NumberField({ initial: 0, label: 'SWADE.Parry' }),
            minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
            shots: new fields.NumberField({ initial: 0, label: 'SWADE.Mag' }),
            currentShots: new fields.NumberField({
                initial: 0,
                label: 'SWADE.ShotsCurrent',
            }),
            ammo: new fields.StringField({ initial: '', label: 'SWADE.Ammo' }),
            reloadType: new fields.StringField({
                initial: constants$1.RELOAD_TYPE.NONE,
                choices: Object.values(constants$1.RELOAD_TYPE),
                label: 'SWADE.ReloadType.Label',
            }),
            ppReloadCost: new fields.NumberField({
                initial: 2,
                label: 'SWADE.PPCost',
            }),
            trademark: new fields.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.TrademarkWeapon.Label',
            }),
            isHeavyWeapon: new fields.BooleanField({ label: 'SWADE.HeavyWeapon' }),
        };
    }
    /** @inheritdoc */
    static migrateData(source) {
        ensurePricesAreNumeric(source);
        ensureWeightsAreNumeric(source);
        ensureAPisNumeric(source);
        ensureRoFisNumeric(source);
        ensureShotsAreNumeric(source);
        renameActionProperties(source);
        return super.migrateData(source);
    }
    /** @inheritdoc */
    _initialize(options) {
        super._initialize(options);
        this._applyShims();
    }
    _applyShims() {
        actionProperties(this);
    }
    get isMelee() {
        return (this.rangeType === constants$1.WEAPON_RANGE_TYPE.MIXED ||
            this.rangeType === constants$1.WEAPON_RANGE_TYPE.MELEE);
    }
    get isRanged() {
        return (this.rangeType === constants$1.WEAPON_RANGE_TYPE.MIXED ||
            this.rangeType === constants$1.WEAPON_RANGE_TYPE.RANGED);
    }
    get canBeArcaneDevice() {
        return true;
    }
    get isReadied() {
        return Number(this.equipStatus) > constants$1.EQUIP_STATE.CARRIED;
    }
    get traitModifiers() {
        const modifiers = new Array();
        modifiers.push(...(this.parent.actor?.system.stats.globalMods.attack ?? []));
        if (this.equipStatus === constants$1.EQUIP_STATE.OFF_HAND &&
            !this.parent.actor?.getFlag('swade', 'ambidextrous')) {
            modifiers.push({
                label: game.i18n.localize('SWADE.OffHandPenalty'),
                value: -2,
            });
        }
        if (Number(this.trademark) > 0) {
            modifiers.push({
                label: game.i18n.localize('SWADE.TrademarkWeapon.Label'),
                value: '+' + this.trademark,
            });
        }
        return modifiers;
    }
    get usesAmmoFromInventory() {
        if (this.reloadType === constants$1.RELOAD_TYPE.PP)
            return false;
        const isPC = this.parent.actor?.type === 'character';
        const isNPC = this.parent.actor?.type === 'npc';
        const isVehicle = this.parent.actor?.type === 'vehicle';
        const npcAmmoFromInventory = game.settings.get('swade', 'npcAmmo');
        const vehicleAmmoFromInventory = game.settings.get('swade', 'vehicleAmmo');
        const useAmmoFromInventory = game.settings.get('swade', 'ammoFromInventory');
        return ((isVehicle && vehicleAmmoFromInventory) ||
            (isNPC && npcAmmoFromInventory) ||
            (isPC && useAmmoFromInventory));
    }
    get hasAmmoManagement() {
        return (!this.isMelee &&
            game.settings.get('swade', 'ammoManagement') &&
            this.reloadType !== constants$1.RELOAD_TYPE.NONE);
    }
    get hasReloadButton() {
        return (game.settings.get('swade', 'ammoManagement') &&
            (this.shots ?? 0) > 0 &&
            this.reloadType !== constants$1.RELOAD_TYPE.NONE &&
            this.reloadType !== constants$1.RELOAD_TYPE.SELF);
    }
    /** Used by SwadeItem.setEquipState */
    _rejectEquipState(state) {
        return state === constants$1.EQUIP_STATE.EQUIPPED;
    }
    async getChatChips(enrichOptions) {
        const chips = new Array();
        if (this.isReadied) {
            chips.push({
                icon: '<i class="fas fa-tshirt"></i>',
                title: game.i18n.localize('SWADE.Equipped'),
            });
        }
        else {
            chips.push({
                icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
                title: game.i18n.localize('SWADE.Unequipped'),
            });
        }
        chips.push({
            icon: '<i class="fas fa-fist-raised"></i>',
            text: this.damage,
            title: game.i18n.localize('SWADE.Dmg'),
        }, {
            icon: '<i class="fas fa-shield-alt"></i>',
            text: this.ap,
            title: game.i18n.localize('SWADE.Ap'),
        }, {
            icon: '<i class="fas fa-user-shield"></i>',
            text: this.parry,
            title: game.i18n.localize('SWADE.Parry'),
        }, {
            icon: '<i class="fas fa-ruler"></i>',
            text: this.range,
            title: game.i18n.localize('SWADE.Range._name'),
        }, {
            icon: '<i class="fas fa-tachometer-alt"></i>',
            text: this.rof,
            title: game.i18n.localize('SWADE.RoF'),
        }, {
            icon: '<i class="fas fa-sticky-note"></i>',
            text: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.notes ?? '', enrichOptions),
            title: game.i18n.localize('SWADE.Notes'),
        });
        return chips;
    }
    /** Used by SwadeItem.canExpendResources */
    _canExpendResources(resourcesUsed = 1) {
        if (!game.settings.get('swade', 'ammoManagement') || this.isMelee)
            return true;
        if (this.reloadType === constants$1.RELOAD_TYPE.NONE) {
            if (!this.usesAmmoFromInventory)
                return true;
            const ammo = this.actor?.items.getName(this.ammo);
            if (!ammo)
                return false;
            const ammoCount = ammo?.type === 'consumable'
                ? ammo?.system['charges']['value']
                : ammo?.system['quantity'];
            return resourcesUsed <= ammoCount;
        }
        else if (this.reloadType === constants$1.RELOAD_TYPE.SELF) {
            const usesRemaining = Number(this.shots) * (Number(this.quantity) - 1) +
                Number(this.currentShots);
            return resourcesUsed <= usesRemaining;
        }
        else {
            return resourcesUsed <= Number(this.currentShots);
        }
    }
    /** Used by SwadeItem.consume */
    _getUsageUpdates(chargesToUse) {
        const actorUpdates = {};
        const itemUpdates = {};
        const resourceUpdates = new Array();
        if (!game.settings.get('swade', 'ammoManagement'))
            return false;
        const usesAmmo = this.shots && this.currentShots;
        if (this.reloadType === constants$1.RELOAD_TYPE.NONE) {
            if (!this.usesAmmoFromInventory)
                return false;
            const ammo = this.parent.actor?.items.getName(this.ammo);
            if (ammo?.type === 'consumable') {
                ammo?.consume(chargesToUse);
            }
            else {
                const quantity = ammo?.system['quantity'];
                if ((usesAmmo && !ammo) || chargesToUse > quantity) {
                    Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
                    return false;
                }
                else if (usesAmmo && ammo) {
                    resourceUpdates.push({
                        _id: ammo.id,
                        'system.quantity': quantity - chargesToUse,
                    });
                }
            }
        }
        else if (this.reloadType === constants$1.RELOAD_TYPE.SELF) {
            const currentShots = Number(this.currentShots);
            const maxShots = Number(this.shots);
            const usesShots = !!maxShots && !!currentShots;
            const quantity = Number(this.quantity);
            const usesRemaining = maxShots * (quantity - 1) + currentShots;
            if (!usesShots || chargesToUse > usesRemaining) {
                Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
                return false;
            }
            let newShots;
            let newQuantity;
            if (chargesToUse < currentShots) {
                itemUpdates['system.currentShots'] = currentShots - chargesToUse;
            }
            else {
                const quantityUsed = Math.ceil(chargesToUse / maxShots);
                const remainingQty = quantity - quantityUsed;
                if (remainingQty < 1) {
                    newShots = 0;
                    newQuantity = 0;
                }
                else {
                    const remainder = chargesToUse - (currentShots + (quantityUsed - 1) * maxShots);
                    newShots = maxShots - remainder;
                    newQuantity = remainingQty;
                }
                itemUpdates['system.currentShots'] = newShots;
                itemUpdates['system.quantity'] = newQuantity;
            }
        }
        else {
            const currentShots = this.currentShots;
            const usesShots = !!this.shots && !!currentShots;
            if (!usesShots || chargesToUse > currentShots) {
                Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
                return false;
            }
            itemUpdates['system.currentShots'] = currentShots - chargesToUse;
        }
        return { actorUpdates, itemUpdates, resourceUpdates };
    }
    prepareDerivedData() {
        super.prepareDerivedData();
    }
    /**
     * Reload this weapon based on the reload procedure set.
     * @returns whether this weapon was successfully reloaded
     */
    async reload() {
        const parent = this.parent.actor;
        if (!game.settings.get('swade', 'ammoManagement') || !parent)
            return false;
        //return if there's no ammo set
        if (this.usesAmmoFromInventory && !this.ammo) {
            if (!notificationExists('SWADE.NoAmmoSet')) {
                Logger.info('SWADE.NoAmmoSet', { toast: true, localize: true });
            }
            return false;
        }
        const ammoItem = parent.items.getName(this.ammo);
        const currentShots = this.currentShots || 0;
        const maxShots = this.shots || 0;
        const missingShots = maxShots - currentShots;
        const reloadType = this.reloadType;
        if (this.usesAmmoFromInventory && !ammoItem) {
            this.#postNotEnoughAmmoMessage();
            return false;
        }
        if (currentShots >= maxShots) {
            if (!notificationExists('SWADE.ReloadUnneeded')) {
                Logger.info('SWADE.ReloadUnneeded', {
                    localize: true,
                    toast: true,
                });
            }
            return false;
        }
        /**
         * Called when a reload is initiated. Returning false will cancel the reload operation;
         * @param {SwadeItem} item        The weapon being reloaded
         */
        const permitContinue = Hooks.call('swadePreReloadWeapon', this.parent);
        if (!permitContinue)
            return false;
        let reloaded = false;
        switch (reloadType) {
            case constants$1.RELOAD_TYPE.SINGLE:
                reloaded = await this.#handleSingleReload(ammoItem);
                break;
            case constants$1.RELOAD_TYPE.FULL:
                reloaded = await this.#handleFullReload(ammoItem, //FIXME technically the item can be undefined here still
                missingShots);
                break;
            case constants$1.RELOAD_TYPE.MAGAZINE:
            case constants$1.RELOAD_TYPE.BATTERY:
                reloaded = await this.#handleReloadFromConsumable(reloadType);
                break;
            case constants$1.RELOAD_TYPE.PP:
                reloaded = await this.#handlePowerPointReload();
                break;
            case constants$1.RELOAD_TYPE.NONE:
            case constants$1.RELOAD_TYPE.SELF:
        }
        /**
         * Called after a weapon reload procedure has finished.
         * @param {SwadeItem} item            The weapon being reloaded
         * @param {boolean} reloaded          Whether the reload operation was successfully completed
         */
        Hooks.callAll('swadeReloadWeapon', this.parent, reloaded);
        return reloaded;
    }
    async #handleSingleReload(ammo) {
        const system = ammo?.system;
        if (this.usesAmmoFromInventory && (system?.quantity ?? 0) <= 0) {
            this.#postNotEnoughAmmoMessage();
            return false;
        }
        else {
            await ammo?.consume(1);
        }
        await this.parent.update({
            'system.currentShots': Number(this.currentShots) + 1,
        });
        Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return true;
    }
    async #handleFullReload(ammo, missing) {
        if (!this.usesAmmoFromInventory) {
            return this.#handleSimpleReload();
        }
        if (ammo.type === 'consumable') {
            return this.#handleConsumableReload(ammo, missing);
        }
        if (ammo.system.quantity <= 0) {
            this.#postNotEnoughAmmoMessage();
            return false;
        }
        let ammoInMagazine = this.shots;
        if (ammo.system.quantity < missing) {
            // partial reload
            ammoInMagazine = (this.currentShots ?? 0) + ammo.system.quantity;
            await ammo.consume(ammo.system.quantity);
            this.#postNotEnoughAmmoToReloadMessage();
        }
        else {
            await ammo.consume(missing);
        }
        await this.parent.update({ 'system.currentShots': ammoInMagazine });
        Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return true;
    }
    async #handleConsumableReload(ammo, missing) {
        if (!(ammo.system instanceof ConsumableData))
            return false;
        if ((ammo.system.charges.value ?? 0) <= 0) {
            this.#postNotEnoughAmmoMessage();
            return false;
        }
        const allCharges = (ammo.system.charges.value ?? 0) * (ammo.system.quantity ?? 0);
        let ammoInMagazine = this.shots;
        if (allCharges < missing) {
            // partial reload
            ammoInMagazine = Number(this.currentShots) + allCharges;
            await ammo.consume(allCharges);
            this.#postNotEnoughAmmoToReloadMessage();
        }
        else {
            await ammo.consume(missing);
        }
        await this.parent.update({ 'system.currentShots': ammoInMagazine });
        Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return true;
    }
    async #handleReloadFromConsumable(reloadType) {
        if (!this.usesAmmoFromInventory)
            return this.#handleSimpleReload();
        let magazines = new Array();
        const consumables = this.parent.actor?.itemTypes.consumable ?? [];
        const predicate = (type) => {
            return (i) => i.type === 'consumable' &&
                i.name === this.ammo &&
                i.system.subtype === type &&
                (i.system.equipStatus ?? 0) >= constants$1.EQUIP_STATE.CARRIED;
        };
        if (reloadType === constants$1.RELOAD_TYPE.MAGAZINE) {
            magazines = consumables.filter(predicate(constants$1.CONSUMABLE_TYPE.MAGAZINE));
        }
        else if (reloadType === constants$1.RELOAD_TYPE.BATTERY) {
            magazines = consumables.filter(predicate(constants$1.CONSUMABLE_TYPE.BATTERY));
        }
        if (magazines.filter((m) => (m.system.charges.value ?? 0) > 0).length === 0) {
            if (!notificationExists('SWADE.NoMags')) {
                Logger.warn('SWADE.NoMags', {
                    toast: true,
                    localize: true,
                });
            }
            return false;
        }
        const reloaded = await Reloadinator.asPromise({
            weapon: this.parent,
            magazines,
        });
        if (reloaded)
            Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return reloaded;
    }
    async #handlePowerPointReload() {
        const powerPoints = this.parent.actor?.system.powerPoints[this.ammo];
        const ppReloadCost = Number(this.ppReloadCost);
        if (!powerPoints) {
            if (!notificationExists('SWADE.NoAmmoPP')) {
                Logger.warn('SWADE.NoAmmoPP', {
                    toast: true,
                    localize: true,
                });
            }
            return false;
        }
        if (powerPoints?.value < ppReloadCost) {
            this.#postNotEnoughAmmoMessage();
            return false;
        }
        await this.parent.actor?.update({
            ['system.powerPoints.' + this.ammo + '.value']: powerPoints.value - ppReloadCost,
        });
        await this.parent.update({ 'system.currentShots': this.shots });
        Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return true;
    }
    async #handleSimpleReload() {
        await this.parent.update({ 'system.currentShots': this.shots });
        Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
        return true;
    }
    /** Remove the loaded ammunition from this weapon and move it into the parent actor's inventory */
    async removeAmmo() {
        const loadedAmmo = this.parent.getFlag('swade', 'loadedAmmo');
        const parent = this.parent.actor;
        if (!parent || !loadedAmmo)
            return;
        const reloadType = this.reloadType;
        if (reloadType !== constants$1.RELOAD_TYPE.MAGAZINE &&
            reloadType !== constants$1.RELOAD_TYPE.BATTERY)
            return;
        const updates = [
            {
                _id: this.parent.id,
                'system.currentShots': 0,
                'flags.swade': { '-=loadedAmmo': null },
            },
        ];
        if (!this.usesAmmoFromInventory) {
            await parent.updateEmbeddedDocuments('Item', updates);
            return;
        }
        const isFull = this.currentShots === this.shots;
        const predicate = (type, charges) => {
            return (item) => item.type === 'consumable' &&
                item.name === loadedAmmo.name &&
                item.system.subtype === type &&
                (item.system.equipStatus ?? 0) >= constants$1.EQUIP_STATE.CARRIED &&
                item.system.charges.value === (charges ?? item.system.charges.max);
        };
        const consumables = parent.itemTypes
            .consumable;
        if (reloadType === constants$1.RELOAD_TYPE.MAGAZINE) {
            const existingStack = consumables.find(predicate(constants$1.CONSUMABLE_TYPE.MAGAZINE));
            if (existingStack && isFull) {
                updates.push({
                    _id: existingStack.id,
                    'system.quantity': (existingStack.system.quantity ?? 0) + 1,
                });
            }
            else {
                const itemData = foundry.utils.mergeObject(loadedAmmo, {
                    'system.charges.value': this.currentShots,
                });
                await getDocumentClass('Item').create(itemData, { parent });
            }
        }
        else if (reloadType === constants$1.RELOAD_TYPE.BATTERY) {
            const existingStack = consumables.find(predicate(constants$1.CONSUMABLE_TYPE.BATTERY, 100));
            if (existingStack && isFull) {
                updates.push({
                    _id: existingStack.id,
                    'system.quantity': (existingStack.system.quantity ?? 0) + 1,
                });
            }
            else {
                const factor = Number(this.currentShots) / Number(this.shots);
                const itemData = foundry.utils.mergeObject(loadedAmmo, {
                    'system.charges.value': Math.ceil(factor * 100),
                });
                await getDocumentClass('Item').create(itemData, { parent });
            }
        }
        await parent.updateEmbeddedDocuments('Item', updates);
    }
    #postNotEnoughAmmoMessage() {
        if (!notificationExists('SWADE.NotEnoughAmmo')) {
            Logger.warn('SWADE.NotEnoughAmmo', {
                toast: true,
                localize: true,
            });
        }
    }
    #postNotEnoughAmmoToReloadMessage() {
        if (!notificationExists('SWADE.NotEnoughAmmoToReload')) {
            Logger.warn('SWADE.NotEnoughAmmoToReload', {
                toast: true,
                localize: true,
            });
        }
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.parent?.actor?.type === 'npc') {
            this.updateSource({ equipStatus: constants$1.EQUIP_STATE.MAIN_HAND });
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
            ...options,
        });
        return await createEmbedElement(this, 'systems/swade/templates/embeds/weapon-embeds.hbs', ['item-embed', 'weapon']);
    }
}

const config$5 = {
    ability: AbilityData,
    action: ActionData,
    ancestry: AncestryData,
    armor: ArmorData,
    consumable: ConsumableData,
    edge: EdgeData,
    gear: GearData,
    hindrance: HindranceData,
    power: PowerData,
    shield: ShieldData,
    skill: SkillData,
    weapon: WeaponData,
};

var index$7 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AbilityData: AbilityData,
    ActionData: ActionData,
    AncestryData: AncestryData,
    ArmorData: ArmorData,
    ConsumableData: ConsumableData,
    EdgeData: EdgeData,
    GearData: GearData,
    HindranceData: HindranceData,
    PowerData: PowerData,
    ShieldData: ShieldData,
    SkillData: SkillData,
    WeaponData: WeaponData,
    base: index$9,
    common: common,
    config: config$5,
    shims: _shims
});

function splitTopSpeed(source) {
    if (Object.hasOwn(source, 'topspeed') &&
        typeof source.topspeed === 'string') {
        const stringValue = source.topspeed;
        const match = stringValue.match(/^\d*/);
        if (Number.isNumeric(stringValue)) {
            source.topspeed = { value: Number(stringValue), unit: '' };
        }
        else if (!match) {
            source.topspeed = { value: 0, unit: '' };
        }
        else {
            const value = match[0];
            const unit = stringValue.slice(value.length).trim();
            source.topspeed = { value: Number(value), unit };
        }
    }
}
function renamePace(source) {
    const oldSpeed = source.stats?.speed;
    if (foundry.utils.hasProperty(source, 'pace') || !oldSpeed)
        return;
    const oldPace = oldSpeed?.value;
    const oldRunningDie = oldSpeed?.runningDie;
    const oldRunningMod = oldSpeed?.runningMod;
    const runningDie = {
        die: typeof oldRunningMod === 'number' ? oldRunningDie : 6,
        mod: typeof oldRunningDie === 'number' ? oldRunningMod : 0,
    };
    source.pace = {
        ground: typeof oldPace === 'number' ? oldPace : 6,
        running: runningDie,
    };
}
function shiftCargoModsMax(source) {
    const oldMaxCargo = source.maxCargo;
    if (oldMaxCargo)
        foundry.utils.setProperty(source, 'cargo.max', oldMaxCargo);
    const oldMaxMods = source.maxMods;
    if (oldMaxMods)
        foundry.utils.setProperty(source, 'mods.max', oldMaxMods);
}
function migrateDriver(source) {
    if (foundry.utils.hasProperty(source, 'driver.id') && !!source.driver.id) {
        foundry.utils.mergeObject(source.crew, {
            members: [{ uuid: source.driver.id, role: constants$1.CREW_ROLE.OPERATOR }],
        });
        delete source.driver.id;
        Object.defineProperty(source.driver, 'id', {
            configurable: true,
            get: () => {
                foundry.utils.logCompatibilityWarning('The driver.id property has been replaced by the crew member list', { since: '4.4', until: '5.1' });
                return source.crew.members.find((m) => m.role === constants$1.CREW_ROLE.OPERATOR)?.uuid;
            },
        });
    }
}

function ensureStrengthDie(source) {
    const strength = source.attributes?.strength?.die;
    if (!strength || !Object.hasOwn(strength, 'sides'))
        return; //bail early
    if (typeof strength.sides === 'string' && Number.isNumeric(strength.sides)) {
        strength.sides = Number(strength.sides); // reassign data to numbers if necessary
    }
    //limit the die to a minimum of 1
    strength.sides = Math.max(1, strength.sides);
}
function ensureCurrencyIsNumeric(source) {
    if (!source.details || !Object.hasOwn(source.details, 'currency'))
        return; // return early in case of update
    if (source.details.currency === null ||
        typeof source.details.currency === 'number')
        return;
    if (typeof source.details.currency === 'string') {
        // remove all symbols that aren't numeric or a decimal point
        source.details.currency = Number(source.details.currency.replaceAll(/[^0-9.]/g, ''));
    }
}
function ensureGeneralPowerPoints(source) {
    if (!source.powerPoints)
        return;
    source.powerPoints.general ??= {};
    if (Object.hasOwn(source.powerPoints, 'value')) {
        const value = source.powerPoints.value;
        source.powerPoints.general.value = Number.isNumeric(value)
            ? Number(value)
            : 0;
        delete source.powerPoints.value;
    }
    if (Object.hasOwn(source.powerPoints, 'max')) {
        const max = source.powerPoints.max;
        source.powerPoints.general.max = Number.isNumeric(max) ? Number(max) : 0;
        delete source.powerPoints.max;
    }
}
function ensurePowerPointsAreNumeric(source) {
    if (!source.powerPoints)
        return;
    for (const [key, pool] of Object.entries(source.powerPoints)) {
        if (key.startsWith('-=') || pool === null)
            continue; //bail condition for deletions
        if (Object.hasOwn(pool, 'value')) {
            pool.value = Number.isNumeric(pool.value) ? Number(pool.value) : 0;
        }
        if (Object.hasOwn(pool, 'max')) {
            pool.max = Number.isNumeric(pool.max) ? Number(pool.max) : 0;
        }
    }
}

function _shimPace(source) {
    const descriptor = { configurable: true };
    const options = {
        since: '4.2',
        until: '5.0',
    };
    const shim = {};
    Object.defineProperties(shim, {
        value: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.value property has been moved to the new system.pace object', options);
                return source.pace[source.pace.base];
            },
            set: (pace) => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.value property has been moved to the new system.pace object', options);
                source.pace[source.pace.base] = pace;
            },
        },
        adjusted: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.adjusted property has been moved to the new system.pace object', options);
                return source.pace[source.pace.base];
            },
            set: (pace) => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.adjusted property has been moved to the new system.pace object', options);
                source.pace[source.pace.base] = pace;
            },
        },
        runningDie: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.runningDie property has been moved to the new system.pace.running object', options);
                return source.pace.running.die;
            },
            set: (sides) => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.runningDie property has been moved to the new system.pace.running object', options);
                source.pace.running.die = sides;
            },
        },
        runningMod: {
            ...descriptor,
            get: () => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.runningMod property has been moved to the new system.pace.running object', options);
                return source.pace.running.mod;
            },
            set: (modifier) => {
                foundry.utils.logCompatibilityWarning('The system.stats.speed.runningMod property has been moved to the new system.pace.running object', options);
                source.pace.running.mod = modifier;
            },
        },
    });
    foundry.utils.setProperty(source, 'stats.speed', shim);
}

class AuraPointSource extends foundry.canvas.sources.PointEffectSourceMixin(foundry.canvas.sources.BaseEffectSource) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static sourceType = 'light';
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static effectsCollection = 'auras';
    graphics;
    id;
    sourceId;
    constructor({ object, id }) {
        super({ object });
        this.id = id;
        this.sourceId = `${object.sourceId}.Aura.${id}`;
    }
    static get defaultData() {
        return {
            ...super.defaultData,
            enabled: false,
            walls: false,
            color: '#000000',
            alpha: 0.25,
            radius: 5,
            visibleTo: [],
        };
    }
    get auraData() {
        return this.object.actor?.system?.auras[this.id];
    }
    /** @override */
    _configure(_changes) {
        this.graphics ??= new PIXI.Graphics();
        this.graphics.clear();
        this.graphics
            .beginFill(this.auraData?.color ?? '#000000', this.auraData?.alpha)
            .lineStyle(2, this.auraData?.color, 1)
            .drawShape(this.shape)
            .endFill();
    }
    /** @override */
    _destroy() {
        this.graphics?.destroy();
    }
    /** @override */
    get active() {
        const isActive = super.active;
        return isActive && (this._checkPermission() || this._checkDisposition());
    }
    _checkPermission() {
        return ((this.object.actor?.permission ?? 0) >=
            foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
    }
    _checkDisposition() {
        const isSet = foundry.utils.getType(this.auraData.visibleTo) === 'Set';
        const visibleTo = isSet
            ? Array.from(this.auraData.visibleTo)
            : Array.isArray(this.auraData.visibleTo)
                ? this.auraData.visibleTo
                : [this.auraData.visibleTo];
        return !!canvas?.tokens?.controlled.some((t) => visibleTo.includes(t.document.disposition));
    }
}

const fields$3 = foundry.data.fields;
class SwadeBaseActorData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            additionalStats: makeAdditionalStatsSchema(),
            category: new fields$3.StringField({
                required: false,
                initial: ''
            }),
            auras: new fields$3.TypedObjectField(new fields$3.SchemaField({
                enabled: new fields$3.BooleanField({
                    label: 'SWADE.Auras.Enabled',
                    required: true,
                }),
                radius: new fields$3.NumberField({
                    label: 'SWADE.Auras.Range',
                    min: 0,
                    step: 1,
                    required: true,
                    initial: 5,
                }),
                color: new fields$3.ColorField({
                    label: 'SWADE.Auras.Color',
                    initial: () => game.user?.color.css ?? '#000000',
                }),
                alpha: new fields$3.NumberField({
                    label: 'SWADE.Auras.Alpha',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    required: true,
                    initial: 0.25,
                }),
                walls: new fields$3.BooleanField({
                    label: 'SWADE.Auras.WallConstraints.Label',
                    hint: 'SWADE.Auras.WallConstraints.Hint',
                    required: true,
                }),
                visibleTo: new fields$3.SetField(new fields$3.NumberField({
                    choices: {
                        [CONST.TOKEN_DISPOSITIONS.HOSTILE]: 'TOKEN.DISPOSITION.HOSTILE',
                        [CONST.TOKEN_DISPOSITIONS.NEUTRAL]: 'TOKEN.DISPOSITION.NEUTRAL',
                        [CONST.TOKEN_DISPOSITIONS.FRIENDLY]: 'TOKEN.DISPOSITION.FRIENDLY',
                    },
                    required: true,
                }), {
                    label: 'SWADE.Aura.Visibility.Label',
                    hint: 'SWADE.Aura.Visibility.Hint',
                    required: true,
                    initial: [],
                }),
            }), {
                initial: {
                    aura1: {
                        ...AuraPointSource.defaultData,
                    },
                    aura2: {
                        ...AuraPointSource.defaultData,
                    },
                },
            }),
        };
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        // Ensure all auras have defaults if not provided
        const userColor = game.users.find((u) => u.character === this.parent)?.color?.css ??
            '#000000';
        for (const [auraKey, aura] of Object.entries(this.auras)) {
            this.auras[auraKey] = {
                ...AuraPointSource.defaultData,
                color: userColor,
                ...aura,
            };
        }
    }
    get tokenSize() {
        return { width: 1, height: 1 };
    }
    getRollData(_includeModifiers = true) {
        return {};
    }
    async rollAdditionalStat(stat) {
        const statData = this.additionalStats[stat];
        if (statData.dtype !== 'Die')
            return;
        let modifier = statData.modifier || '';
        if (!!modifier && !modifier.match(/^[+-]/)) {
            modifier = '+' + modifier;
        }
        //return early if there's no data to roll
        if (!statData.value)
            return;
        const roll = new SwadeRoll(`${statData.value}${modifier}`, this.getRollData());
        await roll.evaluate();
        const message = await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.parent }),
            flavor: statData.label,
        });
        return message;
    }
    getParryBaseSkill() {
        return undefined;
    }
    /**
     * Actor type specific preparation of embedded documents
     * @see {@link Actor.prepareEmbeddedDocuments}
     */
    prepareEmbeddedDocuments() {
        if (!this.parent)
            return;
        for (const effect of this.parent.effects)
            effect._safePrepareData();
        this.parent.applyActiveEffects();
        const sortedItems = this.parent.items.contents.sort((a, b) => {
            // make sure actions come first
            if (a.type === 'action' && b.type !== 'action')
                return -1;
            if (a.type !== 'action' && b.type === 'action')
                return 1;
            return 0;
        });
        for (const item of sortedItems)
            item._safePrepareData();
    }
}

const fields$2 = foundry.data.fields;
function creatureSchema() {
    return {
        attributes: new fields$2.SchemaField({
            agility: new fields$2.SchemaField(makeTraitDiceFields(), {
                label: 'SWADE.AttrAgi',
            }),
            smarts: new fields$2.SchemaField({
                ...makeTraitDiceFields(),
                animal: new fields$2.BooleanField({
                    label: 'SWADE.AnimalSmarts',
                }),
            }, { label: 'SWADE.AttrSma' }),
            spirit: new fields$2.SchemaField({
                ...makeTraitDiceFields(),
                unShakeBonus: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.EffectCallbacks.Shaken.UnshakeModifier',
                }),
            }, { label: 'SWADE.AttrSpr' }),
            strength: new fields$2.SchemaField({
                ...makeTraitDiceFields(),
                encumbranceSteps: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.EncumbranceSteps',
                }),
            }, { label: 'SWADE.AttrStr' }),
            vigor: new fields$2.SchemaField({
                ...makeTraitDiceFields(),
                unStunBonus: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.EffectCallbacks.Stunned.UnStunModifier',
                }),
                soakBonus: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.DamageApplicator.SoakModifier',
                }),
                bleedOut: new fields$2.SchemaField({
                    modifier: new fields$2.NumberField({
                        initial: 0,
                        integer: true,
                        label: 'SWADE.EffectCallbacks.BleedingOut.BleedOutModifier',
                    }),
                    ignoreWounds: new fields$2.BooleanField({
                        label: 'SWADE.IgnWounds',
                    }),
                }),
            }, { label: 'SWADE.AttrVig' }),
        }, { label: 'SWADE.Attributes' }),
        pace: new PaceSchemaField(),
        stats: new fields$2.SchemaField({
            toughness: new fields$2.SchemaField({
                value: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.Tough',
                }),
                armor: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.Armor',
                }),
                modifier: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    required: false,
                    label: 'SWADE.Modifier',
                }),
            }, { label: 'SWADE.Tough' }),
            parry: new fields$2.SchemaField({
                value: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.Parry',
                }),
                shield: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.ShieldBonus',
                }),
                modifier: new fields$2.NumberField({
                    initial: 0,
                    integer: true,
                    required: false,
                    label: 'SWADE.Modifier',
                }),
            }, { label: 'SWADE.Parry' }),
            size: new fields$2.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.Size',
            }),
        }, { label: 'SWADE.Stats' }),
        details: new fields$2.SchemaField({
            autoCalcToughness: new fields$2.BooleanField({
                initial: true,
                hint: 'SWADE.InclArmor',
            }),
            autoCalcParry: new fields$2.BooleanField({
                initial: true,
                hint: 'SWADE.AutoCalcParry',
            }),
            archetype: new fields$2.StringField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Archetype',
            }),
            appearance: new fields$2.HTMLField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Appearance',
            }),
            notes: new fields$2.HTMLField({
                initial: '',
                textSearch: true,
                label: 'SWADE.Notes',
            }),
            goals: new fields$2.HTMLField({
                initial: '',
                textSearch: true,
                label: 'SWADE.CharacterGoals',
            }),
            biography: new fields$2.SchemaField({
                value: new fields$2.HTMLField({
                    initial: '',
                    textSearch: true,
                    label: 'SWADE.Biography',
                }),
            }, { label: 'SWADE.Biography' }),
            species: new fields$2.SchemaField({
                name: new fields$2.StringField({
                    initial: '',
                    textSearch: true,
                    label: 'SWADE.Ancestry',
                }),
            }, { label: 'SWADE.Ancestry' }),
            currency: new fields$2.NumberField({
                initial: 0,
                label: 'SWADE.Currency',
            }),
            wealth: new fields$2.SchemaField({
                die: new fields$2.NumberField({
                    initial: 6,
                    min: -1,
                    integer: true,
                    label: 'SWADE.WealthDie.Sides',
                }),
                modifier: new fields$2.NumberField({
                    initial: 0,
                    label: 'SWADE.WealthDie.Modifier',
                }),
                'wild-die': makeDiceField(6, 'SWADE.WealthDie.WildSides'),
            }, { label: 'SWADE.WealthDie.Label' }),
            conviction: new fields$2.SchemaField({
                value: new fields$2.NumberField({
                    initial: 0,
                    label: 'SWADE.Value',
                }),
                active: new fields$2.BooleanField({
                    label: 'SWADE.ConvictionActive',
                }),
            }, { label: 'SWADE.Conv' }),
        }, { label: 'SWADE.Details' }),
        powerPoints: new fields$2.TypedObjectField(CreatureData.makePowerPointsSchema(), {
            initial: {
                general: CreatureData.makePowerPointsSchema().getInitialValue(),
            },
            required: true,
            label: 'SWADE.PP',
        }),
        fatigue: new fields$2.SchemaField({
            value: new fields$2.NumberField({
                initial: 0,
                min: 0,
                label: 'SWADE.Fatigue',
            }),
            max: new fields$2.NumberField({
                initial: 2,
                label: 'SWADE.FatigueMax',
            }),
            ignored: new fields$2.NumberField({
                initial: 0,
                label: 'SWADE.IgnFatigue',
            }),
        }, { label: 'SWADE.Fatigue' }),
        woundsOrFatigue: new fields$2.SchemaField({
            ignored: new fields$2.NumberField({
                initial: 0,
                label: 'SWADE.IgnFatigueWounds',
            }),
        }, { label: 'SWADE.FatigueWounds' }),
        advances: new fields$2.SchemaField({
            mode: new fields$2.StringField({
                initial: 'expanded',
                blank: false,
                nullable: false,
                choices: {
                    legacy: 'SWADE.Advances.Modes.Legacy',
                    expanded: 'SWADE.Advances.Modes.Expanded',
                },
                label: 'SWADE.Advances.Modes.Label',
            }),
            value: new fields$2.NumberField({
                initial: 0,
                label: 'SWADE.Advance',
            }),
            rank: new fields$2.StringField({
                initial: 'Novice',
                textSearch: true,
                label: 'SWADE.Rank',
            }),
            details: new fields$2.HTMLField({
                initial: '',
                label: 'SWADE.Details',
            }),
            list: new fields$2.ArrayField(new fields$2.SchemaField({
                //TODO Create special data field for Advances
                type: new fields$2.NumberField({ initial: 0, label: 'Type' }),
                notes: new fields$2.HTMLField({
                    initial: '',
                    label: 'SWADE.Notes',
                }),
                sort: new fields$2.NumberField({
                    initial: 0,
                    label: 'SWADE.SortNum',
                }),
                planned: new fields$2.BooleanField({
                    label: 'SWADE.Advances.Planned',
                }),
                id: new fields$2.StringField({ initial: '', label: 'SWADE.ID' }),
                rank: new fields$2.NumberField({
                    initial: 0,
                    label: 'SWADE.Rank',
                }),
            }), { label: 'SWADE.Adv' }),
        }, { label: 'SWADE.Adv' }),
        status: new fields$2.SchemaField({
            isShaken: new fields$2.BooleanField({ label: 'SWADE.Shaken' }),
            isDistracted: new fields$2.BooleanField({
                label: 'SWADE.Distr',
            }),
            isVulnerable: new fields$2.BooleanField({
                label: 'SWADE.Vuln',
            }),
            isStunned: new fields$2.BooleanField({ label: 'SWADE.Stunned' }),
            isEntangled: new fields$2.BooleanField({ label: 'SWADE.Entangled' }),
            isBound: new fields$2.BooleanField({ label: 'SWADE.Bound' }),
            isIncapacitated: new fields$2.BooleanField({ label: 'SWADE.Incap' }),
        }, { label: 'SWADE.Status' }),
        initiative: new fields$2.SchemaField({
            hasHesitant: new fields$2.BooleanField({ label: 'SWADE.Hesitant' }),
            hasLevelHeaded: new fields$2.BooleanField({
                label: 'SWADE.LevelHeaded',
            }),
            hasImpLevelHeaded: new fields$2.BooleanField({
                label: 'SWADE.ImprovedLevelHeaded',
            }),
            hasQuick: new fields$2.BooleanField({ label: 'SWADE.Quick' }),
        }, { label: 'SWADE.Init' }),
    };
}
class CreatureData extends SwadeBaseActorData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...creatureSchema(),
        };
    }
    static wildcardData = (baseBennies, maxWounds) => ({
        bennies: new fields$2.SchemaField({
            value: new fields$2.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.CurrentBennies',
            }),
            max: new fields$2.NumberField({
                initial: baseBennies,
                min: 0,
                integer: true,
                label: 'SWADE.BenniesMaxNum',
            }),
        }, { label: 'SWADE.Bennies' }),
        wounds: new fields$2.SchemaField({
            value: new fields$2.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.Wounds',
            }),
            max: new fields$2.NumberField({
                initial: maxWounds,
                min: 0,
                integer: true,
                label: 'SWADE.WoundsMax',
            }),
            ignored: new fields$2.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.IgnWounds',
            }),
        }, { label: 'SWADE.Wounds' }),
    });
    static makePowerPointsSchema = () => {
        return new fields$2.SchemaField({
            value: new fields$2.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.CurPP',
            }),
            max: new fields$2.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.MaxPP',
            }),
        }, { label: 'SWADE.PP' });
    };
    static migrateData(source) {
        ensureStrengthDie(source);
        ensureCurrencyIsNumeric(source);
        ensureGeneralPowerPoints(source);
        ensurePowerPointsAreNumeric(source);
        renamePace(source);
        return super.migrateData(source);
    }
    static shimData(source) {
        _shimPace(source);
        return source;
    }
    get tokenSize() {
        const value = Math.max(1, Math.floor(this.stats.size / 4) + 1);
        return { width: value, height: value };
    }
    get encumbered() {
        if (!game.settings.get('swade', 'applyEncumbrance')) {
            return false;
        }
        const encumbrance = this.details.encumbrance;
        if (encumbrance.isEncumbered)
            return true;
        return encumbrance.value > encumbrance.max;
    }
    get isIncapacitated() {
        return (this.status.isIncapacitated ||
            this.parent?.statuses.has(CONFIG.specialStatusEffects.INCAPACITATED));
    }
    // specifying this to resolve depth issue
    prepareBaseData() {
        super.prepareBaseData();
        for (const key in this.attributes) {
            const attribute = this.attributes[key];
            attribute.effects = new Array();
        }
        //auto calculations
        if (this.details.autoCalcToughness) {
            //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
            this.stats.toughness.value = 0;
            this.stats.toughness.armor = 0;
        }
        if (this.details.autoCalcParry) {
            //same procedure as with Toughness
            this.stats.parry.value = 0;
        }
        // Prepping the parry & toughness sources
        this.stats.toughness.sources = new Array();
        this.stats.toughness.effects = new Array();
        this.stats.toughness.armorEffects = new Array();
        this.stats.parry.sources = new Array();
        this.stats.parry.effects = new Array();
        //setup the global modifier container object
        this.stats.globalMods = {
            trait: new Array(),
            agility: new Array(),
            smarts: new Array(),
            spirit: new Array(),
            strength: new Array(),
            vigor: new Array(),
            attack: new Array(),
            damage: new Array(),
            ap: new Array(),
            bennyTrait: new Array(),
            bennyDamage: new Array(),
        };
    }
    // specifying this to resolve depth issue
    prepareDerivedData() {
        super.prepareDerivedData();
        //die type bounding for attributes
        for (const key in this.attributes) {
            const attribute = this.attributes[key];
            attribute.die = boundTraitDie(attribute.die);
            attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
        }
        //handle advances
        const advances = this.advances;
        if (advances.mode === 'expanded') {
            const advRaw = foundry.utils.getProperty(this._source, 'advances.list');
            const list = new Collection();
            advRaw.forEach((adv) => list.set(adv.id, adv));
            const activeAdvances = list.filter((a) => !a.planned).length;
            advances.list = list;
            advances.value = activeAdvances;
            advances.rank = getRankFromAdvanceAsString(activeAdvances);
        }
        //set scale
        this.stats.scale = this.parent.calcScale(this.stats.size);
        //handle carry capacity
        foundry.utils.setProperty(this, 'details.encumbrance.value', this.parent.calcInventoryWeight());
        foundry.utils.setProperty(this, 'details.encumbrance.max', this.parent.calcMaxCarryCapacity());
        this.#preparePace();
        // Toughness calculation
        if (this.details.autoCalcToughness) {
            const torsoArmor = this.parent.calcArmor();
            this.stats.toughness.armor = torsoArmor;
            this.stats.toughness.value = this.parent.calcToughness() + torsoArmor;
            this.stats.toughness.sources.push({
                label: game.i18n.localize('SWADE.Armor'),
                value: torsoArmor,
            });
        }
        if (this.details.autoCalcParry) {
            this.stats.parry.value = this.parent.calcParry();
        }
        for (const item of this.parent.items) {
            item.system.prepareFormulaFields();
        }
    }
    /**
     * Creates an HTMLElement for displaying in a tooltip, adding some context to an actor's size
     */
    getSizeTooltip() {
        const scale = this.stats?.scale?.signedString();
        const element = document.createElement('div');
        const p = document.createElement('p');
        p.innerText = game.i18n.format('SWADE.Scales.Description', {
            scale: scale,
            name: getScaleName(this.stats?.scale),
        });
        element.appendChild(p);
        return element;
    }
    getParryBaseSkill() {
        return this.parent.getSingleItemBySwid(game.settings.get('swade', 'parryBaseSwid'), 'skill');
    }
    calcParry() {
        /** base value of all parry calculations */
        const parryBaseValue = 2;
        let parryTotal = 0;
        const sources = this.stats.parry.sources;
        const parryBaseSkill = this.getParryBaseSkill();
        const skillDie = parryBaseSkill?.system?.die.sides ?? 0;
        const skillMod = parryBaseSkill?.system?.die.modifier ?? 0;
        //base parry calculation
        parryTotal = Math.round(skillDie / 2) + parryBaseValue;
        //add modifier if the skill die is 12
        if (skillDie >= 12) {
            parryTotal += Math.floor(skillMod / 2);
        }
        if (parryBaseSkill) {
            sources.push({
                label: foundry.utils.getProperty(parryBaseSkill, 'name'),
                value: parryTotal,
            });
        }
        else {
            sources.push({
                label: game.i18n.localize('SWADE.BaseParry'),
                value: parryBaseValue,
            });
        }
        this.stats.parry.shield = 0;
        const itemTypes = this.parent.itemTypes;
        //add shields
        for (const shield of itemTypes.shield) {
            if (!(shield.system instanceof ShieldData))
                continue;
            if (shield.system.equipStatus === constants$1.EQUIP_STATE.EQUIPPED) {
                const shieldParry = shield.system.parry ?? 0;
                parryTotal += shieldParry;
                this.stats.parry.shield += shieldParry;
                sources.push({
                    label: shield.name,
                    value: shieldParry,
                });
            }
        }
        //add equipped weapons
        const ambidextrous = this.parent.getFlag('swade', 'ambidextrous');
        for (const weapon of itemTypes.weapon) {
            if (!(weapon.system instanceof WeaponData))
                continue;
            let parryBonus = 0;
            if (Number(weapon.system.equipStatus) >= constants$1.EQUIP_STATE.OFF_HAND) {
                // only add parry bonus if it's in the main hand or actor is ambidextrous
                if (Number(weapon.system.equipStatus) >= constants$1.EQUIP_STATE.EQUIPPED ||
                    ambidextrous)
                    parryBonus += weapon.system.parry ?? 0;
                //add trademark weapon bonus
                parryBonus += Number(weapon.system.trademark);
            }
            if (parryBonus !== 0) {
                sources.push({
                    label: weapon.name,
                    value: parryBonus,
                });
            }
            parryTotal += parryBonus;
        }
        return parryTotal;
    }
    /**
     * Creates an HTMLElement for displaying in a tooltip, adding some context to an actor's movement speed
     * @returns the constructed HTMLElement
     */
    getPaceTooltip() {
        const element = document.createElement('div');
        //current pace
        const heading = document.createElement('h4');
        heading.innerText =
            game.i18n.localize('SWADE.Movement.Base') +
                ': ' +
                game.i18n.localize('SWADE.Movement.Pace.' + this.pace.base.capitalize() + '.Label');
        element.appendChild(heading);
        //attempt to add other pace values as a list
        const availableKeys = PaceSchemaField.paceKeys
            .filter((key) => !!this.pace[key])
            .filter((key) => key !== this.pace.base);
        if (availableKeys.length) {
            const subheading = document.createElement('h5');
            subheading.innerText = game.i18n.localize('SWADE.Movement.Other');
            element.appendChild(subheading);
            const paceList = document.createElement('ul');
            for (const key of availableKeys) {
                const li = document.createElement('li');
                const localized = game.i18n.localize(`SWADE.Movement.Pace.${key.capitalize()}.Label`);
                li.innerText = `${localized}: ${this.pace[key]}`;
                paceList.appendChild(li);
            }
            element.appendChild(paceList);
        }
        //if the parent isn't a combatant add the out of combat pace
        if (!this.parent.getCombatant()) {
            element.appendChild(document.createElement('hr'));
            const p = document.createElement('span');
            const runningDie = this.pace.running.die;
            const minutes = this.attributes.vigor.die.sides / 2;
            const pace = (runningDie + this.pace.default) * 2;
            p.innerText = game.i18n.format('SWADE.Movement.Running.OutOfCombat', {
                pace,
                minutes,
            });
            element.appendChild(p);
        }
        return element;
    }
    // specifying this to resolve depth issue
    getRollData(includeModifiers = true) {
        const out = {
            wounds: this.wounds.value || 0,
            fatigue: this.fatigue.value || 0,
            pace: this.pace.default || 0,
        };
        const globalMods = this.stats.globalMods;
        // Attributes
        const attributes = this.attributes;
        for (const [key, attribute] of Object.entries(attributes)) {
            const short = key.substring(0, 3);
            const name = game.i18n.localize(SWADE.attributes[key].long);
            const die = attribute.die.sides;
            let mod = attribute.die.modifier || 0;
            if (includeModifiers) {
                mod = structuredClone([
                    {
                        label: game.i18n.localize('SWADE.TraitMod'),
                        value: attribute.die.modifier,
                    },
                    ...globalMods[key],
                    ...globalMods.trait,
                ])
                    .filter((m) => m.ignore !== true)
                    .reduce(addUpModifiers, 0);
            }
            let modString = mod !== 0 ? mod.signedString() : '';
            if (mod)
                modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
            let val = `1d${die}x[${name}]${modString}`;
            if (die <= 1)
                val = `1d${die}[${name}]${modString}`;
            out[short] = val;
        }
        for (const skill of this.parent.itemTypes.skill) {
            const die = skill.system.die.sides;
            let mod = skill.system.die.modifier;
            if (includeModifiers)
                mod = skill.modifier;
            const name = skill.name.slugify({ strict: true });
            let modString = mod !== 0 ? mod.signedString() : '';
            if (mod)
                modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
            out[name] = `1d${die}[${skill.name}]${modString}`;
        }
        return { ...out, ...super.getRollData() };
    }
    // specifying this to resolve depth issue
    async refreshBennies(notify = true) {
        if (notify && game.settings.get('swade', 'notifyBennies')) {
            const message = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.refresh, {
                target: this.parent,
                speaker: getDocumentClass('ChatMessage').getSpeaker({
                    actor: this.parent,
                }),
            });
            const chatData = { content: message };
            getDocumentClass('ChatMessage').create(chatData);
        }
        let newValue = this.bennies.max;
        const hardChoices = game.settings.get('swade', 'hardChoices');
        if (hardChoices && this.wildcard && !this.parent.hasPlayerOwner) {
            newValue = 0;
        }
        await this.parent.update({ 'system.bennies.value': newValue });
        /**
         * Called an actor refreshes their bennies
         * @param {SwadeActor} actor            The Actor refreshing their bennies
         */
        Hooks.callAll('swadeRefreshBennies', this.parent);
    }
    #preparePace() {
        const encumbered = this.encumbered;
        const woundPenalties = this.parent?.calcWoundPenalties(false) ?? 0;
        const enableWoundPace = game.settings.get('swade', 'enableWoundPace');
        for (const key of PaceSchemaField.paceKeys) {
            if (this.pace[key] === null)
                continue; //skip null values
            let value = this.pace[key];
            if (enableWoundPace)
                value += woundPenalties; //modify pace with wounds, core rules p. 95
            if (encumbered)
                value -= 2; //subtract encumbrance, if necessary
            this.pace[key] = Math.max(value, 1); //Clamp the pace so it's a minimum of 1
        }
        this.pace.default = this.pace[this.pace.base];
    }
    async _preUpdate(changed, options, user) {
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false)
            return false;
        if (foundry.utils.hasProperty(changed, 'system.wounds.value')) {
            foundry.utils.setProperty(options, 'swade.wounds.value', this.wounds.value);
        }
        if (foundry.utils.hasProperty(changed, 'system.fatigue.value')) {
            foundry.utils.setProperty(options, 'swade.fatigue.value', this.fatigue.value);
        }
    }
}

class CharacterData extends CreatureData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...this.wildcardData(3, 3),
        };
    }
    get wildcard() {
        return true;
    }
    get #startingCurrency() {
        return game.settings.get('swade', 'pcStartingCurrency') ?? 0;
    }
    async #addCoreSkills() {
        //Get list of core skills from settings
        const coreSkills = game.settings
            .get('swade', 'coreSkills')
            .split(',')
            .map((s) => s.trim());
        //only do this if this is a PC with no prior skills
        if (coreSkills.length > 0 && this.parent.itemTypes.skill.length === 0) {
            const coreSkillsPack = game.settings.get('swade', 'coreSkillsCompendium');
            //Set compendium source, including a fallback to the system compendium of the required one cannot be found
            const pack = (game.packs.get(coreSkillsPack) ??
                game.packs.get('swade.skills'));
            if (!pack)
                return; //critical fallback point, simply skip core skills if neither pack can be located
            const skillIndex = await pack.getDocuments();
            // extract skill data
            const skills = skillIndex
                .filter((i) => i.type === 'skill')
                .filter((i) => coreSkills.includes(i.name))
                .map((s) => s.toObject());
            // Create core skills not in compendium (for custom skill names entered by the user)
            for (const skillName of coreSkills) {
                if (!skillIndex.find((skill) => skillName === skill.name)) {
                    skills.push({
                        name: skillName,
                        type: 'skill',
                        img: 'systems/swade/assets/icons/skill.svg',
                        system: { attribute: '' },
                    });
                }
            }
            //set all the skills to be core skills
            for (const skill of skills) {
                if (skill.type === 'skill')
                    skill.system.isCoreSkill = true;
            }
            //Add the Untrained skill
            skills.push({
                name: game.i18n.localize('SWADE.Unskilled'),
                type: 'skill',
                img: 'systems/swade/assets/icons/skill.svg',
                system: {
                    attribute: '',
                    die: {
                        sides: 4,
                        modifier: -2,
                    },
                },
            });
            //Add the items to the creation data
            this.parent.updateSource({ items: skills });
        }
    }
    async _preCreate(createData, options, user) {
        const allowed = await super._preCreate(createData, options, user);
        if (allowed === false)
            return false;
        this.parent.updateSource({
            prototypeToken: {
                actorLink: true,
                disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
            },
        });
        await this.#addCoreSkills();
        //Handle starting currency
        if (!this.parent._stats.compendiumSource &&
            !this.parent._stats.duplicateSource) {
            this.updateSource({ 'details.currency': this.#startingCurrency });
        }
    }
    async toEmbed(config, options) {
        config.caption = false;
        // Enrich biography text
        this.enrichedBiography =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.details.biography.value, { ...options });
        // Combine weapons and armor into a displayable gear array
        const displayableGear = this.parent.itemTypes.armor.concat(this.parent.itemTypes.weapon);
        foundry.utils.setProperty(this, 'displayableGear', displayableGear);
        // Enrich and strip ability descriptions to plain text
        if (this.parent.itemTypes.ability) {
            for (const ability of this.parent.itemTypes.ability) {
                const enrichedHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(ability.system.description, { ...options });
                ability.plainTextDescription = enrichedHTML.replace(/<[^>]*>/g, ''); // Strip HTML tags
            }
        }
        // Create the embed element
        const embed = await createEmbedElement(this, 'systems/swade/templates/embeds/actor-embeds.hbs', ['actor-embed', 'character']);
        if (embed) {
            Hooks.callAll('swadeActorEmbed', embed, this.parent, config, options);
        }
        return embed;
    }
}

var index$6 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CreatureData: CreatureData,
    SwadeBaseActorData: SwadeBaseActorData
});

const fields$1 = foundry.data.fields;
class GroupData extends SwadeBaseActorData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            members: new fields$1.SetField(new ForeignDocumentUUIDField({
                type: 'Actor',
                validate: (value, _options) => {
                    if (value.startsWith('Compendium')) {
                        return new foundry.data.validation.DataModelValidationFailure({
                            unresolved: true,
                            invalidValue: value,
                            message: 'Groups cannot contain actors from Compendiums!',
                        });
                    }
                },
            }), {
                label: 'SWADE.Group.Sheet.Members.Header',
                hint: 'SWADE.Group.Sheet.Members.Hint',
            }),
            description: new fields$1.HTMLField({ textSearch: true }),
            locked: new fields$1.BooleanField({
                gmOnly: true,
                label: 'SWADE.Group.Sheet.Lock.Label',
                hint: 'SWADE.Group.Sheet.Lock.Hint',
            }),
            supplyLevels: this.makeSupplyLevelSchema(),
            currency: new fields$1.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.Currency',
                hint: 'SWADE.Currency',
            }), // New currency field
        };
    }
    static #supplyLevelField = (label) => new fields$1.NumberField({
        initial: constants$1.SUPPLY_LEVEL.HIGH,
        integer: true,
        choices: {
            [constants$1.SUPPLY_LEVEL.OUT]: 'SWADE.Supplies.Level.Out',
            [constants$1.SUPPLY_LEVEL.LOW]: 'SWADE.Supplies.Level.Low',
            [constants$1.SUPPLY_LEVEL.HIGH]: 'SWADE.Supplies.Level.High',
            [constants$1.SUPPLY_LEVEL.VERY_HIGH]: 'SWADE.Supplies.Level.VeryHigh',
        },
        label,
    });
    static makeSupplyLevelSchema = () => new fields$1.SchemaField({
        ammo: this.#supplyLevelField('SWADE.Supplies.Ammo.Label'),
        fuel: this.#supplyLevelField('SWADE.Supplies.Fuel.Label'),
        food: this.#supplyLevelField('SWADE.Supplies.Food.Label'),
        supply: this.#supplyLevelField('SWADE.Supplies.Supply.Label'),
    }, { label: 'SWADE.Supplies.Label' });
    prepareBaseData() {
        super.prepareBaseData();
        this.members = new Map(this.members.map((fn) => {
            const result = fn();
            if (typeof result === 'string')
                return [result, { actor: null }];
            return [result.uuid, { actor: result }];
        }));
    }
    get wildcard() {
        return false;
    }
}

const fields = foundry.data.fields;
class NpcData extends CreatureData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...this.wildcardData(2, 0),
            wildcard: new fields.BooleanField({
                initial: false,
                label: 'SWADE.WildCard',
            }),
        };
    }
    get #startingCurrency() {
        return game.settings.get('swade', 'npcStartingCurrency') ?? 0;
    }
    async _preCreate(createData, options, user) {
        const allowed = await super._preCreate(createData, options, user);
        if (allowed === false)
            return false;
        //Handle starting currency
        if (!this.parent._stats.compendiumSource &&
            !this.parent._stats.duplicateSource) {
            this.updateSource({ 'details.currency': this.#startingCurrency });
        }
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        ui.actors?.render(true);
    }
    async toEmbed(config, options) {
        config.caption = false;
        // Enrich biography text
        this.enrichedBiography =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.details.biography.value, { ...options });
        // Combine weapons and armor into a displayable gear array
        const displayableGear = this.parent.itemTypes.armor.concat(this.parent.itemTypes.weapon);
        foundry.utils.setProperty(this, 'displayableGear', displayableGear);
        // Enrich and strip ability descriptions to plain text
        if (this.parent.itemTypes.ability) {
            for (const ability of this.parent.itemTypes.ability) {
                const enrichedHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(ability.system.description, { ...options });
                ability.plainTextDescription = enrichedHTML.replace(/<[^>]*>/g, ''); // Strip HTML tags
            }
        }
        // Create the embed element
        const embed = await createEmbedElement(this, 'systems/swade/templates/embeds/actor-embeds.hbs', ['actor-embed', 'npc']);
        if (embed) {
            Hooks.callAll('swadeActorEmbed', embed, this.parent, config, options);
        }
        return embed;
    }
}

function validateCrewMember(value, _options) {
    const actor = fromUuidSync(value.uuid);
    // Optional chaining `actor.type` so that on game load, when `fromUuidSync` can only return null, this doesn't throw.
    if (['vehicle', 'group'].includes(actor?.type)) {
        return new foundry.data.validation.DataModelValidationFailure({
            unresolved: true,
            invalidValue: value,
            message: `Cannot contain an actor of type ${actor.type}!`,
        });
    }
}
function createVehicleSchema() {
    const fields = foundry.data.fields;
    return {
        attributes: new fields.SchemaField({
            // Found in HC Haunted Car
            agility: new fields.SchemaField({
                ...makeTraitDiceFields(),
                enabled: new fields.BooleanField({
                    label: 'SWADE.VehicleAttributes.Agility',
                }),
            }, {
                label: 'SWADE.AttrAgi',
            }),
            // HC Haunted Car & Sentient Vehicles
            smarts: new fields.SchemaField({
                ...makeTraitDiceFields(),
                enabled: new fields.BooleanField({
                    label: 'SWADE.VehicleAttributes.Smarts',
                }),
            }, { label: 'SWADE.AttrSma' }),
            // HC Haunted Car & Sentient Vehicles
            spirit: new fields.SchemaField({
                ...makeTraitDiceFields(),
                enabled: new fields.BooleanField({
                    label: 'SWADE.VehicleAttributes.Spirit',
                }),
            }, { label: 'SWADE.AttrSpr' }),
            strength: new fields.SchemaField({
                ...makeTraitDiceFields(),
                encumbranceSteps: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.EncumbranceSteps',
                }),
                enabled: new fields.BooleanField({
                    label: 'SWADE.VehicleAttributes.Strength',
                }),
            }, { label: 'SWADE.AttrStr' }),
            vigor: new fields.SchemaField({
                ...makeTraitDiceFields(),
                enabled: new fields.BooleanField({
                    label: 'SWADE.VehicleAttributes.Vigor',
                }),
            }, { label: 'SWADE.AttrVig' }),
        }, { label: 'SWADE.Attributes' }),
        size: new fields.NumberField({
            initial: 0,
            integer: true,
            nullable: false,
            label: 'SWADE.Size',
        }),
        scale: new fields.NumberField({
            initial: 0,
            integer: true,
            nullable: false,
            label: 'SWADE.Scale',
        }),
        classification: new fields.StringField({
            initial: '',
            textSearch: true,
            label: 'SWADE.Class',
        }),
        handling: new fields.NumberField({
            initial: 0,
            integer: true,
            label: 'SWADE.Handling',
        }),
        cost: new fields.NumberField({ initial: 0, label: 'SWADE.Price' }),
        topspeed: new fields.SchemaField({
            value: new fields.NumberField({
                initial: 0,
                min: 0,
                label: 'SWADE.Topspeed',
            }),
            unit: new fields.StringField({ label: 'SWADE.SpeedUnit' }),
        }, { label: 'SWADE.Topspeed' }),
        description: new fields.HTMLField({
            initial: '',
            textSearch: true,
            label: 'SWADE.Desc',
        }),
        toughness: new fields.SchemaField({
            total: new fields.NumberField({ initial: 0, label: 'SWADE.Tough' }),
            armor: new fields.NumberField({ initial: 0, label: 'SWADE.Armor' }),
        }, { label: 'SWADE.Tough' }),
        wounds: new fields.SchemaField({
            value: new fields.NumberField({
                initial: 0,
                min: 0,
                integer: true,
                label: 'SWADE.Wounds',
            }),
            max: new fields.NumberField({
                initial: 3,
                min: 0,
                integer: true,
                label: 'SWADE.WoundsMax',
            }),
            ignored: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.IgnWounds',
            }),
        }, { label: 'SWADE.Wounds' }),
        stats: new fields.SchemaField({
            parry: new fields.SchemaField({
                value: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.Parry',
                }),
                shield: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    label: 'SWADE.ShieldBonus',
                }),
                modifier: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    required: false,
                    label: 'SWADE.Modifier',
                }),
            }, { label: 'SWADE.Parry' }),
        }),
        energy: new fields.SchemaField({
            value: new fields.NumberField({
                initial: 0,
                integer: true,
                min: 0,
                label: 'SWADE.Energy.Value',
            }),
            max: new fields.NumberField({
                initial: 0,
                integer: true,
                min: 0,
                label: 'SWADE.Energy.Max',
            }),
            enabled: new fields.BooleanField({ label: 'SWADE.Energy.Enable' }),
        }, { label: 'SWADE.Energy.Label' }),
        crew: new fields.SchemaField({
            required: new fields.SchemaField({
                max: new fields.NumberField({
                    initial: 1,
                    integer: true,
                    min: 0,
                    label: 'SWADE.MaxLabel',
                }),
            }, { label: 'SWADE.RequiredCrew' }),
            optional: new fields.SchemaField({
                value: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    min: 0,
                    label: 'SWADE.Value',
                }),
                max: new fields.NumberField({
                    initial: 0,
                    integer: true,
                    min: 0,
                    label: 'SWADE.MaxLabel',
                }),
            }, { label: 'SWADE.Passengers' }),
            members: new fields.ArrayField(new MemberField({
                role: new fields.StringField({
                    initial: constants$1.CREW_ROLE.GUNNER,
                    choices: {
                        [constants$1.CREW_ROLE.OPERATOR]: 'SWADE.Vehicle.Crew.Roles.Operator',
                        [constants$1.CREW_ROLE.GUNNER]: 'SWADE.Vehicle.Crew.Roles.Gunner',
                        [constants$1.CREW_ROLE.OTHER]: 'SWADE.Vehicle.Crew.Roles.Other',
                    },
                    label: 'SWADE.Vehicle.Crew.Role',
                }),
                sort: new fields.IntegerSortField(),
                weapons: new fields.ArrayField(new LocalDocumentField(SwadeItem, { types: ['weapon'] })),
            }, { validate: validateCrewMember })),
        }, { label: 'SWADE.Crew' }),
        driver: new fields.SchemaField({
            skill: new fields.StringField({
                initial: '',
                label: 'SWADE.OpSkill',
            }),
            skillAlternative: new fields.StringField({
                initial: '',
                label: 'SWADE.AltSkill',
            }),
        }, { label: 'SWADE.Operator' }),
        status: new fields.SchemaField({
            isOutOfControl: new fields.BooleanField({
                label: 'SWADE.OutOfControl',
            }),
            isWrecked: new fields.BooleanField({ label: 'SWADE.Wrecked' }),
            isDistracted: new fields.BooleanField({
                label: 'SWADE.Distr',
            }),
            isVulnerable: new fields.BooleanField({
                label: 'SWADE.Vuln',
            }),
        }, { label: 'SWADE.Status' }),
        details: new fields.SchemaField({
            autoCalcParry: new fields.BooleanField({
                initial: true,
                hint: 'SWADE.AutoCalcParry',
            }),
        }, { label: 'SWADE.Details' }),
        initiative: new fields.SchemaField({
            hasHesitant: new fields.BooleanField({ label: 'SWADE.Hesitant' }),
            hasLevelHeaded: new fields.BooleanField({
                label: 'SWADE.LevelHeaded',
            }),
            hasImpLevelHeaded: new fields.BooleanField({
                label: 'SWADE.ImprovedLevelHeaded',
            }),
            hasQuick: new fields.BooleanField({ label: 'SWADE.Quick' }),
        }, { label: 'SWADE.Init' }),
        cargo: new fields.SchemaField({
            max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxCargo' }),
        }),
        mods: new fields.SchemaField({
            max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxMods' }),
        }),
    };
}
class VehicleData extends SwadeBaseActorData {
    static defineSchema() {
        return {
            ...super.defineSchema(),
            ...createVehicleSchema(),
        };
    }
    static migrateData(source) {
        splitTopSpeed(source);
        shiftCargoModsMax(source);
        migrateDriver(source);
        return super.migrateData(source);
    }
    get encumbered() {
        return false;
    }
    get wildcard() {
        return false;
    }
    get tokenSize() {
        const value = Math.max(1, Math.floor(this.size / 4) + 1);
        return { width: value, height: value };
    }
    get operators() {
        return this.crew.members
            .filter((m) => !!m.actor && m.role === constants$1.CREW_ROLE.OPERATOR)
            .map((m) => m.actor);
    }
    get operator() {
        return this.operators[0] ?? null;
    }
    async rollManeuverCheck(actor = this.operator) {
        //Return early if no driver was found
        if (!actor)
            return;
        //Get skillname
        const skillName = this.driver.skill || this.driver.skillAlternative;
        // Calculate the final handling
        const handling = this.handling;
        const wounds = this.parent.calcWoundPenalties();
        //Handling is capped at a certain penalty
        const totalHandling = Math.max(handling + wounds, SWADE.vehicles.maxHandlingPenalty);
        //Find the operating skill
        const skill = actor.itemTypes.skill.find((i) => i.name === skillName);
        return actor.rollSkill(skill?.id, {
            additionalMods: [
                {
                    label: game.i18n.localize('SWADE.Handling'),
                    value: totalHandling,
                },
            ],
        });
    }
    prepareBaseData() {
        super.prepareBaseData();
        //setup the global modifier container object
        this.stats.globalMods = {
            attack: new Array(),
            damage: new Array(),
            ap: new Array(),
            agility: new Array(),
            smarts: new Array(),
            spirit: new Array(),
            strength: new Array(),
            vigor: new Array(),
            trait: new Array(),
        };
        this.stats.parry.sources = new Array();
        this.stats.parry.effects = new Array();
        //parry autocalc
        if (this.details.autoCalcParry)
            this.stats.parry.value = 0;
        for (const attribute of Object.values(this.attributes)) {
            attribute.effects = new Array();
        }
        this.mods.value = 0;
        this.cargo.value = 0;
        this.crew.members = this.crew.members
            .sort((a, b) => a.sort - b.sort)
            .map(this._mapCrewMember.bind(this));
        this.crew.required.value = this.crew.members.length;
    }
    prepareDerivedData() {
        super.prepareDerivedData();
        //die type bounding for attributes
        for (const key in this.attributes) {
            const attribute = this.attributes[key];
            attribute.die = boundTraitDie(attribute.die);
            attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
        }
        this.scale = this.parent.calcScale(this.size);
        this.mods.value += this.parent.items.reduce((total, i) => {
            // probably need to check for equip status too
            if ('mods' in i.system &&
                i.system.isVehicular &&
                i.system.equipStatus > constants$1.EQUIP_STATE.CARRIED) {
                return total + (i.system.mods ?? 0);
            }
            return total;
        }, 0);
        this.cargo.items = this.#prepareCargo();
        this.cargo.value = this.cargo.items.reduce((acc, item) => {
            return acc + (item.system.quantity ?? 0) * (item.system.weight ?? 0);
        }, 0);
        if (this.details.autoCalcParry)
            this.stats.parry.value = this.parent.calcParry();
    }
    getParryBaseSkill() {
        const skillCandidates = this.operator?.itemTypes.skill ?? [];
        return (skillCandidates.find((s) => s.name === this.driver.skill) ||
            skillCandidates.find((s) => s.name === this.driver.skillAlternative));
    }
    calcParry() {
        /** base value of all parry calculations */
        const parryBaseValue = 2;
        let parryTotal = 0;
        const sources = this.stats.parry.sources;
        const parryBaseSkill = this.getParryBaseSkill();
        const skillDie = parryBaseSkill?.system?.die.sides ?? 0;
        const skillMod = parryBaseSkill?.system?.die.modifier ?? 0;
        //base parry calculation
        parryTotal = Math.round(skillDie / 2) + parryBaseValue;
        //add modifier if the skill die is 12
        if (skillDie >= 12) {
            parryTotal += Math.floor(skillMod / 2);
        }
        if (parryBaseSkill) {
            sources.push({
                label: foundry.utils.getProperty(parryBaseSkill, 'name'),
                value: parryTotal,
            });
        }
        else {
            sources.push({
                label: game.i18n.localize('SWADE.BaseParry'),
                value: parryBaseValue,
            });
        }
        this.stats.parry.shield = 0;
        const itemTypes = this.parent.itemTypes;
        //add shields
        for (const shield of itemTypes.shield) {
            if (!(shield.system instanceof ShieldData))
                continue;
            if (shield.system.equipStatus === constants$1.EQUIP_STATE.EQUIPPED) {
                const shieldParry = shield.system.parry ?? 0;
                parryTotal += shieldParry;
                this.stats.parry.shield += shieldParry;
                sources.push({
                    label: shield.name,
                    value: shieldParry,
                });
            }
        }
        //add equipped weapons
        const ambidextrous = this.parent.getFlag('swade', 'ambidextrous');
        for (const weapon of itemTypes.weapon) {
            if (!(weapon.system instanceof WeaponData))
                continue;
            let parryBonus = 0;
            if (Number(weapon.system.equipStatus) >= constants$1.EQUIP_STATE.OFF_HAND) {
                // only add parry bonus if it's in the main hand or actor is ambidextrous
                if (Number(weapon.system.equipStatus) >= constants$1.EQUIP_STATE.EQUIPPED ||
                    ambidextrous)
                    parryBonus += weapon.system.parry ?? 0;
                //add trademark weapon bonus
                parryBonus += Number(weapon.system.trademark);
            }
            if (parryBonus !== 0) {
                sources.push({
                    label: weapon.name,
                    value: parryBonus,
                });
            }
            parryTotal += parryBonus;
        }
        return parryTotal;
    }
    getCrewMemberForWeapon(weapon) {
        if (weapon.type !== 'weapon')
            return;
        const user = this.crew.members
            .filter((m) => m.weapons.map((i) => i.id).includes(weapon.id))
            .find((m) => m.actor?.type === 'npc' || m.actor?.isOwner)?.actor;
        return user;
    }
    async toEmbed(config, options) {
        config.caption = false;
        this.enrichedDescription =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
                ...options,
            });
        const embed = await createEmbedElement(this, 'systems/swade/templates/embeds/vehicle-embeds.hbs', ['actor-embed', 'vehicle']);
        if (embed) {
            Hooks.callAll('swadeActorEmbed', embed, this.parent, config, options);
        }
        return embed;
    }
    getRollData() {
        const out = {
            wounds: this.wounds.value || 0,
            topspeed: this.topspeed.value || 0,
        };
        return { ...out, ...super.getRollData() };
    }
    _mapCrewMember(member) {
        const actor = member.uuid;
        if (typeof actor === 'string')
            return { ...member, actor: null };
        const weapons = member.weapons.map((fn) => fn());
        return {
            ...member,
            name: actor.token?.name ?? actor.name,
            img: actor.token?.texture?.src ?? actor.img,
            uuid: actor.uuid,
            actor,
            weapons,
        };
    }
    #prepareCargo() {
        const itemTypes = this.parent.itemTypes;
        const notMod = (i) => !i.system.isVehicular ||
            i.system.equipStatus < constants$1.EQUIP_STATE.EQUIPPED;
        return [
            ...itemTypes.gear.filter(notMod),
            ...itemTypes.weapon.filter(notMod),
            ...itemTypes.armor,
            ...itemTypes.shield,
            ...itemTypes.consumable,
        ];
    }
}

const config$4 = {
    character: CharacterData,
    npc: NpcData,
    vehicle: VehicleData,
    group: GroupData,
};

var index$5 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CharacterData: CharacterData,
    GroupData: GroupData,
    NpcData: NpcData,
    VehicleData: VehicleData,
    base: index$6,
    config: config$4
});

class SwadeActor extends Actor {
    static getWoundsColor(current, max) {
        const minDegrees = 30;
        const maxDegrees = 120;
        //get the degrees on the HSV wheel, going from 30° (greenish-yellow) to 120° (green)
        const degrees = mapRange(current, 0, max, minDegrees, maxDegrees);
        //invert the degrees and map them from 0 to a third
        const hue = mapRange(maxDegrees - degrees, 0, maxDegrees, 0, 1 / 3);
        //get a usable color value with 100% saturation and 90% value
        return Color.fromHSV([hue, 1, 0.9]);
    }
    static getFatigueColor(current, max) {
        //get the angle (200°) and map it into the proper range
        const hue = mapRange(200, 0, 360, 0, 1);
        //get the value from the parameter
        const value = mapRange(current, 0, max, 0, 1);
        return Color.fromHSV([hue, value, 0.75]);
    }
    static migrateData(data) {
        super.migrateData(data);
        if (data.flags?.swade?.auras) {
            data.system ??= {};
            data.system.auras = data.flags.swade.auras;
            delete data.flags.swade.auras;
        }
        return data;
    }
    constructor(data, ctx) {
        if (game.swade.ready && ctx?.pack && data._id) {
            const art = game.swade.compendiumArt.map.get(`Compendium.${ctx.pack}.${data._id}`);
            if (art) {
                data.img = art.actor;
                const tokenArt = typeof art.token === 'string'
                    ? { texture: { src: art.token } }
                    : {
                        texture: {
                            src: art.token.img,
                            scaleX: art.token.scale,
                            scaleY: art.token.scale,
                        },
                    };
                data.prototypeToken = foundry.utils.mergeObject(data.prototypeToken ?? {}, tokenArt);
            }
        }
        super(data, ctx);
    }
    // Does not appear to work properly
    // isType<TypeName extends SystemActorTypes>(
    //   type: TypeName,
    // ): this is SwadeActor<TypeName> {
    //   return type === this.type;
    // }
    /** @returns true when the actor is a Wild Card */
    get isWildcard() {
        return !!this.system.wildcard;
    }
    /** @returns true when the actor has an arcane background or a special ability that grants powers. */
    get hasArcaneBackground() {
        return !!this.items.find((i) => (i.system instanceof EdgeData && i.system.isArcaneBackground) ||
            (i.system instanceof AbilityData && i.system.grantsPowers));
    }
    /** @returns whether the actor has any power items at all */
    get hasPowers() {
        return !!this.items.find((i) => i.type === 'power');
    }
    get tokenSize() {
        if ('tokenSize' in this.system)
            return this.system.tokenSize;
        return { height: 1, width: 1 };
    }
    /** @returns true when the actor is currently in combat and has drawn a joker */
    get hasJoker() {
        const combatant = this.getCombatant(game.combats?.active);
        return combatant?.hasJoker ?? false;
    }
    get bennies() {
        if (!('bennies' in this.system))
            return 0;
        return this.system.bennies.value;
    }
    /** @returns an object that contains booleans which denote the current status of the actor */
    get status() {
        if (!('status' in this.system))
            return {};
        return this.system.status;
    }
    get armorPerLocation() {
        return {
            head: this._getArmorForLocation(constants$1.ARMOR_LOCATIONS.HEAD),
            torso: this._getArmorForLocation(constants$1.ARMOR_LOCATIONS.TORSO),
            arms: this._getArmorForLocation(constants$1.ARMOR_LOCATIONS.ARMS),
            legs: this._getArmorForLocation(constants$1.ARMOR_LOCATIONS.LEGS),
        };
    }
    get hasHeavyArmor() {
        return this.itemTypes.armor.some((a) => !!foundry.utils.getProperty(a, 'system.isHeavyArmor') &&
            foundry.utils.getProperty(a, 'system.equipStatus') >=
                constants$1.EQUIP_STATE.EQUIPPED);
    }
    get isUnarmored() {
        return this.itemTypes.armor.every((a) => foundry.utils.getProperty(a, 'system.equipStatus') <
            constants$1.EQUIP_STATE.EQUIPPED);
    }
    get ancestry() {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return;
        const ancestries = this.items.filter((i) => i.type === 'ancestry');
        if (ancestries.length > 1) {
            Logger.warn(`Actor ${this.name} (${this.id}) has more than one ancestry!`);
        }
        return ancestries[0];
    }
    get archetype() {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return;
        const archetypes = this.items.filter((i) => i.type === 'ability' &&
            i.system.subtype === 'archetype');
        if (archetypes.length > 1) {
            Logger.warn(`Actor ${this.name} (${this.id}) has more than one archetype!`);
        }
        return archetypes[0];
    }
    get itemTypes() {
        const types = super.itemTypes;
        //sort the items before returning them
        for (const type in types) {
            types[type].sort((a, b) => a.sort - b.sort);
        }
        return types;
    }
    prepareEmbeddedDocuments() {
        this._embeddedPreparation = true;
        if (this.system instanceof SwadeBaseActorData) {
            this.system.prepareEmbeddedDocuments();
        }
        else
            super.prepareEmbeddedDocuments();
        delete this._embeddedPreparation;
    }
    prepareDerivedData() {
        this._filterOverrides();
        /**
         * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
         * @category Hooks
         * @param {SwadeActor} actor                The actor whose data is being prepared
         */
        Hooks.callAll('swadeActorPrepareDerivedData', this);
    }
    async rollAttribute(attribute, options = {}) {
        if (!('attributes' in this.system))
            return null;
        if (options.rof && options.rof > 1) {
            ui.notifications.warn('Attribute Rolls with RoF greater than 1 are not currently supported');
        }
        const label = SWADE.attributes[attribute].long;
        const abl = this.system.attributes[attribute];
        const rolls = new Array();
        rolls.push(Roll.fromTerms([
            this._buildTraitDie(abl.die.sides, game.i18n.localize(label)),
        ]));
        if (this.isWildcard) {
            rolls.push(Roll.fromTerms([this._buildWildDie(abl['wild-die'].sides)]));
        }
        const basePool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
        basePool.modifiers.push('kh');
        const effects = structuredClone([
            ...abl.effects,
            ...this.system.stats.globalMods[attribute],
            ...this.system.stats.globalMods.trait,
        ]);
        if (options.additionalMods) {
            options.additionalMods.push(...effects);
        }
        else {
            options.additionalMods = effects;
        }
        const modifiers = this.getTraitRollModifiers(abl.die, options, game.i18n.localize(label));
        //add encumbrance penalty if necessary
        if (attribute === 'agility' && this.system.encumbered) {
            modifiers.push({
                label: game.i18n.localize('SWADE.Encumbered'),
                value: -2,
            });
        }
        const roll = TraitRoll.fromTerms([basePool]);
        roll.modifiers = modifiers;
        if ('isRerollable' in options)
            roll.setRerollable(options.isRerollable);
        /**
         * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
         * Returning `false` in a hook callback will cancel the roll entirely
         * @category Hooks
         * @param {SwadeActor} actor                The actor that rolls the attribute
         * @param {String} attribute                The name of the attribute, in lower case
         * @param {TraitRoll} roll                  The built base roll, without any modifiers
         * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
         * @param {IRollOptions} options            The options passed into the roll function
         */
        const permitContinue = Hooks.call('swadePreRollAttribute', this, attribute, roll, modifiers, options);
        if (permitContinue === false)
            return null;
        if (options.suppressChat) {
            return TraitRoll.fromTerms([
                ...roll.terms,
                ...TraitRoll.parse(roll.modifiers.reduce(modifierReducer, ''), this.getRollData(false)),
            ]);
        }
        // Roll and return
        const retVal = await RollDialog.asPromise({
            roll: roll,
            mods: modifiers,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            flavor: options.flavour ??
                `${game.i18n.localize(label)} ${game.i18n.localize('SWADE.AttributeTest')}`,
            title: options.title ??
                `${game.i18n.localize(label)} ${game.i18n.localize('SWADE.AttributeTest')}`,
            actor: this,
        });
        /**
         * A hook event that is fired after an attribute is rolled
         * @category Hooks
         * @param {SwadeActor} actor                The actor that rolls the attribute
         * @param {String} attribute                The name of the attribute, in lower case
         * @param {TraitRoll} roll                  The built base roll, without any modifiers
         * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
         * @param {IRollOptions} options            The options passed into the roll function
         */
        Hooks.callAll('swadeRollAttribute', this, attribute, roll, modifiers, options);
        return retVal;
    }
    async rollSkill(skillId, options = { rof: 1 }, tempSkill) {
        if (this.system instanceof VehicleData ||
            this.system instanceof GroupData) {
            Logger.error('Only Extras and Wildcards can roll skills!', {
                toast: true,
            });
            return null;
        }
        let skill;
        skill = this.items.find((i) => i.id == skillId);
        if (tempSkill)
            skill = tempSkill;
        if (!skill)
            return this.makeUnskilledAttempt(options);
        const skillRoll = this._handleComplexSkill(skill, options);
        const roll = skillRoll[0];
        const modifiers = skillRoll[1];
        roll.modifiers = modifiers;
        if ('isRerollable' in options)
            roll.setRerollable(options.isRerollable);
        //Build Flavour
        let flavour = '';
        if (options.flavour)
            flavour = ` - ${options.flavour}`;
        /**
         * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
         * Returning `false` in a hook callback will cancel the roll entirely
         * @category Hooks
         * @param {SwadeActor} actor                The actor that rolls the skill
         * @param {SwadeItem} skill                 The Skill item that is being rolled
         * @param {TraitRoll} roll                  The built base roll, without any modifiers
         * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
         * @param {IRollOptions} options            The options passed into the roll function
         */
        const permitContinue = Hooks.call('swadePreRollSkill', this, skill, roll, modifiers, options);
        if (!permitContinue)
            return null;
        if (options.suppressChat) {
            return TraitRoll.fromTerms([
                ...roll.terms,
                ...TraitRoll.parse(roll.modifiers.reduce(modifierReducer, ''), this.getRollData(false)),
            ]);
        }
        const rollDialogContext = {
            roll: roll,
            mods: modifiers,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            flavor: options.flavour ??
                `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}${flavour}`,
            title: options.title ??
                `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}`,
            actor: this,
        };
        if (options.item)
            rollDialogContext.item = options.item;
        // Roll and return
        const retVal = await RollDialog.asPromise(rollDialogContext);
        /**
         * A hook event that is fired after a skill is rolled
         * @category Hooks
         * @param {SwadeActor} actor                The actor that rolls the skill
         * @param {SwadeItem} skill                 The Skill item that is being rolled
         * @param {TraitRoll} roll                  The built base roll, without any modifiers
         * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
         * @param {IRollOptions} options            The options passed into the roll function
         */
        Hooks.callAll('swadeRollSkill', this, skill, roll, modifiers, options);
        return retVal;
    }
    async rollWealthDie() {
        if (!('details' in this.system))
            return null;
        const die = this.system.details.wealth.die ?? 6;
        const mod = this.system.details.wealth.modifier ?? 0;
        const wildDie = this.system.details.wealth['wild-die'] ?? 6;
        if (die < 4) {
            ui.notifications.warn('SWADE.WealthDie.Broke.Hint', { localize: true });
            return null;
        }
        const rolls = [
            Roll.fromTerms([
                this._buildTraitDie(die, game.i18n.localize('SWADE.WealthDie.Label')),
            ]),
        ];
        if (this.isWildcard) {
            rolls.push(Roll.fromTerms([this._buildWildDie(wildDie)]));
        }
        const pool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
        pool.modifiers.push('kh');
        const roll = SwadeRoll.fromTerms([pool]);
        const mods = [{ label: 'Modifier', value: mod }];
        roll.modifiers = mods;
        return RollDialog.asPromise({
            roll: roll,
            mods: mods,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            actor: this,
            flavor: game.i18n.localize('SWADE.WealthDie.Label'),
            title: game.i18n.localize('SWADE.WealthDie.Label'),
        });
    }
    async rollRunningDie() {
        if (this.system instanceof VehicleData ||
            this.system instanceof GroupData) {
            return null;
        }
        const system = this.system;
        const availableKeys = PaceSchemaField.paceKeys.filter((key) => !!system.pace[key]);
        let paceKey = availableKeys[0];
        if (Object.keys(availableKeys).length > 1) {
            paceKey = await foundry.applications.api.DialogV2.wait({
                window: {
                    title: 'SWADE.Movement.Running.Dialog.Title',
                },
                content: `<p>${game.i18n.localize('SWADE.Movement.Running.Dialog.Content')}</p>`,
                buttons: availableKeys.map((key) => {
                    return {
                        label: `SWADE.Movement.Pace.${key.capitalize()}.Label`,
                        action: key,
                        default: key === paceKey,
                    };
                }),
                rejectClose: false,
                render: (_event, dialog) => dialog.element.querySelector('footer')?.classList.add('flexcol'),
            });
        }
        if (paceKey === null)
            return;
        let pace = system.pace[paceKey];
        const running = system.pace.running;
        const runningDie = `1d${running.die}[${game.i18n.localize('SWADE.RunningDie')}]`;
        const mods = [];
        if (running.mod) {
            mods.push({
                label: game.i18n.localize('SWADE.Modifier'),
                value: running.mod,
            });
        }
        if ('encumbered' in this.system && this.system.encumbered) {
            pace += 2; //add the base value back, the roll modifier will take care of it
            mods.push({
                label: game.i18n.localize('SWADE.Encumbered'),
                value: -2,
            });
        }
        const paceLabel = `${game.i18n.localize('SWADE.Pace')} (${game.i18n.localize(`SWADE.Movement.Pace.${paceKey.capitalize()}.Label`)})`;
        mods.unshift({ label: paceLabel, value: pace });
        return RollDialog.asPromise({
            roll: new SwadeRoll(runningDie, this.getRollData(false), {
                modifiers: mods,
                rollType: "running",
            }),
            mods,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            flavor: game.i18n.localize('SWADE.RunningHint.Header') +
                game.i18n.localize('SWADE.RunningHint.Reminder'),
            title: game.i18n.localize('SWADE.Running'),
            actor: this,
        });
    }
    async makeUnskilledAttempt(options = {}) {
        const tempSkill = new SwadeItem({
            name: game.i18n.localize('SWADE.Unskilled'),
            type: 'skill',
            system: {
                swid: 'unskilled-attempt',
                die: {
                    sides: 4,
                    modifier: 0,
                },
                'wild-die': {
                    sides: 6,
                },
            },
        });
        const modifier = {
            label: game.i18n.localize('SWADE.Unskilled'),
            value: -2,
        };
        if (options.additionalMods) {
            options.additionalMods.push(modifier);
        }
        else {
            options.additionalMods = [modifier];
        }
        return this.rollSkill(null, options, tempSkill);
    }
    async makeArcaneDeviceSkillRoll(arcaneSkillDie, options = {}) {
        const tempSkill = new SwadeItem({
            name: game.i18n.localize('SWADE.ArcaneSkill'),
            type: 'skill',
            system: {
                die: arcaneSkillDie,
                'wild-die': {
                    sides: 6,
                },
            },
        });
        return this.rollSkill(null, options, tempSkill);
    }
    async spendBenny() {
        //return early if there no bennies to spend
        if (this.bennies < 1)
            return;
        const msgClass = getDocumentClass('ChatMessage');
        if (game.settings.get('swade', 'notifyBennies')) {
            const speaker = msgClass.getSpeaker({
                actor: this,
            });
            const message = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.spend, {
                target: this,
                speaker: speaker,
            });
            const chatData = { content: message, speaker: speaker };
            await msgClass.create(chatData);
        }
        await this.update({ 'system.bennies.value': this.bennies - 1 });
        if (game.settings.get('swade', 'hardChoices')) {
            const gms = game
                .users.filter((u) => u.isGM && u.active)
                .map((u) => u.id);
            game.swade.sockets.giveBenny(gms);
        }
        /**
         * A hook event that is fired after an actor spends a Benny
         * @category Hooks
         * @param {SwadeActor} actor                     The actor that spent the benny
         */
        Hooks.call('swadeSpendBenny', this);
        if (!!game.dice3d && (await shouldShowBennyAnimation())) {
            game.dice3d.showForRoll(await new Roll('1dB').evaluate(), game.user, true, null, false);
        }
    }
    async getBenny() {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return;
        const combatant = this.token?.combatant;
        await this.update({ 'system.bennies.value': this.bennies + 1 });
        const msgClass = getDocumentClass('ChatMessage');
        const hiddenNPC = combatant?.isNPC && combatant?.hidden;
        if (game.settings.get('swade', 'notifyBennies') && !hiddenNPC) {
            const speaker = msgClass.getSpeaker({
                actor: this,
            });
            const content = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.add, {
                target: this,
                speaker: speaker,
            });
            await msgClass.create({
                content: content,
                speaker: speaker,
            });
        }
        /**
         * A hook event that is fired after an actor has been awarded a benny
         * @category Hooks
         * @param {SwadeActor} actor                     The actor that received the benny
         */
        Hooks.call('swadeGetBenny', this);
        if (!!game.dice3d && (await shouldShowBennyAnimation())) {
            game.dice3d.showForRoll(await new Roll('1dB').evaluate(), game.user, true, null, false);
        }
    }
    /**
     * Toggles the actor's conviction state on/off, subtracting the relevant resource
     * @param toChat Whether to post a chat message when toggling, defaults to `true`
     */
    async toggleConviction(toChat = true) {
        if (!('details' in this.system))
            return;
        const current = this.system.details.conviction.value;
        const active = this.system.details.conviction.active;
        let template = '';
        if (current > 0 && !active) {
            await this.update({
                'system.details.conviction.value': current - 1,
                'system.details.conviction.active': true,
            });
            template = CONFIG.SWADE.conviction.templates.start;
        }
        else {
            await this.update({
                'system.details.conviction.active': false,
            });
            template = CONFIG.SWADE.conviction.templates.end;
        }
        if (!toChat)
            return;
        const msgClass = getDocumentClass('ChatMessage');
        await msgClass.create({
            speaker: msgClass.getSpeaker({ actor: this }),
            content: await foundry.applications.handlebars.renderTemplate(template, {
                icon: CONFIG.SWADE.conviction.icon,
                actor: this,
            }),
        });
    }
    /** @see {TokenDocument#toggleActiveEffect} */
    async toggleActiveEffect(effect, { overlay = false, active, } = {}) {
        const statusEffect = typeof effect === 'string' ? getStatusEffectDataById(effect) : effect;
        if (!statusEffect?.id)
            return false;
        // Remove existing single-status effects.
        const existing = this.effects.reduce((acc, cur) => {
            if (cur.statuses.size === 1 && cur.statuses.has(statusEffect.id)) {
                acc.push(cur.id);
            }
            return acc;
        }, []);
        const state = active ?? !existing.length;
        if (!state && existing.length) {
            await this.deleteEmbeddedDocuments('ActiveEffect', existing);
        }
        // Add a new effect
        else if (state) {
            const aeClass = getDocumentClass('ActiveEffect');
            const data = foundry.utils.deepClone(statusEffect);
            foundry.utils.setProperty(data, 'statuses', [statusEffect.id]);
            delete data.id; //remove the ID to not trigger validation errors
            aeClass.migrateDataSafe(data);
            aeClass.cleanData(data);
            data.name = game.i18n.localize(data.name);
            if (overlay)
                foundry.utils.setProperty(data, 'flags.core.overlay', true);
            await aeClass.create(data, { parent: this });
        }
        return state;
    }
    /**
     * Reset the bennies of the Actor to their default value
     */
    async refreshBennies(notify = true) {
        if ('refreshBennies' in this.system)
            this.system.refreshBennies(notify);
    }
    /** Calculates the total Wound Penalties
     * and returns them as a negative number */
    calcWoundPenalties(ignoreAll = false) {
        if (ignoreAll)
            return 0;
        let total = 0;
        const wounds = foundry.utils.getProperty(this, 'system.wounds.value');
        const ignoredWounds = foundry.utils.getProperty(this, 'system.wounds.ignored');
        //clamp the value between 0 and the maximum
        total = Math.clamp(wounds - ignoredWounds, 0, 3);
        return total * -1;
    }
    /** Calculates the total Fatigue Penalties */
    calcFatiguePenalties() {
        let total = 0;
        const fatigue = foundry.utils.getProperty(this, 'system.fatigue.value');
        const ignoredFatigue = foundry.utils.getProperty(this, 'system.fatigue.ignored');
        //get the bigger of the two values so we don't accidentally return a negative value for the penalty
        total = Math.max(fatigue - ignoredFatigue, 0);
        return total * -1;
    }
    calcStatusPenalties() {
        let retVal = 0;
        const isDistracted = foundry.utils.getProperty(this, 'system.status.isDistracted');
        if (isDistracted) {
            retVal -= 2;
        }
        return retVal;
    }
    calcScale(size) {
        let scale = 0;
        if (Number.between(size, 20, 12))
            scale = 6;
        else if (Number.between(size, 11, 8))
            scale = 4;
        else if (Number.between(size, 7, 4))
            scale = 2;
        else if (Number.between(size, 3, -1))
            scale = 0;
        else if (size === -2)
            scale = -2;
        else if (size === -3)
            scale = -4;
        else if (size === -4)
            scale = -6;
        return scale;
    }
    /**
     * Returns an array of items that match a given SWID and optionally an item type
     * @param swid The SWID of the item(s) which you want to retrieve
     * @param type Optionally, a type name to restrict the search
     * @returns an array containing the found items
     */
    getItemsBySwid(swid, type) {
        const swidFilter = (i) => i.system.swid === swid;
        if (!type)
            return this.items.filter(swidFilter);
        const itemTypes = this.itemTypes;
        if (!Object.hasOwn(itemTypes, type)) {
            throw new Error(`Type ${type} is invalid!`);
        }
        return itemTypes[type].filter(swidFilter);
    }
    /**
     * Fetch an item that matches a given SWID and optionally an item type
     * @param swid The SWID of the item(s) which you want to retrieve
     * @param type Optionally, a type name to restrict the search
     * @returns The matching item, or undefined if none was found.
     */
    getSingleItemBySwid(swid, type) {
        return this.getItemsBySwid(swid, type)[0];
    }
    /**
     * Function for shortcut roll in item (@str + 1d6)
     * return something like : {agi: "1d8x+1", sma: "1d6x", spi: "1d6x", str: "1d6x-1", vig: "1d6x"}
     */
    getRollData(includeModifiers = true) {
        let rollData;
        if ('getRollData' in this.system)
            rollData = this.system.getRollData(includeModifiers);
        return rollData ?? {};
    }
    /** Calculates the maximum carry capacity based on the strength die and any adjustment steps */
    calcMaxCarryCapacity() {
        if (!('attributes' in this.system))
            return 0;
        const unit = game.settings.get('swade', 'weightUnit');
        const strength = foundry.utils.deepClone(this.system.attributes.strength);
        const stepAdjust = Math.max(strength.encumbranceSteps * 2, 0);
        strength.die.sides += stepAdjust;
        //bound the adjusted strength die to 12
        const encumbDie = this._boundTraitDie(strength.die);
        if (unit === 'imperial') {
            return this._calcImperialCapacity(encumbDie);
        }
        else if (unit === 'metric') {
            return this._calcMetricCapacity(encumbDie);
        }
        else {
            throw new Error(`Value ${unit} is an unknown value!`);
        }
    }
    calcInventoryWeight() {
        const items = this.items.map((i) => i.system instanceof ArmorData ||
            i.system instanceof WeaponData ||
            i.system instanceof ShieldData ||
            i.system instanceof GearData ||
            i.system instanceof ConsumableData
            ? i.system
            : null);
        let retVal = 0;
        if (this.system instanceof VehicleData) {
            for (const item of items) {
                if (!item)
                    continue;
                retVal += Number(item.weight) * Number(item.quantity);
            }
        }
        else {
            for (const item of items) {
                if (!item)
                    continue;
                if (item.equipStatus !== constants$1.EQUIP_STATE.STORED) {
                    retVal += Number(item.weight) * Number(item.quantity);
                }
            }
        }
        return retVal;
    }
    /**
     * @deprecated
     * Helper Function for Vehicle Actors, to roll Maneuvering checks
     */
    async rollManeuverCheck() {
        foundry.utils.logCompatibilityWarning('SwadeActor#rollManeuverCheck has been moved to the VehicleData class and can be accessed via system.rollManeuverCheck', { since: '4.4', until: '5.1' });
        if (!(this.system instanceof VehicleData))
            return;
        await this.system.rollManeuverCheck();
    }
    /** @deprecated */
    async getDriver() {
        foundry.utils.logCompatibilityWarning('SwadeActor#getDriver deprecated in favor of the crew members array, which can be found at system.crew.members', { since: '4.4', until: '5.1' });
        return this.system.operator;
    }
    getTraitRollModifiers(die, options, name) {
        const mods = new Array();
        //Trait modifier
        if (die.modifier !== 0) {
            mods.push({
                label: name
                    ? `${name} ${game.i18n.localize('SWADE.Modifier')}`
                    : game.i18n.localize('SWADE.TraitMod'),
                value: die.modifier,
            });
        }
        const wounds = this.calcWoundPenalties(!!options.ignoreWounds);
        const fatigue = this.calcFatiguePenalties();
        const numbness = 'woundsOrFatigue' in this.system
            ? this.system.woundsOrFatigue?.ignored
            : 0;
        if (numbness > 0) {
            const label = `${game.i18n.localize('SWADE.Wounds')}/${game.i18n.localize('SWADE.Fatigue')}`;
            mods.push({
                label: label,
                value: Math.min(wounds + fatigue + numbness, 0),
            });
        }
        else {
            //Wounds
            mods.push({
                label: game.i18n.localize('SWADE.Wounds'),
                value: wounds,
            });
            //Fatigue
            mods.push({
                label: game.i18n.localize('SWADE.Fatigue'),
                value: fatigue,
            });
        }
        //Additional Mods
        if (options.additionalMods) {
            mods.push(...options.additionalMods);
        }
        // Joker, Dramatic Task Complication
        if (game.combats.active && 'rollModifiers' in game.combats.active.system) {
            mods.push(...game.combats.active.system.rollModifiers(this));
        }
        if (!(this.system instanceof VehicleData || this.system instanceof GroupData)) {
            //Status penalties
            if (this.system.status.isDistracted) {
                mods.push({
                    label: game.i18n.localize('SWADE.Distr'),
                    value: -2,
                });
            }
            //Conviction Die
            const useConviction = this.isWildcard &&
                this.system.details.conviction.active &&
                game.settings.get('swade', 'enableConviction');
            if (useConviction) {
                mods.push({
                    label: game.i18n.localize('SWADE.Conv'),
                    value: '+1d6x',
                });
            }
        }
        return mods
            .filter((m) => m.value) //filter out the nullish values
            .sort((a, b) => a.label.localeCompare(b.label)); //sort the mods alphabetically by label
    }
    _handleComplexSkill(skill, options) {
        if (this.system instanceof VehicleData ||
            this.system instanceof GroupData) {
            throw new Error('Only Extras and Wildcards can roll skills!');
        }
        if (!(skill.system instanceof SkillData)) {
            throw new Error('Detected-non skill in skill roll construction');
        }
        if (!options.rof)
            options.rof = 1;
        const skillData = skill.system;
        const rolls = new Array();
        //Add all necessary trait die
        for (let i = 0; i < options.rof; i++) {
            rolls.push(Roll.fromTerms([this._buildTraitDie(skillData.die.sides, skill.name)]));
        }
        //Add Wild Die
        if (this.isWildcard) {
            rolls.push(Roll.fromTerms([this._buildWildDie(skillData['wild-die'].sides)]));
        }
        const kh = options.rof > 1 ? `kh${options.rof}` : 'kh';
        const basePool = foundry.dice.terms.PoolTerm.fromRolls(rolls);
        basePool.modifiers.push(kh);
        const attGlobalMods = this.system.stats.globalMods[skill.system.attribute ?? ''] ?? [];
        const effects = structuredClone([
            ...(skillData.effects ?? []),
            ...attGlobalMods,
            ...this.system.stats.globalMods.trait,
        ]);
        if (options.additionalMods)
            options.additionalMods.push(...effects);
        else
            options.additionalMods = effects;
        const rollMods = this.getTraitRollModifiers(skillData.die, options, skill.name);
        //add encumbrance penalty if necessary
        if (skill.system.attribute === 'agility' && this.system.encumbered) {
            rollMods.push({
                label: game.i18n.localize('SWADE.Encumbered'),
                value: -2,
            });
        }
        return [TraitRoll.fromTerms([basePool]), rollMods];
    }
    /**
     * @param sides number of sides of the die
     * @param flavor flavor of the die
     * @param modifiers modifiers to the die
     * @returns a Die instance that already has the exploding modifier by default
     */
    _buildTraitDie(sides, flavor) {
        const modifiers = [];
        if (sides > 1)
            modifiers.push('x');
        return new foundry.dice.terms.Die({
            faces: sides,
            modifiers: modifiers,
            options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
        });
    }
    /**
     * @param die The die to adjust
     * @returns the properly adjusted trait die
     */
    _boundTraitDie(die) {
        const sides = die.sides;
        if (sides < 4 && sides !== 1) {
            die.sides = 4;
        }
        else if (sides > 12) {
            const difference = sides - 12;
            die.sides = 12;
            die.modifier += difference / 2;
        }
        return die;
    }
    _buildWildDie(sides = 6) {
        return new WildDie({ faces: sides });
    }
    _calcImperialCapacity(strength) {
        const modifier = Math.max(strength.modifier, 0);
        return Math.max((strength.sides / 2 - 1 + modifier) * 20, 0);
    }
    _calcMetricCapacity(strength) {
        const modifier = Math.max(strength.modifier, 0);
        return Math.max((strength.sides / 2 - 1 + modifier) * 10, 0);
    }
    /** Calculates the correct armor value based on SWADE v5.0 and returns that value */
    calcArmor() {
        const torsoArmor = this._getArmorForLocation(constants$1.ARMOR_LOCATIONS.TORSO);
        return this._calcDerivedEffects('armor', torsoArmor);
    }
    /** Calculates the Toughness value without armor and returns it */
    calcToughness() {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return 0;
        /** base value of all toughness calculations */
        const toughnessBaseValue = 2;
        const sources = this.system.stats.toughness.sources;
        //get the base values we need
        const vigor = this.system.attributes.vigor.die.sides;
        const vigMod = this.system.attributes.vigor.die.modifier;
        // const toughMod = this.system.stats.toughness.modifier;
        let finalToughness = Math.round(vigor / 2) + toughnessBaseValue;
        if (vigMod > 0) {
            finalToughness += Math.floor(vigMod / 2);
        }
        sources.push({
            label: game.i18n.localize('SWADE.AttrVig'),
            value: finalToughness,
        });
        const size = this.system.stats.size ?? 0;
        finalToughness += size;
        if (size !== 0) {
            sources.push({
                label: game.i18n.localize('SWADE.Size'),
                value: size,
            });
        }
        //add the toughness from the armor
        for (const armor of this.itemTypes.armor) {
            if (!(armor.system instanceof ArmorData))
                continue;
            if (armor.isReadied && armor.system.locations.torso) {
                finalToughness += Number(armor.system.toughness);
                sources.push({
                    label: armor.name,
                    value: armor.system.toughness,
                });
            }
        }
        return this._calcDerivedEffects('toughness', finalToughness);
    }
    calcParry() {
        if (this.system instanceof VehicleData ||
            this.system instanceof CreatureData) {
            return this._calcDerivedEffects('parry', this.system.calcParry());
        }
        return 0;
    }
    _calcDerivedEffects(target, derivedStat) {
        let effects = [];
        let sources = [];
        if (this.system instanceof CreatureData ||
            this.system instanceof VehicleData) {
            effects =
                target === 'armor'
                    ? (this.system.stats.toughness?.armorEffects ?? [])
                    : this.system.stats[target].effects;
            sources =
                target === 'armor'
                    ? new Array() // currently gets discarded
                    : this.system.stats[target].sources;
        }
        effects.forEach((e) => {
            switch (e.mode) {
                case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                    derivedStat *= e.value;
                    sources.push({
                        label: e.label,
                        value: e.value,
                        mode: e.mode,
                    });
                    break;
                case CONST.ACTIVE_EFFECT_MODES.ADD:
                    derivedStat += e.value;
                    sources.push({
                        label: e.label,
                        value: e.value,
                        mode: e.mode,
                    });
                    break;
                case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
                    if (derivedStat > e.value) {
                        derivedStat = e.value;
                        sources.length = 0;
                        sources.push({
                            label: e.label,
                            value: e.value,
                            mode: e.mode,
                        });
                    }
                    break;
                case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                    if (derivedStat < e.value) {
                        derivedStat = e.value;
                        sources.length = 0;
                        sources.push({
                            label: e.label,
                            value: e.value,
                            mode: e.mode,
                        });
                    }
                    break;
                case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
                    derivedStat = e.value;
                    sources.length = 0;
                    sources.push({
                        label: e.label,
                        value: e.value,
                        mode: e.mode,
                    });
                    break;
            }
        });
        return derivedStat;
    }
    /**
     * @param location The location of the armor such as head, torso, arms or legs
     * @returns The total amount of armor for that location
     */
    _getArmorForLocation(location) {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return 0;
        return Object.values(this._getArmorSourcesForLocation(location)).reduce((acc, value) => (acc += value), 0);
    }
    /**
     * @param location The location of the armor such as head, torso, arms or legs
     * @returns A record of armor sources and values
     */
    _getArmorSourcesForLocation(location) {
        const armorSources = {};
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return armorSources;
        const [regularArmor, naturalArmor] = this.itemTypes.armor
            .filter((i) => {
            //filter away armor that doesn't match the location and isn't equipped
            const system = i.system;
            const isEquipped = system.equipStatus > constants$1.EQUIP_STATE.CARRIED;
            return isEquipped && system.locations[location];
        })
            .map((i) => {
            // map the data into a usable format
            const system = i.system;
            return {
                name: i.name,
                armor: system.armor,
                isNaturalArmor: system.isNaturalArmor,
            };
        })
            .sort((a, b) => b.armor - a.armor) // sort the items by armor value, descending
            .partition((i) => i.isNaturalArmor); //split them into natural and regular armor
        const isCoreStacking = game.settings.get('swade', 'armorStacking') ===
            constants$1.ARMOR_STACKING.CORE;
        const [baseArmor, extraArmor] = regularArmor;
        if (baseArmor) {
            armorSources[baseArmor.name] = baseArmor.armor;
            if (extraArmor && isCoreStacking) {
                armorSources[extraArmor.name] = Math.floor(extraArmor.armor / 2);
            }
        }
        //add the natural armor to the object
        return naturalArmor.reduce((acc, cur) => {
            acc[cur.name] = cur.armor;
            return acc;
        }, armorSources);
    }
    getPTTooltip(target) {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return '';
        let tooltip = target === 'parry'
            ? `<h4>${game.i18n.localize('SWADE.Parry')}
       ${this.system.stats.parry.value}
      (${this.system.stats.parry.shield})</h4>`
            : `<h4>${game.i18n.localize('SWADE.Tough')}
       ${this.system.stats.toughness.value}
      (${this.system.stats.toughness.armor})</h4>`;
        tooltip += this._sourcesToTooltip(this.system.stats[target].sources);
        return tooltip;
    }
    getArmorTooltip() {
        if (this.system instanceof VehicleData || this.system instanceof GroupData)
            return '';
        let tooltip = '';
        const armor = this.armorPerLocation;
        tooltip += game.i18n.localize('SWADE.Head') + `: ${armor.head}<br>`;
        tooltip += game.i18n.localize('SWADE.Torso') + `: ${armor.torso}<br>`;
        tooltip += game.i18n.localize('SWADE.Arms') + `: ${armor.arms}<br>`;
        tooltip += game.i18n.localize('SWADE.Legs') + `: ${armor.legs}<hr>`;
        tooltip += this._sourcesToTooltip(this.system.stats.toughness.armorEffects);
        tooltip += Object.entries(this._getArmorSourcesForLocation(constants$1.ARMOR_LOCATIONS.TORSO)).reduce((acc, [source, value]) => acc + `${source}: ${value}<br>`, '');
        return tooltip;
    }
    /**
     * Looks up the combatant instance for this actor in a given Combat encounter, taking into account whether the actor is an unlinked token or not.
     * @param combat The combat instance to look in.
     * @returns The found combatant for this actor, if one exists
     */
    getCombatant(combat) {
        if (!combat)
            return;
        const combatant = this.isToken
            ? combat?.getCombatantsByToken(this.token?.id)[0]
            : combat?.getCombatantsByActor(this.id)[0];
        return combatant;
    }
    _sourcesToTooltip(sources) {
        let tooltip = '';
        sources.forEach((source) => {
            let effect = '';
            switch (source.mode) {
                case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                    effect = 'x' + source.value;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
                    effect =
                        game.i18n.localize('EFFECT.MODE_DOWNGRADE') + ' ' + source.value;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                    effect =
                        game.i18n.localize('EFFECT.MODE_UPGRADE') + ' ' + source.value;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
                    effect =
                        game.i18n.localize('EFFECT.MODE_OVERRIDE') + ' ' + source.value;
                    break;
                case CONST.ACTIVE_EFFECT_MODES.ADD:
                default:
                    effect = (source.value ?? 0).signedString();
            }
            tooltip += `${source.label}: ${effect}<br>`;
        });
        return tooltip;
    }
    _filterOverrides() {
        const overrides = foundry.utils.flattenObject(this.overrides);
        for (const k of Object.keys(overrides)) {
            if (k.startsWith('@')) {
                delete overrides[k];
            }
        }
        this.overrides = foundry.utils.expandObject(overrides);
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        if (foundry.utils.hasProperty(changed, 'system.bennies') &&
            this.hasPlayerOwner) {
            ui.players?.render(true);
        }
        if (foundry.utils.hasProperty(options, 'swade.wounds.value') ||
            foundry.utils.hasProperty(options, 'swade.fatigue.value')) {
            const isDamage = foundry.utils.hasProperty(changed, 'system.wounds.value')
                ? changed.system.wounds.value > options.swade.wounds.value
                : foundry.utils.hasProperty(changed, 'system.fatigue.value')
                    ? changed.system.fatigue.value > options.swade.fatigue.value
                    : false;
            const tokens = this.getActiveTokens(true, false);
            for (const token of tokens) {
                token.ring?.flashColor(isDamage ? Color.from('#D41159') : Color.from('#1A85FF'), {
                    duration: 1000,
                    easing: CONFIG.Token.ring.ringClass.createSpikeEasing(0.4),
                });
            }
        }
    }
}

class SwadeActiveEffect extends ActiveEffect {
    static defaultName(context = {}) {
        // Base active effect should just be called "Active Effect"
        if (!('type' in context) || context.type === 'base') {
            return game.i18n.format('DOCUMENT.New', {
                type: game.i18n.localize('DOCUMENT.ActiveEffect'),
            });
        }
        return super.defaultName(context);
    }
    get affectsItems() {
        const affectedItems = new Array();
        this.changes.forEach((c) => affectedItems.push(...this._getAffectedItems(this.parent, c)));
        return affectedItems.length > 0;
    }
    get statusId() {
        return this.statuses.first();
    }
    get isSuppressed() {
        if (this.parent?.type === 'group')
            return true;
        return false;
    }
    /** A convenience accessor that returns the effect's containing actor, if it has one */
    get actor() {
        const parent = this.parent;
        if (parent instanceof SwadeActor)
            return parent;
        if (parent instanceof SwadeItem && parent.actor instanceof SwadeActor)
            return parent.actor;
    }
    get expiresAtStartOfTurn() {
        const expiration = this.system.expiration ?? -1;
        return [
            constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
            constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        ].includes(expiration);
    }
    get expiresAtEndOfTurn() {
        const expiration = this.system.expiration ?? -1;
        return [
            constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
            constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
        ].includes(expiration);
    }
    get expirationText() {
        const expiration = this.system.expiration ?? -1;
        switch (expiration) {
            case constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto:
                return game.i18n.localize('SWADE.Expiration.BeginAuto');
            case constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt:
                return game.i18n.localize('SWADE.Expiration.BeginPrompt');
            case constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto:
                return game.i18n.localize('SWADE.Expiration.EndAuto');
            case constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt:
                return game.i18n.localize('SWADE.Expiration.EndPrompt');
            default: // None
                return game.i18n.localize('SWADE.Expiration.None');
        }
    }
    /**
     * Filters through active effects to apply them to items, e.g. skills and weapons
     * * match[0] = the whole expression
     * * match[1] = ItemType
     * * match[2] = Item Name or ID
     * * match[3] = attribute key
     */
    static ITEM_REGEXP = /@([a-zA-Z0-9]+)\{(.+)\}\[([\S.]+)\]/;
    static ATTR_REGEXP = /system\.attributes\.(agility|smarts|spirit|strength|vigor)\.die\.modifier/;
    static GLOBAL_REGEXP = /system\.stats\.globalMods\.(\w+)/;
    static PT_REGEXP = /system\.stats\.(parry|toughness)\.(value|armor)/;
    static migrateData(data) {
        super.migrateData(data);
        if ('changes' in data) {
            for (const change of data.changes) {
                const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
                if (match) {
                    const newKey = match[3].trim().replace(/^data\./, 'system.');
                    change.key = `@${match[1].trim()}{${match[2].trim()}}[${newKey}]`;
                }
                //fix up effects that had an action related key
                change.key = change.key.replaceAll('system.actions.skillMod', 'system.actions.traitMod');
                change.key = change.key.replaceAll('system.actions.skill', 'system.actions.trait');
                change.key = change.key.replaceAll('system.stats.speed.value', 'system.pace');
                change.key = change.key.replaceAll('system.stats.speed.adjusted', 'system.pace');
                change.key = change.key.replaceAll('system.stats.speed.runningDie', 'system.pace.running.die');
                change.key = change.key.replaceAll('system.stats.speed.runningMod', 'system.pace.running.mod');
                change.key = change.key.replaceAll('flags.swade.auras', 'system.auras');
            }
        }
        const flags = data.flags?.swade;
        if (flags) {
            const keys = [
                'removeEffect',
                'expiration',
                'loseTurnOnHold',
                'favorite',
                'conditionalEffect',
            ];
            const flags = data.flags.swade;
            data.system ??= {};
            for (const key of keys) {
                if (key in flags) {
                    data.system[key] = flags[key];
                    delete flags[key];
                }
            }
        }
        return data;
    }
    apply(doc, change) {
        const itemMatch = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        const attrMatch = change.key.match(SwadeActiveEffect.ATTR_REGEXP);
        const globalMatch = change.key.match(SwadeActiveEffect.GLOBAL_REGEXP);
        const ptMatch = change.key.match(SwadeActiveEffect.PT_REGEXP);
        if (itemMatch) {
            this._handleItemMatch(itemMatch, change, doc);
        }
        else if (attrMatch &&
            change.mode === CONST.ACTIVE_EFFECT_MODES.ADD &&
            doc instanceof SwadeActor) {
            this._handleAttributeMatch(attrMatch, change, doc);
        }
        else if (globalMatch && doc instanceof SwadeActor) {
            this._handleGlobalModifierMatch(globalMatch, change, doc);
        }
        else if (ptMatch && doc instanceof SwadeActor) {
            this._handlePTModifierMatch(ptMatch, change, doc);
        }
        else {
            return super.apply(doc, change);
        }
    }
    _getAffectedItems(parent, change) {
        const items = new Array();
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (!match)
            return items;
        //get the properties from the match
        const type = match[1].trim().toLowerCase();
        const name = match[2].trim();
        //filter the items down, according to type and name/id
        const collection = parent instanceof SwadeItem ? (parent.parent?.items ?? []) : parent.items;
        items.push(...collection.filter((i) => i.type === type && (i.name === name || i.id === name)));
        return items;
    }
    /**
     * Removes Effects from Items
     * @param parent The parent object
     */
    _removeEffectsFromItems(parent) {
        const affectedItems = new Array();
        this.changes.forEach((c) => affectedItems.push(...this._getAffectedItems(parent, c)));
        for (const item of affectedItems) {
            for (const change of this.changes) {
                const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
                if (!match)
                    continue;
                const key = match[3].trim();
                if (key === 'system.die.modifier' &&
                    match[1].trim().toLowerCase() === 'skill' &&
                    change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
                    foundry.utils.setProperty(item, 'system.effects', []);
                }
                else {
                    //restore original data from source
                    const source = foundry.utils.getProperty(item._source, key);
                    foundry.utils.setProperty(item, key, source);
                }
            }
            if (item.sheet?.rendered)
                item.sheet.render(true);
        }
    }
    _updateTraitRollEffects(effectsArray, value, ignore = false) {
        if (!this.id) {
            // Handling null ID - don't want to make un-deletable override
            console.warn('No ID found!');
            return false;
        }
        const modifier = {
            label: this.name ?? game.i18n.localize('SWADE.Addi'),
            value: Number.isNumeric(value) ? Number(value) : value,
            effectID: this.id,
            ignore: this.system.conditionalEffect || ignore,
        };
        // Technically doesn't handle an effect that adds to the same item multiple times,
        // but necessary to avoid duplication on refresh
        const splice = effectsArray.findSplice((e) => e.effectID === this.id, modifier);
        if (!splice)
            effectsArray.push(modifier);
        return true;
    }
    async _applyRelatedEffects() {
        const related = this.getFlag('swade', 'related') ?? {};
        if (!this.actor || !this.statusId)
            return;
        const toCreate = [];
        for (const [id, mutation] of Object.entries(related)) {
            const statusEffect = getStatusEffectDataById(id);
            //skip if the effect already exists on the actor
            if (this.actor.statuses.has(id) || !statusEffect)
                continue;
            //apply the mutation if one exists
            const effect = foundry.utils.mergeObject(statusEffect, { statuses: [id], ...mutation }, { performDeletions: true });
            toCreate.push(effect);
        }
        await this.actor?.createEmbeddedDocuments('ActiveEffect', toCreate);
    }
    _handleItemMatch(match, change, doc) {
        //get the properties from the match
        const key = match[3].trim();
        const value = change.value;
        //get the affected items
        const affectedItems = this._getAffectedItems(doc, change);
        //apply the AE to each item
        for (const item of affectedItems) {
            const overrides = foundry.utils.flattenObject(item.overrides ?? {});
            // Specialized handling of modifiers so they are listed separately in the RollDialog
            if (key === 'system.die.modifier' &&
                match[1].trim().toLowerCase() === 'skill' &&
                change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
                const effectKey = 'system.effects';
                overrides[effectKey] ??= new Array();
                this._updateTraitRollEffects(overrides[effectKey], value);
                // NOT calling super.apply because normal apply doesn't handle objects
                foundry.utils.setProperty(item, effectKey, overrides[effectKey]);
            }
            else {
                //mock up a new change object with the key and value we extracted from the original key and feed it into the super apply method alongside the item
                const mockChange = { ...change, key, value };
                // @ts-expect-error AE.apply doesn't actually require an Actor, just a Document
                const changes = super.apply(item, mockChange);
                Object.assign(overrides, changes);
            }
            item.overrides = foundry.utils.expandObject(overrides);
        }
    }
    _handleAttributeMatch(match, change, doc) {
        const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
        const effectKey = 'system.attributes.' + match[1] + '.effects';
        if (!(effectKey in overrides))
            overrides[effectKey] = new Array();
        this._updateTraitRollEffects(overrides[effectKey], change.value);
        // NOT calling super.apply because normal apply doesn't handle objects
        foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
        doc.overrides = foundry.utils.expandObject(overrides);
    }
    _handleGlobalModifierMatch(match, change, doc) {
        if (doc.system instanceof GroupData)
            return; // Really shouldn't be a group
        if (change.mode === CONST.ACTIVE_EFFECT_MODES.ADD &&
            doc.system.stats.globalMods.hasOwnProperty(match[1])) {
            const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
            const effectKey = 'system.stats.globalMods.' + match[1];
            if (!(effectKey in overrides))
                overrides[effectKey] = new Array();
            this._updateTraitRollEffects(overrides[effectKey], change.value, false);
            // NOT calling super.apply because normal apply doesn't handle objects
            foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
            doc.overrides = foundry.utils.expandObject(overrides);
        }
        else {
            Logger.warn('Invalid Global Modifier ' + change.key + 'on effect ' + this.id);
        }
    }
    _handlePTModifierMatch(match, change, doc) {
        // Really shouldn't be a group
        if (doc.system instanceof GroupData)
            return;
        if (change.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM) {
            super.apply(doc, change);
            return;
        }
        const autoCalc = match[1] === 'parry'
            ? doc.system.details.autoCalcParry
            : doc.system.details.autoCalcToughness;
        const target = match[2] === 'armor'
            ? 'armorEffects' // Armor gets its own display
            : autoCalc
                ? 'effects'
                : 'sources';
        doc.system.stats[match[1]][target]?.push({
            label: this.name,
            value: Number(change.value),
            mode: change.mode,
        });
    }
    /** This functions checks the effect expiration behavior and either auto-deletes or prompts for deletion */
    async expire() {
        if (!isFirstOwner(this.parent)) {
            return game.swade.sockets.removeStatusEffect(this.uuid);
        }
        const statusId = this.statusId ?? '';
        if (game.swade.effectCallbacks.has(statusId)) {
            const callbackFn = game.swade.effectCallbacks.get(statusId, {
                strict: true,
            });
            return callbackFn(this);
        }
        const expiration = this.system.expiration;
        const startOfTurnAuto = expiration === constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
        const startOfTurnPrompt = expiration === constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
        const endOfTurnAuto = expiration === constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto;
        const endOfTurnPrompt = expiration === constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt;
        if (startOfTurnAuto || endOfTurnAuto) {
            await this.delete();
        }
        else if (startOfTurnPrompt || endOfTurnPrompt) {
            await this.promptEffectDeletion();
        }
    }
    isExpired(pointInTurn) {
        const isRightPointInTurn = (pointInTurn === 'start' && this.expiresAtStartOfTurn) ||
            (pointInTurn === 'end' && this.expiresAtEndOfTurn);
        const remaining = this.duration?.remaining ?? 0;
        return isRightPointInTurn && remaining < 1;
    }
    async promptEffectDeletion() {
        const title = game.i18n.format('SWADE.RemoveEffectTitle', {
            label: this.name,
        });
        const content = game.i18n.format('SWADE.RemoveEffectBody', {
            label: this.name,
            parent: this.parent?.name,
        });
        const buttons = {
            yes: {
                label: game.i18n.localize('Yes'),
                icon: '<i class="fas fa-check"></i>',
                callback: () => this.delete(),
            },
            no: {
                label: game.i18n.localize('No'),
                icon: '<i class="fas fa-times"></i>',
            },
            reset: {
                label: game.i18n.localize('SWADE.ActiveEffects.ResetDuration'),
                icon: '<i class="fas fa-repeat"></i>',
                callback: async () => {
                    await this.resetDuration();
                },
            },
        };
        new Dialog({ title, content, buttons }).render(true);
    }
    async resetDuration() {
        await this.update({
            duration: {
                startRound: game.combat?.round ?? 1,
                startTime: game.time.worldTime,
            },
        });
    }
    async _onUpdate(changed, options, userId) {
        await super._onUpdate(changed, options, userId);
        if (this.system.loseTurnOnHold) {
            const activeCombat = game.combats?.active;
            if (!this.actor || !activeCombat)
                return;
            // If the Actor is a Token, get the combatant by the Token ID instead of Actor ID because Tokens share Actor IDs. Otherwise, get the combatant by Actor ID.
            const combatant = this.actor.isToken
                ? activeCombat?.getCombatantsByToken(this.actor.token?.id)?.[0]
                : activeCombat?.getCombatantsByActor(this.actor.id)?.[0];
            if (combatant?.getFlag('swade', 'roundHeld')) {
                await combatant?.update({ 'flags.swade.turnLost': true });
                await combatant?.toggleHold();
            }
        }
    }
    async _preUpdate(changed, options, user) {
        super._preUpdate(changed, options, user);
        //return early if the parent isn't an actor or we're not actually affecting items
        if (this.affectsItems && this.parent) {
            this._removeEffectsFromItems(this.parent);
        }
    }
    async _preDelete(options, user) {
        super._preDelete(options, user);
        const parent = this.parent;
        //remove the effects from the item
        if (this.affectsItems && parent instanceof SwadeActor) {
            this._removeEffectsFromItems(parent);
        }
        // Get the active Combat if there is one.
        const combat = game.combats?.active;
        const combatant = this?.actor?.getCombatant(combat);
        if (combat && combatant) {
            // If status is Holding, turn off Hold for Combatant.
            if (this.statusId === 'holding') {
                await combatant?.update({ 'flags.swade.-=roundHeld': null });
            }
        }
    }
    async _preCreate(data, options, user) {
        //make sure active effects can't be added to group actors
        if (this.parent?.type === 'group')
            return false;
        super._preCreate(data, options, user);
        if (!data.img) {
            let path = 'systems/swade/assets/icons/active-effect.svg';
            if (this.parent instanceof SwadeItem)
                path = this.parent.img;
            this.updateSource({ img: path });
        }
        const isDefaultName = data.name === SwadeActiveEffect.defaultName();
        if (this.parent instanceof SwadeItem && (!data.name || isDefaultName)) {
            this.updateSource({ name: this.parent.name });
        }
        if (!this.origin && this.parent) {
            this.updateSource({ origin: this.parent.uuid });
        }
        //localize names, just to be sure
        this.updateSource({ name: game.i18n.localize(this.name) });
        //automatically favorite status effects
        if (this.statusId)
            this.updateSource({ 'system.favorite': true });
        //set the world time at creation
        this.updateSource({ duration: { startTime: game.time.worldTime } });
        // Get the active Combat if there is one.
        const combat = game.combats?.active;
        const combatant = this.actor?.getCombatant(combat);
        if (combat && combatant) {
            // If status is Holding, turn on Hold for Combatant.
            if (this.statusId === 'holding') {
                await combatant.setRoundHeld(combat.current.round);
            }
            // If there's no duration value and there's a combat, at least set the combat ID which then sets a startRound and startTurn, too.
            if (!data.duration?.combat) {
                this.updateSource({ 'duration.combat': combat.id });
            }
            if (this.system.loseTurnOnHold) {
                if (combatant.roundHeld) {
                    await Promise.allSettled([
                        combatant.update({ 'flags.swade.turnLost': true }),
                        combatant.toggleHold(),
                    ]);
                }
            }
        }
        //Update wild attack damage based on a flag
        if (this.statuses.has('wild-attack')) {
            const damageModIndex = this.changes.findIndex((c) => c.key === 'system.stats.globalMods.damage');
            const newDamage = this.actor?.getFlag('swade', 'wildAttackDamage');
            if (['number', 'string'].includes(typeof newDamage)) {
                const newChanges = foundry.utils.deepClone(this.changes);
                newChanges[damageModIndex].value = String(newDamage);
                this.updateSource({ changes: newChanges });
            }
        }
    }
    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        if (userId === game.userId)
            this._applyRelatedEffects();
    }
    _displayScrollingStatus(enabled) {
        super._displayScrollingStatus(enabled);
        const tokens = this.target?.getActiveTokens(true);
        const isNegative = CONFIG.SWADE.negativeStatusEffects.includes(this.statusId ?? '');
        const negativeColor = '#D41159';
        const positiveColor = '#1A85FF';
        const colorCode = enabled
            ? isNegative // if the AE is added and negative, flash negative color, else flash positive color
                ? negativeColor
                : positiveColor
            : isNegative // if the AE is getting removed and negative, flash negative color, else flash positive color
                ? positiveColor
                : negativeColor;
        const color = Color.from(colorCode);
        for (const token of tokens) {
            token.ring?.flashColor(color, {
                duration: 1000,
                easing: CONFIG.Token.ring?.ringClass.createSpikeEasing(0.4),
            });
        }
    }
}

/**
 * A class used to properly animate html `details` tags
 * @see https://css-tricks.com/how-to-animate-the-details-element/
 */
class Accordion {
    el;
    summary;
    content;
    isExpanding;
    isClosing;
    animation;
    options;
    #defaultOptions = {
        duration: 400,
        easing: 'ease-in-out',
    };
    constructor(el, contentSelector = '.content', options) {
        this.options = { ...this.#defaultOptions, ...options };
        // Store the <details> element
        this.el = el;
        // Store the <summary> element
        this.summary = el.querySelector('summary');
        // Store the <div class="content"> element
        this.content = el.querySelector(contentSelector);
        // Store the animation object (so we can cancel it if needed)
        this.animation = null;
        // Store if the element is closing
        this.isClosing = false;
        // Store if the element is expanding
        this.isExpanding = false;
        // Detect user clicks on the summary element
        this.summary?.addEventListener('click', this.onClick.bind(this));
    }
    onClick(e) {
        // Stop default behavior from the browser
        e.preventDefault();
        // Stop early if we clicked on a button inside summary
        if (e.target instanceof HTMLButtonElement)
            return;
        if (e.target.parentElement instanceof HTMLButtonElement) {
            return;
        }
        // Add an overflow on the <details> to avoid content overflowing
        this.el.style.overflow = 'hidden';
        // Check if the element is being closed or is already closed
        if (this.isClosing || !this.el.open) {
            this.open();
            this.options.onOpen?.(this.el);
            // Check if the element is being opened or is already open
        }
        else if (this.isExpanding || this.el.open) {
            this.shrink();
            this.options.onClose?.(this.el);
        }
    }
    shrink() {
        // Set the element as "being closed"
        this.isClosing = true;
        // Store the current height of the element
        const startHeight = `${this.el.offsetHeight}px`;
        // Calculate the height of the summary
        const endHeight = `${this.summary?.offsetHeight ?? 0}px`;
        // If there is already an animation running
        if (this.animation) {
            // Cancel the current animation
            this.animation.cancel();
        }
        // Start a WAAPI animation
        this.animation = this.el.animate({
            // Set the keyframes from the startHeight to endHeight
            height: [startHeight, endHeight],
        }, {
            duration: this.options.duration,
            easing: this.options.easing,
        });
        // When the animation is complete, call onAnimationFinish()
        this.animation.onfinish = () => this.onAnimationFinish(false);
        // If the animation is cancelled, isClosing variable is set to false
        this.animation.oncancel = () => (this.isClosing = false);
    }
    open() {
        // Apply a fixed height on the element
        this.el.style.height = `${this.el.offsetHeight}px`;
        // Force the [open] attribute on the details element
        this.el.open = true;
        // Wait for the next frame to call the expand function
        window.requestAnimationFrame(() => this.expand());
    }
    expand() {
        // Set the element as "being expanding"
        this.isExpanding = true;
        // Get the current fixed height of the element
        const startHeight = `${this.el.offsetHeight}px`;
        // Calculate the open height of the element (summary height + content height)
        const endHeight = `${(this.summary?.offsetHeight ?? 0) + (this.content?.offsetHeight ?? 0)}px`;
        // If there is already an animation running
        if (this.animation) {
            // Cancel the current animation
            this.animation.cancel();
        }
        // Start a WAAPI animation
        this.animation = this.el.animate({
            // Set the keyframes from the startHeight to endHeight
            height: [startHeight, endHeight],
        }, {
            duration: this.options.duration,
            easing: this.options.easing,
        });
        // When the animation is complete, call onAnimationFinish()
        this.animation.onfinish = () => this.onAnimationFinish(true);
        // If the animation is cancelled, isExpanding variable is set to false
        this.animation.oncancel = () => (this.isExpanding = false);
    }
    onAnimationFinish(open) {
        // Set the open attribute based on the parameter
        this.el.open = open;
        // Clear the stored animation
        this.animation = null;
        // Reset isClosing & isExpanding
        this.isClosing = false;
        this.isExpanding = false;
        // Remove the overflow hidden and the fixed height
        this.el.style.height = this.el.style.overflow = '';
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$9, HandlebarsApplicationMixin: HandlebarsApplicationMixin$a } = foundry.applications.api;
class ActiveEffectWizard extends HandlebarsApplicationMixin$a(ApplicationV2$9) {
    constructor(options) {
        super(options);
        this.document = options.document;
        if (this.document instanceof SwadeItem) {
            this.#effect.name = this.document.name;
            this.#effect.img = this.document.img;
        }
    }
    #effect = {
        name: SwadeActiveEffect.defaultName(),
        img: 'systems/swade/assets/icons/active-effect.svg',
    };
    #changes = [];
    #accordions = [];
    #collapsibleStates = {
        attribute: true,
        skill: true,
        derived: true,
    };
    currAttribute = 'agility';
    currSkill = '';
    document;
    static DEFAULT_OPTIONS = {
        window: {
            title: 'A.E.G.I.S.',
        },
        position: {
            width: 800,
            height: 800,
        },
        classes: [
            'swade',
            'active-effect-wizard',
            'swade-application',
            'standard-form',
        ],
        tag: 'form',
        form: {
            handler: ActiveEffectWizard.#createEffect,
            submitOnClose: false,
            submitOnChange: false,
            closeOnSubmit: false,
        },
        actions: {
            addChange: ActiveEffectWizard.#onAddChange,
            deleteChange: ActiveEffectWizard.#onDeleteChange,
            clickIcon: ActiveEffectWizard.#onClickIcon,
        },
    };
    static PARTS = {
        form: {
            template: 'systems/swade/templates/apps/active-effect-wizard.hbs',
            scrollable: ['.presets'],
        },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    /**
     * Determine if the target of this AE is a vehicle
     */
    get targetIsVehicle() {
        if (this.document instanceof SwadeActor) {
            return this.document.type === 'vehicle';
        }
        else
            return this.document.parent?.type === 'vehicle';
    }
    _onChangeForm(formConfig, event) {
        super._onChangeForm(formConfig, event);
        const target = event.target;
        if (!target)
            return; // TODO: what actually do
        const index = target.closest('li')?.dataset.index;
        if (target.classList.contains('value')) {
            this.#changes[Number(index)].value = target.value;
        }
        else if (target.classList.contains('mode')) {
            this.#changes[Number(index)].mode = Number(target.value);
        }
        else if (target.classList.contains('target')) {
            this[target.name] = target.value;
        }
        const formData = new FormDataExtended(this.form);
        foundry.utils.mergeObject(this.#effect, formData.object);
        this.render();
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.#setupAccordions();
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return foundry.utils.mergeObject(context, {
            isVehicle: this.targetIsVehicle,
            effect: this.#effect,
            changes: this.#changes,
            collapsibleStates: this.#collapsibleStates,
            expirationOptions: this.#getExpirationOptions(),
            skillSuggestions: this.#getSkillSuggestions(),
            derivedPresets: this.#getDerivedPresets(),
            globalModPresets: this.#getGlobalModPresets(),
            otherPresets: this.#getOtherStatsPresets(),
            attributes: {
                agility: 'SWADE.AttrAgi',
                smarts: 'SWADE.AttrSma',
                spirit: 'SWADE.AttrSpr',
                strength: 'SWADE.AttrStr',
                vigor: 'SWADE.AttrVig',
            },
            currAttribute: this.currAttribute,
            currSkill: this.currSkill,
            changeModes: {
                [foundry.CONST.ACTIVE_EFFECT_MODES.ADD]: 'EFFECT.MODE_ADD',
                [foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE]: 'EFFECT.MODE_OVERRIDE',
                [foundry.CONST.ACTIVE_EFFECT_MODES.UPGRADE]: 'EFFECT.MODE_UPGRADE',
            },
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-solid fa-arrow-down-to-line',
                    label: 'SWADE.ActiveEffects.Add',
                },
            ],
        });
    }
    static async #createEffect(_event, _form, _formData) {
        this.#prepareChanges();
        const data = foundry.utils.mergeObject(this.#effect, {
            transfer: this.document instanceof SwadeItem && this.document.type !== 'power', // only transfer on non-power items
        });
        await getDocumentClass('ActiveEffect').create(data, {
            renderSheet: this.#changes.length === 0,
            parent: this.document,
        });
        this.close();
    }
    #getSkillSuggestions() {
        if (this.document instanceof SwadeActor) {
            return this.document.itemTypes.skill.map((skill) => skill.name);
        }
        else if (this.document.parent instanceof SwadeActor) {
            return this.document.parent.itemTypes.skill.map((skill) => skill.name);
        }
        return [];
    }
    #getDerivedPresets() {
        if (this.targetIsVehicle) {
            return [
                {
                    label: game.i18n.localize('SWADE.Tough'),
                    key: 'system.toughness.total',
                },
                {
                    label: game.i18n.localize('SWADE.Armor'),
                    key: 'system.toughness.armor',
                },
            ];
        }
        else {
            return [
                {
                    label: game.i18n.localize('SWADE.Tough'),
                    key: 'system.stats.toughness.value',
                },
                {
                    label: game.i18n.localize('SWADE.Armor'),
                    key: 'system.stats.toughness.armor',
                },
                {
                    label: game.i18n.localize('SWADE.Parry'),
                    key: 'system.stats.parry.value',
                },
            ];
        }
    }
    #getGlobalModPresets() {
        return [
            {
                label: game.i18n.localize('SWADE.GlobalMod.Trait'),
                key: 'system.stats.globalMods.trait',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Agility'),
                key: 'system.stats.globalMods.agility',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Smarts'),
                key: 'system.stats.globalMods.smarts',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Spirit'),
                key: 'system.stats.globalMods.spirit',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Strength'),
                key: 'system.stats.globalMods.strength',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Vigor'),
                key: 'system.stats.globalMods.vigor',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Attack'),
                key: 'system.stats.globalMods.attack',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.Damage'),
                key: 'system.stats.globalMods.damage',
            },
            {
                label: game.i18n.localize('SWADE.GlobalMod.AP'),
                key: 'system.stats.globalMods.ap',
            },
        ];
    }
    #getOtherStatsPresets() {
        if (this.targetIsVehicle) {
            return [
                {
                    label: game.i18n.localize('SWADE.Size'),
                    key: 'system.size',
                },
                {
                    label: game.i18n.localize('SWADE.IgnWounds'),
                    key: 'system.wounds.ignored',
                },
                {
                    label: game.i18n.localize('SWADE.WoundsMax'),
                    key: 'system.wounds.max',
                },
            ];
        }
        else {
            return [
                {
                    label: game.i18n.localize('SWADE.Size'),
                    key: 'system.stats.size',
                },
                {
                    label: game.i18n.localize('SWADE.Pace'),
                    key: 'system.pace',
                },
                {
                    label: game.i18n.localize('SWADE.RunningDie'),
                    key: 'system.pace.running.die',
                },
                {
                    label: game.i18n.localize('SWADE.RunningMod'),
                    key: 'system.pace.running.mod',
                },
                {
                    label: game.i18n.localize('SWADE.EncumbranceSteps'),
                    key: 'system.attributes.strength.encumbranceSteps',
                },
                {
                    label: game.i18n.localize('SWADE.IgnWounds'),
                    key: 'system.wounds.ignored',
                },
                {
                    label: game.i18n.localize('SWADE.WoundsMax'),
                    key: 'system.wounds.max',
                },
                {
                    label: game.i18n.localize('SWADE.BenniesMax'),
                    key: 'system.bennies.max',
                },
                {
                    label: game.i18n.localize('SWADE.FatigueMax'),
                    key: 'system.fatigue.max',
                },
                {
                    label: game.i18n.localize('SWADE.EffectCallbacks.Shaken.UnshakeModifier'),
                    key: 'system.attributes.spirit.unShakeBonus',
                },
                {
                    label: game.i18n.localize('SWADE.DamageApplicator.SoakModifier'),
                    key: 'system.attributes.vigor.soakBonus',
                },
                {
                    label: game.i18n.localize('SWADE.EffectCallbacks.Stunned.UnStunModifier'),
                    key: 'system.attributes.vigor.unStunBonus',
                },
                {
                    label: game.i18n.localize('SWADE.EffectCallbacks.BleedingOut.BleedOutModifier'),
                    key: 'system.attributes.vigor.bleedOut.modifier',
                },
                {
                    label: game.i18n.localize('SWADE.EffectCallbacks.BleedingOut.IgnoreWounds'),
                    key: 'system.attributes.vigor.bleedOut.ignoreWounds',
                },
                {
                    label: game.i18n.localize('SWADE.WealthDie.Sides'),
                    key: 'system.details.wealth.die',
                },
                {
                    label: game.i18n.localize('SWADE.WealthDie.WildSides'),
                    key: 'system.details.wealth.wild-die',
                },
                {
                    label: game.i18n.localize('SWADE.WealthDie.Modifier'),
                    key: 'system.details.wealth.modifier',
                },
            ];
        }
    }
    #getExpirationOptions() {
        return {
            [constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto]: 'SWADE.Expiration.BeginAuto',
            [constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt]: 'SWADE.Expiration.BeginPrompt',
            [constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto]: 'SWADE.Expiration.EndAuto',
            [constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt]: 'SWADE.Expiration.EndPrompt',
        };
    }
    #prepareChanges() {
        this.#effect.changes = this.#changes.map((c) => {
            return {
                key: c.key,
                mode: c.mode,
                value: c.value,
            };
        });
    }
    static #onAddChange(_event, currentTarget) {
        const details = currentTarget.closest('details');
        const keyPart = currentTarget.dataset.key;
        const category = details?.dataset.category;
        const target = details?.querySelector('.target')
            ?.value ?? currentTarget.innerText;
        let label = '';
        let key = '';
        if (category === 'skill') {
            if (!target) {
                return ui.notifications.warn('Please enter a skill name first!');
            }
            label = `${target.capitalize()} ${currentTarget.innerText}`.trim();
            key = `@${category.capitalize()}{${target}}[system.${keyPart}]`;
        }
        else if (category === 'attribute') {
            label = `${target.capitalize()} ${currentTarget.innerText}`.trim();
            key = `system.attributes.${target}.${keyPart}`;
        }
        else {
            label = target;
            key = keyPart;
        }
        this.#changes?.push({
            label: label,
            key: key,
            mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        });
        this.render({ force: true });
    }
    static #onDeleteChange(_event, target) {
        const index = target.closest('li')?.dataset.index;
        this.#changes.splice(Number(index), 1);
        this.render({ force: true });
    }
    #setupAccordions() {
        this.form
            ?.querySelectorAll('.presets details')
            .forEach((el) => {
            this.#accordions.push(new Accordion(el, '.content', { duration: 200 }));
            const id = el.dataset.category;
            el.querySelector('summary')?.addEventListener('click', () => {
                const states = this.#collapsibleStates;
                const currentState = Boolean(states[id]);
                states[id] = !currentState;
            });
        });
    }
    static #onClickIcon(_event, _target) {
        new foundry.applications.apps.FilePicker.implementation({
            current: this.#effect.img,
            type: 'image',
            callback: this.#onChangeIcon.bind(this),
        }).render({ force: true });
    }
    #onChangeIcon(path, _picker) {
        this.#effect.img = path;
        this.render({ force: true });
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$8, HandlebarsApplicationMixin: HandlebarsApplicationMixin$9 } = foundry.applications.api;
class AdvanceEditor extends HandlebarsApplicationMixin$9(ApplicationV2$8) {
    constructor({ advance, actor, ...options }) {
        super(options);
        if (actor.type !== 'character' && actor.type !== 'npc') {
            throw TypeError(`Actor type ${actor.type} not permissible`);
        }
        this.#actor = actor;
        this.#advance = advance;
    }
    #actor;
    #advance;
    get actor() {
        return this.#actor;
    }
    get advance() {
        return this.#advance;
    }
    get advances() {
        return foundry.utils.getProperty(this.actor, 'system.advances.list');
    }
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE.Advances.EditorTitle',
            contentClasses: ['standard-form'],
        },
        position: {
            width: 420,
            height: 'auto',
        },
        classes: ['swade', 'advance-editor', 'swade-application'],
        tag: 'form',
        form: {
            handler: AdvanceEditor.onSubmit,
            submitOnClose: false,
            closeOnSubmit: false,
            submitOnChange: false,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/advanceEditor.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            advance: this.advance,
            rank: getRankFromAdvanceAsString(this.advance.sort ?? 0),
            advanceTypes: this.#getAdvanceTypes(),
            owner: this.actor.isOwner,
            notes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.advance.notes, {
                async: true,
                secrets: this.actor.isOwner,
            }),
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-solid fa-floppy-disk',
                    label: 'Save Changes',
                },
            ],
        });
        return context;
    }
    static async onSubmit(event, _form, formData) {
        const expanded = foundry.utils.expandObject(formData.object);
        const sortHasChanged = expanded.sort !== this.advance.sort;
        // Merge data to update
        const advance = foundry.utils.mergeObject(this.advance, {
            notes: expanded.advance.notes,
            planned: expanded.planned,
            type: expanded.type,
            sort: Math.clamp(expanded.sort, 1, this.advances.size),
        });
        if (sortHasChanged)
            return this.#handleSortingChange(advance);
        // Normal update operation
        this.advances.set(advance.id, advance);
        await this.actor.update({ 'system.advances.list': this.advances.toJSON() }, { diff: false });
        await this.render({ force: true });
        if (event.submitter)
            this.close();
    }
    #getAdvanceTypes() {
        return {
            [constants$1.ADVANCE_TYPE.EDGE]: 'SWADE.Advances.Types.Edge',
            [constants$1.ADVANCE_TYPE.SINGLE_SKILL]: 'SWADE.Advances.Types.SingleSkill',
            [constants$1.ADVANCE_TYPE.TWO_SKILLS]: 'SWADE.Advances.Types.TwoSkills',
            [constants$1.ADVANCE_TYPE.ATTRIBUTE]: 'SWADE.Advances.Types.Attribute',
            [constants$1.ADVANCE_TYPE.HINDRANCE]: 'SWADE.Advances.Types.Hindrance',
        };
    }
    #handleSortingChange(advance) {
        //remove the old advance
        if (this.advances.has(advance.id))
            this.advances.delete(advance.id);
        const arr = this.advances.toJSON();
        //calculate new index
        const newIndex = Math.max(0, advance.sort - 1);
        //insert new advance into array
        arr.splice(newIndex, 0, advance);
        //update sort values based on index
        arr.forEach((a, i) => (a.sort = i + 1));
        //yeet
        return this.actor.update({ 'system.advances.list': arr }, { diff: false });
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$7, HandlebarsApplicationMixin: HandlebarsApplicationMixin$8 } = foundry.applications.api;
class AttributeManager extends HandlebarsApplicationMixin$8(ApplicationV2$7) {
    constructor({ actor, ...options }) {
        if (!(actor instanceof Actor))
            throw new Error('Not an Actor!');
        super(options);
        this.#actor = actor;
    }
    #actor;
    static DEFAULT_OPTIONS = {
        classes: ['swade', 'attribute-manager', 'swade-application'],
        position: {
            width: 600,
            height: 'auto',
        },
        window: {
            contentClasses: ['standard-form'],
        },
        tag: 'form',
        form: {
            handler: AttributeManager.onSubmit,
            submitOnClose: false,
            submitOnChange: true,
            closeOnSubmit: false,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/attribute-manager.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    get id() {
        return `${this.actor.id}-attributeManager`;
    }
    get title() {
        return game.i18n.format('SWADE.AttributeManager.Title', {
            name: this.actor.name,
        });
    }
    get actor() {
        return this.#actor;
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            isExtra: !this.actor.isWildcard,
            dieSides: this.actor.type === 'character'
                ? getDieSidesRange(4, 20)
                : getDieSidesRange(4, 24),
            wildDieSides: getDieSidesRange(4, 12),
            dieSidesWithMinimum: this.actor.type === 'character'
                ? getDieSidesRange(1, 20)
                : getDieSidesRange(1, 24),
            actor: this.actor,
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-solid fa-floppy-disk',
                    label: 'Save Changes',
                },
            ],
        });
        return context;
    }
    static async onSubmit(event, _form, formData) {
        await this.actor.update(formData.object);
        await this.render({ force: true });
        if (event.submitter)
            this.close();
    }
}

class CompendiumTOC extends foundry.applications.sidebar.apps.Compendium {
    #disclaimer;
    #fullTextSearch;
    #dragDrop;
    #filters;
    static DEFAULT_OPTIONS = {
        window: {
            resizable: true,
        },
        position: {
            width: 800,
        },
        dragDrop: [
            { dropSelector: null, dragSelector: '.toc-entry' },
            { dropSelector: null, dragSelector: '.journal' },
        ],
        filters: [
            { inputSelector: '[name="search"]', contentSelector: '.content' },
            { inputSelector: '[name="category"]', contentSelector: '.content' },
        ],
        actions: {
            toggleSearchMode: CompendiumTOC.#onToggleSearchMode,
            createDocument: CompendiumTOC.#onCreateDocument,
            openDocument: CompendiumTOC.#onOpenDocument,
        },
        classes: ['swade-application', 'compendium-toc'],
    };
    static PARTS = {
        directory: { template: 'systems/swade/templates/apps/compendium-toc.hbs' },
    };
    static ALLOWED_TYPES = ['Actor', 'Item', 'JournalEntry'];
    static CF_ENTITY = '#[CF_tempEntity]';
    constructor(options) {
        super(options);
        this.#disclaimer = options?.disclaimer;
        this.#fullTextSearch = false;
        this.#dragDrop = this.#createDragDropHandlers();
        this.#filters = this.#createFiltersHandlers();
    }
    #createDragDropHandlers() {
        return this.options.dragDrop.map((d) => {
            d.permissions = {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            };
            d.callbacks = {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this),
            };
            return new foundry.applications.ux.DragDrop.implementation(d);
        });
    }
    #createFiltersHandlers() {
        return this.options.filters.map((f) => {
            f.callback = this._onSearchFilter.bind(this);
            // f.initial = this.element.querySelector(f.inputSelector)?.value;
            return new foundry.applications.ux.SearchFilter(f);
        });
    }
    get isJournal() {
        return this.documentName === 'JournalEntry';
    }
    get isActor() {
        return this.documentName === 'Actor';
    }
    get columnWidth() {
        switch (this.documentName) {
            case 'JournalEntry':
                return '230px';
            default:
                return '300px';
        }
    }
    get maxColumns() {
        switch (this.documentName) {
            case 'JournalEntry':
                return 3;
            default:
                return 5;
        }
    }
    _initializeApplicationOptions(options) {
        options = super._initializeApplicationOptions(options);
        options.classes ??= [];
        const toRemove = [
            'tab',
            'sidebar-tab',
            'compendium-directory',
            'directory',
            'themed',
            'theme-light',
            'theme-dark',
        ];
        options.classes = options.classes.filter((c) => !toRemove.includes(c));
        return options;
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = this.element;
        this.#dragDrop.forEach((d) => d.bind(html));
        this.#filters.forEach((f) => f.bind(html));
        html
            .querySelectorAll('.content')
            .forEach((e) => (e.style.columnWidth = this.columnWidth));
        new ResizeObserver(this._onObserveResize.bind(this)).observe(html);
        const { colorScheme } = game.settings.get('core', 'uiConfig');
        if (colorScheme.interface)
            this.element.classList.remove('themed', `theme-${colorScheme.interface}`);
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const tocContext = {
            isJournal: this.isJournal,
            isActor: this.isActor,
            header: game.i18n.localize('SWADE.CompendiumTOC.Header'),
            wildCardMarker: CONFIG.SWADE.wildCardIcons.compendium,
            columnWidth: this.columnWidth,
            disclaimer: this.#disclaimer,
            searchMode: {
                icon: 'fa-search',
                tooltip: 'SIDEBAR.SearchModeName',
            },
        };
        if (this.#fullTextSearch) {
            tocContext.searchMode.icon = 'fa-file-magnifying-glass';
            tocContext.searchMode.tooltip = 'SIDEBAR.SearchModeFull';
        }
        if (this.isJournal) {
            tocContext.entries = await this._getJournalEntries();
        }
        else {
            tocContext.categories = await this._groupContent();
        }
        if (this.isActor) {
            tocContext.actorCategories = Array.from(this.collection.index.reduce((acc, actor) => acc.add(actor.system?.category ?? ''), new Set([''])));
        }
        return foundry.utils.mergeObject(context, tocContext);
    }
    _onDragStart(event) {
        const src = event.currentTarget;
        if (!src.dataset.entryId)
            return;
        const indexData = this.collection.index.get(src.dataset.entryId);
        if (!indexData)
            return;
        const dragData = {
            type: this.documentName,
            uuid: indexData.uuid,
        };
        event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    }
    async _onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            const entry = await fromUuid(data.uuid);
            await super._createDroppedEntry(entry);
        }
        catch (error) {
            Logger.error(error);
        }
        this.render(true);
    }
    static #onToggleSearchMode(_event, _target) {
        this.#fullTextSearch = !this.#fullTextSearch;
        this.render();
    }
    static #onCreateDocument(_event, _target) {
        this.documentClass.createDialog({}, {
            renderSheet: true,
            pack: this.collection.metadata.id,
        });
    }
    static async #onOpenDocument(_event, target) {
        const entryId = target?.closest('[data-entry-id]')?.dataset.entryId;
        const pageId = target?.closest('[data-page-id]')?.dataset.pageId;
        if (!entryId)
            return;
        const options = {};
        if (pageId)
            options.pageId = pageId;
        const doc = await this.collection.getDocument(entryId);
        if (!doc)
            return;
        if (doc.sheet instanceof Application)
            await doc.sheet?._render(true, options);
        else if (doc.sheet instanceof foundry.applications.api.ApplicationV2)
            await doc.sheet.render({ force: true });
        if (pageId)
            doc.sheet.goToPage(pageId);
    }
    _createContextMenus() {
        const selector = this.isJournal ? '.journal header' : '[data-entry-id]';
        this._createContextMenu(this._getEntryContextOptions, selector, {
            fixed: true,
            hookName: `get${this.documentName}ContextOptions`,
            parentClassHooks: false,
        });
    }
    _onSearchFilter(_event, _query, _rgx, html) {
        const selector = this.isJournal ? '.page' : '.toc-entry';
        const children = html.querySelectorAll(selector);
        const pack = game.packs.get(this.collection.metadata.id, { strict: true });
        const category = this.element.querySelector('[name="category"]')?.value;
        const queryRaw = this.element.querySelector('[name="search"]')?.value ?? '';
        const query = foundry.applications.ux.SearchFilter.cleanQuery(queryRaw);
        const rgx = new RegExp(RegExp.escape(query), 'i');
        let searchFields = [];
        switch (this.collection.metadata.type) {
            case 'Actor':
                searchFields = CONFIG.SWADE.textSearch.actor;
                break;
            // case 'Adventure':
            //   searchFields = CONFIG.SWADE.textSearch.adventure;
            //   break;
            // case 'Cards':
            //   searchFields = CONFIG.SWADE.textSearch.cards;
            //   break;
            case 'Item':
                searchFields = CONFIG.SWADE.textSearch.item;
                break;
            case 'JournalEntry':
                searchFields = CONFIG.SWADE.textSearch.journalentry.concat(CONFIG.JournalEntry.compendiumIndexFields);
                break;
            // case 'Macro':
            //   searchFields = CONFIG.SWADE.textSearch.macro;
            //   break;
            // case 'Playlist':
            //   searchFields = CONFIG.SWADE.textSearch.playlist;
            //   break;
            // case 'RollTable':
            //   searchFields = CONFIG.SWADE.textSearch.rolltable;
            //   break;
            // case 'Scene':
            //   searchFields = CONFIG.SWADE.textSearch.scene;
            //   break;
        }
        pack.getIndex({ fields: searchFields }).then(() => {
            const searchConfig = {
                filters: [],
            };
            if (category?.length)
                searchConfig.filters.push({
                    field: 'system.category',
                    value: category,
                });
            if (this.#fullTextSearch) {
                searchConfig.query = query;
            }
            let searchResults = pack.search(searchConfig);
            if (this.isJournal)
                searchResults = searchResults.flatMap((i) => i.pages);
            if (!this.#fullTextSearch) {
                searchResults = searchResults.filter((i) => rgx.test(i.name));
            }
            for (const li of children) {
                if (searchResults.some((e) => [li.dataset.entryId, li.dataset.pageId].includes(e._id))) {
                    li.style.display = 'flex';
                }
                else {
                    li.style.display = 'none';
                }
            }
            this._fitColumns(this.element, html);
        });
    }
    async _groupContent() {
        if (this.documentName === 'Item') {
            return this._groupItems();
        }
        else {
            return this._groupActors();
        }
    }
    async _groupActors() {
        const collection = this.collection;
        const documents = (await collection.getIndex({
            fields: [
                /** legacy data start */
                'data.wildcard',
                'token.img',
                'token.scale',
                /** legacy data end*/
                'system.wildcard',
                'system.category',
                'prototypeToken.randomImg',
                'prototypeToken.texture.src',
                'prototypeToken.texture.scaleX',
                'prototypeToken.texture.scaleY',
            ],
        }));
        const actors = documents.filter((doc) => doc.name !== CompendiumTOC.CF_ENTITY);
        const actorsByType = {};
        for (const actor of actors) {
            const type = actor.type;
            if (!actorsByType[type])
                actorsByType[type] = [];
            actorsByType[type].push(actor);
        }
        const categories = [];
        for (const type in actorsByType) {
            const actors = actorsByType[type];
            categories.push({
                category: game.i18n.localize(`TYPES.Actor.${type}`),
                entries: await this._groupUnCategorized(actors),
            });
        }
        return categories
            .sort((a, b) => a.category.localeCompare(b.category))
            .filter((cat) => cat.groups?.length || cat.entries?.length);
    }
    async _groupItems() {
        const collection = this.collection;
        const documents = await collection.getDocuments();
        const items = documents.filter((doc) => doc.name !== CompendiumTOC.CF_ENTITY);
        //set up category groups
        const categories = [];
        //always group powers by type and then rank
        const powers = items.filter((i) => i.type === 'power');
        if (powers.length) {
            categories.push({
                category: game.i18n.localize('TYPES.Item.power'),
                groups: this._groupPowers(powers),
            });
        }
        const edges = items.filter((i) => i.type === 'edge');
        if (edges.length) {
            categories.push({
                category: game.i18n.localize('TYPES.Item.edge'),
                groups: this._groupEdges(edges),
            });
        }
        const hindrances = items.filter((i) => i.type === 'hindrance');
        if (hindrances.length) {
            categories.push({
                category: game.i18n.localize('TYPES.Item.hindrance'),
                entries: this._groupHindrances(hindrances),
            });
        }
        //sort all items by type
        const itemsByType = {};
        const leftovers = items.filter((i) => !['edge', 'power', 'hindrance'].includes(i.type));
        for (const item of leftovers) {
            const type = item.type;
            if (!itemsByType[type])
                itemsByType[type] = [];
            itemsByType[type].push(item);
        }
        const itemsByCategory = {};
        //first we handle items by type
        for (const type in itemsByType) {
            const items = itemsByType[type];
            const typeLabel = game.i18n.localize(`TYPES.Item.${type}`);
            const [unCategorized, categorized] = items.partition((i) => i.canHaveCategory &&
                !!foundry.utils.getProperty(i, 'system.category'));
            //handle the un-categorized things first, which are sorted by type
            categories.push({
                category: typeLabel,
                entries: await this._groupUnCategorized(unCategorized),
            });
            //sort categorized items by category
            for (const item of categorized) {
                const category = foundry.utils.getProperty(item, 'system.category');
                if (!itemsByCategory[category]) {
                    itemsByCategory[category] = [];
                }
                itemsByCategory[category].push(item);
            }
        }
        for (const category in itemsByCategory) {
            const items = itemsByCategory[category];
            categories.push({
                category: category,
                entries: await this._groupUnCategorized(items),
            });
        }
        return categories
            .sort((a, b) => a.category.localeCompare(b.category))
            .filter((cat) => cat.groups?.length || cat.entries?.length);
    }
    _groupHindrances(hindrances) {
        return hindrances
            .map((hindrance) => {
            let suffix;
            if (hindrance.system.isMajor) {
                suffix = game.i18n.localize('SWADE.Major');
            }
            else if (hindrance.system.severity === constants$1.HINDRANCE_SEVERITY.MINOR) {
                suffix = game.i18n.localize('SWADE.Minor');
            }
            else {
                suffix = `(${game.i18n.localize('SWADE.HindMajor')} / ${game.i18n.localize('SWADE.HindMinor')})`;
            }
            const name = `${hindrance.name} ${suffix}`;
            return {
                name: name.trim(),
                id: hindrance.id,
                img: hindrance.img,
            };
        })
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    _groupPowers(powers) {
        const groups = {};
        for (const power of powers) {
            const rank = foundry.utils.getProperty(power, 'system.rank');
            if (!groups[rank])
                groups[rank] = [];
            groups[rank].push(power);
        }
        return Object.entries(groups)
            .sort((a, b) => SWADE.ranks.indexOf(a[0]) - SWADE.ranks.indexOf(b[0]))
            .map((val) => {
            return {
                group: val[0],
                entries: val[1]
                    .map((entry) => {
                    return {
                        name: entry.name,
                        id: entry.id,
                        img: entry.img,
                    };
                })
                    .sort((a, b) => a.name.localeCompare(b.name)),
            };
        });
    }
    _groupEdges(edges) {
        const groups = {};
        for (const edge of edges) {
            const cat = foundry.utils.getProperty(edge, 'system.category');
            if (!groups[cat])
                groups[cat] = [];
            groups[cat].push(edge);
        }
        return Object.entries(groups)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map((val) => {
            return {
                group: val[0],
                entries: val[1]
                    .map((entry) => {
                    const requirements = entry.system.requirementString ?? '';
                    return {
                        name: entry.name,
                        id: entry.id,
                        img: entry.img,
                        requirements: requirements.replace(/<\/?i>/g, ''),
                    };
                })
                    .sort((a, b) => a.name.localeCompare(b.name)),
            };
        });
    }
    async _groupUnCategorized(docs) {
        const mapped = docs.map(async (doc) => {
            const isItem = doc?.documentName === 'Item';
            if (isItem) {
                const requirements = doc.system.requirementString ?? '';
                return {
                    name: doc.name,
                    id: doc.id,
                    img: doc.img,
                    requirements: requirements.replace(/<\/?i>/g, ''),
                };
            }
            return {
                name: doc.name,
                id: doc._id,
                img: await this._getActorTokenImage(doc),
                isWildcard: this._actorIsWildcard(doc),
            };
        });
        const resolved = await Promise.all(mapped);
        return resolved.sort((a, b) => a.name.localeCompare(b.name));
    }
    async _getJournalEntries() {
        const collection = this.collection;
        const journals = await collection.getDocuments();
        const entries = journals
            .filter((doc) => doc.name !== CompendiumTOC.CF_ENTITY)
            .sort(this._sortDocs)
            .map((doc) => {
            let pages = [];
            if (doc.pages.size > 1) {
                pages = doc.pages
                    .map((p) => {
                    return {
                        id: p.id,
                        name: p.name,
                        sort: p.sort,
                    };
                })
                    .sort(this._sortDocs);
            }
            return {
                name: doc.name,
                id: doc.id,
                pages: pages,
            };
        });
        return entries;
    }
    _onObserveResize(entries, _observer) {
        for (const entry of entries) {
            const content = entry.target.querySelector('.content');
            const parent = entry.target.querySelector('.window-content');
            if (!content || !parent)
                continue;
            this._fitColumns(parent, content);
            //move the searchbar
            const search = entry.target.querySelector('.search');
            if (entry.target.clientWidth < 400) {
                search?.classList.remove('top-row');
                search?.classList.add('second-row');
            }
            else {
                search?.classList.add('top-row');
                search?.classList.remove('second-row');
            }
        }
    }
    _fitColumns(parent, content) {
        let isOverFlowing = content.scrollHeight > parent.clientHeight;
        let columnCount = 1;
        do {
            content.style.columnCount = columnCount.toString();
            isOverFlowing = content.scrollHeight > parent.clientHeight;
            columnCount++;
        } while (isOverFlowing && columnCount <= this.maxColumns);
    }
    _sortDocs(a, b) {
        const sort = a.sort - b.sort;
        if (sort !== 0)
            return sort;
        return a.name.localeCompare(b.name);
    }
    _requestTokenImages(actorId, pack) {
        return new Promise((resolve, reject) => {
            game.socket.emit('requestTokenImages', actorId, { pack }, (result) => {
                if (result.error)
                    return reject(new Error(result.error));
                resolve(result.files);
            });
        });
    }
    async _getActorTokenImage(actor) {
        let path;
        let scale = 1;
        const pack = this.collection.metadata.id;
        const prototypeToken = actor.prototypeToken;
        //Priority 1: Compendium Artpacks
        if (game.swade.compendiumArt.map.has(`Compendium.${pack}.${actor._id}`)) {
            return this._getCompendiumArt(actor);
        }
        //Priority 2: random token art
        else if (prototypeToken?.randomImg) {
            try {
                [path] = await this._requestTokenImages(actor._id, this.collection.metadata.id);
            }
            catch (error) {
                Logger.error(error);
            }
        }
        else if (prototypeToken?.texture.src) {
            //Priority 3: Normal token art
            const texture = prototypeToken.texture;
            path = texture.src;
            scale = (texture.scaleX + texture.scaleY) / 2; // get the average
        }
        else if (actor.token.img) {
            //legacy code
            path = actor.token.img;
            scale = actor.token.scale;
        }
        else {
            //lowest Priority actor image
            path = actor.img;
        }
        return { path, scale };
    }
    _actorIsWildcard(actor) {
        // eslint-disable-next-line deprecation/deprecation
        return actor.system?.wildcard || actor.data?.wildcard;
    }
    _getCompendiumArt(actor) {
        const pack = this.collection.metadata.id;
        const art = game.swade.compendiumArt.map.get(`Compendium.${pack}.${actor._id}`);
        let path = '';
        let scale = 1;
        if (art) {
            actor.img = art.actor;
            if (typeof art.token === 'string') {
                path = art.token;
            }
            else {
                path = art.token.img;
                scale = art.token.scale;
            }
        }
        return { path, scale };
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
const { ApplicationV2: ApplicationV2$6, HandlebarsApplicationMixin: HandlebarsApplicationMixin$7 } = foundry.applications.api;
class SettingConfigurator extends HandlebarsApplicationMixin$7(ApplicationV2$6) {
    config = SWADE.settingConfig;
    static DEFAULT_OPTIONS = {
        id: 'settingConfig',
        window: {
            title: 'SWADE.SettingConf',
            resizable: false,
            contentClasses: ['standard-form'],
        },
        position: {
            width: 600,
            height: 700,
        },
        classes: ['setting-config', 'sheet', 'swade-application'],
        tag: 'form',
        form: {
            handler: SettingConfigurator.onSubmit,
            closeOnSubmit: false,
            submitOnClose: true,
            submitOnChange: true,
        },
        actions: {
            reset: SettingConfigurator.#resetSettings,
            createChar: SettingConfigurator.#onCreateChar,
            createItem: SettingConfigurator.#onCreateItem,
            delete: SettingConfigurator.#onDelete,
        },
    };
    static PARTS = {
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        basics: {
            template: 'systems/swade/templates/apps/configurator/basics.hbs',
            scrollable: [''],
        },
        setting: {
            template: 'systems/swade/templates/apps/configurator/setting.hbs',
            scrollable: [''],
        },
        bennies: {
            template: 'systems/swade/templates/apps/configurator/bennies.hbs',
            scrollable: [''],
        },
        additionalStats: {
            template: 'systems/swade/templates/apps/configurator/additional-stats.hbs',
            scrollable: [''],
        },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    static TABS = {
        sheet: {
            tabs: [
                { id: 'basics', label: 'SWADE.WorldBasics' },
                { id: 'setting', label: 'SWADE.SettingRules' },
                { id: 'bennies', label: 'SWADE.Bennies' },
                { id: 'additionalStats', label: 'SWADE.AddStats' },
            ],
            initial: 'basics',
        },
    };
    async _prepareContext(options) {
        const settingFields = game.settings.get('swade', 'settingFields');
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            settingRules: {},
            actorSettingStats: settingFields.actor,
            itemSettingStats: settingFields.item,
            dice3d: !!game.dice3d,
            dtypes: {
                String: 'SWADE.String',
                Number: 'SWADE.Number',
                Boolean: 'SWADE.Checkbox',
                Die: 'SWADE.Die',
                Selection: 'SWADE.Selection',
            },
            coreSkillPackChoices: this.#buildCoreSkillPackChoices(),
            actionDeckChoices: this.#buildActionDeckChoices(),
            discardPileChoices: this.#buildActionDeckDiscardPileChoices(),
            injuryTableChoices: await this.#buildInjuryTableChoices(),
            armorStackingChoices: this.#getArmorStackingChoices(),
            wealthTypes: this.#getWealthTypes(),
            buttons: [
                { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
                {
                    type: 'reset',
                    action: 'reset',
                    icon: 'fa-solid fa-undo',
                    cssClass: 'submit',
                    label: 'SETTINGS.Reset',
                },
            ],
        });
        for (const setting of this.config.settings) {
            context.settingRules[setting] = game.settings.get('swade', setting);
        }
        return context;
    }
    async _preparePartContext(partId, context, options) {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId in partContext.tabs)
            partContext.tab = partContext.tabs[partId];
        return partContext;
    }
    static async onSubmit(event, _form, formData) {
        // Gather Data
        const expandedFormData = foundry.utils.expandObject(formData.object);
        const formActorAttrs = expandedFormData.actorSettingStats || {};
        const formItemAttrs = expandedFormData.itemSettingStats || {};
        // Set the "easy" settings
        for (const [key, settingValue] of Object.entries(expandedFormData.settingRules)) {
            if (this.config.settings.includes(key) &&
                settingValue !== game.settings.get('swade', key)) {
                await game.settings.set('swade', key, settingValue);
            }
        }
        // Handle the free-form attributes list
        const settingFields = game.settings.get('swade', 'settingFields');
        const actorStats = this.#handleKeyValidityCheck(formActorAttrs);
        const itemStats = this.#handleKeyValidityCheck(formItemAttrs);
        const saveValue = {
            actor: this.#handleRemovableAttributes(actorStats, settingFields.actor),
            item: this.#handleRemovableAttributes(itemStats, settingFields.item),
        };
        await game.settings.set('swade', 'settingFields', saveValue);
        await this.render({ force: true });
        if (event.submitter)
            this.close();
    }
    static async #resetSettings(_event, _target) {
        for (const setting of this.config.settings) {
            const resetValue = game.settings.settings.get(`swade.${setting}`).default;
            if (game.settings.get('swade', setting) !== resetValue) {
                await game.settings.set('swade', setting, resetValue);
            }
        }
        this.render({ force: true });
    }
    async #createHelper(event, isItem) {
        const documentType = isItem ? 'item' : 'actor';
        event.preventDefault();
        const settingFields = game.settings.get('swade', 'settingFields');
        const form = this.form;
        const nk = Object.keys(settingFields[documentType]).length + 1;
        const newElement = document.createElement('div');
        newElement.innerHTML = `<input type="text" name="${documentType}SettingStats.attr${nk}.key" value="attr${nk}"/>`;
        const newKey = newElement.children[0];
        form
            ?.querySelector('[data-application-part="additionalStats"]')
            ?.appendChild(newKey);
        await this._onSubmitForm(this.options.form, event);
        await this.render({ force: true });
    }
    static async #onCreateChar(event, _target) {
        await this.#createHelper(event, false);
    }
    static async #onCreateItem(event, _target) {
        await this.#createHelper(event, true);
    }
    static async #onDelete(event, target) {
        event.preventDefault();
        const li = target.closest('.attribute');
        if (li)
            li.parentElement?.removeChild(li);
        await this._onSubmitForm(this.options.form, event);
        this.render({ force: true });
    }
    #handleKeyValidityCheck(stats) {
        const retVal = {};
        for (const stat of Object.values(stats)) {
            let key = stat.key.trim();
            if (/[\s.]/.test(key)) {
                const invalidKey = key;
                key = key.slugify().replace('.', '-');
                ui.notifications.warn(game.i18n.format('SWADE.AdditionalStats.KeyErr', {
                    invalid: invalidKey,
                    key: key,
                }), { permanent: true });
            }
            delete stat.key;
            retVal[key] = stat;
        }
        return retVal;
    }
    /**
     * Remove attributes which are no longer use
     * @param attributes
     * @param base
     */
    #handleRemovableAttributes(attributes, base) {
        for (const k of Object.keys(base)) {
            if (!attributes.hasOwnProperty(k)) {
                delete attributes[k];
            }
        }
        return attributes;
    }
    #getArmorStackingChoices() {
        return {
            core: 'SWADE.Settings.ArmorStacking.Choices.Core',
            swpf: 'SWADE.Settings.ArmorStacking.Choices.SWPF',
        };
    }
    #getWealthTypes() {
        return {
            currency: 'SWADE.Currency',
            wealthDie: 'SWADE.WealthDie.Label',
            none: 'SWADE.WealthSelectionNoneOther',
        };
    }
    #buildCoreSkillPackChoices() {
        return game.packs
            ?.filter((p) => {
            const index = Array.from(p.index.values()).filter(
            //remove the CF entities
            (e) => e.name !== '#[CF_tempEntity]');
            const isItem = p.metadata.type === 'Item';
            return isItem && index.every((v) => v['type'] === 'skill');
        })
            .reduce((acc, p) => {
            let packName = 'System';
            if (p.metadata['packageType'] !== 'system') {
                packName = game.modules.get(p.metadata['packageName'])?.['title'];
            }
            acc[p.collection] = `${p.metadata.label} (${packName})`;
            return acc;
        }, {});
    }
    #buildActionDeckChoices() {
        const deckChoices = {};
        game.cards
            ?.filter((stack) => {
            const cards = Array.from(stack.cards.values());
            return stack.type === 'deck' && cards.every((c) => c.type === 'poker');
        })
            .forEach((d) => (deckChoices[d.id] = d.name));
        return deckChoices;
    }
    #buildActionDeckDiscardPileChoices() {
        const discardPiles = {};
        game.cards
            ?.filter((stack) => stack.type === 'pile')
            .forEach((p) => (discardPiles[p.id] = p.name));
        return discardPiles;
    }
    #buildInjuryTableChoices() {
        const injuryTables = [];
        //add world tables, if necessary
        if (game.tables?.contents.length) {
            injuryTables.push({
                group: game.i18n.localize('SWADE.SettingConfigurator.WorldTables'),
                options: game.tables.contents.map((t) => {
                    return { key: t.uuid, label: t.name };
                }),
            });
        }
        const rollTablePacks = game.packs.filter((p) => p.metadata.type === 'RollTable');
        const worldPacks = rollTablePacks.filter((p) => p.metadata.packageType === 'world');
        //add world compendium packs, if necessary
        if (worldPacks.length) {
            injuryTables.push({
                group: game.i18n.localize('SWADE.SettingConfigurator.WorldCompendiums'),
                options: worldPacks
                    .flatMap((p) => p.index.contents)
                    .map((i) => {
                    return { key: i.uuid, label: i.name };
                }),
            });
        }
        //add an entry for every module, if necessary
        for (const module of game.modules.values()) {
            const packs = rollTablePacks.filter((p) => p.metadata.packageName === module.id);
            if (!packs.length)
                continue;
            injuryTables.push({
                group: module.title,
                options: packs
                    .flatMap((p) => p.index.contents)
                    .map((i) => {
                    return { key: i.uuid, label: i.name };
                }),
            });
        }
        injuryTables.sort((a, b) => a.group.localeCompare(b.group));
        return injuryTables;
    }
}

class SwadeDocumentTweaks extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    settingFields;
    constructor(options) {
        super(options);
        const settingFields = this.#getPrototypeSettingFields();
        for (const key in settingFields) {
            if (this.document.system.additionalStats[key] &&
                this.document.system.additionalStats[key]?.dtype) {
                settingFields[key].useField = true;
            }
        }
        this.settingFields = settingFields;
    }
    static DEFAULT_OPTIONS = {
        position: {
            width: 400,
            height: 600,
        },
        window: {
            contentClasses: ['standard-form'],
        },
        classes: ['swade', 'doc-tweaks', 'swade-application'],
    };
    get id() {
        return `Swade${this.document.documentName}Tweaks-${this.document.documentName}-${this.document.id}`;
    }
    /** Add the Document name into the window title*/
    get title() {
        return `${this.document.name}: ${game.i18n.localize('SWADE.Tweaks')}`;
    }
    async _prepareContext(options) {
        return foundry.utils.mergeObject(await super._prepareContext(options), {
            settingFields: this.settingFields,
            hasSettingFields: !foundry.utils.isEmpty(this.settingFields),
            buttons: [
                { type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' },
            ],
        });
    }
    _processFormData(_event, _form, formData) {
        const expandedFormData = foundry.utils.expandObject(formData.object);
        //recombine the formdata
        foundry.utils.setProperty(expandedFormData, 'system.additionalStats', this.#handleAdditionalStats(expandedFormData));
        return expandedFormData;
    }
    #getPrototypeSettingFields() {
        const fields = game.settings.get('swade', 'settingFields');
        let settingFields = {};
        if (this.document instanceof SwadeActor) {
            settingFields = fields.actor;
        }
        else if (this.document instanceof SwadeItem) {
            settingFields = fields.item;
        }
        return structuredClone(settingFields);
    }
    #handleAdditionalStats(expandedFormData) {
        const formFields = expandedFormData.system.additionalStats ?? {};
        const prototypeFields = this.#getPrototypeSettingFields();
        const newFields = structuredClone(this.document.system.additionalStats);
        //handle setting specific fields
        for (const [key, field] of Object.entries(formFields)) {
            const fieldExistsOnDoc = this.document.system.additionalStats[key];
            if (field.useField && fieldExistsOnDoc) {
                // Fixes blank label when toggling Additional Stat while there's an active effect
                if (newFields[key].label === undefined)
                    newFields[key].label = prototypeFields[key].label;
                //update existing field
                newFields[key].hasMaxValue = prototypeFields[key].hasMaxValue;
                newFields[key].dtype = prototypeFields[key].dtype;
                if (newFields[key].dtype === 'Boolean')
                    newFields[key]['-=max'] = null;
            }
            else if (field.useField && !fieldExistsOnDoc) {
                //add new field
                newFields[key] = prototypeFields[key];
                switch (prototypeFields[key].dtype) {
                    case 'Die':
                    case 'String':
                        newFields[key].value = '';
                        if (prototypeFields[key].max)
                            newFields[key].max = '';
                        break;
                    case 'Number':
                        newFields[key].value = 0;
                        if (prototypeFields[key].max)
                            newFields[key].max = 0;
                        break;
                    case 'Boolean':
                        newFields[key].value = false;
                        break;
                }
            }
            else {
                //delete field
                newFields[`-=${key}`] = null;
                delete newFields[key];
            }
        }
        //handle "stray" fields that exist on the actor but have no prototype
        for (const key in this.document.system.additionalStats) {
            if (!prototypeFields[key]) {
                //@ts-expect-error This is only done to delete the key
                newFields[`-=${key}`] = null;
            }
        }
        return newFields;
    }
    _prepareSubmitData(event, form, formData, updateData) {
        const submitData = super._prepareSubmitData(event, form, formData, updateData);
        // Prevent submitting overridden values
        const overrides = foundry.utils.flattenObject(this.document.overrides);
        for (const k of Object.keys(overrides)) {
            if (k.startsWith('system.'))
                delete submitData[`data.${k.slice(7)}`]; // Band-aid for < v10 data
            delete submitData[k];
        }
        return submitData;
    }
}
class SwadeActorTweaks extends SwadeDocumentTweaks {
    static PARTS = {
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        traits: {
            template: 'systems/swade/templates/actors/apps/tweaks/tab-traits.hbs',
            scrollable: [''],
        },
        additionalStats: {
            template: 'systems/swade/templates/actors/apps/tweaks/tab-additional-stats.hbs',
            scrollable: [''],
        },
        auras: {
            template: 'systems/swade/templates/actors/apps/tweaks/tab-auras.hbs',
            scrollable: [''],
        },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    static TABS = {
        sheet: {
            tabs: [
                { id: 'traits', label: 'SWADE.Summary' },
                { id: 'additionalStats', label: 'SWADE.AddStats' },
                { id: 'auras', label: 'SWADE.Auras.TabHeader' },
            ],
            initial: 'traits',
        },
    };
    _configureRenderParts(options) {
        const hasSettingFields = !foundry.utils.isEmpty(this.settingFields);
        const parts = super._configureRenderParts(options);
        if (!hasSettingFields)
            delete parts.additionalStats;
        if (this.document.type === 'group')
            delete parts.traits;
        return parts;
    }
    async _prepareContext(options) {
        return foundry.utils.mergeObject(await super._prepareContext(options), {
            isNPC: this.document.type === 'npc',
            isVehicle: this.document.type === 'vehicle',
            isGroup: this.document.type === 'group',
            hasModSlots: game.settings.get('swade', 'vehicleMods'),
            hasEnergy: game.settings.get('swade', 'vehicleEnergy'),
            runningDieTypes: getDieSidesRange(1, 12),
        });
    }
    async _preparePartContext(partId, context, options) {
        const partContext = await super._preparePartContext(partId, context, options);
        if (partId === 'tabs') {
            if (!partContext.hasSettingFields)
                delete partContext.tabs.additionalStats;
            if (partContext.isGroup) {
                delete partContext.tabs.traits;
                if (partContext.tabs.additionalStats)
                    partContext.tabs.additionalStats.active = true;
                else
                    partContext.tabs.auras.active = true;
            }
        }
        else if (partId === 'auras') {
            partContext.auraFields =
                this.document.system.schema.fields.auras.element.fields;
        }
        if (partId in partContext.tabs)
            partContext.tab = partContext.tabs[partId];
        return partContext;
    }
}
class SwadeItemTweaks extends SwadeDocumentTweaks {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
        actions: {
            regenerateSWID: SwadeItemTweaks.#regenerateSWID,
        },
    }, { inplace: false });
    static PARTS = {
        main: { template: 'systems/swade/templates/item/apps/tweaks.hbs', scrollable: [''] },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    static async #regenerateSWID() {
        await this.document.regenerateSWID();
        this.render({ force: true });
    }
}

class SwadeToken extends foundry.canvas.placeables.Token {
    #blk = 0x000000;
    auras = new Collection();
    /**
     * This token's shape at its canvas position
     * thanks to stwlam for this!
     */
    get localShape() {
        switch (this.shape.type) {
            case PIXI.SHAPES.RECT:
                return this.bounds;
            case PIXI.SHAPES.POLY: {
                const shape = this.shape.clone();
                const bounds = this.bounds;
                shape.points = shape.points.map((c, i) => i % 2 === 0 ? c + bounds.x : c + bounds.y);
                return shape;
            }
            case PIXI.SHAPES.CIRC: {
                const shape = this.shape.clone();
                const center = this.center;
                shape.x = center.x;
                shape.y = center.y;
                return shape;
            }
        }
    }
    _drawBar(number, bar, data) {
        if (data?.attribute === 'wounds') {
            return this._drawWoundsBar(number, bar, data);
        }
        return super._drawBar(number, bar, data);
    }
    _drawWoundsBar(number, bar, data) {
        const { value, max } = data;
        const colorPct = Math.clamp(value, 0, max) / max;
        const woundColor = SwadeActor.getWoundsColor(value, max);
        // Determine the container size (logic borrowed from core)
        const w = this.w;
        let h = Math.max(canvas.dimensions.size / 12, 8);
        if (this.document.height >= 2)
            h *= 1.6;
        const stroke = Math.clamp(h / 8, 1, 2);
        //set up bar container
        this._resetVitalsBar(bar, w, h, stroke);
        //fill bar as wounds increase, gradually going from green to red as it fills
        bar
            .beginFill(woundColor, 1.0)
            .lineStyle(stroke, this.#blk, 1.0)
            .drawRoundedRect(0, 0, colorPct * w, h, 2);
        //position the bar according to its number
        this._setVitalsBarPosition(bar, number, h);
    }
    _drawFatigueBar(number, bar, data) {
        const { value, max } = data;
        const colorPct = Math.clamp(value, 0, max) / max;
        const woundColor = SwadeActor.getFatigueColor(value, max);
        // Determine the container size (logic borrowed from core)
        const w = this.w;
        let h = Math.max(canvas.dimensions.size / 12, 8);
        if (this.document.height >= 2)
            h *= 1.6;
        const stroke = Math.clamp(h / 8, 1, 2);
        //set up bar container
        this._resetVitalsBar(bar, w, h, stroke);
        //fill bar as wounds increase, gradually going from green to red as it fills
        bar
            .beginFill(woundColor, 1.0)
            .lineStyle(stroke, this.#blk, 1.0)
            .drawRoundedRect(0, 0, colorPct * w, h, 2);
        //position the bar according to its number
        this._setVitalsBarPosition(bar, number, h);
    }
    _resetVitalsBar(bar, width, height, stroke) {
        bar
            .clear()
            .beginFill(this.#blk, 0.5)
            .lineStyle(stroke, this.#blk, 1.0)
            .drawRoundedRect(0, 0, width, height, 3);
    }
    _setVitalsBarPosition(bar, order, height) {
        // Set position
        const posY = order === 0 ? this.h - height : 0;
        bar.position.set(0, posY);
    }
}

class PokerData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            isJoker: new fields.BooleanField({ label: 'SWADE.IsJoker' }),
            suit: new fields.NumberField({ min: 1, max: 4, label: 'SWADE.CardSuit' }), // Possible that it's preferable to do this with choices
        };
    }
}

const config$3 = {
    poker: PokerData,
};

var index$4 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    PokerData: PokerData,
    config: config$3
});

class ItemCardService {
    gatherRollModifiers(ctx) {
        const { item, html, action, actionObj } = ctx;
        const mods = [];
        //if it's a power and the No Power Points rule is in effect add the power cost as a modifier to the roll
        if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
            const ppCost = html.querySelector('input.pp-adjust')
                ?.valueAsNumber ?? 0;
            let modifier = Math.ceil(ppCost / 2);
            modifier = Math.min(modifier * -1, modifier);
            if (action === 'formula' ||
                actionObj?.type === constants$1.ACTION_TYPE.TRAIT) {
                mods.push({
                    label: game.i18n.localize('TYPES.Item.power'),
                    value: modifier,
                });
            }
        }
        return mods;
    }
    async handleFormulaAction(item, actor, additionalMods = []) {
        const traitName = foundry.utils.getProperty(item, 'system.actions.trait');
        if (!item.canExpendResources()) {
            // TODO: Refactor to be more accurate & more general (probably grab from the PP cost box?)
            Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
            return null;
        }
        additionalMods.push(...item.traitModifiers);
        const trait = getTrait(traitName, actor);
        const roll = await this.#doTraitAction(trait, actor, {
            additionalMods,
            item,
        });
        if (roll && !item.isMeleeWeapon)
            await item.consume();
        this.#callActionHook(item, actor, 'formula', roll);
        return roll;
    }
    async handleDamageAction(item, actor, additionalMods = []) {
        const dmgMod = this.#getDamageMod(item);
        if (dmgMod)
            additionalMods.push(dmgMod);
        const roll = await item.rollDamage({ additionalMods });
        this.#callActionHook(item, actor, 'damage', roll);
        return roll;
    }
    /**
     * Handles misc actions
     * @param item The item that this action is used on
     * @param actor The actor who has the item
     * @param key The action key
     * @returns the evaluated roll
     */
    async handleAdditionalAction(item, actor, action, key, additionalMods = [], event) {
        if (!action)
            return null;
        let roll = null;
        if (action.type === constants$1.ACTION_TYPE.TRAIT ||
            action.type === constants$1.ACTION_TYPE.RESIST) {
            roll = await this.#handleTraitAction(action, item, actor, additionalMods);
        }
        else if (action.type === constants$1.ACTION_TYPE.DAMAGE) {
            //Do Damage stuff
            roll = await this.#handleDamageAction(action, item, additionalMods);
        }
        else if (action.type === constants$1.ACTION_TYPE.MACRO) {
            await this.#handleMacroAction(action, item, event);
            return null;
        }
        this.#callActionHook(item, actor, key, roll);
        return roll;
    }
    async handlePowerPoints(item, actor, btn, html) {
        //bail early if the No Power points rule is in effect
        if (game.settings.get('swade', 'noPowerPoints'))
            return;
        const ppCost = html.querySelector('input.pp-adjust')?.valueAsNumber ??
            0;
        const adjustment = btn.dataset.adjust;
        if (item.type === 'power') {
            //handle Power Item Card PP adjustment
            const arcane = foundry.utils.getProperty(item, 'system.arcane');
            const key = `system.powerPoints.${arcane || 'general'}.value`;
            const oldPP = foundry.utils.getProperty(actor, key);
            if (adjustment === 'plus') {
                await actor.update({ [key]: oldPP + ppCost });
            }
            else if (adjustment === 'minus') {
                await actor.update({ [key]: oldPP - ppCost });
            }
        }
        else if (item.type === 'weapon' && item.isArcaneDevice) {
            //handle Arcane Device Item Card PP adjustment
            const key = 'system.powerPoints.value';
            const oldPP = foundry.utils.getProperty(item, key);
            if (adjustment === 'plus') {
                await item.update({ [key]: oldPP + ppCost });
            }
            else if (adjustment === 'minus') {
                await item.update({ [key]: oldPP - ppCost });
            }
        }
    }
    async #handleTraitAction(action, item, actor, additionalMods) {
        //set the trait name and potentially override it via the action
        const traitName = action.override ||
            foundry.utils.getProperty(item, 'system.actions.trait');
        //find the trait and either get the skill item or the key of the attribute
        const trait = getTrait(traitName, actor);
        if (action.modifier) {
            additionalMods.push({
                label: action.name,
                value: action.modifier,
            });
        }
        if (item.type === 'weapon' &&
            !item.canExpendResources(action.resourcesUsed ?? 1)) {
            Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
            return null;
        }
        additionalMods.push(...item.traitModifiers);
        const roll = await this.#doTraitAction(trait, actor, {
            flavour: action.name,
            rof: action.dice,
            additionalMods,
            item: item,
        });
        const shouldConsume = !!roll &&
            item.type === 'weapon' &&
            action.type === constants$1.ACTION_TYPE.TRAIT;
        if (shouldConsume) {
            await item.consume(action.resourcesUsed ?? 1);
        }
        return roll;
    }
    async #handleDamageAction(action, item, additionalMods) {
        const dmgMod = this.#getDamageMod(item);
        if (dmgMod)
            additionalMods.push(dmgMod);
        if (action.modifier) {
            additionalMods.push({
                label: action.name,
                value: action.modifier,
            });
        }
        return item.rollDamage({
            dmgOverride: action.override,
            isHeavyWeapon: action.isHeavyWeapon,
            flavour: action.name,
            ap: action.ap,
            additionalMods,
        });
    }
    async #handleMacroAction(action, item, event) {
        if (!action.uuid)
            return;
        const macro = (await fromUuid(action.uuid));
        if (!macro) {
            Logger.warn(game.i18n.format('SWADE.CouldNotFindMacro', { uuid: action.uuid }), { toast: true });
        }
        let targetActor;
        let targetToken;
        if (action.macroActor === constants$1.MACRO_ACTOR.SELF) {
            targetActor = item.actor;
        }
        else if (action.macroActor === constants$1.MACRO_ACTOR.TARGET) {
            targetToken = game.user.targets.first();
            if (targetToken)
                targetActor = targetToken.actor;
            if (!targetActor) {
                ui.notifications.error('SWADE.CouldNotFindTarget', {
                    localize: true,
                });
            }
        }
        await macro?.execute({
            actor: targetActor,
            item,
            token: targetToken,
            event,
        });
    }
    #getDamageMod(item) {
        const value = foundry.utils.getProperty(item, 'system.actions.dmgMod');
        if (!value)
            return null;
        let label = '';
        //localize the label if it's not parsed from roll data
        if (!value.startsWith('@')) {
            label = `${item.name} ${game.i18n.localize('SWADE.ItemDmgMod')}`; // Localize the label and include the item name
        }
        return { label, value };
    }
    async #doTraitAction(trait, actor, options) {
        const rollSkill = trait instanceof SwadeItem || !trait;
        const rollAttribute = typeof trait === 'string';
        if (rollSkill) {
            //get the id from the item or null if there was no trait
            const id = trait instanceof SwadeItem ? trait.id : null;
            return actor.rollSkill(id, options);
        }
        else if (rollAttribute) {
            return actor.rollAttribute(trait, options);
        }
        else {
            return null;
        }
    }
    #callActionHook(item, actor, action, roll) {
        if (!roll)
            return; // Do not trigger the hook if the roll was cancelled
        /** @category Hooks */
        Hooks.call('swadeAction', actor, item, action, roll, game.userId);
    }
}

class ItemCardData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            uuid: new fields.DocumentUUIDField({ blank: false, required: true }),
        };
    }
    /** A list of selectors for action button groups that should be hidden if the party seeing the message is not the author */
    static #TO_HIDE = [
        '.trait-rolls',
        '.damage-rolls',
        '.template-controls',
        '.pp-controls',
        '.arcane-device-controls',
        '.pp-counter',
        '.ammo-counter',
        '.reload-controls',
        '.benny-reroll',
        '.free-reroll',
    ];
    _item = null;
    #handler = new ItemCardService();
    get macros() {
        if (!this._item)
            return [];
        const additionalActions = foundry.utils.getProperty(this._item, 'system.actions.additional') || {};
        return Object.entries(additionalActions)
            .filter(([_k, v]) => v.type === constants$1.ACTION_TYPE.MACRO)
            .map(([k, v]) => {
            return { id: k, uuid: v.uuid ?? '' };
        });
    }
    get cardActor() {
        return this._item?.parent ?? null;
    }
    async renderHTML({ canDelete = false, canClose = false, ..._rest } = {}) {
        this._item = fromUuidSync(this.uuid);
        let content;
        if (!this._item)
            content = this._renderMissingItemHTML();
        else
            content = await this._renderFoundItemHTML();
        //render the message shell
        const html = await this._renderMessageShell(content, canDelete, canClose);
        //hide unused elements
        this._hideChatActionButtons(html);
        await this._hideMacroButtons(html);
        //display magazine tooltip, if necessary
        this._magazineTooltip(html);
        //attach listeners
        this._attachButtonListeners(html);
        return html;
    }
    /** Attaches listeners to the rendered HTMLElement */
    _attachButtonListeners(html) {
        html
            .querySelectorAll('button[data-action]')
            .forEach((btn) => btn.addEventListener('click', (ev) => this._handleButtonClick(ev, btn, html)));
        html
            .querySelector('.card-header .item-name')
            ?.addEventListener('click', () => {
            html
                .querySelector('.card-content')
                ?.classList.toggle('expanded');
        });
    }
    async _handleButtonClick(event, btn, html) {
        event.preventDefault();
        const actor = this._getActor();
        const action = btn.dataset.action;
        if (!this._item || !actor || !action)
            return;
        const actionObj = foundry.utils.getProperty(this._item, 'system.actions.additional.' + action);
        let roll = null;
        const additionalMods = this.#handler.gatherRollModifiers({
            item: this._item,
            html,
            action,
            actionObj,
        });
        switch (action) {
            case 'refresh':
                await this._refreshMessage();
                break;
            case 'template':
                SwadeMeasuredTemplate.fromPreset(btn.dataset.template, this._item);
                break;
            case 'reload':
                await this._item.reload();
                await this._refreshMessage();
                break;
            case 'consume':
                await this._item.consume();
                await this._refreshMessage();
                break;
            case 'pp-adjust':
                await this.#handler.handlePowerPoints(this._item, actor, btn, html);
                await this._refreshMessage();
                break;
            case 'damage':
                roll = await this.#handler.handleDamageAction(this._item, actor, additionalMods);
                break;
            case 'formula':
                roll = await this.#handler.handleFormulaAction(this._item, actor, additionalMods);
                break;
            case 'arcane-device':
                roll = await actor.makeArcaneDeviceSkillRoll(foundry.utils.getProperty(this._item, 'system.arcaneSkillDie'));
                break;
            default:
                // No need to call the hook here, as handleAdditionalActions already calls the hook
                // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
                roll = await this.#handler.handleAdditionalAction(this._item, actor, actionObj, action, additionalMods);
                break;
        }
        //Only refresh the card if there is a roll and the item isn't a power
        if (roll && this._item.type !== 'power')
            await this._refreshMessage();
    }
    _getActor(action) {
        let actor = this._item?.parent ?? null;
        //If the item's parent is a vehicle swap in the operator
        if (actor?.system instanceof VehicleData) {
            if (this._item.type === 'weapon') {
                actor = actor.system.getCrewMemberForWeapon(this._item) ?? null;
                if (!actor) {
                    Logger.warn('Could not retrieve an assigned user for this weapon.', {
                        toast: true,
                    });
                }
            }
            else {
                actor = actor.system.operator;
            }
        }
        // "Resist" types target the actor with a currently selected token, not the
        // one that spawned the chat card. So swap that actor in.
        if (action?.type === constants$1.ACTION_TYPE.RESIST) {
            // swap the selected token's actor in as the target for the roll
            if (!canvas?.tokens || canvas?.tokens.controlled.length !== 1) {
                ui.notifications.warn('SWADE.NoTokenSelectedForResistRoll', {
                    localize: true,
                });
                return null;
            }
            actor = canvas.tokens?.controlled[0].actor ?? actor;
        }
        return actor;
    }
    /** Remove the chat card action buttons which cannot be performed by the user */
    _hideChatActionButtons(html) {
        const msg = this.parent;
        // If the user is the message author or the actor owner, proceed
        const actor = game.actors?.get(msg.speaker.actor ?? '');
        if (actor?.isOwner || game.user?.isGM || msg.isAuthor)
            return;
        // Otherwise conceal all action button sections except for
        // resistance rolls (which can be rolled by other actors as a defense)
        for (const selector of ItemCardData.#TO_HIDE) {
            html.querySelectorAll(selector).forEach((e) => e.remove());
        }
    }
    _magazineTooltip(html) {
        const magazine = html.querySelector('.swade.chat-card .magazine');
        magazine?.addEventListener('mouseenter', async () => {
            const loadedAmmo = this._item?.getFlag('swade', 'loadedAmmo');
            const enriched = loadedAmmo
                ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(`<h4>${loadedAmmo?.name}</h4>${loadedAmmo?.system.description ?? ''}`, {
                    relativeTo: this._item,
                    rollData: this._item?.getRollData() ?? {},
                    secrets: this._item?.isOwner,
                })
                : game.i18n.localize('SWADE.Magazine.NoneLoaded');
            const content = foundry.utils.parseHTML('<span>' + enriched + '</span>');
            game.tooltip.activate(magazine, {
                html: content,
                cssClass: 'themed theme-dark',
            });
        });
    }
    /** Hide macros if the user can't execute them */
    async _hideMacroButtons(html) {
        let hiddenCounter = 0;
        for (const macro of this.macros) {
            const doc = (await fromUuid(macro.uuid));
            if (doc?.canExecute)
                continue;
            html
                .querySelectorAll(`button[data-action="${macro.id}"]`)
                .forEach((btn) => {
                btn.remove();
                hiddenCounter++;
            });
        }
        const macroButtonsTotal = html.querySelectorAll('.card-buttons.macros button').length;
        //if all macros have been hidden, then also hide the header
        if (macroButtonsTotal <= hiddenCounter) {
            html.querySelector('.card-buttons.macros')?.remove();
        }
    }
    async _renderFoundItemHTML() {
        const data = await this._item.getChatData();
        return foundry.applications.handlebars.renderTemplate('systems/swade/templates/chat/item-card.hbs', data);
    }
    _renderMissingItemHTML() {
        return `<p>Item with UUID <code>${this.uuid}</code> could not be found</p>`;
    }
    _getBaseMessageData(canDelete, canClose) {
        const isWhisper = !!this.parent.whisper.length;
        // Construct message data
        const messageData = {
            canDelete,
            canClose,
            message: this.parent.toObject(false),
            user: game.user,
            author: this.parent.author,
            alias: this.parent.alias,
            cssClass: [
                this.parent.style === CONST.CHAT_MESSAGE_STYLES.IC ? 'ic' : null,
                this.parent.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? 'emote' : null,
                this.parent.blind ? 'blind' : null,
                isWhisper ? 'whisper' : null,
            ].filterJoin(' '),
            isWhisper,
            whisperTo: this.parent.whisper
                .map((u) => game.users.get(u)?.name)
                .filterJoin(', '),
        };
        return messageData;
    }
    /** Create a standard foundry message shell */
    async _renderMessageShell(content, canDelete, canClose) {
        const messageData = this._getBaseMessageData(canDelete, canClose);
        messageData.message.content = content;
        const template = await foundry.applications.handlebars.renderTemplate(CONFIG.ChatMessage.template, messageData);
        return foundry.utils.parseHTML(template);
    }
    async _refreshMessage() {
        await ui.chat.updateMessage(this.parent, false);
    }
}

const config$2 = {
    itemCard: ItemCardData,
};

var index$3 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ItemCardData: ItemCardData,
    config: config$2
});

function baseCombatSchema() {
    return {};
}
class BaseCombat extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return baseCombatSchema();
    }
    /**
     * Determine roll modifiers for an actor based on the current combat type, e.g. Jokers or Complications for clubs
     * @param actor The actor making a roll
     * @returns An array of roll modifiers to push/concat
     */
    rollModifiers(actor) {
        const combatant = this.parent.getCombatantsByActor(actor)[0];
        const mods = [];
        if (combatant?.hasJoker) {
            mods.push({
                label: game.i18n.localize('SWADE.Joker'),
                value: actor.getFlag('swade', 'jokerBonus') ?? 2,
            });
        }
        return mods;
    }
}

/**
 * External function to define the schema for the BaseCombatant type
 * Used to prevent type recursion issues
 */
function baseCombatantSchema() {
    const fields = foundry.data.fields;
    return {
        suitValue: new fields.NumberField(),
        cardValue: new fields.NumberField(),
        cardString: new fields.StringField(),
        hasJoker: new fields.BooleanField(),
        roundHeld: new fields.NumberField(),
        turnLost: new fields.BooleanField(),
        firstRound: new fields.NumberField(),
    };
}
class BaseCombatantModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return baseCombatantSchema();
    }
    async _preCreate(data, _options, _user) {
        const combatants = game?.combat?.combatants.size ?? 0;
        const tokenID = data.tokenId instanceof TokenDocument ? data.tokenId.id : data.tokenId;
        const tokenIndex = canvas.tokens?.controlled.map((t) => t.id).indexOf(tokenID) ??
            0;
        const sortValue = tokenIndex + combatants;
        this.updateSource({
            firstRound: this.parent.combat?.round,
            cardValue: sortValue,
            suitValue: sortValue,
        });
    }
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        const hasCardChanged = foundry.utils.hasProperty(changed, 'system.cardValue') ||
            foundry.utils.hasProperty(changed, 'system.suitValue');
        const holdRemoved = foundry.utils.getProperty(changed, 'system.roundHeld') === null;
        if (hasCardChanged && !holdRemoved && game.userId === userId) {
            this.handOutBennies();
        }
    }
    /** Checks if this combatant has a joker and hands out bennies based on the actor type and disposition */
    async handOutBennies() {
        if (!game.settings.get('swade', 'jokersWild') ||
            this.parent.groupId ||
            !this.parent.hasJoker ||
            !this.parent)
            return;
        await this.#createJokersWildMessage();
        // TODO: This is actually going to be a collection, rather than an array
        const combatants = this.parent.parent.combatants;
        const isTokenHostile = this.parent.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
        //Give bennies to PCs
        if (this.parent.actor?.type === 'character') {
            await this.#friendlyBennies(combatants);
        }
        else if (this.parent.actor?.type === 'npc' && isTokenHostile) {
            await this.#adversaryBennies(combatants);
        }
    }
    async #friendlyBennies(combatants) {
        //filter combatants for PCs and give them bennies
        const pcs = combatants.filter((c) => c.actor?.type === 'character');
        await this.#triggerBennies(pcs);
    }
    async #adversaryBennies(combatants) {
        //give all GMs a benny
        const gmUsers = game.users.filter((u) => u.active && u.isGM);
        for (const gm of gmUsers)
            await gm.getBenny();
        //give all enemy wildcards a benny
        const hostiles = combatants.filter((c) => {
            const isHostile = c.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
            return c.actor?.type === 'npc' && isHostile && c.actor?.isWildcard;
        });
        await this.#triggerBennies(hostiles);
    }
    async #triggerBennies(combatants) {
        for (const c of combatants) {
            if (c.actor?.isOwner)
                await c.actor?.getBenny();
            else
                game.swade.sockets.giveBenny([firstOwner(c.actor)?.id], [c.actor?.uuid ?? '']);
        }
    }
    async #createJokersWildMessage() {
        await getDocumentClass('ChatMessage').create({
            author: game.userId,
            content: await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.joker, {
                speaker: game.user,
            }),
        });
    }
}

function baseCombatantGroupSchema() {
    const fields = foundry.data.fields;
    return {
        leader: new fields.DocumentIdField({ readonly: false }),
        suitValue: new fields.NumberField(),
        cardValue: new fields.NumberField(),
        cardString: new fields.StringField(),
        hasJoker: new fields.BooleanField(),
        roundHeld: new fields.NumberField(),
        turnLost: new fields.BooleanField(),
        firstRound: new fields.NumberField(),
    };
}
class BaseCombatantGroupModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return baseCombatantGroupSchema();
    }
    /**
     * @returns The leader as a combatant, or first member, else undefined.
     */
    get leaderCombatant() {
        if (this.leader) {
            const c = this.parent.members.find((c) => c.id === this.leader);
            if (c)
                return c;
        }
        return this.parent.members.first();
    }
}

function chaseSchema() {
    const fields = foundry.data.fields;
    return {
        maneuvering: new fields.SetField(new fields.StringField({ required: true, blank: false })),
    };
}
class Chase extends BaseCombat {
    static defineSchema() {
        return chaseSchema();
    }
}

function dramaticTaskSchema() {
    const fields = foundry.data.fields;
    return {
        tokens: new fields.SchemaField({
            value: new fields.NumberField({
                min: 0,
                initial: 0,
                nullable: false,
                integer: true,
            }),
            max: new fields.NumberField({
                min: 1,
                initial: 6,
                nullable: false,
                integer: true,
            }),
        }),
        maxRounds: new fields.NumberField({
            min: 1,
            initial: 4,
            nullable: false,
            integer: true,
            label: 'SWADE.DramaticTask.MaxRounds.Label',
            hint: 'SWADE.DramaticTask.MaxRounds.Hint',
        }),
    };
}
class DramaticTask extends BaseCombat {
    static defineSchema() {
        return dramaticTaskSchema();
    }
    rollModifiers(actor) {
        const combatant = this.parent.getCombatantsByActor(actor)[0];
        const mods = super.rollModifiers(actor);
        if (combatant?.suitValue === 1) {
            mods.push({
                label: game.i18n.localize('SWADE.Complication'),
                value: -2,
            });
        }
        return mods;
    }
}

const combatConfig = {
    base: BaseCombat,
    chase: Chase,
    dramaticTask: DramaticTask,
};
const combatantConfig = {
    base: BaseCombatantModel,
};
const combatantGroupConfig = {
    base: BaseCombatantGroupModel,
};

var index$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BaseCombat: BaseCombat,
    BaseCombatant: BaseCombatantModel,
    Chase: Chase,
    DramaticTask: DramaticTask,
    combatConfig: combatConfig,
    combatantConfig: combatantConfig,
    combatantGroupConfig: combatantGroupConfig
});

function baseEffectSchema() {
    const fields = foundry.data.fields;
    return {
        removeEffect: new fields.BooleanField({ label: 'SWADE.RemoveEffectLabel' }),
        expiration: new fields.NumberField({
            choices: foundry.utils.invertObject(constants$1.STATUS_EFFECT_EXPIRATION),
            nullable: true,
            label: 'SWADE.Expiration.Behavior',
        }),
        loseTurnOnHold: new fields.BooleanField({
            label: 'SWADE.Expiration.LooseTurnOnHold',
        }),
        favorite: new fields.BooleanField({ label: 'SWADE.Favorite' }),
        conditionalEffect: new fields.BooleanField({
            label: 'SWADE.ActiveEffects.Conditional',
        }),
    };
}
class BaseEffectData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return baseEffectSchema();
    }
}

/**
 * @returns Schema definition for ModifierData
 */
function modifierSchema() {
    const fields = foundry.data.fields;
    return {
        cost: new fields.NumberField({
            initial: null,
            integer: true,
            label: 'SWADE.ActiveEffects.ModifierCost.Label',
            hint: 'SWADE.ActiveEffects.ModifierCost.Hint',
        }),
        // Null means unlimited. Nonlinear options should be implemented as separate choices.
        limit: new fields.NumberField({
            initial: 1,
            integer: true,
            min: 1,
            label: 'SWADE.ActiveEffects.ModifierLimit.Label',
            hint: 'SWADE.ActiveEffects.ModifierLimit.Hint',
        }),
        level: new fields.NumberField({
            initial: 1,
            integer: true,
            min: 1,
            label: 'SWADE.ActiveEffects.ModifierLevel.Label',
            hint: 'SWADE.ActiveEffects.ModifierLevel.Hint',
        }),
    };
}
/**
 * A data model to represent effects that modify the items they are contained on
 */
class ModifierData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return modifierSchema();
    }
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
        if (this.parent instanceof Actor)
            return false;
        if (data.transfer) {
            console.warn('All Modifiers must be non-transferred');
        }
        data.transfer = false;
        this.parent.updateSource({ transfer: false });
    }
    async _preUpdate(changed, options, user) {
        const allowed = await super._preUpdate(changed, options, user);
        if (allowed === false)
            return false;
        if (changed.transfer) {
            delete changed.transfer;
            console.warn('All Modifiers must be non-transferred');
        }
    }
}

const config$1 = {
    base: BaseEffectData,
    modifier: ModifierData,
};

var index$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BaseEffectData: BaseEffectData,
    config: config$1
});

class HeadquartersData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            advantage: new fields.HTMLField({
                label: 'SWADE.Headquarters.Advantage',
            }),
            complication: new fields.HTMLField({
                label: 'SWADE.Headquarters.Complication',
            }),
            upgrades: new fields.HTMLField({ label: 'SWADE.Headquarters.Upgrades' }),
            form: new fields.SchemaField({
                description: new fields.HTMLField({
                    label: 'SWADE.Headquarters.Description',
                }),
                acquisition: new fields.HTMLField({
                    label: 'SWADE.Headquarters.Acquisition',
                }),
                maintenance: new fields.HTMLField({
                    label: 'SWADE.Headquarters.Maintenance',
                }),
            }),
        };
    }
}

const config = {
    headquarters: HeadquartersData,
};

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    HeadquartersData: HeadquartersData,
    config: config
});

var data = /*#__PURE__*/Object.freeze({
    __proto__: null,
    actor: index$5,
    card: index$4,
    chat: index$3,
    combat: index$2,
    effect: index$1,
    fields: index$8,
    item: index$7,
    journal: index,
    shared: index$a
});

class Benny extends foundry.dice.terms.DiceTerm {
    constructor(termData) {
        termData.faces = 2;
        super(termData);
    }
    /** @override */
    static DENOMINATION = 'b';
    /** @override */
    get isDeterministic() {
        return false;
    }
    /** @override */
    getResultLabel(_result) {
        return 'b';
    }
}

/** Creates a chat message for GM Bennies */
async function createGmBennyAddMessage(user = game.user, given) {
    let template;
    const data = { target: user, speaker: user };
    if (given)
        template = SWADE.bennies.templates.add;
    else
        template = SWADE.bennies.templates.gmadd;
    const content = await foundry.applications.handlebars.renderTemplate(template, data);
    const chatData = { content };
    ChatMessage.implementation.create(chatData);
}

class SwadeUser extends User {
    get bennies() {
        if (this.isGM) {
            return this.getFlag('swade', 'bennies') ?? 0;
        }
        else if (this.character) {
            return this.character.bennies;
        }
        return 0;
    }
    async spendBenny() {
        if (this.isGM) {
            if (this.bennies <= 0)
                return;
            const message = await foundry.applications.handlebars.renderTemplate(CONFIG.SWADE.bennies.templates.spend, {
                target: game.user,
                speaker: CONFIG.ChatMessage.documentClass.getSpeaker(),
            });
            const chatData = {
                content: message,
            };
            if (game.settings.get('swade', 'notifyBennies')) {
                await CONFIG.ChatMessage.documentClass.create(chatData);
            }
            await this.setFlag('swade', 'bennies', this.bennies - 1);
            /**
             * A hook event that is fired after a game master spends a Benny
             * @function spendBenny
             * @category Hooks
             * @param {SwadeUser} user                     The user that spent the benny
             */
            Hooks.call('swadeSpendGameMasterBenny', this);
            if (!!game.dice3d && (await shouldShowBennyAnimation())) {
                game.dice3d.showForRoll(await new Roll('1dB').evaluate(), game.user, true, null, false);
            }
        }
        else if (this.character) {
            await this.character.spendBenny();
        }
    }
    async getBenny() {
        if (this.isGM) {
            await this.setFlag('swade', 'bennies', this.bennies + 1);
            /**
             * A hook event that is fired after a game master spends a Benny
             * @function spendBenny
             * @category Hooks
             * @param {SwadeUser} user                     The user that received the benny
             */
            Hooks.call('swadeGetGameMasterBenny', this);
            createGmBennyAddMessage(this, true);
        }
        else if (this.character) {
            await this.character.getBenny();
        }
    }
    async refreshBennies(notify = true) {
        if (this.isGM) {
            const hasStaticBennies = game.settings.get('swade', 'staticGmBennies');
            const gmBennies = hasStaticBennies
                ? game.settings.get('swade', 'gmBennies')
                : game.users.filter((u) => u.active && !u.isGM).length;
            await this.setFlag('swade', 'bennies', gmBennies);
            /**
             * Called when a GM refreshes their bennies.
             * @param {SwadeUser} user            The GM User
             */
            Hooks.callAll('swadeRefreshGmBennies', this);
        }
        else if (this.character) {
            await this.character.refreshBennies(notify);
        }
        ui.players?.render(true);
    }
    async _onUpdate(changed, options, userId) {
        await super._onUpdate(changed, options, userId);
        // If the user is a gm and their bennies were changed, re-render the players display
        if (this.isGM &&
            foundry.utils.getProperty(changed, 'flags.swade.bennies') !== undefined)
            ui.players.render(true);
    }
}

class SwadeCards extends Cards {
    /**
     * Draw cards for initiative
     * @param to - The cards document to which the cards are deposited
     * @param number - How many cards to draw
     * @param how - How to draw the, e.g. from the top of the deck
     * @returns an array of the drawn cards, in the order they were drawn
     */
    async dealForInitiative(to, number = 1, how = foundry.CONST.CARD_DRAW_MODES.TOP) {
        // validate
        if (this.type !== 'deck') {
            throw new Error('You can only deal cards for Initiative from a Deck');
        }
        // Draw from the sorted stack
        const drawn = this._drawCards(number, how);
        // Process the card data
        const toCreate = new Array();
        const toUpdate = new Array();
        const toDelete = new Array();
        for (const card of drawn) {
            const createData = card.toObject();
            if (card.isHome || !createData.origin)
                createData.origin = this.id;
            toCreate.push(createData);
            if (card.isHome)
                toUpdate.push({ _id: card.id, drawn: true });
            else
                toDelete.push(card.id);
        }
        // yeet the data
        await Promise.all([
            to.createEmbeddedDocuments('Card', toCreate, { keepId: true }),
            this.deleteEmbeddedDocuments('Card', toDelete),
        ]);
        const updated = await this.updateEmbeddedDocuments('Card', toUpdate);
        return updated;
    }
}

// Create string variable for the SWADE CSS class for App Windows.
const appCssClasses = ['swade-app'];
async function damageApplicator(message) {
    // Get a significant roll from the chat message.
    const roll = message.significantRoll;
    // If there's not a significant roll  or it's not a damage roll, return.
    if (!roll || !(roll instanceof DamageRoll))
        return;
    // Collect the user's controlled tokens.
    const controlledTokens = game?.canvas?.tokens?.controlled;
    // If there are not any controlled tokens, issue a warning.
    if (!controlledTokens?.length) {
        // If no targets selected, issue warning notification.
        return ui.notifications.warn('SWADE.DamageApplicator.NoTargetsSelected', {
            localize: true,
        });
    }
    // Get the damage and ap from the roll data
    const damageContext = {
        isHeavyWeapon: roll.isHeavyWeapon,
        status: Status.NONE,
        wounds: {
            applied: 0,
            taken: 0,
            soaked: 0,
        },
        damage: {
            total: roll.total ?? 0,
            ap: roll.ap ?? 0,
        },
    };
    // For each token controlled...
    for (const token of controlledTokens) {
        // Get the actor from the token data.
        const actor = token.actor;
        // Trigger calculation of Wounds
        calcWounds(actor.uuid, damageContext);
    }
}
// Function for translating damage to Wounds.
async function calcWounds(targetUuid, damageContext) {
    const actor = await fromUuid(targetUuid);
    if (!(actor instanceof SwadeActor))
        return;
    // Get Toughness values.
    let armor = 0;
    let value = 0;
    // If it's not a vehicle
    if (!(actor.system instanceof VehicleData)) {
        // Get the values from the stats child object.
        armor = Number(actor.system.stats.toughness.armor);
        value = Number(actor.system.stats.toughness.value);
    }
    else if (actor.system instanceof VehicleData) {
        // If the Actor is a vehicle, get the values from the system object.
        armor = Number(actor.system.toughness.armor);
        value = Number(actor.system.toughness.total);
    }
    // AP vs Armor
    const apNeg = Math.min(damageContext.damage.ap, armor);
    // Calculate Toughness after subtracting AP.
    const newT = value - apNeg;
    // Calculate how much the damage is over the relative Toughness.
    // Doesn't use DamageRoll.successes because of the need to adjust damage
    const excess = damageContext.damage.total - newT;
    // Translate damage raises to Wounds.
    let woundsInflicted = Math.floor(excess / 4);
    // Check if Wound Cap is in play.
    const woundCap = game.settings.get('swade', 'woundCap');
    // If Wound Cap, limit Wounds inflicted (i.e. Wounds to Soak) to 4
    if (woundCap && woundsInflicted > 4) {
        woundsInflicted = 4;
    }
    // Set default status to apply as none.
    let statusToApply = Status.NONE;
    // If damage meets or beats Toughness without a raise.
    if (excess >= 0 && excess < 4) {
        // Set status to Shaken.
        statusToApply = Status.SHAKEN;
        // If already shaken, set status to wounded and wounds inflicted to 1.
        if (
        // @ts-expect-error isShaken is undefined, which is falsy and works fine
        actor.system.status.isShaken &&
            woundsInflicted === 0 &&
            !actor.getFlag('swade', 'hardy')) {
            woundsInflicted = 1;
            statusToApply = Status.WOUNDED;
            damageContext.doubleShaken = true;
        }
        // If damage is at least a raise over Toughness, set status to wounded
    }
    else if (excess >= 4) {
        statusToApply = Status.WOUNDED;
    }
    /**
     * A hook event that is fired before wounds are calculated
     * Returning `false` in a hook callback will cancel the workflow entirely
     * @category Hooks
     * @since 3.3.0
     * @param {SwadeActor} actor              The actor that is being damaged
     * @param {DamageContext} damageContext   The damage context
     * @param {number} woundsInflicted        The amount of wounds that will be inflicted
     * @param {Status} statusToApply          The resulting status that would be applied
     */
    const permit = Hooks.call('swadePreCalcWounds', actor, damageContext, woundsInflicted, statusToApply);
    if (permit !== false) {
        // Trigger Soak prompt.
        await soakPrompt(actor, damageContext, woundsInflicted, statusToApply);
    }
}
function removeButtons(buttons, actions) {
    for (const action of actions) {
        const index = buttons.findIndex((button) => button.action === action);
        if (index !== -1)
            buttons.splice(index, 1);
    }
}
// Function for prompting to Soak.
async function soakPrompt(actor, damageContext, woundsInflicted, statusToApply) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const name = speaker.alias;
    // Set singular Wound or plural Wounds for chat message
    const woundsText = `${woundsInflicted} ${woundsInflicted > 1
        ? game.i18n.localize('SWADE.Wounds')
        : game.i18n.localize('SWADE.Wound')}`;
    // Text for Wounds about to be taken.
    let message = game.i18n.format('SWADE.DamageApplicator.WoundsAboutToBeTaken', {
        name: name,
        wounds: woundsText,
    });
    // Create a title and prompt variable to be assigned later.
    let title = '';
    let prompt = '';
    // Create a collection of buttons with an adjust button included by default.
    const buttons = [
        {
            action: 'adjust',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.AdjustDamage'),
            icon: '<i class="fas fa-plus-minus"></i>',
            callback: async (_event, button) => {
                const html = button.form;
                damageContext.damage.ap = Number(html.querySelector('#ap')?.value);
                damageContext.damage.total = Number(html.querySelector('#damage')?.value);
                // Calculate the Wounds.
                await calcWounds(actor.uuid, damageContext);
            },
        },
        {
            action: 'take',
            label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.TakeWounds', {
                wounds: woundsText,
            }),
            icon: '<i class="fas fa-droplet"></i>',
            callback: async () => {
                const existingWounds = actor.system.wounds.value;
                const maxWounds = actor.system.wounds.max;
                const totalWounds = existingWounds + woundsInflicted;
                const newWoundsValue = totalWounds < maxWounds ? totalWounds : maxWounds;
                await actor.update({ 'system.wounds.value': newWoundsValue });
                if (totalWounds > maxWounds) {
                    await applyIncapacitated(actor);
                }
                else {
                    await applyShaken(actor);
                    await ChatMessage.create({
                        content: game.i18n.format('SWADE.DamageApplicator.Result.IsShakenWithWounds', {
                            name: name,
                            wounds: woundsText,
                        }),
                        speaker: speaker,
                    });
                }
                if (actor.isWildcard &&
                    game.settings.get('swade', 'grittyDamage') &&
                    !damageContext.doubleShaken) {
                    await rollInjuryTable();
                }
                /**
                 * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
                 * @category Hooks
                 * @param {SwadeActor} actor            The actor taking the damage
                 * @param {DamageContext} damageContext Additional information people calling the hook might need
                 */
                damageContext.status = statusToApply;
                damageContext.wounds.applied = woundsInflicted;
                damageContext.wounds.taken = totalWounds - existingWounds;
                Hooks.call('swadeTakeDamage', actor, damageContext);
            },
        },
        {
            action: 'applyShaken',
            label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.ApplyShaken'),
            icon: '<i class="fas fa-face-hushed"></i>',
            callback: async () => {
                message = game.i18n.format('SWADE.DamageApplicator.Result.IsShaken', {
                    name: name,
                });
                // Apply Shaken Status Effect.
                await applyShaken(actor);
                // Output chat message.
                await ChatMessage.create({ content: message, speaker: speaker });
                /**
                 * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
                 * @category Hooks
                 * @param {SwadeActor} actor            The actor taking the damage
                 * @param {DamageContext} damageContext Additional information people calling the hook might need
                 */
                damageContext.status = statusToApply;
                Hooks.call('swadeTakeDamage', actor, damageContext);
            },
        },
        {
            action: 'accept',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Accept'),
            icon: '<i class="fas fa-check"></i>',
            callback: async () => {
                await ChatMessage.create({
                    content: game.i18n.format('SWADE.DamageApplicator.Result.NoSignificantDamage', {
                        name: name,
                    }),
                    speaker: speaker,
                });
                /**
                 * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
                 * @category Hooks
                 * @param {SwadeActor} actor            The actor taking the damage
                 * @param {DamageContext} damageContext Additional information people calling the hook might need
                 */
                damageContext.status = statusToApply;
                Hooks.call('swadeTakeDamage', actor, damageContext);
            },
        },
        {
            action: 'soakBenny',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Benny'),
            icon: '<i class="fas fa-droplet-slash"></i>',
            callback: async () => {
                actor.spendBenny();
                await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext);
            },
        },
        {
            action: 'soakGmBenny',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.GMBenny'),
            icon: '<i class="fas fa-droplet-slash"></i>',
            callback: async () => {
                game.user?.spendBenny();
                await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext);
            },
        },
        {
            action: 'soakFree',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Free'),
            icon: '<i class="fas fa-droplet-slash"></i>',
            callback: async () => {
                await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext);
            },
        },
    ];
    // Is the Actor a Wild Card out of Bennies?
    const actorHasBennies = actor.isWildcard && actor.bennies > 0;
    // Is the User a GM?
    const isGM = game.user?.isGM;
    // Is the GM out of Bennies?
    const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;
    // Create the default button variable because this will be conditional.
    let defaultButton = '';
    // If status is not Wounded...
    if (statusToApply !== Status.WOUNDED) {
        // Delete Soak and Take Wounds buttons.
        removeButtons(buttons, ['take', 'soakBenny', 'soakGmBenny', 'soakFree']);
        // Set the title
        title = game.i18n.format('SWADE.DamageApplicator.SoakDialog.UnwoundedTitle', { name: name });
        // If the status is Shaken...
        if (statusToApply === Status.SHAKEN) {
            // Delete general accept button.
            removeButtons(buttons, ['accept']);
            // Set the prompt text.
            prompt = game.i18n.format('SWADE.DamageApplicator.SoakDialog.ShakenPrompt', { name: name });
            // Set the default button to Apply Shaken
            defaultButton = 'applyShaken';
        }
        else if (statusToApply === Status.NONE) {
            // Delete Apply Shaken Button
            removeButtons(buttons, ['applyShaken']);
            // If there is no damage applied at all, change prompt to unharmed.
            prompt = game.i18n.format('SWADE.DamageApplicator.SoakDialog.UnharmedPrompt', { name: name });
            defaultButton = 'accept';
        }
    }
    else {
        // In all other circumstances, set the title to Wounded title.
        title = game.i18n.format('SWADE.DamageApplicator.SoakDialog.WoundedTitle', {
            name: name,
        });
        // Set the prompt text to Wounded text
        prompt = game.i18n.format('SWADE.DamageApplicator.SoakDialog.WoundedPrompt', { name: name, wounds: woundsText });
        // Since status to apply is Wounded delete Apply Shaken and Accept buttons
        removeButtons(buttons, ['applyShaken', 'accept']);
        // If the Actor does not have Bennies, delete the button for spending Actor Bennies
        if (!actorHasBennies)
            removeButtons(buttons, ['soakBenny']);
        // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
        if (!gmHasBennies)
            removeButtons(buttons, ['soakGmBenny']);
        // Set default button to take the Wounds.
        defaultButton = 'take';
    }
    const trueDefault = buttons.find((button) => button.action === defaultButton);
    if (trueDefault)
        trueDefault.default = true;
    // Construct the Dialog and render it.
    const adjustDamage = new Handlebars.SafeString(game.i18n.format('SWADE.DamageApplicator.AdjustDamagePrompt', {
        name: name,
    }));
    const content = await foundry.applications.handlebars.renderTemplate('systems/swade/templates/apps/damage/soak.hbs', { damageContext, adjustDamage, prompt: new Handlebars.SafeString(prompt) });
    foundry.applications.api.DialogV2.wait({
        window: {
            title: title,
        },
        classes: appCssClasses,
        content: content,
        buttons: buttons,
    });
}
// Function to roll for Soaking Wounds.
async function attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext, bestSoakAttempt = 0, options) {
    if (actor.system instanceof VehicleData) {
        // No handling for vehicle soaks... yet
        return ui.notifications.warn('SWADE.DamageApplicator.SoakDialog.NoVehicleSoak', {
            localize: true,
        });
    }
    const soakModifiers = [
        {
            label: game.i18n.localize('SWADE.DamageApplicator.SoakModifier'),
            value: actor.system.attributes.vigor.soakBonus,
        },
    ];
    if (game.settings.get('swade', 'unarmoredHero') && actor.isUnarmored) {
        soakModifiers.push({
            label: game.i18n.localize('SWADE.Settings.UnarmoredHero.Name'),
            value: 2,
        });
    }
    if (options?.reroll) {
        soakModifiers.push(...actor.system.stats.globalMods.bennyTrait);
    }
    // Roll Vigor and get the data.
    const vigorRoll = await actor.rollAttribute('vigor', {
        title: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.SoakRoll'),
        flavour: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.SoakRoll'),
        additionalMods: soakModifiers,
        isRerollable: false,
    });
    if (game.dice3d) {
        game.dice3d
            .waitFor3DAnimationByMessageID(vigorRoll?.messageId)
            .then(() => applySoak());
    }
    else {
        applySoak();
    }
    async function applySoak() {
        const speaker = ChatMessage.getSpeaker({ actor });
        const name = speaker.alias;
        let message = '';
        // Calculate how many Wounds have been Soaked with the roll
        const woundsSoaked = vigorRoll?.successes ?? 0;
        // Get the number of current Wounds the Actor has.
        const existingWounds = actor.system.wounds.value;
        // Get the maximum amount of Wounds the Actor can suffer before Incapacitation.
        const maxWounds = actor.system.wounds.max;
        // Calculate how many Wounds are remaining after Soaking.
        let woundsRemaining = woundsInflicted - woundsSoaked;
        // If there are no remaining Wounds, output message that they Soaked all the Wounds.
        if (woundsRemaining <= 0) {
            statusToApply = Status.NONE;
            message = game.i18n.format('SWADE.DamageApplicator.Result.SoakedAll', {
                name: name,
            });
            await ChatMessage.create({ content: message, speaker: speaker });
            const isShaken = actor.system.status.isShaken;
            // If they're already Shaken, remove the Status Effect.
            if (isShaken)
                await actor.toggleActiveEffect('shaken', { active: false });
            /**
             * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
             * @category Hooks
             * @param {SwadeActor} actor            The actor taking the damage
             * @param {DamageContext} damageContext Additional information people calling the hook might need
             */
            damageContext.status = statusToApply;
            damageContext.wounds.soaked = woundsSoaked;
            Hooks.call('swadeTakeDamage', actor, damageContext);
        }
        else {
            // Otherwise, calculate how many Wounds the Actor now has.
            const totalWounds = existingWounds + woundsRemaining;
            // Set the Wounds, but if it's beyond the maximum, set it to the maximum.
            const newWoundsValue = totalWounds < maxWounds ? totalWounds : maxWounds;
            if (bestSoakAttempt !== 0 && woundsRemaining > bestSoakAttempt) {
                // If they already attempted to Soak, set Wounds remaining to whatever their best roll yielded so far.
                woundsRemaining = bestSoakAttempt;
            }
            // Construct text for number of Wounds remaining.
            const woundsRemainingText = `${woundsRemaining} ${woundsRemaining > 1 || woundsRemaining === 0
                ? game.i18n.localize('SWADE.Wounds')
                : game.i18n.localize('SWADE.Wound')}`;
            // Build default buttons
            const buttons = [
                {
                    action: 'take',
                    label: game.i18n.format('SWADE.DamageApplicator.RerollSoakDialog.TakeWounds', {
                        wounds: woundsRemainingText,
                    }),
                    icon: '<i class="fas fa-droplet"></i>',
                    default: true,
                    callback: async () => {
                        // Construct text for the new Wounds value to be accepted (singular or plural Wounds).
                        const newWoundsValueText = `${newWoundsValue} ${newWoundsValue > 1 || newWoundsValue === 0 // newWoundsValue should never be zero here
                            ? game.i18n.localize('SWADE.Wounds')
                            : game.i18n.localize('SWADE.Wound')}`;
                        // Update Wounds on the Actor
                        await actor.update({
                            'system.wounds.value': newWoundsValue,
                        });
                        // Apply status effects based on Shaken or Incapacitated.
                        if (totalWounds > maxWounds) {
                            // If their total Wounds is greater than their max Wounds, apply Status Effects: Incapacitated.
                            await applyIncapacitated(actor);
                        }
                        else {
                            // If their total Wounds not greater than their max Wounds, apply Status Effects: Shaken.
                            await applyShaken(actor);
                            message = game.i18n.format('SWADE.DamageApplicator.Result.IsShakenWithWounds', {
                                name: name,
                                wounds: newWoundsValueText,
                            });
                        }
                        // Output Chat Message.
                        if (message) {
                            await ChatMessage.create({
                                content: message,
                                speaker: speaker,
                            });
                        }
                        // If Gritty Damage is in play, roll on the Injury Table.
                        if (actor.isWildcard &&
                            game.settings.get('swade', 'grittyDamage') &&
                            !damageContext.doubleShaken) {
                            await rollInjuryTable();
                        }
                        /**
                         * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
                         * @category Hooks
                         * @param {SwadeActor} actor            The actor taking the damage
                         * @param {DamageContext} damageContext Additional information people calling the hook might need
                         */
                        damageContext.status = statusToApply;
                        damageContext.wounds.applied = woundsRemaining;
                        damageContext.wounds.taken = newWoundsValue - existingWounds;
                        damageContext.wounds.soaked = Math.min(woundsSoaked, woundsInflicted);
                        Hooks.call('swadeTakeDamage', actor, damageContext);
                    },
                },
                {
                    action: 'rerollBenny',
                    label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.Benny'),
                    icon: '<i class="fas fa-dice"></i>',
                    callback: async () => {
                        actor.spendBenny();
                        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext, woundsRemaining, { reroll: true });
                    },
                },
                {
                    action: 'rerollGmBenny',
                    label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.GMBenny'),
                    icon: '<i class="fas fa-dice"></i>',
                    callback: async () => {
                        game.user?.spendBenny();
                        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext, woundsRemaining, { reroll: true });
                    },
                },
                {
                    action: 'rerollFree',
                    label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.Free'),
                    icon: '<i class="fas fa-dice"></i>',
                    callback: async () => {
                        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText, damageContext, woundsRemaining);
                    },
                },
            ];
            // Is the Actor a Wild Card out of Bennies?
            const actorHasBennies = actor.isWildcard && actor.bennies > 0;
            // Is the User a GM?
            const isGM = game.user?.isGM;
            // Is the GM out of Bennies?
            const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;
            // If the Actor does not have Bennies, delete the button for spending Actor Bennies
            if (!actorHasBennies)
                removeButtons(buttons, ['rerollBenny']);
            // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
            if (!gmHasBennies)
                removeButtons(buttons, ['rerollGmBenny']);
            let content = game.i18n.format('SWADE.DamageApplicator.RerollSoakDialog.Prompt', {
                name: name,
                wounds: woundsRemainingText,
            });
            // Crit fail check to deny rerolling soaks. Per RAW Extras can't soak,
            //  so no need to handle the confirmation die
            if (vigorRoll?.isCritfail && !game.settings.get('swade', 'dumbLuck')) {
                removeButtons(buttons, ['rerollBenny', 'rerollGmBenny', 'rerollFree']);
                content = game.i18n.format('SWADE.DamageApplicator.RerollSoakDialog.PromptCritFail', {
                    name: name,
                    wounds: woundsRemainingText,
                });
            }
            // Create and render Dialog.
            foundry.applications.api.DialogV2.wait({
                window: {
                    title: game.i18n.format('SWADE.DamageApplicator.RerollSoakDialog.Title', {
                        name: name,
                    }),
                },
                content: content,
                buttons: buttons,
                classes: appCssClasses,
            });
        }
    }
}
// Function for applying Shaken Status Effect
async function applyShaken(actor) {
    if (actor.system instanceof VehicleData)
        return;
    // If they're not already Shaken, apply the Status Effect.
    if (!actor.system.status.isShaken) {
        await actor.toggleActiveEffect('shaken', { active: true });
    }
}
// Function for applying the Incapacitated Status Effect
async function applyIncapacitated(actor) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const name = speaker.alias;
    const statuses = [];
    const statusIncapacitated = getStatusEffectDataById('incapacitated');
    if (statusIncapacitated) {
        statuses.push({
            effectData: statusIncapacitated,
            options: { active: true, overlay: true },
        });
    }
    if (Hooks.call('swadeIncapacitation', actor, statuses) && actor.isWildcard) {
        let resistRoll = await resistInjury(actor);
        const ignoreBleedOut = game.settings.get('swade', 'heroesNeverDie') ||
            actor.getFlag('swade', 'ignoreBleedOut');
        if (ignoreBleedOut && resistRoll === constants$1.ROLL_RESULT.CRITFAIL)
            resistRoll = constants$1.ROLL_RESULT.FAIL;
        let message = '';
        const statusBleedingOut = getStatusEffectDataById('bleeding-out');
        switch (resistRoll) {
            case constants$1.ROLL_RESULT.CRITFAIL:
                message = game.i18n.format('SWADE.DamageApplicator.Incapacitation.Dies', { name: name });
                break;
            case constants$1.ROLL_RESULT.FAIL:
                await rollInjuryTable();
                message = game.i18n.format(ignoreBleedOut
                    ? 'SWADE.DamageApplicator.Incapacitation.PermanentInjuryHND'
                    : 'SWADE.DamageApplicator.Incapacitation.PermanentInjury', { name: name });
                // If there's an Status Effect data for Bleeding Out.
                if (statusBleedingOut && !ignoreBleedOut) {
                    const incapIndex = statuses.findIndex((s) => s.effectData.id === 'incapacitated');
                    statuses[incapIndex].options.overlay = false;
                    statuses.push({
                        effectData: statusBleedingOut,
                        options: { active: true, overlay: true },
                    });
                }
                break;
            case constants$1.ROLL_RESULT.SUCCESS:
                await rollInjuryTable();
                message = game.i18n.format('SWADE.DamageApplicator.Incapacitation.TemporaryInjury', { name: name });
                break;
            default: // Raises
                await rollInjuryTable();
                message = game.i18n.format('SWADE.DamageApplicator.Incapacitation.ShortInjury', { name: name });
                break;
        }
        await ChatMessage.create({ content: message, speaker: speaker });
    }
    statuses.forEach((s) => {
        actor.toggleActiveEffect(s.effectData, s.options);
    });
}
async function resistInjury(actor, bestRoll = constants$1.ROLL_RESULT.CRITFAIL) {
    const speaker = ChatMessage.getSpeaker({ actor });
    const name = speaker.alias;
    const vigorRoll = await actor.rollAttribute('vigor', {
        title: game.i18n.localize('SWADE.DamageApplicator.Incapacitation.InjuryRoll'),
        flavour: game.i18n.localize('SWADE.DamageApplicator.Incapacitation.InjuryRoll'),
        isRerollable: false,
    });
    const result = vigorRoll?.successes ?? constants$1.ROLL_RESULT.FAIL;
    if (result > constants$1.ROLL_RESULT.SUCCESS)
        return constants$1.ROLL_RESULT.RAISE;
    else if (result === constants$1.ROLL_RESULT.CRITFAIL)
        return constants$1.ROLL_RESULT.CRITFAIL;
    bestRoll = Math.max(bestRoll, result);
    const incapLabel = game.i18n.localize(result === constants$1.ROLL_RESULT.SUCCESS
        ? 'SWADE.DamageApplicator.Incapacitation.TakeSuccess'
        : 'SWADE.DamageApplicator.Incapacitation.TakeFail');
    // Build default buttons
    const buttons = [
        {
            action: 'take',
            label: incapLabel,
            icon: '<i class="fa-solid fa-skull"></i>',
            default: true,
            callback: () => new Object({ reroll: false, who: null }),
        },
        {
            action: 'rerollBenny',
            label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.Benny'),
            icon: '<i class="fas fa-dice"></i>',
            callback: () => new Object({ reroll: true, who: actor }),
        },
        {
            action: 'rerollGmBenny',
            label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.GMBenny'),
            icon: '<i class="fas fa-dice"></i>',
            callback: () => new Object({ reroll: false, who: game.user }),
        },
        {
            action: 'rerollFree',
            label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.Free'),
            icon: '<i class="fas fa-dice"></i>',
            callback: () => new Object({ reroll: true, who: null }),
        },
    ];
    // Is the Actor a Wild Card out of Bennies?
    const actorHasBennies = actor.isWildcard && actor.bennies > 0;
    // Is the User a GM?
    const isGM = game.user?.isGM;
    // Is the GM out of Bennies?
    const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;
    // If the Actor does not have Bennies, delete the button for spending Actor Bennies
    if (!actorHasBennies)
        removeButtons(buttons, ['rerollBenny']);
    // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
    if (!gmHasBennies)
        removeButtons(buttons, ['rerollGmBenny']);
    const dialogResult = await foundry.applications.api.DialogV2.wait({
        window: {
            title: game.i18n.format('SWADE.DamageApplicator.Incapacitation.Title', {
                name: name,
            }),
        },
        content: game.i18n.format('SWADE.DamageApplicator.Incapacitation.Prompt', {
            name: name,
        }),
        buttons: buttons,
        classes: appCssClasses,
    });
    if (dialogResult.reroll) {
        if (dialogResult.who)
            dialogResult.who?.spendBenny();
        const newRoll = await resistInjury(actor, bestRoll);
        if (newRoll === constants$1.ROLL_RESULT.CRITFAIL)
            return newRoll;
        bestRoll = Math.max(newRoll, bestRoll);
    }
    return bestRoll;
}
// Function for rolling on the Injury Table.
async function rollInjuryTable() {
    // Get the Injury Table from settings.
    const injuryTable = (await fromUuid(game.settings.get('swade', 'injuryTable')));
    // If a table is found, draw from the table.
    if (injuryTable) {
        await injuryTable.draw();
    }
    else {
        // Issue an error if no table is selected.
        ui.notifications.error('SWADE.DamageApplicator.NoInjuryTable', {
            localize: true,
        });
    }
}
var Status;
(function (Status) {
    Status[Status["NONE"] = 0] = "NONE";
    Status[Status["SHAKEN"] = 1] = "SHAKEN";
    Status[Status["WOUNDED"] = 2] = "WOUNDED";
})(Status || (Status = {}));

class SwadeChatMessage extends ChatMessage {
    /** Returns the most significant roll for this chat message */
    get significantRoll() {
        return this.rolls[this.rolls.length - 1];
    }
    get isCritfail() {
        const actor = this.speakerActor;
        //just return false if there's no actor.
        if (!actor)
            return false;
        const roll = this.significantRoll;
        const rollIsCritFail = !!roll?.isCritfail;
        const isGroupRoll = roll instanceof TraitRoll && roll.groupRoll;
        if (actor.isWildcard || isGroupRoll)
            return rollIsCritFail;
        return (rollIsCritFail &&
            this.rolls
                .filter((r) => r.isCritFailConfirmationRoll)
                .every((r) => r.total === 1));
    }
    /** returns whether the message depicts a card draw result */
    get isCardDraw() {
        return (!!this.getFlag('swade', 'pickedCard') && !!this.getFlag('swade', 'cards'));
    }
    get isRollTableResult() {
        return !!this.getFlag('core', 'RollTable');
    }
    get isSwadeRoll() {
        return this.isRoll && this.rolls.every((r) => r instanceof SwadeRoll);
    }
    /** returns the index of the message in the list of all messages */
    get index() {
        return game.messages.contents.findIndex((m) => m.id === this.id);
    }
    async renderHTML(options = {}) {
        if (this.isCardDraw) {
            const rendered = await this.#renderCardDraw();
            if (rendered)
                this.content = rendered;
            else
                return document.createElement('div');
        }
        else if (this.isSwadeRoll && !this.isRollTableResult) {
            const messageData = await this.#getSwadeRollMessageData(options);
            const html = await this.#renderSwadeRollMessage(messageData);
            Hooks.callAll('renderChatMessageHTML', this, html, messageData);
            return html;
        }
        return super.renderHTML(options);
    }
    // and later
    _onClickDiceRoll(event) {
        event.stopPropagation();
        const target = event.currentTarget;
        target.classList.toggle('expanded');
    }
    async #renderCardDraw() {
        const msgType = game.settings.get('swade', 'initMessage');
        const cards = this.getFlag('swade', 'cards').map((c) => {
            return {
                id: c._id,
                face: c.faces[c.face].img,
                name: c.faces[c.face].name || c.name,
            };
        });
        const pickedCard = this.getFlag('swade', 'pickedCard');
        const isRedraw = this.getFlag('swade', 'isRedraw');
        const [[picked], discarded] = cards.partition((c) => c.id !== pickedCard);
        if (msgType === constants$1.INIT_MESSAGE_TYPE.OFF && !isRedraw) {
            return ''; //empty message
        }
        else {
            return foundry.applications.handlebars.renderTemplate('systems/swade/templates/chat/card-draw-result.hbs', {
                isRedraw,
                picked,
                discarded,
                largeMsg: msgType === constants$1.INIT_MESSAGE_TYPE.LARGE,
                index: this.index,
            });
        }
    }
    async #getSwadeRollMessageData(options) {
        const { canDelete = this.isAuthor, canClose = false } = options;
        // Determine some metadata
        const data = this.toObject(false);
        data.content = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.content, {
            rollData: this.getRollData(),
        });
        // Construct message data
        const isWhisper = !!this.whisper.length;
        const messageData = {
            canDelete,
            canClose,
            message: data,
            user: game.user,
            author: this.author,
            alias: this.alias,
            cssClass: [
                this.style === CONST.CHAT_MESSAGE_STYLES.IC ? 'ic' : null,
                this.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? 'emote' : null,
                this.blind ? 'blind' : null,
                isWhisper ? 'whisper' : null,
            ].filterJoin(' '),
            isWhisper,
            whisperTo: this.whisper
                .map((u) => game.users.get(u)?.name)
                .filterJoin(', '),
        };
        return messageData;
    }
    async #renderSwadeRollMessage(messageData) {
        await this.#renderSwadeRollContent(messageData);
        // Render the chat message
        let html = await foundry.applications.handlebars.renderTemplate(CONFIG.ChatMessage.template, messageData);
        html = foundry.utils.parseHTML(html);
        this.#attachRollMessageListeners(html);
        return html;
    }
    async #renderSwadeRollContent(messageData) {
        const data = messageData.message;
        // Suppress the "to:" whisper flavor for private rolls
        if (this.blind || this.whisper.length)
            messageData.isWhisper = false;
        // Display standard Roll HTML content
        if (this.isContentVisible) {
            data.content = await this.#renderMessageBody(false, data.content);
        }
        else {
            // Otherwise, show "rolled privately" messages for Roll content
            const name = this.author?.name ?? game.i18n.localize('CHAT.UnknownUser');
            data.flavor = game.i18n.format('CHAT.PrivateRollContent', { user: name });
            data.content = await this.#renderMessageBody(true);
            messageData.alias = name;
        }
    }
    #attachRollMessageListeners(html) {
        html
            .querySelectorAll('.dice-roll')
            .forEach((el) => el.addEventListener('click', this._onClickDiceRoll.bind(this)));
        html
            .querySelector('.swade-roll-message button.free-reroll')
            ?.addEventListener('click', SwadeRoll.rerollFree);
        html
            .querySelectorAll('.swade-roll-message button.benny-reroll')
            .forEach((btn) => btn.addEventListener('click', SwadeRoll.rerollBenny));
        html
            .querySelector('.swade-roll-message .confirm-critfail')
            ?.addEventListener('click', () => TraitRoll.confirmCritfail(this));
        html
            .querySelector('.swade-roll-message button.calculate-wounds')
            ?.addEventListener('click', () => damageApplicator(this));
        html
            .querySelectorAll('details.modifiers')
            .forEach((detail) => new Accordion(detail));
        html
            .querySelectorAll('.swade-roll-message .target')
            .forEach((target) => {
            target.addEventListener('mouseenter', (ev) => {
                if (!canvas.ready)
                    return;
                const target = ev.currentTarget;
                const tokenDoc = fromUuidSync(target.dataset.tokenUuid ?? '');
                const tokenObj = tokenDoc?.object;
                if (tokenObj?.isVisible && !tokenObj?.controlled) {
                    tokenObj?._onHoverIn(ev);
                }
            });
            target.addEventListener('mouseleave', (ev) => {
                if (!canvas.ready)
                    return;
                const target = ev.currentTarget;
                const tokenDoc = fromUuidSync(target.dataset.tokenUuid ?? '');
                const tokenObj = tokenDoc?.object;
                if (tokenObj?.isVisible && !tokenObj?.controlled) {
                    tokenObj?._onHoverOut(ev);
                }
            });
            target.addEventListener('click', (ev) => {
                if (!canvas.ready)
                    return;
                const target = ev.currentTarget;
                const tokenDoc = fromUuidSync(target.dataset.tokenUuid ?? '');
                if (tokenDoc?.object?.isVisible)
                    tokenDoc?.object?.control();
            });
        });
    }
    async #renderRolls(isPrivate) {
        if (isPrivate)
            return this.significantRoll.render({ isPrivate });
        let html = '';
        for (let i = 0; i < this['rolls'].length; i++) {
            const roll = this['rolls'][i];
            const displayResult = roll === this.significantRoll;
            if (roll instanceof SwadeRoll) {
                let flavor = game.i18n.localize(`SWADE.Rolls.${roll.constructor.name}`);
                if (roll.isCritFailConfirmationRoll) {
                    flavor =
                        roll.total === 1
                            ? game.i18n.localize('SWADE.Rolls.Critfail.Confirmed')
                            : game.i18n.localize('SWADE.Rolls.Critfail.Unconfirmed');
                }
                html += await roll.render({ isPrivate, displayResult, flavor });
            }
            else {
                html += await roll.render({ isPrivate });
            }
        }
        return html;
    }
    #formatModifiers() {
        return this.significantRoll?.modifiers.filter((v) => !v.ignore) ?? []; //remove the disabled modifiers
    }
    async #renderMessageBody(isPrivate, content) {
        const roll = this.significantRoll;
        const isTraitRoll = roll instanceof TraitRoll;
        const targets = this.getFlag('swade', 'targets') ?? [];
        return foundry.applications.handlebars.renderTemplate('systems/swade/templates/chat/dice/roll-message.hbs', {
            lockReroll: this.isCritfail && !game.settings.get('swade', 'dumbLuck'),
            modifiers: this.#formatModifiers(),
            rerolled: roll?.getRerollLabel(),
            groupRoll: isTraitRoll && roll.groupRoll,
            isCritfail: this.isCritfail && !isPrivate,
            hasConfirmedCritfail: this.hasConfirmedCritfail(),
            isWildCard: this.speakerActor?.isWildcard,
            isDamageRoll: roll instanceof DamageRoll && !isPrivate,
            isPrivate: isPrivate,
            notRerollable: !roll?.isRerollable,
            isGM: game.user?.isGM,
            isAuthor: this.isAuthor || game.user?.isGM,
            rolls: await this.#renderRolls(isPrivate),
            targets: targets,
            content: content,
        });
    }
    hasConfirmedCritfail() {
        const roll = this.significantRoll;
        const isTraitRoll = roll instanceof TraitRoll;
        if (!roll || !isTraitRoll)
            return false;
        if (this.speakerActor?.isWildcard)
            return !!roll.isCritfail;
        const pool = roll.terms[0];
        const hasMultipleTraitDice = pool.dice.length > 1;
        const hasConfirmedCritfail = this['rolls'].find((r) => r.isCritFailConfirmationRoll && r.total === 1);
        if (hasMultipleTraitDice) {
            return count(pool.dice, (d) => d.total === 1) > pool.dice.length / 2;
        }
        return !!hasConfirmedCritfail;
    }
}

class AmbushAssistant extends Application {
    #combat;
    #categories = {
        unassigned: new Array(),
        hold: new Array(),
        draw: new Array(),
        noTurn: new Array(),
    };
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'ambush-assistant',
            title: game.i18n.localize('SWADE.AmbushAssistant.Title'),
            classes: ['swade-app', 'ambush-assistant'],
            template: 'systems/swade/templates/apps/ambush-assistant.hbs',
            dragDrop: [{ dragSelector: '.combatant', dropSelector: '.column' }],
            width: 800,
            height: 500,
        });
    }
    constructor(combat, options) {
        super(options);
        this.#combat = combat;
        this.#categories.unassigned = combat.combatants.contents.filter((c) => !c.group || c.isGroupLeader);
    }
    activateListeners(jquery) {
        const html = jquery[0];
        html.querySelectorAll('.column').forEach((e) => {
            e.addEventListener('dragenter', this._onDragEnter.bind(this));
            e.addEventListener('dragleave', this._onDragLeave.bind(this));
        });
        html
            .querySelector('button[type="submit"]')
            ?.addEventListener('click', this.submit.bind(this));
    }
    async getData(options) {
        return foundry.utils.mergeObject(await super.getData(options), {
            ...this.#categories,
            submissionLocked: this.#categories.unassigned.length !== 0,
        });
    }
    async submit() {
        for (const noTurn of this.#categories.noTurn) {
            await Promise.all((noTurn.group?.members ?? [noTurn]).map((m) => m.setTurnLost(true)));
        }
        await this.#combat.startCombat();
        let initiative = 1000;
        for (const hold of this.#categories.hold) {
            const toHold = hold.group?.members ?? [hold];
            await Promise.all(toHold.map((c) => c.toggleHold()));
            await Promise.all(toHold.map((c) => c.setRoundHeld(0.1)));
            await hold.update({ initiative: (initiative -= 1) });
            // Need each of them to be offset by a small decrement for properly placing interruptors.
            for (const c of toHold) {
                if (c.group && c.isGroupLeader)
                    continue;
                await c.update({ initiative: (initiative -= 0.01) });
            }
        }
        await this.close();
    }
    _onDrop(event) {
        const target = event.currentTarget;
        target.classList.remove('drag-highlight');
        const { id, category } = JSON.parse(event.dataTransfer.getData('text/plain'));
        const targetCategory = target.closest('.column')?.dataset
            .category;
        if (category === targetCategory)
            return;
        if (!id || !category)
            return;
        const combatant = this.#categories[category].findSplice((c) => c.id === id);
        if (!combatant)
            throw new Error();
        this.#categories[targetCategory].push(combatant);
        this.render(true);
    }
    _onDragStart(event) {
        const target = event.currentTarget;
        const id = target.dataset.combatantId;
        const category = target.closest('.column')?.dataset.category;
        event.dataTransfer?.setData('text/plain', JSON.stringify({ id, category }));
    }
    _onDragLeave(event) {
        event.currentTarget.classList.remove('drag-highlight');
    }
    _onDragEnter(event) {
        event.currentTarget.classList.add('drag-highlight');
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$5, HandlebarsApplicationMixin: HandlebarsApplicationMixin$6 } = foundry.applications.api;
class CardPicker extends HandlebarsApplicationMixin$6(ApplicationV2$5) {
    constructor({ ctx, resolve, ...options }) {
        super(options);
        this.#initContext(ctx);
        this.#callback = resolve;
    }
    #ctx;
    #callback;
    #isResolved = false;
    static asPromise({ ctx, ...options }) {
        return new Promise((resolve) => new CardPicker({ ctx, resolve, ...options }).render({ force: true }));
    }
    static DEFAULT_OPTIONS = {
        classes: ['card-picker', 'swade-application'],
        window: {
            contentClasses: ['standard-form']
        },
        position: {
            width: 400,
            height: 'auto'
        },
        actions: {
            submit: this.#onSubmit,
            redraw: this.#onRedraw
        }
    };
    static PARTS = {
        picker: { template: 'systems/swade/templates/apps/card-picker.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' }
    };
    get title() {
        return game.i18n.format('SWADE.PickACard', {
            name: this.#ctx.combatantName,
        });
    }
    get #cards() {
        return this.#ctx.cards;
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            cards: this.#cards,
            oldCard: this.#ctx.oldCardId,
            highestCardID: foundry.utils.deepClone(this.#cards).sort(this.#sortCards.bind(this))[0].id,
            buttons: [
                { type: 'button', action: 'submit', icon: 'fa-solid fa-check', label: 'SWADE.Ok' },
            ]
        });
        if (this.#allowRedraw()) {
            context.buttons.push({ type: 'button', action: 'redraw', icon: 'fa-solid fa-plus', label: 'SWADE.Redraw' });
        }
        return context;
    }
    #initContext(ctx) {
        if (ctx.isQuickDraw) {
            ctx.enableRedraw =
                ctx.enableRedraw || !ctx.cards.every((card) => card.value <= 5);
        }
        this.#ctx = ctx;
    }
    static #onSubmit(_event, _target) {
        const cardId = this.element.querySelector('input[name=card]:checked')?.dataset.cardId;
        const picked = this.#cards.find((c) => c.id === cardId);
        this.#resolve({
            cards: this.#cards,
            picked: picked || this.#getFallBackCard(),
        });
    }
    #resolve(result) {
        this.#isResolved = true;
        this.#callback(result);
        this.close();
    }
    static async #onRedraw(_event, _target) {
        const discardPile = game.cards.get(game.settings.get('swade', 'actionDeckDiscardPile'), { strict: true });
        const cards = await this.#ctx.deck.dealForInitiative(discardPile);
        this.#cards.push(...cards);
        this.render();
    }
    #allowRedraw() {
        if (this.#ctx.isQuickDraw) {
            return this.#cards.every((card) => card.value <= 5);
        }
        return !!this.#ctx.oldCardId || !!this.#ctx.enableRedraw;
    }
    #getFallBackCard() {
        let picked;
        if (this.#ctx.oldCardId) {
            picked = this.#cards.find((c) => c.id === this.#ctx.oldCardId);
        }
        else {
            picked = this.#cards.find((c) => c.system['isJoker']) || this.#cards[0];
        }
        return picked;
    }
    #sortCards(a, b) {
        const cardA = a.value ?? 0;
        const cardB = b.value ?? 0;
        const card = cardB - cardA;
        if (card !== 0)
            return card;
        const suitA = a.system['suit'] ?? 0;
        const suitB = b.system['suit'] ?? 0;
        return suitB - suitA;
    }
    _onClose(options) {
        super._onClose(options);
        if (!this.#isResolved) {
            this.#callback({
                cards: this.#cards,
                picked: this.#getFallBackCard(),
            });
        }
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$4, HandlebarsApplicationMixin: HandlebarsApplicationMixin$5 } = foundry.applications.api;
class PlayerCardDrawHerder extends HandlebarsApplicationMixin$5(ApplicationV2$4) {
    constructor(ctx, resolve, options) {
        super(options);
        this.#callback = resolve;
        this.ctx = this.#initContext(ctx);
        this.#promptAllPlayers();
    }
    #isResolved = false;
    #callback;
    static asPromise(ctx) {
        return new Promise((resolve) => new PlayerCardDrawHerder(ctx, resolve).render({ force: true }));
    }
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE.PlayerCardDrawHelper.Title',
            contentClasses: ['standard-form'],
        },
        classes: ['swade-application'],
        position: {
            width: 400,
            height: 'auto'
        },
        actions: {
            close: this.#onClose
        }
    };
    static PARTS = {
        herder: { template: 'systems/swade/templates/apps/player-card-draw-herder.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' }
    };
    static #onClose(_event, _target) {
        return this.close();
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            draws: this.ctx.draws.map((draw) => ({
                user: draw.user.name,
                combatant: draw.combatant.name,
                icon: this.#getIconForDraw(draw)
            })),
            buttons: [
                { type: 'button', action: 'close', label: 'Close' }
            ]
        });
        return context;
    }
    #initContext(ctx) {
        const internal = { ...ctx };
        internal.draws = internal.draws.map((draw) => {
            return {
                ...draw,
                state: PlayerDrawState.PENDING,
            };
        });
        return internal;
    }
    async #promptAllPlayers() {
        for (const draw of this.ctx.draws) {
            Logger.debug('Waiting for user' + draw.user.name);
            //mark the user as drawing
            this.#markPlayer(draw.user.id, PlayerDrawState.DRAWING);
            await this.#promptPlayerForInitiative(draw.user.id, draw.combatant.id);
        }
        this.#resolve();
    }
    async #promptPlayerForInitiative(userId, combatantId) {
        let hookId;
        //build and execute the main show
        await new Promise((resolve) => {
            //register the hook
            hookId = Hooks.on('updateCombatant', (combatant, _changed, _options, triggeringUser) => {
                if (triggeringUser !== userId || combatant.id !== combatantId)
                    return;
                Logger.debug(`User ${game.users?.get(userId)?.name} drew a card!`);
                //clean up
                this.#cancelHook(hookId);
                this.#markPlayer(triggeringUser, PlayerDrawState.DONE);
                resolve();
            });
            //poke the player client
            game.swade.sockets.promptInitiative(this.ctx.combatId, userId, combatantId);
        });
    }
    #cancelHook(id) {
        Hooks.off('updateCombatant', id);
    }
    #markPlayer(userId, newState) {
        const draw = this.ctx.draws.find((draw) => draw.user.id === userId);
        if (draw)
            draw.state = newState;
        setTimeout(() => this.render());
    }
    #resolve() {
        this.#isResolved = true;
        this.#callback();
    }
    #getIconForDraw(draw) {
        const style = [];
        const classes = ['fa-xl', 'fa-solid'];
        switch (draw.state) {
            case PlayerDrawState.PENDING:
                classes.push('fa-hourglass');
                style.push('color: var(--color-text-dark-inactive)');
                break;
            case PlayerDrawState.DRAWING:
                classes.push('fa-cards', 'fa-fade');
                style.push('color: var(--color-level-info)', '--fa-animation-duration: 2s');
                break;
            case PlayerDrawState.DONE:
                classes.push('fa-check');
                style.push('color: var(--color-level-success)');
                break;
        }
        return new Handlebars.SafeString(`<i class='${classes.join(' ')}' style='${style.join(';')}'></i>`);
    }
    _onClose(options) {
        super._onClose(options);
        if (!this.#isResolved)
            this.#callback();
    }
}
var PlayerDrawState;
(function (PlayerDrawState) {
    PlayerDrawState["PENDING"] = "pending";
    PlayerDrawState["DRAWING"] = "drawing";
    PlayerDrawState["DONE"] = "done";
})(PlayerDrawState || (PlayerDrawState = {}));

class SwadeCombat extends Combat {
    /** an internal helper flag that's being checked to see if we're currently asking to advance the round */
    #roundAdvanceDialog = false;
    /** Compares two combatants by name. */
    static nameSortCombatants(a, b) {
        if (a.name === b.name)
            return SwadeCombat.#idSortCombatants(a, b);
        return a.name > b.name ? 1 : -1;
    }
    /** Compares two combatants by ID. */
    static #idSortCombatants(a, b) {
        return a.id > b.id ? 1 : -1;
    }
    static INITIATIVE_SOUND = 'systems/swade/assets/card-flip.wav';
    /**
     * @privateRemarks Adapted from v13 implementation
     */
    static async createDialog(data = {}, createOptions = {}, dialogOptions = {}) {
        const typeOptions = Object.entries(CONFIG.Combat.typeLabels).map(([value, label]) => ({ value, label }));
        const typeSelect = foundry.applications.fields.createSelectInput({
            options: typeOptions,
            value: 'base',
            localize: true,
            name: 'type',
        });
        const typeGroup = foundry.applications.fields.createFormGroup({
            label: game.i18n.localize('Type'),
            input: typeSelect,
        });
        let html = typeGroup.outerHTML;
        if (game.scenes.current) {
            const linkInput = document.createElement('input');
            linkInput.type = 'checkbox';
            linkInput.name = 'scene';
            linkInput.setAttribute('checked', '');
            linkInput.setAttribute('value', game.scenes.current.id);
            const linkGroup = foundry.applications.fields.createFormGroup({
                label: game.i18n.localize('SWADE.Combat.LinkScene'),
                input: linkInput,
            });
            html += linkGroup.outerHTML;
        }
        //inputs for dramatic task relevant data
        html += CONFIG.Combat.dataModels.dramaticTask.schema
            .getField('maxRounds')
            ?.toFormGroup({ classes: ['slim', 'hidden'], localize: true })?.outerHTML;
        html += CONFIG.Combat.dataModels.dramaticTask.schema
            .getField('tokens.max')
            ?.toFormGroup({
            label: 'SWADE.DramaticTask.MaxTokens.Label',
            hint: 'SWADE.DramaticTask.MaxTokens.Hint',
            classes: ['slim', 'hidden'],
            localize: true,
        })?.outerHTML;
        // Collect data
        const label = game.i18n.localize(this.metadata.label);
        const title = game.i18n.format('DOCUMENT.Create', { type: label });
        // Render the confirmation dialog window
        return foundry.applications.api.DialogV2.prompt(foundry.utils.mergeObject({
            content: html,
            window: { title },
            position: { width: 360 },
            ok: {
                label: title,
                callback: (_event, button) => {
                    const fd = new FormDataExtended(button.form);
                    foundry.utils.mergeObject(data, fd.object);
                    return this.create(data, {
                        renderSheet: false,
                        ...createOptions,
                    });
                },
            },
            rejectClose: false,
            render: (_event, dialog) => {
                const html = dialog.element;
                const typeSelect = html.querySelector('select[name="type"]');
                const roundsInput = html
                    .querySelector('input[name="system.maxRounds"]')
                    ?.closest('.form-group');
                const tokenInput = html
                    .querySelector('input[name="system.tokens.max"]')
                    ?.closest('.form-group');
                typeSelect?.addEventListener('change', () => {
                    if (typeSelect.value === 'dramaticTask') {
                        roundsInput?.classList.remove('hidden');
                        tokenInput?.classList.remove('hidden');
                    }
                    else {
                        roundsInput?.classList.add('hidden');
                        tokenInput?.classList.add('hidden');
                    }
                });
            },
        }, dialogOptions));
    }
    get actionDeck() {
        return game.cards.get(game.settings.get('swade', 'actionDeck'), {
            strict: true,
        });
    }
    get automaticInitiative() {
        return game.settings.get('swade', 'autoInit');
    }
    #initSoundData = {
        src: SwadeCombat.INITIATIVE_SOUND,
        volume: 0.8,
        autoplay: true,
        loop: false,
    };
    #debouncedCombatSound = foundry.utils.debounce(super._playCombatSound, 200);
    async rollInitiative(ids, { messageOptions, updateTurn } = {}) {
        // Structure input data
        ids = Array.isArray(ids) ? ids : [ids];
        const currentId = this.combatant?.id;
        const messages = [];
        const combatantUpdates = [];
        const groupUpdates = [];
        //Check if enough cards are available
        if (ids.length > this.actionDeck.availableCards.length) {
            const message = game.i18n.format('SWADE.NoCardsLeft', {
                needed: ids.length,
                current: this.actionDeck.availableCards.length,
            });
            ui.notifications.warn(message);
            return this;
        }
        // Iterate over Combatants, performing an initiative draw for each
        for (const id of ids) {
            // Get Combatant data
            const c = this.combatants.get(id, { strict: true });
            if (!c.isOwner)
                continue;
            const roundHeld = !!c.roundHeld;
            //Do not draw cards for defeated, holding or non-leader grouped combatants
            if (c.isDefeated ||
                roundHeld ||
                (c.group && !c.isGroupLeader) ||
                c.turnLost)
                continue;
            // Set up edges
            let hasHesitant = false;
            let hasQuick = false;
            const actorModel = c.actor?.system;
            if (actorModel && 'initiative' in actorModel) {
                hasHesitant = actorModel.initiative.hasHesitant ?? false;
                hasQuick = actorModel.initiative.hasQuick ?? false;
            }
            const isIncapacitated = c.isIncapacitated;
            // Figure out how many cards to draw
            const cardsToDraw = c.cardsToDraw;
            // Draw initiative
            let pickedCard;
            let cardsToPickFrom = await this.drawCard(cardsToDraw);
            const isRedraw = typeof c.initiative === 'number' && !roundHeld;
            if (isRedraw) {
                // handle redraws
                const oldCard = this.findCard(c?.cardValue, c?.suitValue);
                if (oldCard) {
                    cardsToPickFrom.push(oldCard);
                    const result = await this.pickACard({
                        cards: cardsToPickFrom,
                        combatantName: c.name,
                        oldCardId: oldCard?.id,
                    });
                    pickedCard = result.picked;
                    cardsToPickFrom = result.cards;
                }
                else {
                    pickedCard = cardsToPickFrom[0];
                }
            }
            else if (isIncapacitated) {
                pickedCard = cardsToPickFrom[0];
            }
            else if (hasHesitant) {
                // Hesitant
                const joker = cardsToPickFrom.find((c) => c.system['isJoker']);
                if (joker) {
                    // if one of the cards drawn was a joker, simply use that
                    pickedCard = joker;
                }
                else {
                    //sort cards to pick the lower one
                    cardsToPickFrom.sort((a, b) => {
                        const cardA = a.value;
                        const cardB = b.value;
                        const card = cardA - cardB;
                        if (card !== 0)
                            return card;
                        const suitA = a.system['suit'];
                        const suitB = b.system['suit'];
                        const suit = suitA - suitB;
                        return suit;
                    });
                    pickedCard = cardsToPickFrom[0];
                }
            }
            else if (cardsToDraw > 1) {
                //Level Headed
                const result = await this.pickACard({
                    cards: cardsToPickFrom,
                    combatantName: c.name,
                    enableRedraw: hasQuick,
                    isQuickDraw: hasQuick,
                });
                pickedCard = result.picked;
                cardsToPickFrom = result.cards;
            }
            else if (hasQuick) {
                pickedCard = cardsToPickFrom[0];
                const cardValue = pickedCard.value;
                //if the card value is less than 5 then pick a card otherwise use the card
                if (cardValue <= 5) {
                    const result = await this.pickACard({
                        cards: [pickedCard],
                        combatantName: c.name,
                        enableRedraw: true,
                        isQuickDraw: true,
                    });
                    pickedCard = result.picked;
                    cardsToPickFrom = result.cards;
                }
            }
            else {
                //normal card draw
                pickedCard = cardsToPickFrom[0];
            }
            const systemData = {
                cardValue: pickedCard.value,
                suitValue: pickedCard.system['suit'],
                hasJoker: pickedCard.system['isJoker'],
                cardString: pickedCard.description,
            };
            const initiative = pickedCard.value +
                pickedCard?.system['suit'] / 10;
            const update = {
                _id: id,
                initiative,
                system: systemData,
            };
            //Handle group leader changes
            combatantUpdates.push(update);
            if (c.isGroupLeader) {
                groupUpdates.push({
                    _id: c.group.id,
                    initiative: update.initiative,
                });
            }
            // Construct chat message data
            const messageData = foundry.utils.mergeObject({
                speaker: ChatMessage.getSpeaker({
                    actor: c.actor,
                    token: c.token,
                    alias: c.name,
                }),
                whisper: c.token?.hidden || c.hidden
                    ? game?.users?.filter((u) => u.isGM)
                    : [],
                content: '', //keep the content empty so we don't trigger validation warnings
                'flags.swade': {
                    isRedraw,
                    pickedCard: pickedCard.id,
                    cards: cardsToPickFrom.map((c) => c.toObject()),
                },
            }, messageOptions);
            messages.push(messageData);
        }
        if (!combatantUpdates.length)
            return this;
        // Update the combat instance with the new combatants
        await this.updateEmbeddedDocuments('Combatant', combatantUpdates);
        await this.updateEmbeddedDocuments('CombatantGroup', groupUpdates);
        // Create multiple chat messages
        this._playInitiativeSound();
        await getDocumentClass('ChatMessage').createDocuments(messages);
        const activeCombatants = this.combatants.filter((c) => !c.isDefeated);
        if (activeCombatants.every((c) => !!c.initiative)) {
            await this.update({ turn: 0 });
            this._handleStartOfTurnExpirations();
        }
        else if (updateTurn && currentId) {
            // Ensure the turn order remains with the same combatant
            await this.update({
                turn: this.turns.findIndex((t) => t.id === currentId),
            });
        }
        // Return the updated Combat
        return this;
    }
    _sortCombatants(a, b) {
        const currentRound = game.combat?.round ?? 0;
        if ((a.roundHeld && currentRound !== a.roundHeld) ||
            (b.roundHeld && currentRound !== b.roundHeld)) {
            const isOnHoldA = a.roundHeld && (a.roundHeld ?? 0 < currentRound);
            const isOnHoldB = b.roundHeld && (b.roundHeld ?? 0 < currentRound);
            if (isOnHoldA && !isOnHoldB)
                return -1;
            if (!isOnHoldA && isOnHoldB)
                return 1;
        }
        if (b.initiative === a.initiative) {
            return SwadeCombat.nameSortCombatants(a, b);
        }
        else {
            return super._sortCombatants(a, b);
        }
    }
    _onCreateDescendantDocuments(parent, collection, documents, data, options, userId) {
        super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
        if (collection === 'groups')
            this.#onModifyCombatantGroups(parent, documents, options);
    }
    _onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId) {
        super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
        if (collection === 'groups')
            this.#onModifyCombatantGroups(parent, documents, options);
    }
    _onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId) {
        super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
        if (collection === 'groups')
            this.#onModifyCombatantGroups(parent, documents, options);
    }
    #onModifyCombatantGroups(parent, _documents, options) {
        this.setupTurns();
        if (ui.combat.viewed === parent && options.render !== false)
            ui.combat.render();
    }
    /**
     * Draws cards from the Action Cards deck
     * @param count number of cards to draw
     * @returns an array with the drawn cards
     */
    async drawCard(count = 1) {
        const pileId = game.settings.get('swade', 'actionDeckDiscardPile');
        const discardPile = game.cards.get(pileId, { strict: true });
        return this.actionDeck.dealForInitiative(discardPile, count);
    }
    /** Ask the user to pick a card for a given combatant name */
    async pickACard(ctx) {
        return CardPicker.asPromise({ ctx: { ...ctx, deck: this.actionDeck } });
    }
    /**
     * Find a card from the deck based on it's suit and value
     * @param cardValue
     * @param cardSuit
     */
    findCard(cardValue, cardSuit) {
        return this.actionDeck.cards.find((c) => c.type === 'poker' &&
            c.value === cardValue &&
            c.system['suit'] === cardSuit);
    }
    async resetAll() {
        for (const combatant of this.combatants) {
            const update = this._getInitResetUpdate(combatant);
            if (update)
                combatant.updateSource(update);
        }
        for (const group of this.groups) {
            group.updateSource({
                initiative: group.system.leaderCombatant._source.initiative,
            });
        }
        await this.update({
            turn: 0,
            combatants: this.combatants.toObject(),
            groups: this.groups.toObject(),
        }, { diff: false });
        return this;
    }
    async startCombat() {
        //Init autoroll
        if (this.automaticInitiative) {
            // if automatic init is on we draw cards
            await this._promptAllPlayersForInitiative();
            //grab the NPCs, we're drawing them locally
            await this.rollNPC();
        }
        return super.startCombat();
    }
    startSurpriseCombat() {
        new AmbushAssistant(this).render(true);
    }
    toggleGroupExpand(groupId) {
        const group = this.groups.get(groupId);
        group._expanded = !group._expanded;
        return ui.combat.render({ parts: ['tracker'] });
    }
    async nextTurn() {
        await this._handleEndOfTurnExpirations();
        const turn = this.turn ?? -1;
        // Determine the next turn number
        let next = null;
        if (this.settings.skipDefeated) {
            for (const [i, t] of this.turns.entries()) {
                if (i <= turn)
                    continue;
                // Skip defeated, lost turns
                if (t.isDefeated || t.turnLost)
                    continue;
                next = i;
                break;
            }
        }
        else {
            next = turn + 1;
        }
        // Maybe advance to the next round
        const round = this.round;
        if (this.round === 0 || next === null || next >= this.turns.length) {
            return this.nextRound();
        }
        // Update the document, passing data through a hook first
        const updateData = { round, turn: next };
        const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
        Hooks.callAll('combatTurn', this, updateData, updateOptions);
        await this.update(updateData, updateOptions);
        await this._handleStartOfTurnExpirations();
        if (this.combatant?.group && !this.combatant.group._expanded) {
            await this.toggleGroupExpand(this.combatant.group.id);
        }
        return this;
    }
    async nextRound() {
        if (game.user.isGM)
            await this._nextRoundAsGM();
        else
            await this._nextRoundAsUser();
        if (this.combatant?.group && !this.combatant.group._expanded) {
            await this.toggleGroupExpand(this.combatant.group.id);
        }
        return this;
    }
    async previousRound() {
        const revert = await Dialog.confirm({
            title: game.i18n.localize('SWADE.Combat.RevertRoundTitle'),
            content: '<p>' + game.i18n.localize('SWADE.Combat.RevertRoundContent') + '</p>',
            defaultYes: true,
            rejectClose: false,
            options: { classes: [...Dialog.defaultOptions.classes, 'swade-app'] },
        });
        if (!revert)
            return this;
        return super.previousRound();
    }
    /**
     * Called by CombatTracker#_onCombatControl
     */
    async resetDeck() {
        await reshuffleActionDeck();
        ui.notifications.info('SWADE.ActionDeckResetNotification', {
            localize: true,
        });
    }
    _getInitResetUpdate(combatant) {
        const roundHeld = combatant.roundHeld;
        const turnLost = combatant.turnLost;
        if (roundHeld) {
            if (turnLost) {
                return {
                    initiative: null,
                    system: {
                        hasJoker: false,
                        '-=turnLost': null,
                    },
                };
            }
            else {
                //keep the card
                return;
            }
        }
        else if (!roundHeld || turnLost) {
            return {
                initiative: null,
                system: {
                    suitValue: null,
                    cardValue: null,
                    hasJoker: false,
                    cardString: '',
                    turnLost: false,
                },
            };
        }
        return {
            initiative: null,
            system: {
                suitValue: null,
                cardValue: null,
                hasJoker: false,
                cardString: '',
                turnLost: false,
            },
        };
    }
    async _handleStartOfTurnExpirations() {
        if (!this.combatant || this.combatant.isDefeated)
            return;
        const expirations = this.combatant?.actor?.effects.filter((effect) => effect.isTemporary && effect.isExpired('start')) ?? [];
        for (const effect of expirations) {
            await effect.expire();
        }
    }
    async _handleEndOfTurnExpirations() {
        if (!this.combatant || this.combatant.isDefeated)
            return;
        const expirations = this.combatant?.actor?.effects.filter((effect) => effect.isTemporary && effect.isExpired('end')) ?? [];
        for (const effect of expirations) {
            await effect.expire();
        }
    }
    async _playInitiativeSound() {
        if (!game.settings.get('swade', 'initiativeSound'))
            return;
        foundry.audio.AudioHelper.play(this.#initSoundData, true);
    }
    _playCombatSound(type) {
        if (this.turn === this.turns.length - 1 && type === 'nextUp')
            return; //skip if it's the last turn in the round
        this.#debouncedCombatSound(type);
    }
    async _nextRoundAsGM() {
        if (this.#roundAdvanceDialog)
            return;
        this.#roundAdvanceDialog = true; //set the flag
        //run the dialog
        const advance = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize('SWADE.Combat.AdvanceRoundTitle') },
            content: '<p>' + game.i18n.localize('SWADE.Combat.AdvanceRoundContent') + '</p>',
            rejectClose: false,
            classes: ['swade-app'],
        });
        this.#roundAdvanceDialog = false; //unset the flag
        if (!advance)
            return;
        //reset the deck if a joker had been drawn
        if (this.combatants.some((c) => c.hasJoker)) {
            await reshuffleActionDeck();
            ui.notifications.info('SWADE.DeckShuffled', { localize: true });
        }
        //reset the combatants
        await this.resetAll();
        //advance the round to the next one
        await super.nextRound();
        //no auto init, we're done;
        if (!this.automaticInitiative)
            return;
        // if automatic init is on we draw cards
        await this._promptAllPlayersForInitiative();
        //grab the NPCs, we're drawing them locally
        await this.rollNPC();
    }
    /** As a user emit a socket event that asks a Game master to trigger the next round workflow and roll the owned tokens */
    _nextRoundAsUser() {
        game.swade.sockets.newRound(this.id);
    }
    async _promptAllPlayersForInitiative() {
        const [localDraws, remoteDraws] = this.combatants
            .filter((c) => c.hasPlayerOwner &&
            !c.isNPC &&
            c.initiative === null &&
            (!c.group || c.isGroupLeader))
            .map((c) => {
            return { combatant: c, user: c.players[0] };
        })
            .sort((a, b) => a.user.name.localeCompare(b.user.name))
            .partition((v) => this._determineIfRemoteDraw(v.user, v.combatant));
        for (const { combatant } of localDraws) {
            await this.rollInitiative(combatant.id);
        }
        if (remoteDraws.length > 0) {
            await PlayerCardDrawHerder.asPromise({
                draws: remoteDraws,
                combatId: this.id,
            });
        }
    }
    _determineIfRemoteDraw(user, combatant) {
        if (!combatant.actor || !('initiative' in combatant.actor.system))
            return false;
        const initiative = combatant.actor.system.initiative;
        const edges = initiative.hasLevelHeaded ||
            initiative.hasImpLevelHeaded ||
            initiative.hasQuick;
        const groupOwner = !combatant.group || combatant.group.isOwner;
        return user.active && edges && groupOwner;
    }
    async _preDelete(options, user) {
        await super._preDelete(options, user);
        const jokerDrawn = this.combatants.some((c) => c.hasJoker);
        //reset the deck when combat is ended
        if (jokerDrawn) {
            await reshuffleActionDeck();
            ui.notifications.info('SWADE.DeckShuffled', { localize: true });
        }
        //remove the holding status from any combatants that have it
        await Promise.allSettled(this.combatants
            .filter((c) => c.actor?.statuses.has('holding') ?? false)
            .flatMap((c) => c.actor?.effects.filter((e) => e.statuses.has('holding')))
            .map((e) => e.delete()));
    }
}

class SwadeCombatant extends Combatant {
    static migrateData(data) {
        const flags = data.flags?.swade;
        if (flags) {
            const keys = [
                'suitValue',
                'cardValue',
                'cardString',
                'hasJoker',
                'roundHeld',
                'turnLost',
                'firstRound',
            ];
            data.system ??= {};
            for (const key of keys) {
                if (key in flags) {
                    data.system[key] = flags[key];
                    delete flags[key];
                }
            }
        }
        return super.migrateData(data);
    }
    get isIncapacitated() {
        return (this.actor &&
            'isIncapacitated' in this.actor.system &&
            this.actor.system.isIncapacitated);
    }
    get isDefeated() {
        if (!this.actor?.isWildcard) {
            return this.isIncapacitated || super.isDefeated;
        }
        return super.isDefeated;
    }
    get suitValue() {
        return this.system.suitValue;
    }
    async setCardValue(cardValue) {
        return this.update({ 'system.cardValue': cardValue });
    }
    get cardValue() {
        return this.system.cardValue;
    }
    async setSuitValue(suitValue) {
        return this.update({ 'system.suitValue': suitValue });
    }
    get cardString() {
        return this.system.cardString;
    }
    async setCardString(cardString) {
        return this.update({ 'system.cardString': cardString });
    }
    get hasJoker() {
        return !!this.system.hasJoker;
    }
    async setJoker(joker) {
        return this.update({ 'system.hasJoker': joker });
    }
    get isGroupLeader() {
        if (!this.group)
            return false;
        else {
            if (this.group.system?.leader)
                return this.group.system.leader === this.id;
            else
                return this.group.members?.first() === this;
        }
    }
    async setIsGroupLeader(groupLeader) {
        if (!this.group)
            return null;
        return this.group.update({ 'system.leader': groupLeader ? this.id : null });
    }
    async unsetIsGroupLeader() {
        return this.group?.update({ 'system.leader': null });
    }
    get roundHeld() {
        return this.system.roundHeld;
    }
    async setRoundHeld(roundHeld) {
        return this.update({ 'system.roundHeld': roundHeld });
    }
    get turnLost() {
        return !!this.system.turnLost;
    }
    async setTurnLost(turnLost) {
        return this.update({ 'system.turnLost': turnLost });
    }
    get cardsToDraw() {
        let cardsToDraw = 1;
        if (!!this.initiative && !this.roundHeld)
            return cardsToDraw;
        const actor = this.actor;
        if (!actor || !('initiative' in actor.system))
            return cardsToDraw;
        const initiative = actor.system.initiative;
        if (initiative?.hasLevelHeaded || initiative?.hasHesitant)
            cardsToDraw = 2;
        if (initiative?.hasImpLevelHeaded)
            cardsToDraw = 3;
        if (actor.type !== 'vehicle' && this.isIncapacitated)
            cardsToDraw = 1;
        return cardsToDraw;
    }
    async assignNewActionCard(cardId) {
        const combat = this.combat;
        if (!combat)
            return;
        //grab the action deck;
        const deck = game.cards.get(game.settings.get('swade', 'actionDeck'), {
            strict: true,
        });
        const card = deck.cards.get(cardId, { strict: true });
        const cardValue = card.value;
        const suitValue = card.system['suit'];
        const hasJoker = card.system['isJoker'];
        const cardString = card.description;
        //move the card to the discard pile, if its not drawn
        if (!card.drawn) {
            const discardPile = game.cards.get(game.settings.get('swade', 'actionDeckDiscardPile'), { strict: true });
            await card.discard(discardPile, { chatNotification: false });
        }
        //update the combatant with the new card
        const updates = new Array();
        const initiative = cardValue + suitValue / 10;
        updates.push({
            _id: this.id,
            initiative,
            system: { cardValue, suitValue, hasJoker, cardString },
        });
        await combat?.updateEmbeddedDocuments('Combatant', updates);
    }
    async toggleHold() {
        if (!this.parent)
            return;
        const data = getStatusEffectDataById('holding');
        if (!data)
            throw new Error('Could not find an effect with ID of "holding"');
        if (!this.roundHeld) {
            const round = Math.max(this.parent.round, 1);
            await Promise.all([
                this.setRoundHeld(round),
                this.actor?.toggleActiveEffect(data, { active: true }),
            ]);
        }
        else {
            await Promise.all([
                this.update({ 'system.-=roundHeld': null }),
                this.actor?.toggleActiveEffect(data, { active: false }),
            ]);
        }
        await this.parent.debounceSetup(); //hold icon wouldn't always clear
    }
    async toggleTurnLost() {
        if (!this.parent)
            return;
        const data = getStatusEffectDataById('holding');
        if (!data)
            throw new Error('Could not find an effect with ID of "holding"');
        if (!this.turnLost) {
            await this.update({
                system: {
                    turnLost: true,
                    '-=roundHeld': null,
                },
            });
            await this.actor?.toggleActiveEffect(data, { active: false });
        }
        else {
            await this.update({
                system: {
                    roundHeld: this.parent.round,
                    turnLost: false,
                },
            });
            await this.actor?.toggleActiveEffect(data, { active: false });
        }
    }
    async actNow() {
        if (!this.parent || !game.user?.isGM)
            return;
        const data = getStatusEffectDataById('holding');
        if (!data)
            throw new Error('Could not find an effect with ID of "holding"');
        let targetCombatant = this.parent.combatant;
        if (this.id === targetCombatant?.id) {
            targetCombatant = this.parent.turns.find((c) => !c.roundHeld);
        }
        const targetInitiative = targetCombatant?.initiative ?? 0;
        let initiative = targetInitiative + 0.0001;
        // Get the other turns that interrupted this target combatant
        const otherInterruptors = this.parent.turns.filter((t) => (t.initiative ?? 0) < targetInitiative + 1 &&
            (t.initiative ?? 0) > targetInitiative);
        for (const t of otherInterruptors) {
            // Decrement the initiative to be assigned by a tiny decimal value per other interruptor.
            if (Math.abs((t.initiative ?? 0) - initiative) < Number.EPSILON)
                initiative = (t.initiative ?? 0) - 0.000001;
        }
        await this.update({
            initiative,
            system: {
                cardValue: targetCombatant?.cardValue,
                suitValue: targetCombatant?.suitValue,
                cardString: '',
                '-=roundHeld': null,
            },
        });
        await this.actor?.toggleActiveEffect(data, { active: false });
        await this.parent.update({
            turn: this.parent.turns.findIndex((c) => c.id === this.id),
        });
        await this.parent.render(false);
    }
    async actAfterCurrentCombatant() {
        if (!this.parent || !game.user?.isGM)
            return;
        const data = getStatusEffectDataById('holding');
        if (!data)
            throw new Error('Could not find an effect with ID of "holding"');
        const currentCombatant = this.parent.combatant;
        await this.update({
            initiative: (currentCombatant?.initiative ?? 0) - 0.0001,
            system: {
                cardValue: currentCombatant?.cardValue,
                suitValue: currentCombatant?.suitValue,
                cardString: '',
                '-=roundHeld': null,
            },
        });
        await this.actor?.toggleActiveEffect(data, { active: false });
        await this.parent.update({
            turn: this.parent.turns.findIndex((c) => c.id === currentCombatant?.id),
        });
        await this.parent.render(false);
    }
    async _preCreate(data, options, user) {
        if (this.actor?.type === 'group') {
            Logger.warn('SWADE.Validation.NoGroupCombatants', {
                localize: true,
                toast: true,
            });
            return false;
        }
        const allowed = await super._preCreate(data, options, user);
        if (allowed === false)
            return false;
    }
}

/** @internal */
function registerEffectCallbacks() {
    const effectCallbacks = game.swade.effectCallbacks;
    effectCallbacks.set('shaken', removeShaken);
    effectCallbacks.set('stunned', removeStunned);
    effectCallbacks.set('bleeding-out', bleedOut);
    effectCallbacks.set('wild-attack', wildAttack);
}
async function wildAttack(effect) {
    const parent = effect.parent;
    if (!(parent instanceof SwadeActor))
        return;
    await parent.toggleActiveEffect('vulnerable');
    await effect.delete();
}
async function removeShaken(effect) {
    await new Promise((resolve) => {
        let roll = null;
        let processed = false;
        const buttons = [
            {
                action: 'roll',
                label: game.i18n.localize('SWADE.EffectCallbacks.Shaken.RollSpirit'),
                icon: '<i class="fas fa-dice"></i>',
                callback: async () => {
                    processed = true;
                    const parent = effect.parent;
                    if (!(parent instanceof SwadeActor) || parent?.type === 'vehicle') {
                        return;
                    }
                    const flavor = game.i18n.localize('SWADE.EffectCallbacks.Shaken.Flavor');
                    roll = await parent.rollAttribute('spirit', {
                        title: flavor,
                        flavour: flavor,
                        additionalMods: [
                            {
                                label: game.i18n.localize('SWADE.EffectCallbacks.Shaken.UnshakeModifier'),
                                value: parent.system.attributes.spirit.unShakeBonus,
                            },
                        ],
                    });
                    if ((roll?.successes ?? constants$1.ROLL_RESULT.FAIL) >=
                        constants$1.ROLL_RESULT.SUCCESS) {
                        await effect.delete();
                        ui.notifications.info('SWADE.EffectCallbacks.Shaken.Success', {
                            localize: true,
                        });
                    }
                    resolve(roll);
                },
            },
            {
                action: 'benny',
                label: game.i18n.localize('SWADE.BenniesSpend'),
                icon: '<i class="fas fa-coins"></i>',
                callback: async () => {
                    processed = true;
                    const parent = effect.parent;
                    if (!(parent instanceof SwadeActor))
                        return;
                    await parent?.spendBenny();
                    await effect.delete();
                    resolve(roll);
                },
            },
            {
                action: 'gmBenny',
                label: game.i18n.localize('SWADE.BenniesSpendGM'),
                icon: '<i class="fas fa-coins"></i>',
                callback: async () => {
                    processed = true;
                    const parent = effect.parent;
                    if (!(parent instanceof SwadeActor))
                        return;
                    await game.user?.spendBenny();
                    await effect.delete();
                    resolve(roll);
                },
            },
        ];
        if (!game.user?.isGM)
            buttons.pop();
        const content = game.i18n.localize('SWADE.EffectCallbacks.Shaken.Question');
        const data = {
            window: {
                title: game.i18n.format('SWADE.EffectCallbacks.Shaken.Title', {
                    name: effect.parent?.name,
                }),
            },
            content: `<p>${content}</p>`,
            buttons,
            default: 'roll',
            close: async () => {
                if (!processed) {
                    await effect.resetDuration();
                    resolve(roll);
                }
            },
            render: (_ev, dialog) => {
                const html = dialog.element;
                const button = html.querySelector('button[data-action="benny"]');
                const gmButton = html.querySelector('button[data-action="gmBenny"]');
                const gmHasNoBennies = game.user?.isGM && game.user.bennies <= 0;
                const characterHasNoBennies = effect.parent instanceof SwadeActor && effect.parent.bennies <= 0;
                if (characterHasNoBennies && button)
                    button.disabled = true;
                if (gmHasNoBennies && gmButton)
                    gmButton.disabled = true;
            },
            classes: ['dialog', 'dialog-buttons-column', 'swade-app'],
        };
        foundry.applications.api.DialogV2.wait(data);
    });
}
async function removeStunned(effect) {
    const parent = effect.parent;
    if (!(parent instanceof SwadeActor))
        return;
    const flavour = game.i18n.localize('SWADE.EffectCallbacks.Stunned.Title');
    const roll = await parent.rollAttribute('vigor', {
        title: flavour,
        flavour,
        additionalMods: [
            {
                label: game.i18n.localize('SWADE.EffectCallbacks.Stunned.UnStunModifier'),
                value: parent.system.attributes.vigor.unStunBonus,
            },
        ],
    });
    const result = roll?.successes ?? constants$1.ROLL_RESULT.FAIL;
    //no roll or failed
    if (result < constants$1.ROLL_RESULT.SUCCESS) {
        ui.notifications.info('SWADE.EffectCallbacks.Stunned.Fail', {
            localize: true,
        });
        return;
    }
    //normal success, still vulnerable
    if (result === constants$1.ROLL_RESULT.SUCCESS) {
        await effect.delete();
        ui.notifications.info('SWADE.EffectCallbacks.Stunned.Success', {
            localize: true,
        });
        return;
    }
    if (result >= constants$1.ROLL_RESULT.RAISE) {
        await effect.delete();
        ui.notifications.info('SWADE.EffectCallbacks.Stunned.Raise', {
            localize: true,
        });
        return;
    }
}
async function bleedOut(effect) {
    const parent = effect.parent;
    if (!(parent instanceof SwadeActor))
        return;
    const flavor = game.i18n.localize('SWADE.EffectCallbacks.BleedingOut.Title');
    const roll = await parent.rollAttribute('vigor', {
        title: flavor,
        flavour: flavor,
        additionalMods: [
            {
                label: game.i18n.localize('SWADE.EffectCallbacks.BleedingOut.BleedOutModifier'),
                value: parent.system.attributes.vigor.bleedOut.modifier,
            },
        ],
        ignoreWounds: parent.system.attributes.vigor.bleedOut.ignoreWounds,
    });
    const result = roll?.successes ?? constants$1.ROLL_RESULT.FAIL;
    //death
    if (result < constants$1.ROLL_RESULT.SUCCESS) {
        //delete existing temporary effects so that they don't interfere
        const toDelete = parent.effects
            .filter((e) => e.isTemporary)
            .map((e) => e.id);
        await parent.deleteEmbeddedDocuments('ActiveEffect', toDelete);
        //set overlay
        await parent.toggleActiveEffect(CONFIG.specialStatusEffects.DEFEATED, {
            overlay: true,
        });
        //mark combatant defeated in turn tracker
        const tokens = parent.getActiveTokens();
        const toUpdate = new Array();
        for (const token of tokens) {
            if (!token.combatant)
                continue;
            toUpdate.push({ _id: token.combatant.id, defeated: true });
        }
        if (toUpdate.length) {
            await game.combat?.updateEmbeddedDocuments('Combatant', toUpdate);
        }
        ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Fail', {
            localize: true,
        });
        return;
    }
    //hanging on
    if (result === constants$1.ROLL_RESULT.SUCCESS) {
        ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Success', {
            localize: true,
        });
        return;
    }
    //stabilizing
    if (result >= constants$1.ROLL_RESULT.RAISE) {
        await effect.delete();
        ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Raise', {
            localize: true,
        });
        return;
    }
}

/*****************************
 * General Utility Helpers
 *****************************/
function add(a, b) {
    const result = parseInt(a) + parseInt(b);
    return result.signedString();
}
function multiply(a, b) {
    return a * b;
}
function isEven(number) {
    return number % 2 === 0;
}
function isOdd(number) {
    return !isEven(number);
}
function signedString(num) {
    const result = parseInt(num);
    if (isNaN(result))
        return '';
    return result.signedString();
}
function rotate(number) {
    const rotationVal = (number % 5) + 2;
    if (rotationVal > 4)
        return 2;
    else
        return rotationVal;
}
function formatNumber(num) {
    return Math.round((num + Number.EPSILON) * 1000) / 1000;
}
function capitalize(str) {
    return str.capitalize();
}
function isEmpty(value) {
    return Handlebars.Utils.isEmpty(value);
}
function eachInMap(map, block) {
    let output = '';
    for (const [key, value] of map) {
        output += block.fn({ key, value });
    }
    return output;
}
function stringify(obj) {
    return JSON.stringify(Object.hasOwn(obj, 'toObject') ? obj.toObject() : obj, null, 2);
}
/** A replacement radioboxes helper that enables the use of numeric values */
function radioBoxes(name, choices, options) {
    const checked = options.hash['checked'] ?? null;
    const localize = options.hash['localize'] ?? false;
    let html = '';
    for (const key in choices) {
        let label = choices[key];
        if (localize)
            label = game.i18n.localize(label);
        const isNumeric = Number.isNumeric(key);
        const value = isNumeric ? Number(key) : key;
        const isChecked = checked === value;
        html += `<label class="checkbox"><input type="radio" name="${name}" value="${value}" ${isChecked ? 'checked' : ''} ${isNumeric ? 'data-dtype="Number"' : ''}> ${label}</label>`;
    }
    return new Handlebars.SafeString(html);
}
/*****************************
 * Helpers for sheets
 *****************************/
function collapsible(states, id) {
    const currentlyOpen = Boolean(states[id]);
    return currentlyOpen ? 'open' : '';
}
function localizeSkillAttribute(attribute, useShorthand = false) {
    if (!attribute)
        return '';
    return game.i18n.localize(useShorthand
        ? SWADE.attributes[attribute].short
        : SWADE.attributes[attribute].long);
}
function advanceType(type) {
    switch (type) {
        case constants$1.ADVANCE_TYPE.EDGE:
            return game.i18n.localize('SWADE.Advances.Types.Edge');
        case constants$1.ADVANCE_TYPE.SINGLE_SKILL:
            return game.i18n.localize('SWADE.Advances.Types.SingleSkill');
        case constants$1.ADVANCE_TYPE.TWO_SKILLS:
            return game.i18n.localize('SWADE.Advances.Types.TwoSkills');
        case constants$1.ADVANCE_TYPE.ATTRIBUTE:
            return game.i18n.localize('SWADE.Advances.Types.Attribute');
        case constants$1.ADVANCE_TYPE.HINDRANCE:
            return game.i18n.localize('SWADE.Advances.Types.Hindrance');
        default:
            return 'Unknown';
    }
}
function modifier(str) {
    str = str === '' || str === null ? '0' : str;
    const value = typeof str == 'string' ? parseInt(str) : str;
    return value == 0 ? '' : value > 0 ? ` + ${value}` : ` - ${-value}`;
}
function canBeEquipped(item) {
    return item['system']['equippable'] || item['system']['isVehicular'];
}
function displayEmbedded(array = []) {
    const collection = new Map(array);
    const entities = [];
    collection.forEach((val, key) => {
        const type = val.type === 'ability'
            ? game.i18n.localize('SWADE.SpecialAbility')
            : game.i18n.localize(`TYPES.Item.${val.type}`);
        let majorMinor = '';
        if (val.type === 'hindrance') {
            if (val.data.major) {
                majorMinor = game.i18n.localize('SWADE.Major');
            }
            else {
                majorMinor = game.i18n.localize('SWADE.Minor');
            }
        }
        entities.push(`<li class="flexrow">
          <img src="${val.img}" alt="${type}" class="effect-icon" />
          <span class="effect-label">${type} - ${val.name} ${majorMinor}</span>
          <span class="effect-controls">
            <a class="delete-embedded" data-Id="${key}">
              <i class="fas fa-trash"></i>
            </a>
          </span>
        </li>`);
    });
    return `<ul class="effects-list">${entities.join('\n')}</ul>`;
}
/*****************************
 * Combatant related Helpers
 *****************************/
function combatantColor(id) {
    const fallback = 'transparent';
    const c = game.combat?.combatants.get(id);
    if (!c)
        return fallback;
    if (c.groupId)
        return groupColor(c.groupId);
    else if (c.isDefeated)
        return '#fff';
    else
        return groupColor(id);
}
function groupColor(id) {
    const fallback = 'transparent';
    const c = game.combat?.combatants.get(id);
    if (!c)
        return fallback;
    const groupColor = c.getFlag('swade', 'groupColor');
    if (groupColor)
        return groupColor || fallback;
    if (c.players?.length) {
        return c.players[0].color;
    }
    else {
        return game.users.activeGM?.color;
    }
}
/*****************************
 * Embedded content related Helpers
 *****************************/
// This helper will take a system-formatted damage string and reformat it to the format used in the PEG sources.
// Right now this just removes the '@' and capitalizes and 'str' values
// aka @str+1d6 formats to Str+1d6
function formatDamage(damageStr) {
    return damageStr.replace('@', '').replace('str', 'Str');
}
// This helper will take in the locations property found on armor items and will return the list of locations that have armor values in a
// localized string formatted list for display
function formatArmorLocations(locations) {
    // Translate hit locations
    const armorLocations = [];
    const headLocation = game.i18n.localize('SWADE.Head');
    const torsoLocation = game.i18n.localize('SWADE.Torso');
    const armsLocation = game.i18n.localize('SWADE.Arms');
    const legsLocation = game.i18n.localize('SWADE.Legs');
    // Create an array of locations based on whether there are values there
    if (locations.head)
        armorLocations.push(headLocation);
    if (locations.torso)
        armorLocations.push(torsoLocation);
    if (locations.arms)
        armorLocations.push(armsLocation);
    if (locations.legs)
        armorLocations.push(legsLocation);
    // Use localized list formatting
    const formatter = game.i18n.getListFormatter({
        style: 'long',
        type: 'unit',
    });
    return formatter.format(armorLocations);
}
// This helper will take in the hindrance severity value and format it to an appropriate localized display if the value is 'either', otherwise just return
// the singular localization value represented
function formatHindranceSeverity(severity) {
    const minorSeverity = game.i18n.localize('SWADE.HindMinor');
    const majorSeverity = game.i18n.localize('SWADE.HindMajor');
    // If it's just minor or major, return their respective localizations.
    if (severity !== 'minor' && severity !== 'major' && severity !== 'either')
        return '';
    if (severity === 'minor')
        return minorSeverity;
    if (severity === 'major')
        return majorSeverity;
    // If it's 'either' then localize the list of both combined
    if (this.severity === 'either') {
        const formatter = game.i18n.getListFormatter({
            style: 'long',
            type: 'disjunction',
        });
        const severities = [minorSeverity, majorSeverity];
        return formatter.format(severities);
    }
}
/*****************************
 * Equipment related Helpers
 *****************************/
function equipStatus(state) {
    let icon = '';
    switch (state) {
        case constants$1.EQUIP_STATE.STORED:
            icon = '<i class="fas fa-archive"></i>';
            break;
        case constants$1.EQUIP_STATE.CARRIED:
            icon = '<i class="fas fa-shopping-bag"></i>';
            break;
        case constants$1.EQUIP_STATE.EQUIPPED:
            icon = '<i class="fas fa-tshirt"></i>';
            break;
        case constants$1.EQUIP_STATE.OFF_HAND:
            icon = '<i class="fas fa-hand-paper"></i>';
            break;
        case constants$1.EQUIP_STATE.MAIN_HAND:
            icon = '<i class="fas fa-hand-paper fa-flip-horizontal"></i>';
            break;
        case constants$1.EQUIP_STATE.TWO_HANDS:
            icon = '<i class="fas fa-sign-language"></i>';
            break;
    }
    return new Handlebars.SafeString(icon);
}
function equipStatusLabel(state) {
    const states = {
        [constants$1.EQUIP_STATE.STORED]: game.i18n.localize('SWADE.ItemEquipStatus.Stored'),
        [constants$1.EQUIP_STATE.CARRIED]: game.i18n.localize('SWADE.ItemEquipStatus.Carried'),
        [constants$1.EQUIP_STATE.OFF_HAND]: game.i18n.localize('SWADE.ItemEquipStatus.OffHand'),
        [constants$1.EQUIP_STATE.EQUIPPED]: game.i18n.localize('SWADE.ItemEquipStatus.Equipped'),
        [constants$1.EQUIP_STATE.MAIN_HAND]: game.i18n.localize('SWADE.ItemEquipStatus.MainHand'),
        [constants$1.EQUIP_STATE.TWO_HANDS]: game.i18n.localize('SWADE.ItemEquipStatus.TwoHands'),
    };
    return new Handlebars.SafeString(states[state]);
}
function prepareFormRendering(path, options) {
    const { classes, label, hint, rootId, stacked, units, widget, source, document, ...inputConfig } = options.hash;
    inputConfig.localize ??= true;
    const groupConfig = {
        label,
        hint,
        rootId,
        stacked,
        widget,
        localize: inputConfig.localize,
        units,
        classes: typeof classes === 'string' ? classes.split(' ') : [],
    };
    const doc = document ??
        options.data.root.item ??
        options.data.root.actor ??
        options.data.root.document;
    let field;
    if (path.startsWith('system') && 'system' in doc) {
        const splitPath = path.split('.');
        splitPath.shift();
        field = doc.system.schema.getField(splitPath.join('.'));
    }
    else {
        field = doc.schema.getField(path);
    }
    if (!('value' in inputConfig)) {
        inputConfig.value = foundry.utils.getProperty(source ? doc._source : doc, path);
    }
    return { field, inputConfig, groupConfig };
}
function formGroupSimple(path, options) {
    const { field, inputConfig, groupConfig } = prepareFormRendering(path.toString(), options);
    const group = field.toFormGroup(groupConfig, inputConfig);
    return new Handlebars.SafeString(group.outerHTML);
}
function formInputSimple(path, options) {
    const { field, inputConfig } = prepareFormRendering(path.toString(), options);
    const group = field.toInput(inputConfig);
    return new Handlebars.SafeString(group.outerHTML);
}
/** @internal */
function registerCustomHelpers() {
    Handlebars.registerHelper({
        readonly: (val) => (val ? 'readonly' : ''),
        add,
        multiply,
        signedString,
        isOdd,
        isEven,
        formatNumber,
        rotate,
        isEmpty,
        collapsible,
        stringify,
        radioBoxes,
        localizeSkillAttribute,
        advanceType,
        modifier,
        canBeEquipped,
        displayEmbedded,
        capitalize,
        combatantColor,
        eachInMap,
        equipStatus,
        equipStatusLabel,
        formGroupSimple,
        formInputSimple,
        formatDamage,
        formatArmorLocations,
        formatHindranceSeverity,
    });
}

function registerAuraHooks() {
    Hooks.on('canvasInit', () => {
        CONFIG.Canvas.auras = {
            collection: new foundry.utils.Collection(),
            filter: foundry.canvas.rendering.filters.VisualEffectsMaskingFilter.create({
                mode: foundry.canvas.rendering.filters.VisualEffectsMaskingFilter
                    .FILTER_MODES.BACKGROUND,
                visionTexture: canvas.masks.vision.renderTexture,
            }),
        };
        canvas.effects.auras = CONFIG.Canvas.auras.collection;
    });
    Hooks.on('drawGridLayer', (layer) => {
        layer.auras = layer.addChild(new PIXI.Container());
        layer.auras.filters = [CONFIG.Canvas.auras.filter];
        canvas.effects.visualEffectsMaskingFilters.add(CONFIG.Canvas.auras.filter);
    });
    Hooks.on('tearDownGridLayer', (_layer) => {
        canvas.effects.visualEffectsMaskingFilters.delete(CONFIG.Canvas.auras.filter);
    });
    Hooks.on('drawToken', (token) => {
        addAuras(token);
        updateAurasForToken(token);
    });
    Hooks.on('updateToken', (doc, changes) => {
        if (!doc.rendered)
            return;
        const keys = ['x', 'y', 'disposition'];
        if (keys.some((key) => foundry.utils.hasProperty(changes, key))) {
            updateAurasForToken(doc.object);
        }
    });
    Hooks.on('destroyToken', (token) => {
        token.auras.forEach((aura) => {
            aura._destroy();
            CONFIG.Canvas.auras.collection.delete(aura.sourceId);
        });
        token.auras.clear();
    });
    Hooks.on('updateActiveEffect', (effect) => {
        if (!game.canvas.ready)
            return;
        if (effect.changes.some((e) => e.key.startsWith('system.auras'))) {
            effect.actor?.getActiveTokens().forEach((t) => addAuras(t));
            updateAllAuras();
        }
    });
    Hooks.on('initializeLightSources', () => updateAllAuras());
    Hooks.on('controlToken', () => updateAllAuras());
    Hooks.on('hoverToken', () => updateAllAuras());
    Hooks.on('refreshToken', (token) => {
        game.settings.get('core', 'visionAnimation')
            ? updateAurasForToken(token)
            : refreshAuras();
    });
}
function addAuras(token) {
    if (!token.actor)
        return missingActorMsg(token);
    for (const id in token.actor.system.auras) {
        if (token.auras.has(id))
            continue;
        token.auras.set(id, new AuraPointSource({ object: token, id }));
    }
}
function updateAllAuras() {
    for (const token of canvas.tokens.placeables) {
        updateAurasForToken(token);
    }
}
function updateAurasForToken(token) {
    if (!token.actor) {
        Array.from(token.auras.entries()).forEach(([id, aura]) => {
            removeAura(token, aura, id);
        });
        return missingActorMsg(token);
    }
    const origin = token.getCenterPoint();
    const auraData = token.actor.system.auras;
    for (const [id, aura] of token.auras.entries()) {
        const data = auraData[id];
        if (!data) {
            removeAura(token, aura, id);
            continue;
        }
        const { externalRadius } = token;
        aura.initialize({
            x: origin.x,
            y: origin.y,
            disabled: !data.enabled,
            radius: canvas.dimensions?.size * data.radius + externalRadius,
            externalRadius: externalRadius,
            rotation: token.document.rotation,
            preview: token.isPreview,
            walls: data.walls,
        });
        aura.add();
        CONFIG.Canvas.auras.collection.set(aura.sourceId, aura);
    }
    refreshAuras();
}
function refreshAuras() {
    canvas.interface.grid?.auras?.removeChildren();
    for (const aura of CONFIG.Canvas.auras.collection) {
        if (!aura.active)
            continue;
        canvas.interface.grid?.auras?.addChild(aura.graphics);
    }
}
function removeAura(token, aura, id) {
    CONFIG.Canvas.auras.collection.delete(aura.sourceId);
    aura._destroy();
    token.auras.delete(id);
}
function missingActorMsg(token) {
    console.warn(`Token ${token.name} (${token.document.uuid}) has no actor!`);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2: ApplicationV2$3, HandlebarsApplicationMixin: HandlebarsApplicationMixin$4 } = foundry.applications.api;
class ActionCardEditor extends HandlebarsApplicationMixin$4(ApplicationV2$3) {
    constructor({ cards, ...options }) {
        super(options);
        this.#cards = cards;
    }
    #cards;
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE.ActionCardEditor',
            contentClasses: ['standard-form'],
        },
        position: {
            width: 600,
            height: 'auto',
        },
        classes: ['swade', 'action-card-editor', 'swade-application'],
        tag: 'form',
        form: {
            handler: ActionCardEditor.onSubmit,
            closeOnSubmit: false,
            submitOnClose: false,
        },
        actions: {
            addCard: ActionCardEditor.#onAddCard,
            showCard: ActionCardEditor.#onShowCard,
            deleteCard: ActionCardEditor.#onDeleteCard,
        },
    };
    static PARTS = {
        form: {
            template: 'systems/swade/templates/apps/action-card-editor.hbs',
            scrollable: ['.card-list'],
        },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    get id() {
        return `actionCardEditor-${this.cards.id}`;
    }
    get cards() {
        return this.#cards;
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            deckName: this.cards.name,
            cards: Array.from(this.cards.cards.values()).sort(this._sortCards),
            suitOptions: this.#getSuitOptions(),
            cardValues: this.#getCardValues(),
            buttons: [
                {
                    type: 'submit',
                    icon: 'fa-regular fa-save',
                    label: 'SETTINGS.Save',
                },
            ],
        });
        return context;
    }
    #getSuitOptions() {
        return {
            4: 'SWADE.Cards.Spades',
            3: 'SWADE.Cards.Hearts',
            2: 'SWADE.Cards.Diamonds',
            1: 'SWADE.Cards.Clubs',
            99: 'SWADE.Cards.Jokers',
        };
    }
    #getCardValues() {
        return {
            2: 'SWADE.Cards.Two',
            3: 'SWADE.Cards.Three',
            4: 'SWADE.Cards.Four',
            5: 'SWADE.Cards.Five',
            6: 'SWADE.Cards.Six',
            7: 'SWADE.Cards.Seven',
            8: 'SWADE.Cards.Eight',
            9: 'SWADE.Cards.Nine',
            10: 'SWADE.Cards.Ten',
            11: 'SWADE.Cards.Jack',
            12: 'SWADE.Cards.Queen',
            13: 'SWADE.Cards.King',
            14: 'SWADE.Cards.Ace',
            99: 'SWADE.Cards.RedJoker',
            98: 'SWADE.Cards.BlackJoker',
            97: 'SWADE.Cards.BlueJoker',
            96: 'SWADE.Cards.GreenJoker',
        };
    }
    static async onSubmit(_event, _form, formData) {
        const data = foundry.utils.expandObject(formData.object);
        const cards = Object.entries(data.card);
        const updates = new Array();
        for (const [id, value] of cards) {
            const newData = {
                name: value.name,
                faces: [
                    {
                        name: value.name,
                        img: value.img,
                    },
                ],
                value: value.cardValue,
                system: {
                    isJoker: value.suitValue > 90,
                    suit: value.suitValue,
                },
            };
            //grab the current card and diff it against the object we got from the form
            const current = this.cards.cards.get(id, { strict: true });
            const diff = foundry.utils.diffObject(current.toObject(), newData);
            //skip if there's no differences
            if (foundry.utils.isEmpty(diff))
                continue;
            //set the ID for the update
            diff['_id'] = id;
            updates.push(foundry.utils.flattenObject(diff));
        }
        await this.cards.updateEmbeddedDocuments('Card', updates);
        this.render({ force: true });
    }
    _sortCards(a, b) {
        const suitA = a.system['suit'];
        const suitB = b.system['suit'];
        const suit = suitB - suitA;
        if (suit !== 0)
            return suit;
        const cardA = a.value ?? 0;
        const cardB = b.value ?? 0;
        const card = cardB - cardA;
        return card;
    }
    static #onShowCard(_event, target) {
        const id = target.dataset.id;
        const card = this.cards.cards.get(id);
        if (!card)
            return;
        new foundry.applications.apps.ImagePopout({
            src: card.currentFace?.img,
        }).render({ force: true });
    }
    static async #onAddCard(_event, _target) {
        const newCard = await CONFIG.Card.documentClass.create({
            name: game.i18n.format('DOCUMENT.New', {
                type: game.i18n.localize('DOCUMENT.Card'),
            }),
            type: 'poker',
            faces: [
                {
                    img: 'systems/swade/assets/ui/ace-white.svg',
                    name: 'New Card',
                },
            ],
            face: 0,
            origin: this.cards.id,
        }, { parent: this.cards });
        if (newCard) {
            await this.render({ force: true });
            this.element.querySelector('.card-list')?.scrollIntoView(false);
        }
    }
    static async #onDeleteCard(_event, target) {
        const card = this.cards.cards.get(target.dataset.id);
        if (!card)
            return;
        const text = game.i18n.format('SWADE.DeleteEmbeddedCardPrompt', {
            card: card.name,
        });
        await foundry.applications.api.DialogV2.confirm({
            content: `<p class="text-center">${text}</p>`,
            classes: ['dialog', 'swade-app'],
            yes: {
                callback: async () => {
                    await card.delete();
                    this.render({ force: true });
                },
            },
        });
    }
}

const { createFormGroup, createNumberInput, createSelectInput } = foundry.applications.fields;
async function layoutChase(deck) {
    // Now requires CCM
    const ccmModule = game.modules.get('complete-card-management');
    if (!ccmModule) {
        return ui.notifications.error('SWADE.NoCCMInstall', { localize: true });
    }
    else if (!ccmModule.active) {
        return ui.notifications.error('SWADE.NoCCMActive', { localize: true });
    }
    //return if no canvas or scene is available
    if (!canvas || !canvas.ready || !canvas.scene) {
        return ui.notifications.warn('SWADE.NoSceneAvailable', { localize: true });
    }
    if (!deck || deck.type !== 'deck') {
        return ui.notifications.warn('SWADE.ChaseNoDeck', { localize: true });
    }
    const layout = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.innerText = game.i18n.localize('SWADE.ChaseLayout');
    layout.prepend(legend);
    const rowInput = createNumberInput({
        name: 'rows',
        min: 1,
        max: 54,
        step: 1,
        value: 1,
    });
    const rows = createFormGroup({
        input: rowInput,
        label: game.i18n.localize('SWADE.ChaseRows'),
    });
    const columnInput = createNumberInput({
        name: 'columns',
        min: 1,
        max: 54,
        step: 1,
        value: 9,
    });
    const columns = createFormGroup({
        input: columnInput,
        label: game.i18n.localize('SWADE.ChaseColumns'),
    });
    const discardOptions = game.cards.reduce((acc, stack) => {
        if (stack.type === 'pile')
            acc.push({ value: stack.id, label: stack.name });
        return acc;
    }, []);
    const discardInput = createSelectInput({
        name: 'to',
        options: discardOptions,
    });
    const discard = createFormGroup({
        input: discardInput,
        label: game.i18n.localize('SWADE.ChaseDiscard'),
    });
    layout.append(rows, columns, discard);
    const gridConfig = await foundry.applications.api.DialogV2.prompt({
        window: {
            title: 'SWADE.SetUpChase',
            contentClasses: ['standard-form'],
        },
        content: layout.outerHTML,
        ok: {
            callback: async (_event, button, _dialog) => ({
                from: deck,
                to: game.cards.get(button.form?.elements['to'].value),
                rows: button.form?.elements['rows'].value,
                columns: button.form?.elements['columns'].value,
            }),
        },
        rejectClose: false,
    });
    if (!gridConfig)
        return;
    try {
        await ccm.api.grid(gridConfig);
    }
    catch (error) {
        ui.notifications.warn('SWADE.ChaseLayoutError', { localize: true });
    }
    // TODO: Integrate CCM with Types so this is properly typed
    canvas['cards'].activate();
}

/* eslint-disable @typescript-eslint/naming-convention */
class MigrationCounter {
    #current = 0;
    #max = 0;
    constructor(max) {
        this.#max = max;
        SceneNavigation.displayProgressBar({ label: 'Migrating', pct: 0 });
    }
    increment() {
        this.#current += 1;
        const pct = this.#current / this.#max;
        SceneNavigation.displayProgressBar({
            label: 'Migration',
            pct: Math.round(pct * 100),
        });
    }
    reset(max) {
        if (max)
            this.#max = max;
        this.#current = 0;
    }
}

async function triggerServersideMigration(pack) {
    if (!game.user?.isGM)
        throw new Error();
    const collection = pack.collection;
    Logger.debug(`Beginning migration for Compendium pack ${collection}, please be patient.`);
    await SocketInterface.dispatch('manageCompendium', {
        type: collection,
        action: 'migrate',
        data: collection,
    });
    Logger.debug(`Successfully migrated Compendium pack ${collection}.`);
    return pack;
}

async function migrateWorld() {
    const version = game.system.version;
    Logger.info(`Applying SWADE System Migration for version ${version}. Please be patient and do not close your game or shut down your server.`, { permanent: true, toast: true });
    // Gather the World Actors/Items to migrate
    const actors = game
        .actors.map((a) => [a, true])
        .concat(Array.from(game.actors.invalidDocumentIds).map((id) => [
        game.actors.getInvalid(id),
        false,
    ]));
    const items = game
        .items.map((i) => [i, true])
        .concat(Array.from(game.items.invalidDocumentIds).map((id) => [
        game.items.getInvalid(id),
        false,
    ]));
    const packs = game.packs.filter((p) => ['Actor', 'Item', 'Scene'].includes(p.documentName));
    const counter = new MigrationCounter(items.length +
        actors.length +
        packs.length +
        game.scenes.size +
        game.users.size);
    // Migrate World Actors
    for (const [actor, valid] of actors) {
        try {
            await dedupeActorActiveEffects(actor);
            await _migratePTModifiers(actor);
            const source = valid
                ? actor.toObject()
                : game.data.actors?.find((a) => a._id === actor.id);
            const updateData = migrateActorData(source);
            if (!foundry.utils.isEmpty(updateData)) {
                console.log(`Migrating Actor document ${actor.name}`);
                await actor.update(updateData, { enforceTypes: false, diff: valid });
            }
        }
        catch (err) {
            err.message = `Failed swade system migration for Actor ${actor.name}: ${err.message}`;
            console.error(err);
        }
        finally {
            counter.increment();
        }
    }
    // Migrate World Items
    for (const [item, valid] of items) {
        try {
            const source = valid
                ? item.toObject()
                : game.data.items?.find((i) => i._id === item.id);
            const updateData = migrateItemData(source);
            if (!foundry.utils.isEmpty(updateData)) {
                console.log(`Migrating Item document ${item.name}`);
                await item.update(updateData, { enforceTypes: false, diff: valid });
            }
        }
        catch (err) {
            err.message = `Failed swade system migration for Item ${item.name}: ${err.message}`;
            console.error(err);
        }
        finally {
            counter.increment();
        }
    }
    // Migrate Actor Override Tokens
    for (const scene of game.scenes) {
        try {
            for (const token of scene.tokens) {
                token.delta._createSyntheticActor({ reinitializeCollections: true });
                if (token.actorLink)
                    continue; //skip linked tokens as they are already handled by the world actor migration
                const actor = token.actor;
                await dedupeActorActiveEffects(actor);
                await _migratePTModifiers(actor);
                const updateData = migrateActorData(actor?.toObject());
                if (foundry.utils.isEmpty(updateData))
                    continue;
                await actor?.update(updateData);
            }
            const updateData = migrateSceneData(scene);
            if (!foundry.utils.isEmpty(updateData)) {
                console.log(`Migrating Scene document ${scene.name}`);
                await scene.update(updateData, { enforceTypes: false });
                // If we do not do this, then synthetic token actors remain in cache
                // with the un-updated actorData.
                for (const token of scene.tokens.filter((t) => !t.actorLink)) {
                    token.delta._createSyntheticActor({ reinitializeCollections: true });
                }
            }
        }
        catch (err) {
            err.message = `Failed swade system migration for Scene ${scene.name}: ${err.message}`;
            console.error(err);
        }
        finally {
            counter.increment();
        }
    }
    // Migrate users
    for (const user of game.users) {
        try {
            const updateData = migrateUser(user);
            if (!foundry.utils.isEmpty(updateData)) {
                Logger.info(`Migrating User document ${user.name}`);
                await user.update(updateData, { enforceTypes: false });
            }
        }
        catch (err) {
            err.message = `Failed swade system migration for user ${user.name}: ${err.message}`;
            Logger.error(err);
        }
        finally {
            counter.increment();
        }
    }
    // Migrate Compendium Packs
    for (const pack of packs) {
        await migrateCompendium(pack);
        counter.increment();
    }
    // Set the migration as complete
    await game.settings.set('swade', 'systemMigrationVersion', version);
    Logger.info(`SWADE System Migration to version ${version} completed!`, {
        permanent: true,
        toast: true,
    });
}
/* -------------------------------------------- */
/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack The compendium to migrate. Only Actor, Item or Scene compendiums are processed
 */
async function migrateCompendium(pack) {
    const documentName = pack.documentName;
    if (!['Actor', 'Item', 'Scene'].includes(documentName))
        return;
    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });
    // Begin by requesting server-side data model migration and get the migrated content
    await triggerServersideMigration(pack);
    const documents = await pack.getDocuments();
    // Iterate over compendium entries - applying fine-tuned migration functions
    for (const doc of documents) {
        let updateData = {};
        try {
            switch (documentName) {
                case 'Actor':
                    await dedupeActorActiveEffects(doc);
                    await _migratePTModifiers(doc);
                    updateData = migrateActorData(doc.toObject());
                    break;
                case 'Item':
                    updateData = migrateItemData(doc.toObject());
                    break;
                case 'Scene':
                    updateData = migrateSceneData(doc.toObject());
                    break;
            }
            // Save the entry, if data was changed
            if (foundry.utils.isEmpty(updateData))
                continue;
            await doc.update(updateData);
            Logger.debug(`Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`);
        }
        catch (err) {
            // Handle migration failures
            err.message = `Failed swade system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
            Logger.error(err);
        }
    }
    // Apply the original locked status for the pack
    await pack.configure({ locked: wasLocked });
    Logger.debug(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
}
/* -------------------------------------------- */
function migrateUser(user) {
    const updateData = {};
    _migrateWildDieFlag(user, updateData);
    return updateData;
}
/* -------------------------------------------- */
/**
 * Migrate any active effects attached to the provided parent.
 * @param {object} parent           Data of the parent being migrated.
 * @returns {object[]}              Updates to apply on the embedded effects.
 */
function migrateEffects(parent) {
    if (!parent.effects)
        return {};
    return parent.effects.reduce((arr, e) => {
        const effectData = e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
        const effectUpdate = migrateEffectData(effectData);
        if (!foundry.utils.isEmpty(effectUpdate)) {
            effectUpdate._id = effectData._id;
            arr.push(foundry.utils.expandObject(effectUpdate));
        }
        return arr;
    }, []);
}
/* -------------------------------------------- */
/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */
/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
function migrateActorData(actor) {
    const updateData = {};
    // Actor Data Updates
    _migrateVehicleOperator(actor, updateData);
    _migrateGeneralPowerPoints(actor, updateData);
    // Migrate embedded effects
    if (actor.effects) {
        const effects = migrateEffects(actor);
        if (effects.length > 0)
            updateData.effects = effects;
    }
    // Migrate Owned Items
    if (!actor.items)
        return updateData;
    const items = actor.items.reduce((arr, i) => {
        // Migrate the Owned Item
        const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
        const itemUpdate = migrateItemData(itemData);
        // Update the Owned Item
        if (!foundry.utils.isEmpty(itemUpdate)) {
            itemUpdate._id = i._id;
            arr.push(foundry.utils.expandObject(itemUpdate));
        }
        return arr;
    }, new Array());
    if (items.length > 0)
        updateData.items = items;
    return updateData;
}
/* -------------------------------------------- */
/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {object} item             Item data to migrate
 * @returns {object}                The updateData to apply
 */
function migrateItemData(item) {
    const updateData = {};
    _migrateWeaponAPToNumber(item, updateData);
    _migratePowerEquipToFavorite(item, updateData);
    _migrateItemEquipState(item, updateData);
    _migrateWeaponAutoReload(item, updateData);
    _ensureBatteryMaxCharges(item, updateData);
    _fixWorldItemGrants(item, updateData);
    _generateSWID(item, updateData);
    _setRangeType(item, updateData);
    // Migrate embedded effects
    if (item.effects) {
        const effects = migrateEffects(item);
        if (effects.length > 0)
            updateData.effects = effects;
    }
    return updateData;
}
/* -------------------------------------------- */
/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
function migrateSceneData(_scene) {
    const updateData = {};
    return updateData;
}
/* -------------------------------------------- */
/**
 * Migrate the provided active effect data.
 * @param {object} _effect           Effect data to migrate.
 * @returns {object}                The updateData to apply.
 */
function migrateEffectData(_effect) {
    const updateData = {};
    _effect.changes.forEach((c) => {
        if (c.key === 'system.stats.parry.modifier')
            c.key = 'system.stats.parry.value';
        if (c.key === 'system.stats.toughness.modifier')
            c.key = 'system.stats.toughness.value';
    });
    updateData.changes = _effect.changes;
    return updateData;
}
/* -------------------------------------------- */
/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
function removeDeprecatedObjects(data) {
    for (const [k, v] of Object.entries(data)) {
        if (getType(v) === 'Object') {
            if (v['_deprecated'] === true) {
                Logger.info(`Deleting deprecated object key ${k}`);
                delete data[k];
            }
            else
                removeDeprecatedObjects(v);
        }
    }
    return data;
}
async function dedupeActorActiveEffects(actor) {
    const toDelete = new Array();
    const filteredEffects = actor.appliedEffects.filter((e) => e.parent instanceof SwadeItem);
    for (const effect of filteredEffects) {
        actor.effects
            .filter((e) => e.name === effect.name)
            .forEach((e) => {
            const parentId = effect.parent.id;
            if (e.origin.includes('.Item.' + parentId))
                toDelete.push(e.id);
        });
    }
    await actor.deleteEmbeddedDocuments('ActiveEffect', toDelete);
}
async function _migratePTModifiers(actor) {
    if (actor.system instanceof VehicleData)
        return;
    const parryModifier = actor._source.system.stats.parry.modifier ?? 0;
    const toughModifier = actor._source.system.stats.toughness.modifier ?? 0;
    const effects = new Array();
    const updateData = {};
    if (parryModifier) {
        updateData['system.stats.parry.modifier'] = 0;
        effects.push({
            name: game.i18n.localize('SWADE.Addi') +
                ' ' +
                game.i18n.localize('SWADE.Parry'),
            changes: [
                {
                    key: 'system.stats.parry.value',
                    value: parryModifier,
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    priority: null,
                },
            ],
            description: 'Created by 3.1 Migration',
        });
    }
    if (toughModifier) {
        updateData['system.stats.toughness.modifier'] = 0;
        effects.push({
            name: game.i18n.localize('SWADE.Addi') +
                ' ' +
                game.i18n.localize('SWADE.Tough'),
            changes: [
                {
                    key: 'system.stats.toughness.value',
                    value: toughModifier,
                    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                    priority: null,
                },
            ],
            description: 'Created by 3.1 Migration',
        });
    }
    if (effects.length > 0) {
        actor.createEmbeddedDocuments('ActiveEffect', effects);
        actor.updateSource(updateData);
    }
}
function _migrateVehicleOperator(data, updateData) {
    if (data.type !== 'vehicle')
        return updateData;
    const driverId = data.system.driver?.id;
    const hasOldID = !!driverId && driverId.split('.').length === 1;
    if (hasOldID) {
        updateData['system.driver.id'] = `Actor.${driverId}`;
    }
    return updateData;
}
function _migrateGeneralPowerPoints(data, updateData) {
    if (data.type === 'vehicle')
        return updateData;
    const isOld = foundry.utils.hasProperty(data, 'system.powerPoints.value') &&
        foundry.utils.hasProperty(data, 'system.powerPoints.max');
    if (!isOld)
        return updateData;
    //migrate basic PP
    const powerPoints = data.system.powerPoints;
    updateData['system.powerPoints.general.value'] = powerPoints.value;
    updateData['system.powerPoints.general.max'] = powerPoints.max;
    updateData['system.powerPoints.-=max'] = null;
    updateData['system.powerPoints.-=value'] = null;
    //migrate prototype Token
    if (data.prototypeToken.bar1.attribute === 'powerPoints') {
        updateData['prototypeToken.bar1.attribute'] = 'powerPoints.general';
    }
    if (data.prototypeToken.bar2.attribute === 'powerPoints') {
        updateData['prototypeToken.bar2.attribute'] = 'powerPoints.general';
    }
    //check the active effects
    const effects = new Array();
    for (const effect of data.effects) {
        const changes = new Array();
        for (const change of effect.changes) {
            if (change.key === 'system.powerPoints.value') {
                changes.push({
                    ...change,
                    key: 'system.powerPoints.general.value',
                });
            }
            if (change.key === 'system.powerPoints.max') {
                changes.push({
                    ...change,
                    key: 'system.powerPoints.general.max',
                });
            }
        }
        if (changes.length > 0) {
            effects.push({ _id: effect._id, changes: changes });
        }
    }
    if (effects.length > 0)
        updateData.effects = effects;
}
function _migrateWeaponAPToNumber(data, updateData) {
    if (data.type !== 'weapon')
        return updateData;
    if (data.system.ap && typeof data.system.ap === 'string') {
        updateData['system.ap'] = Number(data.system.ap);
    }
}
function _migratePowerEquipToFavorite(data, updateData) {
    if (data.type !== 'power')
        return updateData;
    const isOld = foundry.utils.hasProperty(data, 'system.equipped');
    if (isOld) {
        updateData['system.favorite'] = foundry.utils.getProperty(data, 'system.equipped');
        updateData['system.-=equipped'] = null;
        updateData['system.-=equippable'] = null;
    }
}
function _migrateItemEquipState(data, updateData) {
    if (data.type !== 'armor' &&
        data.type !== 'weapon' &&
        data.type !== 'shield' &&
        data.type !== 'gear') {
        return;
    }
    const isOld = foundry.utils.hasProperty(data, 'system.equipped');
    if (!isOld)
        return;
    updateData['system.-=equipped'] = null;
    if (data.type === 'weapon') {
        updateData['system.equipStatus'] = data.system.equipped
            ? constants$1.EQUIP_STATE.MAIN_HAND
            : constants$1.EQUIP_STATE.CARRIED;
    }
    else {
        updateData['system.equipStatus'] = data.system.equipped
            ? constants$1.EQUIP_STATE.EQUIPPED
            : constants$1.EQUIP_STATE.CARRIED;
    }
    return updateData;
}
function _migrateWildDieFlag(user, updateData) {
    const dsnWildDie = user?.getFlag('swade', 'dsnWildDie');
    const isOld = dsnWildDie === 'none';
    if (!isOld)
        return;
    updateData['flags.swade'] = {
        '-=dsnWildDie': null,
        dsnWildDiePreset: 'none',
    };
    return updateData;
}
function _migrateWeaponAutoReload(data, updateData) {
    if (data.type !== 'weapon')
        return;
    const hasOld = foundry.utils.hasProperty(data, 'system.autoReload');
    if (!hasOld)
        return;
    const autoReload = data.system.autoReload;
    updateData['system.reloadType'] = autoReload
        ? constants$1.RELOAD_TYPE.NONE
        : constants$1.RELOAD_TYPE.FULL;
    //remove the old property
    updateData['system.-=autoReload'] = null;
}
function _ensureBatteryMaxCharges(data, updateData) {
    if (data.type !== 'consumable')
        return;
    if (data.system.subtype === constants$1.CONSUMABLE_TYPE.BATTERY) {
        updateData['system.charges.max'] = 100;
    }
}
function _fixWorldItemGrants(data, updateData) {
    if (!data.system.grants)
        return;
    updateData['system.grants'] = structuredClone(data.system.grants);
    for (const grant of updateData['system.grants']) {
        if (grant.uuid.startsWith('Item.Item.')) {
            const newUUID = grant.uuid.split('.');
            newUUID.shift(); //discard the first part
            grant.uuid = newUUID.join('.');
        }
    }
}
function _generateSWID(data, updateData) {
    if (data.system.swid === constants$1.RESERVED_SWID.DEFAULT) {
        updateData['system.swid'] = slugify(data.name);
    }
}
function _setRangeType(data, updateData) {
    if (data.type !== 'weapon' || data.system.rangeType !== null)
        return;
    const hasShots = !!data.system.shots;
    const hasRange = !!data.system.range;
    const reload = data.system.reloadType;
    let rangeType;
    if (!hasShots && !hasRange) {
        rangeType = constants$1.WEAPON_RANGE_TYPE.MELEE;
    }
    else if (hasShots && hasRange) {
        if (reload === constants$1.RELOAD_TYPE.SELF) {
            rangeType = constants$1.WEAPON_RANGE_TYPE.MIXED;
        }
        else {
            rangeType = constants$1.WEAPON_RANGE_TYPE.RANGED;
        }
    }
    else {
        rangeType = constants$1.WEAPON_RANGE_TYPE.MIXED;
    }
    updateData['system.rangeType'] = rangeType;
}

var migrations = /*#__PURE__*/Object.freeze({
    __proto__: null,
    dedupeActorActiveEffects: dedupeActorActiveEffects,
    migrateActorData: migrateActorData,
    migrateCompendium: migrateCompendium,
    migrateEffectData: migrateEffectData,
    migrateEffects: migrateEffects,
    migrateItemData: migrateItemData,
    migrateSceneData: migrateSceneData,
    migrateUser: migrateUser,
    migrateWorld: migrateWorld,
    removeDeprecatedObjects: removeDeprecatedObjects
});

/** This plugin is used when dropping a TableResult onto a editor to give the user a choice between
 * creating a content link or instead grabbing the TableResult and inserting the content.
 */
class ProseMirrorTableResultDropFillerPlugin extends ProseMirror.ProseMirrorPlugin {
    static build(schema, options = {}) {
        const plugin = new ProseMirrorTableResultDropFillerPlugin(schema, options);
        return new ProseMirror.Plugin({
            props: { handleDrop: plugin._onDrop.bind(plugin) },
        });
    }
    _onDrop(view, event, _slice, moved) {
        //Bail early if the slice has just been moved
        if (moved)
            return;
        // Get the drag data.
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        if (!data.type)
            return;
        fromUuid(data.uuid).then((doc) => {
            if (doc instanceof TableResult &&
                doc.type === CONST.TABLE_RESULT_TYPES.TEXT) {
                this.#handleFill(view, doc, pos);
            }
            else {
                this.#handleCreateContentLink(view, data, pos);
            }
        });
        // Return true to indicate the drop event should be consumed.
        event.stopPropagation();
        return true;
    }
    async #handleCreateContentLink(view, data, pos) {
        const options = {};
        const selection = view.state.selection;
        if (!selection.empty) {
            const content = selection.content().content;
            options.label = content.textBetween(0, content.size);
        }
        const link = await foundry.applications.ux.TextEditor.implementation.getContentLink(data, options);
        if (!link)
            return;
        const tr = view.state.tr;
        if (selection.empty && pos)
            tr.insertText(link, pos.pos);
        else
            tr.replaceSelectionWith(this.schema.text(link));
        view.dispatch(tr);
        // Focusing immediately only seems to work in Chrome. In Firefox we must yield execution before attempting to
        // focus, otherwise the cursor becomes invisible until the user manually unfocuses and refocuses.
        setTimeout(view.focus.bind(view), 0);
    }
    async #handleFill(view, result, pos) {
        const textRaw = result.text;
        const selection = view.state.selection;
        if (!selection.empty) {
            const content = selection.content().content;
            content.textBetween(0, content.size);
        }
        const tr = view.state.tr;
        const newNodes = this.#transformText(textRaw);
        const firstNode = view.state.doc.content.child(0);
        if (firstNode.type.name === 'paragraph' && firstNode.content.size < 1) {
            tr.delete(0, 0);
            tr.insert(0, newNodes);
        }
        else if (selection.empty && pos) {
            tr.insert(pos.pos, newNodes);
        }
        else {
            tr.replaceSelectionWith(newNodes);
        }
        view.dispatch(tr);
        // Focusing immediately only seems to work in Chrome. In Firefox we must yield execution before attempting to
        // focus, otherwise the cursor becomes invisible until the user manually unfocuses and refocuses.
        setTimeout(view.focus.bind(view), 0);
    }
    #transformText(text) {
        return ProseMirror.dom.parseString(text, this.schema);
    }
}

/**
 * Thanks goes out to lebombjames and the starfinder system on whose code this is based
 */
/**
 * Pull actor and token art from module.json files, which will replace default images on compendium actors and their
 * prototype tokens.
 *
 *
 * Examples of valid maps
 *
 *  "some.pack-name": {
 *    "someId": {
 *      "actor": "some/path/to/an/image.webp",
 *      "token": {
 *        "img": "some/path/to/an/image.webp",
 *        "scale": 2
 *      }
 *    },
 *    "someOtherId": {
 *      "actor": "some/other/path/to/an/image.webp",
 *      "token": some/other/path/to/an/image.webp"
 *      }
 *    }
 *  }
 *
 */
async function registerCompendiumArt() {
    game.swade.compendiumArt.map.clear(); // Clear any existing map
    const modules = [...game.modules.entries()].filter(([_key, m]) => m.active); // Get a list of active modules
    for (const [id, module] of modules) {
        const mappingFlag = foundry.utils.getProperty(module, `flags.${id}.swade-art`);
        const moduleArt = await getArtMap(mappingFlag); // Get maps from any active modules
        if (!moduleArt)
            continue;
        for (const [packName, art] of Object.entries(moduleArt)) {
            const pack = game.packs.get(packName);
            if (!pack) {
                Logger.warn(`Failed pack lookup from module art registration (${id}): ${packName}`);
                continue;
            }
            const index = pack.indexed ? pack.index : await pack.getIndex();
            for (const [actorId, paths] of Object.entries(art)) {
                const record = index.get(actorId); // Find the current actor in the index
                if (!record)
                    continue;
                record.img = paths.actor; // Set the actor's art in the index, which is used by compendium windows
                game.swade.compendiumArt.map.set(`Compendium.${packName}.${actorId}`, paths); // Push the actor ID and art to the map
            }
        }
    }
}
/**
 *
 * @param {object|string|null} art Either an art mapping object, or a file path to a JSON.
 * @returns {object|null} An art object, or null
 */
async function getArtMap(art) {
    if (!art) {
        return null;
    }
    else if (isArtMappingObject(art)) {
        return art;
    }
    else if (typeof art === 'string') {
        // Instead of being in a module.json file, the art map is in a separate JSON file referenced by path
        try {
            const response = (await foundry.utils.fetchJsonWithTimeout(art));
            if (!response) {
                Logger.warn(`Failed loading art mapping file at ${art}`);
                return null;
            }
            return isArtMappingObject(response) ? response : null;
        }
        catch (error) {
            if (error instanceof Error) {
                Logger.warn(error.message);
            }
        }
    }
    return null;
}
/**
 *
 * @param {object} record An art object
 * @returns {boolean} Whether the object is a valid compendium art object or not
 */
function isArtMappingObject(record) {
    return (isObject(record) && // Ensure the map is an object
        Object.values(record).every((packToArt) => isObject(packToArt) && // Ensure each entry is an object with a pack name
            Object.values(packToArt).every((art) => (isObject(art) && // Ensure each within the pack object is an object with an actor ID
                typeof art.actor === 'string') || // Within an actor object, there must be an actor string, which is a file path
                (isObject(art.token) &&
                    typeof art.token.img === 'string' &&
                    typeof art.token === 'string' && // token can be a file path, or an object containing the file path and the token scale
                    (art.token.scale === undefined ||
                        typeof art.token.scale === 'number')))));
}

async function setupWorld() {
    await setupActionDeck();
    await setupDiscardPile();
}
async function setupActionDeck() {
    //check the action deck
    const actionDeckId = game.settings.get('swade', 'actionDeck');
    const actionDeck = game.cards?.get(actionDeckId);
    //return early if both the deck and the ID exist in the world
    if (actionDeckId && actionDeck)
        return;
    ui.notifications.info('SWADE.NoActionDeckFound', { localize: true });
    const preset = CONFIG.Cards.presets.actionDeck;
    const data = await foundry.utils.fetchJsonWithTimeout(preset.src);
    const cardsCls = getDocumentClass('Cards');
    const newActionDeck = await cardsCls.create(data);
    await game.settings.set('swade', 'actionDeck', newActionDeck?.id);
    await newActionDeck?.shuffle({ chatNotification: false });
}
async function setupDiscardPile() {
    //check the action deck discard pile
    const discardPileId = game.settings.get('swade', 'actionDeckDiscardPile');
    const discardPile = game.cards?.get(discardPileId);
    //return early if both the discard pile and the ID exist in the world
    if (discardPileId && discardPile)
        return;
    ui.notifications.info('SWADE.NoActionDeckDiscardPileFound', {
        localize: true,
    });
    const cardsCls = getDocumentClass('Cards');
    const newDiscardPile = await cardsCls.create({
        name: 'Action Cards Discard Pile',
        type: 'pile',
    });
    await game.settings.set('swade', 'actionDeckDiscardPile', newDiscardPile?.id);
}

class PlayerBennyDisplay {
    element;
    player;
    counter;
    get bennies() {
        if (this.player.isGM) {
            return this.player.getFlag('swade', 'bennies') ?? 0;
        }
        else if (this.player.character) {
            return this.player.character.bennies;
        }
        else {
            return 'X';
        }
    }
    constructor(element) {
        //Gather the data
        const userId = element.dataset.userId;
        const player = game.users.get(userId, { strict: true });
        //return early if there's not actually anything to display
        if (!player.isGM && !player.character)
            return;
        this.element = element;
        this.player = player;
        this.#initialize();
    }
    #initialize() {
        //Create counter
        this.counter = document.createElement('span');
        this.counter.classList.add('bennies-count');
        this.counter.addEventListener('mouseleave', this.updateBennyCount.bind(this));
        this.counter.addEventListener('mouseover', this.onMouseOver.bind(this));
        if (game.user?.isGM) {
            this._initGameMaster();
        }
        else {
            this.#initPlayer();
        }
        //append the counter to the player list
        this.element.append(this.counter);
    }
    /** GM interactive interface */
    _initGameMaster() {
        this.counter.classList.add('bennies-gm');
        this.counter.innerHTML = this.bennies.toString();
        const callback = this.player.isGM ? this.onSpendBenny : this.onGiveBenny;
        this.counter.addEventListener('click', callback.bind(this));
        this.counter.title = this.player.isGM
            ? game.i18n.localize('SWADE.BenniesSpend')
            : game.i18n.localize('SWADE.BenniesGive');
    }
    /** Player view */
    #initPlayer() {
        this.counter.innerHTML = this.bennies.toString();
        if (this.player.character && game.userId === this.player.id) {
            this.counter.addEventListener('click', this.onSpendBenny.bind(this));
            this.counter.title = game.i18n.localize('SWADE.BenniesSpend');
        }
    }
    updateBennyCount(ev) {
        ev?.preventDefault();
        this.counter.innerHTML = this.bennies.toString();
    }
    onMouseOver() {
        if (game.user?.isGM && this.player.character) {
            this.counter.innerHTML = this.player.isGM ? '-' : '+';
        }
        else if (this.player.character && game.userId === this.player.id) {
            this.counter.innerHTML = '-';
        }
    }
    async onGiveBenny(ev) {
        ev?.preventDefault();
        await this.player.getBenny();
        this.updateBennyCount(ev);
    }
    async onSpendBenny(ev) {
        ev?.preventDefault();
        await this.player.spendBenny();
        this.updateBennyCount(ev);
    }
    static async refreshAll() {
        for (const user of game.users.values()) {
            await user.refreshBennies(false);
        }
        const npcWildcardsToRefresh = game.actors.filter((a) => a.type === 'npc' && a.isWildcard);
        const hardChoices = game.settings.get('swade', 'hardChoices');
        for (const actor of npcWildcardsToRefresh) {
            if (hardChoices)
                await actor.update({ 'system.bennies.value': 0 });
            else
                await actor.refreshBennies(false);
        }
        if (game.settings.get('swade', 'notifyBennies')) {
            const message = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.refreshAll, {});
            CONFIG.ChatMessage.documentClass.create({
                content: message,
            });
        }
        ui.players?.render(true);
    }
}

class UserSummary {
    element;
    player;
    user;
    get userIsGM() {
        return this.user.isGM;
    }
    constructor(element) {
        //Gather the data
        const userId = element.dataset.userId;
        const user = game.users.get(userId, { strict: true });
        //return early if there's not actually anything to display
        if (!user.isGM && !user.character)
            return;
        this.element = element;
        this.user = user;
        this.player = element.querySelector('.player-name');
        this.#initialize();
    }
    #initialize() {
        this.player.removeAttribute('data-tooltip');
        this.player.addEventListener('mouseenter', this.#onMouseEnter.bind(this));
        this.player.addEventListener('mouseleave', () => game.tooltip.deactivate());
    }
    async #onMouseEnter(event) {
        const userId = event.target.closest('[data-user-id]')?.dataset.userId;
        const user = game.users.get(userId, { strict: true });
        const actor = user.character;
        let text = '';
        if (game.user?.isGM && user.isGM) {
            //GM hovering GM
            text = this.#getGmText();
        }
        else if (actor?.permission > CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
            //Player hovering Player
            text = this.#getUserText(actor);
        }
        else {
            return;
        }
        game.tooltip.activate(event.target, {
            html: text,
            cssClass: 'swade-user-summary themed theme-dark',
        });
    }
    #getFullUsername() {
        const charName = this.user.character?.name;
        const suffix = this.user.isGM ? 'GM' : charName;
        return `${this.user.name} [${suffix}]`;
    }
    #getUserText(actor) {
        const html = `
    <h4 class="header">{{name}}</h4>
    <h5>{{localize "SWADE.Hindrances"}}</h5>
    <ul>
      {{#each hindrances}}
        <li>{{name}} {{#if system.isMajor}}{{localize "SWADE.Major"}}{{else}}{{localize "SWADE.Minor"}}{{/if}}</li>
      {{/each}}
    </ul>`;
        const template = Handlebars.compile(html);
        const data = {
            name: this.#getFullUsername(),
            hindrances: actor.itemTypes.hindrance,
        };
        return template(data, {
            allowProtoMethodsByDefault: true,
            allowProtoPropertiesByDefault: true,
        });
    }
    #getGmText() {
        const html = `
    <h4 class="noborder">{{localize "SWADE.NpcWildCardsOnScene"}}</h4>
    {{#each wildcards}}
      {{#if tokens}}
        <h5 class="header">{{localize i18n}}</h5>
          <ul>
          {{#each tokens}}
            <li>{{name}}: {{localize "SWADE.BenniesCount" count=actor.system.bennies.value}}</li>
          {{/each}}
          </ul>
      {{/if}}
    {{/each}}`;
        const template = Handlebars.compile(html);
        const data = {
            name: this.#getFullUsername(),
            wildcards: this.#getWildCardList(),
        };
        return template(data, {
            allowProtoMethodsByDefault: true,
            allowProtoPropertiesByDefault: true,
        });
    }
    #getWildCardList() {
        const wildcards = [
            { i18n: 'TOKEN.DISPOSITION.SECRET', tokens: [] },
            { i18n: 'TOKEN.DISPOSITION.HOSTILE', tokens: [] },
            { i18n: 'TOKEN.DISPOSITION.NEUTRAL', tokens: [] },
            { i18n: 'TOKEN.DISPOSITION.FRIENDLY', tokens: [] },
        ];
        const tokens = game.scenes?.viewed?.tokens?.contents ?? [];
        tokens
            .filter((t) => !t.actor.hasPlayerOwner && t.actor.isWildcard)
            .forEach((t) => {
            //disposition goes from -2 (secret) to 1 (friendly) so we add 2 to line it up with the array index
            const disposition = t['disposition'] + 2;
            wildcards[disposition].tokens.push(t);
        });
        return wildcards;
    }
}

const attributes = new Set(Object.keys(SWADE.attributes));
async function onHotbarDrop(_hotbar, data, slot) {
    if (data.type === 'Item')
        return onDropItem(data, slot);
    if (data.type === 'Attribute')
        return onDropAttribute(data, slot);
}
async function onDropItem(data, slot) {
    const item = (await fromUuid(data.uuid));
    if (!item)
        return;
    // Create the macro command
    const macro = await CONFIG.Macro.documentClass.create({
        name: item.name,
        img: item.img,
        type: CONST.MACRO_TYPES.SCRIPT,
        command: `game.swade.rollItemMacro("${item?.name}");`,
    });
    await game.user?.assignHotbarMacro(macro, slot);
}
async function onDropAttribute(data, slot) {
    const attribute = data.attribute;
    // Create the macro command
    const macro = await CONFIG.Macro.documentClass.create({
        name: SWADE.attributes[attribute].long,
        img: 'systems/swade/assets/icons/attribute.svg',
        type: CONST.MACRO_TYPES.SCRIPT,
        command: `game.swade.rollItemMacro("${attribute}");`,
    });
    await game.user?.assignHotbarMacro(macro, slot);
}
/**
 * A simple function to allow quick access to an item such as a skill or weapon. Skills are rolled while other items are posted to the chat as a chatcard
 * @param identifier the name of the item that should be called
 */
function rollItemMacro(identifier) {
    const speaker = ChatMessage.getSpeaker();
    let actor = undefined;
    if (speaker.token)
        actor = game.actors?.tokens[speaker.token];
    if (!actor && speaker.actor)
        actor = game.actors?.get(speaker.actor);
    if (!actor?.isOwner)
        return null;
    if (attributes.has(identifier)) {
        return onRollAttribute(actor, identifier);
    }
    return onRollItem(actor, identifier);
}
async function onRollItem(actor, identifier) {
    const item = actor.items.getName(identifier);
    if (!item) {
        return ui.notifications.warn(`Your controlled Actor does not have an item named ${identifier}`);
    }
    //Roll the skill
    if (item.type === 'skill') {
        return item.roll();
    }
    else {
        // Show the item
        return item.show();
    }
}
function onRollAttribute(actor, attribute) {
    return actor.rollAttribute(attribute);
}

/** Hook callbacks for core hooks surrounding system setup and functionality */
class SwadeCoreHooks {
    static onSetup() {
        registerCompendiumArt();
        // Improve discoverability of map notes
        game.settings.settings.get('core.notesDisplayToggle').default = true;
    }
    static async onReady() {
        //set up the compendium tables of content
        for (const pack of game.packs) {
            const isRightType = ['Actor', 'Item', 'JournalEntry'].includes(pack.metadata.type);
            const tocBlockList = game.settings.get('swade', 'tocBlockList');
            const isBlocked = tocBlockList[pack.collection];
            if (isRightType && !isBlocked) {
                // @ts-expect-error The type check isn't properly narrowing
                pack.apps = [new CompendiumTOC({ collection: pack })];
            }
        }
        SWADE.diceConfig.flags = {
            dsnShowBennyAnimation: {
                type: Boolean,
                default: true,
                label: game.i18n.localize('SWADE.ShowBennyAnimation'),
                hint: game.i18n.localize('SWADE.ShowBennyAnimationDesc'),
            },
            dsnWildDiePreset: {
                type: String,
                default: 'none',
                label: game.i18n.localize('SWADE.WildDiePreset'),
                hint: game.i18n.localize('SWADE.WildDiePresetDesc'),
            },
            dsnWildDie: {
                type: String,
                default: 'none',
                label: game.i18n.localize('SWADE.WildDieTheme'),
                hint: game.i18n.localize('SWADE.WildDieThemeDesc'),
            },
            dsnCustomWildDieColors: {
                type: Object,
                default: {
                    labelColor: '#000000',
                    diceColor: game.user?.color,
                    outlineColor: game.user?.color,
                    edgeColor: game.user?.color,
                },
            },
            dsnCustomWildDieOptions: {
                type: Object,
                default: {
                    font: 'auto',
                    material: 'auto',
                    texture: 'none',
                },
            },
        };
        //setup world and do migrations
        if (game.user?.isGM) {
            //set up the world if needed
            await setupWorld();
            // Determine whether a system migration is required and feasible
            const currentVersion = game.settings.get('swade', 'systemMigrationVersion');
            //TODO Adjust this version every time a migration needs to be triggered
            const needsMigrationVersion = '3.2.3';
            //Minimal compatible version needed for the migration
            const compatibleMigrationVersion = '3.0.0';
            //If the needed migration version is newer than the old migration version then migrate the world
            const needsMigration = foundry.utils.isNewerVersion(needsMigrationVersion, currentVersion);
            if (needsMigration) {
                // Perform the migration
                if (currentVersion !== '0.0.0' &&
                    !foundry.utils.isNewerVersion(currentVersion, compatibleMigrationVersion)) {
                    Logger.warn('SWADE.SysMigrationWarning', {
                        toast: true,
                        permanent: true,
                        localize: true,
                    });
                }
                await migrateWorld();
            }
        }
        // set the system as ready
        game.swade.ready = true;
        /**
         * @category Hooks
         * This hook is called once swade is done setting up itself
         */
        Hooks.callAll('swadeReady');
    }
    static onI18nInit() {
        //localize the ranks
        SWADE.ranks = SWADE.ranks.map((rank) => game.i18n.localize(rank));
        //localize the scales
        SWADE.scales = SWADE.scales.map((scale) => game.i18n.localize(scale));
        //localize the prototype modifiers
        for (const group of SWADE.prototypeRollGroups) {
            group.name = game.i18n.localize(group.name);
            for (const modifier of group.modifiers) {
                modifier.label = game.i18n.localize(modifier.label);
            }
        }
        //set the localized parry skill
        [CONFIG.statusEffects, SWADE.statusEffects].forEach((arr) => {
            const proneParryModifier = arr
                .find((e) => e.id === 'prone')
                ?.changes?.find((c) => c.key?.startsWith('@Skill'));
            if (proneParryModifier) {
                proneParryModifier.key = `@Skill{${game.settings.get('swade', 'parryBaseSkill')}}[system.die.modifier]`;
            }
        });
        //localize the Attributes
        for (const attribute in SWADE.attributes) {
            const { long, short } = SWADE.attributes[attribute];
            SWADE.attributes[attribute] = {
                long: game.i18n.localize(long),
                short: game.i18n.localize(short),
            };
        }
    }
    static onRenderActorDirectory(app, html, _data) {
        // Mark all Wildcards in the Actors sidebars with an icon
        const entries = html.querySelectorAll('.directory-item.entry.actor');
        const wildcards = app.collection.filter((a) => a.isWildcard && a.type === 'character');
        //if the player is not a GM, then don't mark the NPC wildcards
        if (!game.settings.get('swade', 'hideNPCWildcards') || game.user?.isGM) {
            const npcWildcards = app.collection.filter((a) => a.isWildcard && a.type === 'npc');
            wildcards.push(...npcWildcards);
        }
        entries.forEach((element) => {
            const actorID = element.dataset.entryId;
            if (!actorID)
                return;
            const isWildcard = !!wildcards.find((a) => a.id === actorID);
            if (!isWildcard)
                return;
            const thumbnail = element.querySelector('.thumbnail');
            thumbnail?.insertAdjacentHTML('afterend', '<img class="wildcard-icon">');
        });
    }
    static onRenderSettings(app, html) {
        //get system info
        const systemInfo = html.querySelector('.info div.system');
        //create system links
        const systemLinks = document.createElement('div');
        systemLinks.classList.add('system-links');
        const links = [
            {
                label: game.i18n.localize('SWADE.SystemLinks.ReportAnIssue'),
                url: 'https://gitlab.com/peginc/swade/-/issues/new',
            },
            {
                label: game.i18n.localize('SWADE.SystemLinks.Changelog'),
                url: game.system.changelog,
            },
            {
                label: game.i18n.localize('SWADE.SystemLinks.Wiki'),
                click: (_ev) => game.packs.get('swade.system-docs')?.render(true),
            },
        ];
        //insert links links
        links.forEach((link) => {
            const anchor = document.createElement('a');
            anchor.innerText = link.label;
            if (link.url) {
                anchor.href = link.url;
            }
            if (link.click) {
                anchor.addEventListener('click', link.click);
            }
            systemLinks.append(anchor);
        });
        systemInfo.after(systemLinks);
    }
    static async onGetActorContextOptions(app, options) {
        const newOptions = [];
        // Don't want to add to context menu for compendium entries
        if (app instanceof foundry.applications.sidebar.apps.Compendium)
            return;
        // Invoke character summarizer on selected character
        newOptions.push({
            name: 'SWADE.ShowCharacterSummary',
            icon: '<i class="fa-solid fa-users"></i>',
            callback: (li) => {
                const actor = game.actors.get(li.dataset.entryId, { strict: true });
                CharacterSummarizer.summarizeCharacters([actor]);
            },
            condition: (li) => {
                const actor = game.actors.get(li.dataset.entryId, { strict: true });
                return (actor.permission > CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED &&
                    CharacterSummarizer.isSupportedActorType(actor));
            },
        });
        options.splice(0, 0, ...newOptions);
    }
    static onRenderCompendiumDirectory(app, html, _data, _options) {
        const tocBlockList = game.settings.get('swade', 'tocBlockList');
        for (const li of html.querySelectorAll('li.directory-item')) {
            const pack = li.dataset.pack;
            const statusIcons = li.querySelector('.status-icons');
            if (tocBlockList[pack]) {
                const template = document.createElement('template');
                template.innerHTML = '<i class="fa-solid fa-align-slash"></i>';
                statusIcons.prepend(template.content.firstChild);
            }
        }
    }
    static async onRenderCompendium(app, html, _data, _options) {
        //don't mark if the user is not a GM
        if (game.settings.get('swade', 'hideNPCWildcards') && !game.user?.isGM)
            return;
        //Mark Wildcards in the compendium
        if (app.documentName === 'Actor') {
            //@ts-expect-error collection is now a CompendiumCollection
            const content = await app.collection.getIndex('system.wildcard');
            const ids = content
                .filter((a) => (a.type === 'character' ||
                foundry.utils.getProperty(a, 'system.wildcard')) &&
                a.name !== '#[CF_tempEntity]')
                .map((actor) => actor._id);
            const found = html.querySelectorAll('.directory-item');
            found.forEach((el) => {
                const id = el.dataset.entryId;
                if (ids.includes(id)) {
                    const name = el.children[1];
                    name.insertAdjacentHTML('afterbegin', '<img class="wildcard-icon">');
                }
            });
        }
    }
    static onGetCardsContextOptions(app, options) {
        // Don't want to add to context menu for compendium entries
        if (app instanceof foundry.applications.sidebar.apps.Compendium)
            return;
        const actionCardEditor = {
            name: 'SWADE.OpenACEditor',
            icon: '<i class="fa-solid fa-edit"></i>',
            condition: (li) => {
                const deck = game.cards.get(li.dataset.entryId, { strict: true });
                return (deck.type === 'deck' &&
                    deck.isOwner &&
                    deck.cards.contents.every((c) => c.type === 'poker'));
            },
            callback: async (li) => {
                const deck = game.cards.get(li.dataset.entryId, { strict: true });
                new ActionCardEditor({ cards: deck }).render({ force: true });
            },
        };
        const chaseLayout = {
            name: 'SWADE.LayOutChaseWithDeck',
            icon: '<i class="fa-solid fa-shipping-fast"></i>',
            condition: (li) => {
                //return early if there's no canvas or scene to lay out cards
                if (!canvas || !canvas.ready || !canvas.scene)
                    return false;
                const cardsID = li.dataset.entryId;
                const deck = game.cards.get(cardsID, { strict: true });
                const isActionDeck = game.settings.get('swade', 'actionDeck') === cardsID;
                return (deck.type === 'deck' &&
                    !isActionDeck &&
                    deck.cards.contents.every((c) => c.type === 'poker'));
            },
            callback: (li) => {
                const deck = game.cards.get(li.dataset.entryId, { strict: true });
                layoutChase(deck);
            },
        };
        const setActionDeck = {
            name: 'SWADE.SetActionDeck',
            icon: '<i class="fas fa-swords"></i>',
            condition: (li) => {
                const cardsID = li.dataset.entryId;
                const deck = game.cards.get(cardsID, { strict: true });
                const isActionDeck = game.settings.get('swade', 'actionDeck') === cardsID;
                return (deck.type === 'deck' &&
                    !isActionDeck &&
                    deck.cards.contents.every((c) => c.type === 'poker'));
            },
            callback: async (li) => {
                const deckId = li.dataset.entryId;
                game.settings.set('swade', 'actionDeck', deckId);
            },
        };
        options.push(actionCardEditor, chaseLayout, setActionDeck);
    }
    static onGetCompendiumContextOptions(app, options) {
        options.push({
            name: 'SWADE.CompendiumTOC.Toggle',
            icon: '<i class="fa-solid fa-book"></i>',
            condition: (li) => {
                const pack = game.packs.get(li.dataset.pack, { strict: true });
                const rightType = CompendiumTOC.ALLOWED_TYPES.includes(pack.metadata.type);
                return !!game.user?.isGM && rightType;
            },
            callback: async (li) => {
                const confirmation = await foundry.applications.api.DialogV2.confirm({
                    window: {
                        title: game.i18n.localize('SWADE.CompendiumTOC.Dialog.Title'),
                    },
                    content: `<p>${game.i18n.localize('SWADE.CompendiumTOC.Dialog.Content')}</p>`,
                    defaultYes: false,
                });
                if (!confirmation)
                    return;
                const tocBlockList = game.settings.get('swade', 'tocBlockList');
                const packId = li.dataset.pack;
                const isCurrentlyBlocked = tocBlockList[packId] ?? false;
                Logger.debug(`Toggling ${packId} to ${!isCurrentlyBlocked}`);
                //set the new value
                tocBlockList[packId] = !isCurrentlyBlocked;
                await game.settings.set('swade', 'tocBlockList', tocBlockList);
                //reload all clients to load the new settings.
                if (game.user?.isGM)
                    game.socket?.emit('reload');
                foundry.utils.debouncedReload();
            },
        }, {
            name: 'SWADE.MigrateCompendium',
            icon: '<i class="fa-solid fa-right-left"></i>',
            condition: (li) => {
                const pack = game.packs.get(li.dataset.pack, { strict: true });
                const isRightPackType = ['Actor', 'Item', 'Scene'].includes(pack.metadata.type);
                return !!game.user?.isGM && isRightPackType;
            },
            callback: async (li) => await migrateCompendium(game.packs.get(li.dataset.pack, { strict: true })),
        });
    }
    /** Add roll data to the message for formatting of dice pools*/
    static onRenderChatMessageHTML(msg, html, _data) {
        const makeTableResultsDraggable = () => {
            const results = html.querySelectorAll('.table-draw .table-result');
            if (!results.length)
                return;
            results.forEach((e) => {
                e.draggable = true;
                e.addEventListener('dragstart', (ev) => {
                    const dragData = game.tables
                        ?.get(msg.getFlag('core', 'RollTable') ?? '')
                        ?.results.get(e.dataset.resultId)
                        .toDragData();
                    if (!dragData)
                        return;
                    ev.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
                });
            });
        };
        if (msg.getFlag('core', 'RollTable') && msg.rolls) {
            makeTableResultsDraggable();
        }
    }
    static async onUpdateCombat(_document, _change, _options, _userId) {
        ui.combat.scrollToTurn();
    }
    /** Change current GM Bennies count */
    static async onUserConnected(user, connected) {
        const gm = game.users.activeGM;
        const hasStaticBennies = game.settings.get('swade', 'staticGmBennies');
        if (user.isGM || hasStaticBennies || !gm?.isSelf)
            return false;
        const newBennies = connected ? gm.bennies + 1 : gm.bennies - 1;
        await gm.setFlag('swade', 'bennies', newBennies);
        ui.players?.render({ force: true });
    }
    /** Add benny management to the player list */
    static async onRenderPlayers(_list, html, _options) {
        const users = html.querySelectorAll('.player');
        //add the Benny Display;
        users.forEach((el) => new PlayerBennyDisplay(el));
        users.forEach((el) => new UserSummary(el));
    }
    static onRenderUserConfig(app, html, data) {
        // resize the element so it'll fit the new stuff
        html.style.height = 'auto';
        //get possible
        const possibleCardsDocs = game.cards.filter((c) => c.type === 'hand' &&
            c.permission === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
        const form = html.querySelector('.standard-form');
        const footer = html.querySelector('.form-footer');
        if (!form || !footer)
            return;
        //return early to avoid double rendering
        if (html.querySelector('div.swade-favorite-cards'))
            return;
        const userConfigLabel = game.i18n.localize('SWADE.Keybindings.OpenFavoriteCards.UserConfigLabel');
        const options = possibleCardsDocs.map((c) => {
            const favoriteCards = game.user?.getFlag('swade', 'favoriteCardsDoc');
            const sel = c.id === favoriteCards ? 'selected' : '';
            return `<option value="${c.id}" ${sel}>${c.name}</option>`;
        });
        const template = `
    <fieldset>
      <legend>${userConfigLabel}</legend>
      <div class="form-group stacked swade-favorite-cards">
        <select name="flags.swade.favoriteCardsDoc">
        <option value="">${game.i18n.localize('SWADE.Keybindings.OpenFavoriteCards.HandNone')}</option>
        ${options.join('\n')}
        </select>
      </div>
    </fieldset>
    `;
        form.insertBefore(stringToHTML(template), footer);
    }
    static onHotbarDrop(_hotbar, data, slot) {
        if (data.type === 'Item' || data.type === 'Attribute') {
            onHotbarDrop(_hotbar, data, slot);
            return false;
        }
    }
    static onGetUserContextOptions(app, context) {
        const players = app.element;
        if (!players)
            return;
        context.push({
            name: game.i18n.localize('SWADE.BenniesGive'),
            icon: '<i class="fa-solid fa-plus"></i>',
            condition: (li) => game.user.isGM && game.users?.get(li.dataset.userId).isGM,
            callback: async (li) => {
                const selectedUser = game.users?.get(li.dataset.userId);
                await selectedUser.setFlag('swade', 'bennies', (selectedUser.getFlag('swade', 'bennies') ?? 0) + 1);
                ui.players?.render({ force: true });
                if (game.settings.get('swade', 'notifyBennies')) {
                    //In case one GM gives another GM a benny a different message should be displayed
                    const givenEvent = selectedUser !== game.user;
                    createGmBennyAddMessage(selectedUser, givenEvent);
                }
            },
        }, {
            name: game.i18n.localize('SWADE.BenniesRefresh'),
            icon: '<i class="fa-solid fa-sync"></i>',
            condition: () => game.user.isGM,
            callback: (li) => game.users?.get(li.dataset.userId)?.refreshBennies(),
        }, {
            name: game.i18n.localize('SWADE.AllBenniesRefresh'),
            icon: '<i class="fa-solid fa-sync"></i>',
            condition: () => game.user.isGM,
            callback: () => PlayerBennyDisplay.refreshAll(),
        }, {
            name: game.i18n.localize('SWADE.BenniesAdjustGM'),
            icon: '<i class="fa-solid fa-coins"></i>',
            condition: (li) => game.user.isGM && game.users?.get(li.dataset.userId).isGM,
            callback: async (li) => {
                const gm = game.users?.get(li.dataset.userId);
                const hasStaticBennies = game.settings.get('swade', 'staticGmBennies');
                const gmBennies = hasStaticBennies
                    ? game.settings.get('swade', 'gmBennies')
                    : game.users.filter((u) => u.active && !u.isGM).length;
                await foundry.applications.api.DialogV2.wait({
                    window: { title: game.i18n.localize('SWADE.BenniesAdjustGM') },
                    position: {
                        left: ui.players.element.offsetLeft,
                        top: ui.players.element.offsetTop - 183,
                    },
                    content: `
                <p>${game.i18n.localize('SWADE.BenniesAdjustGMText')}</p>
                <label
                  style="display: block; width: max-content;"
                  for"gm-bennies">
                  ${game.i18n.localize('SWADE.Bennies')}:
                  <input
                    id="gm-bennies"
                    type="number"
                    min="0"
                    style="width: 5ch; height: .75lh; text-align: center;"
                    name="gm-bennies"
                    value="${gmBennies}"
                    autofocus
                  >
                </label>
            `,
                    buttons: [
                        {
                            action: 'cancel',
                            label: game.i18n.localize('SWADE.Cancel'),
                        },
                        {
                            action: 'submit',
                            label: game.i18n.localize('SWADE.ButtonSubmit'),
                            default: true,
                            callback: async (_event, button, _dialog) => await gm?.setFlag('swade', 'bennies', Number(button.form.elements['gm-bennies'].value)),
                        },
                    ],
                });
            },
        });
    }
    // TODO: Properly type this
    static onGetSceneControlButtons(sceneControlButtons) {
        //get the measured template tools
        const measure = sceneControlButtons.templates;
        //add buttons
        const numTools = Object.keys(measure.tools).length;
        const newTemplateButtons = SWADE.measuredTemplatePresets.map((t, i) => ({
            ...t.button,
            order: numTools + i,
        }));
        measure.tools.clear.order = numTools + newTemplateButtons.length;
        foundry.utils.mergeObject(measure.tools, newTemplateButtons.reduce((acc, t) => ({ ...acc, [t.name]: t }), {}));
    }
    static async onRenderCombatantConfig(app, html, options) {
        // resize the element so it'll fit the new stuff
        html.style.height = 'auto';
        //remove the old initiative input
        html
            .querySelector('input[name="initiative"]')
            ?.closest('div.form-group')
            ?.remove();
        //grab cards and sort them
        const deck = game.cards.get(game.settings.get('swade', 'actionDeck'), {
            strict: true,
        });
        const cards = Array.from(deck.cards.values()).sort((a, b) => {
            const cardA = a.value;
            const cardB = b.value;
            const card = cardA - cardB;
            if (card !== 0)
                return card;
            const suitA = a.system['suit'];
            const suitB = b.system['suit'];
            const suit = suitA - suitB;
            return suit;
        });
        //prep list of cards for selection
        const cardList = new Array();
        for (const card of cards) {
            const cardValue = card.value;
            const suitValue = card.system['suit'];
            const color = suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
            const isDealt = options.document.cardValue === cardValue &&
                options.document.suitValue === suitValue;
            const isAvailable = card?.drawn ? 'text-decoration: line-through;' : '';
            cardList.push({
                id: card.id,
                isDealt,
                color,
                isAvailable,
                name: card.name,
                cardString: card.description,
                isJoker: card.system['isJoker'],
            });
        }
        const numberOfJokers = cards.filter((card) => card.system['isJoker']).length;
        //render and inject new HTML
        const path = 'systems/swade/templates/combatant-config-cardlist.hbs';
        const elementTemplate = document.createElement('template');
        elementTemplate.innerHTML =
            await foundry.applications.handlebars.renderTemplate(path, {
                cardList,
                numberOfJokers,
            });
        html.querySelector('footer')?.before(...elementTemplate.content.children);
        //Attach click event to button which will call the combatant update as we can't easily modify the submit function of the FormApplication
        html
            .querySelector('footer button')
            ?.addEventListener('click', async (ev) => {
            const selectedCard = ev.currentTarget
                .closest('.combatant-config')
                ?.querySelector('input[name=action-card]:checked');
            if (!selectedCard)
                return;
            const cardId = selectedCard.dataset.cardId;
            await app.document.assignNewActionCard(cardId);
        });
    }
    static onRenderActiveEffectConfig(app, html) {
        const effect = app.document;
        if (effect.system instanceof BaseEffectData) {
            const systemSchema = effect.system.schema;
            const conditionalGroup = systemSchema.fields.conditionalEffect.toFormGroup({ localize: true }, { value: effect.system.conditionalEffect, disabled: !app.isEditable });
            const expirationOptions = [
                {
                    label: 'SWADE.Expiration.BeginAuto',
                    value: String(constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto),
                },
                {
                    label: 'SWADE.Expiration.BeginPrompt',
                    value: String(constants$1.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt),
                },
                {
                    label: 'SWADE.Expiration.EndAuto',
                    value: String(constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto),
                },
                {
                    label: 'SWADE.Expiration.EndPrompt',
                    value: String(constants$1.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt),
                },
            ];
            const expirationGroup = systemSchema.fields.expiration.toFormGroup({ localize: true }, {
                options: expirationOptions,
                localize: true,
                value: effect.system.expiration,
                blank: 'SWADE.Expiration.None',
                disabled: !app.isEditable,
                dataset: { dtype: 'Number' }, // necessary in v12, can be removed in v13
            });
            const loseTurnOnHoldGroup = systemSchema.fields.loseTurnOnHold.toFormGroup({ localize: true }, { value: effect.system.loseTurnOnHold, disabled: !app.isEditable });
            const noneActive = !html.querySelector('section.active');
            const tab = `
        <a ${noneActive ? 'class="active"' : ''}data-action="tab" data-group="sheet" data-tab="expiration">
          <i class="fa-solid fa-step-forward"></i> ${game.i18n.localize('SWADE.Expiration.TabLabel')}
        </a>
      `;
            const durationSection = `
        <section class="tab${noneActive ? ' active' : ''}" data-group="sheet" data-tab="expiration" data-application-part="expiration">
          ${game.i18n.localize('SWADE.Expiration.Description')}
          ${expirationGroup.outerHTML}
          ${loseTurnOnHoldGroup.outerHTML}
        </section>
      `;
            html
                .querySelector('section[data-tab="details"] .form-group.stacked')
                ?.insertAdjacentElement('afterend', conditionalGroup);
            html
                .querySelector('nav.sheet-tabs a[data-tab="duration"]')
                ?.insertAdjacentHTML('afterend', tab);
            if (!html.querySelector('section.tab[data-tab="expiration"]')) {
                html
                    .querySelector('section[data-tab="duration"]')
                    ?.insertAdjacentHTML('afterend', durationSection);
            }
        }
        else if (effect.system instanceof ModifierData) {
            const costGroup = effect.system.schema.fields.cost.toFormGroup({ localize: true }, { value: effect.system.cost });
            const limitGroup = effect.system.schema.fields.limit.toFormGroup({ localize: true }, { value: effect.system.limit });
            const levelGroup = effect.system.schema.fields.level.toFormGroup({ localize: true }, { value: effect.system.level });
            const descriptionGroup = html.querySelector('section[data-tab="details"] .form-group.stacked');
            // insert in reverse order because afterend usage
            descriptionGroup?.insertAdjacentElement('afterend', levelGroup);
            descriptionGroup?.insertAdjacentElement('afterend', limitGroup);
            descriptionGroup?.insertAdjacentElement('afterend', costGroup);
            app.setPosition();
        }
    }
    static onHotReload({ packageType, packageId, content, path, extension, }) {
        //return the hook early if it's not a swade system change;
        if (packageType !== 'system' && packageId !== 'swade')
            return;
        //stop the hook on empty changes
        if (!content)
            return false;
        if (extension === 'js')
            location.reload();
    }
    static onCreateProseMirrorEditor(uuid, plugins, _options) {
        const [prefix] = uuid.split('#');
        const doc = fromUuidSync(prefix, { strict: false });
        if (doc instanceof JournalEntryPage && doc.type === 'headquarters') {
            // Delete the default content link plugin.
            delete plugins.contentLinks;
            plugins.headquarterFiller = ProseMirrorTableResultDropFillerPlugin.build(ProseMirror.defaultSchema);
        }
    }
    static async onTargetToken(user, token, targeted) {
        if (!targeted)
            return;
        token.ring?.flashColor(user.color, {
            duration: 1000,
            easing: (pt) => {
                return (Math.sin(2 * Math.PI * pt - Math.PI / 2) + 1) / 2;
            },
        });
    }
    static async onDropCanvasData(canvas, data) {
        const { uuid, x, y, type } = data;
        if (type !== 'ActiveEffect' || !canvas.tokens?.active)
            return;
        //grab the tokens at the drop position
        const tokensAtDropPosition = [...canvas.tokens.placeables]
            .sort((a, b) => b.document.sort - a.document.sort)
            .sort((a, b) => b.document.elevation - a.document.elevation)
            .filter((t) => t.localShape.contains(x, y));
        const targets = new Set(tokensAtDropPosition);
        if (!targets?.size)
            return;
        const controlled = new Set(canvas.tokens?.controlled);
        if (controlled.size && targets.isSubset(controlled)) {
            //add the controlled to the target if the set of targeted tokens is a subset of the controlled tokens
            controlled.forEach((t) => targets.add(t));
        }
        const effect = await fromUuid(uuid);
        if (!effect)
            return;
        const effectData = foundry.utils.mergeObject(effect.toObject(), {
            system: { favorite: true },
            origin: effect.parent.uuid,
        });
        await Promise.allSettled(targets.map((token) => token.actor.createEmbeddedDocuments('ActiveEffect', [effectData])));
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
const { ApplicationV2: ApplicationV2$2, HandlebarsApplicationMixin: HandlebarsApplicationMixin$3 } = foundry.applications.api;
/**
 * This class defines a submenu for the system settings which will handle the DSN Settings
 */
class DiceSettings extends HandlebarsApplicationMixin$3(ApplicationV2$2) {
    config = SWADE.diceConfig;
    customWildDieDefaultColors = this.config.flags.dsnCustomWildDieColors.default;
    static DEFAULT_OPTIONS = {
        id: 'diceConfig',
        window: {
            title: 'SWADE.DiceConf',
            resizable: false,
            contentClasses: ['standard-form'],
        },
        position: {
            width: 500,
            height: 'auto',
        },
        classes: ['swade', 'setting-config', 'dice-so-nice', 'swade-application'],
        tag: 'form',
        form: {
            handler: DiceSettings.onSubmit,
            closeOnSubmit: false,
            submitOnClose: true,
            submitOnChange: true,
        },
        actions: {
            reset: DiceSettings.#resetSettings,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/dice-config.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    async _prepareContext(options) {
        const settings = {};
        for (const flag in this.config.flags) {
            const defaultValue = this.config.flags[flag].default;
            const value = game.user?.getFlag('swade', flag);
            settings[flag] = {
                module: 'swade',
                key: flag,
                value: typeof value === 'undefined' ? defaultValue : value,
                name: this.config.flags[flag].label || '',
                hint: this.config.flags[flag].hint || '',
                type: this.config.flags[flag].type,
                isCheckbox: this.config.flags[flag].type === Boolean,
                isObject: this.config.flags[flag].type === Object,
            };
            if (flag === 'dsnWildDiePreset') {
                settings[flag].isSelect = true;
                settings[flag].choices = this._prepareSystemList();
            }
            if (flag === 'dsnWildDie') {
                settings[flag].isSelect = true;
                settings[flag].choices = this._prepareColorsetList();
                settings[flag].disabled =
                    game.user?.getFlag('swade', 'dsnWildDiePreset') === 'none';
            }
        }
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            settings,
            hasCustomWildDie: settings['dsnWildDie'].value !== 'customWildDie',
            noWildDie: game.user?.getFlag('swade', 'dsnWildDiePreset') === 'none',
            textureList: game.dice3d?.exports.Utils.prepareTextureList(),
            fontList: game.dice3d?.exports.Utils.prepareFontList(),
            materialList: this._prepareMaterialList(),
            buttons: [
                { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
                {
                    type: 'reset',
                    action: 'reset',
                    icon: 'fa-solid fa-undo',
                    cssClass: 'submit',
                    label: 'SETTINGS.Reset',
                },
            ],
        });
        return context;
    }
    static async onSubmit(event, _form, formData) {
        const expandedFormData = foundry.utils.expandObject(formData.object);
        const { diceColor, edgeColor, labelColor, outlineColor } = this.customWildDieDefaultColors;
        // Handle basic settings
        for (const [key, value] of Object.entries(expandedFormData.swade)) {
            await game.user?.setFlag('swade', key, value);
        }
        // Handle custom Wild Die
        if (expandedFormData.swade.dsnWildDie === 'customWildDie') {
            await game.user?.setFlag('swade', 'dsnCustomWildDieColors', {
                diceColor: expandedFormData.diceColor || diceColor,
                edgeColor: expandedFormData.edgeColor || edgeColor,
                labelColor: expandedFormData.labelColor || labelColor,
                outlineColor: expandedFormData.outlineColor || outlineColor,
            });
        }
        this.render({ force: true });
        if (event.submitter) {
            this.close();
            location.reload();
        }
    }
    static async #resetSettings(_event, _target) {
        for (const flag in this.config.flags) {
            const resetValue = this.config.flags[flag].default;
            if (game.user?.getFlag('swade', flag) !== resetValue) {
                await game.user?.setFlag('swade', flag, resetValue);
            }
        }
        this.render({ force: true });
    }
    _prepareSystemList() {
        const systems = game.dice3d.exports.Utils.prepareSystemList();
        systems.none = game.i18n.localize('SWADE.DSNNone');
        return systems;
    }
    _prepareColorsetList() {
        return game.dice3d.exports.Utils.prepareColorsetList();
    }
    _prepareMaterialList() {
        return {
            auto: 'DICESONICE.MaterialAuto',
            plastic: 'DICESONICE.MaterialPlastic',
            metal: 'DICESONICE.MaterialMetal',
            glass: 'DICESONICE.MaterialGlass',
            wood: 'DICESONICE.MaterialWood',
            chrome: 'DICESONICE.MaterialChrome',
        };
    }
}

/** Hook callbacks for third-party integrations */
class SwadeIntegrationHooks {
    static onDiceSoNiceInit(_dice3d) {
        game.settings.registerMenu('swade', 'dice-config', {
            name: game.i18n.localize('SWADE.DiceConf'),
            label: game.i18n.localize('SWADE.DiceConfLabel'),
            hint: game.i18n.localize('SWADE.DiceConfDesc'),
            icon: 'fas fa-dice',
            type: DiceSettings,
            restricted: false,
        });
    }
    static onDiceSoNiceReady(dice3d) {
        const customWilDieColors = game.user.getFlag('swade', 'dsnCustomWildDieColors') ||
            SWADE.diceConfig.flags.dsnCustomWildDieColors
                .default;
        const customWilDieOptions = game.user.getFlag('swade', 'dsnCustomWildDieOptions') ||
            SWADE.diceConfig.flags.dsnCustomWildDieOptions
                .default;
        dice3d.addSystem({ id: 'swade', name: 'Savage Worlds Adventure Edition' }, 'preferred');
        dice3d.addColorset({
            name: 'customWildDie',
            description: 'SWADE.CustomWildDie',
            category: 'DICESONICE.Colors',
            foreground: customWilDieColors.labelColor,
            background: customWilDieColors.diceColor,
            outline: customWilDieColors.outlineColor,
            edge: customWilDieColors.edgeColor,
            texture: customWilDieOptions.texture,
            material: customWilDieOptions.material,
            font: customWilDieOptions.font,
        }, 'no');
        dice3d.addDicePreset({
            type: 'db',
            system: 'swade',
            colorset: 'black',
            labels: [
                game.settings.get('swade', 'bennyImage3DFront'),
                game.settings.get('swade', 'bennyImage3DBack'),
            ].filter(Boolean),
            bumpMaps: [
                game.settings.get('swade', '3dBennyFrontBump'),
                game.settings.get('swade', '3dBennyBackBump'),
            ].filter(Boolean),
        }, 'd2');
    }
    static onDiceSoNiceRollStart(_messageId, context) {
        const user = context.user;
        if (user.id === game.userId)
            return;
        const wildDie = context.roll.terms.find((d) => d.options.flavor === game.i18n.localize('SWADE.WildDie'));
        const dieSystem = wildDie?.options?.appearance?.system;
        //return early if the colorset is none
        if (!dieSystem || dieSystem === 'none')
            return;
        const colorSet = wildDie.options.colorset;
        if (colorSet === 'customWildDie') {
            // Build the custom appearance and set it
            const customColors = user.getFlag('swade', 'dsnCustomWildDieColors');
            const customOptions = user.getFlag('swade', 'dsnCustomWildDieOptions');
            const customAppearance = {
                colorset: 'custom',
                foreground: customColors?.labelColor,
                background: customColors?.diceColor,
                edge: customColors?.edgeColor,
                outline: customColors?.outlineColor,
                font: customOptions?.font,
                material: customOptions?.material,
                texture: customOptions?.texture,
                system: dieSystem,
            };
            foundry.utils.setProperty(wildDie, 'options.appearance', customAppearance);
        }
        else {
            // Set the preset
            foundry.utils.setProperty(wildDie, 'options.colorset', colorSet);
        }
        // Get the dicePreset for the given die type
        const dicePreset = game.dice3d?.DiceFactory.systems[dieSystem].dice.find((d) => d.type === 'd' + wildDie.faces);
        if (!dicePreset)
            return;
        if (dicePreset?.modelFile && !dicePreset.modelLoaded) {
            // Load the modelFile
            dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
        }
        // Load the textures
        dicePreset.loadTextures();
    }
    static onDevModeReady({ registerPackageDebugFlag }) {
        registerPackageDebugFlag(PACKAGE_ID);
    }
    static onItemPilesReady() {
        const versions = {
            '5.0.0': {
                VERSION: '1.1.0',
                // The actor class type is the type of actor that will be used for the default item pile actor that is created on first item drop.
                ACTOR_CLASS_TYPE: 'npc',
                // The item class type is the type of item that will be used for the default loot item
                ITEM_CLASS_LOOT_TYPE: '',
                // The item class type is the type of item that will be used for the default weapon item
                ITEM_CLASS_WEAPON_TYPE: 'weapon',
                // The item class type is the type of item that will be used for the default equipment item
                ITEM_CLASS_EQUIPMENT_TYPE: 'gear',
                // The item quantity attribute is the path to the attribute on items that denote how many of that item that exists
                ITEM_QUANTITY_ATTRIBUTE: 'system.quantity',
                // The item price attribute is the path to the attribute on each item that determine how much it costs
                ITEM_PRICE_ATTRIBUTE: 'system.price',
                // Item types and the filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, feats, and classes
                ITEM_FILTERS: [
                    {
                        path: 'type',
                        filters: 'ancestry,edge,hindrance,skill,power,ability,action'
                    }
                ],
                // Item similarities determines how item piles detect similarities and differences in the system
                ITEM_SIMILARITIES: ['name', 'type', 'system.swid'],
                // Currencies in item piles is a versatile system that can accept actor attributes (a number field on the actor's sheet) or items (actual items in their inventory)
                // In the case of attributes, the path is relative to the actor
                // In the case of items, it is recommended you export the item with `.toObject()` and strip out any module data
                CURRENCIES: [
                    {
                        type: 'attribute',
                        name: 'SWADE.Currency',
                        img: 'icons/svg/coins.svg',
                        abbreviation: '{#}T',
                        data: {
                            path: 'system.details.currency',
                        },
                        primary: true,
                        exchangeRate: 1
                    }
                ],
                CURRENCY_DECIMAL_DIGITS: 0.01
            }
        };
        const data = Object.entries(versions).find(([version]) => {
            return foundry.utils.isNewerVersion(game.system.version, version);
        });
        if (!data)
            return;
        // @ts-expect-error This always exists if this function is called, bot not necessarily otherwise
        return game.itempiles.API.addSystemIntegration(data[1]);
    }
}

/** @internal */
function registerKeybindings() {
    game.keybindings.register('swade', 'openFavoriteCardsDoc', {
        name: 'SWADE.Keybindings.OpenFavoriteCards.Name',
        hint: 'SWADE.Keybindings.OpenFavoriteCards.Hint',
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        editable: [{ key: 'KeyH' }],
        onDown: (_ctx) => {
            const favoriteCards = game.user?.getFlag('swade', 'favoriteCardsDoc');
            if (!favoriteCards) {
                ui.notifications.warn('SWADE.Keybindings.OpenFavoriteCards.NoCardsWarning', { localize: true });
                return;
            }
            game.cards?.get(favoriteCards)?.sheet?.render(true);
        },
    });
    game.keybindings.register('swade', 'manageBennies', {
        name: 'SWADE.Keybindings.Bennies.Name',
        hint: 'SWADE.Keybindings.Bennies.Hint',
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        editable: [{ key: 'KeyB' }],
        reservedModifiers: [
            foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT,
        ],
        onDown: (ctx) => {
            if (ctx.isAlt) {
                game.user?.getBenny();
            }
            else {
                game.user?.spendBenny();
            }
        },
    });
}

/** @internal */
async function preloadHandlebarsTemplates() {
    const templatePaths = {
        //NPC partials
        'swade.npc-attributes': 'systems/swade/templates/actors/partials/attributes.hbs',
        'swade.npc-summary': 'systems/swade/templates/actors/partials/npc-summary-tab.hbs',
        'swade.npc-powers': 'systems/swade/templates/actors/partials/powers-tab.hbs',
        'swade.npc-setting': 'systems/swade/templates/setting-fields.hbs',
        'swade.npc-action-card': 'systems/swade/templates/shared-partials/action-card.hbs',
        //Gear Cards
        'swade.weapon-card': 'systems/swade/templates/actors/partials/weapon-card.hbs',
        'swade.armor-card': 'systems/swade/templates/actors/partials/armor-card.hbs',
        // TODO: Investigate if this is in use anywhere
        'swade.powers-card': 'systems/swade/templates/actors/partials/powers-card.hbs',
        'swade.shield-card': 'systems/swade/templates/actors/partials/shield-card.hbs',
        'swade.misc-card': 'systems/swade/templates/actors/partials/misc-card.hbs',
        'swade.consumable-card': 'systems/swade/templates/actors/partials/consumable-card.hbs',
        // TODO: Investigate if this is in use anywhere
        //die type list
        'swade.die-sides': 'systems/swade/templates/die-sides-options.hbs',
        'swade.attribute-select': 'systems/swade/templates/attribute-select.hbs',
        // Chat
        'swade.roll-formula': 'systems/swade/templates/chat/roll-formula.hbs',
        //Items
        'swade.effect-list': 'systems/swade/templates/effect-list.hbs',
        //official sheet
        //tabs
        'swade.character-tab-summary': 'systems/swade/templates/actors/character/tabs/summary.hbs',
        'swade.character-tab-edges': 'systems/swade/templates/actors/character/tabs/edges.hbs',
        'swade.character-tab-effects': 'systems/swade/templates/actors/character/tabs/effects.hbs',
        'swade.character-tab-inventory': 'systems/swade/templates/actors/character/tabs/inventory.hbs',
        'swade.character-tab-powers': 'systems/swade/templates/actors/character/tabs/powers.hbs',
        'swade.character-tab-actions': 'systems/swade/templates/actors/character/tabs/actions.hbs',
        'swade.character-tab-about': 'systems/swade/templates/actors/character/tabs/about.hbs',
        //misc partials
        'swade.character-attributes': 'systems/swade/templates/actors/character/partials/attributes.hbs',
        'swade.character-item-card': 'systems/swade/templates/actors/character/partials/item-card.hbs',
        'swade.character-skill-card': 'systems/swade/templates/actors/character/partials/skill-card.hbs',
        'swade.character-setting-field': 'systems/swade/templates/actors/character/partials/setting-fields.hbs',
        //Item V2
        'swade.item-header': 'systems/swade/templates/item/partials/header.hbs',
        'swade.item-additional-stats': 'systems/swade/templates/item/partials/additional-stats.hbs',
        'swade.item-action-properties': 'systems/swade/templates/item/partials/action-properties.hbs',
        'swade.item-bonus-damage': 'systems/swade/templates/item/partials/bonus-damage.hbs',
        'swade.item-equipped': 'systems/swade/templates/item/partials/equipped.hbs',
        'swade.item-grants': 'systems/swade/templates/item/partials/grants.hbs',
        'swade.item-templates': 'systems/swade/templates/item/partials/templates.hbs',
        'swade.item-tab-powers': 'systems/swade/templates/item/partials/tabs/powers.hbs',
        'swade.item-tab-description': 'systems/swade/templates/item/partials/tabs/description.hbs',
        'swade.item-tab-actions': 'systems/swade/templates/item/partials/tabs/actions.hbs',
        'swade.item-tab-effects': 'systems/swade/templates/item/partials/tabs/effects.hbs',
    };
    return foundry.applications.handlebars.loadTemplates(templatePaths);
}

/* eslint-disable @typescript-eslint/naming-convention */
const { ApplicationV2: ApplicationV2$1, HandlebarsApplicationMixin: HandlebarsApplicationMixin$2 } = foundry.applications.api;
class CompendiumTOCSettings extends HandlebarsApplicationMixin$2(ApplicationV2$1) {
    #blockList;
    constructor(options) {
        super(options);
        this.#blockList = game.settings.get('swade', 'tocBlockList');
    }
    static DEFAULT_OPTIONS = {
        id: 'compendiumTOCSettings',
        window: {
            title: 'SWADE.TOCSettings.Name',
        },
        tag: 'form',
        position: {
            width: 500,
            height: 600,
        },
        classes: ['swade-application', 'swade', 'toc-settings', 'standard-form'],
        form: {
            handler: CompendiumTOCSettings.onSubmit,
            closeOnSubmit: true,
            submitOnChange: false,
            submitOnClose: false,
        },
    };
    static PARTS = {
        main: {
            template: 'systems/swade/templates/apps/compendium-toc-settings.hbs',
        },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    get blockList() {
        return this.#blockList;
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.buttons = [
            { type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' }, // TODO: localize
        ];
        const packs = game.packs.filter((p) => CompendiumTOC.ALLOWED_TYPES.includes(p.metadata.type));
        const packsByType = {};
        for (const pack of packs) {
            const type = pack.metadata.type;
            if (!packsByType[type]) {
                packsByType[type] = [];
            }
            packsByType[type].push({
                label: pack.metadata.label,
                collection: pack.collection,
                inUse: !this.blockList[pack.collection],
            });
        }
        context.blockList = packsByType;
        return context;
    }
    static async onSubmit(_event, _form, formData) {
        if (!game.user?.isGM)
            return;
        // invert the values
        const dataObj = formData.object;
        for (const pack in dataObj) {
            dataObj[pack] = !dataObj[pack];
        }
        await game.settings.set('swade', 'tocBlockList', dataObj);
        game.socket?.emit('reload');
        foundry.utils.debouncedReload();
    }
}

/** @internal */
function registerSettings() {
    game.settings.registerMenu('swade', 'setting-config', {
        name: 'SWADE.SettingConf',
        label: 'SWADE.SettingConfLabel',
        hint: 'SWADE.SettingConfDesc',
        icon: 'fa-solid fa-globe',
        type: SettingConfigurator,
        restricted: true,
    });
    game.settings.registerMenu('swade', 'toc-settings', {
        name: 'SWADE.TOCSettings.Name',
        label: 'SWADE.TOCSettings.Label',
        hint: 'SWADE.TOCSettings.Hint',
        icon: 'fa-solid fa-books',
        type: CompendiumTOCSettings,
        restricted: true,
    });
    /** Track the system version upon which point a migration was last applied */
    game.settings.register('swade', 'systemMigrationVersion', {
        name: 'System Migration Version',
        scope: 'world',
        config: false,
        type: String,
        default: '0.0.0',
    });
    game.settings.register('swade', 'initiativeSound', {
        name: 'SWADE.Settings.CardSound.Name',
        hint: 'SWADE.Settings.CardSound.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    game.settings.register('swade', 'autoInit', {
        name: 'SWADE.Settings.AutoInit.Name',
        hint: 'SWADE.Settings.AutoInit.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    game.settings.register('swade', 'initMessage', {
        name: 'SWADE.Settings.CreateInitChat.Name',
        hint: 'SWADE.Settings.CreateInitChat.Hint',
        default: constants$1.INIT_MESSAGE_TYPE.LARGE,
        scope: 'client',
        type: String,
        choices: {
            [constants$1.INIT_MESSAGE_TYPE.OFF]: 'SWADE.CardDrawMsgSize.None',
            [constants$1.INIT_MESSAGE_TYPE.COMPACT]: 'SWADE.CardDrawMsgSize.Compact',
            [constants$1.INIT_MESSAGE_TYPE.LARGE]: 'SWADE.CardDrawMsgSize.Large',
        },
        config: true,
        onChange: () => game.messages
            ?.filter((m) => m.isContentVisible && m.isCardDraw)
            .forEach((msg) => ui.chat.updateMessage(msg)),
    });
    game.settings.register('swade', 'hideNPCWildcards', {
        name: 'SWADE.Settings.HideWC.Name',
        hint: 'SWADE.Settings.HideWC.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    game.settings.register('swade', 'notifyBennies', {
        name: 'SWADE.Settings.EnableBennyNotify.Name',
        hint: 'SWADE.Settings.EnableBennyNotify.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    game.settings.register('swade', 'hideNpcItemChatCards', {
        name: 'SWADE.Settings.HideNpcItemChatCards.Name',
        hint: 'SWADE.Settings.HideNpcItemChatCards.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    game.settings.register('swade', 'weightUnit', {
        name: 'SWADE.Settings.WeightUnit.Name',
        hint: 'SWADE.Settings.WeightUnit.Hint',
        default: 'imperial',
        scope: 'world',
        type: String,
        choices: {
            imperial: game.i18n.localize('SWADE.Imperial'),
            metric: game.i18n.localize('SWADE.Metric'),
        },
        config: true,
    });
    game.settings.register('swade', 'useAttributeShorts', {
        name: 'SWADE.Settings.UseAttributeShorts.Name',
        hint: 'SWADE.Settings.UseAttributeShorts.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: true,
    });
    /** @deprecated */
    game.settings.register('swade', 'parryBaseSkill', {
        default: 'Fighting',
        scope: 'world',
        requiresReload: true,
        type: String,
        config: false,
    });
    game.settings.register('swade', 'parryBaseSwid', {
        name: 'SWADE.Settings.ParryBase.Name',
        hint: 'SWADE.Settings.ParryBase.Hint',
        default: 'fighting',
        scope: 'world',
        requiresReload: true,
        type: String,
        config: true,
    });
    game.settings.register('swade', 'actionDeck', {
        name: 'SWADE.Settings.InitCardDeck.Name',
        scope: 'world',
        type: String,
        config: false,
        default: '',
    });
    game.settings.register('swade', 'actionDeckDiscardPile', {
        name: 'SWADE.Settings.InitDiscardPile.Name',
        scope: 'world',
        type: String,
        config: false,
        default: '',
    });
    game.settings.register('swade', 'highlightTemplate', {
        name: 'SWADE.Settings.HighlightTemplate.Name',
        hint: 'SWADE.Settings.HighlightTemplate.Hint',
        scope: 'world',
        type: Boolean,
        default: true,
        config: true,
    });
    game.settings.register('swade', 'charSheetDefaultWidth', {
        name: 'SWADE.Settings.CharSheetDefaultWidth.Name',
        hint: 'SWADE.Settings.CharSheetDefaultWidth.Hint',
        scope: 'world',
        type: Number,
        default: 650,
        config: true,
    });
}
/** @internal */
function registerSettingRules() {
    game.settings.register('swade', 'coreSkills', {
        name: 'SWADE.Settings.CoreSkillsList.Name',
        hint: 'SWADE.Settings.CoreSkillsList.Hint',
        default: 'Athletics, Common Knowledge, Notice, Persuasion, Stealth',
        scope: 'world',
        type: String,
        config: false,
    });
    game.settings.register('swade', 'coreSkillsCompendium', {
        name: 'SWADE.Settings.CoreSkillsPack.Name',
        hint: 'SWADE.Settings.CoreSkillsPack.Hint',
        default: 'swade.skills',
        type: String,
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'wealthType', {
        name: 'SWADE.Settings.WealthType.Name',
        hint: 'SWADE.Settings.WealthType.Hint',
        scope: 'world',
        type: String,
        choices: {
            currency: 'SWADE.Currency',
            wealthDie: 'SWADE.WealthDie.Label',
            none: 'SWADE.WealthSelectionNoneOther',
        },
        default: 'currency',
        config: false,
    });
    game.settings.register('swade', 'currencyName', {
        name: 'SWADE.Settings.CurrencyName.Name',
        hint: 'SWADE.Settings.CurrencyName.Hint',
        scope: 'world',
        type: String,
        default: 'Currency',
        config: false,
    });
    game.settings.register('swade', 'npcsUseCurrency', {
        name: 'SWADE.Settings.NPCCurrency.Name',
        hint: 'SWADE.Settings.NPCCurrency.Hint',
        scope: 'world',
        type: Boolean,
        default: true,
        config: false,
    });
    game.settings.register('swade', 'jokersWild', {
        name: 'SWADE.Settings.JokersWild.Name',
        hint: 'SWADE.Settings.JokersWild.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'ammoManagement', {
        name: 'SWADE.Settings.AmmoManagement.Name',
        hint: 'SWADE.Settings.AmmoManagement.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'ammoFromInventory', {
        name: 'SWADE.Settings.PCAmmoFromInventory.Name',
        hint: 'SWADE.Settings.PCAmmoFromInventory.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'npcAmmo', {
        name: 'SWADE.Settings.NPCAmmoFromInventory.Name',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'vehicleAmmo', {
        name: 'SWADE.Settings.VehicleAmmoFromInventory.Name',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'enableConviction', {
        name: 'SWADE.Settings.EnableConv.Name',
        hint: 'SWADE.Settings.EnableConv.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'enableWoundPace', {
        name: 'SWADE.Settings.EnableWoundPace.Name',
        hint: 'SWADE.Settings.EnableWoundPace.Hint',
        default: true,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'noPowerPoints', {
        name: 'SWADE.Settings.NoPowerPoints.Name',
        hint: 'SWADE.Settings.NoPowerPoints.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'alwaysGeneralPP', {
        name: 'SWADE.Settings.AlwaysGeneralPP.Name',
        hint: 'SWADE.Settings.AlwaysGeneralPP.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'applyEncumbrance', {
        name: 'SWADE.Settings.ApplyEncumbrance.Name',
        hint: game.i18n.format('SWADE.Settings.ApplyEncumbrance.Hint', {
            vigor: game.i18n.localize('SWADE.AttrVig'),
            fatigue: game.i18n.localize('SWADE.Fatigue'),
        }),
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'staticGmBennies', {
        name: 'SWADE.Settings.StaticGmBennies.Name',
        hint: 'SWADE.Settings.StaticGmBennies.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'gmBennies', {
        name: 'SWADE.Settings.GmBennies.Name',
        hint: 'SWADE.Settings.GmBennies.Hint',
        default: 0,
        scope: 'world',
        type: Number,
        config: false,
    });
    game.settings.register('swade', 'vehicleEnergy', {
        name: 'SWADE.Settings.VehicleEnergy.Name',
        hint: 'SWADE.Settings.VehicleEnergy.Hint',
        default: false,
        scope: 'world',
        type: new foundry.data.fields.BooleanField(),
        config: false,
    });
    game.settings.register('swade', 'vehicleMods', {
        name: 'SWADE.Settings.VehicleMods.Name',
        hint: 'SWADE.Settings.VehicleMods.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'vehicleEdges', {
        name: 'SWADE.Settings.VehicleEdges.Name',
        hint: 'SWADE.Settings.VehicleEdges.Hint',
        default: false,
        scope: 'world',
        type: Boolean,
        config: false,
    });
    game.settings.register('swade', 'vehicleSkills', {
        name: 'SWADE.Settings.VehicleSkills.Name',
        hint: 'SWADE.Settings.VehicleSkills.Hint',
        default: 'Boating, Driving, Piloting, Riding',
        scope: 'world',
        type: String,
        config: false,
    });
    game.settings.register('swade', 'settingFields', {
        name: 'SWADE.Settings.ArbitFields',
        default: { actor: {}, item: {} },
        scope: 'world',
        type: Object,
        config: false,
    });
    game.settings.register('swade', 'tocBlockList', {
        name: 'SWADE.TOCBlockList',
        default: {},
        scope: 'world',
        type: Object,
        config: false,
    });
    game.settings.register('swade', 'bennyImageSheet', {
        name: 'SWADE.Settings.BennyImageSheet.Name',
        hint: 'SWADE.Settings.BennyImageSheet.Hint',
        type: String,
        default: 'systems/swade/assets/bennie.webp',
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'woundCap', {
        name: 'SWADE.Settings.WoundCap.Name',
        hint: 'SWADE.Settings.WoundCap.Hint',
        type: Boolean,
        default: false,
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'unarmoredHero', {
        name: 'SWADE.Settings.UnarmoredHero.Name',
        hint: 'SWADE.Settings.UnarmoredHero.Hint',
        type: Boolean,
        default: false,
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'grittyDamage', {
        name: 'SWADE.Settings.GrittyDamage.Name',
        hint: 'SWADE.Settings.GrittyDamage.Hint',
        type: Boolean,
        default: false,
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'injuryTable', {
        name: 'SWADE.Settings.InjuryTable.Name',
        hint: 'SWADE.Settings.InjuryTable.Hint',
        type: String,
        default: '',
        scope: 'world',
        config: false,
        choices: {},
    });
    game.settings.register('swade', 'heroesNeverDie', {
        name: 'SWADE.Settings.HeroesNeverDie.Name',
        hint: 'SWADE.Settings.HeroesNeverDie.Hint',
        type: Boolean,
        default: false,
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'hardChoices', {
        name: 'SWADE.Settings.HardChoices.Name',
        hint: 'SWADE.Settings.HardChoices.Hint',
        scope: 'world',
        type: Boolean,
        default: false,
        config: false,
    });
    game.settings.register('swade', 'dumbLuck', {
        name: 'SWADE.Settings.DumbLuck.Name',
        hint: 'SWADE.Settings.DumbLuck.Hint',
        scope: 'world',
        type: Boolean,
        default: false,
        config: false,
    });
    game.settings.register('swade', 'pcStartingCurrency', {
        name: 'SWADE.Settings.StartingCurrency.PC.Name',
        hint: 'SWADE.Settings.StartingCurrency.PC.Hint',
        scope: 'world',
        type: Number,
        default: 500,
        config: false,
    });
    game.settings.register('swade', 'npcStartingCurrency', {
        name: 'SWADE.Settings.StartingCurrency.NPC.Name',
        hint: 'SWADE.Settings.StartingCurrency.NPC.Hint',
        scope: 'world',
        type: Number,
        default: 0,
        config: false,
    });
    game.settings.register('swade', 'armorStacking', {
        name: 'SWADE.Settings.ArmorStacking.Name',
        hint: 'SWADE.Settings.ArmorStacking.Name',
        scope: 'world',
        type: String,
        default: constants$1.ARMOR_STACKING.CORE,
        choices: constants$1.ARMOR_STACKING,
        requiresReload: true,
        config: false,
    });
}
/** @internal */
function register3DBennySettings() {
    game.settings.register('swade', 'bennyImage3DFront', {
        name: 'SWADE.Settings.Benny3DFront.Name',
        hint: 'SWADE.Settings.Benny3DFront.Hint',
        type: String,
        default: 'systems/swade/assets/benny/benny-chip-front.png',
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', 'bennyImage3DBack', {
        name: 'SWADE.Settings.Benny3DBack.Name',
        hint: 'SWADE.Settings.Benny3DBack.Hint',
        type: String,
        default: 'systems/swade/assets/benny/benny-chip-front.png',
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', '3dBennyFrontBump', {
        name: 'SWADE.Settings.Benny3DBackBump.Name',
        hint: 'SWADE.Settings.Benny3DBackBump.Hint',
        type: String,
        default: 'systems/swade/assets/benny/benny_bump.png',
        scope: 'world',
        config: false,
    });
    game.settings.register('swade', '3dBennyBackBump', {
        name: 'SWADE.Settings.Benny3DFrontBump.Name',
        hint: 'SWADE.Settings.Benny3DFrontBump.Hint',
        type: String,
        default: 'systems/swade/assets/benny/benny_bump.png',
        scope: 'world',
        config: false,
    });
}

class CharacterSheet extends foundry.appv1.sheets.ActorSheet {
    _equipStateMenu;
    _effectCreateDropDown;
    _accordions = {};
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['swade-official', 'sheet', 'actor'],
            width: game.settings.get('swade', 'charSheetDefaultWidth'),
            height: 700,
            resizable: true,
            scrollY: ['section.tab'],
            tabs: [
                {
                    group: 'primary',
                    navSelector: '.tabs',
                    contentSelector: '.sheet-body',
                    initial: 'summary',
                },
                {
                    group: 'about',
                    navSelector: '.about-tabs',
                    contentSelector: '.about-body',
                    initial: 'advances',
                },
            ],
        });
    }
    get template() {
        const base = 'systems/swade/templates/actors/character/';
        if (this.actor.limited)
            return base + 'limited.hbs';
        return base + 'sheet.hbs';
    }
    activateListeners(jquery) {
        super.activateListeners(jquery);
        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable)
            return;
        const html = jquery[0];
        this.#disableOverrides(html);
        this.#setupEquipStatusMenu(html);
        this.#setupEffectCreateMenu(html);
        this.#setupItemContextMenu(html);
        this.#setupAccordions(html);
        // Input focus and update
        const inputs = html.querySelectorAll('input');
        inputs.forEach((el) => el.addEventListener('focus', (ev) => ev.currentTarget.select()));
        html
            .querySelector('[name="system.details.currency"]')
            ?.addEventListener('change', this._onChangeInputDelta.bind(this));
        // Drag events for macros.
        html.querySelectorAll('li.item, .attribute').forEach((el) => {
            // Add draggable attribute and dragstart listener.
            el.draggable = true;
            el.addEventListener('dragstart', this._onDragStart.bind(this), false);
        });
        html
            .querySelectorAll('.status input[type="checkbox"]')
            .forEach((el) => el.addEventListener('change', this._toggleStatusEffect.bind(this)));
        //Display Advances on About tab
        html
            .querySelector('.character-detail.advances a')
            ?.addEventListener('click', async () => {
            this.activateTab('about', { group: 'primary' });
            this.activateTab('advances', { group: 'about' });
        });
        //Toggle Conviction
        html
            .querySelector('.conviction-toggle')
            ?.addEventListener('click', async () => {
            await this.actor.toggleConviction();
        });
        //Roll Attribute
        html.querySelectorAll('.attribute button').forEach((el) => el.addEventListener('click', async (ev) => {
            const attribute = ev.currentTarget.dataset.attribute;
            await this.actor.rollAttribute(attribute);
        }));
        html.querySelector('.attribute-manager')?.addEventListener('click', () => {
            new AttributeManager({ actor: this.actor }).render({ force: true });
        });
        // Roll Skill
        html.querySelectorAll('.skill-card .skill-die').forEach((el) => el.addEventListener('click', async (ev) => {
            const element = ev.currentTarget;
            const item = element.parentElement.dataset.itemId;
            await this.actor.rollSkill(item);
        }));
        //Running Die
        html.querySelector('.running-die')?.addEventListener('click', async () => {
            await this.actor.rollRunningDie();
        });
        // Roll Damage
        html.querySelectorAll('.damage-roll').forEach((el) => el.addEventListener('click', async (ev) => {
            const id = ev.currentTarget.closest('.item')?.dataset.itemId;
            await this.actor.items.get(id)?.rollDamage();
        }));
        // Use Consumable
        html.querySelectorAll('.use-consumable').forEach((el) => el.addEventListener('click', async (ev) => {
            const id = ev.currentTarget.closest('.item')?.dataset.itemId;
            await this.actor.items.get(id)?.consume();
        }));
        //Edit Item
        html.querySelectorAll('.item-edit').forEach((el) => el.addEventListener('click', (ev) => {
            const li = ev.currentTarget.closest('.item');
            const item = this.actor.items.get(li?.dataset.itemId, { strict: true });
            item.sheet?.render(true);
        }));
        //Show Item
        html.querySelectorAll('.item-show').forEach((el) => el.addEventListener('click', (ev) => {
            const li = ev.currentTarget.closest('.item');
            const item = this.actor.items.get(li?.dataset.itemId, { strict: true });
            item.show();
        }));
        // Delete Item
        html.querySelectorAll('.item-delete').forEach((el) => el.addEventListener('click', async (ev) => {
            const li = ev.currentTarget.closest('.item');
            const item = this.actor.items.get(li?.dataset.itemId);
            item?.deleteDialog();
        }));
        html.querySelectorAll('.item-create').forEach((el) => el.addEventListener('click', async (ev) => {
            this._inlineItemCreate(ev.currentTarget);
        }));
        //Item toggles
        html.querySelectorAll('.item-toggle').forEach((el) => el.addEventListener('click', async (ev) => {
            const target = ev.currentTarget;
            const li = target.closest('.item');
            const itemID = li?.dataset.itemId;
            const item = this.actor.items.get(itemID, { strict: true });
            const toggle = target.dataset.toggle;
            await item.update(this._toggleItem(item, toggle));
        }));
        html.querySelectorAll('.effect-action').forEach((el) => el.addEventListener('click', async (ev) => {
            const a = ev.currentTarget;
            const effectId = a.closest('.effect').dataset.effectId;
            const sourceId = a.closest('.effect').dataset.sourceId;
            const sourceItem = this.actor.items.get(sourceId);
            const effect = sourceId
                ? sourceItem.effects.get(effectId)
                : this.actor.effects.get(effectId);
            if (!effect)
                return;
            const action = a.dataset.action;
            const toggle = a.dataset.toggle;
            if (!effect)
                return;
            switch (action) {
                case 'edit':
                    return effect.sheet?.render({ force: true });
                case 'delete':
                    return effect.deleteDialog();
                case 'toggle':
                    return effect.update(this._toggleItem(effect, toggle));
                case 'open-origin':
                    if (sourceItem) {
                        sourceItem.sheet?.render(true);
                    }
                    return;
                default:
                    Logger.warn(`The action ${action} is not currently supported`);
                    break;
            }
        }));
        html.querySelector('.armor-display')?.addEventListener('click', () => {
            const armorPropertyPath = 'system.stats.toughness.armor';
            const armorValue = foundry.utils.getProperty(this.actor, armorPropertyPath);
            const label = game.i18n.localize('SWADE.Armor');
            const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: label })}</label>
        <input name="modifier" value="${armorValue}" type="number"/>
      </div></form>`;
            foundry.applications.api.DialogV2.wait({
                window: {
                    title: `${game.i18n.format('SWADE.EdF', { item: this.actor.name + ' ' + label })}`,
                },
                content: template,
                buttons: [
                    {
                        action: 'ok',
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('SWADE.Ok'),
                        default: true,
                        callback: (_event, button) => {
                            const newData = {};
                            newData[armorPropertyPath] =
                                button.form.querySelector('input[name="modifier"]')?.value;
                            this.actor.update(newData);
                        },
                    },
                    {
                        action: 'cancel',
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('Cancel'),
                    },
                ],
            });
        });
        html.querySelector('.parry-display')?.addEventListener('click', () => {
            const parryPropertyPath = 'system.stats.parry.shield';
            const parryMod = foundry.utils.getProperty(this.actor, parryPropertyPath);
            const label = game.i18n.localize('SWADE.ShieldBonus');
            const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: label })}</label>
        <input name="modifier" value="${parryMod}" type="number"/>
      </div></form>`;
            foundry.applications.api.DialogV2.wait({
                window: {
                    title: `${game.i18n.format('SWADE.EdF', { item: this.actor.name + ' ' + label })}`,
                },
                content: template,
                buttons: [
                    {
                        action: 'ok',
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize('SWADE.Ok'),
                        default: true,
                        callback: (_event, button) => {
                            const newData = {};
                            newData[parryPropertyPath] =
                                button.form.querySelector('input[name="modifier"]')?.value;
                            this.actor.update(newData);
                        },
                    },
                    {
                        action: 'cancel',
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('Cancel'),
                    },
                ],
            });
        });
        //Item Action Buttons
        html
            .querySelectorAll('.card-buttons button')
            .forEach((el) => el.addEventListener('click', this._handleItemActions.bind(this)));
        //Additional Stats roll
        html.querySelectorAll('.additional-stats .roll').forEach((el) => el.addEventListener('click', async (ev) => {
            const button = ev.currentTarget;
            const stat = button.dataset.stat;
            await this.actor.system.rollAdditionalStat(stat);
        }));
        //Wealth Die Roll
        html
            .querySelector('.currency .roll')
            ?.addEventListener('click', () => this.actor.rollWealthDie());
        //Advances
        html.querySelectorAll('.advance-action').forEach((el) => el.addEventListener('click', async (ev) => {
            if (this.actor.type === 'vehicle')
                return;
            const button = ev.currentTarget;
            const id = button.closest('li.advance')?.dataset.advanceId;
            switch (button.dataset.action) {
                case 'edit':
                    new AdvanceEditor({
                        advance: this.actor.system.advances.list.get(id, {
                            strict: true,
                        }),
                        actor: this.actor,
                    }).render({ force: true });
                    break;
                case 'delete':
                    await this.#deleteAdvance(id);
                    break;
                case 'toggle-planned':
                    await this.#toggleAdvancePlanned(id);
                    break;
                default:
                    throw new Error(`Action ${button.dataset.action} not supported`);
            }
        }));
        html
            .querySelector('.profile-img')
            ?.addEventListener('contextmenu', () => {
            if (!this.actor.img)
                return;
            new ImagePopout({
                src: this.actor.img,
                title: this.actor.name,
                shareable: this.actor.isOwner ?? game.user?.isGM,
                uuid: this.actor.uuid,
            }).render(true);
        });
        html
            .querySelectorAll('.adjust-counter')
            .forEach((el) => el.addEventListener('click', this._handleCounterAdjust.bind(this)));
        html
            .querySelectorAll('.character-detail.ancestry button, .character-detail.archetype button')
            .forEach((btn) => {
            btn.addEventListener('click', (ev) => {
                const id = ev.currentTarget.dataset.itemId;
                this.actor.items.get(id)?.sheet?.render(true);
            });
        });
        html
            .querySelector('.stat.size input')
            ?.addEventListener('mouseenter', (event) => {
            game.tooltip.deactivate();
            game.tooltip.activate(event.target, {
                html: this.actor.system.getSizeTooltip(),
                cssClass: 'themed theme-dark',
            });
        });
        html
            .querySelector('.stat.pace input')
            ?.addEventListener('mouseenter', (event) => {
            game.tooltip.deactivate();
            game.tooltip.activate(event.target, {
                html: this.actor.system.getPaceTooltip(),
                cssClass: 'themed theme-dark',
            });
        });
    }
    async getData(options) {
        if (this.actor.system instanceof VehicleData)
            throw new Error();
        //retrieve the items and sort them by their sort value
        const items = Array.from(this.actor.items.contents).sort((a, b) => a.sort - b.sort);
        const ammoManagement = game.settings.get('swade', 'ammoManagement');
        for (const item of items) {
            // Basic template rendering data
            const system = item.system;
            const itemActions = foundry.utils.getProperty(system, 'actions.additional') ?? {};
            const actions = new Array();
            for (const action in itemActions) {
                actions.push({
                    key: action,
                    type: itemActions[action].type,
                    name: itemActions[action].name,
                });
            }
            const hasDamage = !!foundry.utils.getProperty(system, 'damage') ||
                actions.some((a) => a.type === constants$1.ACTION_TYPE.DAMAGE);
            const hasTraitRoll = !!foundry.utils.getProperty(system, 'actions.trait') ||
                actions.some((a) => a.type === constants$1.ACTION_TYPE.TRAIT);
            const hasMacros = actions.some((a) => a.type === constants$1.ACTION_TYPE.MACRO);
            const hasAmmoManagement = ammoManagement &&
                item.type === 'weapon' &&
                !item.isMeleeWeapon &&
                system.reloadType !== constants$1.RELOAD_TYPE.NONE;
            const hasReloadButton = ammoManagement &&
                system.shots > 0 &&
                system.reloadType !== constants$1.RELOAD_TYPE.NONE &&
                system.reloadType !== constants$1.RELOAD_TYPE.SELF;
            const itemEnrichmentOptions = {
                relativeTo: item,
                rollData: item.getRollData(),
                secrets: this.document.isOwner,
            };
            const enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, itemEnrichmentOptions);
            const enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.notes, itemEnrichmentOptions);
            foundry.utils.setProperty(item, 'actions', actions);
            foundry.utils.setProperty(item, 'hasDamage', hasDamage);
            foundry.utils.setProperty(item, 'hasTraitRoll', hasTraitRoll);
            foundry.utils.setProperty(item, 'hasAmmoManagement', hasAmmoManagement);
            foundry.utils.setProperty(item, 'hasReloadButton', hasReloadButton);
            foundry.utils.setProperty(item, 'hasMacros', hasMacros);
            foundry.utils.setProperty(item, 'enrichedDescription', enrichedDescription);
            foundry.utils.setProperty(item, 'enrichedNotes', enrichedNotes);
            if (item.type === 'power')
                foundry.utils.setProperty(item, 'powerPoints', item.powerPointObject);
        }
        const itemTypes = {};
        const hiddenActionOverride = this.actor.getFlag('swade', 'hiddenActionOverride');
        for (const item of items) {
            const type = item.type;
            itemTypes[type] ??= [];
            if (item.system instanceof ActionData &&
                item.system.hidden &&
                !hiddenActionOverride) {
                continue; //do not display hidden actions
            }
            itemTypes[type].push(item);
        }
        const additionalStats = this.#getAdditionalStats();
        const data = {
            itemTypes: itemTypes,
            parryTooltip: this.actor.getPTTooltip('parry'),
            toughnessTooltip: this.actor.getPTTooltip('toughness'),
            armorTooltip: this.actor.getArmorTooltip(),
            skills: await this.#getSkillsForDisplay(),
            powers: this.#getPowers(),
            additionalStats: additionalStats,
            hasAdditionalStats: !foundry.utils.isEmpty(additionalStats),
            currentBennies: Array.fromRange(this.actor.bennies, 1),
            bennyImageURL: game.settings.get('swade', 'bennyImageSheet'),
            useAttributeShorts: game.settings.get('swade', 'useAttributeShorts'),
            sheetEffects: await this._getEffects(),
            enrichedText: await this._getEnrichedText(),
            settingrules: {
                conviction: game.settings.get('swade', 'enableConviction'),
                noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
                wealthType: game.settings.get('swade', 'wealthType'),
                currencyName: game.settings.get('swade', 'currencyName'),
                weightUnit: game.settings.get('swade', 'weightUnit') === 'imperial'
                    ? 'lbs'
                    : 'kg',
            },
            advances: {
                expanded: this.actor.system.advances.mode === 'expanded',
                list: await this.#getAdvances(),
            },
            // Putting this at the end because of race condition for grandchild updates
            attributes: this.#getAttributesForDisplay(),
            wealthDieTypes: this.#getWealthDieTypes(),
        };
        return { ...(await super.getData(options)), ...data };
    }
    async _render(...args) {
        await super._render(...args);
        for (const accordion of Object.values(this._accordions)) {
            if (accordion.open && accordion.object.el) {
                await this.#onOpenAccordion(accordion.object.el);
                accordion.object.el.open = true;
            }
        }
    }
    _onDragStart(event) {
        const currentTarget = event.currentTarget;
        if (currentTarget.classList.contains('attribute')) {
            return this._onDragAttribute(event);
        }
        super._onDragStart(event);
    }
    _onDragAttribute(event) {
        const btn = event.currentTarget.querySelector('button');
        event.dataTransfer?.setData('text/plain', JSON.stringify({
            type: 'Attribute',
            uuid: this.actor.uuid,
            attribute: btn?.dataset.attribute,
        }));
    }
    async _onDropItem(event, data) {
        if (!this.actor.isOwner)
            return false;
        const item = (await Item.fromDropData(data));
        if (!item)
            return false;
        const itemData = item.toObject();
        //handle relative item sorting
        if (this.actor.uuid === item.parent?.uuid) {
            return this._onSortItem(event, itemData);
        }
        //handle keyboard modifiers on drop for physical items.
        if (item.isPhysicalItem) {
            this._handleDropModifierKeys(event, itemData);
        }
        return this._onDropItemCreate(itemData);
    }
    async _onDropItemCreate(itemData) {
        const items = await super._onDropItemCreate(itemData);
        const typesToRender = ['power', 'skill'];
        for (const item of items) {
            if (typesToRender.includes(item.type))
                item.sheet?.render(true);
        }
        return items;
    }
    _handleDropModifierKeys(event, item) {
        const key = 'system.equipStatus';
        if (event.shiftKey) {
            if (item.type === 'weapon') {
                foundry.utils.setProperty(item, key, constants$1.EQUIP_STATE.MAIN_HAND);
            }
            else if (foundry.utils.getProperty(item, 'system.equippable')) {
                foundry.utils.setProperty(item, key, constants$1.EQUIP_STATE.EQUIPPED);
            }
        }
        else if (event.ctrlKey) {
            foundry.utils.setProperty(item, key, constants$1.EQUIP_STATE.CARRIED);
        }
        else if (event.altKey) {
            foundry.utils.setProperty(item, key, constants$1.EQUIP_STATE.STORED);
        }
    }
    /** Extend and override the sheet header buttons */
    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        // Document Tweaks
        if (this.options.editable && this.actor.isOwner) {
            const tweaks = {
                label: game.i18n.localize('SWADE.Tweaks'),
                class: 'configure-actor',
                icon: 'fa-solid fa-gears',
                onclick: () => new SwadeActorTweaks({ document: this.actor }).render({
                    force: true,
                }),
            };
            buttons = [tweaks, ...buttons];
        }
        return buttons;
    }
    _toggleItem(doc, toggle) {
        const oldVal = !!foundry.utils.getProperty(doc, toggle);
        return { [toggle]: !oldVal };
    }
    async _chooseItemType(choices) {
        if (!choices) {
            choices = {
                weapon: game.i18n.localize('TYPES.Item.weapon'),
                armor: game.i18n.localize('TYPES.Item.armor'),
                shield: game.i18n.localize('TYPES.Item.shield'),
                gear: game.i18n.localize('TYPES.Item.gear'),
                effect: 'Active Effect',
            };
        }
        const templateData = {
            types: choices,
            hasTypes: true,
            name: game.i18n.format('DOCUMENT.New', {
                type: game.i18n.localize('DOCUMENT.Item'),
            }),
        }, dlg = await foundry.applications.handlebars.renderTemplate('templates/sidebar/document-create.html', templateData);
        //Create Dialog window
        return new Promise((resolve) => {
            foundry.applications.api.DialogV2.wait({
                window: {
                    title: game.i18n.format('DOCUMENT.Create', {
                        type: game.i18n.localize('DOCUMENT.Item'),
                    }),
                },
                content: dlg,
                buttons: [
                    {
                        action: 'ok',
                        label: 'OK',
                        icon: '<i class="fas fa-check"></i>',
                        default: true,
                        callback: (_event, button) => {
                            const html = button.form;
                            resolve({
                                type: html.querySelector('select[name="type"]')?.value,
                                name: html.querySelector('input[name="name"]')
                                    ?.value,
                            });
                        },
                    },
                    {
                        action: 'cancel',
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('Cancel'),
                    },
                ],
            });
        });
    }
    async _createActiveEffect(data = {
        name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
        }),
    }, renderSheet = true) {
        return getDocumentClass('ActiveEffect').create(data, {
            renderSheet: renderSheet,
            parent: this.actor,
        });
    }
    async _getEnrichedText() {
        return {
            appearance: await this.#enrichText(this.actor.system.details.appearance),
            goals: await this.#enrichText(this.actor.system.details.goals),
            biography: await this.#enrichText(this.actor.system.details.biography.value),
            notes: await this.#enrichText(this.actor.system.details.notes),
            advances: await this.#enrichText(this.actor.system.advances.details),
        };
    }
    async _getEffects() {
        const temporary = new Array();
        const permanent = new Array();
        const favorite = new Array();
        for (const effect of this.actor.allApplicableEffects()) {
            const val = {
                id: effect.id,
                name: effect.name,
                img: effect.img,
                disabled: effect.disabled,
                description: effect.description,
                favorite: effect.system.favorite ?? false,
            };
            if (effect.parent !== this.actor) {
                val.origin = effect.sourceName; // legacy inclusion to maintain NPC/Vehicle sheets until they can be upgraded
                val.source = {
                    // modern character sheet style supporting v11 non-transferred Active Effects
                    name: effect.parent.name,
                    id: effect.parent.id,
                };
            }
            if (effect.isTemporary) {
                if (effect.duration.type === 'turns') {
                    val.duration = {
                        expiration: effect.expirationText, // constants.STATUS_EFFECT_EXPIRATION
                        rounds: effect.duration.rounds,
                        startRound: effect.duration.startRound,
                        startTurn: effect.duration.startTurn,
                        remaining: effect.duration.remaining,
                        label: effect.duration.label,
                    };
                }
                temporary.push(val);
            }
            else {
                permanent.push(val);
            }
            if (val.favorite) {
                val.tooltip = val.hasOwnProperty('source')
                    ? game.i18n.localize('SWADE.ActiveEffects.Source') +
                        ': ' +
                        val.source.name
                    : '';
                favorite.push(val);
            }
        }
        return { temporary, permanent, favorite };
    }
    async _handleItemActions(ev) {
        const button = ev.currentTarget;
        const action = button.dataset.action;
        const itemId = button.closest('.chat-card.item-card')?.dataset.itemId;
        const item = this.actor.items.get(itemId, { strict: true });
        const additionalMods = new Array();
        const ppToAdjust = button
            .closest('.chat-card.item-card')
            ?.querySelector('input.pp-adjust')?.value;
        const arcaneDevicePPToAdjust = button
            .closest('.chat-card.item-card')
            ?.querySelector('input.arcane-device-pp-adjust')?.value;
        //if it's a power and the No Power Points rule is in effect
        if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
            let modifier = Math.ceil(parseInt(ppToAdjust, 10) / 2);
            modifier = Math.min(modifier * -1, modifier);
            const actionObj = foundry.utils.getProperty(item, `system.actions.additional.${action}.traitOverride`);
            //filter down further to make sure we only apply the penalty to a trait roll
            if (action === 'formula' ||
                actionObj?.type === constants$1.ACTION_TYPE.TRAIT) {
                additionalMods.push({
                    label: game.i18n.localize('TYPES.Item.power'),
                    value: modifier.signedString(),
                });
            }
        }
        else if (action === 'pp-adjust') {
            //handle Power Item Card PP adjustment
            const adjustment = button.getAttribute('data-adjust');
            const power = this.actor.items.get(itemId, { strict: true });
            const arcane = foundry.utils.getProperty(power, 'system.arcane') || 'general';
            const key = `system.powerPoints.${arcane}.value`;
            let newPP = foundry.utils.getProperty(this.actor, key);
            if (adjustment === 'plus') {
                newPP += parseInt(ppToAdjust, 10);
            }
            else if (adjustment === 'minus') {
                newPP -= parseInt(ppToAdjust, 10);
            }
            await this.actor.update({ [key]: newPP });
        }
        else if (action === 'arcane-device-pp-adjust') {
            //handle Arcane Device Item Card PP adjustment
            const adjustment = button.getAttribute('data-adjust');
            const item = this.actor.items.get(itemId);
            const key = 'system.powerPoints.value';
            let newPP = foundry.utils.getProperty(item, key);
            if (adjustment === 'plus') {
                newPP += parseInt(arcaneDevicePPToAdjust, 10);
            }
            else if (adjustment === 'minus') {
                newPP -= parseInt(arcaneDevicePPToAdjust, 10);
            }
            await item.update({ [key]: newPP });
        }
        else if (action === 'template') {
            //Handle template placement
            const template = button.dataset.template;
            SwadeMeasuredTemplate.fromPreset(template, item);
        }
        else {
            ItemChatCardHelper.handleAction(item, this.actor, action, {
                additionalMods,
                event: ev,
            });
        }
    }
    async _inlineItemCreate(button) {
        const type = button.dataset.type;
        // item creation helper func
        const createItem = (type, name) => {
            const itemData = {
                name: name ?? SwadeItem.defaultName({ type, parent: this.actor }),
                type: type,
                system: Object.assign({}, button.dataset),
            };
            delete itemData.system.type;
            return itemData;
        };
        switch (type) {
            case 'choice':
                this._chooseItemType().then(async (dialogInput) => {
                    if (dialogInput.type === 'effect') {
                        this._createActiveEffect({ name: dialogInput.name });
                    }
                    else {
                        const itemData = createItem(dialogInput.type, dialogInput.name);
                        await CONFIG.Item.documentClass.create(itemData, {
                            renderSheet: true,
                            parent: this.actor,
                        });
                    }
                });
                break;
            case 'advance':
                this.#addAdvance();
                break;
            default:
                await CONFIG.Item.documentClass.create(createItem(type), {
                    renderSheet: true,
                    parent: this.actor,
                });
                break;
        }
    }
    /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
     * @param {Event} event  Triggering event.
     */
    _onChangeInputDelta(event) {
        const input = event.target;
        const value = input.value;
        if (['+', '-'].includes(value[0])) {
            const delta = parseInt(value, 10);
            input.value = foundry.utils.getProperty(this.actor, input.name) + delta;
        }
        else if (value[0] === '=') {
            input.value = value.slice(1);
        }
    }
    async _toggleStatusEffect(ev) {
        const key = ev.target.dataset.key;
        // this is just to make sure the status is false in the source data
        await this.actor.update({ [`system.status.${key}`]: false });
        await this.actor.toggleActiveEffect(ev.target.dataset.id);
    }
    async _handleCounterAdjust(ev) {
        const target = ev.currentTarget;
        const action = target.dataset.action;
        switch (action) {
            case 'fatigue-plus':
                await this.actor.update({
                    'system.fatigue.value': this.actor.system.fatigue.value + 1,
                });
                break;
            case 'fatigue-minus':
                await this.actor.update({
                    'system.fatigue.value': Math.max(0, this.actor.system.fatigue.value - 1),
                });
                break;
            case 'wounds-plus':
                await this.actor.update({
                    'system.wounds.value': this.actor.system.wounds.value + 1,
                });
                break;
            case 'wounds-minus':
                await this.actor.update({
                    'system.wounds.value': Math.max(0, this.actor.system.wounds.value - 1),
                });
                break;
            case 'spend-benny':
                await this.actor.spendBenny();
                break;
            case 'get-benny':
                await this.actor.getBenny();
                break;
            case 'pp-refresh': {
                const arcane = target.dataset.arcane;
                const key = `system.powerPoints.${arcane}.value`;
                const currentPP = foundry.utils.getProperty(this.actor, key);
                const maxPP = foundry.utils.getProperty(this.actor, `system.powerPoints.${arcane}.max`);
                if (currentPP >= maxPP)
                    return;
                await this.actor.update({ [key]: Math.min(currentPP + 5, maxPP) });
                break;
            }
            default:
                throw new Error('Unknown action!');
        }
    }
    async #addAdvance() {
        if (this.actor.type === 'vehicle')
            return;
        const advances = this.actor.system.advances.list;
        const newAdvance = {
            id: foundry.utils.randomID(8),
            type: constants$1.ADVANCE_TYPE.EDGE,
            sort: advances.size + 1,
            planned: false,
            notes: '',
        };
        advances.set(newAdvance.id, newAdvance);
        await this.actor.update({ 'system.advances.list': advances.toJSON() });
        new AdvanceEditor({
            advance: newAdvance,
            actor: this.actor,
        }).render({ force: true });
    }
    async #deleteAdvance(id) {
        if (this.actor.type === 'vehicle')
            return;
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('SWADE.Advances.Delete'),
            },
            content: `<form>
        <div style="text-align: center;">
          <p>${game.i18n.localize('SWADE.DialogConfirmPrompt')}</p>
        </div>
      </form>`,
            yes: {
                default: true,
                callback: () => {
                    if (this.actor.type === 'vehicle')
                        return;
                    const advances = this.actor.system.advances.list;
                    advances.delete(id);
                    const arr = advances.toJSON();
                    arr.forEach((a, i) => (a.sort = i + 1));
                    this.actor.update({ 'system.advances.list': arr });
                },
            },
            no: {
                default: false,
            },
        });
    }
    async #toggleAdvancePlanned(id) {
        if (this.actor.type === 'vehicle')
            return;
        foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('SWADE.Advances.Toggle'),
            },
            content: `<form>
        <div style="text-align: center;">
          <p>${game.i18n.localize('SWADE.DialogConfirmPrompt')}</p>
        </div>
      </form>`,
            yes: {
                default: true,
                callback: async () => {
                    if (this.actor.type === 'vehicle')
                        return;
                    const advances = this.actor.system.advances.list;
                    const advance = advances.get(id, { strict: true });
                    advance.planned = !advance.planned;
                    advances.set(id, advance);
                    await this.actor.update({ 'system.advances.list': advances.toJSON() }, { diff: false });
                },
            },
            no: {
                default: false,
            },
        });
    }
    async #getAdvances() {
        if (this.actor.type === 'vehicle')
            return [];
        const retVal = new Array();
        const advances = this.actor.system.advances.list;
        for (const advance of advances) {
            advance.enrichedNotes = await this.#enrichText(advance.notes);
            const sort = advance.sort;
            const rankIndex = getRankFromAdvance(advance.sort);
            const rank = getRankFromAdvanceAsString(sort);
            if (!retVal[rankIndex]) {
                retVal.push({
                    rank: rank,
                    list: [],
                });
            }
            retVal[rankIndex].list.push(advance);
        }
        return retVal;
    }
    async #enrichText(text) {
        return foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
            relativeTo: this.actor,
            rollData: this.actor.getRollData(),
            secrets: this.document.isOwner,
        });
    }
    #disableOverrides(html) {
        const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
        const disabledText = game.i18n.localize('SWADE.disabledAE');
        for (const override of Object.keys(flatOverrides)) {
            html.querySelectorAll(`[name="${override}"]`).forEach((input) => {
                input.disabled = true;
                if (input.dataset.tooltip) {
                    input.dataset.tooltip += '<br>' + disabledText;
                }
                else
                    input.dataset.tooltip = disabledText;
            });
        }
    }
    #getAdditionalStats() {
        const stats = structuredClone(this.actor.system.additionalStats);
        const options = game.settings.get('swade', 'settingFields').actor;
        for (const [key, attr] of Object.entries(stats)) {
            if (!options[key] || !attr.dtype) {
                delete stats[key];
                continue;
            }
            if (attr.dtype === 'Selection') {
                const optionString = options[key]?.optionString ?? '';
                attr.options = optionString
                    .split(';')
                    .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
            }
        }
        return stats;
    }
    #getPowers() {
        //Deal with ABs and Powers
        const arcaneBackgrounds = {};
        for (const power of this.actor.itemTypes.power) {
            const ab = power.system.arcane || 'general';
            if (!arcaneBackgrounds[ab]) {
                arcaneBackgrounds[ab] = {
                    valuePath: `system.powerPoints.${ab}.value`,
                    value: foundry.utils.getProperty(this.actor, `system.powerPoints.${ab}.value`),
                    maxPath: `system.powerPoints.${ab}.max`,
                    max: foundry.utils.getProperty(this.actor, `system.powerPoints.${ab}.max`),
                    powers: [],
                };
            }
            arcaneBackgrounds[ab].powers.push(power);
        }
        //sort the powers by their sort value
        for (const entry of Object.values(arcaneBackgrounds)) {
            entry.powers.sort((a, b) => a.sort - b.sort);
        }
        const hasPowersWithoutArcane = arcaneBackgrounds?.general?.powers.length > 0;
        const showGeneral = hasPowersWithoutArcane || game.settings.get('swade', 'alwaysGeneralPP');
        return {
            arcaneBackgrounds,
            hasPowersWithoutArcane,
            showGeneral,
        };
    }
    #getAttributesForDisplay() {
        if (this.actor.type === 'vehicle')
            throw Error();
        const attributes = {};
        const globals = this.actor?.system.stats.globalMods;
        for (const key in this.actor.system.attributes) {
            const attr = this.actor.system.attributes[key];
            const mods = [
                {
                    label: game.i18n.localize('SWADE.TraitMod'),
                    value: attr.die.modifier,
                },
                ...attr.effects,
                ...globals[key],
                ...globals.trait,
            ].filter((m) => m.ignore !== true);
            let tooltip = `<strong>${game.i18n.localize(SWADE.attributes[key].long)}</strong>`;
            if (mods.length) {
                tooltip += `<ul style="text-align:start;">${mods
                    .map(({ label, value }) => {
                    const mapped = typeof value === 'number' ? value.signedString() : value;
                    return `<li>${label}: ${mapped}</li>`;
                })
                    .join('')}</ul>`;
            }
            attributes[key] = {
                die: attr.die.sides,
                modifier: mods.reduce(addUpModifiers, 0),
                tooltip,
            };
        }
        return attributes;
    }
    async #getSkillsForDisplay() {
        const globals = this.actor?.system.stats.globalMods;
        const skills = [];
        for (const skill of this.actor.items.filter((i) => i.type === 'skill')) {
            const attribute = skill.system.attribute;
            const mods = [
                {
                    label: game.i18n.localize('SWADE.TraitMod'),
                    value: skill.system.die.modifier,
                },
                ...skill.system.effects,
                ...(globals[attribute] ?? []),
                ...globals.trait,
            ].filter((m) => m.ignore !== true);
            let tooltip = `<strong>${skill.name}</strong>`;
            if (mods.length) {
                tooltip += `<ul style="text-align:start;">${mods
                    .map(({ label, value }) => {
                    const mapped = typeof value === 'number' ? value.signedString() : value;
                    return `<li>${label}: ${mapped}</li>`;
                })
                    .join('')}</ul>`;
            }
            skills.push({
                label: skill.name,
                img: skill.img,
                die: skill.system.die.sides,
                description: await this.#enrichText(skill.system.description),
                modifier: mods.reduce(addUpModifiers, 0),
                isCoreSkill: skill.system.isCoreSkill,
                isOwner: skill.isOwner,
                id: skill.id,
                attribute,
                tooltip,
            });
        }
        return skills.sort((a, b) => a.label.localeCompare(b.label));
    }
    #getWealthDieTypes() {
        const options = getDieSidesRange(4, 12);
        options.unshift({ key: 0, label: 'SWADE.WealthDie.Broke.Label' });
        return options;
    }
    #setupEquipStatusMenu(html) {
        const items = [
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.Stored'),
                icon: '<i class="fas fa-archive"></i>',
                condition: true,
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.STORED);
                },
            },
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.Carried'),
                icon: '<i class="fas fa-shopping-bag"></i>',
                condition: true,
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.CARRIED);
                },
            },
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.Equipped'),
                icon: '<i class="fas fa-tshirt"></i>',
                condition: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    if (item.type === 'gear')
                        return item.system.equippable;
                    return !['weapon', 'consumable'].includes(item.type);
                },
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.EQUIPPED);
                },
            },
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.OffHand'),
                icon: '<i class="fas fa-hand-paper"></i>',
                condition: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    return item.type === 'weapon';
                },
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.OFF_HAND);
                },
            },
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.MainHand'),
                icon: '<i class="fas fa-hand-paper fa-flip-horizontal"></i>',
                condition: (i) => {
                    const id = i.closest('.item').dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    return item.type === 'weapon';
                },
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.MAIN_HAND);
                },
            },
            {
                name: game.i18n.localize('SWADE.ItemEquipStatus.TwoHands'),
                icon: '<i class="fas fa-sign-language"></i>',
                condition: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    return item.type === 'weapon';
                },
                callback: (i) => {
                    const id = i.closest('.item')?.dataset.itemId;
                    const item = this.actor.items.get(id, { strict: true });
                    item.setEquipState(constants$1.EQUIP_STATE.TWO_HANDS);
                },
            },
        ];
        const selector = ' .inventory .item-controls .equip-status';
        const options = { eventName: 'click', jQuery: false, fixed: true };
        this._equipStateMenu =
            new foundry.applications.ux.ContextMenu.implementation(html, selector, items, options);
    }
    #setupEffectCreateMenu(html) {
        this._effectCreateDropDown =
            new foundry.applications.ux.ContextMenu.implementation(html, '.effects .effect-add', [
                {
                    name: 'SWADE.ActiveEffects.AddGuided',
                    icon: '<i class="fa-solid fa-hat-wizard"></i>',
                    condition: this.object.isOwner,
                    callback: (_li) => {
                        new ActiveEffectWizard({ document: this.object }).render({
                            force: true,
                        });
                    },
                },
                {
                    name: 'SWADE.ActiveEffects.AddUnguided',
                    icon: '<i class="fa-solid fa-file-plus"></i>',
                    condition: this.object.isOwner,
                    callback: (_li) => {
                        this._createActiveEffect();
                    },
                },
            ], { eventName: 'click', jQuery: false });
    }
    #setupItemContextMenu(html) {
        const items = [
            {
                name: 'SWADE.Reload',
                icon: '<i class="fa-solid fa-right-to-bracket"></i>',
                condition: (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    return (item?.type === 'weapon' &&
                        !!item.system.shots &&
                        game.settings.get('swade', 'ammoManagement'));
                },
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.reload(),
            },
            {
                name: 'SWADE.RemoveAmmo',
                icon: '<i class="fa-solid fa-right-from-bracket"></i>',
                condition: (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    const isWeapon = item?.type === 'weapon';
                    const loadedAmmo = item?.getFlag('swade', 'loadedAmmo');
                    return (isWeapon &&
                        !!loadedAmmo &&
                        item.usesAmmoFromInventory &&
                        (item.system.reloadType === constants$1.RELOAD_TYPE.MAGAZINE ||
                            item.system.reloadType === constants$1.RELOAD_TYPE.BATTERY));
                },
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.removeAmmo(),
            },
            {
                name: 'SWADE.Ed',
                icon: '<i class="fa-solid fa-edit"></i>',
                callback: (i) => {
                    const itemId = i.dataset.itemId;
                    const effectId = i.dataset.effectId;
                    if (itemId)
                        this.actor.items.get(itemId)?.sheet?.render(true);
                    if (effectId) {
                        const allEffects = Array.from(this.actor.allApplicableEffects());
                        allEffects
                            .find((ef) => ef.id === effectId)
                            ?.sheet?.render({ force: true });
                    }
                },
            },
            {
                name: 'SWADE.Duplicate',
                icon: '<i class="fa-solid fa-copy"></i>',
                condition: (i) => !!this.actor.items.get(i.dataset.itemId)?.isPhysicalItem,
                callback: async (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    const cloned = await item?.clone({ name: game.i18n.format('DOCUMENT.CopyOf', { name: item.name }) }, { save: true });
                    cloned?.sheet?.render(true);
                },
            },
            {
                name: 'SWADE.Del',
                icon: '<i class="fa-solid fa-trash"></i>',
                callback: (i) => {
                    const itemId = i.dataset.itemId;
                    const effectId = i.dataset.effectId;
                    if (itemId)
                        this.actor.items.get(itemId)?.deleteDialog();
                    if (effectId) {
                        const allEffects = Array.from(this.actor.allApplicableEffects());
                        allEffects.find((ef) => ef.id === effectId)?.deleteDialog();
                    }
                },
            },
        ];
        foundry.applications.ux.ContextMenu.implementation.create(this, html, 'li.item', items, { jQuery: false });
    }
    #setupAccordions(html) {
        const elements = html.querySelectorAll('details[data-collapsible-id]');
        for (const el of elements) {
            const id = el.dataset.collapsibleId;
            if (!id)
                continue;
            this._accordions[id] = {
                ...this._accordions[id],
                object: new Accordion(el, '.content', {
                    onOpen: (details) => {
                        this.#onOpenAccordion(details);
                        this._accordions[id].open = true;
                    },
                    onClose: () => (this._accordions[id].open = false),
                }),
            };
        }
    }
    async #onOpenAccordion(element) {
        if (element.dataset.enriched === 'true')
            return;
        const docId = element.closest('li')?.dataset.itemId ??
            element.closest('li')?.dataset.effectId;
        if (!docId)
            return;
        const doc = this.actor.items.get(docId) ??
            Array.from(this.actor.allApplicableEffects()).find((e) => e.id === docId);
        const text = doc instanceof SwadeItem ? doc?.system?.description : doc?.description;
        if (!text)
            return;
        element.querySelector('.content .description, .content.description').innerHTML = await this.#enrichText(text);
        element.setAttribute('data-enriched', true.toString());
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1 } = foundry.applications.api;
function SwadeBaseSheetMixin(Base) {
    return class SwadeBaseSheet extends HandlebarsApplicationMixin$1(Base) {
        static DEFAULT_OPTIONS = {
            classes: ['swade'],
            form: {
                submitOnChange: true,
                closeOnSubmit: false,
            },
            actions: {
                editImg: { handler: SwadeBaseSheet._onEditImage, buttons: [0, 2] },
                openAegis: SwadeBaseSheet._openAegis,
            },
        };
        static TABS = {};
        static async _onEditImage(event, _target) {
            if (!this.document.img)
                return;
            if (event.button === 2) {
                //ContextMenu event
                if (!this.document.img)
                    return;
                new ImagePopout(this.document.img, {
                    title: this.document.name,
                    shareable: this.document.isOwner ?? game.user?.isGM,
                    uuid: this.document.uuid,
                }).render(true);
            }
            else {
                const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
                const fp = new FilePicker({
                    current: this.document.img,
                    type: 'image',
                    redirectToRoot: img ? [img] : [],
                    callback: (path) => this.document.update({ img: path }),
                    top: this.position.top + 40,
                    left: this.position.left + 10,
                });
                await fp.browse();
            }
        }
        static async _openAegis(_event, _target) {
            new ActiveEffectWizard({ document: this.document }).render({
                force: true,
            });
        }
        // This is marked as private because there's no real need
        // for subclasses or external hooks to mess with it directly
        #dragDrop;
        /** Returns an array of DragDrop instances */
        get dragDrop() {
            return this.#dragDrop;
        }
        tabGroups = {};
        constructor(options) {
            super(options);
            this.#dragDrop = this.#createDragDropHandlers();
        }
        async _prepareContext(options) {
            const context = await super._prepareContext(options);
            return foundry.utils.mergeObject(context, {
                tabs: this._getTabs(),
                document: this.document,
            });
        }
        _preSyncPartState(partId, newElement, priorElement, state) {
            super._preSyncPartState(partId, newElement, priorElement, state);
            state.collapsibles = {};
            const collapsibles = priorElement.querySelectorAll('details');
            for (const details of collapsibles) {
                const id = details.dataset.summaryId;
                if (!id)
                    continue;
                state.collapsibles[id] = details.open;
            }
        }
        _syncPartState(partId, newElement, priorElement, state) {
            super._syncPartState(partId, newElement, priorElement, state);
            const collapsibles = newElement.querySelectorAll('details');
            for (const details of collapsibles) {
                const id = details.dataset.summaryId ?? '';
                if (id in state.collapsibles) {
                    details.open = state.collapsibles[id];
                }
            }
        }
        _onFirstRender(context, options) {
            super._onFirstRender(context, options);
            const collapsibles = this.element.querySelectorAll('details');
            for (const details of collapsibles) {
                details.open = true;
            }
        }
        /**
         * Actions performed after any render of the Application.
         * Post-render steps are not awaited by the render process.
         * @param context Prepared context data
         * @param options Provided render options
         */
        _onRender(context, options) {
            super._onRender(context, options);
            this.#dragDrop.forEach((d) => d.bind(this.element));
            this.#disableOverrides();
            this.element.querySelectorAll('details').forEach((el) => {
                new Accordion(el, '.content', { duration: 200 });
            });
        }
        /**
         * Define whether a user is able to begin a dragstart workflow for a given drag selector
         * @param selector The candidate HTML selector for dragging
         * @returns Can the current user drag this selector?
         */
        _canDragStart(_selector) {
            return this.isEditable;
        }
        /**
         * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
         * @param selector  The candidate HTML selector for the drop target
         * @returns Can the current user drop on this selector?
         */
        _canDragDrop(_selector) {
            return this.isEditable;
        }
        /**
         * Callback actions which occur at the beginning of a drag start workflow.
         * @param event The originating DragEvent
         */
        _onDragStart(event) {
            const docRow = event.currentTarget.closest('li');
            if ('link' in event.target.dataset)
                return;
            if (!docRow)
                return;
            // Chained operation
            const dragData = this._getEmbeddedDocument(docRow)?.toDragData();
            if (!dragData)
                return;
            // Set data transfer
            event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
        }
        /**
         * Callback actions which occur when a dragged element is over a drop target.
         * @param event The originating DragEvent
         */
        _onDragOver(_event) { }
        async _onDrop(_event) { }
        /**
         * Fetches the embedded document representing the containing HTML element
         * @param target  The element subject to search
         * @returns The embedded Item or ActiveEffect
         */
        _getEmbeddedDocument(target) {
            const docRow = target.closest('li[data-document-class]');
            if (!docRow)
                return;
            // TODO: Once `this.document` correctly resolves this will throw more type errors
            if (docRow.dataset.documentClass === 'Item') {
                return this.document.items.get(docRow.dataset.itemId);
            }
            else if (docRow.dataset.documentClass === 'ActiveEffect') {
                const parent = docRow.dataset.parentId === this.document.id
                    ? this.document
                    : this.document.items.get(docRow?.dataset.parentId);
                return parent.effects.get(docRow?.dataset.effectId);
            }
            else
                return console.warn('Could not find document class');
        }
        /**
         * Utility method for _prepareContext to create the tab navigation.
         */
        _getTabs() {
            return Object.values(this.constructor.TABS).reduce((acc, v) => {
                const isActive = this.tabGroups[v.group] === v.id;
                acc[v.id] = {
                    ...v,
                    active: isActive,
                    cssClass: isActive ? 'active' : '',
                    tabCssClass: isActive ? 'tab scrollable active' : 'tab scrollable',
                };
                return acc;
            }, {});
        }
        /**
         * Create drag-and-drop workflow handlers for this Application
         * @returns An array of DragDrop handlers
         */
        #createDragDropHandlers() {
            return (this.options.dragDrop ?? []).map((d) => {
                d.permissions = {
                    dragstart: this._canDragStart.bind(this),
                    drop: this._canDragDrop.bind(this),
                };
                d.callbacks = {
                    dragstart: this._onDragStart.bind(this),
                    dragover: this._onDragOver.bind(this),
                    drop: this._onDrop.bind(this),
                };
                return new DragDrop(d);
            });
        }
        /*Disables inputs subject to active effects*/
        #disableOverrides() {
            const flatOverrides = foundry.utils.flattenObject(this.document.overrides ?? {});
            for (const override of Object.keys(flatOverrides)) {
                const input = this.element.querySelector(`[name="${override}"]`);
                if (input)
                    input.disabled = true;
            }
        }
    };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
class SwadeActorSheetV2 extends SwadeBaseSheetMixin(ActorSheetV2) {
    // declare element: HTMLFormElement;
    static DEFAULT_OPTIONS = {
        classes: ['actor'],
        dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
        window: {
            controls: [
                // v12 bug requires redefining existing window controls due to the array overwriting instead of merging
                {
                    icon: 'fa-solid fa-gears',
                    label: 'SWADE.Tweaks',
                    action: 'openTweaks',
                },
                {
                    action: 'configurePrototypeToken',
                    icon: 'fa-solid fa-user-circle',
                    label: 'TOKEN.TitlePrototype',
                    ownership: 'OWNER',
                },
                {
                    action: 'showPortraitArtwork',
                    icon: 'fa-solid fa-image',
                    label: 'SIDEBAR.CharArt',
                    ownership: 'OWNER',
                },
                {
                    action: 'showTokenArtwork',
                    icon: 'fa-solid fa-image',
                    label: 'SIDEBAR.TokenArt',
                    ownership: 'OWNER',
                },
            ],
        },
        actions: {
            createDocument: SwadeActorSheetV2.createEmbeddedDocument,
            showItem: SwadeActorSheetV2.showItem,
            openItem: SwadeActorSheetV2.openItem,
            deleteItem: SwadeActorSheetV2.deleteItem,
            openEffect: SwadeActorSheetV2.openItem,
            deleteEffect: SwadeActorSheetV2.deleteItem,
            toggleEffect: SwadeActorSheetV2.toggleEffect,
            openTweaks: SwadeActorSheetV2.openTweaks,
            rollAdditionalStat: SwadeActorSheetV2.rollAdditionalStat,
        },
    };
    static async createEmbeddedDocument(event, target) {
        event.preventDefault(); // helps buttons in the headers of <details> elements
        const documentClass = getDocumentClass(target.dataset.documentClass);
        const docData = {
            name: documentClass.defaultName({
                type: target.dataset.type,
                parent: this.actor,
            }),
        };
        // Loop through the dataset and add it to our docData
        for (const [dataKey, value] of Object.entries(target.dataset)) {
            // These data attributes are reserved for the action handling
            if (['action', 'documentClass', 'renderSheet'].includes(dataKey))
                continue;
            // Nested properties use dot notation like `data-system.prop`
            foundry.utils.setProperty(docData, dataKey, value);
        }
        await documentClass.create(docData, {
            parent: this.actor,
            renderSheet: target.dataset.renderSheet,
        });
    }
    static showItem(_event, target) {
        this._getEmbeddedDocument(target)?.show();
    }
    static openItem(_event, target) {
        this._getEmbeddedDocument(target)?.sheet?.render(true);
    }
    static async deleteItem(_event, target) {
        this._getEmbeddedDocument(target)?.deleteDialog();
    }
    static openEffect(_event, target) {
        this._getEmbeddedDocument(target)?.sheet?.render(true);
    }
    static async deleteEffect(_event, target) {
        this._getEmbeddedDocument(target)?.deleteDialog();
    }
    static async toggleEffect(_event, target) {
        const effect = this._getEmbeddedDocument(target);
        effect.update({ disabled: !effect.disabled });
    }
    static async openTweaks(_event, _target) {
        new SwadeActorTweaks({ document: this.document }).render({ force: true });
    }
    static async rollAdditionalStat(_event, target) {
        await this.actor.system.rollAdditionalStat(target.dataset.stat);
    }
    async _prepareContext(options) {
        const context = {
            //add the game user
            user: game.user,
            // Validates both permissions and compendium status
            editable: this.isEditable,
            owner: this.isOwner,
            limited: this.document.limited,
            // Add the actor document.
            actor: this.actor,
            items: Array.from(this.actor.items.values()).sort((a, b) => a.sort - b.sort),
            // Add the actor's data to context.data for easier access, as well as flags.
            system: this.actor.system,
            flags: this.actor.flags,
            // Adding a pointer to CONFIG.SWADE
            config: CONFIG.SWADE,
        };
        return foundry.utils.mergeObject(await super._prepareContext(options), context);
    }
    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param event The originating DragEvent
     */
    async _onDrop(event) {
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        const actor = this.actor;
        const allowed = Hooks.call('dropActorSheetData', actor, this, data);
        if (allowed === false)
            return;
        // Handle different data types
        switch (data['type']) {
            case 'ActiveEffect':
                await this._onDropActiveEffect(event, data);
                break;
            case 'Actor':
                await this._onDropActor(event, data);
                break;
            case 'Item':
                await this._onDropItem(event, data);
                break;
            case 'Folder':
                await this._onDropFolder(event, data);
                break;
        }
    }
    /**
     * Handle the dropping of ActiveEffect data onto an Actor Sheet
     * @param event The concluding DragEvent which contains drop data
     * @param data  The data transfer extracted from the event
     * @returns The created ActiveEffect object or false if it couldn't be created.
     */
    async _onDropActiveEffect(event, data) {
        const aeCls = getDocumentClass('ActiveEffect');
        const effect = await aeCls.fromDropData(data);
        if (!this.actor.isOwner || !effect)
            return false;
        if (effect.target === this.actor)
            return this._onSortActiveEffect(event, effect);
        return aeCls.create(effect, { parent: this.actor });
    }
    /**
     * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
     */
    async _onSortActiveEffect(event, effect) {
        const dropTarget = event.target?.closest('[data-effect-id]');
        if (!dropTarget)
            return;
        const target = this._getEmbeddedDocument(dropTarget);
        if (!target)
            return;
        // Don't sort on yourself
        if (effect.uuid === target.uuid)
            return;
        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (const el of dropTarget.parentElement.children) {
            const siblingId = el.dataset.effectId;
            const parentId = el.dataset.parentId;
            if (siblingId &&
                parentId &&
                (siblingId !== effect.id || parentId !== effect.parent?.id)) {
                const sibling = this._getEmbeddedDocument(el);
                if (sibling)
                    siblings.push(sibling);
            }
        }
        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(effect, {
            target,
            siblings,
        });
        // Split the updates up by parent document
        const directUpdates = [];
        const grandchildUpdateData = sortUpdates.reduce((items, u) => {
            const parentId = u.target.parent.id;
            const update = { _id: u.target.id, ...u.update };
            if (parentId === this.actor.id) {
                directUpdates.push(update);
                return items;
            }
            if (items[parentId])
                items[parentId].push(update);
            else
                items[parentId] = [update];
            return items;
        }, {});
        // Effects-on-items updates
        for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
            await this.actor.items
                .get(itemId)
                .updateEmbeddedDocuments('ActiveEffect', updates);
        }
        // Update on the main actor
        return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
    }
    /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param event The concluding DragEvent which contains drop data
     * @param data  The data transfer extracted from the event
     * @returns A data object which describes the result of the drop, or false if the drop was not permitted.
     */
    async _onDropActor(_event, _data) {
        return false;
    }
    /**
     * Handle dropping of an item reference or item data onto an Actor Sheet
     * @param event The concluding DragEvent which contains drop data
     * @param data  The data transfer extracted from the event
     * @returns The created or updated Item instances, or false if the drop was not permitted.
     */
    async _onDropItem(event, data) {
        if (!this.actor.isOwner)
            return false;
        const item = await Item.implementation.fromDropData(data);
        // Handle item sorting within the same Actor
        if (this.actor.uuid === item.parent?.uuid)
            return this._onSortItem(event, item);
        // Create the owned item
        return this._onDropItemCreate(item, event);
    }
    /**
     * Handle dropping of a Folder on an Actor Sheet.
     * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
     * @param event The concluding DragEvent which contains drop data
     * @param data  The data transfer extracted from the event
     */
    async _onDropFolder(event, data) {
        if (!this.actor.isOwner)
            return [];
        const folder = await getDocumentClass('Folder').fromDropData(data);
        if (folder.type !== 'Item')
            return [];
        const droppedItemData = await Promise.all(folder.contents.map(async (item) => {
            if (!(document instanceof Item))
                item = await fromUuid(item.uuid);
            return item;
        }));
        return this._onDropItemCreate(droppedItemData, event);
    }
    /**
     * Handle the final creation of dropped Item data on the Actor.
     * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
     * @param itemData  The item data requested for creation
     * @param event The concluding DragEvent which provided the drop data
     */
    async _onDropItemCreate(itemData, _event) {
        itemData = itemData instanceof Array ? itemData : [itemData];
        return this.actor.createEmbeddedDocuments('Item', itemData);
    }
    /**
     * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
     */
    _onSortItem(event, item) {
        // Get the drag source and drop target
        const items = this.actor.items;
        const dropTarget = event.target?.closest('[data-item-id]');
        if (!dropTarget)
            return;
        const target = items.get(dropTarget.dataset.itemId);
        // Don't sort on yourself
        if (item.id === target.id)
            return;
        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (const el of dropTarget.parentElement.children) {
            const siblingId = el.dataset.itemId;
            if (siblingId && siblingId !== item.id)
                siblings.push(items.get(el.dataset.itemId));
        }
        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(item, {
            target,
            siblings,
        });
        const updateData = sortUpdates.map((u) => {
            const update = u.update;
            update._id = u.target._id;
            return update;
        });
        // Perform the update
        return this.actor.updateEmbeddedDocuments('Item', updateData);
    }
}

class GroupSheet extends SwadeActorSheetV2 {
    static DEFAULT_OPTIONS = {
        classes: ['group', 'standard-form'],
        position: { height: 700, width: 700 },
        window: { resizable: true },
        actions: {
            deleteMember: GroupSheet.deleteMember,
            openMember: GroupSheet.openMember,
            showMemberImage: GroupSheet.showMemberImage,
            toggleLock: GroupSheet.toggleLock,
        },
    };
    static PARTS = {
        header: { template: 'systems/swade/templates/actors/group/header.hbs' },
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        stash: { template: 'systems/swade/templates/actors/group/tab-stash.hbs' },
        members: {
            template: 'systems/swade/templates/actors/group/tab-members.hbs',
        },
        supplies: {
            template: 'systems/swade/templates/actors/group/tab-supplies.hbs',
        },
        description: {
            template: 'systems/swade/templates/actors/group/tab-description.hbs',
        },
    };
    static TABS = {
        members: {
            id: 'members',
            group: 'primary',
            label: 'SWADE.Group.Sheet.Members.Header',
        },
        stash: {
            id: 'stash',
            group: 'primary',
            label: 'SWADE.Group.Sheet.Stash.Header',
        },
        supplies: {
            id: 'supplies',
            group: 'primary',
            label: 'SWADE.Supplies.Label',
        },
        description: { id: 'description', group: 'primary', label: 'SWADE.Desc' },
    };
    static async deleteMember(_event, target) {
        const id = target.closest('[data-member-uuid]')?.dataset.memberUuid;
        if (!id)
            return;
        if (!this.actor.system.members.has(id))
            return;
        const existing = Array.from(this.actor.system.members.keys()).map((v) => v.toString());
        const index = existing.indexOf(id);
        if (index < 0)
            return;
        const member = this.actor.system.members.get(id)?.actor;
        const name = member ? member.name : id;
        const type = game.i18n.localize('DOCUMENT.Actor');
        const proceed = await foundry.applications.api.DialogV2.confirm({
            rejectClose: false,
            window: {
                title: `${game.i18n.format('DOCUMENT.Delete', { type })}: ${name}`,
            },
            content: `<h3>${game.i18n.localize('AreYouSure')}</h3><p>${game.i18n.format('SWADE.DeleteFromParentWarning', { name, parent: this.actor.name })}</p>`,
        });
        if (!proceed)
            return;
        existing.splice(index, 1);
        await this.actor.update({ 'system.members': existing });
    }
    static openMember(_event, target) {
        const id = target.closest('[data-member-uuid]')?.dataset.memberUuid;
        if (!id)
            return;
        this.actor.system.members.get(id)?.actor?.sheet?.render(true);
    }
    static showMemberImage(_event, target) {
        const id = target.closest('[data-member-uuid]')?.dataset.memberUuid;
        if (!id)
            return;
        const actor = this.actor.system.members.get(id)?.actor;
        if (!actor)
            return;
        new ImagePopout(actor.img, {
            title: actor.name,
            shareable: actor.isOwner ?? game.user?.isGM,
            uuid: actor.uuid,
        }).render(true);
    }
    static toggleLock(_event, _target) {
        if (!game.user.isGM)
            return;
        this.actor.update({ 'system.locked': !this.actor.system.locked });
    }
    tabGroups = {
        primary: 'members',
    };
    async _prepareContext(options) {
        const baseContext = await super._prepareContext(options);
        const settingrules = {
            wealthType: game.settings.get('swade', 'wealthType'),
            currencyName: game.settings.get('swade', 'currencyName'),
        };
        return foundry.utils.mergeObject(baseContext, {
            members: this._prepareMembers(),
            itemTypes: await this._prepareItems(),
            benny: game.settings.get('swade', 'bennyImageSheet'),
            unlocked: !this.actor.system.locked,
            description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.description, {
                rollData: this.actor.getRollData(),
                secrets: this.isEditable,
            }),
            settingrules, // Add the setting rules here
        });
    }
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        for (const member of this.actor.system.members.values()) {
            if (!member.actor)
                continue;
            member.actor.apps[this.id] = this;
        }
    }
    _onRender(context, options) {
        super._onRender(context, options);
        if (this.actor.system.locked)
            this.element.classList.add('locked');
        else
            this.element.classList.remove('locked');
    }
    _syncPartState(partId, newElement, priorElement, state) {
        super._syncPartState(partId, newElement, priorElement, state);
        switch (partId) {
            case 'members': {
                const members = newElement.querySelectorAll('.member');
                for (const member of members) {
                    const uuid = member.dataset.memberUuid;
                    const selector = `.member[data-member-uuid="${uuid}"] .wounds`;
                    const oldBar = priorElement.querySelector(selector);
                    const newBar = member.querySelector('.wounds');
                    const oldBackground = oldBar?.style.getPropertyValue('--_background');
                    const newBackground = newBar?.style?.getPropertyValue('--_background');
                    const oldColor = oldBar?.style?.getPropertyValue('--_wounds-color');
                    const newColor = newBar?.style?.getPropertyValue('--_wounds-color');
                    const frames = [
                        { background: oldBackground, color: oldColor },
                        { background: newBackground, color: newColor },
                    ];
                    oldBar?.animate(frames, { duration: 250, easing: 'ease-in-out' });
                }
                break;
            }
        }
    }
    _onClose(_options) {
        for (const member of this.actor.system.members.values()) {
            if (!member.actor)
                continue;
            delete member.actor.apps[this.id];
        }
    }
    async _prepareItems() {
        const items = Object.fromEntries(constants$1.PHYSICAL_ITEMS.map((t) => [t, []]));
        for (const type of constants$1.PHYSICAL_ITEMS) {
            for (const item of this.actor.itemTypes[type]) {
                items[type].push({
                    name: item.name,
                    id: item.id,
                    img: item.img,
                    quantity: item.system.quantity,
                    description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
                        secrets: this.isEditable,
                    }),
                });
            }
        }
        return items;
    }
    _prepareMembers() {
        const members = [];
        const systemMembers = this.actor.system.members;
        const redHueThreshold = 20;
        for (const [uuid, member] of systemMembers.entries()) {
            const wounds = member.actor?.system?.wounds;
            const background = SwadeActor.getWoundsColor(wounds?.value ?? 1, wounds?.max ?? 1);
            const actor = member.actor;
            members.push({
                uuid,
                cssClass: actor ? '' : 'broken',
                name: actor?.name ?? game.i18n.localize('Unknown'),
                img: actor?.img ?? '/icons/svg/mystery-man.svg',
                profile: member.actor
                    ? [
                        actor?.system?.advances?.rank,
                        actor?.ancestry?.name ?? actor?.system.details?.species.name,
                        actor?.archetype?.name ?? actor?.system?.details?.archetype,
                    ]
                        .filter(Boolean)
                        .join(' ')
                    : uuid,
                toughness: actor?.system.stats?.toughness?.value ?? NaN,
                armor: actor?.armorPerLocation.torso ?? NaN,
                pace: actor?.system.pace.default ?? NaN,
                parry: actor?.system.stats?.parry?.value ?? NaN,
                bennies: actor?.bennies ?? NaN,
                wounds: {
                    max: wounds?.max ?? NaN,
                    value: wounds?.value ?? NaN,
                    background: background.toRGBA(0.8),
                    color: mapRange(background.hsv[0], 0, 1, 0, 360) <= redHueThreshold
                        ? 'var(--color-light-2)'
                        : 'var(--color-dark-2)',
                },
            });
        }
        return members;
    }
    async _onDropActor(_event, data) {
        if (!this.actor.isOwner || this.actor.system.locked)
            return false;
        const actor = await getDocumentClass('Actor').fromDropData(data);
        if (actor.type === 'group' || actor.type === 'vehicle') {
            Logger.warn(`You cannot add ${game.i18n.localize('TYPES.Actor.' + actor.type)} Actors to a group!`, { toast: true, localize: true });
            return false;
        }
        await this.actor.update({
            'system.members': [...this.actor.system._source.members, actor.uuid],
        });
        return true;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class RequirementsEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor({ edge, ...options }) {
        if (!(edge['system'] instanceof EdgeData)) {
            throw new TypeError('Invalid item type ' + edge['type']);
        }
        super(options);
        this.#requirements = foundry.utils.getProperty(edge, 'system.requirements');
        this.#edge = edge;
    }
    #requirements;
    #edge;
    static DEFAULT_OPTIONS = {
        window: {
            title: 'SWADE.Req',
            contentClasses: ['standard-form'],
        },
        position: {
            width: 600,
            height: 'auto',
        },
        classes: ['swade', 'requirements-editor', 'swade-application'],
        tag: 'form',
        form: {
            handler: RequirementsEditor.onSubmit,
            submitOnChange: true,
            closeOnSubmit: false,
            submitOnClose: false,
        },
        actions: {
            add: RequirementsEditor.#addRequirement,
            delete: RequirementsEditor.#deleteRequirement,
        },
    };
    static PARTS = {
        form: { template: 'systems/swade/templates/apps/requirements-editor.hbs' },
        footer: { template: 'templates/generic/form-footer.hbs' },
    };
    get edge() {
        return this.#edge;
    }
    _onChangeForm(formConfig, event) {
        super._onChangeForm(formConfig, event);
        const target = event.target;
        if (!target)
            return;
        if (target.name.endsWith('.type')) {
            this.#resetValue(target);
        }
    }
    static async onSubmit(event, _form, formData) {
        const requirements = Object.values(
        // This maps the incoming formdata to an actual array of requirements
        foundry.utils.expandObject(formData.object).system?.requirements ?? {});
        const changes = { type: 'edge', system: { requirements } };
        try {
            this.edge.validate({ changes, clean: true });
            this.#requirements = requirements;
        }
        catch (error) {
            ui.notifications.error(error);
        }
        finally {
            this.render({ force: true });
            if (event.submitter) {
                const isValid = this.form?.checkValidity();
                if (isValid) {
                    await this.#updateDocument();
                    this.close();
                }
            }
        }
    }
    async _prepareContext(options) {
        const context = foundry.utils.mergeObject(await super._prepareContext(options), {
            requirements: this.#requirements,
            types: constants$1.REQUIREMENT_TYPE,
            typeChoices: this.#getRequirementTypeChoices(),
            rankChoices: this.#getRankChoices(),
            dieChoices: this.#getDieChoices(),
            attributeChoices: this.#getAttributeChoices(),
            combinatorChoices: this.#getCombinatorChoices(),
            slugPattern: SLUG_REGEX.source,
            edge: this.edge,
            buttons: [
                { type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' },
            ],
        });
        return context;
    }
    static async #addRequirement(_event, _target) {
        const newReq = this.#requirements.length > 0
            ? { type: constants$1.REQUIREMENT_TYPE.OTHER, label: '' }
            : {
                type: constants$1.REQUIREMENT_TYPE.RANK,
                value: constants$1.RANK.NOVICE,
            };
        this.#requirements.push(newReq);
        this.render({ force: true });
    }
    static async #deleteRequirement(_event, target) {
        const index = target.closest('li')?.dataset.index;
        this.#requirements.findSplice((_v, i) => i === Number(index));
        this.render({ force: true });
    }
    /** reset all selector and value inputs */
    #resetValue(target) {
        target
            .closest('li')
            ?.querySelectorAll('[name$="selector"], [name$="value"]')
            .forEach((el) => (el.value = ''));
    }
    #getRankChoices() {
        return SWADE.ranks.reduce((acc, cur, i) => {
            acc[i] = cur;
            return acc;
        }, {});
    }
    #getDieChoices() {
        return { 4: 'd4+', 6: 'd6+', 8: 'd8+', 10: 'd10+', 12: 'd12+' };
    }
    #getAttributeChoices() {
        return Object.entries(SWADE.attributes).reduce((acc, [key, value]) => {
            acc[key] = value.long;
            return acc;
        }, {});
    }
    #getRequirementTypeChoices() {
        return {
            [constants$1.REQUIREMENT_TYPE.WILDCARD]: 'SWADE.WildCard',
            [constants$1.REQUIREMENT_TYPE.RANK]: 'SWADE.Rank',
            [constants$1.REQUIREMENT_TYPE.ATTRIBUTE]: 'SWADE.Attribute',
            [constants$1.REQUIREMENT_TYPE.SKILL]: 'TYPES.Item.skill',
            [constants$1.REQUIREMENT_TYPE.EDGE]: 'TYPES.Item.edge',
            [constants$1.REQUIREMENT_TYPE.HINDRANCE]: 'TYPES.Item.hindrance',
            [constants$1.REQUIREMENT_TYPE.ANCESTRY]: 'SWADE.Ancestry',
            [constants$1.REQUIREMENT_TYPE.POWER]: 'TYPES.Item.power',
            [constants$1.REQUIREMENT_TYPE.OTHER]: 'SWADE.Requirements.Other',
        };
    }
    #getCombinatorChoices() {
        return {
            and: 'SWADE.Requirements.And',
            or: 'SWADE.Requirements.Or',
        };
    }
    async #updateDocument() {
        await this.edge.update({ 'system.requirements': this.#requirements }, { diff: false });
    }
}

class SwadeItemSheetV2 extends foundry.appv1.sheets.ItemSheet {
    collapsibleStates = {
        powers: {},
        actions: {},
        effects: {},
    };
    #effectCreateDropDown;
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 600,
            height: 560,
            classes: ['swade-item-sheet', 'swade', 'swade-app'],
            tabs: [
                {
                    navSelector: '.tabs',
                    contentSelector: '.sheet-body',
                    initial: 'summary',
                },
            ],
            scrollY: ['.properties', '.actions', '.editor-container .editor-content'],
            dragDrop: [
                { dropSelector: null, dragSelector: '.effect-list li details' },
            ],
            resizable: true,
        });
    }
    get template() {
        return `systems/swade/templates/item/${this.type}.hbs`;
    }
    get type() {
        return this.item.type;
    }
    get hasInlineDelete() {
        const types = [
            'edge',
            'hindrance',
            'ability',
            'ancestry',
            'skill',
            'power',
            'action',
        ];
        return types.includes(this.type);
    }
    get isPhysicalItem() {
        const types = [
            'weapon',
            'armor',
            'shield',
            'gear',
            'consumable',
            'container',
        ];
        return types.includes(this.type);
    }
    get actionTypes() {
        return {
            trait: 'SWADE.Trait',
            damage: 'SWADE.Dmg',
            resist: 'SWADE.Resist',
            macro: 'DOCUMENT.Macro',
        };
    }
    get macroActorTypes() {
        return {
            default: 'SWADE.MacroActor.Default',
            self: 'SWADE.MacroActor.Self',
            target: 'SWADE.MacroActor.Target',
        };
    }
    activateListeners(jquery) {
        super.activateListeners(jquery);
        this.#setupAccordions();
        const html = jquery[0];
        this.#setupEffectCreateMenu(html);
        html.querySelector('.profile-img')?.addEventListener('contextmenu', () => {
            if (!this.item.img)
                return;
            new ImagePopout({
                src: this.item.img,
                title: this.item.name,
                shareable: this.item?.isOwner ?? game.user?.isGM,
                uuid: this.item.uuid,
            }).render({ force: true });
        });
        if (!this.isEditable)
            return;
        // Disable overridden inputs
        const overrides = foundry.utils.flattenObject(this.item.overrides);
        for (const key of Object.keys(overrides)) {
            html
                .querySelectorAll(`[name="${key}"]`)
                .forEach((el) => el.setAttribute('disabled', 'override'));
        }
        this.form?.addEventListener('keypress', (ev) => {
            const target = ev.target;
            const targetIsButton = 'button' === target?.type;
            if (!targetIsButton && ev.key === 'Enter') {
                ev.preventDefault();
                this.submit({ preventClose: true });
                return false;
            }
        });
        // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
        html
            .querySelector('.inline-delete')
            ?.addEventListener('click', () => this.item.delete());
        html.querySelector('.add-action')?.addEventListener('click', () => {
            const id = foundry.utils.randomID(8);
            this.collapsibleStates[id] = true;
            this.item.update({
                ['system.actions.additional.' + id]: {
                    name: game.i18n.format('DOCUMENT.New', {
                        type: game.i18n.localize('TYPES.Item.action'),
                    }),
                    type: constants$1.ACTION_TYPE.TRAIT,
                },
            });
        });
        html.querySelectorAll('.action-delete').forEach((el) => el.addEventListener('click', async (ev) => {
            const id = ev.currentTarget.dataset.actionId;
            const action = foundry.utils.getProperty(this.item, `system.actions.additional.${id}`);
            const text = game.i18n.format('SWADE.DeleteEmbeddedActionPrompt', {
                action: action.name,
            });
            await foundry.applications.api.DialogV2.confirm({
                content: `<p class="text-center">${text}</p>`,
                classes: ['dialog', 'swade-app'],
                yes: {
                    callback: async () => await this.item.update({
                        [`system.actions.additional.-=${id}`]: null,
                    }),
                },
            });
        }));
        html.querySelectorAll('.power-delete').forEach((el) => el.addEventListener('click', async (ev) => {
            const id = ev.currentTarget?.closest('details')?.dataset.powerId;
            const power = this.item.embeddedPowers.get(id);
            const text = game.i18n.format('SWADE.DeleteEmbeddedPowerPrompt', {
                power: power?.name,
            });
            await foundry.applications.api.DialogV2.confirm({
                content: `<p class="text-center">${text}</p>`,
                classes: ['dialog', 'swade-app'],
                yes: {
                    callback: async () => await this.#deleteEmbeddedDocument(id),
                },
            });
        }));
        html.querySelectorAll('.grant-delete').forEach((el) => el.addEventListener('click', async (ev) => {
            const uuid = ev.currentTarget?.closest('.granted-item')?.dataset.uuid;
            const grants = this.item.grantsItems;
            grants.findSplice((v) => v.uuid === uuid);
            await this.item.update({ 'system.grants': grants });
        }));
        html.querySelectorAll('.grant-name').forEach((el) => el.addEventListener('click', async (ev) => {
            const uuid = ev.currentTarget?.closest('.granted-item')?.dataset.uuid;
            const doc = (await fromUuid(uuid));
            // TODO: change args once this sheet is AppV2
            doc?.sheet?.render(true);
        }));
        html.querySelectorAll('.effect-action').forEach((el) => el.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const a = ev.currentTarget;
            const effectId = a.closest('details').dataset.effectId;
            const effect = this.item.effects.get(effectId, { strict: true });
            const action = a.dataset.action;
            const toggle = a.dataset.toggle;
            switch (action) {
                case 'edit':
                    return effect.sheet?.render({ force: true });
                case 'delete':
                    return effect.delete();
                case 'toggle':
                    return effect.update(this.#toggleEffect(effect, toggle));
            }
        }));
        html.querySelectorAll('.power .damage').forEach((el) => el.addEventListener('click', (ev) => {
            const id = ev.currentTarget?.closest('details')?.dataset.powerId;
            const tempPower = new SwadeItem(this.item.embeddedPowers.get(id));
            tempPower.rollDamage();
        }));
        html.querySelectorAll('.additional-stats .rollable').forEach((el) => el.addEventListener('click', async (ev) => {
            const stat = ev.currentTarget.dataset.stat;
            await this.item.system.rollAdditionalStat(stat);
        }));
        html
            .querySelectorAll('.use-consumable')
            .forEach((el) => el.addEventListener('click', async () => await this.item.consume()));
        html.querySelectorAll('.loaded-ammo-name').forEach((el) => el.addEventListener('mouseenter', async (ev) => {
            const loadedAmmo = this.item.getFlag('swade', 'loadedAmmo');
            const content = `<h3>${loadedAmmo?.name}</h3>${loadedAmmo?.system.description}`;
            game.tooltip.activate(ev.currentTarget, {
                html: await foundry.applications.ux.TextEditor.implementation.enrichHTML(content, {
                    secrets: this.item.isOwner,
                }),
                cssClass: 'themed theme-dark',
            });
        }));
        html
            .querySelector('button.open-requirements-editor')
            ?.addEventListener('click', () => new RequirementsEditor({ edge: this.item }).render({ force: true }));
    }
    async getData(options = {}) {
        const additionalStats = this.#getAdditionalStats();
        const data = {
            itemType: this.#getItemType(),
            enrichedDescription: await this.#enrichText(this.item.system.description),
            hasInlineDelete: this.hasInlineDelete,
            isPhysicalItem: this.isPhysicalItem,
            hasCategory: this.item.canHaveCategory,
            actionTypes: this.actionTypes,
            macroActorTypes: this.macroActorTypes,
            hasAdditionalStats: Object.keys(additionalStats).length > 0,
            additionalStats: additionalStats,
            collapsibleStates: this.collapsibleStates,
            showMods: game.settings.get('swade', 'vehicleMods'),
            showEnergy: game.settings.get('swade', 'vehicleEnergy'),
            isArcaneDevice: this.item.isArcaneDevice,
            ranges: this.#rangeSuggestions(),
            equipStatusOptions: this.#equipStatusOptions(),
            settingRules: {
                modSlots: game.settings.get('swade', 'vehicleMods'),
                noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
            },
        };
        if (this.item.type === 'ability') {
            const subtype = this.item.system.subtype;
            data.abilityConfig = {
                localization: SWADE.abilitySheet,
                abilityHeader: SWADE.abilitySheet[subtype].abilities,
                isArchetype: subtype === constants$1.ABILITY_TYPE.ARCHETYPE,
            };
            data.abilitySubtypeOptions = this.#getAbilitySubtypeOptions(SWADE.abilitySheet);
        }
        if (this.item.canGrantItems) {
            data.grantedItems = await this.#getGrantedItems();
        }
        data.grantOnTriggers = this.#getGrantOnTriggers();
        for (const effect of this.item.effects) {
            foundry.utils.setProperty(effect, 'enrichedDescription', await foundry.applications.ux.TextEditor.implementation.enrichHTML(effect.description, {
                secrets: this.item.isOwner,
            }));
        }
        if (this.type === 'weapon') {
            data.ppReload = false;
            data.trademarkWeaponOptions = this.#trademarkWeaponOptions();
            switch (this.item.system.reloadType) {
                case constants$1.RELOAD_TYPE.NONE:
                case constants$1.RELOAD_TYPE.SINGLE:
                case constants$1.RELOAD_TYPE.FULL:
                    data.ammoList = this.actor?.itemTypes.gear
                        .filter((i) => i.system.isAmmo)
                        .map((i) => i.name);
                    break;
                case constants$1.RELOAD_TYPE.MAGAZINE:
                    data.ammoList = this.actor?.itemTypes.consumable
                        .filter((i) => i.type === 'consumable' &&
                        i.system.subtype === constants$1.CONSUMABLE_TYPE.MAGAZINE)
                        .map((i) => i.name);
                    data.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
                    break;
                case constants$1.RELOAD_TYPE.PP:
                    data.ammoList = Object.keys(this.actor?.system?.powerPoints ?? {});
                    data.ppReload = true;
                    break;
                case constants$1.RELOAD_TYPE.BATTERY:
                    data.ammoList = this.actor?.itemTypes.consumable
                        .filter((i) => i.type === 'consumable' &&
                        i.system.subtype === constants$1.CONSUMABLE_TYPE.BATTERY)
                        .map((i) => i.name);
                    data.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
                    break;
                case constants$1.RELOAD_TYPE.SELF:
                    // Doesn't use external ammo
                    break;
            }
            data.reloadTypeOptions = this.#reloadTypeOptions();
            data.rangeTypeOptions = {
                [constants$1.WEAPON_RANGE_TYPE.MELEE]: 'SWADE.Weapon.RangeType.Melee',
                [constants$1.WEAPON_RANGE_TYPE.RANGED]: 'SWADE.Weapon.RangeType.Ranged',
                [constants$1.WEAPON_RANGE_TYPE.MIXED]: 'SWADE.Weapon.RangeType.Mixed',
            };
        }
        if (this.type === 'consumable') {
            data.subtypes = {
                [constants$1.CONSUMABLE_TYPE.REGULAR]: 'SWADE.ConsumableType.Regular',
                [constants$1.CONSUMABLE_TYPE.MAGAZINE]: 'SWADE.ReloadType.Magazine',
                [constants$1.CONSUMABLE_TYPE.BATTERY]: 'SWADE.ReloadType.Battery',
            };
        }
        if ([
            'consumable',
            'gear',
            'shield',
            'armor',
            'action',
            'power',
            'weapon',
        ].includes(this.type)) {
            data.bonusDamageDieSideOptions = getDieSidesRange(4, 12);
        }
        if (this.item.type === 'hindrance') {
            data.severityOptions = {
                major: 'SWADE.HindranceSeverity.Major',
                minor: 'SWADE.HindranceSeverity.Minor',
                either: 'SWADE.HindranceSeverity.Either',
            };
        }
        if (this.item.type === 'skill') {
            data.dieSideOptions =
                this.item.parent?.type === 'npc'
                    ? getDieSidesRange(4, 24)
                    : getDieSidesRange(4, 20);
            data.wildDieSideOptions = getDieSidesRange(4, 12);
            data.attributeOptions = this.#getAttributeOptions();
        }
        if (this.item.isArcaneDevice) {
            data.embeddedPowers = this.item.embeddedPowers;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for (const [key, power] of data.embeddedPowers) {
                power.enrichedDescription = await this.#enrichText(power.system.description);
            }
            data.dieSideOptions =
                this.item.parent?.type === 'npc'
                    ? getDieSidesRange(4, 24)
                    : getDieSidesRange(4, 20);
        }
        const superData = (await super.getData(options));
        superData.cssClass += ' ' + this.type; // add the item type for easier CSS selection
        return foundry.utils.mergeObject(superData, data);
    }
    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        if (this.isEditable) {
            buttons.unshift({
                label: 'SWADE.DocumentTweaks',
                class: 'configure-actor',
                icon: 'fa-solid fa-gears',
                onclick: () => new SwadeItemTweaks({ document: this.item }).render({ force: true }),
            });
            buttons.unshift({
                label: 'SWADE.RefreshOnly',
                class: 'refresh-item',
                icon: 'fa-solid fa-arrows-rotate',
                onclick: () => this.item.refreshFromCompendium(),
            });
        }
        return buttons;
    }
    _getSubmitData(updateData = {}) {
        const data = super._getSubmitData(updateData);
        if (this.item.type !== 'skill') {
            // Prevent submitting overridden values
            const overrides = foundry.utils.flattenObject(this.item.overrides);
            Object.keys(overrides).forEach((v) => delete data[v]);
        }
        return data;
    }
    _canDragStart(_selector) {
        return this.isEditable;
    }
    _canDragDrop(_selector) {
        return this.isEditable;
    }
    async _onDragStart(event) {
        const src = event.target;
        // Create drag data
        let dragData;
        // Active Effect
        if (src.dataset.effectId) {
            const effect = this.item.effects.get(src.dataset.effectId);
            dragData = effect.toDragData();
        }
        else {
            dragData = this.item.toDragData();
        }
        // Set data transfer
        event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    }
    async _onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        try {
            //get the data
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            switch (data.type) {
                case 'ActiveEffect':
                    await this.#onDropActiveEffect(event, data);
                    break;
                case 'Item':
                    await this.#onDropItem(event, data);
                    break;
                case 'Macro':
                    await this.#onDropMacro(event, data);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            Logger.error(error);
        }
    }
    async #onDropActiveEffect(_event, data) {
        const effect = await CONFIG.ActiveEffect.documentClass.fromDropData(data);
        if (!this.item.isOwner || !effect)
            return false;
        if (this.item.uuid === effect.parent?.uuid)
            return false;
        return CONFIG.ActiveEffect.documentClass.create(effect.toObject(), {
            parent: this.item,
        });
    }
    async #onDropItem(event, data) {
        const item = await CONFIG.Item.documentClass.fromDropData(data);
        Logger.debug(`Trying to add ${data.type} ${item.uuid} to ${this.item.type}/${this.item.name}`);
        if (item.type === 'ability' && item.system.subtype !== 'special') {
            return Logger.warn('SWADE.CannotAddAncestryToAncestry', {
                localize: true,
                toast: true,
            });
        }
        const target = event.target;
        const classList = target.closest('.tab.active')?.classList;
        if (classList?.contains('properties')) {
            await this.#addGrantedItem(item);
        }
        else if (classList?.contains('powers')) {
            await this.#addArcaneDevicePower(item);
        }
        else if (classList?.contains('actions')) {
            await this.#addOrReplaceActions(item);
        }
    }
    async #onDropMacro(event, data) {
        const target = event.target;
        const actionId = target.closest('.tab.actions.active .action')
            ?.dataset.actionId;
        const action = this.item.system.actions.additional[actionId];
        if (action.type !== constants$1.ACTION_TYPE.MACRO)
            return;
        await this.item.update({
            [`system.actions.additional.${actionId}.uuid`]: data.uuid,
        });
    }
    async #addGrantedItem(item) {
        if (!this.item.canGrantItems ||
            this.item.isEmbedded ||
            item.uuid === this.item.uuid)
            return;
        const grants = this.item.grantsItems;
        grants.push({
            name: item.name,
            img: item.img,
            uuid: item.uuid,
        });
        await this.item.update({ 'system.grants': grants });
    }
    async #addArcaneDevicePower(item) {
        if (!this.item.isArcaneDevice || item.type !== 'power')
            return;
        const collection = this.item.embeddedPowers;
        collection.set(foundry.utils.randomID(), item.toObject());
        await this.#saveEmbeddedPowers(collection);
    }
    async #addOrReplaceActions(item) {
        const actionKey = 'system.actions.additional';
        const actions = foundry.utils.getProperty(this.item, actionKey);
        if (typeof actions === 'undefined')
            return; //no actions on this item, return before we break something;
        if (foundry.utils.isEmpty(actions)) {
            //if no actions are present then we simply copy the actions from the dropped item
            return this.item.update({
                [actionKey]: foundry.utils.getProperty(item, actionKey),
            });
        }
        //otherwise we ask to copy or replace the current actions
        const existingActions = foundry.utils.getProperty(item, actionKey);
        foundry.applications.api.DialogV2.wait({
            window: {
                title: game.i18n.localize('SWADE.AddOrReplaceActions.Title'),
            },
            classes: ['dialog', 'swade-app'],
            content: game.i18n.format('SWADE.AddOrReplaceActions.Content', {
                source: item.name,
                type: game.i18n.localize('TYPES.Item.' + item.type),
            }),
            buttons: [
                {
                    action: 'add',
                    label: game.i18n.localize('SWADE.AddOrReplaceActions.Add'),
                    icon: '<i class="fa-solid fa-copy"></i>',
                    default: true,
                    callback: () => {
                        const newActions = {};
                        //give the actions new keys to make sure there are no id collisions
                        for (const action of Object.values(existingActions)) {
                            newActions[foundry.utils.randomID(8)] = action;
                        }
                        this.item.update({ [actionKey]: newActions });
                    },
                },
                {
                    action: 'replace',
                    label: game.i18n.localize('SWADE.AddOrReplaceActions.Replace'),
                    icon: '<i class="fa-solid fa-rotate"></i>',
                    callback: () => this.item.update({ [actionKey]: existingActions }, { recursive: false, diff: false }),
                },
            ],
        });
    }
    async #deleteEmbeddedDocument(id) {
        const flagContent = this.item.getFlag('swade', 'embeddedPowers') ?? [];
        const map = new Map(flagContent);
        map.delete(id);
        this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
    }
    async #saveEmbeddedPowers(map) {
        return this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
    }
    #getAdditionalStats() {
        const stats = foundry.utils.deepClone(this.item.system.additionalStats);
        const options = game.settings.get('swade', 'settingFields').item;
        for (const [key, attr] of Object.entries(stats)) {
            if (!options[key] || !attr.dtype) {
                delete stats[key];
                continue;
            }
            if (attr.dtype === 'Selection') {
                const optionString = options[key].optionString ?? '';
                attr.options = optionString
                    .split(';')
                    .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
            }
        }
        return stats;
    }
    #getGrantedItems() {
        if (!this.item.canGrantItems)
            return [];
        const grants = this.item.grantsItems;
        const enriched = new Array();
        for (const grant of grants) {
            const item = fromUuidSync(grant.uuid);
            enriched.push({
                name: grant.mutation?.name ?? item?.name ?? grant.name,
                img: grant.mutation?.img ?? item?.img ?? grant.img,
                uuid: grant.uuid,
                missing: !item,
                major: foundry.utils.getProperty(grant.mutation, 'system.major') ??
                    foundry.utils.getProperty(item, 'system.isMajor'),
            });
        }
        return enriched;
    }
    #getGrantOnTriggers() {
        const options = [
            { key: 0, label: 'SWADE.ItemEquipStatus.Added' },
            { key: 1, label: 'SWADE.ItemEquipStatus.Carried' },
            { key: 2, label: 'SWADE.ItemEquipStatus.Readied' },
        ];
        return this.item.type === 'consumable' ? options.slice(0, 2) : options;
    }
    #getAbilitySubtypeOptions(abilityLocalization) {
        return {
            special: abilityLocalization.special.dropdown,
            archetype: abilityLocalization.archetype.dropdown,
        };
    }
    #getItemType() {
        if (this.type === 'ability') {
            const subtype = this.item.system.subtype;
            switch (subtype) {
                case constants$1.ABILITY_TYPE.ARCHETYPE:
                    return SWADE.abilitySheet.archetype.dropdown;
                default:
                    return SWADE.abilitySheet.special.dropdown;
            }
        }
        return `TYPES.Item.${this.type}`;
    }
    #getAttributeOptions() {
        return {
            agility: 'SWADE.AttrAgi',
            smarts: 'SWADE.AttrSma',
            spirit: 'SWADE.AttrSpr',
            strength: 'SWADE.AttrStr',
            vigor: 'SWADE.AttrVig',
            '': '',
        };
    }
    async #enrichText(text) {
        const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
            relativeTo: this.item,
            rollData: this.item.getRollData(),
            secrets: this.document.isOwner,
        });
        return enriched;
    }
    #setupAccordions() {
        this.form
            ?.querySelectorAll('.actions-list details')
            .forEach((el) => {
            new Accordion(el, '.content', { duration: 200 });
            const id = el.dataset.actionId;
            el.querySelector('summary')?.addEventListener('click', () => {
                const states = this.collapsibleStates.actions;
                const currentState = Boolean(states[id]);
                states[id] = !currentState;
            });
        });
        this.form
            ?.querySelectorAll('.powers-list details')
            .forEach((el) => {
            new Accordion(el, '.content', { duration: 200 });
            const id = el.dataset.powerId;
            el.querySelector('summary')?.addEventListener('click', () => {
                const states = this.collapsibleStates.powers;
                const currentState = Boolean(states[id]);
                states[id] = !currentState;
            });
        });
        this.form
            ?.querySelectorAll('.effect-list details')
            .forEach((el) => {
            new Accordion(el, '.content', { duration: 200 });
            const id = el.dataset.effectId;
            el.querySelector('summary')?.addEventListener('click', () => {
                const states = this.collapsibleStates.effects;
                const currentState = Boolean(states[id]);
                states[id] = !currentState;
            });
        });
    }
    #setupEffectCreateMenu(html) {
        this.#effectCreateDropDown =
            new foundry.applications.ux.ContextMenu.implementation(html, '.effects .header', [
                {
                    name: 'SWADE.ActiveEffects.AddGuided',
                    icon: '<i class="fa-solid fa-hat-wizard"></i>',
                    condition: this.object.isOwner,
                    callback: () => new ActiveEffectWizard({ document: this.document }).render({
                        force: true,
                    }),
                },
                {
                    name: 'SWADE.ActiveEffects.AddModifier',
                    icon: '<i class="fa-solid fa-bolt"></i>',
                    condition: this.object.isOwner,
                    callback: () => this.#createActiveEffect('modifier'),
                },
                {
                    name: 'SWADE.ActiveEffects.AddUnguided',
                    icon: '<i class="fa-solid fa-file-plus"></i>',
                    condition: this.object.isOwner,
                    callback: () => this.#createActiveEffect('base'),
                },
            ], {
                eventName: 'click',
                jQuery: false,
            });
    }
    async #createActiveEffect(type) {
        const name = SwadeActiveEffect.defaultName({ type, parent: this.item });
        return ActiveEffect.create({ name, type }, { parent: this.item, renderSheet: true });
    }
    #toggleEffect(doc, toggle) {
        const oldVal = !!foundry.utils.getProperty(doc, toggle);
        return { [toggle]: !oldVal };
    }
    #rangeSuggestions() {
        return [
            '3/6/12',
            '4/8/16',
            '5/10/20',
            '10/20/40',
            '12/24/48',
            '15/30/60',
            '20/40/60',
            '20/40/80',
            '24/48/96',
            '25/50/100',
            '30/60/120',
            '50/100/200',
            '75/150/300',
            '300/600/1200',
        ];
    }
    #equipStatusOptions() {
        let states = {
            [constants$1.EQUIP_STATE.STORED]: 'SWADE.ItemEquipStatus.Stored',
            [constants$1.EQUIP_STATE.CARRIED]: 'SWADE.ItemEquipStatus.Carried',
        };
        if (this.item.type === 'weapon') {
            if (this.item.system.isVehicular && this.actor?.type === 'vehicle') {
                states = {
                    ...states,
                    [constants$1.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Installed',
                };
            }
            else {
                states = {
                    ...states,
                    [constants$1.EQUIP_STATE.MAIN_HAND]: 'SWADE.ItemEquipStatus.MainHand',
                    [constants$1.EQUIP_STATE.OFF_HAND]: 'SWADE.ItemEquipStatus.OffHand',
                    [constants$1.EQUIP_STATE.TWO_HANDS]: 'SWADE.ItemEquipStatus.TwoHands',
                };
            }
        }
        else if (this.item.type === 'armor' || this.item.type === 'shield') {
            states = {
                ...states,
                [constants$1.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
            };
        }
        else if (this.item.type === 'gear') {
            if (this.item.system.equippable) {
                states = {
                    ...states,
                    [constants$1.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
                };
            }
            else if (this.item.system.isVehicular) {
                states = {
                    ...states,
                    [constants$1.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Installed',
                };
            }
        }
        return states;
    }
    #trademarkWeaponOptions() {
        return {
            0: 'SWADE.TrademarkWeapon.None',
            1: 'SWADE.TrademarkWeapon.Regular',
            2: 'SWADE.TrademarkWeapon.Improved',
        };
    }
    #reloadTypeOptions() {
        return {
            [constants$1.RELOAD_TYPE.NONE]: 'SWADE.ReloadType.None',
            [constants$1.RELOAD_TYPE.SELF]: 'SWADE.ReloadType.Self',
            [constants$1.RELOAD_TYPE.SINGLE]: 'SWADE.ReloadType.Single',
            [constants$1.RELOAD_TYPE.FULL]: 'SWADE.ReloadType.Full',
            [constants$1.RELOAD_TYPE.MAGAZINE]: 'SWADE.ReloadType.Magazine',
            [constants$1.RELOAD_TYPE.BATTERY]: 'SWADE.ReloadType.Battery',
            [constants$1.RELOAD_TYPE.PP]: 'SWADE.ReloadType.PP',
        };
    }
}

/** @noInheritDoc */
class SwadeBaseActorSheet extends foundry.appv1.sheets
    .ActorSheet {
    activateListeners(jquery) {
        super.activateListeners(jquery);
        const html = jquery[0];
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable)
            return;
        const inputs = html.querySelectorAll('input');
        inputs.forEach((el) => el.addEventListener('focus', (ev) => ev.currentTarget.select()));
        html
            .querySelector('[name="system.details.currency"]')
            ?.addEventListener('change', this._onChangeInputDelta.bind(this));
        // Drag events for macros.
        html.querySelectorAll('li.active-effect, li.item').forEach((el) => {
            // Add draggable attribute and dragstart listener.
            el.draggable = true;
            el.addEventListener('dragstart', this._onDragStart.bind(this), false);
        });
        // Update Item
        html.querySelectorAll('.item-edit').forEach((el) => el.addEventListener('click', (ev) => {
            const li = ev.currentTarget.closest('.item');
            const item = this.actor.items.get(li.dataset.itemId);
            item?.sheet?.render(true);
        }));
        html.querySelectorAll('.item-show').forEach((el) => el.addEventListener('click', (ev) => {
            const li = ev.currentTarget.closest('.item');
            this.actor.items.get(li.dataset.itemId)?.show();
        }));
        // Edit armor modifier
        html.querySelector('.armor-value')?.addEventListener('click', (ev) => {
            const target = ev.currentTarget.dataset.target ?? '';
            this._modifyDefense(target);
        });
        // Roll attribute
        html.querySelectorAll('.attribute-value').forEach((el) => el.addEventListener('click', (event) => {
            const attribute = event.currentTarget.dataset.attribute;
            this.actor.rollAttribute(attribute);
        }));
        html.querySelector('.attribute-manager')?.addEventListener('click', () => {
            new AttributeManager({ actor: this.actor }).render({ force: true });
        });
        // Roll Damage
        html.querySelectorAll('.damage-roll').forEach((el) => el.addEventListener('click', (event) => {
            const element = event.currentTarget;
            const id = element
                .closest('[data-item-id]')
                ?.getAttribute('data-item-id');
            const item = this.actor.items.get(id, { strict: true });
            return item.rollDamage();
        }));
        // Use Consumable
        html.querySelectorAll('.use-consumable').forEach((el) => el.addEventListener('click', async (event) => {
            const element = event.currentTarget;
            const id = element
                .closest('[data-item-id]')
                ?.getAttribute('data-item-id');
            const item = this.actor.items.get(id, { strict: true });
            return item.consume();
        }));
        //Add Benny
        html.querySelector('.benny-add')?.addEventListener('click', () => {
            this.actor.getBenny();
        });
        //Remove Benny
        html.querySelector('.benny-subtract')?.addEventListener('click', () => {
            this.actor.spendBenny();
        });
        //Toggle Conviction
        html
            .querySelector('.conviction-toggle')
            ?.addEventListener('click', async () => {
            await this.actor.toggleConviction();
        });
        // Filter power list
        html.querySelectorAll('.arcane-tabs .arcane').forEach((el) => el.addEventListener('click', (ev) => {
            const arcane = ev.currentTarget.dataset.arcane;
            html
                .querySelectorAll('.arcane-tabs .arcane')
                .forEach((el) => el.classList.remove('active'));
            ev.currentTarget.classList.add('active');
            this._filterPowers(html, arcane);
        }));
        //Running Die
        html.querySelector('.running-die')?.addEventListener('click', async () => {
            await this.actor.rollRunningDie();
        });
        html.querySelectorAll('.effect-action').forEach((el) => el.addEventListener('click', async (ev) => {
            const a = ev.currentTarget;
            const data = a.closest('li').dataset;
            const effectUuid = data.effectUuid;
            const effect = (await fromUuid(effectUuid));
            const action = a.dataset.action;
            switch (action) {
                case 'edit':
                    return effect.sheet?.render({ force: true });
                case 'delete':
                    return effect.deleteDialog();
                case 'toggle':
                    return effect.update({ disabled: !effect?.disabled });
                case 'open-origin':
                    effect.parent.sheet.render(true);
                    break;
                default:
                    Logger.warn(`The action ${action} is not currently supported`);
                    break;
            }
        }));
        html.querySelector('.add-effect')?.addEventListener('click', async (ev) => {
            const transfer = ev.currentTarget.dataset.transfer;
            if (ev.shiftKey) {
                await CONFIG.ActiveEffect.documentClass.create({
                    name: game.i18n.format('DOCUMENT.New', {
                        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
                    }),
                    img: 'systems/swade/assets/icons/active-effect.svg',
                    transfer: transfer,
                }, { renderSheet: true, parent: this.actor });
            }
            else {
                new ActiveEffectWizard({ document: this.actor }).render({ force: true });
            }
        });
        html.querySelectorAll('.additional-stats .roll').forEach((el) => el.addEventListener('click', async (ev) => {
            const button = ev.currentTarget;
            const stat = button.dataset.stat;
            await this.actor.system.rollAdditionalStat(stat);
        }));
        //Wealth Die Roll
        html
            .querySelector('.currency .roll')
            ?.addEventListener('click', () => this.actor.rollWealthDie());
        html.querySelector('.profile-img')?.addEventListener('contextmenu', () => {
            if (!this.actor.img)
                return;
            new ImagePopout({
                src: this.actor.img,
                title: this.actor.name,
                shareable: this.actor.isOwner ?? game.user?.isGM ?? false,
                uuid: this.actor.uuid,
            }).render(true);
        });
    }
    async getData() {
        const data = await super.getData();
        data.config = SWADE;
        data.allApplicableEffects = Array.from(this.actor.allApplicableEffects());
        const hiddenActionOverride = this.actor.getFlag('swade', 'hiddenActionOverride');
        const itemsByType = {};
        for (const item of this.actor.items) {
            const type = item.type;
            const itemEnrichmentOptions = {
                relativeTo: item,
                rollData: item.getRollData(),
                secrets: this.document.isOwner,
            };
            item.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, itemEnrichmentOptions);
            item.enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.notes, itemEnrichmentOptions);
            itemsByType[type] ??= [];
            if (item.system instanceof ActionData &&
                item.system.hidden &&
                !hiddenActionOverride) {
                continue; //do not display hidden actions
            }
            itemsByType[type].push(item);
        }
        data.itemsByType = itemsByType;
        data.sortedSkills = this.actor.items
            .filter((i) => i.type === 'skill')
            .sort((a, b) => a.name.localeCompare(b.name));
        if (this.actor.type !== 'vehicle') {
            //Encumbrance
            data.inventoryWeight = this._calcInventoryWeight([
                ...(data.itemsByType['gear'] ?? []),
                ...(data.itemsByType['weapon'] ?? []),
                ...(data.itemsByType['armor'] ?? []),
                ...(data.itemsByType['shield'] ?? []),
                ...(data.itemsByType['consumable'] ?? []),
            ]);
            data.maxCarryCapacity = this.actor.calcMaxCarryCapacity();
            if (this.actor.type === 'character') {
                data.powersOptions =
                    'class="powers-list resizable" data-base-size="560"';
            }
            else {
                data.powersOptions = 'class="powers-list"';
            }
            // Display the current active arcane
            data.activeArcane = this.options['activeArcane'];
            const arcanes = new Array();
            const powers = data.itemsByType.power;
            powers?.forEach((pow) => {
                const arcane = pow.system.arcane;
                if (!arcane)
                    return;
                if (!arcanes.find((el) => el === arcane)) {
                    arcanes.push(arcane);
                    // Add powerpoints data relevant to the detected arcane
                    if (!foundry.utils.hasProperty(this.actor, `system.powerPoints.${arcane}`)) {
                        data.actor.system.powerPoints[arcane] = {
                            value: 0,
                            max: 0,
                        };
                    }
                }
            });
            data.arcanes = arcanes;
            // Check for enabled optional rules
            data.settingrules = {
                conviction: game.settings.get('swade', 'enableConviction'),
                noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
                wealthType: game.settings.get('swade', 'wealthType'),
                currencyName: game.settings.get('swade', 'currencyName'),
                npcsUseCurrency: game.settings.get('swade', 'npcsUseCurrency'),
            };
        }
        const additionalStats = this.#getAdditionalStats();
        data.additionalStats = additionalStats;
        data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;
        return data;
    }
    /** Extend and override the sheet header buttons */
    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        // Token Configuration
        if (this.actor.isOwner) {
            buttons = [
                {
                    label: game.i18n.localize('SWADE.Tweaks'),
                    class: 'configure-actor',
                    icon: 'fa-solid fa-gears',
                    onclick: (ev) => this._onConfigureEntity(ev),
                },
                ...buttons,
            ];
        }
        return buttons;
    }
    _onConfigureEntity(event) {
        event.preventDefault();
        new SwadeActorTweaks({ document: this.actor }).render({ force: true });
    }
    async _chooseItemType(choices) {
        if (!choices) {
            choices = {
                weapon: game.i18n.localize('TYPES.Item.weapon'),
                armor: game.i18n.localize('TYPES.Item.armor'),
                shield: game.i18n.localize('TYPES.Item.shield'),
                gear: game.i18n.localize('TYPES.Item.gear'),
                consumable: game.i18n.localize('TYPES.Item.consumable'),
            };
        }
        const templateData = {
            types: choices,
            hasTypes: true,
            name: game.i18n.format('DOCUMENT.New', {
                type: game.i18n.localize('DOCUMENT.Item'),
            }),
        }, dlg = await foundry.applications.handlebars.renderTemplate('templates/sidebar/document-create.html', templateData);
        //Create Dialog window
        return new Promise((resolve) => {
            foundry.applications.api.DialogV2.wait({
                window: {
                    title: game.i18n.format('DOCUMENT.Create', {
                        type: game.i18n.localize('DOCUMENT.Item'),
                    }),
                },
                content: dlg,
                buttons: [
                    {
                        action: 'ok',
                        label: game.i18n.localize('SWADE.Ok'),
                        icon: '<i class="fas fa-check"></i>',
                        default: true,
                        callback: (_event, button) => {
                            const html = button.form;
                            resolve({
                                type: html.querySelector('select[name="type"]')
                                    ?.value,
                                name: html.querySelector('input[name="name"]')?.value,
                            });
                        },
                    },
                    {
                        action: 'cancel',
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize('SWADE.Cancel'),
                    },
                ],
            });
        });
    }
    _checkNull(items) {
        if (items && items.length) {
            return items;
        }
        return [];
    }
    async _onResize(event) {
        super._onResize(event);
        let html = this.element;
        html = html instanceof HTMLElement ? html : html[0];
        const resizable = html.querySelectorAll('.resizable');
        resizable.forEach((el) => {
            const heightDelta = this.position.height - this.options.height;
            el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
        });
    }
    _modifyDefense(target) {
        let targetLabel;
        let targetProperty;
        switch (target) {
            case 'parry':
                targetLabel = `${game.i18n.localize('SWADE.Parry')} ${game.i18n.localize('SWADE.ShieldBonus')}`;
                targetProperty = 'parry.shield';
                break;
            case 'armor':
                targetLabel = `${game.i18n.localize('SWADE.Armor')}`;
                targetProperty = 'toughness.armor';
                break;
            case 'toughness':
                targetLabel = `${game.i18n.localize('SWADE.Tough')} ${game.i18n.localize('SWADE.Modifier')}`;
                targetProperty = 'toughness.modifier';
                break;
            default:
                targetLabel = `${game.i18n.localize('SWADE.Tough')} ${game.i18n.localize('SWADE.Modifier')}`;
                targetProperty = 'toughness.value';
                break;
        }
        const targetPropertyPath = this.actor.type === 'vehicle'
            ? `system.${targetProperty}`
            : `system.stats.${targetProperty}`;
        const targetPropertyValue = foundry.utils.getProperty(this.actor, targetPropertyPath);
        const title = `${(game.i18n.format('SWADE.EdF'), { item: this.actor.name + ' ' + targetLabel })}`;
        const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: targetLabel })}</label>
        <input name="modifier" value="${targetPropertyValue}" type="text"/>
      </div></form>`;
        foundry.applications.api.DialogV2.wait({
            window: {
                title: title,
            },
            content: template,
            buttons: [
                {
                    action: 'set',
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('SWADE.Ok'),
                    default: true,
                    callback: (_event, button) => {
                        const mod = button.form.querySelector('input[name="modifier"]')?.value;
                        const newData = {};
                        newData[targetPropertyPath] = parseInt(mod);
                        this.actor.update(newData);
                    },
                },
                {
                    action: 'cancel',
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('SWADE.Cancel'),
                },
            ],
        });
    }
    _filterPowers(html, arcane) {
        this.options['activeArcane'] = arcane;
        // Show, hide powers
        html.querySelectorAll('.power').forEach((pow) => {
            if (pow.dataset.arcane == arcane || arcane == 'All') {
                pow.classList.add('active');
            }
            else {
                pow.classList.remove('active');
            }
        });
        // Show, Hide powerpoints
        html.querySelectorAll('.power-counter').forEach((ct) => {
            if (ct.dataset.arcane == arcane) {
                ct.classList.add('active');
            }
            else {
                ct.classList.remove('active');
            }
        });
    }
    /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
     * @param {Event} event  Triggering event.
     */
    _onChangeInputDelta(event) {
        const input = event.target;
        const value = input.value;
        if (['+', '-'].includes(value[0])) {
            const delta = parseInt(value, 10);
            input.value = foundry.utils.getProperty(this.actor, input.name) + delta;
        }
        else if (value[0] === '=') {
            input.value = value.slice(1);
        }
    }
    _calcInventoryWeight(items) {
        let retVal = 0;
        items.forEach((i) => {
            retVal += i.system.weight * i.system.quantity;
        });
        return retVal;
    }
    _onDragStart(event) {
        const currentTarget = event.currentTarget;
        if (currentTarget.classList.contains('attribute')) {
            return this._onDragAttribute(event);
        }
        super._onDragStart(event);
    }
    async _onDropItemCreate(itemData) {
        const items = await super._onDropItemCreate(itemData);
        const typesToRender = ['power', 'skill'];
        for (const item of items) {
            if (typesToRender.includes(item.type))
                item.sheet?.render(true);
        }
        return items;
    }
    _onDragAttribute(event) {
        const btn = event.currentTarget.querySelector('button');
        event.dataTransfer?.setData('text/plain', JSON.stringify({
            type: 'Attribute',
            uuid: this.actor.uuid,
            attribute: btn?.dataset.attribute,
        }));
    }
    #getAdditionalStats() {
        const stats = structuredClone(this.actor.system.additionalStats);
        const options = game.settings.get('swade', 'settingFields').actor;
        for (const [key, attr] of Object.entries(stats)) {
            if (!options[key] || !attr.dtype) {
                delete stats[key];
                continue;
            }
            if (attr.dtype === 'Selection') {
                attr.options = options[key].optionString
                    ?.split(';')
                    .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
            }
        }
        return stats;
    }
}

/**
 * @noInheritDoc
 */
class SwadeNPCSheet extends SwadeBaseActorSheet {
    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            classes: ['swade', 'sheet', 'actor', 'npc'],
            width: 660,
            height: 600,
            tabs: [
                {
                    navSelector: '.tabs',
                    contentSelector: '.sheet-body',
                    initial: 'summary',
                },
            ],
        };
    }
    get template() {
        // Later you might want to return a different template
        // based on user permissions.
        if (!game.user?.isGM && this.actor.limited) {
            return 'systems/swade/templates/actors/limited-sheet.hbs';
        }
        return 'systems/swade/templates/actors/npc-sheet.hbs';
    }
    // Override to set resizable initial size
    async _renderInner(data) {
        const jquery = await super._renderInner(data);
        const html = jquery[0];
        this.form = html;
        // Resize resizable classes
        const resizable = html.querySelectorAll('.resizable');
        resizable.forEach((el) => {
            const heightDelta = this.position.height - this.options.height;
            el.style.height = `${heightDelta + parseInt(el.dataset.baseSize)}px`;
        });
        // Filter power list
        const arcane = !this.options['activeArcane']
            ? 'All'
            : this.options['activeArcane'];
        html.querySelector('.arcane-tabs .arcane')?.classList.remove('active');
        html.querySelector(`[data-arcane='${arcane}']`)?.classList.add('active');
        this._filterPowers(html, arcane);
        return jquery;
    }
    activateListeners(jquery) {
        super.activateListeners(jquery);
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable)
            return;
        const html = jquery[0];
        // Refresh
        html
            .querySelectorAll('.adjust-counter')
            .forEach((el) => el.addEventListener('click', this._handleCounterAdjust.bind(this)));
        this._setupItemContextMenu(html);
        // Drag events for macros.
        html.querySelectorAll('.attribute').forEach((el) => {
            // Add draggable attribute and dragstart listener.
            el.draggable = true;
            el.addEventListener('dragstart', this._onDragStart.bind(this), false);
        });
        // Delete Item
        html.querySelectorAll('.item-delete').forEach((el) => el.addEventListener('click', (ev) => {
            const li = ev.currentTarget?.closest('.gear-card');
            this.actor.items.get(li.dataset.itemId)?.deleteDialog();
        }));
        // Roll Skill
        html.querySelectorAll('.skill.item a').forEach((el) => el.addEventListener('click', (event) => {
            const element = event.currentTarget;
            const item = element.parentElement.dataset.itemId;
            this.actor.rollSkill(item);
        }));
        // Add new object
        html.querySelectorAll('.item-create').forEach((el) => el.addEventListener('click', async (event) => {
            event.preventDefault();
            const header = event.currentTarget;
            const type = header.dataset.type;
            // item creation helper func
            const createItem = (type, name) => {
                const itemData = {
                    name: name ??
                        game.i18n.format('DOCUMENT.New', { type: type.capitalize() }),
                    type: type,
                    system: Object.assign({}, header.dataset),
                };
                delete itemData.system['type'];
                return itemData;
            };
            let itemData;
            // Getting back to main logic
            if (type === 'choice') {
                const dialogInput = await this._chooseItemType();
                itemData = createItem(dialogInput.type, dialogInput.name);
            }
            else {
                itemData = createItem(type);
            }
            foundry.utils.setProperty(itemData, 'system.equipStatus', constants$1.EQUIP_STATE.EQUIPPED);
            await this.actor.createEmbeddedDocuments('Item', [itemData], {
                renderSheet: true,
            });
        }));
        //Toggle Equipmnent Card collapsible
        html.querySelectorAll('.gear-card .card-header .item-name').forEach((el) => el.addEventListener('click', (ev) => {
            const card = ev.currentTarget.closest('.gear-card');
            const content = card.querySelector('.card-content');
            content.classList.toggle('collapsed');
        }));
        // Active Effects
        html
            .querySelectorAll('.status-container input[type="checkbox"]')
            .forEach((el) => el.addEventListener('change', this._toggleStatusEffect.bind(this)));
        html
            .querySelector('.attribute.size input')
            ?.addEventListener('mouseenter', (event) => {
            game.tooltip.deactivate();
            game.tooltip.activate(event.target, {
                html: this.actor.system.getSizeTooltip(),
                cssClass: 'themed theme-dark',
            });
        });
        // TODO: fix this tooltip. No mouseenter event on a readonly input
        html
            .querySelector('.attribute.pace input')
            ?.addEventListener('mouseenter', (event) => {
            game.tooltip.deactivate();
            game.tooltip.activate(event.target, {
                html: this.actor.system.getPaceTooltip(),
                cssClass: 'themed theme-dark',
            });
        });
    }
    async getData() {
        const data = await super.getData();
        // Progress attribute abbreviation toggle
        data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');
        data.enrichedBiography =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.details.biography.value, {
                relativeTo: this.actor,
                rollData: this.actor.getRollData(),
                secrets: this.options.editable && this.document.isOwner,
            });
        data.wealthDieTypes = getDieSidesRange(4, 12);
        // Everything below here is only needed if user is not limited
        if (this.actor.limited)
            return data;
        data.parryTooltip = this.actor.getPTTooltip('parry');
        data.toughnessTooltip = this.actor.getPTTooltip('toughness');
        data.armorTooltip = this.actor.getArmorTooltip();
        data.category = this.actor.system.category;
        return data;
    }
    async _toggleStatusEffect(ev) {
        const key = ev.target.dataset.key;
        // this is just to make sure the status is false in the source data
        await this.actor.update({ [`system.status.${key}`]: false });
        await this.actor.toggleActiveEffect(ev.target.dataset.id);
    }
    async _handleCounterAdjust(ev) {
        const target = ev.currentTarget;
        const action = target.dataset.action;
        switch (action) {
            case 'pp-refresh': {
                const arcane = target.dataset.arcane;
                const valueKey = 'system.powerPoints.' + arcane + '.value';
                const maxKey = 'system.powerPoints.' + arcane + '.max';
                const currentPP = foundry.utils.getProperty(this.actor, valueKey);
                const maxPP = foundry.utils.getProperty(this.actor, maxKey);
                if (currentPP >= maxPP)
                    return;
                await this.actor.update({
                    [valueKey]: Math.min(currentPP + 5, maxPP),
                });
                break;
            }
            default:
                throw new Error('Unknown action!');
        }
    }
    _setupItemContextMenu(html) {
        const items = [
            {
                name: 'SWADE.Reload',
                icon: '<i class="fa-solid fa-right-to-bracket"></i>',
                condition: (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    return (item?.type === 'weapon' &&
                        !!item.system.shots &&
                        game.settings.get('swade', 'ammoManagement'));
                },
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.reload(),
            },
            {
                name: 'SWADE.RemoveAmmo',
                icon: '<i class="fa-solid fa-right-from-bracket"></i>',
                condition: (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    const isWeapon = item?.type === 'weapon';
                    const loadedAmmo = item?.getFlag('swade', 'loadedAmmo');
                    return (isWeapon &&
                        !!loadedAmmo &&
                        item.usesAmmoFromInventory &&
                        (item.system.reloadType === constants$1.RELOAD_TYPE.MAGAZINE ||
                            item.system.reloadType === constants$1.RELOAD_TYPE.BATTERY));
                },
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.removeAmmo(),
            },
            {
                name: 'SWADE.Ed',
                icon: '<i class="fa-solid fa-edit"></i>',
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.sheet?.render(true),
            },
            {
                name: 'SWADE.Duplicate',
                icon: '<i class="fa-solid fa-copy"></i>',
                condition: (i) => !!this.actor.items.get(i.dataset.itemId)?.isPhysicalItem,
                callback: async (i) => {
                    const item = this.actor.items.get(i.dataset.itemId);
                    const cloned = await item?.clone({ name: game.i18n.format('DOCUMENT.CopyOf', { name: item.name }) }, { save: true });
                    cloned?.sheet?.render(true);
                },
            },
            {
                name: 'SWADE.Del',
                icon: '<i class="fa-solid fa-trash"></i>',
                callback: (i) => this.actor.items.get(i.dataset.itemId)?.deleteDialog(),
            },
        ];
        foundry.applications.ux.ContextMenu.create(this, html, 'li.item', items, {
            jQuery: false,
        });
    }
}

class SwadeTokenConfig extends foundry.applications.sheets
    .TokenConfig {
    async _preparePartContext(partId, context, options) {
        await super._preparePartContext(partId, context, options);
        if (partId !== 'resources')
            return context;
        const sourceSystem = this.actor?.system;
        if (!sourceSystem)
            return context;
        if (!context.barAttributes)
            return context;
        // Localize labels for normally found trackable attributes
        for (const currData of context.barAttributes) {
            const fullLabel = [];
            const splitPath = currData.label.split('.');
            for (let i = 1; i <= splitPath.length; i++) {
                let currSchema = sourceSystem.schema;
                for (const currPath of splitPath.slice(0, i)) {
                    currSchema = currSchema?.get?.(currPath);
                }
                if (currSchema?.label.length)
                    fullLabel.push(game.i18n.localize(currSchema.label));
                else if (!currSchema)
                    fullLabel.push(splitPath[i - 1]);
            }
            if (fullLabel.length)
                currData.label = fullLabel.join(': ');
        }
        // Special handling for Additional Stats, Power Points, and Encumbrance
        for (const [key, value] of Object.entries(sourceSystem.additionalStats ?? {})) {
            if (value.dtype !== 'Number')
                continue;
            context.barAttributes.push({
                group: game.i18n.localize('SWADE.AddStats'),
                value: `additionalStats.${key}`,
                label: value.label,
            });
        }
        for (const key of Object.keys(sourceSystem.powerPoints ?? {})) {
            context.barAttributes.push({
                group: game.i18n.localize('SWADE.PP'),
                value: `powerPoints.${key}`,
                label: key,
            });
        }
        if (sourceSystem.details?.encumbrance?.max)
            context.barAttributes.push({
                group: game.i18n.localize('TOKEN.BarAttributes'),
                value: 'details.encumbrance',
                label: game.i18n.localize('SWADE.CarryWeight'),
            });
        // Final sort
        context.barAttributes.sort((a, b) => a.group === b.group ? a.label.compare(b.label) : a.group.compare(b.group));
        return context;
    }
}

class SwadeVehicleSheetV2 extends SwadeActorSheetV2 {
    static DEFAULT_OPTIONS = {
        classes: ['vehicle', 'standard-form', 'swade-application'],
        position: { height: 700, width: 700 },
        window: { resizable: true },
        actions: {
            maneuverCheck: SwadeVehicleSheetV2.maneuverCheck,
            rollAttribute: SwadeVehicleSheetV2.rollAttribute,
            changeEquip: SwadeVehicleSheetV2.changeEquip,
            manageAttributes: SwadeVehicleSheetV2.manageAttributes,
            createCargo: SwadeVehicleSheetV2.createCargo,
            addCrewMember: SwadeVehicleSheetV2.addCrewMember,
            deleteCrewMember: SwadeVehicleSheetV2.deleteCrewMember,
            openCrewMember: SwadeVehicleSheetV2.openCrewMember,
        },
    };
    static PARTS = {
        header: {
            template: 'systems/swade/templates/actors/vehicle2/header.hbs',
        },
        tabs: { template: 'templates/generic/tab-navigation.hbs' },
        traits: {
            template: 'systems/swade/templates/actors/vehicle2/tab-traits.hbs',
        },
        crew: {
            template: 'systems/swade/templates/actors/vehicle2/tab-crew.hbs',
        },
        cargo: {
            template: 'systems/swade/templates/actors/vehicle2/tab-cargo.hbs',
        },
        description: {
            template: 'systems/swade/templates/actors/vehicle2/tab-desc.hbs',
        },
    };
    static TABS = {
        traits: {
            id: 'traits',
            group: 'primary',
            label: 'SWADE.Summary',
        },
        crew: {
            id: 'crew',
            group: 'primary',
            label: 'SWADE.Crew',
        },
        cargo: {
            id: 'cargo',
            group: 'primary',
            label: 'SWADE.Cargo',
        },
        description: {
            id: 'description',
            group: 'primary',
            label: 'SWADE.Desc',
        },
    };
    _getTabs() {
        this.tabGroups.primary ??= this.actor.limited ? 'description' : 'traits';
        return super._getTabs();
    }
    async _preparePartContext(partId, context, _options) {
        const itemTypes = this.actor.itemTypes;
        switch (partId) {
            case 'header':
                context.hasEnergy =
                    game.settings.get('swade', 'vehicleEnergy') &&
                        this.actor.system.energy.enabled;
                break;
            case 'traits':
                context.effects = this._prepareEffects();
                context.showModCount = game.settings.get('swade', 'vehicleMods');
                context.gearMods = this._prepareMods('gear');
                context.weaponMods = this._prepareMods('weapon');
                context.attributes = this._prepareAttributes();
                this._prepareAdditionalStats(context);
                break;
            case 'crew':
                context.opSkills = this._prepareOpSkillList();
                context.weaponOptions = this._prepareWeaponOptions();
                context.showEdges = game.settings.get('swade', 'vehicleEdges');
                context.abilities = itemTypes.ability;
                context.edges = itemTypes.edge;
                context.hindrances = itemTypes.hindrance;
                context.tokenOptions = this._prepareTokenOptions();
                context.weaponsPerMember = this.actor.system._source.crew.members.map((m) => m.weapons ?? []);
                break;
            case 'description':
                context.enrichedDescription =
                    await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.description, {
                        secrets: this.actor.isOwner,
                        rollData: this.actor.getRollData(),
                        relativeTo: this.actor,
                    });
                break;
        }
        return context;
    }
    _prepareEffects() {
        const effects = {
            passive: [],
            temporary: [],
            inactive: [],
        };
        for (const e of this.actor.allApplicableEffects()) {
            if (e.isTemporary && e.active)
                effects.temporary.push(e);
            else if (e.active)
                effects.passive.push(e);
            else
                effects.inactive.push(e);
        }
        for (const category of Object.values(effects)) {
            category.sort((a, b) => a.sort - b.sort);
        }
        return effects;
    }
    _prepareMods(type) {
        const mods = this.actor.items.filter((i) => i.type === type &&
            i.system.isVehicular &&
            i.system.equipStatus > constants$1.EQUIP_STATE.CARRIED);
        return mods;
    }
    _prepareOpSkillList() {
        const skills = game.settings.get('swade', 'vehicleSkills');
        const skillList = skills.split(/[,]/);
        const options = skillList.map((skill) => {
            const name = skill.trim();
            return {
                value: name,
                label: name,
                selected: name === this.actor.system.driver.skill,
            };
        });
        return {
            options,
            blank: '',
        };
    }
    _prepareTokenOptions() {
        const collection = game.scenes.viewed?.tokens ?? [];
        const options = collection.reduce((arr, doc) => {
            if (!doc.visible ||
                !doc.actor ||
                ['group', 'vehicle'].includes(doc.actor.type) ||
                this.actor.system.crew.members.find((m) => m.uuid === doc.actor.uuid) //make sure we can't add the same one twice
            )
                return arr;
            arr.push({ value: doc.actor.uuid, label: doc.name });
            return arr;
        }, []);
        return options;
    }
    _prepareWeaponOptions() {
        return this.actor.itemTypes.weapon
            .filter((w) => w.system.isVehicular && w.isReadied)
            .map((w) => ({
            value: w.id,
            label: w.name,
        }));
    }
    _prepareAttributes() {
        const enabled = Object.values(this.actor.system.attributes).some((a) => a.enabled);
        const globals = this.actor?.system.stats.globalMods;
        const list = Object.entries(this.actor.system.attributes)
            .filter(([_key, value]) => value.enabled)
            .map(([key, attr]) => {
            const field = this.actor.system.schema.getField(['attributes', key]);
            const mods = [
                {
                    label: game.i18n.localize('SWADE.TraitMod'),
                    value: attr.die.modifier,
                },
                ...attr.effects,
                ...globals[key],
                ...globals.trait,
            ].filter((m) => m.ignore !== true);
            let tooltip = `<strong>${game.i18n.localize(CONFIG.SWADE.attributes[key].long)}</strong>`;
            if (mods.length) {
                tooltip += `<ul style="text-align:start;">${mods
                    .map(({ label, value }) => {
                    const mapped = typeof value === 'number' ? value.signedString() : value;
                    return `<li>${label}: ${mapped}</li>`;
                })
                    .join('')}</ul>`;
            }
            return {
                value: attr,
                field,
                tooltip,
            };
        });
        return { enabled, list };
    }
    _prepareAdditionalStats(context) {
        const additionalStats = structuredClone(this.actor.system.additionalStats);
        for (const [key, attr] of Object.entries(additionalStats)) {
            if (!attr.dtype)
                delete additionalStats[key];
            if (attr.dtype === 'Selection') {
                const options = game.settings.get('swade', 'settingFields').actor;
                attr.options = options[key].optionString
                    ?.split(';')
                    .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
            }
        }
        context.hasAdditionalStatsFields = !!Object.keys(additionalStats).length;
        context.additionalStats = additionalStats;
    }
    /** Actions */
    static async maneuverCheck(_event, target) {
        const uuid = target.closest('[data-member-uuid]')?.dataset.memberUuid;
        const operator = this.actor.system.crew.members.find((m) => m.uuid === uuid);
        if (!operator.actor)
            return;
        await this.actor.system.rollManeuverCheck(operator.actor);
    }
    static async manageAttributes(_event, _target) {
        new AttributeManager({ actor: this.actor }).render({ force: true });
    }
    static async rollAttribute(_event, target) {
        const attribute = target.dataset.attribute;
        await this.actor.rollAttribute(attribute);
    }
    static async changeEquip(_event, target) {
        // TODO: Use v13 ContextMenu
        console.log(this, _event, target);
        const item = this._getEmbeddedDocument(target);
        console.log(item);
    }
    static async createCargo(_event, _target) {
        await SwadeItem.createDialog({}, {
            parent: this.actor,
            types: ['gear', 'armor', 'weapon', 'shield', 'consumable'],
        });
    }
    static async addCrewMember(_event, target) {
        const uuid = target.previousElementSibling.value;
        if (uuid)
            await this._addCrewMember(uuid);
    }
    static async deleteCrewMember(_event, target) {
        const index = Number(target.dataset.index);
        const members = this.actor.system._source.crew.members;
        await this.actor.update({
            'system.crew.members': members.toSpliced(index, 1),
        });
    }
    static async openCrewMember(_event, target) {
        const uuid = target.closest('[data-member-uuid]')?.dataset.memberUuid;
        const operator = this.actor.system.crew.members.find((m) => m.uuid === uuid);
        operator?.actor?.sheet?.render(true);
    }
    /** Drop Handling */
    async _onDropActor(_event, data) {
        if (!this.actor.isOwner)
            return false;
        const actor = await getDocumentClass('Actor').fromDropData(data);
        if (!actor)
            return false;
        if (actor.type === 'group' || actor.type === 'vehicle') {
            Logger.warn(`You cannot set ${game.i18n.localize('TYPES.Actor.' + actor.type)} Actors as the operator of a vehicle!`, { toast: true, localize: true });
            return false;
        }
        if (this.tabGroups.primary !== 'crew')
            return false;
        await this._addCrewMember(actor.uuid);
        return true;
    }
    async _addCrewMember(uuid) {
        const existingMembers = this.actor.system._source.crew.members;
        const count = existingMembers.length;
        const role = count === 0 ? constants$1.CREW_ROLE.OPERATOR : constants$1.CREW_ROLE.GUNNER;
        const newMembers = [...existingMembers, { uuid, role, sort: count - 1 }];
        await this.actor.update({ 'system.crew.members': newMembers });
    }
}

class JournalHeadquartersPageSheet extends foundry.applications
    .sheets.journal.JournalEntryPageHandlebarsSheet {
    static DEFAULT_OPTIONS = {
        classes: ['headquarters-journal'],
        form: {
            submitOnChange: true,
        },
    };
    static EDIT_PARTS = {
        header: super.EDIT_PARTS.header,
        content: {
            template: 'systems/swade/templates/journal/page-headquarters-edit.hbs',
            classes: ['standard-form', 'scrollable'],
        },
        footer: super.EDIT_PARTS.footer,
    };
    static VIEW_PARTS = {
        content: {
            template: 'systems/swade/templates/journal/page-headquarters-view.hbs',
            root: true,
        },
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const system = this.document.system;
        context.enriched = {
            advantage: await this.#enrich(system.advantage),
            complication: await this.#enrich(system.complication),
            upgrades: await this.#enrich(system.upgrades),
            form: {
                description: await this.#enrich(system.form.description),
                acquisition: await this.#enrich(system.form.acquisition),
                maintenance: await this.#enrich(system.form.maintenance),
            },
        };
        const realDocument = await fromUuid(context.document.uuid);
        if (!realDocument)
            context.isSynthetic = true;
        return context;
    }
    async #enrich(text) {
        return foundry.applications.ux.TextEditor.implementation.enrichHTML(text, { secrets: this.document.isOwner });
    }
}

class SwadeChatLog extends foundry.applications.sidebar.tabs
    .ChatLog {
    async _processDiceCommand(command, matches, chatData, createOptions) {
        const actor = ChatMessage.implementation.getSpeakerActor(chatData.speaker) ||
            game.user.character;
        const rollData = actor?.getRollData() ?? {};
        const rolls = [];
        for (const match of matches) {
            if (!match)
                continue;
            const [formula, flavor] = match.slice(2, 4);
            if (flavor && !chatData.flavor)
                chatData.flavor = flavor;
            const roll = Roll.create(formula, rollData);
            await roll.evaluate();
            rolls.push(roll);
        }
        chatData.rolls = rolls;
        chatData.sound = CONFIG.sounds.dice;
        if (!rolls.every((r) => r instanceof SwadeRoll)) {
            chatData.content = rolls
                .reduce((t, r) => t + r.total, 0)
                .toString();
        }
        createOptions.rollMode = command;
    }
}

/** This class defines a a new Combat Tracker specifically designed for SWADE */
class SwadeCombatTracker extends foundry.applications.sidebar
    .tabs.CombatTracker {
    static DEFAULT_OPTIONS = {
        classes: ['swade'],
        actions: {
            toggleGroupExpand: this.#toggleGroupExpand,
            toggleHold: this.#onSwadeCombatantControl,
            toggleTurnLost: this.#onSwadeCombatantControl,
            actNow: this.#onSwadeCombatantControl,
            actAfter: this.#onSwadeCombatantControl
        },
    };
    static PARTS = {
        header: {
            template: 'templates/sidebar/tabs/combat/header.hbs',
        },
        dramaticTask: {
            template: 'systems/swade/templates/sidebar/dramatic-task.hbs',
        },
        tracker: {
            template: 'systems/swade/templates/sidebar/tracker.hbs',
            templates: ['systems/swade/templates/sidebar/turn.hbs'],
            scrollable: [''],
        },
        footer: {
            template: 'templates/sidebar/tabs/combat/footer.hbs',
        },
    };
    _configureRenderParts(options) {
        const parts = super._configureRenderParts(options);
        if (game.user.isGM && !this.viewed?.round && this.viewed?.combatants?.size)
            parts.footer.template = 'systems/swade/templates/sidebar/footer.hbs';
        return parts;
    }
    async _preparePartContext(partId, context, options) {
        await super._preparePartContext(partId, context, options);
        switch (partId) {
            case 'dramaticTask':
                await this._prepareDramaticTaskContext(context, options);
                break;
        }
        return context;
    }
    async _prepareDramaticTaskContext(context, _options) {
        context.isDramaticTask = this.viewed?.type === 'dramaticTask';
    }
    async _prepareTrackerContext(context, options) {
        await super._prepareTrackerContext(context, options);
        const combat = this.viewed;
        const [noGroup, grouped] = (context.turns ?? []).partition((c) => !!c?.group);
        const groups = Object.groupBy(grouped, (c) => c.group.id);
        const currentTurn = combat?.turns[combat.turn];
        context.groupTurns = combat?.groups.reduce((acc, cg) => {
            const { _expanded: isExpanded, id, name, isOwner, defeated: isDefeated, hidden, disposition, initiative, img, } = cg;
            const turns = groups[id] ?? [];
            const active = turns.some((t) => t.id === currentTurn?.id);
            const leader = cg.system.leaderCombatant;
            const turn = {
                isGroup: true,
                id,
                name,
                isOwner,
                isDefeated,
                hidden,
                disposition,
                initiative,
                turns,
                img,
                active,
            };
            if (leader) {
                Object.assign(turn, {
                    cardString: leader?.cardString,
                    initiative: leader?.initiative,
                    roundHeld: leader?.roundHeld,
                    isOnHold: !!leader?.roundHeld,
                    turnLost: leader?.turnLost,
                    hasRolled: !!leader?.initiative && !!leader?.cardString,
                    canDrawInit: this._canDrawInitiative(leader),
                    canRedraw: this._canRedrawInitiative(leader),
                });
            }
            turn.css = [
                isExpanded ? 'expanded' : null,
                active ? 'active' : null,
                hidden ? 'hide' : null,
                isDefeated ? 'defeated' : null,
            ].filterJoin(' ');
            acc.push(turn);
            return acc;
        }, noGroup);
        context.groupTurns?.sort(combat._sortCombatants);
    }
    async _prepareTurnContext(combat, combatant, index) {
        const turn = await super._prepareTurnContext(combat, combatant, index);
        Object.assign(turn, {
            group: combatant.group,
            isVehicle: combatant?.actor?.type === 'vehicle',
            isIncapacitated: combatant?.isIncapacitated,
            isLeader: combatant.isGroupLeader,
            cardString: combatant?.cardString,
            initiative: combatant?.initiative,
            roundHeld: combatant?.roundHeld,
            isOnHold: !!combatant?.roundHeld,
            turnLost: combatant?.turnLost,
            hasRolled: !!combatant?.initiative && !!combatant?.cardString,
            canDrawInit: this._canDrawInitiative(combatant),
            canRedraw: this._canRedrawInitiative(combatant),
        });
        return turn;
    }
    _canDrawInitiative(combatant) {
        if (!combatant.isOwner)
            return false;
        const firstRound = combatant.system.firstRound ?? 0;
        // The Combatant can draw on or after their first round, but not if they're in a group or defeated.
        return (firstRound <= (combatant.combat?.round ?? 0) &&
            !(!!combatant.group || combatant.defeated));
    }
    _canRedrawInitiative(combatant) {
        return combatant.isOwner && !combatant.group; // Followers can neither draw nor redraw.
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        new foundry.applications.ux.DragDrop({
            dragSelector: '.combatant',
            dropSelector: '.combatant-group, .combat-tracker',
            permissions: {
                dragstart: () => game.user.isGM,
                drop: () => game.user.isGM,
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                dragleave: this._onDragLeave.bind(this),
                drop: this._onDrop.bind(this),
            },
        }).bind(this.element);
        if (options.parts && options.parts.includes('dramaticTask')) {
            const tokenInput = this.element.querySelector('input[name="system.tokens.value"]');
            tokenInput?.addEventListener('change', () => this.viewed?.update({ 'system.tokens.value': tokenInput.value }));
        }
    }
    async _onDragStart(event) {
        const li = event.currentTarget;
        const combatant = this.viewed.combatants.get(li.dataset.combatantId);
        if (!combatant)
            return;
        const dragData = combatant.toDragData();
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }
    _onDragOver(event) {
        event.target
            ?.closest('li.combatant-group')
            ?.classList.add('dropTarget');
    }
    _onDragLeave(event) {
        event.target
            ?.closest('li.combatant-group')
            ?.classList.remove('dropTarget');
    }
    async _onDrop(event) {
        // Combat Tracker contains combatant groups, which means this would fire twice
        event.stopPropagation();
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        const combatant = await SwadeCombatant.fromDropData(data);
        if (!combatant)
            return;
        const groupLI = event.target.closest('.combatant-group');
        if (groupLI) {
            groupLI.classList.remove('dropTarget');
            combatant.update({ group: groupLI.dataset.groupId });
        }
        else {
            combatant.update({ group: null });
        }
    }
    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this._createContextMenu(this._getGroupContextOptions, '.combatant-group', {
            hookName: 'getCombatantGroupContextOptions',
            fixed: true,
            parentClassHooks: false,
        });
    }
    _getEntryContextOptions() {
        const entryOptions = super._getEntryContextOptions();
        const getCombatant = (li) => this.viewed.combatants.get(li.dataset.combatantId);
        const getCombatantGroup = (li) => this.viewed.groups.get(li.closest('.combatant-group')?.dataset.groupId);
        entryOptions.push({
            name: 'SWADE.MakeGroupLeader',
            icon: '<i class="fa-solid fa-users"></i>',
            condition: (li) => {
                const combatant = getCombatant(li);
                return combatant.group && !combatant.isGroupLeader;
            },
            callback: (li) => getCombatant(li).setIsGroupLeader(true),
        }, {
            name: 'SWADE.RemoveGroupLeader',
            icon: '<i class="fa-solid fa-users-slash"></i>',
            condition: (li) => {
                if (getCombatantGroup(li)?.members.size !== 1) {
                    return getCombatant(li).isGroupLeader;
                }
                return false;
            },
            callback: (li) => getCombatant(li).setIsGroupLeader(false),
        });
        return entryOptions;
    }
    _getCombatContextOptions() {
        const entryOptions = super._getCombatContextOptions();
        entryOptions.push({
            name: game.i18n.format('DOCUMENT.Create', {
                type: game.i18n.localize('DOCUMENT.CombatantGroup'),
            }),
            icon: '<i class="fa-solid fa-users-rectangle"></i>',
            callback: () => {
                const groupCls = CombatantGroup.implementation;
                groupCls.create({
                    name: groupCls.defaultName({ parent: this.viewed }),
                    img: 'icons/environment/people/charge.webp',
                }, { parent: this.viewed });
            },
        });
        return entryOptions;
    }
    /**
     * Get the context menu entries for Combatant Groups in the tracker.
     * Only available to game masters.
     * @returns {ContextMenu.Entry[]}
     */
    _getGroupContextOptions() {
        const getCombatantGroup = (li) => this.viewed.groups.get(li.dataset.groupId);
        return [
            {
                name: game.i18n.format('DOCUMENT.Update', {
                    type: game.i18n.localize('DOCUMENT.CombatantGroup'),
                }),
                icon: '<i class="fa-solid fa-edit"></i>',
                condition: (li) => getCombatantGroup(li).isOwner,
                callback: (li) => getCombatantGroup(li)?.sheet.render({
                    force: true,
                    position: {
                        top: Math.min(li.offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720,
                    },
                }),
            },
            {
                name: 'COMBAT.ClearMovementHistories',
                icon: '<i class="fa-solid fa-shoe-prints"></i>',
                condition: game.user.isGM,
                callback: (li) => getCombatantGroup(li).clearMovementHistories(),
            },
            {
                name: game.i18n.format('DOCUMENT.Delete', {
                    type: game.i18n.localize('DOCUMENT.CombatantGroup'),
                }),
                icon: '<i class="fa-solid fa-trash"></i>',
                condition: game.user.isGM,
                callback: (li) => getCombatantGroup(li).delete(),
            },
            {
                name: 'OWNERSHIP.Configure',
                icon: '<i class="fa-solid fa-lock"></i>',
                condition: game.user.isGM,
                callback: (li) => new foundry.applications.apps.DocumentOwnershipConfig({
                    document: getCombatantGroup(li),
                    position: {
                        top: Math.min(li.offsetTop, window.innerHeight - 350),
                        left: window.innerWidth - 720,
                    },
                }).render({ force: true }),
            },
        ];
    }
    /* -------------------------------------------------- */
    /*   Actions                                          */
    /* -------------------------------------------------- */
    static async #toggleGroupExpand(event, target) {
        // Don't proceed if the click event was actually on one of the combatants
        const entry = event.target.closest('[data-combatant-id]');
        if (entry)
            return;
        const combat = this.viewed;
        const groupId = target.dataset.groupId;
        await combat.toggleGroupExpand(groupId);
    }
    static async #onSwadeCombatantControl(_event, target) {
        const combatantId = target?.closest('[data-combatant-id]')?.dataset.combatantId;
        const combatant = this.viewed?.combatants.get(combatantId);
        if (!combatant)
            return;
        switch (target.dataset.action) {
            case 'toggleHold': return await combatant.toggleHold();
            case 'toggleTurnLost': return await combatant.toggleTurnLost();
            case 'actNow': return await combatant.actNow();
            case 'actAfter': return await combatant.actAfterCurrentCombatant();
        }
    }
    /**
     * Handle new Combat creation request by presenting a form asking what type
     */
    async _onCombatCreate(event) {
        event.preventDefault();
        const cls = getDocumentClass('Combat');
        await cls.createDialog({ active: true });
    }
}

class SwadeTour extends foundry.nue.Tour {
    configurator;
    actor;
    item;
    tweaks;
    advanceEditor;
    journalEntry;
    journalEntryPage;
    activeWindows = [];
    async start() {
        delete this.configurator;
        delete this.actor;
        delete this.item;
        delete this.tweaks;
        delete this.advanceEditor;
        delete this.journalEntry;
        delete this.journalEntryPage;
        this.activeWindows = [];
        await super.start();
    }
    async _preStep() {
        await super._preStep();
        const currentStep = this.currentStep;
        let earlyReturn;
        // Modify any game settings we need to make the magic happen
        if (currentStep.settings)
            earlyReturn = await this.updateSettings(currentStep.settings);
        if (earlyReturn === true)
            return;
        if (earlyReturn === false)
            return this.exit();
        // If we need an actor, make it and render
        if (currentStep.actor)
            earlyReturn = await this.makeActor(currentStep.actor);
        if (earlyReturn === true)
            return;
        if (earlyReturn === false)
            return this.exit();
        // Journal and Journal Page creation
        if (currentStep.journalEntry)
            earlyReturn = await this.makeJournalEntry(currentStep.journalEntry);
        if (currentStep.journalEntryPage)
            earlyReturn = await this.makeJournalEntryPage(currentStep.journalEntryPage);
        if (earlyReturn === true)
            return;
        if (earlyReturn === false)
            return this.exit();
        if (currentStep.itemName)
            await this.renderItem(currentStep.itemName);
        // Create an advance for possible use later
        if (currentStep.advance)
            await this.makeAdvance(currentStep.advance);
        if (currentStep.tab)
            // If there's tab info, switch to that tab
            await this.switchTab(currentStep.tab);
        // Leaving to the end because we're only ever going to need one actor at a time and it's created much earlier
        currentStep.selector = currentStep.selector?.replace('actorSheetID', this.actor?.sheet?.id || '');
        // Same with Tweaks dialog
        currentStep.selector = currentStep.selector?.replace('tweaks', this.tweaks?.id || '');
        // And of course the journal pages
        currentStep.selector = currentStep.selector?.replace('journalSheetID', this.journalEntry?.sheet?.id || '');
        currentStep.selector = currentStep.selector?.replace('journalPageSheetID', this.journalEntryPage?.sheet?.id || '');
        // Ensure relevant window is on top
        for (const sheet of [this.actor?.sheet, this.tweaks, this.journalEntry?.sheet, this.journalEntryPage?.sheet]) {
            if (currentStep.selector?.includes(sheet?.id)) {
                await sheet.render(true);
            }
        }
        if (currentStep.selector?.includes('div.advance-editor')) {
            await this.advanceEditor?.render({ force: true });
        }
    }
    async _postStep() {
        const currentStep = this.currentStep;
        // Un-replace selector info so repeated tours work without refresh
        if (this.actor?.sheet?.id)
            currentStep.selector = currentStep.selector?.replace(this.actor.sheet.id, 'actorSheetID');
        // Same with Tweaks dialog
        if (this.tweaks?.id)
            currentStep.selector = currentStep.selector?.replace(this.tweaks.id, 'tweaks');
        // And of course the journal pages
        if (this.journalEntry?.sheet?.id)
            currentStep.selector = currentStep.selector?.replace(this.journalEntry.sheet.id, 'journalSheetID');
        if (this.journalEntryPage?.sheet?.id)
            currentStep.selector = currentStep.selector?.replace(this.journalEntryPage.sheet.id, 'journalPageSheetID');
        await super._postStep();
    }
    async complete() {
        for (const app of this.activeWindows) {
            app?.close();
        }
        return super.complete();
    }
    exit() {
        for (const app of this.activeWindows) {
            app?.close();
        }
        super.exit();
    }
    /**
     * Update settings as required by the tour
     * @param settings Settings to update
     */
    async updateSettings(settings) {
        if (!game.user.can('SETTINGS_MODIFY')) {
            const alreadySet = Object.entries(settings).every(([k, v]) => {
                if (k === 'settingFields') {
                    const additionalFields = game.settings.get('swade', k);
                    return Object.entries(additionalFields).every(([documentType, f]) => {
                        if (!v[documentType])
                            return true;
                        return Object.entries(v[documentType]).every(([field, value]) => {
                            return foundry.utils.objectsEqual(f[field], value);
                        });
                    });
                }
                else {
                    return game.settings.get('swade', k) === v;
                }
            });
            if (!alreadySet) {
                ui.notifications.error('SWADE.TOURS.ERROR.SettingPermission', {
                    localize: true,
                });
                this.exit();
                return false;
            }
            else {
                const settingsDone = this.steps.findIndex((s, i) => i > this.stepIndex &&
                    !s.selector.startsWith('#settingConfig') &&
                    !s.selector.startsWith('#client-settings'));
                await this.earlyProgress(settingsDone);
                return true;
            }
        }
        for (const [k, v] of Object.entries(settings)) {
            if (k !== 'settingFields')
                await game.settings.set('swade', k, v);
            else {
                const settingFields = game.settings.get('swade', k);
                foundry.utils.mergeObject(settingFields, v);
                await game.settings.set('swade', k, settingFields);
            }
        }
        // There's no automatic update of the configurator after setting updates
        if (this.configurator?.rendered) {
            this.configurator.render();
        }
    }
    /**
     * Make and render an actor
     * @param actor Actor Data
     */
    async makeActor(actor) {
        const actCls = getDocumentClass('Actor');
        actor = foundry.utils.duplicate(actor);
        actor.name = game.i18n.localize(actor.name);
        if (actor.items) {
            for (const item of actor.items) {
                item.name = game.i18n.localize(item.name);
            }
        }
        this.actor = new actCls(actor);
        if (this.actor.sheet)
            this.actor.sheet.options.submitOnClose = false;
        // TODO: simplify once definitely AppV2
        // @ts-expect-error _render
        const renderFunc = this.actor.sheet?._render ?? this.actor.sheet?.render;
        await renderFunc.call(this.actor.sheet, true);
        if (this.actor.sheet)
            this.activeWindows.push(this.actor.sheet);
    }
    /**
     * Renders an item by name
     * @param itemName  Item to fetch on the actor
     */
    async renderItem(itemName) {
        // Alternatively, if we need to fetch an item from the actor
        // let's do that and potentially render the sheet
        if (!this.actor) {
            console.warn('No actor found for step ' + this.currentStep.title);
        }
        const localizedName = game.i18n.localize(itemName);
        this.item = this.actor?.items.getName(localizedName);
        const app = this.item.sheet;
        // TODO: simplify once definitely AppV2
        const renderFunc = app._render ?? app.render;
        if (!app.rendered)
            await renderFunc.call(app, true);
        this.activeWindows.push(app);
        // Assumption: Any given tour user might need to move back and forth between items
        // but only one actor is active at a time, so itemName is always specified when operating on an embedded item sheet
        // but the framework doesn't allow bouncing back and forth between actors
        this.currentStep.selector = this.currentStep.selector.replace('itemSheetID', app.id);
    }
    async makeAdvance(advance) {
        if (!this.actor || !(this.actor.system instanceof CreatureData))
            return;
        const advances = this.actor.system.advances.list;
        advances.set(advance.id, advance);
        this.actor.updateSource({ 'system.advances.list': advances.toJSON() });
        this.actor.sheet?.render({ force: true });
        if (advance.dialog) {
            this.advanceEditor = new AdvanceEditor({ advance, actor: this.actor });
            await this.advanceEditor.render({ force: true });
            this.activeWindows.push(this.advanceEditor);
        }
    }
    async makeJournalEntry(journalEntry) {
        const journalCls = getDocumentClass('JournalEntry');
        journalEntry = foundry.utils.duplicate(journalEntry);
        journalEntry.name = game.i18n.localize(journalEntry.name);
        this.journalEntry = new journalCls(journalEntry);
        await this.journalEntry?.sheet?.render(true);
        if (this.journalEntry?.sheet)
            this.activeWindows.push(this.journalEntry.sheet);
    }
    async makeJournalEntryPage(journalEntryPage) {
        const journalPageCls = getDocumentClass('JournalEntryPage');
        journalEntryPage = foundry.utils.duplicate(journalEntryPage);
        journalEntryPage.name = game.i18n.localize(journalEntryPage.name);
        this.journalEntryPage = new journalPageCls(journalEntryPage, { parent: this.journalEntry });
        this.journalEntry?.updateSource({
            pages: [this.journalEntryPage?.toObject()]
        });
        this.journalEntry?.sheet?.render();
        await this.journalEntryPage?.sheet?.render(true);
        if (this.journalEntryPage?.sheet)
            this.activeWindows.push(this.journalEntryPage.sheet);
    }
    /**
     * Flip between tabs of various applications
     * @param tab The tab to switch to
     */
    async switchTab(tab) {
        switch (tab.parent) {
            case constants$1.TOUR_TAB_PARENTS.SIDEBAR:
                ui.sidebar.changeTab(tab.id, tab.group);
                break;
            case constants$1.TOUR_TAB_PARENTS.GAMESETTINGS: {
                const app = game.settings.sheet;
                await app.render(true);
                this.activeWindows.push(app);
                app.changeTab(tab.id, tab.group);
                break;
            }
            case constants$1.TOUR_TAB_PARENTS.CONFIGURATOR: {
                if (!this.configurator) {
                    const configurator = game.settings.menus.get('swade.setting-config');
                    this.configurator = new configurator.type();
                }
                await this.configurator.render({ force: true });
                this.activeWindows.push(this.configurator);
                this.configurator.changeTab(tab.id, tab.group);
                break;
            }
            case constants$1.TOUR_TAB_PARENTS.ACTOR: {
                if (!this.actor) {
                    console.warn('No Actor Found');
                    break;
                }
                const app = this.actor.sheet;
                app?.activateTab(tab.id);
                break;
            }
            case constants$1.TOUR_TAB_PARENTS.ITEM: {
                if (!this.item) {
                    console.warn('No Item Found');
                    break;
                }
                const app = this.item.sheet;
                app?.activateTab(tab.id);
                break;
            }
            case constants$1.TOUR_TAB_PARENTS.TWEAKS: {
                if (!this.tweaks) {
                    this.tweaks = new SwadeActorTweaks({ document: this.actor });
                    await this.tweaks.render({ force: true });
                    this.activeWindows.push(this.tweaks);
                }
                this.tweaks.changeTab(tab.id, tab.group);
            }
        }
    }
    async earlyProgress(stepIndex) {
        const progress = game.settings.get('core', 'tourProgress');
        const namespace = this.namespace;
        if (!(namespace in progress))
            progress[namespace] = {};
        progress[namespace][this.id] = stepIndex;
        game.settings.set('core', 'tourProgress', progress);
        this._reloadProgress();
        await this._preStep();
    }
}

async function registerSWADETours() {
    try {
        game.tours.register('swade', 'ammunition', await SwadeTour.fromJSON('/systems/swade/tours/ammunition.json'));
        game.tours.register('swade', 'tweaks', await SwadeTour.fromJSON('/systems/swade/tours/tweaks.json'));
        game.tours.register('swade', 'additional-stats', await SwadeTour.fromJSON('/systems/swade/tours/additional-stats.json'));
        game.tours.register('swade', 'auras', await SwadeTour.fromJSON('/systems/swade/tours/auras.json'));
        game.tours.register('swade', 'advances', await SwadeTour.fromJSON('systems/swade/tours/advances.json'));
        game.tours.register('swade', 'headquarters', await SwadeTour.fromJSON('systems/swade/tours/headquarters.json'));
    }
    catch (err) {
        console.log(err);
    }
}

/* eslint-disable @typescript-eslint/naming-convention */
class InfraVisionFilter extends foundry.canvas.rendering.filters
    .AbstractBaseFilter {
    static defaultUniforms = {
        luminanceThreshold: 0.5,
        alphaThreshold: 0.1,
    };
    /**
     * fragment shader based on the following snippets:
     * @link https://www.shadertoy.com/view/4dcSDH
     * @linl https://www.geeks3d.com/20101123/shader-library-predators-thermal-vision-post-processing-filter-glsl/
     */
    static fragmentShader = `
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform float luminanceThreshold;
  uniform float alphaThreshold;

  #define RED vec4(1.0, 0.0, 0.0, 1.0)
  #define YELLOW vec4(1.0, 1.0, 0.0, 1.0)
  #define BLUE vec4(0.0, 0.0, 1.0, 1.0)
  #define GREEN vec4(0.0, 1.0, 0.0, 1.0)

  void main(void) {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    float luminance = dot(vec3(0.30, 0.59, 0.11), texColor.rgb);
    if ( texColor.a > alphaThreshold ) {
      gl_FragColor = (luminance < luminanceThreshold) ? mix(BLUE, mix(YELLOW, GREEN, luminance / 0.5), luminance * 2.0 ) : mix(YELLOW, RED, (luminance - 0.5) * 2.0);
      gl_FragColor.rgb *= 0.1 + 0.25 + 0.75 * pow( 16.0 * vTextureCoord.x * vTextureCoord.y * (1.0 - vTextureCoord.x) * (1.0 - vTextureCoord.y), 0.15 );
      gl_FragColor.a = texColor.a;
    } else {
      gl_FragColor = vec4(0.0);
    }
  }`;
}

class DetectionModeInfravision extends foundry.canvas.perception
    .DetectionMode {
    static getDetectionFilter() {
        return (this._detectionFilter ??= InfraVisionFilter.create());
    }
    _canDetect(visionSource, target) {
        // See/Sense Heat can ONLY detect warm tokens, ignoring those that are cold-bodied
        const tgt = target?.document;
        const coldBodied = tgt instanceof TokenDocument &&
            tgt.hasStatusEffect(CONFIG.specialStatusEffects.COLDBODIED);
        if (coldBodied)
            return false;
        // The source may not be blind if the detection mode requires sight
        const src = visionSource?.object?.document;
        const isBlind = src instanceof TokenDocument &&
            this.type ===
                foundry.canvas.perception.DetectionMode.DETECTION_TYPES.SIGHT &&
            src.hasStatusEffect(CONFIG.specialStatusEffects.BLIND);
        return !isBlind;
    }
}

class InfravisionBackgroundVisionShader extends foundry.canvas.rendering
    .shaders.AmplificationBackgroundVisionShader {
    static COLOR_TINT = [0.25, 0.41, 0.88];
    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static defaultUniforms = {
        ...super.defaultUniforms,
        colorTint: this.COLOR_TINT,
    };
}

const swadeAPI = {
    sheets: {
        CharacterSheet,
        SwadeItemSheetV2,
        SwadeNPCSheet,
        SwadeVehicleSheetV2,
    },
    apps: {
        SwadeDocumentTweaks,
        SwadeActorTweaks,
        SwadeItemTweaks,
        AdvanceEditor,
        SettingConfigurator,
        CompendiumTOC,
        AttributeManager,
        ActiveEffectWizard,
    },
    dice: {
        Benny,
        WildDie,
    },
    util: {
        getStatusEffectDataById,
        slugify,
        getItemsBySwid,
    },
    compendiumArt: {
        map: new Map(),
    },
    rollItemMacro,
    sockets: new SwadeSocketHandler(),
    migrations: migrations,
    itemChatCardHelper: ItemChatCardHelper,
    CharacterSummarizer,
    RollDialog,
    effectCallbacks: new Collection(),
    ready: false,
    data,
    SwadeTour,
};
globalThis.swade = swadeAPI;
/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */
Hooks.once('init', () => {
    Logger.info(`Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`);
    //Record Configuration Values
    CONFIG.SWADE = SWADE;
    //freeze the constants
    deepFreeze(CONFIG.SWADE.CONST);
    // Initialize socket handler
    swadeAPI.sockets.registerSocketListeners();
    //set up global game object
    game.swade = swadeAPI;
    //register document classes
    CONFIG.Actor.documentClass = SwadeActor;
    CONFIG.Item.documentClass = SwadeItem;
    CONFIG.Combat.documentClass = SwadeCombat;
    CONFIG.Combatant.documentClass = SwadeCombatant;
    CONFIG.ActiveEffect.documentClass = SwadeActiveEffect;
    CONFIG.User.documentClass = SwadeUser;
    CONFIG.Cards.documentClass = SwadeCards;
    CONFIG.ChatMessage.documentClass = SwadeChatMessage;
    //register System Data Model
    CONFIG.Actor.dataModels = config$4;
    CONFIG.Item.dataModels = config$5;
    CONFIG.JournalEntryPage.dataModels = config;
    CONFIG.Card.dataModels = config$3;
    CONFIG.ChatMessage.dataModels = config$2;
    CONFIG.ActiveEffect.dataModels = config$1;
    CONFIG.Combat.dataModels = combatConfig;
    CONFIG.Combatant.dataModels = combatantConfig;
    CONFIG.CombatantGroup.dataModels = combatantGroupConfig;
    //register custom object classes
    CONFIG.MeasuredTemplate.objectClass = SwadeMeasuredTemplate;
    // SWADE's default cone template is a very special case that we're storing at angle===0
    // This preserves access to the other types of cone definitions
    CONFIG.MeasuredTemplate.defaults.angle = 0;
    CONFIG.Token.objectClass = SwadeToken;
    //register custom sidebar tabs
    CONFIG.ui.combat = SwadeCombatTracker;
    CONFIG.ui.chat = SwadeChatLog;
    //set up round timers to 6 seconds
    CONFIG.time.roundTime = 6;
    //register card presets
    CONFIG.Cards.presets = {
        actionDeck: {
            label: 'SWADE.ActionDeckPresetPEG',
            src: 'systems/swade/cards/action-deck-peg.json',
            type: 'deck',
        },
        pokerLight: {
            label: 'SWADE.ActionDeckPresetLight',
            src: 'systems/swade/cards/action-deck-light.json',
            type: 'deck',
        },
        pokerDark: {
            label: 'SWADE.ActionDeckPresetDark',
            src: 'systems/swade/cards/action-deck-dark.json',
            type: 'deck',
        },
    };
    //register custom status effects
    CONFIG.statusEffects = foundry.utils.deepClone(SWADE.statusEffects);
    Object.assign(CONFIG.specialStatusEffects, {
        COLDBODIED: 'cold-bodied',
        INCAPACITATED: 'incapacitated',
        BURROW: 'burrowing',
        FLY: 'flying',
    });
    // v11 Active Effect handling
    CONFIG.ActiveEffect.legacyTransferral = false;
    //register detection modes
    CONFIG.Canvas.detectionModes.seeHeat = new DetectionModeInfravision({
        id: 'seeHeat',
        label: 'SWADE.Vision.SeeHeat',
        type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER,
    });
    CONFIG.Canvas.detectionModes.senseHeat = new DetectionModeInfravision({
        id: 'senseHeat',
        label: 'SWADE.Vision.SenseHeat',
        walls: false,
        type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER,
    });
    CONFIG.Canvas.visionModes.infraVision =
        new foundry.canvas.perception.VisionMode({
            id: 'infraVision',
            label: 'SWADE.Vision.Infravision',
            canvas: {
                shader: foundry.canvas.rendering.shaders.ColorAdjustmentsSamplerShader,
                uniforms: {
                    saturation: -0.5,
                    tint: InfravisionBackgroundVisionShader.COLOR_TINT,
                },
            },
            lighting: {
                background: {
                    visibility: foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
                },
                illumination: {
                    visibility: foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
                },
                coloration: {
                    visibility: foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
                },
            },
            vision: {
                darkness: { adaptive: false },
                defaults: {
                    attenuation: 0,
                    brightness: 0.5,
                    saturation: -0.5,
                    contrast: 0,
                },
                background: { shader: InfravisionBackgroundVisionShader },
            },
        });
    CONFIG.Actor.compendiumIndexFields.push('system.wildcard');
    CONFIG.Item.compendiumIndexFields.push('system.swid');
    // @ts-expect-error Yes we're calling a protected function
    foundry.appv1.sheets.JournalTextPageSheet._converter.setOption('tables', true);
    //register custom Handlebars helpers
    registerCustomHelpers();
    //Preload Handlebars templates
    preloadHandlebarsTemplates();
    // Register custom system settings
    registerSettings();
    registerSettingRules();
    register3DBennySettings();
    //register keyboard shortcuts
    registerKeybindings();
    registerEffectCallbacks();
    registerAuraHooks();
    // Register sheets
    foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
    foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
    foundry.applications.apps.DocumentSheetConfig.unregisterSheet(CONFIG.Token.documentClass, 'core', foundry.applications.sheets.TokenConfig);
    foundry.documents.collections.Actors.registerSheet('swade', GroupSheet, {
        types: ['group'],
        makeDefault: true,
        label: 'SWADE.GroupSheet',
    });
    foundry.documents.collections.Actors.registerSheet('swade', SwadeVehicleSheetV2, {
        types: ['vehicle'],
        makeDefault: true,
        label: 'SWADE.VehicleSheet',
    });
    foundry.documents.collections.Actors.registerSheet('swade', CharacterSheet, {
        types: ['character', 'npc'],
        makeDefault: true,
        label: 'SWADE.OfficialSheet',
    });
    foundry.documents.collections.Actors.registerSheet('swade', SwadeNPCSheet, {
        types: ['npc'],
        makeDefault: true,
        label: 'SWADE.CommunityNPCSheet',
    });
    foundry.documents.collections.Items.registerSheet('swade', SwadeItemSheetV2, {
        makeDefault: true,
        types: [
            'ability',
            'action',
            'ancestry',
            'armor',
            'consumable',
            'edge',
            'gear',
            'hindrance',
            'power',
            'shield',
            'skill',
            'weapon',
        ],
        label: 'SWADE.ItemSheet',
    });
    foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, 'swade', JournalHeadquartersPageSheet, {
        types: ['headquarters'],
        makeDefault: true,
        label: 'SWADE.HeadquartersSheet',
    });
    foundry.applications.apps.DocumentSheetConfig.registerSheet(TokenDocument, 'swade', SwadeTokenConfig);
    // Register Tours
    registerSWADETours();
    //@ts-expect-error Types don't allow this, but seems a supported use case
    CONFIG.Dice.SwadeRoll = SwadeRoll;
    //@ts-expect-error Types don't allow this, but seems a supported use case
    CONFIG.Dice.TraitRoll = TraitRoll;
    //@ts-expect-error Types don't allow this, but seems a supported use case
    CONFIG.Dice.DamageRoll = DamageRoll;
    CONFIG.Dice.terms.b = Benny;
    CONFIG.Dice.rolls.unshift(SwadeRoll);
    CONFIG.Dice.rolls.push(TraitRoll, DamageRoll);
    CONFIG.Dice.types.push(WildDie);
});
Hooks.once('i18nInit', SwadeCoreHooks.onI18nInit);
Hooks.once('setup', SwadeCoreHooks.onSetup);
Hooks.once('ready', SwadeCoreHooks.onReady);
Hooks.on('hotReload', SwadeCoreHooks.onHotReload);
Hooks.on('getSceneControlButtons', SwadeCoreHooks.onGetSceneControlButtons);
Hooks.on('hotbarDrop', SwadeCoreHooks.onHotbarDrop);
Hooks.on('createProseMirrorEditor', SwadeCoreHooks.onCreateProseMirrorEditor);
/* ------------------------------------ */
/* Application Render					          */
/* ------------------------------------ */
Hooks.on('renderCombatantConfig', SwadeCoreHooks.onRenderCombatantConfig);
Hooks.on('renderActiveEffectConfig', SwadeCoreHooks.onRenderActiveEffectConfig);
Hooks.on('renderCompendium', SwadeCoreHooks.onRenderCompendium);
Hooks.on('renderChatMessageHTML', SwadeCoreHooks.onRenderChatMessageHTML);
Hooks.on('renderPlayers', SwadeCoreHooks.onRenderPlayers);
Hooks.on('renderUserConfig', SwadeCoreHooks.onRenderUserConfig);
/* ------------------------------------ */
/* Sidebar Tab Render					          */
/* ------------------------------------ */
Hooks.on('renderActorDirectory', SwadeCoreHooks.onRenderActorDirectory);
Hooks.on('renderSettings', SwadeCoreHooks.onRenderSettings);
Hooks.on('renderCompendiumDirectory', SwadeCoreHooks.onRenderCompendiumDirectory);
/* ------------------------------------ */
/* Context Options    				          */
/* ------------------------------------ */
Hooks.on('getUserContextOptions', SwadeCoreHooks.onGetUserContextOptions);
Hooks.on('getActorContextOptions', SwadeCoreHooks.onGetActorContextOptions);
Hooks.on('getCardsContextOptions', SwadeCoreHooks.onGetCardsContextOptions);
Hooks.on('getCompendiumContextOptions', SwadeCoreHooks.onGetCompendiumContextOptions);
/* ------------------------------------ */
/* Update Hooks              	          */
/* ------------------------------------ */
Hooks.on('userConnected', SwadeCoreHooks.onUserConnected);
Hooks.on('updateCombat', SwadeCoreHooks.onUpdateCombat);
Hooks.on('targetToken', SwadeCoreHooks.onTargetToken);
/* ------------------------------------ */
/* Canvas Interactions  			          */
/* ------------------------------------ */
Hooks.on('dropCanvasData', SwadeCoreHooks.onDropCanvasData);
/* ------------------------------------ */
/* System Hooks              	          */
/* ------------------------------------ */
// Hooks.on('renderSwadeRollMessage', SwadeSystemHooks.onRenderSwadeRollMessage);
/* ------------------------------------ */
/* Third Party Integrations		          */
/* ------------------------------------ */
/** Dice So Nice*/
Hooks.once('diceSoNiceInit', SwadeIntegrationHooks.onDiceSoNiceInit);
Hooks.once('diceSoNiceReady', SwadeIntegrationHooks.onDiceSoNiceReady);
Hooks.on('diceSoNiceRollStart', SwadeIntegrationHooks.onDiceSoNiceRollStart);
/** Developer Mode */
Hooks.once('devModeReady', SwadeIntegrationHooks.onDevModeReady);
/** Item Piles */
Hooks.once('item-piles-ready', SwadeIntegrationHooks.onItemPilesReady);
//# sourceMappingURL=swade.js.map
