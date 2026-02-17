import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';
import type { RunData } from '../utils/DataManager';
import { CreatureManager } from '../utils/CreatureManager';
import { RACE_NAMES, getCreatureById } from '../data/Creatures';

// ==================== 类型定义 ====================

interface Unit {
  id: string;
  name: string;
  isEnemy: boolean;
  index: number;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  sprite: string;
  container?: Phaser.GameObjects.Container;
  hpBar?: Phaser.GameObjects.Graphics;
  hpText?: Phaser.GameObjects.Text;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rarity: string;
  rarityText: string;
  
  // 触发
  triggerChance: number;
  cooldown: number;
  currentCooldown: number;
  
  // 效果
  damageMultiplier?: number;
  healPercent?: number;
  statBonus?: { stat: string; value: number };
}

// ==================== 动画时间配置 ====================

const ANIM = {
  melee: { jumpTo: 150, attack: 100, jumpBack: 150 },
  ranged: { windup: 100, impact: 150 },
  damageNumber: 600,
  death: 400,
  roundGap: 200
};

// ==================== 关卡配置 ====================

const STAGES_PER_CHAPTER = 16;  // 每个大关卡有16个小关卡

// ==================== BattleScene ====================

export default class BattleScene extends Phaser.Scene {
  // 单位
  private heroUnits: Unit[] = [];
  private enemyUnits: Unit[] = [];
  private skills: Skill[] = [];
  
  // 生物系统
  private creatureManager!: CreatureManager;
  
  // 战斗状态
  private currentChapter: number = 1;  // 当前大关卡
  private currentStage: number = 1;    // 当前小关卡 (1-16)
  private gold: number = 0;
  private exp: number = 0;
  private isAutoMode: boolean = true;
  private isPaused: boolean = false;
  private isBattleEnded: boolean = false;
  private battleLog: string[] = [];
  private stageGold: number = 0;  // 当前小关卡获得的金币
  private stageExp: number = 0;   // 当前小关卡获得的经验
  
  // UI 元素
  private battleLevelEl!: HTMLElement;
  private battleHpFillEl!: HTMLElement;
  private battleHpTextEl!: HTMLElement;
  private battleGoldEl!: HTMLElement;
  private battleExpEl!: HTMLElement;
  private battleLogEl!: HTMLElement;
  private battleModeEl!: HTMLElement;
  private battleBackBtn!: HTMLElement;
  private skillSelectOverlay!: HTMLElement;
  private skillOptionsEl!: HTMLElement;
  private skillSelectLevelEl!: HTMLElement;
  private levelCompleteOverlay!: HTMLElement;
  private levelCompleteText!: HTMLElement;
  private levelGoldEl!: HTMLElement;
  private levelExpEl!: HTMLElement;
  private levelSkillOptionsEl!: HTMLElement;
  
  // 队伍和羁绊显示
  private teamCountEl!: HTMLElement;
  private teamUnitsEl!: HTMLElement;
  private synergyDisplayEl!: HTMLElement;

  constructor() {
    super({ key: 'BattleScene' });
  }
  
  private getCreatureManager(): CreatureManager {
    if (!this.creatureManager) {
      this.creatureManager = new CreatureManager();
    }
    return this.creatureManager;
  }

  init(data: { continue: boolean }) {
    console.log('=== BattleScene init ===', data);
    
    // 完全重置所有状态
    this.heroUnits = [];
    this.enemyUnits = [];
    this.skills = [];
    this.currentChapter = 1;
    this.currentStage = 1;
    this.gold = 0;
    this.exp = 0;
    this.stageGold = 0;
    this.stageExp = 0;
    this.isAutoMode = true;
    this.isPaused = false;
    this.isBattleEnded = false;
    this.battleLog = [];
    
    // 从存档恢复
    if (data.continue) {
      const run = DataManager.getCurrentRun();
      if (run) {
        // 从存档读取大关卡和小关卡
        // currentLevel 存的是小关卡，heroLevel 存的是大关卡
        this.currentChapter = run.heroLevel || 1;
        this.currentStage = run.currentLevel;
        this.gold = run.gold;
        this.exp = run.exp;
        this.skills = run.skills || [];
        console.log(`继续冒险: 第${this.currentChapter}-${this.currentStage}关`);
      }
    } else {
      // 新冒险，从最高大关卡+1开始
      const user = DataManager.getCurrentUser();
      if (user) {
        this.currentChapter = (user.statistics?.bestLevel || 0) + 1;
      }
      console.log(`新冒险: 第${this.currentChapter}大关卡`);
    }
  }

  create() {
    console.log('=== BattleScene create ===');
    
    // 显示战斗 UI
    this.showUI('battle-ui');
    this.initUIElements();
    this.updateBattleUI();
    this.bindEvents();
    
    // 绘制背景
    this.drawBackground();
    
    // 创建单位
    this.createHeroUnits();
    this.createEnemyUnits();
    
    // 开始战斗
    this.time.delayedCall(500, () => this.startBattle());
  }

  // ==================== UI 管理 ====================

  showUI(uiId: string) {
    document.querySelectorAll('.ui-container').forEach(ui => {
      ui.classList.remove('active');
    });
    const targetUI = document.getElementById(uiId);
    if (targetUI) targetUI.classList.add('active');
  }

  hideUI(uiId: string) {
    const ui = document.getElementById(uiId);
    if (ui) ui.classList.remove('active');
  }

  initUIElements() {
    this.battleLevelEl = document.getElementById('battle-level')!;
    this.battleHpFillEl = document.getElementById('battle-hp-fill')!;
    this.battleHpTextEl = document.getElementById('battle-hp-text')!;
    this.battleGoldEl = document.getElementById('battle-gold')!;
    
    // 队伍和羁绊显示
    this.teamCountEl = document.getElementById('team-count')!;
    this.teamUnitsEl = document.getElementById('team-units')!;
    this.synergyDisplayEl = document.getElementById('synergy-display')!;
    this.battleExpEl = document.getElementById('battle-exp')!;
    this.battleLogEl = document.getElementById('battle-log-text')!;
    this.battleModeEl = document.getElementById('battle-mode')!;
    this.battleBackBtn = document.getElementById('battle-back')!;
    this.skillSelectOverlay = document.getElementById('skill-select-overlay')!;
    this.skillOptionsEl = document.getElementById('skill-options')!;
    this.skillSelectLevelEl = document.getElementById('skill-select-level')!;
    this.levelCompleteOverlay = document.getElementById('level-complete-overlay')!;
    this.levelCompleteText = document.getElementById('level-complete-text')!;
    this.levelGoldEl = document.getElementById('level-gold')!;
    this.levelExpEl = document.getElementById('level-exp')!;
    this.levelSkillOptionsEl = document.getElementById('level-skill-options')!;
  }

  updateBattleUI() {
    // 获取英雄总血量
    const totalHp = this.heroUnits.reduce((sum, u) => sum + u.hp, 0);
    const totalMaxHp = this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0);
    
    this.battleLevelEl.textContent = `第 ${this.currentChapter}-${this.currentStage} 关 (${this.currentStage}/${STAGES_PER_CHAPTER})`;
    const hpPercent = totalMaxHp > 0 ? Math.max(0, (totalHp / totalMaxHp) * 100) : 0;
    this.battleHpFillEl.style.width = `${hpPercent}%`;
    this.battleHpTextEl.textContent = `HP: ${Math.floor(totalHp)}/${totalMaxHp}`;
    this.battleGoldEl.textContent = this.gold.toString();
    this.battleExpEl.textContent = this.exp.toString();
    
    // 更新队伍显示
    this.updateTeamDisplay();
  }
  
  updateTeamDisplay() {
    const cm = this.getCreatureManager();
    const creatures = cm.getTeam();
    const synergies = cm.calculateSynergies();
    
    // 更新队伍数量
    this.teamCountEl.textContent = (creatures.length + 1).toString(); // +1 是英雄
    
    // 生成队伍单位显示
    let unitsHtml = '';
    
    // 英雄
    const hero = this.heroUnits[0];
    if (hero) {
      const heroHpPercent = hero.maxHp > 0 ? (hero.hp / hero.maxHp) * 100 : 0;
      unitsHtml += `
        <div class="team-unit hero">
          <span class="icon">${hero.sprite}</span>
          <div class="hp-bar"><div class="hp-fill" style="width: ${heroHpPercent}%"></div></div>
        </div>
      `;
    }
    
    // 生物
    creatures.forEach((creature, index) => {
      const def = getCreatureById(creature.creatureId);
      if (def) {
        const unit = this.heroUnits[index + 1]; // +1 因为0是英雄
        const hpPercent = unit && unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 100;
        const stars = '★'.repeat(creature.star);
        unitsHtml += `
          <div class="team-unit">
            <span class="icon">${def.icon}</span>
            <span class="stars">${stars}</span>
            <div class="hp-bar"><div class="hp-fill" style="width: ${hpPercent}%"></div></div>
          </div>
        `;
      }
    });
    
    this.teamUnitsEl.innerHTML = unitsHtml;
    
    // 生成羁绊显示
    let synergyHtml = '';
    const raceNames: Record<string, string> = {
      castle: '🏰 城堡',
      necropolis: '💀 墓园',
      inferno: '🔥 地狱',
      rampart: '🌲 森林',
      stronghold: '⚔️ 据点'
    };
    
    synergies.forEach(synergy => {
      const name = raceNames[synergy.race] || synergy.race;
      const bonusText = [];
      if (synergy.bonus.attack) bonusText.push(`攻+${synergy.bonus.attack * 100}%`);
      if (synergy.bonus.defense) bonusText.push(`防+${synergy.bonus.defense * 100}%`);
      if (synergy.bonus.hp) bonusText.push(`血+${synergy.bonus.hp * 100}%`);
      
      synergyHtml += `
        <div class="synergy-badge">
          <span class="name">${name}</span>
          <span class="count">×${synergy.count}</span>
          <span class="bonus">${bonusText.join(' ')}</span>
        </div>
      `;
    });
    
    this.synergyDisplayEl.innerHTML = synergyHtml;
  }

  bindEvents() {
    this.addTapListener(this.battleBackBtn, () => this.returnToMain());
    this.addTapListener(this.battleModeEl, () => {
      this.isAutoMode = !this.isAutoMode;
      this.battleModeEl.textContent = this.isAutoMode ? '🤖 自动' : '👆 手动';
      this.battleModeEl.style.color = this.isAutoMode ? '#4CAF50' : '#ff9800';
    });
  }

  addTapListener(element: HTMLElement, callback: () => void) {
    let isTouched = false;
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isTouched = true;
      callback();
    }, { passive: false });
    element.addEventListener('click', (e) => {
      if (!isTouched) {
        e.preventDefault();
        callback();
      }
      isTouched = false;
    });
  }

  // ==================== 场景绘制 ====================

  drawBackground() {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x2d3436, 0x2d3436, 0x1a1a2e, 0x1a1a2e, 1);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  // ==================== 单位创建 ====================

  createHeroUnits() {
    const user = DataManager.getCurrentUser();
    const level = user?.level || 1;
    
    // 创建英雄单位
    const hero: Unit = {
      id: 'hero',
      name: '英雄',
      isEnemy: false,
      index: 0,
      level: level,
      hp: 100 + level * 10,
      maxHp: 100 + level * 10,
      attack: 10 + level * 2,
      defense: 5,
      speed: 10,
      critRate: 0.1,
      critDamage: 2.0,
      sprite: '🧙'
    };
    
    this.heroUnits.push(hero);
    this.createUnitSprite(hero, 80, this.cameras.main.height / 2);
    
    // 添加生物单位
    this.createCreatureUnits();
  }
  
  createCreatureUnits() {
    const cm = this.getCreatureManager();
    const creatures = cm.getTeam();
    const synergies = cm.calculateSynergies();
    
    console.log('=== createCreatureUnits ===');
    console.log('生物数量:', creatures.length, '/', cm.getTeamSize(), '(英雄不算在生物上限内)');
    console.log('羁绊:', synergies.map(s => `${s.race}(${s.level})`).join(', '));
    
    if (creatures.length === 0) {
      console.log('没有生物，跳过创建');
      return;
    }
    
    const centerY = this.cameras.main.height / 2;
    const backX = 140;    // 后排X坐标（远离敌人）
    const frontX = 220;   // 前排X坐标（靠近敌人）
    
    // 分离前后排生物
    const frontCreatures: { creature: typeof creatures[0]; def: NonNullable<ReturnType<typeof getCreatureById>>; index: number }[] = [];
    const backCreatures: { creature: typeof creatures[0]; def: NonNullable<ReturnType<typeof getCreatureById>>; index: number }[] = [];
    
    creatures.forEach((creature, index) => {
      const def = getCreatureById(creature.creatureId);
      if (def) {
        if (def.position === 'front') {
          frontCreatures.push({ creature, def, index });
        } else {
          backCreatures.push({ creature, def, index });
        }
      }
    });
    
    console.log(`前排生物: ${frontCreatures.length}, 后排生物: ${backCreatures.length}`);
    
    // 根据生物数量动态计算Y间距，确保不超出屏幕
    const maxCreaturesInRow = Math.max(frontCreatures.length, backCreatures.length, 1);
    const availableHeight = this.cameras.main.height - 100;
    const ySpacing = Math.min(70, availableHeight / (maxCreaturesInRow + 1));
    
    console.log(`Y间距: ${ySpacing} (最大70, 可用高度: ${availableHeight})`);
    
    // 创建前排单位
    frontCreatures.forEach((item, i) => {
      const { creature, def } = item;
      const stats = cm.getCreatureStats(creature);
      if (!stats) return;
      
      const unit: Unit = {
        id: `creature_front_${i}`,
        name: def.name,
        isEnemy: false,
        index: this.heroUnits.length,
        level: def.tier,
        hp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        critRate: 0.05 + (creature.star * 0.02),
        critDamage: 1.5 + (creature.star * 0.2),
        sprite: def.icon
      };
      
      // 前排Y位置
      const y = centerY + (i - (frontCreatures.length - 1) / 2) * ySpacing;
      
      console.log(`创建前排单位: ${def.name} ★${creature.star} 位置(${frontX}, ${y})`);
      
      this.heroUnits.push(unit);
      this.createUnitSprite(unit, frontX, y);
    });
    
    // 创建后排单位
    backCreatures.forEach((item, i) => {
      const { creature, def } = item;
      const stats = cm.getCreatureStats(creature);
      if (!stats) return;
      
      const unit: Unit = {
        id: `creature_back_${i}`,
        name: def.name,
        isEnemy: false,
        index: this.heroUnits.length,
        level: def.tier,
        hp: stats.hp,
        maxHp: stats.hp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        critRate: 0.05 + (creature.star * 0.02),
        critDamage: 1.5 + (creature.star * 0.2),
        sprite: def.icon
      };
      
      // 后排Y位置
      const y = centerY + (i - (backCreatures.length - 1) / 2) * ySpacing;
      
      console.log(`创建后排单位: ${def.name} ★${creature.star} 位置(${backX}, ${y})`);
      
      this.heroUnits.push(unit);
      this.createUnitSprite(unit, backX, y);
    });
    
    console.log('生物单位创建完成，总数:', this.heroUnits.length);
  }

  createEnemyUnits() {
    // 根据大关卡和小关卡计算基础难度
    const baseCount = Math.min(1 + Math.floor(this.currentChapter / 3), 5);
    const baseHp = 50 + this.currentChapter * 30 + this.currentStage * 5;
    const baseAttack = 5 + this.currentChapter * 3 + this.currentStage;
    
    // 敌人肉鸽强化 - 根据玩家队伍强度调整
    const playerPower = this.calculatePlayerPower();
    const enemyBuffs = this.generateEnemyBuffs(playerPower);
    
    console.log(`敌人强化: 玩家战力=${playerPower}, 强化数量=${enemyBuffs.length}`);
    
    const count = baseCount + Math.floor(enemyBuffs.length / 3);  // 每3个强化+1个敌人
    const sprites = ['👺', '👹', '👻', '💀', '🧟'];
    
    for (let i = 0; i < count; i++) {
      // 应用肉鸽强化
      let hp = baseHp;
      let attack = baseAttack;
      let defense = 2;
      let critRate = 0.05;
      let critDamage = 1.5;
      let speed = 8 + Math.floor(this.currentChapter / 2);
      
      enemyBuffs.forEach(buff => {
        if (buff.type === 'hp') hp *= buff.value;
        if (buff.type === 'attack') attack *= buff.value;
        if (buff.type === 'defense') defense += buff.value;
        if (buff.type === 'crit') critRate += buff.value;
        if (buff.type === 'speed') speed *= buff.value;
      });
      
      const enemy: Unit = {
        id: `enemy_${i}`,
        name: `敌人${i + 1}`,
        isEnemy: true,
        index: i,
        level: this.currentChapter,
        hp: Math.floor(hp),
        maxHp: Math.floor(hp),
        attack: Math.floor(attack),
        defense: Math.floor(defense),
        speed: Math.floor(speed),
        critRate: Math.min(critRate, 0.5),  // 最高50%暴击
        critDamage: critDamage,
        sprite: sprites[i % sprites.length]
      };
      
      this.enemyUnits.push(enemy);
      
      const y = this.cameras.main.height / 2 - 60 + i * 70;
      this.createUnitSprite(enemy, this.cameras.main.width - 80, y);
    }
  }
  
  // 计算玩家战力
  calculatePlayerPower(): number {
    let power = 0;
    this.heroUnits.forEach(unit => {
      power += unit.hp + unit.attack * 10 + unit.defense * 5;
    });
    
    // 加上生物数量加成
    const creatures = this.getCreatureManager().getTeam();
    power += creatures.length * 50;
    
    // 加上星级加成
    creatures.forEach(c => {
      power += c.star * 30;
    });
    
    return power;
  }
  
  // 生成敌人肉鸽强化
  generateEnemyBuffs(playerPower: number): { type: string; value: number; name: string }[] {
    const buffs: { type: string; value: number; name: string }[] = [];
    
    // 根据小关卡数量生成强化（每个小关卡敌人获得1-2个强化）
    const buffCount = Math.min(this.currentStage, 8);
    
    const allBuffs = [
      { type: 'hp', value: 1.1, name: '生命+10%' },
      { type: 'hp', value: 1.15, name: '生命+15%' },
      { type: 'attack', value: 1.08, name: '攻击+8%' },
      { type: 'attack', value: 1.12, name: '攻击+12%' },
      { type: 'defense', value: 2, name: '护甲+2' },
      { type: 'defense', value: 3, name: '护甲+3' },
      { type: 'crit', value: 0.05, name: '暴击+5%' },
      { type: 'speed', value: 1.1, name: '速度+10%' },
    ];
    
    // 随机选择强化
    for (let i = 0; i < buffCount; i++) {
      const buff = allBuffs[Math.floor(Math.random() * allBuffs.length)];
      buffs.push(buff);
    }
    
    // 如果玩家战力很高，额外添加强化
    if (playerPower > 500) {
      buffs.push({ type: 'attack', value: 1.1, name: '精英攻击+10%' });
    }
    if (playerPower > 800) {
      buffs.push({ type: 'hp', value: 1.2, name: '精英生命+20%' });
    }
    
    return buffs;
  }

  createUnitSprite(unit: Unit, x: number, y: number) {
    // 创建容器
    unit.container = this.add.container(x, y);
    
    // 单位精灵
    const sprite = this.add.text(0, 0, unit.sprite, { fontSize: '40px' }).setOrigin(0.5);
    unit.container.add(sprite);
    
    // 血条背景
    const hpBarBg = this.add.graphics();
    hpBarBg.fillStyle(0x333333, 0.8);
    hpBarBg.fillRect(-30, -45, 60, 8);
    unit.container.add(hpBarBg);
    
    // 血条
    unit.hpBar = this.add.graphics();
    unit.container.add(unit.hpBar);
    
    // 血量文字
    unit.hpText = this.add.text(0, -55, `${unit.hp}`, {
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5);
    unit.container.add(unit.hpText);
    
    // 更新血条
    this.updateUnitHpBar(unit);
    
    // 待机动画
    this.tweens.add({
      targets: unit.container,
      y: y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  updateUnitHpBar(unit: Unit) {
    if (!unit.hpBar) return;
    
    unit.hpBar.clear();
    const percent = Math.max(0, unit.hp / unit.maxHp);
    const color = percent > 0.3 ? 0x44ff44 : 0xff4444;
    unit.hpBar.fillStyle(color, 1);
    unit.hpBar.fillRect(-30, -45, 60 * percent, 8);
    
    if (unit.hpText) {
      unit.hpText.setText(`${Math.floor(unit.hp)}`);
    }
  }

  // ==================== 战斗流程 ====================

  // 趣味战斗文本
  private readonly FUNNY_TEXTS = {
    crit: [
      "💥 暴击！狠狠地打了！",
      "💥 暴击！这一击让敌人怀疑人生！",
      "💥 暴击！伤害爆表！",
    ],
    kill: [
      "☠️ 退场了！",
      "☠️ 再见，不送！",
      "☠️ 下一辈子小心点！",
      "☠️ 凉了！",
    ],
    dodge: [
      "💨 挥空了！",
      "💨 完美闪避！",
      "💨 空气都打穿了！",
    ],
    synergy: {
      castle: "⚔️ 城堡羁绊！骑士精神觉醒！",
      necropolis: "💀 墓园羁绊！亡者归来！",
      inferno: "🔥 地狱羁绊！烈焰燃烧！",
      rampart: "🌲 森林羁绊！自然之力！",
      stronghold: "🪓 据点羁绊！野蛮狂暴！",
    },
    battleStart: [
      "⚔️ 战斗开始！冲冲冲！",
      "⚔️ 战斗开始！让他们看看实力！",
      "⚔️ 战斗开始！不要怂就是干！",
    ],
    victory: [
      "🏆 胜利！这波稳了！",
      "🏆 胜利！天下无敌！",
      "🏆 胜利！还有谁？！",
    ],
  };

  private getRandomText(category: keyof typeof this.FUNNY_TEXTS): string {
    const texts = this.FUNNY_TEXTS[category] as string[];
    return texts[Math.floor(Math.random() * texts.length)];
  }

  async startBattle() {
    console.log('=== startBattle 开始 ===');
    console.log('屏幕尺寸:', this.cameras.main.width, 'x', this.cameras.main.height);
    console.log('当前状态: currentStage=', this.currentStage, 'isBattleEnded=', this.isBattleEnded, 'isPaused=', this.isPaused);
    
    // 完全重置战斗状态
    this.isBattleEnded = false;
    this.isPaused = false;
    
    // 清理所有旧单位
    this.heroUnits.forEach(unit => {
      if (unit.container) {
        unit.container.destroy();
      }
    });
    this.heroUnits = [];
    
    this.enemyUnits.forEach(enemy => {
      if (enemy.container) {
        enemy.container.destroy();
      }
    });
    this.enemyUnits = [];
    
    console.log('所有单位已清理');
    
    // 创建英雄和生物单位
    this.createHeroUnits();
    
    // 创建敌人
    this.createEnemyUnits();
    
    console.log('单位创建完成 - 英雄+生物:', this.heroUnits.length, '敌人:', this.enemyUnits.length);
    this.heroUnits.forEach((h, i) => {
      console.log(`  [${i}] ${h.name} at (${h.container?.x}, ${h.container?.y})`);
    });
    
    this.addLog(this.getRandomText('battleStart') + ` 队伍: ${this.heroUnits.length}人`, '#ffd700');
    this.updateBattleUI();
    
    // 初始化技能
    if (this.skills.length === 0) {
      this.skills = [
        { id: 'fireball', name: '火球术', icon: '🔥', desc: '150%伤害', rarity: 'common', rarityText: '普通', triggerChance: 0.8, cooldown: 3, currentCooldown: 0, damageMultiplier: 1.5 },
        { id: 'critical', name: '暴击', icon: '💥', desc: '15%双倍伤害', rarity: 'rare', rarityText: '稀有', triggerChance: 0.15, cooldown: 0, currentCooldown: 0 }
      ];
    }
    
    // 开始回合循环
    await this.executeRound();
  }

  async executeRound() {
    console.log('executeRound 检查: isBattleEnded=', this.isBattleEnded, 'isPaused=', this.isPaused);
    if (this.isBattleEnded || this.isPaused) {
      console.log('executeRound 提前返回');
      return;
    }
    
    // 检查战斗结束
    if (this.checkBattleEnd()) return;
    
    // 获取所有存活单位并按速度排序
    const allUnits = [...this.heroUnits, ...this.enemyUnits].filter(u => u.hp > 0);
    const actionOrder = this.sortBySpeed(allUnits);
    
    // 依次执行行动
    for (const unit of actionOrder) {
      if (unit.hp <= 0 || this.isBattleEnded || this.isPaused) continue;
      
      await this.executeUnitAction(unit);
      
      // 检查战斗结束
      if (this.checkBattleEnd()) return;
    }
    
    // 更新冷却
    this.updateCooldowns();
    
    // 更新UI
    this.updateBattleUI();
    
    // 短暂停顿后下一回合
    await this.delay(ANIM.roundGap);
    
    // 递归执行下一回合
    if (!this.isBattleEnded && !this.isPaused) {
      await this.executeRound();
    }
  }

  sortBySpeed(units: Unit[]): Unit[] {
    return [...units].sort((a, b) => {
      if (a.speed !== b.speed) return b.speed - a.speed;
      if (a.level !== b.level) return b.level - a.level;
      return Math.random() - 0.5;
    });
  }

  async executeUnitAction(unit: Unit) {
    // 选择目标
    const enemies = unit.isEnemy ? this.heroUnits : this.enemyUnits;
    const target = this.selectTarget(unit, enemies);
    
    if (!target) return;
    
    // 尝试使用技能
    const skill = this.tryUseSkill(unit);
    
    if (skill && skill.damageMultiplier) {
      await this.executeSkillAttack(unit, target, skill);
    } else {
      await this.executeBasicAttack(unit, target);
    }
  }

  selectTarget(attacker: Unit, enemies: Unit[]): Unit | null {
    const alive = enemies.filter(e => e.hp > 0);
    if (alive.length === 0) return null;
    
    // 获取前排（index最小）
    const minIndex = Math.min(...alive.map(e => e.index));
    const frontRow = alive.filter(e => e.index === minIndex);
    
    // 优先对位
    const samePos = frontRow.find(e => e.index === attacker.index);
    if (samePos) return samePos;
    
    // 同排最近
    const nearest = frontRow.sort((a, b) => 
      Math.abs(a.index - attacker.index) - Math.abs(b.index - attacker.index)
    )[0];
    if (nearest) return nearest;
    
    // 随机
    return frontRow[Math.floor(Math.random() * frontRow.length)];
  }

  tryUseSkill(_unit: Unit): Skill | null {
    const available = this.skills.filter(s => 
      s.currentCooldown === 0 && Math.random() < s.triggerChance
    );
    return available.length > 0 ? available[0] : null;
  }

  // ==================== 攻击动画 ====================

  async executeBasicAttack(attacker: Unit, target: Unit) {
    const damage = this.calculateDamage(attacker, target);
    const isCrit = Math.random() < attacker.critRate;
    const finalDamage = isCrit ? Math.floor(damage * attacker.critDamage) : damage;
    
    // 近战动画
    await this.playMeleeAttack(attacker, target, finalDamage, isCrit);
    
    // 应用伤害
    await this.applyDamage(target, finalDamage, attacker);
  }

  async executeSkillAttack(attacker: Unit, target: Unit, skill: Skill) {
    const damage = this.calculateDamage(attacker, target) * (skill.damageMultiplier || 1);
    const finalDamage = Math.floor(damage);
    
    this.addLog(`${skill.icon} ${skill.name}！`, '#ff9800');
    
    // 远程动画（火球）
    await this.playRangedAttack(attacker, target, finalDamage, skill.icon);
    
    // 设置冷却
    skill.currentCooldown = skill.cooldown;
    
    // 应用伤害
    await this.applyDamage(target, finalDamage, attacker);
  }

  calculateDamage(attacker: Unit, target: Unit): number {
    const baseDamage = attacker.attack;
    const defense = target.defense;
    return Math.max(1, Math.floor(baseDamage - defense * 0.5));
  }

  async playMeleeAttack(attacker: Unit, target: Unit, damage: number, isCrit: boolean) {
    if (!attacker.container || !target.container) return;
    
    const originalX = attacker.container.x;
    const originalY = attacker.container.y;
    const targetX = target.container.x - 50;
    const targetY = target.container.y;  // 保持与目标同一水平线
    
    // 跳到目标前
    await this.tweenPromise(attacker.container, {
      x: targetX,
      y: targetY,
      duration: ANIM.melee.jumpTo,
      ease: 'Quad.easeOut'
    });
    
    // 显示伤害数字
    this.showDamageNumber(target, damage, isCrit);
    
    // 暴击趣味文本
    if (isCrit) {
      this.addLog(this.getRandomText('crit'), '#ff4444');
    }
    
    // 目标抖动
    this.tweens.add({
      targets: target.container,
      x: target.container.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3
    });
    
    // 跳回原位
    await this.tweenPromise(attacker.container, {
      x: originalX,
      y: originalY,
      duration: ANIM.melee.jumpBack,
      ease: 'Quad.easeIn'
    });
  }

  async playRangedAttack(attacker: Unit, target: Unit, damage: number, icon: string) {
    if (!attacker.container || !target.container) return;
    
    // 前摇
    await this.tweenPromise(attacker.container, {
      scale: 1.1,
      duration: ANIM.ranged.windup,
      yoyo: true
    });
    
    // 创建投射物
    const projectile = this.add.text(
      attacker.container.x,
      attacker.container.y,
      icon,
      { fontSize: '24px' }
    ).setOrigin(0.5);
    
    // 飞行
    await this.tweenPromise(projectile, {
      x: target.container.x,
      y: target.container.y,
      duration: 200,
      ease: 'Linear'
    });
    
    // 命中
    this.showDamageNumber(target, damage, false);
    projectile.destroy();
    
    // 目标闪烁
    await this.tweenPromise(target.container, {
      alpha: 0.5,
      duration: 50,
      yoyo: true,
      repeat: 2
    });
  }

  showDamageNumber(unit: Unit, damage: number, isCrit: boolean) {
    if (!unit.container) return;
    
    const color = isCrit ? '#ff9800' : '#ffffff';
    const size = isCrit ? '20px' : '16px';
    
    const text = this.add.text(
      unit.container.x,
      unit.container.y - 30,
      `-${damage}`,
      { fontSize: size, color, fontStyle: 'bold' }
    ).setOrigin(0.5);
    
    // 飘字动画
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: ANIM.damageNumber,
      ease: 'Quad.out',
      onComplete: () => text.destroy()
    });
  }

  async applyDamage(target: Unit, damage: number, attacker: Unit) {
    target.hp = Math.max(0, target.hp - damage);
    this.updateUnitHpBar(target);
    
    const critText = damage > attacker.attack * 1.5 ? '💥' : '';
    this.addLog(`${attacker.name} → ${target.name} ${damage}${critText}`, attacker.isEnemy ? '#ff4444' : '#4CAF50');
    
    if (target.hp <= 0) {
      // 击杀趣味文本
      this.addLog(`${target.name} ${this.getRandomText('kill')}`, target.isEnemy ? '#9c27b0' : '#f44336');
      await this.playDeath(target);
      
      // 奖励（仅敌人死亡时）
      if (target.isEnemy) {
        const goldReward = 10 + this.currentChapter * 5 + this.currentStage;
        const expReward = 5 + this.currentChapter * 3 + this.currentStage;
        this.gold += goldReward;
        this.exp += expReward;
        this.stageGold += goldReward;  // 记录当前小关卡奖励
        this.stageExp += expReward;
        this.addLog(`💰 +${goldReward} ⚡ +${expReward}`, '#ffd700');
        this.checkLevelUp();
      }
    }
  }

  async playDeath(unit: Unit) {
    if (!unit.container) return;
    
    await this.tweenPromise(unit.container, {
      alpha: 0,
      scale: 1.5,
      duration: ANIM.death
    });
    
    unit.container.destroy();
  }

  // ==================== 辅助方法 ====================

  tweenPromise(target: any, props: any): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        targets: target,
        ...props,
        onComplete: () => resolve()
      });
    });
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.time.delayedCall(ms, () => resolve());
    });
  }

  updateCooldowns() {
    this.skills.forEach(s => {
      if (s.currentCooldown > 0) s.currentCooldown--;
    });
  }

  // ==================== 战斗结果 ====================

  checkBattleEnd(): boolean {
    const heroAlive = this.heroUnits.some(u => u.hp > 0);
    const enemyAlive = this.enemyUnits.some(u => u.hp > 0);
    
    // 如果没有敌人，说明战斗还没开始或已经结束
    if (this.enemyUnits.length === 0) {
      console.log('checkBattleEnd: 敌人数量为0，跳过检查');
      return false;
    }
    
    if (!heroAlive) {
      this.battleDefeat();
      return true;
    }
    
    if (!enemyAlive) {
      this.battleVictory();
      return true;
    }
    
    return false;
  }

  async battleVictory() {
    this.isBattleEnded = true;
    
    // 胜利趣味文本
    this.addLog(this.getRandomText('victory'), '#ffd700');
    
    if (this.currentStage >= STAGES_PER_CHAPTER) {
      // 大关卡通过！
      await this.delay(500);
      this.showChapterComplete();
    } else {
      // 小关卡通过，显示肉鸽选择
      this.showStageComplete();
    }
  }

  showStageComplete() {
    this.isPaused = true;
    
    // 更新显示
    this.levelCompleteText.textContent = `第 ${this.currentChapter}-${this.currentStage} 关完成 (${this.currentStage}/${STAGES_PER_CHAPTER})`;
    this.levelGoldEl.textContent = this.stageGold.toString();
    this.levelExpEl.textContent = this.stageExp.toString();
    
    // 生成混合选项（奖励+生物）
    const options = this.generateMixedRewardOptions();
    this.levelSkillOptionsEl.innerHTML = '';
    
    options.forEach((option: any) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'skill-option';
      
      if (option.type === 'creature') {
        // 生物选项
        const creature = option.creature;
        const raceName = RACE_NAMES[creature.race as keyof typeof RACE_NAMES] || creature.race;
        const starText = option.isUpgrade 
          ? `${'★'.repeat(option.fromStar)} → ${'★'.repeat(option.toStar)}`
          : '★';
        
        optionEl.innerHTML = `
          <div class="skill-option-icon">${creature.icon}</div>
          <div class="skill-option-info">
            <div class="skill-option-name">${creature.name} ${starText}</div>
            <div class="skill-option-desc">${raceName} ${creature.tier}级 ${option.isUpgrade ? '升星' : '新生物'}</div>
          </div>
          <div class="skill-option-rarity ${this.getTierRarity(creature.tier)}">${this.getTierRarityText(creature.tier)}</div>
        `;
      } else {
        // 技能/奖励选项
        optionEl.innerHTML = `
          <div class="skill-option-icon">${option.icon}</div>
          <div class="skill-option-info">
            <div class="skill-option-name">${option.name}</div>
            <div class="skill-option-desc">${option.desc}</div>
          </div>
          <div class="skill-option-rarity ${option.rarity}">${option.rarityText}</div>
        `;
      }
      
      let isTouched = false;
      optionEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isTouched = true;
        this.selectMixedReward(option);
      }, { passive: false });
      optionEl.addEventListener('click', (e) => {
        if (!isTouched) {
          e.preventDefault();
          this.selectMixedReward(option);
        }
        isTouched = false;
      });
      
      this.levelSkillOptionsEl.appendChild(optionEl);
    });
    
    this.levelCompleteOverlay.classList.add('active');
  }
  
  getTierRarity(tier: number): string {
    if (tier >= 7) return 'legendary';
    if (tier >= 6) return 'epic';
    if (tier >= 4) return 'rare';
    return 'common';
  }
  
  getTierRarityText(tier: number): string {
    if (tier >= 7) return '传说';
    if (tier >= 6) return '史诗';
    if (tier >= 4) return '稀有';
    return '普通';
  }

  generateMixedRewardOptions() {
    const options: any[] = [];
    
    // 1-2个生物选项
    const creatureChoices = this.getCreatureManager().generateChoices();
    console.log('生成生物选项:', creatureChoices.length, creatureChoices);
    
    if (creatureChoices.length > 0) {
      const creatureCount = Math.random() < 0.7 ? 2 : 1;  // 70%概率2个生物选项
      for (let i = 0; i < Math.min(creatureCount, creatureChoices.length); i++) {
        const choice = creatureChoices[i];
        options.push({
          type: 'creature',
          creature: choice.creature,
          isUpgrade: choice.type === 'upgrade',
          fromStar: choice.fromStar,
          toStar: choice.toStar,
        });
      }
    }
    
    // 剩余用技能/奖励填充
    const allRewards = [
      { id: 'heal_full', name: '完全恢复', icon: '💚', desc: 'HP恢复至满', rarity: 'common', rarityText: '普通', healFull: true },
      { id: 'attack_up', name: '力量提升', icon: '⚔️', desc: '攻击+15%', rarity: 'common', rarityText: '普通', attackBonus: 0.15 },
      { id: 'hp_up', name: '生命强化', icon: '❤️', desc: '最大HP+20%', rarity: 'common', rarityText: '普通', hpBonus: 0.2 },
      { id: 'speed_up', name: '急速', icon: '⚡', desc: '速度+20%', rarity: 'rare', rarityText: '稀有', speedBonus: 0.2 },
      { id: 'crit_up', name: '暴击精通', icon: '💥', desc: '暴击率+10%', rarity: 'rare', rarityText: '稀有', critBonus: 0.1 },
      { id: 'lifesteal', name: '生命偷取', icon: '🩸', desc: '攻击回复5%HP', rarity: 'epic', rarityText: '史诗', lifesteal: 0.05 },
      { id: 'double_attack', name: '连击', icon: '🎯', desc: '15%几率攻击两次', rarity: 'epic', rarityText: '史诗', doubleChance: 0.15 },
    ];
    
    const shuffled = [...allRewards].sort(() => Math.random() - 0.5);
    while (options.length < 3 && shuffled.length > 0) {
      options.push({ type: 'reward', ...shuffled.shift() });
    }
    
    return options.slice(0, 3);
  }

  selectMixedReward(option: any) {
    console.log('=== selectMixedReward ===', option);
    this.levelCompleteOverlay.classList.remove('active');
    
    if (option.type === 'creature') {
      // 选择生物
      console.log('选择生物:', option.creature.id, option.creature.name);
      const result = this.getCreatureManager().addCreature(option.creature.id);
      console.log('添加结果:', result);
      if (result.success) {
        this.addLog(`🎉 ${result.message}`, '#4CAF50');
        this.getCreatureManager().saveToRun();
      } else {
        this.addLog(`❌ ${result.message}`, '#ff4444');
      }
    } else {
      // 选择奖励（应用原有逻辑）
      console.log('选择奖励:', option.id);
      this.applyReward(option);
    }
    
    // 保存进度并进入下一小关卡
    this.currentStage++;
    this.stageGold = 0;
    this.stageExp = 0;
    
    this.saveRun('ongoing');
    this.updateBattleUI();
    
    this.addLog(`➡️ 进入第 ${this.currentChapter}-${this.currentStage} 关`, '#667eea');
    console.log('准备开始下一场战斗, currentStage:', this.currentStage, 'STAGES_PER_CHAPTER:', STAGES_PER_CHAPTER);
    this.isPaused = false;
    
    if (this.currentStage <= STAGES_PER_CHAPTER) {
      console.log('调用 startBattle()');
      this.delay(500).then(() => {
        this.startBattle();
      });
    } else {
      console.log('已超过最大关卡数，不调用 startBattle()');
    }
  }
  
  applyReward(reward: any) {
    // 应用奖励
    if (reward.healFull) {
      this.heroUnits.forEach(h => h.hp = h.maxHp);
      this.addLog('💚 HP完全恢复！', '#4CAF50');
    }
    if (reward.attackBonus) {
      this.heroUnits.forEach(h => h.attack *= (1 + reward.attackBonus));
      this.addLog('⚔️ 攻击力提升！', '#ff9800');
    }
    if (reward.hpBonus) {
      this.heroUnits.forEach(h => {
        h.maxHp = Math.floor(h.maxHp * (1 + reward.hpBonus));
        h.hp = h.maxHp;
      });
      this.addLog('❤️ 最大HP提升！', '#ff4444');
    }
    if (reward.speedBonus) {
      this.heroUnits.forEach(h => h.speed *= (1 + reward.speedBonus));
      this.addLog('⚡ 速度提升！', '#ffd700');
    }
    if (reward.critBonus) {
      this.heroUnits.forEach(h => h.critRate += reward.critBonus);
      this.addLog('💥 暴击率提升！', '#ff9800');
    }
    if (reward.skillBonus) {
      const skill = this.skills.find(s => s.id === reward.skillBonus.skillId);
      if (skill && skill.damageMultiplier) {
        skill.damageMultiplier += reward.skillBonus.damageAdd;
      }
      this.addLog('🔥 技能强化！', '#ff9800');
    }
  }

  showChapterComplete() {
    // 大关卡通过！
    const user = DataManager.getCurrentUser();
    if (user) {
      user.gold += this.gold;
      user.statistics.totalRuns++;
      // 更新最高大关卡
      user.statistics.bestLevel = Math.max(user.statistics.bestLevel || 0, this.currentChapter);
      DataManager.updateUserData(user);
      console.log(`大关卡 ${this.currentChapter} 通过！最高大关卡: ${user.statistics.bestLevel}`);
    }
    
    // 清空生物队伍（新大关卡重新开始肉鸽）
    this.getCreatureManager().clear();
    CreatureManager.resetInstance();
    console.log('生物队伍已清空，新大关卡重新开始肉鸽');
    
    // 清除冒险数据
    DataManager.clearRunData();
    
    this.showResult(`🎉 第 ${this.currentChapter} 大关卡通关！`, true);
  }

  battleDefeat() {
    this.isBattleEnded = true;
    this.showResult('💀 战斗失败', false);
  }

  showResult(message: string, isVictory: boolean) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 遮罩
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    
    // 结果文字
    const color = isVictory ? '#4CAF50' : '#ff4444';
    this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '32px',
      color
    }).setOrigin(0.5);
    
    // 奖励
    this.add.text(width / 2, height / 2, `获得: ${this.gold}💰 ${this.exp}⚡`, {
      fontSize: '20px',
      color: '#ffd700'
    }).setOrigin(0.5);
    
    // 返回按钮
    const btn = this.add.rectangle(width / 2, height / 2 + 80, 150, 50, 0x667eea);
    this.add.text(width / 2, height / 2 + 80, '返回主界面', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.returnToMain(isVictory));
    
    this.saveRun(isVictory ? 'completed' : 'failed');
  }

  // ==================== 升级 ====================

  checkLevelUp() {
    const user = DataManager.getCurrentUser();
    if (!user) return;
    
    const expNeeded = user.level * 100;
    if (this.exp >= expNeeded) {
      this.exp -= expNeeded;
      user.level++;
      
      // 提升英雄属性
      this.heroUnits.forEach(hero => {
        hero.maxHp += 10;
        hero.hp = hero.maxHp;
        hero.attack += 2;
      });
      
      this.addLog(`🎉 升级！等级 ${user.level}`, '#ffd700');
      this.updateBattleUI();
      this.showSkillSelection(user.level);
    }
  }

  showSkillSelection(level: number) {
    this.isPaused = true;
    
    this.skillSelectLevelEl.textContent = `达到等级 ${level}`;
    
    const allSkills = [
      { id: 'fireball2', name: '火球术强化', icon: '🔥', desc: '火球术伤害+20%', rarity: 'common', rarityText: '普通', statBonus: { stat: 'fireballDamage', value: 0.2 } },
      { id: 'critical2', name: '暴击精通', icon: '💥', desc: '暴击率+5%', rarity: 'rare', rarityText: '稀有', statBonus: { stat: 'critRate', value: 0.05 } },
      { id: 'heal', name: '生命回复', icon: '💚', desc: '立即恢复30%HP', rarity: 'common', rarityText: '普通', healPercent: 0.3 },
      { id: 'attack', name: '力量提升', icon: '⚔️', desc: '基础攻击+10%', rarity: 'common', rarityText: '普通', statBonus: { stat: 'attack', value: 0.1 } },
      { id: 'defense', name: '铁壁', icon: '🛡️', desc: '受到伤害-10%', rarity: 'rare', rarityText: '稀有' },
      { id: 'speed', name: '急速', icon: '⚡', desc: '速度+15%', rarity: 'rare', rarityText: '稀有', statBonus: { stat: 'speed', value: 0.15 } },
      { id: 'lifesteal', name: '生命偷取', icon: '🩸', desc: '攻击回复5%HP', rarity: 'epic', rarityText: '史诗' },
      { id: 'doublehit', name: '连击', icon: '🎯', desc: '10%几率攻击两次', rarity: 'epic', rarityText: '史诗' },
      { id: 'rage', name: '狂暴', icon: '😤', desc: 'HP<30%时伤害+50%', rarity: 'legendary', rarityText: '传说' },
    ];
    
    const shuffled = [...allSkills].sort(() => Math.random() - 0.5).slice(0, 3);
    
    this.skillOptionsEl.innerHTML = '';
    shuffled.forEach(skill => {
      const option = document.createElement('div');
      option.className = 'skill-option';
      option.innerHTML = `
        <div class="skill-option-icon">${skill.icon}</div>
        <div class="skill-option-info">
          <div class="skill-option-name">${skill.name}</div>
          <div class="skill-option-desc">${skill.desc}</div>
        </div>
        <div class="skill-option-rarity ${skill.rarity}">${skill.rarityText}</div>
      `;
      
      let isTouched = false;
      option.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isTouched = true;
        this.selectSkill(skill);
      }, { passive: false });
      option.addEventListener('click', (e) => {
        if (!isTouched) {
          e.preventDefault();
          this.selectSkill(skill);
        }
        isTouched = false;
      });
      
      this.skillOptionsEl.appendChild(option);
    });
    
    this.skillSelectOverlay.classList.add('active');
  }

  selectSkill(skill: any) {
    this.skillSelectOverlay.classList.remove('active');
    
    // 应用效果
    if (skill.healPercent) {
      this.heroUnits.forEach(hero => {
        hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * skill.healPercent);
        this.updateUnitHpBar(hero);
      });
      this.addLog('💚 恢复 30% HP！', '#4CAF50');
    }
    
    if (skill.statBonus) {
      const { stat, value } = skill.statBonus;
      if (stat === 'attack') {
        this.heroUnits.forEach(h => h.attack *= (1 + value));
      } else if (stat === 'speed') {
        this.heroUnits.forEach(h => h.speed *= (1 + value));
      } else if (stat === 'critRate') {
        this.heroUnits.forEach(h => h.critRate += value);
      } else if (stat === 'fireballDamage') {
        const fireball = this.skills.find(s => s.id === 'fireball');
        if (fireball && fireball.damageMultiplier) {
          fireball.damageMultiplier += value;
        }
      }
      this.addLog(`${skill.icon} ${skill.name}！`, '#ffd700');
    }
    
    this.updateBattleUI();
    this.isPaused = false;
  }

  // ==================== 数据保存 ====================

  saveRun(status: 'ongoing' | 'completed' | 'failed') {
    const user = DataManager.getCurrentUser();
    if (!user) return;
    
    const totalHp = this.heroUnits.reduce((sum, u) => sum + u.hp, 0);
    const totalMaxHp = this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0);
    
    const run: RunData = {
      runId: `run_${Date.now()}`,
      heroId: 'warrior',
      heroLevel: this.currentChapter,  // 用 heroLevel 存储大关卡
      currentLevel: this.currentStage, // currentLevel 存储小关卡
      currentHp: Math.floor(totalHp),
      maxHp: totalMaxHp,
      skills: this.skills,
      equipment: [],
      gold: this.gold,
      exp: this.exp,
      startTime: Date.now(),
      status,
      levelsCompleted: [],
      creatures: [],  // TODO: 从队伍中获取
      teamSize: 5,
    };
    
    if (status === 'completed' || status === 'failed') {
      user.gold += this.gold;
      user.statistics.totalRuns++;
      DataManager.updateUserData(user);
      DataManager.clearRunData();
    } else {
      // 保存当前大关卡和小关卡
      DataManager.saveRunData(run);
    }
  }

  returnToMain(_isVictory?: boolean) {
    // 中途退出保存进度
    const user = DataManager.getCurrentUser();
    if (user && !_isVictory) {
      // 保存当前冒险进度（大关卡+小关卡+强化）
      const run: RunData = {
        runId: `run_${Date.now()}`,
        heroId: 'warrior',
        heroLevel: this.currentChapter,  // 保存大关卡
        currentLevel: this.currentStage, // 保存小关卡
        currentHp: this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0), // 恢复满血
        maxHp: this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0),
        skills: this.skills,
        equipment: [],
        gold: this.gold,
        exp: this.exp,
        startTime: Date.now(),
        status: 'ongoing',
        levelsCompleted: [],
        creatures: [],  // TODO: 从队伍中获取
        teamSize: 5,
      };
      DataManager.saveRunData(run);
      console.log(`中途退出，保存进度: 第${this.currentChapter}-${this.currentStage}关`);
    }
    
    this.hideUI('battle-ui');
    this.scene.start('MainScene');
  }

  addLog(message: string, color: string = '#ffffff') {
    this.battleLog.push(message);
    if (this.battleLog.length > 3) this.battleLog.shift();
    
    this.battleLogEl.innerHTML = this.battleLog
      .map(log => `<span style="color:${color}">${log}</span>`)
      .join('<br>');
  }

  shutdown() {
    this.hideUI('battle-ui');
    if (this.skillSelectOverlay) {
      this.skillSelectOverlay.classList.remove('active');
    }
    console.log('=== BattleScene shutdown ===');
  }
}
