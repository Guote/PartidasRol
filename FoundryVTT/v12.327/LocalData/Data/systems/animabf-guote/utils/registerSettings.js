const ABFSettingsKeys = {
  AUTO_ACCEPT_COMBAT_REQUESTS: "AUTO_ACCEPT_COMBAT_REQUESTS",
  ROUND_DAMAGE_IN_MULTIPLES_OF_5: "ROUND_DAMAGE_IN_MULTIPLES_OF_5",
  SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT: "SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT",
  USE_DAMAGE_TABLE: "USE_DAMAGE_TABLE",
  DEVELOP_MODE: "DEVELOP_MODE",
  AUTOMATE_COMBAT_DISTANCE: "AUTOMATE_COMBAT_DISTANCE",
  MACRO_PREFIX_ATTACK: "MACRO_PREFIX_ATTACK",
  MACRO_ATTACK_DEFAULT: "MACRO_ATTACK_DEFAULT",
  MACRO_PROJECTILE_DEFAULT: "MACRO_PROJECTILE_DEFAULT",
  MACRO_SHIELD_DEFAULT: "MACRO_SHIELD_DEFAULT",
  MACRO_MISS_ATTACK_VALUE: "MACRO_MISS_ATTACK_VALUE",
  SYSTEM_MIGRATION_VERSION: "SYSTEM_MIGRATION_VERSION"
};
const registerSettings = () => {
  game.settings.register("animabf-guote", ABFSettingsKeys.AUTO_ACCEPT_COMBAT_REQUESTS, {
    name: "anima.ui.systemSettings.autoAcceptCombatRequests.title",
    hint: "anima.ui.systemSettings.autoAcceptCombatRequests.hint.title",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.ROUND_DAMAGE_IN_MULTIPLES_OF_5, {
    name: "anima.ui.systemSettings.roundDamageInMultiplesOf5.title",
    hint: "anima.ui.systemSettings.roundDamageInMultiplesOf5.hint.title",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });
  game.settings.register(
    "animabf-guote",
    ABFSettingsKeys.SEND_ROLL_MESSAGES_ON_COMBAT_BY_DEFAULT,
    {
      name: "anima.ui.systemSettings.sendRollMessagesOnCombatByDefault.title",
      hint: "anima.ui.systemSettings.sendRollMessagesOnCombatByDefault.hint.title",
      scope: "world",
      config: true,
      default: true,
      type: Boolean
    }
  );
  game.settings.register("animabf-guote", ABFSettingsKeys.USE_DAMAGE_TABLE, {
    name: "anima.ui.systemSettings.useCombatTable.title",
    hint: "anima.ui.systemSettings.useCombatTable.hint.title",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.AUTOMATE_COMBAT_DISTANCE, {
    name: "anima.ui.systemSettings.useDistanceAutomation.title",
    hint: "anima.ui.systemSettings.useDistanceAutomation.hint.title",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.MACRO_PREFIX_ATTACK, {
    name: "anima.ui.systemSettings.prefixAttackMacro.title",
    hint: "anima.ui.systemSettings.prefixAttackMacro.hint.title",
    scope: "world",
    config: true,
    default: "",
    type: String
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.MACRO_ATTACK_DEFAULT, {
    name: "anima.ui.systemSettings.defaultAttackMacro.title",
    hint: "anima.ui.systemSettings.defaultAttackMacro.hint.title",
    scope: "world",
    config: true,
    default: "Default Attack Macro",
    type: String
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.MACRO_PROJECTILE_DEFAULT, {
    name: "anima.ui.systemSettings.defaultProjectileMacro.title",
    hint: "anima.ui.systemSettings.defaultProjectileMacro.hint.title",
    scope: "world",
    config: true,
    default: "Atk Projectil Flecha",
    type: String
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.MACRO_SHIELD_DEFAULT, {
    name: "anima.ui.systemSettings.defaultShieldMacro.title",
    hint: "anima.ui.systemSettings.defaultShieldMacro.hint.title",
    scope: "world",
    config: true,
    default: "Default Shield Macro",
    type: String
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.MACRO_MISS_ATTACK_VALUE, {
    name: "anima.ui.systemSettings.missValueAttackMacro.title",
    hint: "anima.ui.systemSettings.missValueAttackMacro.hint.title",
    scope: "world",
    config: true,
    default: 80,
    type: Number
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.DEVELOP_MODE, {
    name: "Develop mode",
    hint: "Activate certain access to information. Only for developers",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });
  game.settings.register("animabf-guote", ABFSettingsKeys.SYSTEM_MIGRATION_VERSION, {
    config: false,
    scope: "world",
    type: Number,
    default: 0
  });
};
export {
  ABFSettingsKeys,
  registerSettings
};
