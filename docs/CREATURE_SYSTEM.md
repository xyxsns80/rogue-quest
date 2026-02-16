# 生物系统设计文档

## 1. 概述

### 1.1 设计目标
- 肉鸽核心玩法：收集生物、组建队伍
- 羁绊系统：同种族加成
- 升星系统：重复获得变强

### 1.2 参考来源
- 英雄无敌3 生物系统
- 自走棋 羁绊系统

---

## 2. 种族设计（参考英雄无敌3）

### 2.1 种族列表（每族7级生物 = 35个）

| 种族 | 特点 | 1级 | 7级 |
|------|------|-----|-----|
| 🏰 城堡 | 均衡型 | 枪兵 | 天使 |
| 💀 墓园 | 亡灵大军 | 骷髅兵 | 骨龙 |
| 🔥 地狱 | 高攻击 | 小恶魔 | 大恶魔 |
| 🌲 森林 | 远程优势 | 精灵 | 金龙 |
| ⚔️ 据点 | 近战爆发 | 哥布林 | 远古比蒙 |

---

## 3. 生物数据结构

### 3.1 生物定义

```typescript
interface CreatureDef {
  id: string;              // 唯一ID
  name: string;            // 名称
  icon: string;            // emoji图标
  race: Race;              // 种族
  tier: number;            // 阶级 (1-4)
  
  // 基础属性
  baseHp: number;          // 生命值
  baseAttack: number;      // 攻击力
  baseDefense: number;     // 防御力
  baseSpeed: number;       // 速度
  
  // 特性
  ability?: Ability;       // 特殊能力
  
  // 星级加成
  starBonus: {
    2: { hp: number; atk: number; def: number; ability?: Ability };
    3: { hp: number; atk: number; def: number; ability?: Ability };
  };
}

type Race = 'castle' | 'necropolis' | 'inferno' | 'rampart' | 'stronghold';
```

### 3.2 队伍中的生物

```typescript
interface BattleCreature {
  defId: string;           // 生物定义ID
  star: 1 | 2 | 3;         // 星级
  
  // 计算后的属性
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  
  // 战斗状态
  currentHp: number;
  abilities: Ability[];    // 根据星级解锁的能力
}
```

### 3.3 羁绊系统

```typescript
interface Synergy {
  race: Race;
  count: number;           // 同种族数量
  level: number;           // 羁绊等级 (0-3)
  
  // 羁绊效果
  bonus: {
    hp?: number;           // 百分比加成
    attack?: number;
    defense?: number;
    speed?: number;
    special?: string;      // 特殊效果
  };
}

// 羁绊等级
const SYNERGY_LEVELS = {
  1: { required: 2, bonus: { attack: 0.1 } },
  2: { required: 3, bonus: { attack: 0.2, hp: 0.1 } },
  3: { required: 5, bonus: { attack: 0.3, hp: 0.2, special: 'race_ultimate' } },
};
```

---

## 4. 肉鸽获得逻辑

### 4.1 获得流程

```
小关卡结束
    ↓
生成3个随机选项
    ↓
玩家选择
    ↓
检查队伍是否已满(5个)
    ↓
未满 → 添加新生物
已满 → 升星已有生物
    ↓
如果生物已满星 → 该生物不再出现
```

### 4.2 选项生成算法

```typescript
function generateCreatureChoices(team: BattleCreature[], maxTeamSize: number): CreatureChoice[] {
  const pool = getAvailableCreatures(team);
  const choices: CreatureChoice[] = [];
  
  // 生成3个选项
  for (let i = 0; i < 3; i++) {
    const creature = randomFrom(pool);
    
    if (team.length < maxTeamSize) {
      // 队伍未满 → 获得新生物
      choices.push({
        type: 'new',
        creature: creature,
        desc: `获得 ${creature.name}`,
      });
    } else {
      // 队伍已满 → 升星
      const existing = team.find(c => c.defId === creature.id && c.star < 3);
      if (existing) {
        choices.push({
          type: 'upgrade',
          creature: creature,
          fromStar: existing.star,
          toStar: existing.star + 1,
          desc: `${creature.name} ${existing.star}★ → ${existing.star + 1}★`,
        });
      }
    }
  }
  
  return choices;
}

function getAvailableCreatures(team: BattleCreature[]): CreatureDef[] {
  // 过滤掉已满星的生物
  const maxedOut = team.filter(c => c.star >= 3).map(c => c.defId);
  return ALL_CREATURES.filter(c => !maxedOut.includes(c.id));
}
```

---

## 5. 战斗中的生物

### 5.1 队伍配置

```typescript
interface Team {
  creatures: BattleCreature[];  // 最多5个
  synergies: Synergy[];         // 当前激活的羁绊
}

function calculateSynergies(creatures: BattleCreature[]): Synergy[] {
  const raceCount: Record<Race, number> = {};
  
  // 统计各种族数量
  creatures.forEach(c => {
    const def = getCreatureDef(c.defId);
    raceCount[def.race] = (raceCount[def.race] || 0) + 1;
  });
  
  // 计算羁绊等级
  const synergies: Synergy[] = [];
  for (const [race, count] of Object.entries(raceCount)) {
    const level = getSynergyLevel(count);
    if (level > 0) {
      synergies.push({
        race: race as Race,
        count,
        level,
        bonus: SYNERGY_LEVELS[level].bonus,
      });
    }
  }
  
  return synergies;
}
```

### 5.2 属性计算（含羁绊加成）

```typescript
function calculateFinalStats(creature: BattleCreature, synergies: Synergy[]): Stats {
  const def = getCreatureDef(creature.defId);
  
  // 基础属性
  let hp = def.baseHp;
  let atk = def.baseAttack;
  let def_ = def.baseDefense;
  let spd = def.baseSpeed;
  
  // 星级加成
  if (creature.star >= 2) {
    hp += def.starBonus[2].hp;
    atk += def.starBonus[2].atk;
    def_ += def.starBonus[2].def;
  }
  if (creature.star >= 3) {
    hp += def.starBonus[3].hp;
    atk += def.starBonus[3].atk;
    def_ += def.starBonus[3].def;
  }
  
  // 羁绊加成
  const raceSynergy = synergies.find(s => s.race === def.race);
  if (raceSynergy) {
    hp *= (1 + (raceSynergy.bonus.hp || 0));
    atk *= (1 + (raceSynergy.bonus.attack || 0));
    def_ *= (1 + (raceSynergy.bonus.defense || 0));
    spd *= (1 + (raceSynergy.bonus.speed || 0));
  }
  
  return { hp, attack: atk, defense: def_, speed: spd };
}
```

---

## 6. UI设计

### 6.1 队伍显示

```
┌──────────────────────────────────────┐
│  我的队伍 (3/5)                       │
├──────────────────────────────────────┤
│  [🗡️ 枪兵 ★★★] [🏹 弓箭手 ★★] [💀 骷髅 ★]  │
│  HP: 150  ATK: 25  DEF: 10           │
├──────────────────────────────────────┤
│  羁绊效果:                            │
│  🏰 城堡 (2/2) - 攻击+10%            │
└──────────────────────────────────────┘
```

### 6.2 肉鸽选择界面

```
┌──────────────────────────────────────┐
│  🎉 小关卡通过！选择奖励              │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 🦅 狮鹫                         │  │
│  │ 阶级: 2★  种族: 城堡           │  │
│  │ HP: 80  ATK: 18  DEF: 8        │  │
│  │ 特性: 飞行(无视前排)           │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🧛 吸血鬼 ↑                     │  │
│  │ 升星: ★★ → ★★★               │  │
│  │ HP+30  ATK+10  解锁: 吸血     │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🌲 树人                         │  │
│  │ 阶级: 2★  种族: 森林           │  │
│  │ HP: 120  ATK: 12  DEF: 15      │  │
│  │ 特性: 再生(每回合回复5%HP)      │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## 7. 实现优先级

### 阶段1：基础系统
1. [ ] 定义生物数据（每族5个，共25个）
2. [ ] 实现队伍管理（最多5个）
3. [ ] 肉鸽选择逻辑
4. [ ] 升星系统

### 阶段2：羁绊系统
1. [ ] 羁绊检测
2. [ ] 属性加成计算
3. [ ] UI显示羁绊效果

### 阶段3：特性系统
1. [ ] 生物特殊能力定义
2. [ ] 战斗中特性触发
3. [ ] 星级解锁特性

---

## 8. 待确认问题

1. **队伍上限？** 建议5个
2. **种族数量？** 先做3-5个种族
3. **星级上限？** 建议3星
4. **羁绊阈值？** 2/3/5个触发

---

*文档版本：v1.0*
*创建日期：2026-02-16*
