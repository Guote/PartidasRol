const MODULE = "combat-tracker-disposition"

const dispositionColors = { //Take the base 10 number, convert it to hexadecimal and add a # to the start
    FRIENDLY: "#" + CONFIG.Canvas.dispositionColors.FRIENDLY.toString(16),
    NEUTRAL: "#" + CONFIG.Canvas.dispositionColors.NEUTRAL.toString(16),
    HOSTILE: "#" + CONFIG.Canvas.dispositionColors.HOSTILE.toString(16)
};

Hooks.on("init", () => {
    game.settings.registerMenu(MODULE, "customColours", {
        name: "Custom Colours",
        label: "Configure Custom Colours",
        hint: "Change the colour of each disposition in the combat tracker.",
        icon: "fas fa-paint-roller",
        type: customColourMenu
    });
    
    game.settings.register(MODULE, "hostileColour", {
        scope: "world",
        config: false,
        type: String,
        default: dispositionColors.HOSTILE,
        onChange: () => {
            setColors();
            updateColors();
        }
    });
    
    game.settings.register(MODULE, "neutralColour", {
        scope: "world",
        config: false,
        type: String,
        default: dispositionColors.NEUTRAL,
        onChange: () => {
            setColors();
            updateColors();
        }
    });
    
    game.settings.register(MODULE, "friendlyColour", {
        scope: "world",
        config: false,
        type: String,
        default: dispositionColors.FRIENDLY,
        onChange: () => {
            setColors();
            updateColors();
        }
    });
    
    game.settings.register(MODULE, "opacity", {
        scope: "world",
        config: true,
        type: Number,
        name: "Opacity",
        hint: "Configure the opacity of the background colour. Default 40.",
        default: 40,
        range: {
            min: 0,
            max: 100,
            step: 5
        },
        onChange: () => {
            setColors();
            updateColors();
        }
    });
    setColors();
})


function setColors() {//Send the colour settings to the CSS
    const r = document.querySelector(':root');
    r.style.setProperty('--friendly', game.settings.get(MODULE, "friendlyColour") + game.settings.get(MODULE, "opacity").toString(16) /*Convert the base 10 opacity number to hexadecimal*/);
    r.style.setProperty('--neutral', game.settings.get(MODULE, "neutralColour") + game.settings.get(MODULE, "opacity").toString(16));
    r.style.setProperty('--hostile', game.settings.get(MODULE, "hostileColour") + game.settings.get(MODULE, "opacity").toString(16));
}

function updateColors() {//Set the colours when the combat tracker is rendered
    if (game.combat) {
        for (const combatant of game.combat.combatants) {
            const combatantRow = $('#combat-tracker, #combat-popout').find(`[data-combatant-id=${combatant.id}]`);
            combatantRow.toggleClass("hostile",  combatant.token.data.disposition === -1);
            combatantRow.toggleClass("neutral",  combatant.token.data.disposition === 0);
            combatantRow.toggleClass("friendly", combatant.token.data.disposition === 1);
        };
    };
};

function updateColorsToken(token, update) {//Reset the colours if any token's disposition changes
    if (game.combat) {
        const combatantRow = $('#combat-tracker, #combat-popout').find(`[data-combatant-id=${token.combatant.id}]`);
        combatantRow.toggleClass("hostile",  update.disposition === -1);
        combatantRow.toggleClass("neutral",  update.disposition === 0);
        combatantRow.toggleClass("friendly", update.disposition === 1);
    };
};

Hooks.on('renderCombatTracker', () => {
    updateColors();
});

Hooks.on('updateToken', (token, update) => {
    if (token.inCombat && !isNaN(update.disposition)) {
        updateColorsToken(token, update);
    };
});

class customColourMenu extends FormApplication {
    constructor(...args) {
        super(...args);
    }

    getData() {
        return super.getData;
    };

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            template: `modules/combat-tracker-disposition/templates/custom-colours.html`,
            id: 'custom-colours',
            title: 'Custom Colours',
            width: 300
        });
    };

    activateListeners(html) {
        super.activateListeners(html);
        document.getElementById("hostile-colour").value = game.settings.get(MODULE, "hostileColour");
        document.getElementById("neutral-colour").value = game.settings.get(MODULE, "neutralColour");
        document.getElementById("friendly-colour").value = game.settings.get(MODULE, "friendlyColour");
    };

    async _updateObject(event, formData) {
        game.settings.set(MODULE, "hostileColour", formData["hostile-colour"]);
        game.settings.set(MODULE, "neutralColour", formData["neutral-colour"]);
        game.settings.set(MODULE, "friendlyColour", formData["friendly-colour"]);
    };
};
