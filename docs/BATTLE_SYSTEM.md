# 战斗系统设计文档 v2.0

## 1. 概述

### 1.1 设计目标
- **节奏：** 3-5分钟/局，中快节奏
- **操作：** 可自动可手动，轻松挂机
- **乐趣：** 肉鸽元素带来的策略选择

### 1.2 核心循环
```
进入战斗 → 回合制战斗 → 击杀敌人 → 获得经验 → 升级 → 选择技能 → 继续战斗 → 通关/失败 → 结算
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

### 4.1 技能触发

```typescript
interface Skill {
  id: string;
  name: string;
  icon: string;
  type: 'active' | 'passive';
  
  // 主动技能：CD + 发动几率
  cooldown: number;        // 冷却回合数
  currentCooldown: number; // 当前冷却
  triggerChance: number;   // 发动几率（0-1）
  
  // 效果
  damageMultiplier: number;
  targetType: 'single' | 'all' | 'self';
  
  // 动画
  animation: {
    type: 'melee' | 'ranged' | 'area';
    effect: string;
    duration: number;
  };
}
```

### 4.2 技能发动判定

```typescript
function tryUseSkill(unit: Unit): Skill | null {
  // 1. 获取可用技能（CD为0）
  const availableSkills = unit.skills.filter(s => s.currentCooldown === 0);
  
  // 2. 遍历技能，检查发动几率
  for (const skill of availableSkills) {
    if (Math.random() < skill.triggerChance) {
      return skill;
    }
  }
  
  // 3. 没有技能发动，使用普攻
  return null;
}
```

### 4.3 技能示例

| 技能名 | 类型 | CD | 发动率 | 效果 |
|--------|------|-----|--------|------|
| 普攻 | - | 0 | 100% | 基础伤害 |
| 火球术 | 主动 | 3 | 80% | 150%伤害，远程 |
| 暴击 | 被动 | 0 | 15% | 双倍伤害 |
| 连击 | 主动 | 4 | 50% | 攻击3次 |
| 治疗 | 主动 | 5 | 60% | 回复30%HP |

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

### 6.1 回合执行流程

```typescript
async function executeRound() {
  // 1. 确定行动顺序（速度排序）
  const actionOrder = sortBySpeed([...heroUnits, ...enemyUnits]);
  
  // 2. 依次执行每个单位的行动
  for (const unit of actionOrder) {
    if (unit.hp <= 0) continue; // 已死亡跳过
    
    // 选择目标
    const target = selectTarget(unit);
    if (!target) continue;
    
    // 尝试使用技能
    const skill = tryUseSkill(unit);
    
    // 执行攻击
    await executeAction(unit, target, skill);
    
    // 检查战斗结果
    if (checkBattleEnd()) break;
  }
  
  // 3. 回合结束，更新冷却
  updateAllCooldowns();
  
  // 4. 准备下一回合
  scheduleNextRound();
}
```

### 6.2 速度计算

```typescript
function sortBySpeed(units: Unit[]): Unit[] {
  return units.sort((a, b) => {
    // 1. 速度比较
    if (a.speed !== b.speed) {
      return b.speed - a.speed; // 速度高的先
    }
    
    // 2. 等级比较
    if (a.level !== b.level) {
      return b.level - a.level; // 等级高的先
    }
    
    // 3. 随机
    return Math.random() - 0.5;
  });
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
