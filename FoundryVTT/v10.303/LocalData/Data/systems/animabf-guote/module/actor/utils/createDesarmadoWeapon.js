import { INITIAL_WEAPON_DATA } from "../../types/combat/WeaponItemConfig.js";

export const createDesarmadoWeapon = async (actor) => {
  // Skip if actor already has a Desarmado weapon
  const alreadyHas = actor.items.some(
    i => i.type === "weapon" &&
      (i.system?.isDefault?.value || i.name.toLowerCase() === "desarmado" || i.name.toLowerCase() === "unarmed")
  );
  if (alreadyHas) return;

  const pack = game.packs.get("animabf-guote.weapons");
  if (pack) {
    const weapons = await pack.getDocuments();
    const desarmado = weapons.find(
      w => w.name.toLowerCase() === "desarmado" || w.name.toLowerCase() === "unarmed"
    );
    if (desarmado) {
      const data = desarmado.toObject();
      data.system = {
        ...data.system,
        equipped: { value: true },
        isShown: { value: true },
        isDefault: { value: true },
      };
      const created = await actor.createEmbeddedDocuments("Item", [data]);
      console.log(`AnimaBF | Desarmado added to "${actor.name}" from compendium`, created);
      return;
    }
    console.warn("createDesarmadoWeapon: 'Desarmado' not found in weapons compendium — creating fallback.");
  } else {
    console.warn("createDesarmadoWeapon: weapons compendium 'animabf-guote.weapons' not found — creating fallback.");
  }

  // Fallback: create a minimal Desarmado weapon from scratch
  const created = await actor.createEmbeddedDocuments("Item", [{
    name: "Desarmado",
    type: "weapon",
    img: "icons/skills/melee/unarmed-punch-fist.webp",
    system: {
      ...INITIAL_WEAPON_DATA,
      initiative: {
        base: { value: 20 },
        final: { value: 20 },
      },
      equipped: { value: true },
      isShown: { value: true },
      isDefault: { value: true },
    },
  }]);
  console.log(`AnimaBF | Desarmado fallback added to "${actor.name}"`, created);
};
