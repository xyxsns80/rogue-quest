// 生物数据定义
// 参考《英雄无敌3》每族7级生物

export type Race = 'castle' | 'necropolis' | 'inferno' | 'rampart' | 'stronghold';

export interface CreatureDef {
  id: string;
  name: string;
  icon: string;
  race: Race;
  tier: number;  // 1-7级
  
  // 基础属性
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  
  // 星级加成
  starBonus: {
    2: { hp: number; atk: number; def: number };
    3: { hp: number; atk: number; def: number };
  };
  
  // 特性（星级解锁）
  abilities: {
    star1?: string;
    star2?: string;
    star3?: string;
  };
}

// 羁绊配置
export const SYNERGY_LEVELS = {
  2: { required: 2, bonus: { attack: 0.05, defense: 0.05 } },
  3: { required: 3, bonus: { attack: 0.10, defense: 0.10 } },
  4: { required: 4, bonus: { attack: 0.15, defense: 0.15, hp: 0.10 } },
  5: { required: 5, bonus: { attack: 0.20, defense: 0.20, hp: 0.15 } },
  7: { required: 7, bonus: { attack: 0.30, defense: 0.30, hp: 0.25, special: 'ultimate' } },
};

// 所有生物定义
export const CREATURES: CreatureDef[] = [
  // ========== 城堡 (Castle) ==========
  {
    id: 'pikeman',
    name: '枪兵',
    icon: '🗡️',
    race: 'castle',
    tier: 1,
    baseHp: 50,
    baseAttack: 8,
    baseDefense: 5,
    baseSpeed: 6,
    starBonus: {
      2: { hp: 15, atk: 3, def: 2 },
      3: { hp: 25, atk: 5, def: 3 },
    },
    abilities: { star2: '长枪克制骑兵', star3: '首回合先攻' },
  },
  {
    id: 'archer',
    name: '弓箭手',
    icon: '🏹',
    race: 'castle',
    tier: 2,
    baseHp: 40,
    baseAttack: 10,
    baseDefense: 3,
    baseSpeed: 7,
    starBonus: {
      2: { hp: 10, atk: 4, def: 1 },
      3: { hp: 20, atk: 6, def: 2 },
    },
    abilities: { star2: '远程攻击', star3: '连射(攻击两次)' },
  },
  {
    id: 'griffin',
    name: '狮鹫',
    icon: '🦅',
    race: 'castle',
    tier: 3,
    baseHp: 80,
    baseAttack: 12,
    baseDefense: 6,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 20, atk: 4, def: 2 },
      3: { hp: 35, atk: 7, def: 4 },
    },
    abilities: { star2: '飞行(无视前排)', star3: '反击所有近战' },
  },
  {
    id: 'swordsman',
    name: '剑士',
    icon: '⚔️',
    race: 'castle',
    tier: 4,
    baseHp: 100,
    baseAttack: 15,
    baseDefense: 10,
    baseSpeed: 7,
    starBonus: {
      2: { hp: 25, atk: 5, def: 4 },
      3: { hp: 45, atk: 10, def: 6 },
    },
    abilities: { star2: '盾墙(减伤20%)', star3: '格挡(25%免伤)' },
  },
  {
    id: 'monk',
    name: '僧侣',
    icon: '🙏',
    race: 'castle',
    tier: 5,
    baseHp: 70,
    baseAttack: 14,
    baseDefense: 5,
    baseSpeed: 8,
    starBonus: {
      2: { hp: 18, atk: 5, def: 2 },
      3: { hp: 30, atk: 10, def: 4 },
    },
    abilities: { star2: '治疗友军', star3: '神圣攻击(+50%亡灵伤害)' },
  },
  {
    id: 'knight',
    name: '骑士',
    icon: '🐴',
    race: 'castle',
    tier: 6,
    baseHp: 150,
    baseAttack: 20,
    baseDefense: 15,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 40, atk: 7, def: 5 },
      3: { hp: 70, atk: 12, def: 8 },
    },
    abilities: { star2: '冲锋(首回合双倍伤害)', star3: '骑士精神(免疫恐惧)' },
  },
  {
    id: 'angel',
    name: '天使',
    icon: '👼',
    race: 'castle',
    tier: 7,
    baseHp: 250,
    baseAttack: 30,
    baseDefense: 20,
    baseSpeed: 12,
    starBonus: {
      2: { hp: 60, atk: 10, def: 8 },
      3: { hp: 100, atk: 18, def: 12 },
    },
    abilities: { star2: '复活友军', star3: '神圣审判(无视防御)' },
  },
  
  // ========== 墓园 (Necropolis) ==========
  {
    id: 'skeleton',
    name: '骷髅兵',
    icon: '💀',
    race: 'necropolis',
    tier: 1,
    baseHp: 40,
    baseAttack: 6,
    baseDefense: 4,
    baseSpeed: 5,
    starBonus: {
      2: { hp: 12, atk: 2, def: 2 },
      3: { hp: 20, atk: 4, def: 3 },
    },
    abilities: { star2: '不死(免疫恐惧)', star3: '复生(击杀回复HP)' },
  },
  {
    id: 'zombie',
    name: '僵尸',
    icon: '🧟',
    race: 'necropolis',
    tier: 2,
    baseHp: 70,
    baseAttack: 5,
    baseDefense: 8,
    baseSpeed: 4,
    starBonus: {
      2: { hp: 20, atk: 2, def: 3 },
      3: { hp: 35, atk: 4, def: 5 },
    },
    abilities: { star2: '瘟疫(减速敌人)', star3: '感染(持续伤害)' },
  },
  {
    id: 'ghost',
    name: '幽灵',
    icon: '👻',
    race: 'necropolis',
    tier: 3,
    baseHp: 60,
    baseAttack: 10,
    baseDefense: 5,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 15, atk: 4, def: 2 },
      3: { hp: 28, atk: 7, def: 4 },
    },
    abilities: { star2: '虚无(30%闪避)', star3: '穿墙(无视障碍)' },
  },
  {
    id: 'vampire',
    name: '吸血鬼',
    icon: '🧛',
    race: 'necropolis',
    tier: 4,
    baseHp: 90,
    baseAttack: 14,
    baseDefense: 6,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 25, atk: 5, def: 2 },
      3: { hp: 45, atk: 10, def: 4 },
    },
    abilities: { star2: '吸血(回复伤害50%)', star3: '不死之身(复活1次)' },
  },
  {
    id: 'lich',
    name: '巫妖',
    icon: '☠️',
    race: 'necropolis',
    tier: 5,
    baseHp: 80,
    baseAttack: 18,
    baseDefense: 5,
    baseSpeed: 7,
    starBonus: {
      2: { hp: 20, atk: 6, def: 2 },
      3: { hp: 35, atk: 12, def: 4 },
    },
    abilities: { star2: '死亡光环(AOE伤害)', star3: '诅咒(降低敌人攻击)' },
  },
  {
    id: 'death_knight',
    name: '死亡骑士',
    icon: '🗡️',
    race: 'necropolis',
    tier: 6,
    baseHp: 140,
    baseAttack: 22,
    baseDefense: 14,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 35, atk: 8, def: 5 },
      3: { hp: 60, atk: 14, def: 8 },
    },
    abilities: { star2: '恐惧(降低敌人速度)', star3: '死亡一击(20%即死)' },
  },
  {
    id: 'bone_dragon',
    name: '骨龙',
    icon: '🐉',
    race: 'necropolis',
    tier: 7,
    baseHp: 220,
    baseAttack: 28,
    baseDefense: 18,
    baseSpeed: 11,
    starBonus: {
      2: { hp: 55, atk: 10, def: 6 },
      3: { hp: 95, atk: 18, def: 10 },
    },
    abilities: { star2: '龙息(AOE攻击)', star3: '死亡气息(削弱所有敌人)' },
  },
  
  // ========== 地狱 (Inferno) ==========
  {
    id: 'imp',
    name: '小恶魔',
    icon: '😈',
    race: 'inferno',
    tier: 1,
    baseHp: 35,
    baseAttack: 7,
    baseDefense: 3,
    baseSpeed: 8,
    starBonus: {
      2: { hp: 10, atk: 3, def: 1 },
      3: { hp: 18, atk: 5, def: 2 },
    },
    abilities: { star2: '偷取(获得额外金币)', star3: '恶魔血统(+10%攻击)' },
  },
  {
    id: 'gog',
    name: '歌格',
    icon: '🔥',
    race: 'inferno',
    tier: 2,
    baseHp: 45,
    baseAttack: 11,
    baseDefense: 4,
    baseSpeed: 6,
    starBonus: {
      2: { hp: 12, atk: 4, def: 2 },
      3: { hp: 22, atk: 7, def: 3 },
    },
    abilities: { star2: '火球(远程)', star3: '连珠火球(攻击两次)' },
  },
  {
    id: 'hell_hound',
    name: '地狱犬',
    icon: '🐕',
    race: 'inferno',
    tier: 3,
    baseHp: 75,
    baseAttack: 13,
    baseDefense: 5,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 20, atk: 5, def: 2 },
      3: { hp: 35, atk: 9, def: 4 },
    },
    abilities: { star2: '撕咬(流血伤害)', star3: '三头(攻击3个目标)' },
  },
  {
    id: 'demon',
    name: '恶魔',
    icon: '👹',
    race: 'inferno',
    tier: 4,
    baseHp: 110,
    baseAttack: 16,
    baseDefense: 8,
    baseSpeed: 8,
    starBonus: {
      2: { hp: 28, atk: 6, def: 3 },
      3: { hp: 50, atk: 11, def: 5 },
    },
    abilities: { star2: '恶魔契约(击杀回血)', star3: '地狱火(燃烧伤害)' },
  },
  {
    id: 'fire_elemental',
    name: '火精灵',
    icon: '🔥',
    race: 'inferno',
    tier: 5,
    baseHp: 85,
    baseAttack: 16,
    baseDefense: 6,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 22, atk: 6, def: 2 },
      3: { hp: 40, atk: 11, def: 4 },
    },
    abilities: { star2: '火焰护盾(反弹伤害)', star3: '元素(免疫异常状态)' },
  },
  {
    id: 'devil',
    name: '魔鬼',
    icon: '😈',
    race: 'inferno',
    tier: 6,
    baseHp: 160,
    baseAttack: 24,
    baseDefense: 12,
    baseSpeed: 11,
    starBonus: {
      2: { hp: 40, atk: 9, def: 4 },
      3: { hp: 70, atk: 16, def: 7 },
    },
    abilities: { star2: '传送(无视距离)', star3: '削弱(降低敌人防御)' },
  },
  {
    id: 'arch_devil',
    name: '大恶魔',
    icon: '👿',
    race: 'inferno',
    tier: 7,
    baseHp: 240,
    baseAttack: 32,
    baseDefense: 16,
    baseSpeed: 13,
    starBonus: {
      2: { hp: 60, atk: 12, def: 5 },
      3: { hp: 105, atk: 22, def: 9 },
    },
    abilities: { star2: '地狱之门(召唤小恶魔)', star3: '堕落(削弱全体敌人)' },
  },
  
  // ========== 森林 (Rampart) ==========
  {
    id: 'sprite',
    name: '精灵',
    icon: '🧚',
    race: 'rampart',
    tier: 1,
    baseHp: 30,
    baseAttack: 8,
    baseDefense: 2,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 8, atk: 3, def: 1 },
      3: { hp: 15, atk: 6, def: 2 },
    },
    abilities: { star2: '魔法攻击(无视部分防御)', star3: '连击(攻击两次)' },
  },
  {
    id: 'dwarf',
    name: '矮人',
    icon: '🧔',
    race: 'rampart',
    tier: 2,
    baseHp: 80,
    baseAttack: 6,
    baseDefense: 10,
    baseSpeed: 4,
    starBonus: {
      2: { hp: 22, atk: 2, def: 4 },
      3: { hp: 40, atk: 4, def: 7 },
    },
    abilities: { star2: '石肤(+20%防御)', star3: '顽强(低于30%HP时减伤50%)' },
  },
  {
    id: 'dryad',
    name: '树妖',
    icon: '🌿',
    race: 'rampart',
    tier: 3,
    baseHp: 70,
    baseAttack: 9,
    baseDefense: 6,
    baseSpeed: 7,
    starBonus: {
      2: { hp: 18, atk: 3, def: 2 },
      3: { hp: 32, atk: 6, def: 4 },
    },
    abilities: { star2: '缠绕(定身敌人)', star3: '森林祝福(治疗友军)' },
  },
  {
    id: 'unicorn',
    name: '独角兽',
    icon: '🦄',
    race: 'rampart',
    tier: 4,
    baseHp: 120,
    baseAttack: 14,
    baseDefense: 9,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 30, atk: 5, def: 3 },
      3: { hp: 55, atk: 10, def: 6 },
    },
    abilities: { star2: '神圣光环(友军+10%攻击)', star3: '净化(驱散负面状态)' },
  },
  {
    id: 'treant',
    name: '树人',
    icon: '🌲',
    race: 'rampart',
    tier: 5,
    baseHp: 180,
    baseAttack: 10,
    baseDefense: 15,
    baseSpeed: 5,
    starBonus: {
      2: { hp: 45, atk: 4, def: 6 },
      3: { hp: 80, atk: 8, def: 10 },
    },
    abilities: { star2: '再生(每回合回复5%HP)', star3: '根须缠绕(AOE定身)' },
  },
  {
    id: 'green_dragon',
    name: '绿龙',
    icon: '🐉',
    race: 'rampart',
    tier: 6,
    baseHp: 200,
    baseAttack: 25,
    baseDefense: 16,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 50, atk: 9, def: 5 },
      3: { hp: 90, atk: 16, def: 9 },
    },
    abilities: { star2: '毒息(持续伤害)', star3: '龙息(直线AOE)' },
  },
  {
    id: 'gold_dragon',
    name: '金龙',
    icon: '🐲',
    race: 'rampart',
    tier: 7,
    baseHp: 280,
    baseAttack: 30,
    baseDefense: 22,
    baseSpeed: 12,
    starBonus: {
      2: { hp: 70, atk: 11, def: 7 },
      3: { hp: 125, atk: 20, def: 12 },
    },
    abilities: { star2: '黄金吐息(无视防御)', star3: '龙威(降低敌人攻击)' },
  },
  
  // ========== 据点 (Stronghold) ==========
  {
    id: 'goblin',
    name: '哥布林',
    icon: '👺',
    race: 'stronghold',
    tier: 1,
    baseHp: 35,
    baseAttack: 6,
    baseDefense: 3,
    baseSpeed: 7,
    starBonus: {
      2: { hp: 10, atk: 2, def: 1 },
      3: { hp: 18, atk: 4, def: 2 },
    },
    abilities: { star2: '偷袭(+20%首回合伤害)', star3: '群攻(攻击2个目标)' },
  },
  {
    id: 'wolf_rider',
    name: '狼骑兵',
    icon: '🐺',
    race: 'stronghold',
    tier: 2,
    baseHp: 55,
    baseAttack: 12,
    baseDefense: 4,
    baseSpeed: 11,
    starBonus: {
      2: { hp: 15, atk: 5, def: 1 },
      3: { hp: 28, atk: 9, def: 2 },
    },
    abilities: { star2: '冲锋(首回合双倍伤害)', star3: '嗜血(击杀后+攻击)' },
  },
  {
    id: 'orc',
    name: '半兽人',
    icon: '👹',
    race: 'stronghold',
    tier: 3,
    baseHp: 90,
    baseAttack: 11,
    baseDefense: 7,
    baseSpeed: 6,
    starBonus: {
      2: { hp: 24, atk: 4, def: 3 },
      3: { hp: 42, atk: 8, def: 5 },
    },
    abilities: { star2: '战嚎(提升攻击)', star3: '狂暴(低血量+攻击)' },
  },
  {
    id: 'ogre',
    name: '食人魔',
    icon: '🧌',
    race: 'stronghold',
    tier: 4,
    baseHp: 140,
    baseAttack: 15,
    baseDefense: 8,
    baseSpeed: 5,
    starBonus: {
      2: { hp: 35, atk: 6, def: 3 },
      3: { hp: 65, atk: 11, def: 5 },
    },
    abilities: { star2: '重击(眩晕)', star3: '巨人血统(+30%HP)' },
  },
  {
    id: 'thunderbird',
    name: '雷鸟',
    icon: '🦅',
    race: 'stronghold',
    tier: 5,
    baseHp: 110,
    baseAttack: 18,
    baseDefense: 8,
    baseSpeed: 10,
    starBonus: {
      2: { hp: 28, atk: 7, def: 3 },
      3: { hp: 52, atk: 13, def: 5 },
    },
    abilities: { star2: '闪电(AOE攻击)', star3: '风暴(持续AOE伤害)' },
  },
  {
    id: 'behemoth',
    name: '比蒙',
    icon: '🦁',
    race: 'stronghold',
    tier: 6,
    baseHp: 180,
    baseAttack: 28,
    baseDefense: 14,
    baseSpeed: 8,
    starBonus: {
      2: { hp: 45, atk: 10, def: 5 },
      3: { hp: 82, atk: 18, def: 9 },
    },
    abilities: { star2: '地震(无视防御)', star3: '毁灭(暴击率+30%)' },
  },
  {
    id: 'ancient_behemoth',
    name: '远古比蒙',
    icon: '🐉',
    race: 'stronghold',
    tier: 7,
    baseHp: 300,
    baseAttack: 35,
    baseDefense: 18,
    baseSpeed: 9,
    starBonus: {
      2: { hp: 75, atk: 13, def: 6 },
      3: { hp: 135, atk: 24, def: 11 },
    },
    abilities: { star2: '毁灭之爪(无视50%防御)', star3: '地震波(全屏伤害)' },
  },
];

// 根据种族获取生物列表
export function getCreaturesByRace(race: Race): CreatureDef[] {
  return CREATURES.filter(c => c.race === race);
}

// 根据ID获取生物
export function getCreatureById(id: string): CreatureDef | undefined {
  return CREATURES.find(c => c.id === id);
}

// 获取所有种族
export const RACES: Race[] = ['castle', 'necropolis', 'inferno', 'rampart', 'stronghold'];

// 种族中文名
export const RACE_NAMES: Record<Race, string> = {
  castle: '🏰 城堡',
  necropolis: '💀 墓园',
  inferno: '🔥 地狱',
  rampart: '🌲 森林',
  stronghold: '⚔️ 据点',
};
