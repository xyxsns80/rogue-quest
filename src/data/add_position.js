const fs = require('fs');
const content = fs.readFileSync('Creatures.ts', 'utf8');

// 前排生物（近战）
const frontLine = ['pikeman', 'swordsman', 'knight', 'angel', 
                   'skeleton', 'zombie', 'ghost', 'death_knight', 'bone_dragon',
                   'imp', 'hell_hound', 'demon', 'devil', 'arch_devil',
                   'sprite', 'dwarf', 'dryad', 'treant', 'green_dragon', 'gold_dragon',
                   'goblin', 'wolf_rider', 'orc', 'ogre', 'behemoth', 'ancient_behemoth'];

// 后排生物（远程/飞行/魔法）
const backLine = ['archer', 'griffin', 'monk',
                  'vampire', 'lich',
                  'gog', 'fire_elemental',
                  'unicorn',
                  'thunderbird'];

// 替换每个生物定义
let result = content.replace(
  /(id: '(\w+)',[\s\S]*?tier: (\d+),)/g,
  (match, prefix, id, tier) => {
    const position = frontLine.includes(id) ? 'front' : 'back';
    return prefix + `\n  position: '${position}',`;
  }
);

fs.writeFileSync('Creatures.ts', result);
console.log('Done');
