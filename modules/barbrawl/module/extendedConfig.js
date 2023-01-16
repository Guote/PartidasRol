import { getBar } from "./api.js";
import { onChangeBarAttribute } from "./config.js";

export default class BarConfigExtended extends FormApplication {
    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "modules/barbrawl/templates/bar-config-extended.hbs",
            width: 480
        });
    }

    /** @override */
    get id() {
        return `brawlbar-${this.object.id}`;
    }

    /** @override */
    get title() {
        return `${game.i18n.localize("barbrawl.config.advanced")}: ${this.object.id}`;
    }

    /** @override */
    async _updateObject(_event, formData) {
        // Resolve token configuration for original document.
        const tokenConfig = Object.values(ui.windows)
            .find(conf => conf instanceof TokenConfig && conf.token === this.options.parent);

        // Update the data.
        if (this.options.isDefaultToken) {
            // Fetch and merge the existing settings.
            const setting = game.settings.get("core", DefaultTokenConfig.SETTING);
            foundry.utils.mergeObject(setting, foundry.utils.expandObject(formData));

            // Synchronize with Foundry bar attributes.
            const resources = foundry.utils.getProperty(setting, "flags.barbrawl.resourceBars");
            foundry.utils.setProperty(setting, "bar1.attribute", resources.bar1?.attribute ?? "");
            foundry.utils.setProperty(setting, "bar2.attribute", resources.bar2?.attribute ?? "");

            // Store the new settings.
            await game.settings.set("core", DefaultTokenConfig.SETTING, setting);
        } else if (this.options.parent instanceof PrototypeTokenDocument) {
            // Update the actor instead of the token.
            await this.options.parent.actor.update({ token: formData });
            this.options.parent.data.update(formData);
        } else {
            await this.options.parent.update(formData);
        }

        // Check if the token configuration is still open.
        if (!tokenConfig) return;

        // Replace the configuration element of the bar with an updated version to avoid discarding other changes.
        const barEl = tokenConfig.element.find("div#" + this.object.id);
        if (!barEl.length) return;

        const configElement = $(await renderTemplate("modules/barbrawl/templates/bar-config.hbs", {
            brawlBars: [getBar(this.options.parent, this.object.id)], // Dialog object is outdated at this point.
            displayModes: this.options.displayModes,
            barAttributes: this.options.barAttributes
        })).find("div#" + this.object.id)[0];

        // Retain the order of the bar.
        const order = barEl[0].querySelector(`input[name="flags.barbrawl.resourceBars.${this.object.id}.order"]`).value;
        configElement.querySelector(`input[name="flags.barbrawl.resourceBars.${this.object.id}.order"]`).value = order;
        barEl.replaceWith(configElement);
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        html.find(".brawlbar-attribute")
            .change(onChangeBarAttribute.bind(this.options.parent))
            .trigger("change"); // Trigger change event once to update resource values.
    }
}