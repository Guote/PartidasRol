// ==========================================
// Configurar Barras BarBrawl
// ==========================================
// Lee tokenBarVisibility del actor y actualiza las barras BarBrawl.
//
// Modos de ejecución:
//   actor  (desde botón en ficha) → actualiza prototipo + todos los tokens del actor
//   token  (ejecución manual)     → actualiza prototipo + ese token concreto
//   (ninguno)                     → usa token seleccionado en canvas
//
// Gestiona los IDs estándar de barbrawl.defaultResources (bar1, bar2, etc.)
// más "guote-shield" para el escudo. El resto de barras no se toca.
// ==========================================

// --- Resolución del actor y modo ---
// "targetActor" es un parámetro exclusivo de este macro (no existe como global de Foundry).
// Cuando viene de la ficha se pasa explícitamente; en ejecución manual no existe.
let currentActor;
let singleTokenDoc; // undefined = modo "todos los tokens del actor"

if (typeof targetActor !== "undefined" && targetActor) {
  // Llamado desde la ficha: actualizar prototipo + todos los tokens del actor
  currentActor = targetActor;
  singleTokenDoc = undefined;
} else if (typeof token !== "undefined" && token) {
  currentActor = token.actor;
  singleTokenDoc = token.document;
} else if (canvas.tokens.controlled?.[0]) {
  const controlled = canvas.tokens.controlled[0];
  currentActor = controlled.document.actor;
  singleTokenDoc = controlled.document;
} else {
  const defaultActorId = game.users.get(game.userId)._source.character;
  currentActor = game.actors.get(defaultActorId);
  singleTokenDoc = currentActor?.getActiveTokens()[0]?.document ?? null;
}

if (!currentActor)
  throw new Error("Selecciona un token para configurar sus barras.");
if (singleTokenDoc === null)
  throw new Error("No se encontró un token activo para este actor.");

// --- Definición de barras gestionadas por guote ---
// Cada clave coincide con un key en system.ui.resourceVisibility.
//
// IMPORTANTE: BarBrawl resuelve "attribute" relativo a actor.system,
// NO desde la raíz del actor. Usar "mystic.zeon", NO "system.mystic.zeon".
//
// Para el escudo: mystic.shield solo tiene .value, sin .max.
// Se usa max:500 como tope fijo visible en la barra.
//
// Propiedades completas para que BarBrawl no crashee al renderizar.

// Colores, posiciones y labels tomados de barbrawl.defaultResources (settings.db).
// El escudo no tiene preset guardado; se define manualmente con max:500 como tope fijo.
const BAR_PRESETS = {
  hp: {
    id: "bar1",
    attribute: "characteristics.secondaries.lifePoints",
    label: "PV",
    mincolor: "#80FF00",
    maxcolor: "#80FF00",
    position: "top-inner",
    order: 0,
    style: "user",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    max: null,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: false,
    hideCombat: false,
    hideNoCombat: false,
  },
  fatigue: {
    id: "bar46y3hptxjczuio2u",
    attribute: "characteristics.secondaries.fatigue",
    label: "Cansancio",
    mincolor: "#d10000",
    maxcolor: "#d10000",
    position: "bottom-inner",
    order: 1,
    style: "user",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    max: null,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: false,
    hideCombat: false,
    hideNoCombat: false,
  },
  ki: {
    id: "barjaj46pjk6q6r9m78",
    attribute: "domine.kiAccumulation.generic",
    label: "Ki",
    mincolor: "#f5ed00",
    maxcolor: "#f5ed00",
    position: "bottom-outer",
    order: 2,
    style: "user",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    max: null,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: true,
    hideCombat: false,
    hideNoCombat: false,
  },
  zeon: {
    id: "bar2",
    attribute: "mystic.zeon",
    label: "Zeon",
    mincolor: "#80B3FF",
    maxcolor: "#80B3FF",
    position: "bottom-outer",
    order: 3,
    style: "user",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    max: null,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: true,
    hideCombat: false,
    hideNoCombat: false,
  },
  psychicPoints: {
    id: "barqw7invt2iisggkxq",
    attribute: "psychic.psychicPoints",
    label: "CV",
    mincolor: "#FFFFFF",
    maxcolor: "#FFFFFF",
    position: "bottom-outer",
    order: 4,
    style: "user",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    max: null,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: true,
    hideCombat: false,
    hideNoCombat: false,
  },
  shield: {
    id: "guote-shield",
    attribute: "mystic.shield",
    max: 500, // mystic.shield no tiene .max propio; 500 como tope fijo
    label: "Escudo",
    mincolor: "#d508d9",
    maxcolor: "#d508d9",
    position: "left-inner",
    order: 5,
    style: "none",
    ownerVisibility: 50,
    otherVisibility: 0,
    gmVisibility: -1,
    ignoreMax: true,
    opacity: null,
    indentLeft: null,
    indentRight: null,
    shareHeight: false,
    invert: false,
    invertDirection: false,
    subdivisions: null,
    subdivisionsOwner: false,
    subdivisionsMatchesMax: false,
    fgImage: "",
    bgImage: "",
    hideFull: false,
    hideEmpty: true,
    hideCombat: false,
    hideNoCombat: false,
  },
};

// --- Leer visibilidad de token del actor ---
const visibility = currentActor.system?.ui?.tokenBarVisibility ?? {};

const guoteIds = Object.values(BAR_PRESETS).map((p) => p.id);

// Construye un patch de update usando las reglas de merge de Foundry:
// - Si la barra debe existir: la añade/actualiza con su preset
// - Si no debe existir: usa "-=id" para borrarla explícitamente
// Nunca pone "-=id" y "id" en el mismo patch (mergeObject aplica borrados al final y ganaría).
// Las barras no gestionadas por guote no se tocan.
function buildPatch(flagsPath) {
  const patch = {};
  for (const [resourceKey, preset] of Object.entries(BAR_PRESETS)) {
    if (visibility[resourceKey]?.value) {
      patch[`${flagsPath}.${preset.id}`] = { ...preset };
    } else {
      patch[`${flagsPath}.-=${preset.id}`] = null;
    }
  }
  return patch;
}

// Labels para notificación
const addedLabels = Object.entries(BAR_PRESETS)
  .filter(([key]) => visibility[key]?.value)
  .map(([, preset]) => preset.label);

// --- Aplicar ---
if (singleTokenDoc !== undefined) {
  // Modo manual: solo este token + prototipo
  await Promise.all([
    singleTokenDoc.update(buildPatch("flags.barbrawl.resourceBars")),
    currentActor.update(buildPatch("prototypeToken.flags.barbrawl.resourceBars")),
  ]);
} else {
  // Modo ficha: todos los tokens del actor en todas las escenas + prototipo
  const allTokenDocs = game.scenes.contents.flatMap(scene =>
    scene.tokens.contents.filter(t => t.actorId === currentActor.id)
  );
  await Promise.all([
    ...allTokenDocs.map(td => td.update(buildPatch("flags.barbrawl.resourceBars"))),
    currentActor.update(buildPatch("prototypeToken.flags.barbrawl.resourceBars")),
  ]);
}

// --- Notificación ---
if (addedLabels.length > 0) {
  ui.notifications.info(`Barras de ${currentActor.name}: ${addedLabels.join(", ")}`);
} else {
  ui.notifications.info(`${currentActor.name}: sin recursos visibles → barras guote eliminadas.`);
}
