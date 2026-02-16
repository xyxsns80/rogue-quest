# 战斗系统设计文档 v2.1

## 1. 概述

### 1.1 设计目标
- **节奏：** 3-5分钟/小关卡，16小关卡=1大关卡
- **操作：** 可自动可手动，轻松挂机
- **乐趣：** 每小关肉鸽选择，累积强化

### 1.2 核心循环
```
点击开始冒险 → 进入当前大关卡的第1小关
  ↓
战斗 → 击杀敌人 → 小关卡通过
  ↓
肉鸽选择（每小关1次）
  ↓
进入下一小关（2/16）... 直到16关
  ↓
16小关全通 → 大关卡通过
  ↓
下次冒险 → 下一个大关卡
```

---

## 2. 关卡结构

### 2.1 大关卡与小关卡

```
┌─────────────────────────────────────────────────────────┐
│                    关卡层级结构                          │
└─────────────────────────────────────────────────────────┘

大关卡 (Chapter)
  │
  ├── 小关卡 1  → 战斗 → 肉鸽选择
  ├── 小关卡 2  → 战斗 → 肉鸽选择
  ├── 小关卡 3  → 战斗 → 肉鸽选择
  │   ...
  ├── 小关卡 15 → 战斗 → 肉鸽选择
  └── 小关卡 16 → 战斗 → 肉鸽选择 → 大关卡通过！
```

### 2.2 数据结构

```typescript
interface GameProgress {
  // 大关卡进度
  currentChapter: number;      // 当前大关卡（1, 2, 3...）
  currentStage: number;        // 当前小关卡（1-16）
  maxChapter: number;          // 已通过的最高大关卡
  
  // 小关卡内状态
  stageGold: number;           // 当前小关卡获得的金币
  stageExp: number;            // 当前小关卡获得的经验
  
  // 肉鸽强化（本大关卡内有效）
  skills: Skill[];             // 获得的技能
  bonuses: StatBonus[];        // 属性加成
  
  // 结算后保存
  totalGold: number;           // 总金币
  accountLevel: number;        // 账号等级
}

interface StatBonus {
  stat: 'attack' | 'hp' | 'speed' | 'critRate' | 'defense';
  value: number;               // 加成值（百分比或固定）
  type: 'percent' | 'flat';
}
```

### 2.3 难度递增

```typescript
// 大关卡难度
function getChapterDifficulty(chapter: number) {
  return {
    enemyBaseHp: 50 + chapter * 30,      // 每+1大关，敌人血量+30
    enemyBaseAttack: 5 + chapter * 3,    // 每+1大关，敌人攻击+3
    enemyCount: Math.min(1 + Math.floor(chapter / 3), 5),  // 敌人数量
  };
}

// 小关卡难度（同一大关卡内递增）
function getStageDifficulty(chapter: number, stage: number) {
  const base = getChapterDifficulty(chapter);
  return {
    enemyBaseHp: base.enemyBaseHp + stage * 5,    // 每+1小关，血量+5
    enemyBaseAttack: base.enemyBaseAttack + stage, // 每+1小关，攻击+1
    enemyCount: base.enemyCount,
  };
}
```

---

## 2. 回合制战斗系统

### 2.1 回合流程

```
┌─────────────────────────────────────────────────────────┐
│                    回合制战斗流程                         │
└─────────────────────────────────────────────────────────┘

每个回合：
  
  1. 确定行动顺序
     └─ 速度高的一方先行动
     └─ 速度相同：等级高的先行动
     └─ 等级相同：随机决定
  
  2. 先手方行动
     └─ 所有存活单位依次行动
     └─ 每个单位：选择目标 → 执行攻击/技能 → 播放动画 → 结算伤害
  
  3. 后手方行动
     └─ 所有存活单位依次行动
     └─ 每个单位：选择目标 → 执行攻击/技能 → 播放动画 → 结算伤害
  
  4. 回合结束处理
     └─ 更新技能CD
     └─ 检查战斗结果
     └─ 进入下一回合
```

### 2.2 行动顺序算法

```typescript
function determineTurnOrder(
  heroUnits: Unit[], 
  enemyUnits: Unit[]
): Unit[] {
  const allUnits = [...heroUnits, ...enemyUnits];
  
  // 按速度排序
  allUnits.sort((a, b) => {
    // 1. 速度高的优先
    if (a.speed !== b.speed) {
      return b.speed - a.speed;
    }
    // 2. 速度相同，等级高的优先
    if (a.level !== b.level) {
      return b.level - a.level;
    }
    // 3. 都相同，随机
    return Math.random() - 0.5;
  });
  
  return allUnits;
}
```

### 2.3 单位行动流程

```typescript
async function unitAction(unit: Unit) {
  // 1. 检查是否存活
  if (unit.hp <= 0) return;
  
  // 2. 选择目标
  const targets = unit.isEnemy ? heroUnits : enemyUnits;
  const target = selectTarget(targets);
  if (!target) return; // 无可攻击目标
  
  // 3. 决定行动类型
  const action = decideAction(unit);
  
  // 4. 执行行动
  if (action.type === 'skill') {
    await executeSkill(unit, target, action.skill);
  } else {
    await executeAttack(unit, target);
  }
  
  // 5. 检查目标是否死亡
  if (target.hp <= 0) {
    await playDeathAnimation(target);
  }
}
```

---

## 3. 多单位战斗

### 3.1 单位结构

```typescript
interface Unit {
  id: string;
  name: string;
  isEnemy: boolean;
  
  // 位置
  position: { x: number; y: number };
  index: number;  // 在己方阵列中的位置
  
  // 属性
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  
  // 状态
  isAlive: boolean;
  buffs: Buff[];
  skills: Skill[];
  
  // 视觉
  sprite: string;  // emoji或图片
}
```

### 3.2 阵列布局

```
英雄方（左侧）              敌方（右侧）

  [位置0]                    [位置0]
  [位置1]                    [位置1]  
  [位置2]                    [位置2]
  [位置3]                    [位置3]
  [位置4]                    [位置4]

- 最多5个单位
- 位置0通常是前排/主战位
- 攻击时优先攻击前排
```

### 3.3 目标选择

```typescript
function selectTarget(targets: Unit[]): Unit | null {
  // 1. 过滤存活单位
  const aliveTargets = targets.filter(u => u.isAlive);
  if (aliveTargets.length === 0) return null;
  
  // 2. 默认攻击前排（index最小的）
  // TODO: 后期可添加仇恨系统
  return aliveTargets.sort((a, b) => a.index - b.index)[0];
}
```

---

## 4. 技能系统

### 4.1 技能触发时机

```typescript
type TriggerTiming = 
  // 战斗级别
  | 'on_battle_start'      // 战斗开始时
  | 'on_battle_end'        // 战斗结束时
  
  // 回合级别
  | 'on_round_start'       // 回合开始时
  | 'on_round_end'         // 回合结束时
  
  // 行动级别
  | 'on_action_start'      // 行动前
  | 'on_action_end'        // 行动后
  | 'on_attack'            // 攻击时
  | 'on_kill'              // 击杀时
  
  // 受击级别
  | 'on_be_attacked'       // 被攻击时（命中前）
  | 'on_take_damage'       // 受到伤害时
  | 'on_dodge'             // 闪避时
  | 'on_death'             // 死亡时
  
  // 特殊
  | 'on_ally_death'        // 队友死亡时
  | 'on_enemy_death'       // 敌人死亡时
  | 'on_low_hp';           // 低血量时（HP<30%）
```

### 4.2 技能次数限制

```typescript
interface SkillUsageLimit {
  // 次数限制
  perBattle: number;       // 每局游戏限制（-1=无限）
  perCombat: number;       // 每次战斗限制（-1=无限）
  perRound: number;        // 每回合限制（-1=无限）
  
  // 当前已使用
  usedInBattle: number;    // 本局已用
  usedInCombat: number;    // 本次战斗已用
  usedInRound: number;     // 本回合已用
  
  // 检查是否可用
  canUse(): boolean {
    if (this.perBattle !== -1 && this.usedInBattle >= this.perBattle) return false;
    if (this.perCombat !== -1 && this.usedInCombat >= this.perCombat) return false;
    if (this.perRound !== -1 && this.usedInRound >= this.perRound) return false;
    return true;
  }
}
```

### 4.3 完整技能结构

```typescript
interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // 触发条件
  triggerTiming: TriggerTiming[];  // 可在多个时机触发
  triggerChance: number;           // 触发几率（0-1）
  triggerCondition?: (unit: Unit, context: BattleContext) => boolean;
  
  // 冷却
  cooldown: number;                // 冷却回合数
  currentCooldown: number;         // 当前冷却
  
  // 次数限制
  usageLimit: SkillUsageLimit;
  
  // 效果
  effects: SkillEffect[];
  
  // 目标
  targetType: 'self' | 'single_enemy' | 'all_enemies' | 'single_ally' | 'all_allies';
  targetCondition?: (target: Unit) => boolean;
  
  // 动画
  animation: {
    type: 'melee' | 'ranged' | 'area' | 'buff' | 'self';
    effect: string;
    projectile?: {
      sprite: string;
      speed: number;
      trajectory: 'straight' | 'arc' | 'homing';
    };
    duration: number;
  };
}

interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'summon';
  value: number | string;          // 数值或公式
  valueType: 'flat' | 'percent';   // 固定值或百分比
  attribute?: string;              // 影响的属性
  duration?: number;               // 持续回合数（buff/debuff）
}
```

### 4.4 技能触发流程

```typescript
// 战斗开始
async function onBattleStart() {
  for (const unit of allUnits) {
    for (const skill of unit.skills) {
      if (skill.triggerTiming.includes('on_battle_start')) {
        await tryTriggerSkill(unit, skill);
      }
    }
  }
}

// 回合开始
async function onRoundStart() {
  // 重置回合次数
  for (const unit of allUnits) {
    for (const skill of unit.skills) {
      skill.usageLimit.usedInRound = 0;
    }
  }
  
  // 触发回合开始技能
  for (const unit of allUnits) {
    for (const skill of unit.skills) {
      if (skill.triggerTiming.includes('on_round_start')) {
        await tryTriggerSkill(unit, skill);
      }
    }
  }
}

// 单位行动
async function onUnitAction(unit: Unit) {
  // 1. 行动前技能
  await triggerSkills(unit, 'on_action_start');
  
  // 2. 选择目标和行动
  const skill = selectActionSkill(unit);
  const target = selectTarget(unit, skill);
  
  // 3. 执行攻击
  if (skill) {
    await executeSkill(unit, target, skill);
  } else {
    await executeBasicAttack(unit, target);
  }
  
  // 4. 行动后技能
  await triggerSkills(unit, 'on_action_end');
}

// 受到伤害
async function onTakeDamage(target: Unit, damage: number, attacker: Unit) {
  // 1. 被攻击技能（闪避等）
  const dodgeSkills = target.skills.filter(s => 
    s.triggerTiming.includes('on_be_attacked')
  );
  for (const skill of dodgeSkills) {
    if (await tryTriggerSkill(target, skill)) {
      // 可能闪避成功，不再受伤
      return;
    }
  }
  
  // 2. 实际扣血
  target.hp -= damage;
  
  // 3. 受伤技能
  await triggerSkills(target, 'on_take_damage');
  
  // 4. 低血量技能
  if (target.hp / target.maxHp < 0.3) {
    await triggerSkills(target, 'on_low_hp');
  }
  
  // 5. 攻击者的击杀/攻击技能
  if (target.hp <= 0) {
    await triggerSkills(attacker, 'on_kill');
    await triggerSkills(target, 'on_death');
  }
}

// 技能触发检查
async function tryTriggerSkill(unit: Unit, skill: Skill): Promise<boolean> {
  // 1. 检查冷却
  if (skill.currentCooldown > 0) return false;
  
  // 2. 检查次数限制
  if (!skill.usageLimit.canUse()) return false;
  
  // 3. 检查触发几率
  if (Math.random() > skill.triggerChance) return false;
  
  // 4. 检查触发条件
  if (skill.triggerCondition && !skill.triggerCondition(unit, context)) {
    return false;
  }
  
  // 5. 执行技能
  await executeSkill(unit, null, skill);
  
  // 6. 更新冷却和次数
  skill.currentCooldown = skill.cooldown;
  skill.usageLimit.usedInBattle++;
  skill.usageLimit.usedInCombat++;
  skill.usageLimit.usedInRound++;
  
  return true;
}
```

### 4.5 技能示例（完整版）

#### 战斗开始触发

| 技能名 | 触发时机 | 发动率 | 效果 | 每局限制 |
|--------|----------|--------|------|----------|
| 先声夺人 | on_battle_start | 100% | 全体敌人造成50%伤害 | 1次/局 |
| 战吼 | on_battle_start | 100% | 全体友方攻击+10%（3回合） | 无限 |
| 伏击 | on_battle_start | 50% | 随机秒杀一个敌人 | 1次/局 |

#### 回合触发

| 技能名 | 触发时机 | 发动率 | 效果 | 每回合限制 |
|--------|----------|--------|------|------------|
| 再生 | on_round_start | 100% | 回复5%HP | 无限 |
| 燃烧 | on_round_end | 80% | 对敌人造成灼烧 | 无限 |
| 蓄力 | on_round_end | 100% | 下回合伤害+20% | 无限 |

#### 行动触发

| 技能名 | 触发时机 | 发动率 | CD | 效果 | 每次战斗 |
|--------|----------|--------|-----|------|----------|
| 火球术 | on_attack | 80% | 3 | 150%伤害，远程 | 无限 |
| 连击 | on_attack | 50% | 4 | 攻击3次 | 3次/战斗 |
| 治疗 | on_action_start | 60% | 5 | 回复30%HP | 2次/战斗 |

#### 受击触发

| 技能名 | 触发时机 | 发动率 | 效果 | 每回合限制 |
|--------|----------|--------|------|------------|
| 闪避 | on_be_attacked | 20% | 完全闪避 | 无限 |
| 反击 | on_take_damage | 30% | 反弹50%伤害 | 1次/回合 |
| 铁壁 | on_take_damage | 100% | 伤害-10% | 无限 |
| 狂暴 | on_low_hp | 100% | 伤害+50% | 1次/战斗 |

#### 死亡触发

| 技能名 | 触发时机 | 发动率 | 效果 | 限制 |
|--------|----------|--------|------|------|
| 自爆 | on_death | 100% | 对周围敌人造成伤害 | - |
| 复活 | on_death | 30% | 满血复活 | 1次/局 |
| 传承 | on_ally_death | 100% | 获得死者10%属性 | - |

### 4.6 弹道类型

```typescript
type ProjectileTrajectory = 
  | 'straight'   // 直线飞行
  | 'arc'        // 抛物线
  | 'homing'     // 追踪
  | 'wave'       // 波浪形
  | 'spiral';    // 螺旋形

interface ProjectileConfig {
  sprite: string;
  trajectory: ProjectileTrajectory;
  speed: number;
  
  // 特效
  trail?: {
    color: string;
    length: number;
  };
  
  // 命中特效
  impactEffect?: {
    sprite: string;
    scale: number;
    duration: number;
  };
}

// 示例
const fireball: ProjectileConfig = {
  sprite: '🔥',
  trajectory: 'straight',
  speed: 400,
  trail: { color: '#ff6600', length: 20 },
  impactEffect: { sprite: '💥', scale: 1.5, duration: 300 }
};

const iceArrow: ProjectileConfig = {
  sprite: '❄️',
  trajectory: 'arc',
  speed: 300,
  trail: { color: '#88ccff', length: 15 },
  impactEffect: { sprite: '✨', scale: 1.0, duration: 200 }
};
```

---

## 5. 战斗动画系统

### 5.1 近战攻击动画

```typescript
async function playMeleeAttack(
  attacker: Unit, 
  target: Unit,
  onHit: () => void
) {
  const originalX = attacker.position.x;
  const targetX = target.position.x - 50; // 跳到目标前
  
  // 1. 跳到目标面前
  await tween(attacker.sprite, {
    x: targetX,
    duration: 150,
    ease: 'quad.out'
  });
  
  // 2. 播放攻击特效
  playEffect(attacker.attackEffect, target.position);
  
  // 3. 伤害数字（此时弹出）
  onHit();
  
  // 4. 目标受击抖动
  await tween(target.sprite, {
    x: target.position.x + 10,
    duration: 50,
    yoyo: true,
    repeat: 3
  });
  
  // 5. 跳回原位
  await tween(attacker.sprite, {
    x: originalX,
    duration: 150,
    ease: 'quad.in'
  });
}
```

### 5.2 远程攻击动画

```typescript
async function playRangedAttack(
  attacker: Unit,
  target: Unit,
  onHit: () => void
) {
  // 1. 攻击者前摇
  await tween(attacker.sprite, {
    scale: 1.1,
    duration: 100,
    yoyo: true
  });
  
  // 2. 发射投射物
  const projectile = createProjectile(attacker.attackEffect);
  projectile.position = { ...attacker.position };
  
  await tween(projectile, {
    x: target.position.x,
    y: target.position.y,
    duration: 200,
    ease: 'linear',
    onComplete: () => {
      // 3. 命中时触发
      onHit();
      destroyProjectile(projectile);
    }
  });
  
  // 4. 目标受击
  await tween(target.sprite, {
    alpha: 0.5,
    duration: 50,
    yoyo: true,
    repeat: 2
  });
}
```

### 5.3 伤害数字

```typescript
interface DamageNumber {
  value: number;
  type: 'normal' | 'crit' | 'heal';
  position: { x: number; y: number };
}

async function showDamageNumber(dmg: DamageNumber) {
  const colors = {
    normal: '#ffffff',
    crit: '#ff9800',
    heal: '#4CAF50'
  };
  
  const fontSize = dmg.type === 'crit' ? 24 : 18;
  const text = createText(`-${dmg.value}`, {
    x: dmg.position.x,
    y: dmg.position.y - 20,
    fontSize,
    color: colors[dmg.type]
  });
  
  // 飘字动画
  await tween(text, {
    y: dmg.position.y - 60,
    alpha: 0,
    duration: 800,
    ease: 'quad.out'
  });
  
  destroyText(text);
}
```

### 5.4 血条显示

```typescript
interface UnitHealthBar {
  unit: Unit;
  width: 60;
  height: 8;
  offsetY: -40; // 单位头顶偏移
  
  // 显示逻辑
  update(hp: number, maxHp: number) {
    const percent = hp / maxHp;
    const color = percent > 0.3 ? '#ff4444' : '#ff0000';
    
    // 平滑动画
    tween(fillBar, {
      width: this.width * percent,
      duration: 300,
      ease: 'quad.out'
    });
  }
}
```

---

## 6. 战斗流程详细设计

### 6.1 回合时间 = 动作时间

```
┌─────────────────────────────────────────────────────────┐
│              回合时间 = 动作表演时间之和                  │
└─────────────────────────────────────────────────────────┘

不是固定时间间隔，而是：
回合时间 = Σ(所有单位的动作时间)

单个单位动作时间 = 动画时间 + 特效时间 + 等待时间
  - 跳跃攻击：300ms（去） + 100ms（攻击） + 300ms（回）
  - 远程攻击：200ms（前摇） + 飞行时间 + 200ms（命中特效）
  - 技能释放：根据技能配置

示例回合流程：
  英雄A攻击（800ms）→ 敌人B攻击（800ms）→ 英雄C攻击（800ms）→ 敌人D攻击（800ms）
  总回合时间 ≈ 3.2秒
```

### 6.2 目标选择算法

```typescript
function selectTarget(attacker: Unit, enemies: Unit[]): Unit | null {
  // 1. 过滤存活敌人
  const aliveEnemies = enemies.filter(e => e.hp > 0);
  if (aliveEnemies.length === 0) return null;
  
  // 2. 获取前排敌人（index最小的一组）
  const frontRow = getFrontRow(aliveEnemies);
  
  // 3. 前排中按优先级选择
  // 3.1 优先：对位（相同index）
  const samePosition = frontRow.find(e => e.index === attacker.index);
  if (samePosition) return samePosition;
  
  // 3.2 其次：同排距离最近
  const nearest = frontRow.sort((a, b) => 
    Math.abs(a.index - attacker.index) - Math.abs(b.index - attacker.index)
  )[0];
  if (nearest) return nearest;
  
  // 3.3 最后：随机
  return frontRow[Math.floor(Math.random() * frontRow.length)];
}

function getFrontRow(units: Unit[]): Unit[] {
  // 找到最小的index
  const minIndex = Math.min(...units.map(u => u.index));
  // 返回所有该index的单位
  return units.filter(u => u.index === minIndex);
}
```

### 6.3 阵列与对位示意

```
英雄方（左侧）              敌方（右侧）
index: 0  1  2  3  4       0  1  2  3  4
       ↓                 ↓
      [🧙]    ←──对位──→    [👺]
         [🧝]  ←──对位──→  [👹]
            [🧛]        [👻]

对位规则：
- 英雄[0] 优先攻击 敌人[0]
- 英雄[1] 优先攻击 敌人[1]
- 如果对位没有敌人，找最近的（敌人[0]）
- 如果前排死光，进入下一排
```

### 6.4 回合执行流程（异步动画版）

```typescript
async function executeRound() {
  // 1. 回合开始技能
  await triggerSkillsForAll('on_round_start');
  
  // 2. 确定行动顺序
  const actionOrder = sortBySpeed([...heroUnits, ...enemyUnits]);
  
  // 3. 依次执行（等待动画完成）
  for (const unit of actionOrder) {
    if (unit.hp <= 0) continue;
    
    // 行动前技能
    await triggerSkills(unit, 'on_action_start');
    
    // 选择目标
    const enemies = unit.isEnemy ? heroUnits : enemyUnits;
    const target = selectTarget(unit, enemies);
    
    if (target) {
      // 执行攻击（包含动画等待）
      await executeAttack(unit, target);
    }
    
    // 行动后技能
    await triggerSkills(unit, 'on_action_end');
    
    // 检查战斗结束
    if (checkBattleEnd()) return;
  }
  
  // 4. 回合结束技能
  await triggerSkillsForAll('on_round_end');
  
  // 5. 更新冷却
  updateAllCooldowns();
  
  // 6. 自动进入下一回合
  await delay(200); // 短暂停顿
  executeRound();   // 递归调用
}

async function executeAttack(attacker: Unit, target: Unit) {
  // 尝试使用技能
  const skill = await tryTriggerAttackSkill(attacker);
  
  if (skill) {
    await executeSkill(attacker, target, skill);
  } else {
    await executeBasicAttack(attacker, target);
  }
}

async function executeBasicAttack(attacker: Unit, target: Unit) {
  const damage = calculateDamage(attacker, target);
  
  // 播放攻击动画（等待完成）
  if (attacker.attackType === 'melee') {
    await playMeleeAttack(attacker, target);
  } else {
    await playRangedAttack(attacker, target);
  }
  
  // 在命中时机显示伤害数字
  await showDamageNumber(target, damage);
  
  // 实际扣血
  await applyDamage(target, damage, attacker);
}
```

### 6.5 动画时间配置

```typescript
const ANIMATION_TIMING = {
  // 近战攻击
  melee: {
    jumpTo: 150,      // 跳到目标前
    attack: 100,      // 攻击动作
    jumpBack: 150,    // 跳回原位
    total: 400
  },
  
  // 远程攻击
  ranged: {
    windup: 100,      // 前摇
    projectile: 'dynamic',  // 投射物飞行（根据距离计算）
    impact: 150,      // 命中特效
    total: 'variable'
  },
  
  // 技能（可配置）
  skill: {
    short: 500,
    medium: 800,
    long: 1200
  },
  
  // 伤害数字
  damageNumber: 600,   // 飘字时长
  
  // 死亡动画
  death: 400,
  
  // 回合间隔
  roundGap: 200
};

// 计算投射物飞行时间
function calculateProjectileTime(from: Position, to: Position, speed: number): number {
  const distance = Math.sqrt(
    Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
  );
  return distance / speed * 1000; // 转为毫秒
}
```

---

## 7. UI布局更新

```
┌──────────────────────────────────────┐
│  ┌─────────────────────────────────┐ │
│  │ 第 X 关          💰100  ⚡50   │ │  ← 顶部信息栏
│  └─────────────────────────────────┘ │
│                                      │
│      ┌─────┐           ┌─────┐      │
│      │ 🧙  │           │ 👺  │      │  ← 单位
│      │█████│           │████░│      │  ← 头顶血条
│      └─────┘           └─────┘      │
│                    -50 ↑             │  ← 伤害数字飘字
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ 🔥 火球术造成75伤害！            │ │  ← 战斗日志
│  └─────────────────────────────────┘ │
│                                      │
│  [🏠返回]              [🤖自动]     │  ← 控制按钮
└──────────────────────────────────────┘
```

---

## 8. 实现优先级

### 阶段1：核心机制修复
1. [ ] 修复连续战斗Bug
2. [ ] 实现回合制（双方依次行动）
3. [ ] 实现速度排序
4. [ ] 技能CD + 发动几率

### 阶段2：视觉表现
1. [ ] 单位头顶血条
2. [ ] 伤害数字飘字
3. [ ] 近战跳跃攻击动画
4. [ ] 远程投射物动画

### 阶段3：内容扩展
1. [ ] 多单位战斗
2. [ ] 更多技能
3. [ ] Boss战

---

## 9. 待确认问题

1. **回合时间间隔？**
   - 每个单位行动间隔多久？（建议0.5-1秒）

2. **自动战斗时是否跳过动画？**
   - 可以加个"快进"按钮？

3. **多单位时如何选择目标？**
   - 随机？优先低血量？优先后排？

---

*文档版本：v2.0*
*最后更新：2026-02-16*
*更新内容：加入回合制、速度排序、头顶血条、攻击动画*
