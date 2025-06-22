import { AdvantageItemConfig } from "../../../types/general/AdvantageItemConfig.js";
import { ArsMagnusItemConfig } from "../../../types/domine/ArsMagnusItemConfig.js";
import { CombatSpecialSkillItemConfig } from "../../../types/combat/CombatSpecialSkillItemConfig.js";
import { CombatTableItemConfig } from "../../../types/combat/CombatTableItemConfig.js";
import { ContactItemConfig } from "../../../types/general/ContactItemConfig.js";
import { CreatureItemConfig } from "../../../types/domine/CreatureItemConfig.js";
import { DisadvantageItemConfig } from "../../../types/general/DisadvantageItemConfig.js";
import { SpellItemConfig } from "../../../types/mystic/SpellItemConfig.js";
import { ElanItemConfig } from "../../../types/general/ElanItemConfig.js";
import { InnatePsychicPowerItemConfig } from "../../../types/psychic/InnatePsychicPowerItemConfig.js";
import { KiSkillItemConfig } from "../../../types/domine/KiSkillItemConfig.js";
import { LanguageItemConfig } from "../../../types/general/LanguageItemConfig.js";
import { LevelItemConfig } from "../../../types/general/LevelItemConfig.js";
import { MartialArtItemConfig } from "../../../types/domine/MartialArtItemConfig.js";
import { MentalPatternItemConfig } from "../../../types/psychic/MentalPatternItemConfig.js";
import { MetamagicItemConfig } from "../../../types/mystic/MetamagicItemConfig.js";
import { NemesisSkillItemConfig } from "../../../types/domine/NemesisSkillItemConfig.js";
import { NoteItemConfig } from "../../../types/general/NoteItemConfig.js";
import { PsychicDisciplineItemConfig } from "../../../types/psychic/PsychicDisciplineItemConfig.js";
import { PsychicPowerItemConfig } from "../../../types/psychic/PsychicPowerItemConfig.js";
import { SecondarySpecialSkillItemConfig } from "../../../types/secondaries/SecondarySpecialSkillItemConfig.js";
import { SelectedSpellItemConfig } from "../../../types/mystic/SelectedSpellItemConfig.js";
import { ActViaItemConfig } from "../../../types/mystic/ActViaItemConfig.js";
import { InnateMagicViaItemConfig } from "../../../types/mystic/InnateMagicViaItemConfig.js";
import { PreparedSpellItemConfig } from "../../../types/mystic/PreparedSpellItemConfig.js";
import { SpecialSkillItemConfig } from "../../../types/domine/SpecialSkillItemConfig.js";
import { SpellMaintenanceItemConfig } from "../../../types/mystic/SpellMaintenanceItemConfig.js";
import { SummonItemConfig } from "../../../types/mystic/SummonItemConfig.js";
import { TechniqueItemConfig } from "../../../types/domine/TechniqueItemConfig.js";
import { TitleItemConfig } from "../../../types/general/TitleItemConfig.js";
import { WeaponItemConfig } from "../../../types/combat/WeaponItemConfig.js";
import { AmmoItemConfig } from "../../../types/combat/AmmoItemConfig.js";
import { ElanPowerItemConfig } from "../../../types/general/ElanPowerItemConfig.js";
import { ArmorItemConfig } from "../../../types/combat/ArmorItemConfig.js";
import { SupernaturalShieldItemConfig } from "../../../types/combat/SupernaturalShieldItemConfig.js";
import { InventoryItemItemConfig } from "../../../types/general/InventoryItemItemConfig.js";
const INTERNAL_ITEM_CONFIGURATIONS = {
  [ArsMagnusItemConfig.type]: ArsMagnusItemConfig,
  [CombatSpecialSkillItemConfig.type]: CombatSpecialSkillItemConfig,
  [CombatTableItemConfig.type]: CombatTableItemConfig,
  [ContactItemConfig.type]: ContactItemConfig,
  [CreatureItemConfig.type]: CreatureItemConfig,
  [ElanItemConfig.type]: ElanItemConfig,
  [ElanPowerItemConfig.type]: ElanPowerItemConfig,
  [InnatePsychicPowerItemConfig.type]: InnatePsychicPowerItemConfig,
  [KiSkillItemConfig.type]: KiSkillItemConfig,
  [LanguageItemConfig.type]: LanguageItemConfig,
  [LevelItemConfig.type]: LevelItemConfig,
  [MartialArtItemConfig.type]: MartialArtItemConfig,
  [MetamagicItemConfig.type]: MetamagicItemConfig,
  [NemesisSkillItemConfig.type]: NemesisSkillItemConfig,
  [SecondarySpecialSkillItemConfig.type]: SecondarySpecialSkillItemConfig,
  [SelectedSpellItemConfig.type]: SelectedSpellItemConfig,
  [SpecialSkillItemConfig.type]: SpecialSkillItemConfig,
  [SpellMaintenanceItemConfig.type]: SpellMaintenanceItemConfig,
  [PreparedSpellItemConfig.type]: PreparedSpellItemConfig,
  [ActViaItemConfig.type]: ActViaItemConfig,
  [InnateMagicViaItemConfig.type]: InnateMagicViaItemConfig,
  [SummonItemConfig.type]: SummonItemConfig,
  [TitleItemConfig.type]: TitleItemConfig,
  [InventoryItemItemConfig.type]: InventoryItemItemConfig
};
const ITEM_CONFIGURATIONS = {
  [AmmoItemConfig.type]: AmmoItemConfig,
  [AdvantageItemConfig.type]: AdvantageItemConfig,
  [ArmorItemConfig.type]: ArmorItemConfig,
  [SupernaturalShieldItemConfig.type]: SupernaturalShieldItemConfig,
  [DisadvantageItemConfig.type]: DisadvantageItemConfig,
  [SpellItemConfig.type]: SpellItemConfig,
  [MentalPatternItemConfig.type]: MentalPatternItemConfig,
  [NoteItemConfig.type]: NoteItemConfig,
  [PsychicDisciplineItemConfig.type]: PsychicDisciplineItemConfig,
  [PsychicPowerItemConfig.type]: PsychicPowerItemConfig,
  [TechniqueItemConfig.type]: TechniqueItemConfig,
  [WeaponItemConfig.type]: WeaponItemConfig
};
const ALL_ITEM_CONFIGURATIONS = {
  ...ITEM_CONFIGURATIONS,
  ...INTERNAL_ITEM_CONFIGURATIONS
};
export {
  ALL_ITEM_CONFIGURATIONS,
  INTERNAL_ITEM_CONFIGURATIONS,
  ITEM_CONFIGURATIONS
};
