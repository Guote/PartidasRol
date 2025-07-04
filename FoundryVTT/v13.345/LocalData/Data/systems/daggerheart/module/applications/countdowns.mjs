import { countdownTypes } from '../config/generalConfig.mjs';
import { GMUpdateEvent, RefreshType, socketEvent } from '../helpers/socket.mjs';
import OwnershipSelection from './ownershipSelection.mjs';

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

class Countdowns extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(basePath) {
        super({});

        this.basePath = basePath;
    }

    get title() {
        return game.i18n.format('DAGGERHEART.Countdown.Title', {
            type: game.i18n.localize(`DAGGERHEART.Countdown.Types.${this.basePath}`)
        });
    }

    static DEFAULT_OPTIONS = {
        classes: ['daggerheart', 'dh-style', 'countdown'],
        tag: 'form',
        position: { width: 740, height: 700 },
        window: {
            frame: true,
            title: 'Countdowns',
            resizable: true,
            minimizable: true
        },
        actions: {
            addCountdown: this.addCountdown,
            removeCountdown: this.removeCountdown,
            editImage: this.onEditImage,
            openOwnership: this.openOwnership,
            openCountdownOwnership: this.openCountdownOwnership
        },
        form: { handler: this.updateData, submitOnChange: true }
    };

    static PARTS = {
        countdowns: {
            template: 'systems/daggerheart/templates/views/countdowns.hbs',
            scrollable: ['.expanded-view']
        }
    };

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);

        htmlElement.querySelectorAll('.mini-countdown-container').forEach(element => {
            element.addEventListener('click', event => this.updateCountdownValue.bind(this)(event, false));
            element.addEventListener('contextmenu', event => this.updateCountdownValue.bind(this)(event, true));
        });
    }

    async _onFirstRender(context, options) {
        super._onFirstRender(context, options);

        this.element.querySelector('.expanded-view').classList.toggle('hidden');
        this.element.querySelector('.minimized-view').classList.toggle('hidden');
    }

    async _prepareContext(_options) {
        const context = await super._prepareContext(_options);
        const countdownData = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath];

        context.isGM = game.user.isGM;
        context.base = this.basePath;

        context.canCreate = countdownData.playerOwnership[game.user.id].value === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
        context.source = {
            ...countdownData,
            countdowns: Object.keys(countdownData.countdowns).reduce((acc, key) => {
                const countdown = countdownData.countdowns[key];

                const ownershipValue = countdown.playerOwnership[game.user.id].value;
                if (ownershipValue > CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE) {
                    acc[key] = { ...countdown, canEdit: ownershipValue === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER };
                }

                return acc;
            }, {})
        };
        context.systemFields = countdownData.schema.fields;
        context.countdownFields = context.systemFields.countdowns.element.fields;
        context.minimized = this.minimized || _options.isFirstRender;

        return context;
    }

    static async updateData(event, _, formData) {
        const data = foundry.utils.expandObject(formData.object);
        const newSetting = foundry.utils.mergeObject(
            game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns).toObject(),
            data
        );

        if (game.user.isGM) {
            await game.settings.set(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns, newSetting);
            this.render();
        } else {
            await game.socket.emit(`system.${SYSTEM.id}`, {
                action: socketEvent.GMUpdate,
                data: {
                    action: GMUpdateEvent.UpdateSetting,
                    uuid: SYSTEM.SETTINGS.gameSettings.Countdowns,
                    update: newSetting
                }
            });
        }
    }

    async minimize() {
        await super.minimize();

        this.element.querySelector('.expanded-view').classList.toggle('hidden');
        this.element.querySelector('.minimized-view').classList.toggle('hidden');
    }

    async maximize() {
        if (this.minimized) {
            const settings = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath];
            if (settings.playerOwnership[game.user.id].value <= CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED) {
                ui.notifications.info(game.i18n.localize('DAGGERHEART.Countdown.Notifications.LimitedOwnership'));
                return;
            }

            this.element.querySelector('.expanded-view').classList.toggle('hidden');
            this.element.querySelector('.minimized-view').classList.toggle('hidden');
        }

        await super.maximize();
    }

    async updateSetting(update) {
        if (game.user.isGM) {
            await game.settings.set(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns, update);
            await game.socket.emit(`system.${SYSTEM.id}`, {
                action: socketEvent.Refresh,
                data: {
                    refreshType: RefreshType.Countdown,
                    application: `${this.basePath}-countdowns`
                }
            });

            this.render();
        } else {
            await game.socket.emit(`system.${SYSTEM.id}`, {
                action: socketEvent.GMUpdate,
                data: {
                    action: GMUpdateEvent.UpdateSetting,
                    uuid: SYSTEM.SETTINGS.gameSettings.Countdowns,
                    update: update,
                    refresh: { refreshType: RefreshType.Countdown, application: `${this.basePath}-countdowns` }
                }
            });
        }
    }

    static onEditImage(_, target) {
        const setting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath];
        const current = setting.countdowns[target.dataset.countdown].img;
        const fp = new FilePicker({
            current,
            type: 'image',
            callback: async path => this.updateImage.bind(this)(path, target.dataset.countdown),
            top: this.position.top + 40,
            left: this.position.left + 10
        });
        return fp.browse();
    }

    async updateImage(path, countdown) {
        const setting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
        await setting.updateSource({
            [`${this.basePath}.countdowns.${countdown}.img`]: path
        });

        await this.updateSetting(setting);
    }

    static openOwnership(_, target) {
        new Promise((resolve, reject) => {
            const setting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath];
            const ownership = { default: setting.ownership.default, players: setting.playerOwnership };
            new OwnershipSelection(resolve, reject, this.title, ownership).render(true);
        }).then(async ownership => {
            const setting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
            await setting.updateSource({
                [`${this.basePath}.ownership`]: ownership
            });

            await game.settings.set(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns, setting.toObject());
            this.render();
        });
    }

    static openCountdownOwnership(_, target) {
        const countdownId = target.dataset.countdown;
        new Promise((resolve, reject) => {
            const countdown = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath]
                .countdowns[countdownId];
            const ownership = { default: countdown.ownership.default, players: countdown.playerOwnership };
            new OwnershipSelection(resolve, reject, countdown.name, ownership).render(true);
        }).then(async ownership => {
            const setting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
            await setting.updateSource({
                [`${this.basePath}.countdowns.${countdownId}.ownership`]: ownership
            });

            await game.settings.set(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns, setting);
            this.render();
        });
    }

    async updateCountdownValue(event, increase) {
        const countdownSetting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
        const countdown = countdownSetting[this.basePath].countdowns[event.currentTarget.dataset.countdown];

        if (countdown.playerOwnership[game.user.id] < CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) {
            return;
        }

        const currentValue = countdown.progress.current;

        if (increase && currentValue === countdown.progress.max) return;
        if (!increase && currentValue === 0) return;

        await countdownSetting.updateSource({
            [`${this.basePath}.countdowns.${event.currentTarget.dataset.countdown}.progress.current`]: increase
                ? currentValue + 1
                : currentValue - 1
        });

        await this.updateSetting(countdownSetting.toObject());
    }

    static async addCountdown() {
        const countdownSetting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
        await countdownSetting.updateSource({
            [`${this.basePath}.countdowns.${foundry.utils.randomID()}`]: {
                name: game.i18n.localize('DAGGERHEART.Countdown.NewCountdown'),
                ownership: game.user.isGM
                    ? {}
                    : {
                          players: {
                              [game.user.id]: { type: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
                          }
                      }
            }
        });

        await this.updateSetting(countdownSetting.toObject());
    }

    static async removeCountdown(_, target) {
        const countdownSetting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
        const countdownName = countdownSetting[this.basePath].countdowns[target.dataset.countdown].name;

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: {
                title: game.i18n.localize('DAGGERHEART.Countdown.RemoveCountdownTitle')
            },
            content: game.i18n.format('DAGGERHEART.Countdown.RemoveCountdownText', { name: countdownName })
        });
        if (!confirmed) return;

        await countdownSetting.updateSource({ [`${this.basePath}.countdowns.-=${target.dataset.countdown}`]: null });

        await this.updateSetting(countdownSetting.toObject());
    }

    async open() {
        await this.render(true);
        if (
            Object.keys(game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns)[this.basePath].countdowns)
                .length > 0
        ) {
            this.minimize();
        }
    }
}

export class NarrativeCountdowns extends Countdowns {
    constructor() {
        super('narrative');
    }

    static DEFAULT_OPTIONS = {
        id: 'narrative-countdowns'
    };
}

export class EncounterCountdowns extends Countdowns {
    constructor() {
        super('encounter');
    }

    static DEFAULT_OPTIONS = {
        id: 'encounter-countdowns'
    };
}

export const registerCountdownApplicationHooks = () => {
    const updateCountdowns = async shouldProgress => {
        if (game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Automation).countdowns) {
            const countdownSetting = game.settings.get(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns);
            for (let countdownCategoryKey in countdownSetting) {
                const countdownCategory = countdownSetting[countdownCategoryKey];
                for (let countdownKey in countdownCategory.countdowns) {
                    const countdown = countdownCategory.countdowns[countdownKey];

                    if (shouldProgress(countdown)) {
                        await countdownSetting.updateSource({
                            [`${countdownCategoryKey}.countdowns.${countdownKey}.progress.current`]:
                                countdown.progress.current - 1
                        });
                        await game.settings.set(SYSTEM.id, SYSTEM.SETTINGS.gameSettings.Countdowns, countdownSetting);
                        foundry.applications.instances.get(`${countdownCategoryKey}-countdowns`)?.render();
                    }
                }
            }
        }
    };

    Hooks.on(SYSTEM.HOOKS.characterAttack, async () => {
        updateCountdowns(countdown => {
            return (
                countdown.progress.type.value === countdownTypes.characterAttack.id && countdown.progress.current > 0
            );
        });
    });

    Hooks.on(SYSTEM.HOOKS.spotlight, async () => {
        updateCountdowns(countdown => {
            return countdown.progress.type.value === countdownTypes.spotlight.id && countdown.progress.current > 0;
        });
    });
};
