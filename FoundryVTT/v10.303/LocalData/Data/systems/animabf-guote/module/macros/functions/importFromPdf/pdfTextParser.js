/**
 * PDF Text Parser for Anima Beyond Fantasy character sheets
 * Parses text extracted from PDF into structured data
 */

/**
 * Parse a number, handling Spanish thousands separator (.)
 */
const parseNumber = (str) => {
  if (!str) return 0;
  // Remove thousands separators and parse
  return parseInt(str.replace(/\./g, "").replace(/,/g, ".")) || 0;
};

/**
 * Extract character name from text (usually the title)
 */
const parseName = (text) => {
  // Name is typically the first non-empty line in caps or title case
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l);
  // Look for a line that looks like a name (not starting with common field labels)
  for (const line of lines.slice(0, 5)) {
    if (!line.match(/^(Nivel|Puntos|Categoría|Fue:|RF\s)/i)) {
      return line;
    }
  }
  return "Imported Character";
};

/**
 * Parse primary characteristics (Spanish and English)
 */
const parsePrimaries = (text) => {
  const primaries = {
    strength: 5,      // Fue / Str
    dexterity: 5,     // Des / Dex
    agility: 5,       // Agi
    constitution: 5,  // Con
    power: 5,         // Pod / Pow
    intelligence: 5,  // Int
    willPower: 5,     // Vol / Wp
    perception: 5,    // Per
  };

  // Pattern: Fue: 8 or Str: 8
  const patterns = [
    { key: "strength", regex: /(?:Fue|Str):?\s*(\d+)/i },
    { key: "dexterity", regex: /(?:Des|Dex):?\s*(\d+)/i },
    { key: "agility", regex: /Agi:?\s*(\d+)/i },
    { key: "constitution", regex: /Con:?\s*(\d+)/i },
    { key: "power", regex: /(?:Pod|Pow):?\s*(\d+)/i },
    { key: "intelligence", regex: /Int:?\s*(\d+)/i },
    { key: "willPower", regex: /(?:Vol|Wp):?\s*(\d+)/i },
    { key: "perception", regex: /Per:?\s*(\d+)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match) {
      primaries[key] = parseInt(match[1]) || 5;
    }
  }

  return primaries;
};

/**
 * Parse resistances (Spanish and English)
 */
const parseResistances = (text) => {
  const resistances = {
    physical: 0,  // RF / PhR
    magic: 0,     // RM / MR
    psychic: 0,   // RP / PsR
    poison: 0,    // RV / VR (Veneno/Venom)
    disease: 0,   // RE / DR (Enfermedad/Disease)
  };

  // Pattern: RF 105 or PhR 105
  const patterns = [
    { key: "physical", regex: /(?:RF|PhR)\s*(\d+)/i },
    { key: "magic", regex: /(?:RM|MR)\s*(\d+)/i },
    { key: "psychic", regex: /(?:RP|PsR)\s*(\d+)/i },
    { key: "poison", regex: /(?:RV|VR)\s*(\d+)/i },
    { key: "disease", regex: /(?:RE|DR)\s*(\d+)/i },
  ];

  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match) {
      resistances[key] = parseInt(match[1]) || 0;
    }
  }

  return resistances;
};

/**
 * Parse a single weapon entry from turn/attack/defense/damage lines
 * Returns { name, turn, attack, attackBonus, block, blockBonus, damage }
 */
const parseWeaponEntry = (turnText, attackText, defenseText, damageText, naturalInit) => {
  const weapon = {
    name: "",
    turn: 0,
    turnBonus: 0,
    attack: 0,
    attackWithQuality: 0,
    block: 0,
    blockWithQuality: 0,
    damage: 0,
  };

  // Parse turn: "165 Katana +15" or "170 Arma de Alma"
  if (turnText) {
    const turnMatch = turnText.match(/(\d+)\s+(.+)/);
    if (turnMatch) {
      weapon.turn = parseInt(turnMatch[1]) || 0;
      weapon.name = turnMatch[2].trim();
      weapon.turnBonus = weapon.turn - naturalInit;
    }
  }

  // Parse attack: "325 (360) Katana +15" or "330 Katana"
  if (attackText) {
    const attackMatch = attackText.match(/(\d+)(?:\s*\((\d+)\))?\s+(.+)/);
    if (attackMatch) {
      weapon.attack = parseInt(attackMatch[1]) || 0;
      weapon.attackWithQuality = parseInt(attackMatch[2]) || weapon.attack;
      if (!weapon.name) weapon.name = attackMatch[3].trim();
    }
  }

  // Parse defense: "320 (355) Katana +15" or "325 Katana"
  if (defenseText) {
    const defenseMatch = defenseText.match(/(\d+)(?:\s*\((\d+)\))?\s+(.+)/);
    if (defenseMatch) {
      weapon.block = parseInt(defenseMatch[1]) || 0;
      weapon.blockWithQuality = parseInt(defenseMatch[2]) || weapon.block;
      if (!weapon.name) weapon.name = defenseMatch[3].trim();
    }
  }

  // Parse damage: "140 Katana +15"
  if (damageText) {
    const damageMatch = damageText.match(/(\d+)\s+(.+)/);
    if (damageMatch) {
      weapon.damage = parseInt(damageMatch[1]) || 0;
      if (!weapon.name) weapon.name = damageMatch[2].trim();
    }
  }

  return weapon;
};

/**
 * Parse combat stats (turn, attack, defense, damage)
 * Returns base values and array of weapons
 * Supports both Spanish and English formats
 */
const parseCombat = (text) => {
  const combat = {
    naturalInitiative: 0,
    naturalAttack: 0,
    naturalBlock: 0,
    wearArmor: 0,
    isDamageResistance: false,
    weapons: [],
  };

  // Check for damage resistance creature: "Habilidad de defensa: Acumulación" or "Defense Ability: Damage Resistance"
  const damageResMatch = text.match(/(?:Habilidad de defensa:?\s*Acumulaci[oó]n|Defense Ability:?\s*Damage\s*Resistance)/i);
  if (damageResMatch) {
    combat.isDamageResistance = true;
  }

  // Parse Turn/Initiative line: "Turno: 95 Natural" or "Initiative: 155 Natural"
  // Note: "Turno Natural" in PDF = base turno + 20, so we subtract 20
  const turnLineMatch = text.match(/(?:Turno|Initiative):?\s*([^\n]+)/i);
  let turnEntries = [];
  let pdfNaturalTurn = 0;
  if (turnLineMatch) {
    const turnLine = turnLineMatch[1];
    // Extract natural value from PDF (this is base + 20)
    const naturalMatch = turnLine.match(/(\d+)\s*Natural/i);
    if (naturalMatch) {
      pdfNaturalTurn = parseInt(naturalMatch[1]) || 0;
      // Actual base initiative is PDF value - 20
      combat.naturalInitiative = pdfNaturalTurn - 20;
    }
    // Split by comma or slash and get weapon entries (skip "Natural")
    turnEntries = turnLine.split(/[,\/]/).map(e => e.trim()).filter(e => !e.match(/Natural/i) && e.length > 0);
  }

  // Parse Attack line: "Habilidad de ataque: 325 Katana" or "Attack Ability: 330 Natural Weapon"
  const attackLineMatch = text.match(/(?:Habilidad de ataque|Attack Ability):?\s*([^\n]+)/i);
  let attackEntries = [];
  if (attackLineMatch) {
    attackEntries = attackLineMatch[1].split(/[,\/]/).map(e => e.trim()).filter(e => e.length > 0);
    // Check for natural weapon entry
    for (let i = 0; i < attackEntries.length; i++) {
      const entry = attackEntries[i];
      const naturalWeaponMatch = entry.match(/(\d+)\s*Natural\s*(?:Weapon)?/i);
      if (naturalWeaponMatch) {
        combat.naturalAttack = parseInt(naturalWeaponMatch[1]) || 0;
        attackEntries.splice(i, 1);
        i--;
      }
    }
    // If first entry has no weapon name, it might be the natural value
    if (attackEntries.length > 0 && !attackEntries[0].match(/[a-zA-Z]/)) {
      combat.naturalAttack = parseInt(attackEntries[0]) || 0;
      attackEntries.shift();
    }
  }

  // Parse Defense line: "Habilidad de defensa: 320 Katana" or "Defense Ability: 330 Dodge"
  // Skip if it's "Acumulación" or "Damage Resistance"
  const defenseLineMatch = text.match(/(?:Habilidad de defensa|Defense Ability):?\s*([^\n]+)/i);
  let defenseEntries = [];
  if (defenseLineMatch && !combat.isDamageResistance) {
    const defenseLine = defenseLineMatch[1];
    // Skip if it contains damage resistance indicators
    if (!defenseLine.match(/Acumulaci[oó]n|Damage\s*Resistance/i)) {
      defenseEntries = defenseLine.split(/[,\/]/).map(e => e.trim()).filter(e => e.length > 0);
      // Check for Dodge/Parry or natural defense
      for (let i = 0; i < defenseEntries.length; i++) {
        const entry = defenseEntries[i];
        const dodgeMatch = entry.match(/(\d+)\s*(?:Dodge|Parry|Esquiva|Parada)/i);
        if (dodgeMatch) {
          combat.naturalBlock = parseInt(dodgeMatch[1]) || 0;
          defenseEntries.splice(i, 1);
          i--;
        }
      }
      // If first entry has no weapon name, it might be the natural value
      if (defenseEntries.length > 0 && !defenseEntries[0].match(/[a-zA-Z]/)) {
        combat.naturalBlock = parseInt(defenseEntries[0]) || 0;
        defenseEntries.shift();
      }
    }
  }

  // Parse Damage line: "Daño: 140 Katana" or "Damage: 100 Natural Weapon"
  const damageLineMatch = text.match(/(?:Da[ñn]o|Damage):?\s*([^\n]+)/i);
  let damageEntries = [];
  if (damageLineMatch) {
    damageEntries = damageLineMatch[1].split(/[,\/]/).map(e => e.trim()).filter(e => e.length > 0);
  }

  // Build weapons array - use the longest list as reference
  const maxWeapons = Math.max(turnEntries.length, attackEntries.length, defenseEntries.length, damageEntries.length);

  for (let i = 0; i < maxWeapons; i++) {
    const weapon = parseWeaponEntry(
      turnEntries[i] || "",
      attackEntries[i] || "",
      defenseEntries[i] || "",
      damageEntries[i] || "",
      combat.naturalInitiative
    );

    if (weapon.name) {
      // Calculate attack/block bonus (subtract natural if we have it)
      if (combat.naturalAttack > 0) {
        weapon.attackBonus = weapon.attack - combat.naturalAttack;
      } else {
        weapon.attackBonus = 0;
        // Use first weapon's attack as natural if not specified
        if (i === 0 && weapon.attack > 0) {
          combat.naturalAttack = weapon.attack;
        }
      }

      if (combat.naturalBlock > 0) {
        weapon.blockBonus = weapon.block - combat.naturalBlock;
      } else {
        weapon.blockBonus = 0;
        if (i === 0 && weapon.block > 0) {
          combat.naturalBlock = weapon.block;
        }
      }

      // Weapon turn bonus: weapon turn value - base initiative (not PDF natural)
      // Example: PDF says "95 Natural, 55 Espada" -> base is 75, weapon turn is 55
      // So weapon bonus = 55 - 75 = -20
      weapon.turnBonus = weapon.turn - combat.naturalInitiative;

      combat.weapons.push(weapon);
    }
  }

  // Wear Armor: "Llevar Armadura: 10" or "Wear Armor: 10"
  const wearArmorMatch = text.match(/(?:Llevar Armadura|Wear Armor):?\s*(\d+)/i);
  if (wearArmorMatch) {
    combat.wearArmor = parseInt(wearArmorMatch[1]) || 0;
  }

  return combat;
};

/**
 * Parse a single armor entry
 * Format: "Gabardina Armada +15 FIL 4 CON 3 PEN 5 CAL 4 ELE 5 FRI 5 ENE 3"
 * Or: "Natural 5" (all physical = 5, energy = 0)
 */
const parseArmorEntry = (armorText, isNatural = false, naturalValue = 0) => {
  const armor = {
    name: "",
    cut: 0,      // FIL
    impact: 0,   // CON
    thrust: 0,   // PEN
    heat: 0,     // CAL
    electricity: 0, // ELE
    cold: 0,     // FRI
    energy: 0,   // ENE
  };

  if (!armorText && !isNatural) return null;

  // Handle "Natural X" armor - all physical values = X, energy = 0
  if (isNatural) {
    armor.name = "Natural";
    armor.cut = naturalValue;
    armor.impact = naturalValue;
    armor.thrust = naturalValue;
    armor.heat = naturalValue;
    armor.electricity = naturalValue;
    armor.cold = naturalValue;
    armor.energy = 0;
    return armor;
  }

  // Extract AT values first (Spanish and English)
  const atPatterns = [
    { key: "cut", regex: /(?:Fil|Cut)\s*(\d+)/i },
    { key: "impact", regex: /(?:Con|Imp)\s*(\d+)/i },
    { key: "thrust", regex: /(?:Pen|Thr)\s*(\d+)/i },
    { key: "heat", regex: /(?:Cal|Hea)\s*(\d+)/i },
    { key: "electricity", regex: /Ele\s*(\d+)/i },
    { key: "cold", regex: /(?:Fri|Col)\s*(\d+)/i },
    { key: "energy", regex: /Ene\s*(\d+)/i },
  ];

  let hasAtValues = false;
  for (const { key, regex } of atPatterns) {
    const match = armorText.match(regex);
    if (match) {
      armor[key] = parseInt(match[1]) || 0;
      hasAtValues = true;
    }
  }

  // If no AT values found, this isn't a valid armor entry
  if (!hasAtValues) return null;

  // Extract name (everything before the first AT value)
  const nameMatch = armorText.match(/^(.+?)\s*(?:Fil|Con|Pen|Cal|Ele|Fri|Ene)\s*\d+/i);
  if (nameMatch) {
    armor.name = nameMatch[1].trim();
  }

  return armor;
};

/**
 * Parse armor data - can have multiple armors
 * Formats:
 *   TA: Gabardina Armada +15 FIL 4 CON 3 PEN 5 CAL 4 ELE 5 FRI 5 ENE 3
 *   TA: Natural 5 (all physical = 5, energy = 0)
 *   TA: Escamas de Cristal + Natural Fil 12 Con 12 Pen 12 Cal 12 Ele 12 Fri 12 Ene 10
 *   AT: No (English - no armor)
 *   AT: Cut 5 Imp 5 Thr 5 Hea 5 Ele 5 Col 5 Ene 3
 */
const parseArmors = (text) => {
  const armors = [];

  // First, look for the TA:/AT: line specifically
  const taLineMatch = text.match(/(?:TA|AT):?\s*([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i);

  if (taLineMatch) {
    let taContent = taLineMatch[1].trim();

    // Check for "Natural X" format (just a number after Natural)
    const naturalOnlyMatch = taContent.match(/^Natural\s+(\d+)\s*$/i);
    if (naturalOnlyMatch) {
      const naturalValue = parseInt(naturalOnlyMatch[1]) || 0;
      const naturalArmor = parseArmorEntry("", true, naturalValue);
      if (naturalArmor) armors.push(naturalArmor);
      return armors;
    }

    // Check for combined armor: "Name + Natural Fil X Con X..."
    // The "+ Natural" is part of the armor name, not a separate armor
    // Example: "Escamas de Cristal + Natural Fil 12 Con 12..."
    const combinedMatch = taContent.match(/^(.+?)\s+(Fil\s*\d+.*)$/i);
    if (combinedMatch) {
      const armorName = combinedMatch[1].trim();
      const atValues = combinedMatch[2];
      const fullArmorText = armorName + " " + atValues;
      const armor = parseArmorEntry(fullArmorText);
      if (armor && armor.name) {
        armors.push(armor);
      }
    }
  }

  // If we didn't find armors from the TA line, look for lines with AT values
  if (armors.length === 0) {
    // Look for lines containing AT values (Fil, Con, Pen, etc.)
    const armorPattern = /(?:TA:?\s*)?([^\n]*?(?:Fil|Con|Pen|Cal|Ele|Fri|Ene)\s*\d+[^\n]*)/gi;
    let match;

    while ((match = armorPattern.exec(text)) !== null) {
      const armorText = match[1].trim();
      // Skip if this looks like a combat line (contains "Habilidad" or "Turno")
      if (armorText.match(/Habilidad|Turno|ataque|defensa/i)) continue;

      const armor = parseArmorEntry(armorText);
      if (armor && armor.name) {
        armors.push(armor);
      }
    }
  }

  return armors;
};

/**
 * Parse mystic data (Spanish and English)
 */
const parseMystic = (text) => {
  const mystic = {
    act: 0,
    zeon: 0,
    magicProjection: 0,
    magicProjectionOffensive: 0,
    magicProjectionDefensive: 0,
    magicLevels: {},
  };

  // ACT: 200 or MA: 140 (Magic Accumulation)
  const actMatch = text.match(/(?:ACT|MA):?\s*(\d+)/i);
  if (actMatch) {
    mystic.act = parseInt(actMatch[1]) || 0;
  }

  // Zeon: 2.110 (Spanish thousands separator) or Zeon: 2,345 or 2345
  const zeonMatch = text.match(/Zeon:?\s*([\d.,]+)/i);
  if (zeonMatch) {
    mystic.zeon = parseNumber(zeonMatch[1]);
  }

  // Proyección mágica: 200 Ofensiva, 220 Defensiva
  // OR: Magic Projection: 280 (300 with Artifacts)
  // OR: Proyección mágica: 260
  const projMatch = text.match(/(?:Proyecci[oó]n\s*[Mm][aá]gica|Magic Projection):?\s*([^\n]+)/i);
  if (projMatch) {
    const projText = projMatch[1];
    // Check for offensive/defensive split (Spanish)
    const offMatchES = projText.match(/(\d+)\s*Ofensiva/i);
    const defMatchES = projText.match(/(\d+)\s*Defensiva/i);
    // Check for offensive/defensive split (English)
    const offMatchEN = projText.match(/(\d+)\s*Offensive/i);
    const defMatchEN = projText.match(/(\d+)\s*Defensive/i);

    const offMatch = offMatchES || offMatchEN;
    const defMatch = defMatchES || defMatchEN;

    if (offMatch || defMatch) {
      mystic.magicProjectionOffensive = offMatch ? parseInt(offMatch[1]) || 0 : 0;
      mystic.magicProjectionDefensive = defMatch ? parseInt(defMatch[1]) || 0 : 0;
      mystic.magicProjection = mystic.magicProjectionOffensive || mystic.magicProjectionDefensive;
    } else {
      // Single value - might have parenthetical note like "(300 with Artifacts)"
      const singleMatch = projText.match(/^(\d+)/);
      if (singleMatch) {
        mystic.magicProjection = parseInt(singleMatch[1]) || 0;
        mystic.magicProjectionOffensive = mystic.magicProjection;
        mystic.magicProjectionDefensive = mystic.magicProjection;
      }
    }
  }

  // Nivel de magia: 80 Luz, 50 Fuego or Magic Level: 90 Darkness, 90 Destruction
  const levelMatch = text.match(/(?:Nivel de magia|Magic Level):?\s*([^\n]+)/i);
  if (levelMatch) {
    const levelsText = levelMatch[1];
    const spherePatterns = [
      { key: "light", regex: /(\d+)\s*(?:Luz|Light)/i },
      { key: "darkness", regex: /(\d+)\s*(?:Oscuridad|Darkness|Umbra)/i },
      { key: "fire", regex: /(\d+)\s*(?:Fuego|Fire)/i },
      { key: "water", regex: /(\d+)\s*(?:Agua|Water)/i },
      { key: "earth", regex: /(\d+)\s*(?:Tierra|Earth)/i },
      { key: "air", regex: /(\d+)\s*(?:Aire|Air)/i },
      { key: "creation", regex: /(\d+)\s*(?:Creaci[oó]n|Creation)/i },
      { key: "destruction", regex: /(\d+)\s*(?:Destrucci[oó]n|Destruction)/i },
      { key: "essence", regex: /(\d+)\s*(?:Esencia|Essence)/i },
      { key: "illusion", regex: /(\d+)\s*(?:Ilusi[oó]n|Illusion)/i },
      { key: "necromancy", regex: /(\d+)\s*(?:Necromancia|Necromancy)/i },
    ];

    for (const { key, regex } of spherePatterns) {
      const match = levelsText.match(regex);
      if (match) {
        mystic.magicLevels[key] = parseInt(match[1]) || 0;
      }
    }
  }

  return mystic;
};

/**
 * Parse domine (ki) data
 */
const parseDomine = (text) => {
  const domine = {
    martialKnowledge: 0,
    kiAccumulation: {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      power: 0,
      willPower: 0,
    },
    genericKi: 0,
  };

  // CM: 280
  const cmMatch = text.match(/CM:?\s*(\d+)/i);
  if (cmMatch) {
    domine.martialKnowledge = parseInt(cmMatch[1]) || 0;
  }

  // Acumulaciones: Fue 1 Des 3 Agi 2 Con 1 Pod 4 Vol 2
  const accumMatch = text.match(/Acumulaciones:?\s*([^\n(]+)/i);
  if (accumMatch) {
    const accumText = accumMatch[1];
    const patterns = [
      { key: "strength", regex: /Fue\s*(\d+)/i },
      { key: "dexterity", regex: /Des\s*(\d+)/i },
      { key: "agility", regex: /Agi\s*(\d+)/i },
      { key: "constitution", regex: /Con\s*(\d+)/i },
      { key: "power", regex: /Pod\s*(\d+)/i },
      { key: "willPower", regex: /Vol\s*(\d+)/i },
    ];

    for (const { key, regex } of patterns) {
      const match = accumText.match(regex);
      if (match) {
        domine.kiAccumulation[key] = parseInt(match[1]) || 0;
      }
    }
  }

  // Ki Genérico: 76
  const kiMatch = text.match(/Ki\s*Gen[eé]rico:?\s*(\d+)/i);
  if (kiMatch) {
    domine.genericKi = parseInt(kiMatch[1]) || 0;
  }

  return domine;
};

/**
 * Parse psychic data (Spanish and English)
 */
const parsePsychic = (text) => {
  const psychic = {
    psychicPoints: 0,
    psychicPotential: 0,
    psychicProjection: 0,
    psychicProjectionOffensive: 0,
    psychicProjectionDefensive: 0,
  };

  // Puntos Psíquicos or PP: X or Psychic Points: X
  const ppMatch = text.match(/(?:Puntos?\s*Ps[ií]quicos?|Psychic Points?|PP):?\s*(\d+)/i);
  if (ppMatch) {
    psychic.psychicPoints = parseInt(ppMatch[1]) || 0;
  }

  // Potencial Psíquico: X or Psychic Potential: X
  const potMatch = text.match(/(?:Potencial\s*Ps[ií]quico|Psychic Potential):?\s*(\d+)/i);
  if (potMatch) {
    psychic.psychicPotential = parseInt(potMatch[1]) || 0;
  }

  // Proyección Psíquica: 200 Ofensiva, 220 Defensiva
  // OR: Psychic Projection: 260
  const projMatch = text.match(/(?:Proyecci[oó]n\s*Ps[ií]quica|Psychic Projection):?\s*([^\n]+)/i);
  if (projMatch) {
    const projText = projMatch[1];
    // Check for offensive/defensive split (Spanish or English)
    const offMatch = projText.match(/(\d+)\s*(?:Ofensiva|Offensive)/i);
    const defMatch = projText.match(/(\d+)\s*(?:Defensiva|Defensive)/i);
    if (offMatch || defMatch) {
      psychic.psychicProjectionOffensive = offMatch ? parseInt(offMatch[1]) || 0 : 0;
      psychic.psychicProjectionDefensive = defMatch ? parseInt(defMatch[1]) || 0 : 0;
      psychic.psychicProjection = psychic.psychicProjectionOffensive || psychic.psychicProjectionDefensive;
    } else {
      // Single value
      const singleMatch = projText.match(/^(\d+)/);
      if (singleMatch) {
        psychic.psychicProjection = parseInt(singleMatch[1]) || 0;
        psychic.psychicProjectionOffensive = psychic.psychicProjection;
        psychic.psychicProjectionDefensive = psychic.psychicProjection;
      }
    }
  }

  return psychic;
};

/**
 * Parse secondary abilities (Spanish and English)
 */
const parseSecondaries = (text) => {
  const secondaries = {};

  // Habilidades Secundarias: Atletismo 75, ... or Secondary Abilities: Ride 80, Swim 40, ...
  const secMatch = text.match(/(?:Habilidades?\s*Secundarias?|Secondary\s*Abilities):?\s*([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i);
  if (secMatch) {
    const secText = secMatch[1];
    // Match patterns like "Atletismo 75" or "Ride 80"
    const skillRegex = /([A-Za-zÁÉÍÓÚáéíóúñÑ.\s]+?)\s+(\d+)/g;
    let match;
    while ((match = skillRegex.exec(secText)) !== null) {
      const skillName = match[1].trim();
      const skillValue = parseInt(match[2]) || 0;
      if (skillName && skillValue > 0) {
        secondaries[skillName] = skillValue;
      }
    }
  }

  return secondaries;
};

/**
 * Parse general stats (Spanish and English)
 * Also returns isDamageResistanceFromLP if "Acumulación" or "Damage Resistance" appears in the LP line
 */
const parseGeneral = (text) => {
  const general = {
    level: 1,
    lifePoints: 100,
    category: "",
    race: "",
    size: 0,
    regeneration: 0,
    movementType: 0,
    fatigue: 0,
    isDamageResistanceFromLP: false,
  };

  // Nivel: 14 or Level: 16
  const levelMatch = text.match(/(?:Nivel|Level):?\s*(\d+)/i);
  if (levelMatch) {
    general.level = parseInt(levelMatch[1]) || 1;
  }

  // Puntos de Vida: 8.550 or Life Points: 350
  // Handle thousands separator (. or ,) and detect "Acumulación" or "Damage Resistance"
  const lpMatch = text.match(/(?:Puntos\s*de\s*Vida|Life Points?):?\s*([\d.,]+)(?:\s*(Acumulaci[oó]n|Damage\s*Resistance))?/i);
  if (lpMatch) {
    general.lifePoints = parseNumber(lpMatch[1]);
    if (lpMatch[2]) {
      general.isDamageResistanceFromLP = true;
    }
  }

  // Categoría: Warlock or Category: Between Worlds
  const catMatch = text.match(/(?:Categor[ií]a|Category):?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s+(?:Raza|Race)|\s*$|\n|\d)/i);
  if (catMatch) {
    general.category = catMatch[1].trim();
  }

  // Raza: Sylvain or Race: Human
  const raceMatch = text.match(/(?:Raza|Race):?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\n|$)/i);
  if (raceMatch) {
    general.race = raceMatch[1].trim();
  }

  // Tamaño: 16 or Size: 19
  const sizeMatch = text.match(/(?:Tama[ñn]o|Size):?\s*(\d+)/i);
  if (sizeMatch) {
    general.size = parseInt(sizeMatch[1]) || 0;
  }

  // Regeneración: 5 or Regeneration: 10
  const regenMatch = text.match(/(?:Regeneraci[oó]n|Regeneration):?\s*(\d+)/i);
  if (regenMatch) {
    general.regeneration = parseInt(regenMatch[1]) || 0;
  }

  // Tipo de movimiento: 11 or Movement Value: 11
  const moveMatch = text.match(/(?:Tipo\s*de\s*movimiento|Movement\s*(?:Value|Type)):?\s*(\d+)/i);
  if (moveMatch) {
    general.movementType = parseInt(moveMatch[1]) || 0;
  }

  // Cansancio: 8 or Fatigue: Tireless or Fatigue: 8
  const fatigueMatch = text.match(/(?:Cansancio|Fatigue):?\s*(\d+|Tireless|Incansable)/i);
  if (fatigueMatch) {
    const val = fatigueMatch[1];
    if (val.match(/Tireless|Incansable/i)) {
      general.fatigue = 99; // Tireless = effectively unlimited
    } else {
      general.fatigue = parseInt(val) || 0;
    }
  }

  return general;
};

/**
 * Parse special abilities (Spanish and English)
 * Habilidades naturales/Natural Abilities, esenciales/Essential Abilities, Poderes/Powers
 * Returns an object with separate fields for essential abilities and powers
 */
const parseSpecialAbilities = (text) => {
  // Helper to extract multi-line content until next section or end
  const extractSection = (regex) => {
    const match = text.match(regex);
    if (match) {
      let content = match[1].trim();
      // Clean up line breaks within the content
      content = content.replace(/\s*\n\s*/g, " ").trim();
      // Remove trailing period if present
      if (content.endsWith(".")) {
        content = content.slice(0, -1);
      }
      return content;
    }
    return "";
  };

  // Habilidades naturales or Natural Abilities
  const naturalAbilities = extractSection(
    /(?:Habilidades?\s*naturales?|Natural\s*Abilities):?\s*([^.]+(?:\.[^.]*)*?)(?=(?:Habilidades?\s*esenciales?|Essential\s*Abilities)|(?:Poderes?|Powers):|(?:Habilidades?\s*Secundarias?|Secondary\s*Abilities):|Size:|Tama[ñn]o:|$)/is
  );

  // Habilidades esenciales or Essential Abilities
  const essentialAbilities = extractSection(
    /(?:Habilidades?\s*esenciales?|Essential\s*Abilities):?\s*([^.]+(?:\.[^.]*)*?)(?=(?:Poderes?|Powers):|(?:Habilidades?\s*Secundarias?|Secondary\s*Abilities):|Size:|Tama[ñn]o:|$)/is
  );

  // Poderes or Powers
  const powers = extractSection(
    /(?:Poderes?|Powers):?\s*([^.]+(?:\.[^.]*)*?)(?=(?:Habilidades?\s*Secundarias?|Secondary\s*Abilities):|Size:|Tama[ñn]o:|$)/is
  );

  // Combine natural + essential for "Habilidades esenciales" field
  let combinedEssential = "";
  if (naturalAbilities) {
    combinedEssential += naturalAbilities;
  }
  if (essentialAbilities) {
    if (combinedEssential) combinedEssential += "\n";
    combinedEssential += essentialAbilities;
  }

  return {
    essentialAbilities: combinedEssential,
    powers: powers,
    // Keep combined for backward compatibility
    combined: [
      naturalAbilities ? `**Natural Abilities:** ${naturalAbilities}` : "",
      essentialAbilities ? `**Essential Abilities:** ${essentialAbilities}` : "",
      powers ? `**Powers:** ${powers}` : "",
    ].filter(s => s).join("\n\n"),
  };
};

/**
 * Main parser function - parses PDF text into structured data
 */
export const parsePdfText = (text) => {
  const combat = parseCombat(text);
  const general = parseGeneral(text);
  const specialAbilities = parseSpecialAbilities(text);

  // Damage resistance can be detected from defense line OR from LP line
  const isDamageResistance = combat.isDamageResistance || general.isDamageResistanceFromLP;

  return {
    name: parseName(text),
    general: general,
    primaries: parsePrimaries(text),
    resistances: parseResistances(text),
    combat: combat,
    armors: parseArmors(text),
    mystic: parseMystic(text),
    domine: parseDomine(text),
    psychic: parsePsychic(text),
    secondaries: parseSecondaries(text),
    essentialAbilities: specialAbilities.essentialAbilities,
    powers: specialAbilities.powers,
    specialAbilities: specialAbilities.combined, // backward compat
    isDamageResistance: isDamageResistance,
    rawText: text,
  };
};
