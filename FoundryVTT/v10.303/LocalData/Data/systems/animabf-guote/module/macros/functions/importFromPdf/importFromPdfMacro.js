/**
 * Import Character from PDF Macro
 * Allows importing characters from Anima Beyond Fantasy PDF stat blocks
 */

import { parsePdfText } from "./pdfTextParser.js";
import { buildActorData, buildWeaponsData, buildArmorsData, buildSpecialAbilitiesNotes } from "./actorMapper.js";
import { ABFDialogs } from "../../../dialogs/ABFDialogs.js";

/**
 * Open dialog for pasting PDF text
 */
const openImportDialog = async () => {
  const typedGame = game;

  const content = `
    <form>
      <p style="margin-bottom: 8px;">${typedGame.i18n.localize("anima.macros.importPdf.dialog.instructions")}</p>
      <textarea name="pdf-text" style="width:100%;height:300px;font-family:monospace;font-size:11px;"></textarea>
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: typedGame.i18n.localize("anima.macros.importPdf.dialog.title"),
      content,
      buttons: {
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: typedGame.i18n.localize("anima.macros.importPdf.dialog.import"),
          callback: (html) => resolve(html.find('[name="pdf-text"]').val()),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: typedGame.i18n.localize("anima.dialogs.cancel"),
          callback: () => resolve(null),
        },
      },
      default: "import",
    }).render(true);
  });
};

/**
 * Small input helper
 */
const numInput = (name, value, width = 40) =>
  `<input type="number" name="${name}" value="${value}" style="width:${width}px;text-align:center;">`;

const textInput = (name, value, width = 100) =>
  `<input type="text" name="${name}" value="${value}" style="width:${width}px;">`;

/**
 * Build weapons editor HTML
 */
const buildWeaponsHtml = (weapons) => {
  if (!weapons || weapons.length === 0) return "";
  let html = '<div style="margin:4px 0;"><b>Armas</b></div>';
  weapons.forEach((w, i) => {
    html += `<div style="display:flex;gap:4px;margin:2px 0;align-items:center;">
      ${textInput(`weapon_${i}_name`, w.name || '', 120)}
      <span>T:</span>${numInput(`weapon_${i}_turnBonus`, w.turnBonus || 0)}
      <span>HA:</span>${numInput(`weapon_${i}_attackBonus`, w.attackBonus || 0)}
      <span>HD:</span>${numInput(`weapon_${i}_blockBonus`, w.blockBonus || 0)}
      <span>Daño:</span>${numInput(`weapon_${i}_damage`, w.damage || 0)}
    </div>`;
  });
  return html;
};

/**
 * Build armors editor HTML
 */
const buildArmorsHtml = (armors) => {
  if (!armors || armors.length === 0) return "";
  let html = '<div style="margin:4px 0;"><b>Armaduras</b></div>';
  armors.forEach((a, i) => {
    html += `<div style="display:flex;gap:4px;margin:2px 0;align-items:center;flex-wrap:wrap;">
      ${textInput(`armor_${i}_name`, a.name || '', 140)}
      <span>F:</span>${numInput(`armor_${i}_cut`, a.cut || 0, 30)}
      <span>C:</span>${numInput(`armor_${i}_impact`, a.impact || 0, 30)}
      <span>P:</span>${numInput(`armor_${i}_thrust`, a.thrust || 0, 30)}
      <span>Ca:</span>${numInput(`armor_${i}_heat`, a.heat || 0, 30)}
      <span>E:</span>${numInput(`armor_${i}_electricity`, a.electricity || 0, 30)}
      <span>Fr:</span>${numInput(`armor_${i}_cold`, a.cold || 0, 30)}
      <span>En:</span>${numInput(`armor_${i}_energy`, a.energy || 0, 30)}
    </div>`;
  });
  return html;
};

/**
 * Show editable preview of parsed data
 */
const showPreviewDialog = async (parsed) => {
  const typedGame = game;
  const { general, primaries, resistances, combat, armors, mystic, summoning, domine, psychic, essentialAbilities, powers, isDamageResistance } = parsed;

  const content = `
    <style>
      .ip{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0;align-items:center;font-size:11px;}
      .ip b{min-width:24px;}
      .ip input[type="number"]{width:40px;text-align:center;}
      .ip input[type="text"]{width:100px;}
      .sec{margin:6px 0;padding:4px;border-bottom:1px solid #ccc;}
    </style>
    <form style="font-size:11px;max-height:450px;overflow-y:auto;">

      <div class="ip"><b>Nombre:</b><input type="text" name="name" value="${parsed.name}" style="flex:1;"></div>

      <div class="sec"><b>General</b></div>
      <div class="ip">
        <b>Nv:</b>${numInput('general_level', general.level)}
        <b>PV:</b>${numInput('general_lifePoints', general.lifePoints, 50)}
        <b>Tam:</b>${numInput('general_size', general.size)}
        <b>Reg:</b>${numInput('general_regeneration', general.regeneration)}
        <b>Mov:</b>${numInput('general_movementType', general.movementType)}
        <b>Can:</b>${numInput('general_fatigue', general.fatigue)}
      </div>
      <div class="ip">
        <b>Cat:</b>${textInput('general_category', general.category, 120)}
        <b>Raza:</b>${textInput('general_race', general.race, 100)}
      </div>

      <div class="sec"><b>Primarias</b></div>
      <div class="ip">
        <b>Fue:</b>${numInput('primaries_strength', primaries.strength)}
        <b>Des:</b>${numInput('primaries_dexterity', primaries.dexterity)}
        <b>Agi:</b>${numInput('primaries_agility', primaries.agility)}
        <b>Con:</b>${numInput('primaries_constitution', primaries.constitution)}
        <b>Pod:</b>${numInput('primaries_power', primaries.power)}
        <b>Int:</b>${numInput('primaries_intelligence', primaries.intelligence)}
        <b>Vol:</b>${numInput('primaries_willPower', primaries.willPower)}
        <b>Per:</b>${numInput('primaries_perception', primaries.perception)}
      </div>

      <div class="sec"><b>Resistencias</b></div>
      <div class="ip">
        <b>RF:</b>${numInput('resistances_physical', resistances.physical)}
        <b>RM:</b>${numInput('resistances_magic', resistances.magic)}
        <b>RP:</b>${numInput('resistances_psychic', resistances.psychic)}
        <b>RV:</b>${numInput('resistances_poison', resistances.poison)}
        <b>RE:</b>${numInput('resistances_disease', resistances.disease)}
      </div>

      <div class="sec"><b>Combate</b></div>
      <div class="ip">
        <b>Turno:</b>${numInput('combat_naturalInitiative', combat.naturalInitiative)}
        <b>HA:</b>${numInput('combat_naturalAttack', combat.naturalAttack)}
        <b>HD:</b>${numInput('combat_naturalBlock', combat.naturalBlock)}
        <b>LA:</b>${numInput('combat_wearArmor', combat.wearArmor)}
        <label><input type="checkbox" name="isDamageResistance" ${isDamageResistance ? 'checked' : ''}> Acumulación</label>
      </div>

      ${buildWeaponsHtml(combat.weapons)}
      ${buildArmorsHtml(armors)}

      <div class="sec"><b>Místico</b></div>
      <div class="ip">
        <b>ACT:</b>${numInput('mystic_act', mystic.act)}
        <b>Zeon:</b>${numInput('mystic_zeon', mystic.zeon, 50)}
        <b>PM Of:</b>${numInput('mystic_magicProjectionOffensive', mystic.magicProjectionOffensive || mystic.magicProjection)}
        <b>PM Def:</b>${numInput('mystic_magicProjectionDefensive', mystic.magicProjectionDefensive || mystic.magicProjection)}
      </div>
      <div class="ip" style="font-size:10px;">
        <b>Luz:</b>${numInput('ml_light', mystic.magicLevels.light || 0, 32)}
        <b>Osc:</b>${numInput('ml_darkness', mystic.magicLevels.darkness || 0, 32)}
        <b>Fue:</b>${numInput('ml_fire', mystic.magicLevels.fire || 0, 32)}
        <b>Agu:</b>${numInput('ml_water', mystic.magicLevels.water || 0, 32)}
        <b>Tie:</b>${numInput('ml_earth', mystic.magicLevels.earth || 0, 32)}
        <b>Air:</b>${numInput('ml_air', mystic.magicLevels.air || 0, 32)}
        <b>Cre:</b>${numInput('ml_creation', mystic.magicLevels.creation || 0, 32)}
        <b>Des:</b>${numInput('ml_destruction', mystic.magicLevels.destruction || 0, 32)}
        <b>Ess:</b>${numInput('ml_essence', mystic.magicLevels.essence || 0, 32)}
        <b>Ilu:</b>${numInput('ml_illusion', mystic.magicLevels.illusion || 0, 32)}
        <b>Nec:</b>${numInput('ml_necromancy', mystic.magicLevels.necromancy || 0, 32)}
      </div>
      <div class="ip">
        <b>Conv:</b>${numInput('summoning_summon', summoning?.summon || 0)}
        <b>Ctrl:</b>${numInput('summoning_control', summoning?.control || 0)}
        <b>Atar:</b>${numInput('summoning_bind', summoning?.bind || 0)}
        <b>Dest:</b>${numInput('summoning_banish', summoning?.banish || 0)}
      </div>

      <div class="sec"><b>Dominio</b></div>
      <div class="ip">
        <b>CM:</b>${numInput('domine_martialKnowledge', domine.martialKnowledge)}
        <b>Ki:</b>${numInput('domine_genericKi', domine.genericKi)}
      </div>

      <div class="sec"><b>Psíquico</b></div>
      <div class="ip">
        <b>PP:</b>${numInput('psychic_psychicPoints', psychic.psychicPoints)}
        <b>Pot:</b>${numInput('psychic_psychicPotential', psychic.psychicPotential)}
        <b>PPsi Of:</b>${numInput('psychic_psychicProjectionOffensive', psychic.psychicProjectionOffensive || psychic.psychicProjection)}
        <b>PPsi Def:</b>${numInput('psychic_psychicProjectionDefensive', psychic.psychicProjectionDefensive || psychic.psychicProjection)}
      </div>

      <div class="sec"><b>Habilidades Esenciales</b></div>
      <textarea name="essentialAbilities" style="width:100%;height:40px;font-size:10px;">${essentialAbilities || ''}</textarea>

      <div class="sec"><b>Poderes</b></div>
      <textarea name="powers" style="width:100%;height:40px;font-size:10px;">${powers || ''}</textarea>

    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: typedGame.i18n.localize("anima.macros.importPdf.preview.title"),
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: typedGame.i18n.localize("anima.macros.importPdf.preview.confirm"),
          callback: (html) => resolve(extractEditedValues(html, parsed)),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: typedGame.i18n.localize("anima.dialogs.cancel"),
          callback: () => resolve(null),
        },
      },
      default: "confirm",
    }, { width: 480 }).render(true);
  });
};

/**
 * Extract edited values from the preview form
 */
const extractEditedValues = (html, original) => {
  const getVal = (name) => html.find(`[name="${name}"]`).val();
  const getNum = (name) => parseInt(getVal(name)) || 0;
  const getChecked = (name) => html.find(`[name="${name}"]`).is(':checked');

  const edited = {
    name: getVal('name'),
    general: {
      level: getNum('general_level'),
      lifePoints: getNum('general_lifePoints'),
      size: getNum('general_size'),
      regeneration: getNum('general_regeneration'),
      movementType: getNum('general_movementType'),
      fatigue: getNum('general_fatigue'),
      category: getVal('general_category'),
      race: getVal('general_race'),
    },
    primaries: {
      strength: getNum('primaries_strength'),
      dexterity: getNum('primaries_dexterity'),
      agility: getNum('primaries_agility'),
      constitution: getNum('primaries_constitution'),
      power: getNum('primaries_power'),
      intelligence: getNum('primaries_intelligence'),
      willPower: getNum('primaries_willPower'),
      perception: getNum('primaries_perception'),
    },
    resistances: {
      physical: getNum('resistances_physical'),
      magic: getNum('resistances_magic'),
      psychic: getNum('resistances_psychic'),
      poison: getNum('resistances_poison'),
      disease: getNum('resistances_disease'),
    },
    combat: {
      naturalInitiative: getNum('combat_naturalInitiative'),
      naturalAttack: getNum('combat_naturalAttack'),
      naturalBlock: getNum('combat_naturalBlock'),
      wearArmor: getNum('combat_wearArmor'),
      weapons: [],
    },
    mystic: {
      act: getNum('mystic_act'),
      zeon: getNum('mystic_zeon'),
      magicProjection: getNum('mystic_magicProjectionOffensive'),
      magicProjectionOffensive: getNum('mystic_magicProjectionOffensive'),
      magicProjectionDefensive: getNum('mystic_magicProjectionDefensive'),
      magicLevels: {
        light: getNum('ml_light'),
        darkness: getNum('ml_darkness'),
        fire: getNum('ml_fire'),
        water: getNum('ml_water'),
        earth: getNum('ml_earth'),
        air: getNum('ml_air'),
        creation: getNum('ml_creation'),
        destruction: getNum('ml_destruction'),
        essence: getNum('ml_essence'),
        illusion: getNum('ml_illusion'),
        necromancy: getNum('ml_necromancy'),
      },
    },
    summoning: {
      summon: getNum('summoning_summon'),
      control: getNum('summoning_control'),
      bind: getNum('summoning_bind'),
      banish: getNum('summoning_banish'),
    },
    domine: {
      martialKnowledge: getNum('domine_martialKnowledge'),
      genericKi: getNum('domine_genericKi'),
      kiAccumulation: original.domine.kiAccumulation || {},
    },
    psychic: {
      psychicPoints: getNum('psychic_psychicPoints'),
      psychicPotential: getNum('psychic_psychicPotential'),
      psychicProjection: getNum('psychic_psychicProjectionOffensive'),
      psychicProjectionOffensive: getNum('psychic_psychicProjectionOffensive'),
      psychicProjectionDefensive: getNum('psychic_psychicProjectionDefensive'),
    },
    secondaries: original.secondaries || {},
    essentialAbilities: getVal('essentialAbilities'),
    powers: getVal('powers'),
    isDamageResistance: getChecked('isDamageResistance'),
    armors: [],
  };

  // Extract weapons
  let i = 0;
  while (html.find(`[name="weapon_${i}_name"]`).length) {
    const name = getVal(`weapon_${i}_name`);
    if (name) {
      edited.combat.weapons.push({
        name,
        turnBonus: getNum(`weapon_${i}_turnBonus`),
        attackBonus: getNum(`weapon_${i}_attackBonus`),
        blockBonus: getNum(`weapon_${i}_blockBonus`),
        damage: getNum(`weapon_${i}_damage`),
      });
    }
    i++;
  }

  // Extract armors
  i = 0;
  while (html.find(`[name="armor_${i}_name"]`).length) {
    const name = getVal(`armor_${i}_name`);
    if (name) {
      edited.armors.push({
        name,
        cut: getNum(`armor_${i}_cut`),
        impact: getNum(`armor_${i}_impact`),
        thrust: getNum(`armor_${i}_thrust`),
        heat: getNum(`armor_${i}_heat`),
        electricity: getNum(`armor_${i}_electricity`),
        cold: getNum(`armor_${i}_cold`),
        energy: getNum(`armor_${i}_energy`),
      });
    }
    i++;
  }

  return edited;
};

/**
 * Main import function
 */
export const importFromPdfMacro = async () => {
  const typedGame = game;

  if (!typedGame.user?.isGM) {
    ABFDialogs.prompt(typedGame.i18n.localize("anima.macros.importPdf.errors.gmOnly"));
    return;
  }

  const pdfText = await openImportDialog();
  if (!pdfText || pdfText.trim().length === 0) return;

  let parsed;
  try {
    parsed = parsePdfText(pdfText);
  } catch (error) {
    console.error("Error parsing PDF text:", error);
    ABFDialogs.prompt(typedGame.i18n.localize("anima.macros.importPdf.errors.parseFailed"));
    return;
  }

  const edited = await showPreviewDialog(parsed);
  if (!edited) return;

  try {
    const actorSystemData = buildActorData(edited);
    const actor = await Actor.create({
      name: edited.name,
      type: "character",
      img: "icons/svg/mystery-man.svg",
      ...actorSystemData,
    });

    if (!actor) throw new Error("Failed to create actor");

    // Set SimpleActorSheet as the default sheet for this actor
    await actor.setFlag("core", "sheetClass", "abf.SimpleActorSheet");

    const weaponsData = buildWeaponsData(edited);
    if (weaponsData.length > 0) {
      await actor.createEmbeddedDocuments("Item", weaponsData);
    }

    const armorsData = buildArmorsData(edited);
    if (armorsData.length > 0) {
      await actor.createEmbeddedDocuments("Item", armorsData);
    }

    const specialAbilitiesNotes = buildSpecialAbilitiesNotes(edited);
    if (specialAbilitiesNotes.length > 0) {
      await actor.createEmbeddedDocuments("Item", specialAbilitiesNotes);
    }

    ui.notifications.info(typedGame.i18n.format("anima.macros.importPdf.success", { name: edited.name }));
    actor.sheet?.render(true);

  } catch (error) {
    console.error("Error creating actor from PDF:", error);
    ABFDialogs.prompt(typedGame.i18n.localize("anima.macros.importPdf.errors.creationFailed"));
  }
};
