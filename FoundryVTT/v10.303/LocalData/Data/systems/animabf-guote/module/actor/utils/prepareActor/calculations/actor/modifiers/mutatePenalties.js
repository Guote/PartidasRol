import { calculateFatigue } from "./calculations/calculateFatigue.js";

const getMaxAndMin = (array) => {
  let max = Math.max(0, ...array);
  let min = Math.min(0, ...array);
  return { max, min };
};

// Foundry v10 mergeObject can convert arrays to plain objects {0:{...},1:{...}}.
// This normalizes either form back to a true array.
const toArray = (v) => Array.isArray(v) ? v : (v != null ? Object.values(v) : []);

// Maps top-level integer keys of modFisico/modSobrenatural to their display labels.
const LABEL_MAP = {
  conditionPen:  "Condición (pen)",
  conditionPBon: "Condición (bon)",
  dolor:         "Dolor",
  critico:       "Crítico",
  presa:         "Presa",
  vuelo:         "Vuelo",
};

// Builds a labeled, non-zero breakdown for one modifier block.
// extra: [{label, value}] for contributors not keyed in LABEL_MAP (e.g. Cansancio).
// Custom entries are intentionally excluded — they appear in their own table row.
const buildBreakdown = (modBlock, extra) => {
  const rows = [...extra];
  for (const [key, label] of Object.entries(LABEL_MAP)) {
    const v = modBlock?.[key];
    if (Number.isInteger(v)) rows.push({ label, value: v });
  }
  return rows.filter((r) => r.value !== 0);
};

export const mutatePenalties = (data, actor) => {
  const modFis = actor.system.general.modifiers?.modFisico;
  const modSob = actor.system.general.modifiers?.modSobrenatural;

  const hasCansancio = !!game?.cub?.hasCondition("Cansancio", actor);
  const cansancioValue = hasCansancio ? calculateFatigue(data) : 0;

  // toArray guards against Foundry converting arrays to plain objects on deep merge
  const fisCustomValues = toArray(modFis?.customEntries).map((e) => Number(e.value) || 0);
  const sobCustomValues = toArray(modSob?.customEntries).map((e) => Number(e.value) || 0);

  let modFisArray = [
    data.general.modifiers.modFisico.bonus.value,
    -Math.abs(data.general.modifiers.modFisico.malus.value),
    cansancioValue,
    ...Object.values(modFis)?.filter((num) => Number.isInteger(num)), // dolor, critico, presa, vuelo, conditionPBon, conditionPen
    ...fisCustomValues, // arrays invisible to integer filter above — spread explicitly
  ];
  let modSobArray = [
    data.general.modifiers.modSobrenatural.bonus.value ?? 0,
    -Math.abs(data.general.modifiers.modSobrenatural.malus.value ?? 0),
    ...Object.values(modSob)?.filter((num) => Number.isInteger(num)),
    ...sobCustomValues,
  ];
  let modAttackFisArray = [
    ...modFisArray,
    data.general.modifiers.modFisico?.attack?.conditionBon ?? 0,
    data.general.modifiers.modFisico?.attack?.conditionPen ?? 0,
  ];
  let modAttackSobArray = [
    ...modSobArray,
    data.general.modifiers.modSobrenatural?.attack?.conditionBon ?? 0,
    data.general.modifiers.modSobrenatural?.attack?.conditionPen ?? 0,
  ];
  let modDefenseFisArray = [
    ...modFisArray,
    data.general.modifiers.modFisico?.defense?.conditionBon ?? 0,
    data.general.modifiers.modFisico?.defense?.conditionPen ?? 0,
  ];
  let modDefenseSobArray = [
    ...modSobArray,
    data.general.modifiers.modSobrenatural?.defense?.conditionBon ?? 0,
    data.general.modifiers.modSobrenatural?.defense?.conditionPen ?? 0,
  ];

  let penalties = {
    fis: {
      pen: getMaxAndMin(modFisArray).min,
      bon: getMaxAndMin(modFisArray).max,
    },
    sob: {
      pen: getMaxAndMin(modSobArray).min,
      bon: getMaxAndMin(modSobArray).max,
    },
    general:
      getMaxAndMin(modFisArray).min +
      getMaxAndMin(modFisArray).max +
      getMaxAndMin(modSobArray).min +
      getMaxAndMin(modSobArray).max,
    ataque:
      (data.general.modifiers?.modManiobras?.ha ?? 0) +
      getMaxAndMin(modAttackFisArray).min +
      getMaxAndMin(modAttackFisArray).max +
      getMaxAndMin(modAttackSobArray).min +
      getMaxAndMin(modAttackSobArray).max,
    defense:
      (data.general.modifiers?.modManiobras?.hd ?? 0) +
      getMaxAndMin(modDefenseFisArray).min +
      getMaxAndMin(modDefenseFisArray).max +
      getMaxAndMin(modDefenseSobArray).min +
      getMaxAndMin(modDefenseSobArray).max,
  };

  data.general.modifiers.modFisico.final.value =
    penalties.fis.pen + penalties.fis.bon;
  data.general.modifiers.modSobrenatural.final.value =
    penalties.sob.pen + penalties.sob.bon;
  data.general.modifiers.modFinal.general.final.value = penalties.general;
  data.general.modifiers.modFinal.attack.final.value = penalties.ataque;
  data.general.modifiers.modFinal.defense.final.value = penalties.defense;

  // Breakdown for formula display (separate fis/sob per action type)
  data.general.modifiers.modFinal.attack.fis =
    getMaxAndMin(modAttackFisArray).min + getMaxAndMin(modAttackFisArray).max;
  data.general.modifiers.modFinal.attack.sob =
    getMaxAndMin(modAttackSobArray).min + getMaxAndMin(modAttackSobArray).max;
  data.general.modifiers.modFinal.defense.fis =
    getMaxAndMin(modDefenseFisArray).min + getMaxAndMin(modDefenseFisArray).max;
  data.general.modifiers.modFinal.defense.sob =
    getMaxAndMin(modDefenseSobArray).min + getMaxAndMin(modDefenseSobArray).max;

  // Display-only labeled breakdown for the Effects tab (never persisted).
  // Split by sign so the template can place positives under Bonus and negatives under Malus.
  // Custom entries are excluded here — they appear in their own dedicated table row.
  data.general.modifiers.modFisico.breakdown = buildBreakdown(modFis,
    hasCansancio ? [{ label: "Cansancio", value: cansancioValue }] : []
  );
  data.general.modifiers.modSobrenatural.breakdown = buildBreakdown(modSob, []);

  // Pre-computed getModifierTerms type values for the Effects tab reference row.
  const fisFinal = data.general.modifiers.modFisico.final.value;
  const sobFinal = data.general.modifiers.modSobrenatural.final.value;
  const generalNegative = Math.min(0, fisFinal) + Math.min(0, sobFinal);
  data.general.modifiers.modFinal.generalNegative = generalNegative;
  data.general.modifiers.modFinal.generalNegativeHalf = Math.min(0, Math.floor(penalties.general / 10) * 5);
  data.general.modifiers.modFinal.initiative = Math.floor(penalties.general / 10) * 5;
};
