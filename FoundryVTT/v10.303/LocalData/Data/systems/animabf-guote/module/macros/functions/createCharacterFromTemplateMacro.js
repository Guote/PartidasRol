import { renderTemplates } from "../../utils/renderTemplates.js";
import { Templates } from "../../utils/constants.js";
import { ABFDialogs } from "../../dialogs/ABFDialogs.js";

/**
 * Load armors from compendium for the dialog selector
 */
const loadArmorsFromCompendium = async () => {
  const pack = game.packs.get("animabf-guote.armors");
  if (!pack) {
    console.warn("Armors compendium not found");
    return [];
  }
  const armors = await pack.getDocuments();
  return armors
    .map((armor) => ({ id: armor.id, name: armor.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get "Desarmado" weapon from compendium
 */
const getDesarmadoWeapon = async () => {
  const pack = game.packs.get("animabf-guote.weapons");
  if (!pack) {
    console.warn("Weapons compendium not found");
    return null;
  }
  const weapons = await pack.getDocuments();
  return weapons.find(
    (w) =>
      w.name.toLowerCase() === "desarmado" ||
      w.name.toLowerCase() === "unarmed",
  );
};

/**
 * Get armor from compendium by ID
 */
const getArmorFromCompendium = async (armorId) => {
  if (!armorId) return null;
  const pack = game.packs.get("animabf-guote.armors");
  if (!pack) return null;
  return pack.getDocument(armorId);
};

const openDialog = async (armors) => {
  const [dialogHTML, iconHTML] = await renderTemplates(
    {
      name: Templates.Dialog.CreateCharacterTemplate,
      context: { armors },
    },
    {
      name: Templates.Dialog.Icons.Accept,
    },
  );

  return new Promise((resolve) => {
    const typedGame = game;
    new Dialog({
      title: typedGame.i18n.localize(
        "anima.macros.createCharacter.dialog.title",
      ),
      content: dialogHTML,
      buttons: {
        submit: {
          icon: iconHTML,
          label: typedGame.i18n.localize("anima.dialogs.continue"),
          callback: (html) => {
            const results = new FormDataExtended(html.find("form")[0], {})
              .object;
            resolve(results);
          },
        },
      },
      default: "submit",
    }).render(true);
  });
};

/**
 * Calculate character stats based on level.
 * Edit the formulas below to match your campaign rules.
 */
const calculateStats = (level = 1, lpMultiplier = 1, subsystems = {}) => {
  const availablePD = 500 + level * 100;
  // Base Stats
  const basePrimary = Math.max(5, 4 + level);
  const baseLifePoints = 20 + basePrimary * 10 + 10;
  const finalLifePoints =
    baseLifePoints + availablePD * 0.25 * (lpMultiplier - 1);

  const baseSecondary = level * 10;
  const baseResistance = 30 + level * 5;

  // Combat
  const baseInitiative = 65 + level;
  const baseAttack =
    Math.floor((availablePD * 0.25) / 2) + Math.min(level * 5, 50) + 10;
  const baseDefense =
    lpMultiplier > 1
      ? 0
      : Math.floor((availablePD * 0.25) / 2) + Math.min(level * 5, 50) + 10;
  // Mystic stats - placeholder formulas, edit as needed
  const zeonMax = subsystems.mystic ? 100 + level * 50 : 0;
  const magicProjection = subsystems.mystic ? (availablePD * 0.3) / 2 + 10 : 0;
  const summoning = subsystems.mystic ? 30 + level * 5 : 0;

  // Domine stats - placeholder formulas, edit as needed
  const kiAccumulation = subsystems.domine ? 1 + Math.floor(level / 2) : 0;
  const kiPoints = subsystems.domine ? 10 + level * 5 : 0;

  // Psychic stats - placeholder formulas, edit as needed
  const psychicPoints = subsystems.psychic ? level : 0;
  const psychicPotential = subsystems.psychic
    ? Math.max(80, 60 + level * 10)
    : 0;
  const psychicProjection = subsystems.psychic
    ? (availablePD * 0.3) / 2 + 10
    : 0;

  // Other
  const extraDamage = level > 3 ? 10 : 0;

  return {
    primaries: {
      agility: basePrimary,
      constitution: basePrimary,
      dexterity: basePrimary,
      strength: basePrimary,
      intelligence: basePrimary,
      perception: basePrimary,
      power: basePrimary,
      willPower: basePrimary,
    },
    lifePoints: {
      value: finalLifePoints,
      max: finalLifePoints,
      lpMultiplier: lpMultiplier,
    },
    initiative: baseInitiative,
    resistances: {
      physical: baseResistance,
      disease: baseResistance,
      poison: baseResistance,
      magic: baseResistance,
      psychic: baseResistance,
    },
    attack: baseAttack,
    defense: baseDefense,
    secondary: baseSecondary,
    extraDamage: extraDamage,
    defenseType: lpMultiplier > 1 ? "damageresistance" : "",
    // Mystic
    zeon: { value: zeonMax, max: zeonMax },
    magicProjection: magicProjection,
    summoning: summoning,
    // Domine
    kiAccumulation: kiAccumulation,
    kiPoints: { value: kiPoints, max: kiPoints },
    // Psychic
    psychicPoints: { value: psychicPoints, max: psychicPoints },
    psychicPotential: psychicPotential,
    psychicProjection: psychicProjection,
  };
};

/**
 * Build the actor data update object
 */
const buildActorData = (stats, subsystems) => {
  const data = {
    system: {
      characteristics: {
        primaries: {
          agility: { value: stats.primaries.agility },
          constitution: { value: stats.primaries.constitution },
          dexterity: { value: stats.primaries.dexterity },
          strength: { value: stats.primaries.strength },
          intelligence: { value: stats.primaries.intelligence },
          perception: { value: stats.primaries.perception },
          power: { value: stats.primaries.power },
          willPower: { value: stats.primaries.willPower },
        },
        secondaries: {
          lifePoints: {
            value: stats.lifePoints.value,
            max: stats.lifePoints.max,
            lpMultiplier: stats.lifePoints.lpMultiplier,
          },
          initiative: {
            base: { value: stats.initiative },
          },
          resistances: {
            physical: { base: { value: stats.resistances.physical } },
            disease: { base: { value: stats.resistances.disease } },
            poison: { base: { value: stats.resistances.poison } },
            magic: { base: { value: stats.resistances.magic } },
            psychic: { base: { value: stats.resistances.psychic } },
          },
        },
      },
      combat: {
        attack: { base: { value: stats.attack } },
        block: { base: { value: stats.defense } },
        dodge: { base: { value: stats.defense } },
      },
      general: {
        modifiers: {
          extraDamage: { value: stats.extraDamage },
        },
        settings: {
          defenseType: { value: stats.defenseType },
        },
      },
      secondaries: {
        guotecundariasuno: {
          acrobacias: { base: { value: stats.secondary } },
          actuacion: { base: { value: stats.secondary } },
          animas: { base: { value: stats.secondary } },
          arcana: { base: { value: stats.secondary } },
          atletismo: { base: { value: stats.secondary } },
          engaño: { base: { value: stats.secondary } },
          historia: { base: { value: stats.secondary } },
          ingenieria: { base: { value: stats.secondary } },
        },
        guotecundariasdos: {
          investigacion: { base: { value: stats.secondary } },
          medicina: { base: { value: stats.secondary } },
          naturaleza: { base: { value: stats.secondary } },
          percepcion: { base: { value: stats.secondary } },
          perspicacia: { base: { value: stats.secondary } },
          persuasion: { base: { value: stats.secondary } },
          sigilo: { base: { value: stats.secondary } },
        },
      },
      mystic: {
        zeon: {
          value: stats.zeon.value,
          max: stats.zeon.max,
        },
        magicProjection: {
          base: { value: stats.magicProjection },
        },
        summoning: {
          summon: { base: { value: stats.summoning } },
          banish: { base: { value: stats.summoning } },
          bind: { base: { value: stats.summoning } },
          control: { base: { value: stats.summoning } },
        },
      },
      domine: {
        kiAccumulation: {
          strength: { base: { value: stats.kiAccumulation } },
          agility: { base: { value: stats.kiAccumulation } },
          dexterity: { base: { value: stats.kiAccumulation } },
          constitution: { base: { value: stats.kiAccumulation } },
          willPower: { base: { value: stats.kiAccumulation } },
          power: { base: { value: stats.kiAccumulation } },
          generic: {
            value: stats.kiPoints.value,
            max: stats.kiPoints.max,
          },
        },
      },
      psychic: {
        psychicPoints: {
          value: stats.psychicPoints.value,
          max: stats.psychicPoints.max,
        },
        psychicPotential: {
          base: { value: stats.psychicPotential },
        },
        psychicProjection: {
          base: { value: stats.psychicProjection },
          imbalance: {
            offensive: { base: { value: psychicProjection } },
            defensive: { base: { value: psychicProjection } },
          },
        },
      },
      ui: {
        tabVisibility: {
          mystic: { value: subsystems.mystic },
          summoning: { value: subsystems.mystic },
          grimoire: { value: subsystems.mystic },
          psychic: { value: subsystems.psychic },
          domine: { value: subsystems.domine },
        },
      },
    },
  };

  return data;
};

export const createCharacterFromTemplateMacro = async () => {
  const typedGame = game;

  // Check if user is GM
  if (!typedGame.user?.isGM) {
    ABFDialogs.prompt(
      typedGame.i18n.localize("anima.macros.createCharacter.errors.gmOnly"),
    );
    return;
  }

  // Load armors from compendium for selector
  const armors = await loadArmorsFromCompendium();

  const results = await openDialog(armors);

  const characterName = results["character-name"] || "Nuevo Personaje";
  const level = parseInt(results["character-level"]) || 1;
  const lpMultiplier = parseInt(results["lp-multiplier"]) || 1;
  const selectedArmorId = results["selected-armor"] || "";

  const subsystems = {
    mystic: results["subsystem-mystic"] === true,
    psychic: results["subsystem-psychic"] === true,
    domine: results["subsystem-domine"] === true,
  };

  // Calculate stats based on level
  const stats = calculateStats(level, lpMultiplier, subsystems);

  // Build actor data
  const actorUpdateData = buildActorData(stats, subsystems);

  try {
    // Create the actor
    const actor = await Actor.create({
      name: characterName,
      type: "character",
      img: "icons/svg/mystery-man.svg",
    });

    if (actor) {
      // Apply calculated values
      await actor.update(actorUpdateData);

      // Apply projection values with dot notation (more reliable for nested updates)
      await actor.update({
        "system.mystic.magicProjection.base.value": stats.magicProjection,
        "system.psychic.psychicProjection.base.value": stats.psychicProjection,
      });

      // Add "Desarmado" weapon from compendium (equipped)
      const desarmadoWeapon = await getDesarmadoWeapon();
      if (desarmadoWeapon) {
        const weaponData = desarmadoWeapon.toObject();
        weaponData.system.equipped = { value: true };
        await actor.createEmbeddedDocuments("Item", [weaponData]);
      }

      // Add selected armor from compendium (equipped)
      if (selectedArmorId) {
        const selectedArmor = await getArmorFromCompendium(selectedArmorId);
        if (selectedArmor) {
          const armorData = selectedArmor.toObject();
          armorData.system.equipped = { value: true };
          await actor.createEmbeddedDocuments("Item", [armorData]);
        }
      }

      // Notify success
      ui.notifications.info(
        typedGame.i18n.format("anima.macros.createCharacter.success", {
          name: characterName,
          level: level,
        }),
      );

      // Open the actor sheet
      actor.sheet?.render(true);
    }
  } catch (error) {
    console.error("Error creating character from template:", error);
    ABFDialogs.prompt(
      typedGame.i18n.localize(
        "anima.macros.createCharacter.errors.creationFailed",
      ),
    );
  }
};
