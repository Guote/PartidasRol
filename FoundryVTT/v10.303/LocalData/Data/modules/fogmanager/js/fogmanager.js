import '../classes/MaskLayer.js';

//import FogManagerMigrations from '../classes/FogManagerMigrations.js';
import config from './config.js';

import {  fogManagerLog } from "../js/helpers.js";

Hooks.once('init', () => {
  // eslint-disable-next-line no-console
  fogManagerLog.log('Initializing fogmanager', true);

  // Register global module settings
  config.forEach((cfg) => {
    game.settings.register('fogmanager', cfg.name, cfg.data);
  });
});
