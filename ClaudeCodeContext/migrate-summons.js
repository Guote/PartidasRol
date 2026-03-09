const fs = require('fs');
const path = 'c:/z - Git/PartidasRol/FoundryVTT/v10.303/LocalData/Data/worlds/Gaia-APS-v10/packs/invocaciones-animabf-guote.db';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

const out = lines.map(line => {
  const item = JSON.parse(line);

  const isWeapon = item.type === 'weapon';
  const isArmor  = item.type === 'armor';
  if (!isWeapon && !isArmor) return line;

  const s = item.system;
  let newSystem;

  if (isArmor) {
    // Build AT summary string from armor fields
    const atTypes = ['cut','impact','thrust','heat','electricity','cold','energy'];
    const atStr = atTypes.map(t => {
      const val = (s[t] && (s[t].base ? s[t].base.value : s[t].value)) || 0;
      return t.charAt(0).toUpperCase() + t.slice(1) + ' ' + val;
    }).join(', ');
    newSystem = {
      summonDif:   { value: 0 },
      zeonCost:    { value: 0 },
      baseAtk:     { value: 0 },
      baseDef:     { value: 0 },
      damage:      { value: 0 },
      critic:      { value: 'impact' },
      turno:       { value: 20 },
      special:     { value: '' },
      bonusAtk:    { value: 0 },
      bonusDef:    { value: 0 },
      bonusDamage: { value: 0 },
      bonusOther:  { value: 'AT: ' + atStr }
    };
  } else {
    newSystem = {
      summonDif:   { value: 0 },
      zeonCost:    { value: 0 },
      baseAtk:     { value: (s.baseAtk && s.baseAtk.value) || (s.attack && s.attack.special && s.attack.special.value) || 0 },
      baseDef:     { value: (s.baseDef && s.baseDef.value) || (s.block && s.block.special && s.block.special.value) || 0 },
      damage:      { value: (s.damage && s.damage.base && s.damage.base.value) || 0 },
      critic:      { value: (s.critic && s.critic.primary && s.critic.primary.value) || 'impact' },
      turno:       { value: (s.initiative && s.initiative.base && s.initiative.base.value) || 20 },
      special:     { value: (s.special && s.special.value) || '' },
      bonusAtk:    { value: 0 },
      bonusDef:    { value: 0 },
      bonusDamage: { value: 0 },
      bonusOther:  { value: '' }
    };
  }

  const converted = Object.assign({}, item, { type: 'summon', system: newSystem });
  if (converted._stats) converted._stats.modifiedTime = Date.now();

  return JSON.stringify(converted);
});

fs.writeFileSync(path, out.join('\n') + '\n');

console.log('Converted:');
lines.forEach(l => {
  const o = JSON.parse(l);
  if (o.type === 'weapon' || o.type === 'armor') console.log(' ', o.name, '(' + o.type + ' -> summon)');
});
console.log('Kept as-is:');
lines.forEach(l => {
  const o = JSON.parse(l);
  if (o.type !== 'weapon' && o.type !== 'armor') console.log(' ', o.name, '(' + o.type + ')');
});
