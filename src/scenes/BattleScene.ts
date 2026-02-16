import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';
import type { RunData } from '../utils/DataManager';

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

  constructor() {
    super({ key: 'BattleScene' });
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
        this.currentStage = run.currentLevel;  // currentLevel 存的是小关卡
        this.gold = run.gold;
        this.exp = run.exp;
        this.skills = run.skills || [];
      }
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
    const baseHp = 100 + level * 10;
    const baseAttack = 10 + level * 2;
    
    // 创建一个英雄单位
    const hero: Unit = {
      id: 'hero_0',
      name: '英雄',
      isEnemy: false,
      index: 0,
      level: level,
      hp: baseHp,
      maxHp: baseHp,
      attack: baseAttack,
      defense: 5,
      speed: 10,
      critRate: 0.1,
      critDamage: 2.0,
      sprite: '🧙'
    };
    
    this.heroUnits.push(hero);
    this.createUnitSprite(hero, 80, this.cameras.main.height / 2);
  }

  createEnemyUnits() {
    // 根据大关卡和小关卡计算难度
    const count = Math.min(1 + Math.floor(this.currentChapter / 3), 5);
    const baseHp = 50 + this.currentChapter * 30 + this.currentStage * 5;
    const baseAttack = 5 + this.currentChapter * 3 + this.currentStage;
    
    const sprites = ['👺', '👹', '👻', '💀', '🧟'];
    
    for (let i = 0; i < count; i++) {
      const enemy: Unit = {
        id: `enemy_${i}`,
        name: `敌人${i + 1}`,
        isEnemy: true,
        index: i,
        level: this.currentChapter,
        hp: baseHp,
        maxHp: baseHp,
        attack: baseAttack,
        defense: 2,
        speed: 8 + Math.floor(this.currentChapter / 2),
        critRate: 0.05,
        critDamage: 1.5,
        sprite: sprites[i % sprites.length]
      };
      
      this.enemyUnits.push(enemy);
      
      const y = this.cameras.main.height / 2 - 60 + i * 70;
      this.createUnitSprite(enemy, this.cameras.main.width - 80, y);
    }
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

  async startBattle() {
    this.addLog('⚔️ 战斗开始！', '#ffd700');
    
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
    if (this.isBattleEnded || this.isPaused) return;
    
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
    const targetX = target.container.x - 50;
    
    // 跳到目标前
    await this.tweenPromise(attacker.container, {
      x: targetX,
      duration: ANIM.melee.jumpTo,
      ease: 'Quad.easeOut'
    });
    
    // 显示伤害数字
    this.showDamageNumber(target, damage, isCrit);
    
    // 目标抖动
    this.tweens.add({
      targets: target.container,
      x: target.container.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 3
    });
    
    // 跳回
    await this.tweenPromise(attacker.container, {
      x: originalX,
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
      await this.playDeath(target);
      
      // 奖励（仅敌人死亡时）
      if (target.isEnemy) {
        const goldReward = 10 + this.currentChapter * 5 + this.currentStage;
        const expReward = 5 + this.currentChapter * 3 + this.currentStage;
        this.gold += goldReward;
        this.exp += expReward;
        this.stageGold += goldReward;  // 记录当前小关卡奖励
        this.stageExp += expReward;
        this.addLog(`💀 +${goldReward}💰 +${expReward}⚡`, '#ffd700');
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
    
    // 生成技能选项
    const skills = this.generateLevelRewardOptions();
    this.levelSkillOptionsEl.innerHTML = '';
    
    skills.forEach(skill => {
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
        this.selectLevelReward(skill);
      }, { passive: false });
      option.addEventListener('click', (e) => {
        if (!isTouched) {
          e.preventDefault();
          this.selectLevelReward(skill);
        }
        isTouched = false;
      });
      
      this.levelSkillOptionsEl.appendChild(option);
    });
    
    this.levelCompleteOverlay.classList.add('active');
  }

  generateLevelRewardOptions() {
    const allRewards = [
      { id: 'heal_full', name: '完全恢复', icon: '💚', desc: 'HP恢复至满', rarity: 'common', rarityText: '普通', healFull: true },
      { id: 'attack_up', name: '力量提升', icon: '⚔️', desc: '攻击+15%', rarity: 'common', rarityText: '普通', attackBonus: 0.15 },
      { id: 'hp_up', name: '生命强化', icon: '❤️', desc: '最大HP+20%', rarity: 'common', rarityText: '普通', hpBonus: 0.2 },
      { id: 'speed_up', name: '急速', icon: '⚡', desc: '速度+20%', rarity: 'rare', rarityText: '稀有', speedBonus: 0.2 },
      { id: 'crit_up', name: '暴击精通', icon: '💥', desc: '暴击率+10%', rarity: 'rare', rarityText: '稀有', critBonus: 0.1 },
      { id: 'fireball_enhance', name: '火球术强化', icon: '🔥', desc: '火球伤害+30%', rarity: 'rare', rarityText: '稀有', skillBonus: { skillId: 'fireball', damageAdd: 0.3 } },
      { id: 'lifesteal', name: '生命偷取', icon: '🩸', desc: '攻击回复5%HP', rarity: 'epic', rarityText: '史诗', lifesteal: 0.05 },
      { id: 'double_attack', name: '连击', icon: '🎯', desc: '15%几率攻击两次', rarity: 'epic', rarityText: '史诗', doubleChance: 0.15 },
      { id: 'rage', name: '狂暴', icon: '😤', desc: 'HP<30%时伤害+50%', rarity: 'legendary', rarityText: '传说', rage: true },
    ];
    
    const shuffled = [...allRewards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  selectLevelReward(reward: any) {
    this.levelCompleteOverlay.classList.remove('active');
    
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
    
    // 保存进度并进入下一小关卡
    this.currentStage++;
    this.stageGold = 0;
    this.stageExp = 0;
    
    this.saveRun('ongoing');
    this.updateBattleUI();
    
    this.addLog(`➡️ 进入第 ${this.currentChapter}-${this.currentStage} 关`, '#667eea');
    
    // 重新开始场景
    this.time.delayedCall(500, () => {
      this.scene.restart({ continue: true });
    });
  }

  showChapterComplete() {
    // 大关卡通过！
    const user = DataManager.getCurrentUser();
    if (user) {
      user.gold += this.gold;
      user.statistics.totalRuns++;
      user.statistics.bestLevel = Math.max(user.statistics.bestLevel, this.currentChapter);
      DataManager.updateUserData(user);
    }
    
    // 清除冒险数据，准备下一大关卡
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
      heroLevel: user.level,
      currentLevel: this.currentStage,  // 存储小关卡
      currentHp: Math.floor(totalHp),
      maxHp: totalMaxHp,
      skills: this.skills,
      equipment: [],
      gold: this.gold,
      exp: this.exp,
      startTime: Date.now(),
      status,
      levelsCompleted: []
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
    // 只保存已获得的技能和属性加成
    const user = DataManager.getCurrentUser();
    if (user && !_isVictory) {
      // 保存技能（肉鸽获得的强化）
      const run: RunData = {
        runId: `run_${Date.now()}`,
        heroId: 'warrior',
        heroLevel: user.level,
        currentLevel: this.currentStage, // 保持当前小关卡，下次重新打
        currentHp: this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0), // 恢复满血
        maxHp: this.heroUnits.reduce((sum, u) => sum + u.maxHp, 0),
        skills: this.skills,
        equipment: [],
        gold: this.gold,
        exp: this.exp,
        startTime: Date.now(),
        status: 'ongoing',
        levelsCompleted: []
      };
      DataManager.saveRunData(run);
      console.log('中途退出，保存进度，下次从第', this.currentChapter, '-', this.currentStage, '关重新开始');
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
