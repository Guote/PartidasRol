import { renderTemplates } from "../../utils/renderTemplates.js";
import { Templates } from "../../utils/constants.js";
import { ABFDialogs } from "../../dialogs/ABFDialogs.js";

/**
 * Calculate LP per member (rounded down to nearest 50)
 */
const calculateLpPerMember = (baseLifePoints) => {
  return Math.floor(baseLifePoints / 50) * 50;
};

/**
 * Calculate number of living members based on current LP
 */
const calculateLivingMembers = (currentLp, lpPerMember, totalMembers) => {
  if (lpPerMember <= 0) return totalMembers;
  return Math.ceil(currentLp / lpPerMember);
};

const openDialog = async (actorName) => {
  const typedGame = game;

  const content = `
    <form>
      <div class='form-group'>
        <div class='common-titled-input'>
          <p class='label'>${typedGame.i18n.localize("anima.macros.createMasa.dialog.baseActor")}</p>
          <div class='input-container'>
            <input type='text' class='input' value='${actorName}' disabled />
          </div>
        </div>
        <div class='common-titled-input'>
          <p class='label'>${typedGame.i18n.localize("anima.macros.createMasa.dialog.memberCount")}</p>
          <div class='input-container'>
            <input name='member-count' type='number' class='input' value='5' min='2' />
          </div>
        </div>
      </div>
    </form>
  `;

  const [iconHTML] = await renderTemplates({
    name: Templates.Dialog.Icons.Accept,
  });

  return new Promise((resolve) => {
    new Dialog({
      title: typedGame.i18n.localize("anima.macros.createMasa.dialog.title"),
      content: content,
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

export const createMasaMacro = async () => {
  const typedGame = game;

  // Check if user is GM
  if (!typedGame.user?.isGM) {
    ABFDialogs.prompt(
      typedGame.i18n.localize("anima.macros.createMasa.errors.gmOnly"),
    );
    return;
  }

  // Get selected token's actor or controlled actor
  const selectedToken = canvas.tokens?.controlled?.[0];
  const sourceActor = selectedToken?.actor || typedGame.user?.character;

  if (!sourceActor) {
    ABFDialogs.prompt(
      typedGame.i18n.localize("anima.macros.createMasa.errors.noActorSelected"),
    );
    return;
  }

  const results = await openDialog(sourceActor.name);
  const memberCount = parseInt(results["member-count"]) || 5;

  if (memberCount < 2) {
    ABFDialogs.prompt(
      typedGame.i18n.localize("anima.macros.createMasa.errors.minimumMembers"),
    );
    return;
  }

  // Get base LP from source actor
  const baseLifePoints =
    sourceActor.system.characteristics.secondaries.lifePoints.max;
  const lpPerMember = calculateLpPerMember(baseLifePoints);
  const totalMasaLp = lpPerMember * memberCount;

  // Create new actor data from source
  const sourceData = sourceActor.toObject();

  // Modify for masa
  const masaName = `${sourceActor.name} x${memberCount}`;
  sourceData.name = masaName;
  delete sourceData._id; // Remove ID so a new one is generated

  // Set masa-specific flags
  sourceData.flags = sourceData.flags || {};
  sourceData.flags.animabf = sourceData.flags.animabf || {};
  sourceData.flags.animabf.masa = {
    isMasa: true,
    totalMembers: memberCount,
    lpPerMember: lpPerMember,
    livingMembers: memberCount,
  };

  // Update life points
  sourceData.system.characteristics.secondaries.lifePoints.max = totalMasaLp;
  sourceData.system.characteristics.secondaries.lifePoints.value = totalMasaLp;

  // Set defense type to mass
  sourceData.system.general.settings.defenseType = { value: "mass" };

  try {
    // Create the masa actor
    const masaActor = await Actor.create(sourceData);

    if (masaActor) {
      // Notify success
      ui.notifications.info(
        typedGame.i18n.format("anima.macros.createMasa.success", {
          name: masaName,
          members: memberCount,
          totalLp: totalMasaLp,
        }),
      );

      // Open the actor sheet
      masaActor.sheet?.render(true);
    }
  } catch (error) {
    console.error("Error creating masa:", error);
    ABFDialogs.prompt(
      typedGame.i18n.localize("anima.macros.createMasa.errors.creationFailed"),
    );
  }
};
