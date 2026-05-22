import { damageCalculatorMacro } from './functions/damageCalculatorMacro.js';
import { createCharacterFromTemplateMacro } from './functions/createCharacterFromTemplateMacro.js';
import { createMasaMacro } from './functions/createMasaMacro.js';
import { importFromPdfMacro } from './functions/importFromPdf/importFromPdfMacro.js';
import { addDesarmadoMacro } from './functions/addDesarmadoMacro.js';
export const ABFMacros = {
    damageCalculator: damageCalculatorMacro,
    createCharacterFromTemplate: createCharacterFromTemplateMacro,
    createMasa: createMasaMacro,
    importFromPdf: importFromPdfMacro,
    addDesarmado: addDesarmadoMacro
};
