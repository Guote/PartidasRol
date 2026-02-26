/**
 * Import Incarnation from Text Macro
 * Parses pasted incarnation text (from Anima Beyond Fantasy books) and creates an incarnation item.
 */

import { INITIAL_INCARNATION_DATA } from '../../types/mystic/IncarnationItemConfig.js';

/**
 * Parse numeric value from text like "Nivel: 3" or "Dificultad: 120"
 */
function extractNumeric(text, ...patterns) {
    for (const pattern of patterns) {
        const re = new RegExp(pattern + '\\s*:?\\s*([-+]?\\d+)', 'i');
        const m = text.match(re);
        if (m) return parseInt(m[1], 10);
    }
    return 0;
}

/**
 * Parse an affinity section block into structured data
 */
function parseAffinityBlock(text) {
    const level = extractNumeric(text, 'Nivel', 'Niv', 'Level');
    const difficulty = extractNumeric(text, 'Dificultad', 'Dif', 'Difficulty');
    const zeonCost = extractNumeric(text, 'Ze[oó]n', 'Coste de Ze[oó]n', 'Zeon Cost');
    const ha = extractNumeric(text, 'Habilidad de Ataque', 'HA', 'Attack Ability');
    const hd = extractNumeric(text, 'Habilidad de (?:Esquiva|Defensa)', 'HD', 'Defense Ability', 'Dodge Ability');
    const turno = extractNumeric(text, 'Turno', 'Turn');

    // Remove parsed stats from the content to keep only descriptive text
    let content = text;
    const removePatterns = [
        /Nivel\s*:?\s*[-+]?\d+/i,
        /Dificultad\s*:?\s*[-+]?\d+/i,
        /(?:Coste de )?Ze[oó]n\s*:?\s*[-+]?\d+/i,
        /Habilidad de Ataque\s*:?\s*[-+]?\d+/i,
        /Habilidad de (?:Esquiva|Defensa)\s*:?\s*[-+]?\d+/i,
        /Turno\s*:?\s*[-+]?\d+/i,
        /\bHA\s*:?\s*[-+]?\d+/,
        /\bHD\s*:?\s*[-+]?\d+/,
    ];
    for (const re of removePatterns) {
        content = content.replace(re, '');
    }
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return {
        level: { value: level },
        difficulty: { value: difficulty },
        zeonCost: { value: zeonCost },
        ha: { value: ha },
        hd: { value: hd },
        turno: { value: turno },
        content: { value: content }
    };
}

/**
 * Parse the full incarnation text
 */
function parseIncarnationText(rawText) {
    const text = rawText.trim();
    const lines = text.split('\n');

    // Extract name from first line (or text before first section header)
    let name = lines[0]?.trim() || 'Encarnación';

    // Section headers
    const sectionHeaders = [
        { key: 'invocationModifiers', patterns: ['Modificadores de Invocaci[oó]n', 'Invocation Modifiers'] },
        { key: 'genericPowers', patterns: ['Poderes Gen[eé]ricos', 'Generic Powers'] },
        { key: 'timeModifiers', patterns: ['Modificadores? de Tiempo', 'Time Modifiers'] },
        { key: 'menor', patterns: ['Afinidad Menor', 'Minor Affinity'] },
        { key: 'intermedia', patterns: ['Afinidad Intermedia', 'Intermediate Affinity'] },
        { key: 'real', patterns: ['Afinidad Real', 'Real Affinity'] },
    ];

    // Build regex to split the text at section headers
    const allPatterns = sectionHeaders.flatMap(s => s.patterns);
    const splitRegex = new RegExp(`(${allPatterns.join('|')})`, 'i');
    const parts = text.split(splitRegex);

    // Map sections by key
    const sections = {};
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        for (const section of sectionHeaders) {
            for (const pattern of section.patterns) {
                if (new RegExp(`^${pattern}$`, 'i').test(part)) {
                    sections[section.key] = (parts[i + 1] || '').trim();
                    break;
                }
            }
        }
    }

    // If name looks like a section header, try to get it from before the first match
    for (const section of sectionHeaders) {
        for (const pattern of section.patterns) {
            if (new RegExp(pattern, 'i').test(name)) {
                name = 'Encarnación';
                break;
            }
        }
    }

    // If we have content before the first section, it may contain the name
    const firstSectionIdx = text.search(splitRegex);
    if (firstSectionIdx > 0) {
        const preamble = text.substring(0, firstSectionIdx).trim();
        if (preamble) {
            name = preamble.split('\n')[0].trim();
        }
    }

    return {
        name,
        invocationModifiers: sections.invocationModifiers || '',
        genericPowers: sections.genericPowers || '',
        timeModifiers: sections.timeModifiers || '',
        menor: sections.menor ? parseAffinityBlock(sections.menor) : INITIAL_INCARNATION_DATA.affinities.menor,
        intermedia: sections.intermedia ? parseAffinityBlock(sections.intermedia) : INITIAL_INCARNATION_DATA.affinities.intermedia,
        real: sections.real ? parseAffinityBlock(sections.real) : INITIAL_INCARNATION_DATA.affinities.real,
    };
}

/**
 * Small input helper
 */
const numInput = (name, value, width = 48) =>
    `<input type="number" name="${name}" value="${value}" style="width:${width}px;text-align:center;">`;

/**
 * Build the preview/edit HTML for a single affinity
 */
function buildAffinityHtml(key, label, color, data) {
    return `
    <div style="background:${color};color:#fff;padding:2px 6px;margin:6px 0 2px;border-radius:3px;font-weight:bold;font-size:11px;">${label}</div>
    <div style="display:flex;gap:6px;margin:2px 0;">
      <label>Niv ${numInput(`${key}.level`, data.level?.value || 0)}</label>
      <label>Dif ${numInput(`${key}.difficulty`, data.difficulty?.value || 0)}</label>
      <label>Zeón ${numInput(`${key}.zeonCost`, data.zeonCost?.value || 0)}</label>
    </div>
    <div style="display:flex;gap:6px;margin:2px 0;">
      <label>HA ${numInput(`${key}.ha`, data.ha?.value || 0)}</label>
      <label>HD ${numInput(`${key}.hd`, data.hd?.value || 0)}</label>
      <label>Turno ${numInput(`${key}.turno`, data.turno?.value || 0)}</label>
    </div>
    <textarea name="${key}.content" style="width:100%;height:60px;font-size:11px;font-family:inherit;">${data.content?.value || ''}</textarea>
    `;
}

/**
 * Open import dialog with textarea for pasting text
 */
function openImportDialog() {
    const i18n = game.i18n;
    return new Promise((resolve) => {
        new Dialog({
            title: i18n.localize('anima.ui.mystic.incarnation.import'),
            content: `
                <form>
                    <p style="margin-bottom:8px;">${i18n.localize('anima.ui.mystic.incarnation.importInstructions')}</p>
                    <textarea name="incarnation-text" style="width:100%;height:300px;font-family:monospace;font-size:11px;"></textarea>
                </form>
            `,
            buttons: {
                import: {
                    icon: '<i class="fas fa-file-import"></i>',
                    label: i18n.localize('anima.ui.mystic.incarnation.import'),
                    callback: (html) => resolve(html.find('[name="incarnation-text"]').val()),
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: i18n.localize('anima.dialogs.cancel'),
                    callback: () => resolve(null),
                },
            },
            default: 'import',
        }).render(true);
    });
}

/**
 * Open preview/edit dialog with parsed data
 */
function openPreviewDialog(parsed) {
    const i18n = game.i18n;
    return new Promise((resolve) => {
        const content = `
            <form style="font-size:12px;">
                <div style="margin-bottom:6px;">
                    <label><b>${i18n.localize('anima.ui.mystic.incarnation.name')}</b></label>
                    <input type="text" name="name" value="${parsed.name}" style="width:100%;">
                </div>
                <div style="margin-bottom:4px;">
                    <label><b>${i18n.localize('anima.ui.mystic.incarnation.invocationModifiers')}</b></label>
                    <textarea name="invocationModifiers" style="width:100%;height:50px;font-size:11px;">${parsed.invocationModifiers}</textarea>
                </div>
                <div style="margin-bottom:4px;">
                    <label><b>${i18n.localize('anima.ui.mystic.incarnation.genericPowers')}</b></label>
                    <textarea name="genericPowers" style="width:100%;height:50px;font-size:11px;">${parsed.genericPowers}</textarea>
                </div>
                <div style="margin-bottom:4px;">
                    <label><b>${i18n.localize('anima.ui.mystic.incarnation.timeModifiers')}</b></label>
                    <textarea name="timeModifiers" style="width:100%;height:40px;font-size:11px;">${parsed.timeModifiers}</textarea>
                </div>
                ${buildAffinityHtml('menor', i18n.localize('anima.ui.mystic.incarnation.affinity.menor'), '#6b8e23', parsed.menor)}
                ${buildAffinityHtml('intermedia', i18n.localize('anima.ui.mystic.incarnation.affinity.intermedia'), '#cd853f', parsed.intermedia)}
                ${buildAffinityHtml('real', i18n.localize('anima.ui.mystic.incarnation.affinity.real'), '#8b0000', parsed.real)}
            </form>
        `;

        new Dialog({
            title: `${i18n.localize('anima.ui.mystic.incarnation.import')}: ${parsed.name}`,
            content,
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-check"></i>',
                    label: i18n.localize('anima.dialogs.accept'),
                    callback: (html) => {
                        const form = html[0].querySelector('form');
                        const fd = new FormDataExtended(form).object;
                        resolve({
                            name: fd.name,
                            invocationModifiers: fd.invocationModifiers,
                            genericPowers: fd.genericPowers,
                            timeModifiers: fd.timeModifiers,
                            menor: {
                                level: { value: parseInt(fd['menor.level']) || 0 },
                                difficulty: { value: parseInt(fd['menor.difficulty']) || 0 },
                                zeonCost: { value: parseInt(fd['menor.zeonCost']) || 0 },
                                ha: { value: parseInt(fd['menor.ha']) || 0 },
                                hd: { value: parseInt(fd['menor.hd']) || 0 },
                                turno: { value: parseInt(fd['menor.turno']) || 0 },
                                content: { value: fd['menor.content'] || '' }
                            },
                            intermedia: {
                                level: { value: parseInt(fd['intermedia.level']) || 0 },
                                difficulty: { value: parseInt(fd['intermedia.difficulty']) || 0 },
                                zeonCost: { value: parseInt(fd['intermedia.zeonCost']) || 0 },
                                ha: { value: parseInt(fd['intermedia.ha']) || 0 },
                                hd: { value: parseInt(fd['intermedia.hd']) || 0 },
                                turno: { value: parseInt(fd['intermedia.turno']) || 0 },
                                content: { value: fd['intermedia.content'] || '' }
                            },
                            real: {
                                level: { value: parseInt(fd['real.level']) || 0 },
                                difficulty: { value: parseInt(fd['real.difficulty']) || 0 },
                                zeonCost: { value: parseInt(fd['real.zeonCost']) || 0 },
                                ha: { value: parseInt(fd['real.ha']) || 0 },
                                hd: { value: parseInt(fd['real.hd']) || 0 },
                                turno: { value: parseInt(fd['real.turno']) || 0 },
                                content: { value: fd['real.content'] || '' }
                            }
                        });
                    },
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: i18n.localize('anima.dialogs.cancel'),
                    callback: () => resolve(null),
                },
            },
            default: 'confirm',
            render: (html) => {
                // Make dialog wider for comfortable editing
                html.closest('.dialog').css('width', '550px');
            }
        }).render(true);
    });
}

/**
 * Main import function - call with the target actor
 * @param {Actor} actor - The actor to create the incarnation on
 */
export async function importIncarnationMacro(actor) {
    if (!actor) {
        ui.notifications.warn(game.i18n.localize('anima.notifications.noActorSelected'));
        return;
    }

    // Step 1: Get raw text
    const rawText = await openImportDialog();
    if (!rawText) return;

    // Step 2: Parse
    const parsed = parseIncarnationText(rawText);

    // Step 3: Preview/edit
    const confirmed = await openPreviewDialog(parsed);
    if (!confirmed) return;

    // Step 4: Create incarnation item on the actor
    const itemData = {
        name: confirmed.name,
        type: 'incarnation',
        system: {
            description: { value: '' },
            invocationModifiers: { value: confirmed.invocationModifiers },
            genericPowers: { value: confirmed.genericPowers },
            timeModifiers: { value: confirmed.timeModifiers },
            affinities: {
                menor: confirmed.menor,
                intermedia: confirmed.intermedia,
                real: confirmed.real
            }
        }
    };

    await actor.createEmbeddedDocuments('Item', [itemData]);
    ui.notifications.info(`${game.i18n.localize('anima.ui.mystic.incarnation.title')}: ${confirmed.name}`);
}
