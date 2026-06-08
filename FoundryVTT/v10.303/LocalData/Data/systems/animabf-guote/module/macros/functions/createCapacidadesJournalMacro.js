const JOURNAL_NAME = 'Capacidades Físicas';

const periodLabel = p => ({ d: 'día', h: 'hora', m: 'min' }[p] ?? p);

const tmRows = (() => {
  const zenTable = [50, 100, 200, 500, 1000, 2000, 5000]; // TM 14–20
  const metersForTm = tm => {
    if (tm <= 10) return tm;
    if (tm <= 13) return 10 + (tm - 10) * 5;
    return zenTable[Math.min(tm - 14, zenTable.length - 1)];
  };
  return Array.from({ length: 20 }, (_, i) => i + 1).map(tm => {
    const m = metersForTm(tm);
    return `<tr><td>${tm}</td><td>${m} m</td><td>${m * 2} m</td><td>${m * 3} m</td></tr>`;
  }).join('');
})();

const ipRows = (() => {
  const weight = i => {
    if (i <= 0) return 0;
    if (i <= 10) return i * 5;
    if (i === 11) return 75;
    if (i === 12) return 100;
    if (i === 13) return 125;
    return weight(i - 1) * 2;
  };
  return Array.from({ length: 21 }, (_, i) => {
    const w = weight(i);
    const fmt = v => v >= 1000 ? `${v/1000} t` : `${v} kg`;
    return `<tr><td>${i}</td><td>${fmt(w)}</td><td>${fmt(w*2)}</td><td>${fmt(w*4)}</td></tr>`;
  }).join('');
})();

const regenData = [
  [0,  0,'d', 0,'d', ''],
  [1,  0,'d', 0,'d', ''],
  [2,  0,'d', 0,'d', ''],
  [3,  0,'d', 0,'d', ''],
  [4,  15,'d', -5,'d', ''],
  [5,  20,'d', -10,'d', ''],
  [6,  25,'d', -10,'d', ''],
  [7,  30,'d', -15,'d', ''],
  [8,  30,'d', -15,'d', ''],
  [9,  35,'d', -15,'d', ''],
  [10, 40,'d', -20,'d', ''],
  [11, 2,'h', -15,'d', 'Sin cicatrices, sin sangrado'],
  [12, 5,'h', -20,'d', 'Sin cicatrices, sin sangrado'],
  [13, 10,'h', -20,'d', 'Sin cicatrices, sin sangrado'],
  [14, 2,'m', -1,'h',  'Sin cicatrices; muñones se regeneran'],
  [15, 5,'m', -2,'h',  'Sin cicatrices; muñones se regeneran'],
  [16, 10,'m', -5,'h', 'Sin cicatrices; muñones; +20 ElVylM'],
  [17, 20,'m', -10,'h','Sin cicatrices; muñones; +40 ElVylM'],
  [18, 50,'m', -25,'h','Sin cicatrices; muñones; +100 ElVylM'],
  [19, 100,'m',-50,'h','Sin cicatrices; muñones; +200 ElVylM'],
  [20, 200,'m',-100,'h','Sin cicatrices; muñones; +400 ElVylM'],
];

const regenRows = regenData.map(([rt, rv, rp, nv, np, esp]) =>
  `<tr><td>${rt}</td><td>${rv}/${periodLabel(rp)}</td><td>${nv}/${periodLabel(np)}</td><td>${esp}</td></tr>`
).join('');

const html = `
<h2>TM — Tipo de Movimiento</h2>
<p><em>TM final = AGI + modificadores (humano: AGI máx. 10; inhumano: máx. 13; zen: sin límite)</em></p>
<table>
<thead><tr><th>AGI / TM</th><th>Pasiva (×1)</th><th>Activa (×2)</th><th>Sprint (×3)</th></tr></thead>
<tbody>${tmRows}</tbody>
</table>
<p><em>Correr = mov. del TM−2. Nadar = mov. cuesta ×2. Sprint requiere Atletismo.</em></p>
<p><em>±1 TM por categoría de tamaño diferente de Medio.</em></p>

<h2>IP — Índice de Peso</h2>
<p><em>IP final = FUE + modificadores (mismos límites que TM según humanidad)</em></p>
<table>
<thead><tr><th>IP</th><th>Pasiva</th><th>Media (×2)</th><th>Pesada (×4)</th></tr></thead>
<tbody>${ipRows}</tbody>
</table>
<p><em>±1 IP por categoría de tamaño diferente de Medio.</em></p>
<p><em>Carga media: movimiento cuesta ×2, parálisis −20. Carga pesada: movimiento cuesta ×10, parálisis −80.</em></p>

<h2>Regeneración</h2>
<p><em>RT = CON (mismos límites que TM según humanidad). RT base = CON sin modificadores.</em></p>
<table>
<thead><tr><th>RT (CON)</th><th>Descanso</th><th>Negativo</th><th>Especial</th></tr></thead>
<tbody>${regenRows}</tbody>
</table>
<p><em>Los efectos mágicos que dan regeneración aumentan el ritmo: día → hora → minuto → asalto.</em></p>
<p><em>Multiplicar valores por el múltiplo de acumulación de la criatura.</em></p>
`.trim();

export const createCapacidadesJournalMacro = async () => {
  if (!game.user?.isGM) {
    ui.notifications.warn('Solo el GM puede crear entradas de diario.');
    return;
  }

  const existing = game.journal.find(j => j.name === JOURNAL_NAME);
  if (existing) {
    ui.notifications.info(`Ya existe el diario "${JOURNAL_NAME}". Ábrelo para editarlo.`);
    existing.sheet.render(true);
    return;
  }

  const entry = await JournalEntry.create({
    name: JOURNAL_NAME,
    pages: [{
      name: 'TM · IP · Regeneración',
      type: 'text',
      text: { content: html, format: 1 },
    }],
  });

  ui.notifications.info(`Diario "${JOURNAL_NAME}" creado.`);
  entry.sheet.render(true);
};
