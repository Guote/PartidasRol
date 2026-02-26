/**
 * Actor Mapper - Maps parsed PDF data to Foundry actor data structure
 */

/**
 * Map secondary ability names from Spanish/English to system keys
 */
const secondarySkillMap = {
  // Athletics - Spanish
  "Atletismo": "athleticism",
  "Montar": "ride",
  "Nadar": "swim",
  "Trepar": "climb",
  "Saltar": "jump",
  "Acrobacias": "acrobatics",
  "Pilotar": "piloting",
  // Athletics - English
  "Athleticism": "athleticism",
  "Ride": "ride",
  "Swim": "swim",
  "Climb": "climb",
  "Jump": "jump",
  "Acrobatics": "acrobatics",
  "Piloting": "piloting",
  // Vigor - Spanish
  "Frialdad": "composure",
  "Proezas de Fuerza": "featsOfStrength",
  "Resistir el dolor": "withstandPain",
  // Vigor - English
  "Composure": "composure",
  "Feats of Strength": "featsOfStrength",
  "Withstand Pain": "withstandPain",
  // Perception - Spanish
  "Advertir": "notice",
  "Buscar": "search",
  "Rastrear": "track",
  // Perception - English
  "Notice": "notice",
  "Search": "search",
  "Track": "track",
  // Intellectual - Spanish
  "Animales": "animals",
  "Ciencia": "science",
  "Leyes": "law",
  "Herbolaria": "herbalLore",
  "Historia": "history",
  "Táctica": "tactics",
  "Medicina": "medicine",
  "Memorizar": "memorize",
  "Navegación": "navigation",
  "Ocultismo": "occult",
  "Tasación": "appraisal",
  "Valoración mágica": "magicAppraisal",
  "V. Mágica": "magicAppraisal",
  // Intellectual - English
  "Animals": "animals",
  "Science": "science",
  "Law": "law",
  "Herbal Lore": "herbalLore",
  "History": "history",
  "Tactics": "tactics",
  "Medicine": "medicine",
  "Memorize": "memorize",
  "Navigation": "navigation",
  "Occult": "occult",
  "Appraisal": "appraisal",
  "Magic Appraisal": "magicAppraisal",
  // Social - Spanish
  "Estilo": "style",
  "Intimidar": "intimidate",
  "Liderazgo": "leadership",
  "Persuasión": "persuasion",
  "Comercio": "trading",
  "Callejeo": "streetwise",
  "Etiqueta": "etiquette",
  // Social - English
  "Style": "style",
  "Intimidate": "intimidate",
  "Leadership": "leadership",
  "Leader": "leadership",
  "Persuasion": "persuasion",
  "Trading": "trading",
  "Streetwise": "streetwise",
  "Etiquette": "etiquette",
  // Subterfuge - Spanish
  "Cerrajería": "lockPicking",
  "Disfraz": "disguise",
  "Ocultarse": "hide",
  "Robo": "theft",
  "Sigilo": "stealth",
  "Trampería": "trapLore",
  "Venenos": "poisons",
  // Subterfuge - English
  "Lock Picking": "lockPicking",
  "Disguise": "disguise",
  "Hide": "hide",
  "Theft": "theft",
  "Stealth": "stealth",
  "Trap Lore": "trapLore",
  "Poisons": "poisons",
  // Creative - Spanish
  "Arte": "art",
  "Baile": "dance",
  "Forja": "forging",
  "Runas": "runes",
  "Alquimia": "alchemy",
  "Animismo": "animism",
  "Música": "music",
  "Trucos de manos": "sleightOfHand",
  "T. Manos": "sleightOfHand",
  "Caligrafía ritual": "ritualCalligraphy",
  "Joyería": "jewelry",
  "Sastrería": "tailoring",
  "Creación de marionetas": "puppetMaking",
  // Creative - English
  "Art": "art",
  "Dance": "dance",
  "Forging": "forging",
  "Runes": "runes",
  "Alchemy": "alchemy",
  "Animism": "animism",
  "Music": "music",
  "Sleight of Hand": "sleightOfHand",
  "Ritual Calligraphy": "ritualCalligraphy",
  "Jewelry": "jewelry",
  "Tailoring": "tailoring",
  "Puppet Making": "puppetMaking",
};

/**
 * Find the category for a secondary skill
 */
const getSecondaryCategory = (skillKey) => {
  const categories = {
    athletics: ["acrobatics", "athleticism", "ride", "swim", "climb", "jump", "piloting"],
    vigor: ["composure", "featsOfStrength", "withstandPain"],
    perception: ["notice", "search", "track"],
    intellectual: ["animals", "science", "law", "herbalLore", "history", "tactics", "medicine", "memorize", "navigation", "occult", "appraisal", "magicAppraisal"],
    social: ["style", "intimidate", "leadership", "persuasion", "trading", "streetwise", "etiquette"],
    subterfuge: ["lockPicking", "disguise", "hide", "theft", "stealth", "trapLore", "poisons"],
    creative: ["art", "dance", "forging", "runes", "alchemy", "animism", "music", "sleightOfHand", "ritualCalligraphy", "jewelry", "tailoring", "puppetMaking"],
  };

  for (const [category, skills] of Object.entries(categories)) {
    if (skills.includes(skillKey)) {
      return category;
    }
  }
  return null;
};

/**
 * Build actor system data from parsed PDF data
 */
export const buildActorData = (parsed) => {
  const { general, primaries, resistances, combat, mystic, summoning, domine, psychic, secondaries, isDamageResistance } = parsed;

  // Determine which subsystem tabs should be visible
  const hasSummoning = summoning && (summoning.summon > 0 || summoning.control > 0 || summoning.bind > 0 || summoning.banish > 0);
  const hasMystic = mystic.zeon > 0 || mystic.act > 0 || mystic.magicProjection > 0 || hasSummoning;
  const hasDomine = domine.martialKnowledge > 0 || domine.genericKi > 0;
  const hasPsychic = psychic.psychicPoints > 0 || psychic.psychicProjection > 0;

  // Determine defense type
  const defenseType = isDamageResistance ? "damageresistance" : "";

  const actorData = {
    system: {
      characteristics: {
        primaries: {
          agility: { value: primaries.agility },
          constitution: { value: primaries.constitution },
          dexterity: { value: primaries.dexterity },
          strength: { value: primaries.strength },
          intelligence: { value: primaries.intelligence },
          perception: { value: primaries.perception },
          power: { value: primaries.power },
          willPower: { value: primaries.willPower },
        },
        secondaries: {
          lifePoints: {
            value: general.lifePoints,
            max: general.lifePoints,
            lpMultiplier: 1,
          },
          defenseType: { value: defenseType },
          initiative: {
            base: { value: combat.naturalInitiative },
          },
          fatigue: {
            value: general.fatigue,
            max: general.fatigue,
          },
          regenerationType: {
            mod: { value: general.regeneration },
          },
          movementType: {
            mod: { value: general.movementType },
          },
          resistances: {
            physical: { base: { value: resistances.physical } },
            disease: { base: { value: resistances.disease } },
            poison: { base: { value: resistances.poison } },
            magic: { base: { value: resistances.magic } },
            psychic: { base: { value: resistances.psychic } },
          },
        },
      },
      general: {
        aspect: {
          race: { value: general.race },
          size: { value: general.size },
        },
      },
      combat: {
        attack: { base: { value: combat.naturalAttack } },
        block: { base: { value: combat.naturalBlock } },
        dodge: { base: { value: 0 } },
        wearArmor: { value: combat.wearArmor },
      },
      mystic: {
        act: {
          main: { base: { value: mystic.act } },
        },
        zeon: {
          value: mystic.zeon,
          max: mystic.zeon,
        },
        magicProjection: {
          base: { value: mystic.magicProjectionOffensive || mystic.magicProjection || 0 },
          imbalance: {
            offensive: { base: { value: mystic.magicProjectionOffensive || mystic.magicProjection || 0 } },
            defensive: { base: { value: mystic.magicProjectionDefensive || mystic.magicProjection || 0 } },
          },
        },
        magicLevel: {
          spheres: {
            light: { value: mystic.magicLevels.light || 0 },
            darkness: { value: mystic.magicLevels.darkness || 0 },
            fire: { value: mystic.magicLevels.fire || 0 },
            water: { value: mystic.magicLevels.water || 0 },
            earth: { value: mystic.magicLevels.earth || 0 },
            air: { value: mystic.magicLevels.air || 0 },
            creation: { value: mystic.magicLevels.creation || 0 },
            destruction: { value: mystic.magicLevels.destruction || 0 },
            essence: { value: mystic.magicLevels.essence || 0 },
            illusion: { value: mystic.magicLevels.illusion || 0 },
            necromancy: { value: mystic.magicLevels.necromancy || 0 },
          },
        },
        summoning: {
          summon: { base: { value: summoning?.summon || 0 } },
          control: { base: { value: summoning?.control || 0 } },
          bind: { base: { value: summoning?.bind || 0 } },
          banish: { base: { value: summoning?.banish || 0 } },
        },
      },
      domine: {
        martialKnowledge: {
          max: { value: domine.martialKnowledge },
        },
        kiAccumulation: {
          strength: { base: { value: domine.kiAccumulation.strength } },
          agility: { base: { value: domine.kiAccumulation.agility } },
          dexterity: { base: { value: domine.kiAccumulation.dexterity } },
          constitution: { base: { value: domine.kiAccumulation.constitution } },
          willPower: { base: { value: domine.kiAccumulation.willPower } },
          power: { base: { value: domine.kiAccumulation.power } },
          generic: {
            value: domine.genericKi,
            max: domine.genericKi,
          },
        },
      },
      psychic: {
        psychicPoints: {
          value: psychic.psychicPoints,
          max: psychic.psychicPoints,
        },
        psychicPotential: {
          base: { value: psychic.psychicPotential },
        },
        psychicProjection: {
          base: { value: psychic.psychicProjectionOffensive || psychic.psychicProjection || 0 },
          imbalance: {
            offensive: { base: { value: psychic.psychicProjectionOffensive || psychic.psychicProjection || 0 } },
            defensive: { base: { value: psychic.psychicProjectionDefensive || psychic.psychicProjection || 0 } },
          },
        },
      },
      ui: {
        tabVisibility: {
          mystic: { value: hasMystic },
          summoning: { value: hasMystic },
          grimoire: { value: hasMystic },
          psychic: { value: hasPsychic },
          domine: { value: hasDomine },
        },
      },
    },
  };

  // Add secondary abilities
  for (const [spanishName, value] of Object.entries(secondaries)) {
    const skillKey = secondarySkillMap[spanishName];
    if (skillKey) {
      const category = getSecondaryCategory(skillKey);
      if (category) {
        actorData.system.secondaries = actorData.system.secondaries || {};
        actorData.system.secondaries[category] = actorData.system.secondaries[category] || {};
        actorData.system.secondaries[category][skillKey] = { base: { value: value } };
      }
    }
  }

  return actorData;
};

/**
 * Build weapon item data array from parsed combat data
 * Returns an array of weapon items
 */
export const buildWeaponsData = (parsed) => {
  const { combat } = parsed;

  // Return empty array if no weapons
  if (!combat.weapons || combat.weapons.length === 0) {
    return [];
  }

  return combat.weapons.map((weapon) => ({
    name: weapon.name || "Imported Weapon",
    type: "weapon",
    system: {
      attack: {
        base: { value: weapon.attackBonus || 0 },
        special: { value: 0 },
      },
      block: {
        base: { value: weapon.blockBonus || 0 },
        special: { value: 0 },
      },
      damage: {
        base: { value: weapon.damage || 0 },
        special: { value: 0 },
      },
      initiative: {
        base: { value: weapon.turnBonus || 0 },
        special: { value: 0 },
      },
      equipped: { value: true },
      knowledgeType: { value: "known" },
      manageabilityType: { value: "one_hand" },
    },
  }));
};

/**
 * Build armor item data array from parsed armor data
 * Returns an array of armor items
 */
export const buildArmorsData = (parsed) => {
  const { armors } = parsed;

  // Return empty array if no armors
  if (!armors || armors.length === 0) {
    return [];
  }

  return armors.map((armor) => ({
    name: armor.name || "Imported Armor",
    type: "armor",
    system: {
      cut: { value: armor.cut || 0 },
      impact: { value: armor.impact || 0 },
      thrust: { value: armor.thrust || 0 },
      heat: { value: armor.heat || 0 },
      electricity: { value: armor.electricity || 0 },
      cold: { value: armor.cold || 0 },
      energy: { value: armor.energy || 0 },
      equipped: { value: true },
    },
  }));
};

/**
 * Build note items for special abilities
 * Returns an array of note items (essential abilities and powers separately)
 */
export const buildSpecialAbilitiesNotes = (parsed) => {
  const notes = [];
  const { essentialAbilities, powers } = parsed;

  // Essential abilities note
  if (essentialAbilities && essentialAbilities.trim().length > 0) {
    notes.push({
      name: "Habilidades Esenciales",
      type: "note",
      system: {
        description: { value: essentialAbilities },
      },
    });
  }

  // Powers note
  if (powers && powers.trim().length > 0) {
    notes.push({
      name: "Poderes",
      type: "note",
      system: {
        description: { value: powers },
      },
    });
  }

  return notes;
};

/**
 * Build note item for special abilities (backward compatibility)
 * Returns a note item or null if no special abilities
 */
export const buildSpecialAbilitiesNote = (parsed) => {
  const { specialAbilities } = parsed;

  // Return null if no special abilities
  if (!specialAbilities || specialAbilities.trim().length === 0) {
    return null;
  }

  return {
    name: "Habilidades Especiales",
    type: "note",
    system: {
      description: { value: specialAbilities },
    },
  };
};
