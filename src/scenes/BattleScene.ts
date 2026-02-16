import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';
import type { RunData } from '../utils/DataManager';

interface Skill {
  id: string;
  name: string;
  icon: string;
  type: 'active' | 'passive';
  description: string;
  cooldown?: number;
  chance?: number;
  damage?: number;
  level: number;
}

export default class BattleScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Container;
  private enemies: Phaser.GameObjects.Container[] = [];
  private skills: Skill[] = [];
  private currentLevel: number = 1;
  private heroHp: number = 100;
  private heroMaxHp: number = 100;
  private gold: number = 0;
  private exp: number = 0;
  private isAutoMode: boolean = true;
  private battleLog: string[] = [];
  
  // UI 元素
  private battleLevelEl!: HTMLElement;
  private battleHpFillEl!: HTMLElement;
  private battleHpTextEl!: HTMLElement;
  private battleGoldEl!: HTMLElement;
  private battleExpEl!: HTMLElement;
  private battleLogEl!: HTMLElement;
  private battleModeEl!: HTMLElement;
  private battleBackBtn!: HTMLElement;
  
  // 技能选择 UI
  private skillSelectOverlay!: HTMLElement;
  private skillOptionsEl!: HTMLElement;
  private skillSelectLevelEl!: HTMLElement;
  private isPaused: boolean = false;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { continue: boolean }) {
    console.log('=== BattleScene init ===', data);
    
    if (data.continue) {
      const run = DataManager.getCurrentRun();
      if (run) {
        this.currentLevel = run.currentLevel;
        this.heroHp = run.currentHp;
        this.heroMaxHp = run.maxHp;
        this.gold = run.gold;
        this.exp = run.exp;
        this.skills = run.skills;
      }
    }
  }

  create() {
    console.log('=== BattleScene create ===');
    
    // 显示战斗 UI
    this.showUI('battle-ui');
    
    // 获取 UI 元素
    this.initUIElements();
    
    // 更新 UI 显示
    this.updateBattleUI();
    
    // 绑定事件
    this.bindEvents();
    
    // 绘制背景
    this.drawBackground();
    
    // 创建战斗区域
    this.createBattleArea();
    
    // 生成敌人
    this.spawnEnemies();
    
    // 开始战斗
    this.startBattle();
  }

  showUI(uiId: string) {
    // 隐藏所有 UI
    document.querySelectorAll('.ui-container').forEach(ui => {
      ui.classList.remove('active');
    });
    
    // 显示目标 UI
    const targetUI = document.getElementById(uiId);
    if (targetUI) {
      targetUI.classList.add('active');
    }
  }

  hideUI(uiId: string) {
    const ui = document.getElementById(uiId);
    if (ui) {
      ui.classList.remove('active');
    }
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
    
    // 技能选择 UI
    this.skillSelectOverlay = document.getElementById('skill-select-overlay')!;
    this.skillOptionsEl = document.getElementById('skill-options')!;
    this.skillSelectLevelEl = document.getElementById('skill-select-level')!;
  }

  updateBattleUI() {
    // 关卡
    this.battleLevelEl.textContent = `第 ${this.currentLevel} 关`;
    
    // 血条
    const hpPercent = Math.max(0, (this.heroHp / this.heroMaxHp) * 100);
    this.battleHpFillEl.style.width = `${hpPercent}%`;
    this.battleHpTextEl.textContent = `HP: ${Math.floor(this.heroHp)}/${this.heroMaxHp}`;
    
    // 金币/经验
    this.battleGoldEl.textContent = this.gold.toString();
    this.battleExpEl.textContent = this.exp.toString();
  }

  bindEvents() {
    // 返回按钮
    this.addTapListener(this.battleBackBtn, () => this.returnToMain());
    
    // 自动/手动切换
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

  drawBackground() {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x2d3436, 0x2d3436, 0x1a1a2e, 0x1a1a2e, 1);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  createBattleArea() {
    const height = this.cameras.main.height;
    
    // 英雄 - 左侧
    this.hero = this.add.container(100, height / 2);
    const heroSprite = this.add.text(0, 0, '🧙', { fontSize: '48px' }).setOrigin(0.5);
    this.hero.add(heroSprite);

    // 英雄动画
    this.tweens.add({
      targets: this.hero,
      x: 120,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  spawnEnemies() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 根据关卡难度生成敌人数量
    const enemyCount = Math.min(1 + Math.floor(this.currentLevel / 2), 5);
    
    this.enemies = [];
    
    for (let i = 0; i < enemyCount; i++) {
      const enemy = this.add.container(width - 100, height / 2 - 60 + i * 80);
      
      const enemySprite = this.add.text(0, 0, '👺', { fontSize: '40px' }).setOrigin(0.5);
      enemy.add(enemySprite);
      
      enemy.setData('hp', 50 + this.currentLevel * 10);
      enemy.setData('maxHp', 50 + this.currentLevel * 10);
      enemy.setData('attack', 5 + this.currentLevel * 2);
      
      this.enemies.push(enemy);
    }
  }

  startBattle() {
    this.addLog('战斗开始！', '#ffd700');
    
    // 自动战斗循环
    this.time.addEvent({
      delay: 1000,
      callback: this.battleTick,
      callbackScope: this,
      loop: true
    });
  }

  battleTick() {
    // 暂停时不执行
    if (this.isPaused) return;
    if (this.heroHp <= 0 || this.enemies.length === 0) return;

    // 自动攻击
    if (this.isAutoMode) {
      this.heroAttack();
    }

    // 敌人攻击
    this.enemies.forEach(enemy => {
      if (enemy.getData('hp') > 0) {
        this.enemyAttack(enemy);
      }
    });

    // 自动使用技能
    if (this.isAutoMode) {
      this.autoUseSkills();
    }

    // 更新技能冷却
    this.updateSkillCooldowns();

    // 检查战斗结果
    this.checkBattleResult();
    
    // 更新 UI
    this.updateBattleUI();
  }

  heroAttack() {
    if (this.enemies.length === 0) return;

    const target = this.enemies[0];
    let damage = 10 + this.currentLevel * 2;

    // 暴击判定
    const critSkill = this.skills.find(s => s.id === 'critical');
    if (critSkill && Math.random() < (critSkill.chance || 0)) {
      damage *= 2;
      this.addLog('💥 暴击！', '#ff9800');
    }

    target.setData('hp', target.getData('hp') - damage);
    this.addLog(`英雄攻击造成 ${damage} 伤害`, '#4CAF50');

    // 攻击动画
    this.tweens.add({
      targets: this.hero,
      x: 150,
      duration: 100,
      yoyo: true
    });

    if (target.getData('hp') <= 0) {
      this.killEnemy(target);
    }
  }

  enemyAttack(enemy: Phaser.GameObjects.Container) {
    const damage = enemy.getData('attack') || 5;
    
    this.heroHp -= damage;
    this.addLog(`敌人攻击造成 ${damage} 伤害`, '#ff4444');

    this.tweens.add({
      targets: enemy,
      x: enemy.x - 20,
      duration: 100,
      yoyo: true
    });
  }

  autoUseSkills() {
    if (this.skills.length === 0) {
      this.skills = [
        {
          id: 'fireball',
          name: '火球术',
          icon: '🔥',
          type: 'active',
          description: '造成攻击力150%伤害',
          cooldown: 0,
          damage: 1.5,
          level: 1
        },
        {
          id: 'critical',
          name: '暴击',
          icon: '💥',
          type: 'passive',
          description: '15%几率双倍伤害',
          chance: 0.15,
          level: 1
        }
      ];
    }

    this.skills.forEach(skill => {
      if (skill.type === 'active' && skill.cooldown === 0 && this.enemies.length > 0) {
        this.useSkill(skill);
      }
    });
  }

  updateSkillCooldowns() {
    this.skills.forEach(skill => {
      if (skill.cooldown && skill.cooldown > 0) {
        skill.cooldown--;
      }
    });
  }

  useSkill(skill: Skill) {
    if (skill.id === 'fireball' && this.enemies.length > 0) {
      const target = this.enemies[0];
      const damage = (10 + this.currentLevel * 2) * (skill.damage || 1.5);
      target.setData('hp', target.getData('hp') - damage);
      this.addLog(`🔥 火球术造成 ${Math.floor(damage)} 伤害！`, '#ff9800');
      
      skill.cooldown = 3;
      
      if (target.getData('hp') <= 0) {
        this.killEnemy(target);
      }
    }
  }

  killEnemy(enemy: Phaser.GameObjects.Container) {
    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => enemy.destroy()
    });

    const goldReward = 10 + this.currentLevel * 5;
    const expReward = 5 + this.currentLevel * 3;
    
    this.gold += goldReward;
    this.exp += expReward;

    this.addLog(`击杀敌人！+${goldReward}💰 +${expReward}⚡`, '#ffd700');

    this.checkLevelUp();
  }

  checkLevelUp() {
    const user = DataManager.getCurrentUser();
    if (!user) return;

    const expNeeded = user.level * 100;
    if (this.exp >= expNeeded) {
      this.exp -= expNeeded;
      user.level++;
      this.heroMaxHp += 10;
      this.heroHp = this.heroMaxHp;
      
      this.addLog(`🎉 升级！等级 ${user.level}`, '#ffd700');
      this.updateBattleUI();
      
      // 技能选择
      this.showSkillSelection();
    }
  }

  showSkillSelection() {
    const user = DataManager.getCurrentUser();
    const level = user ? user.level : 1;
    
    // 暂停战斗
    this.isPaused = true;
    this.time.paused = true;

    // 更新等级显示
    this.skillSelectLevelEl.textContent = `达到等级 ${level}`;
    
    // 生成随机技能选项
    const availableSkills = this.generateSkillOptions();
    
    // 清空并生成选项
    this.skillOptionsEl.innerHTML = '';
    
    availableSkills.forEach(skill => {
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
      
      // 触摸事件
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
    
    // 显示弹窗
    this.skillSelectOverlay.classList.add('active');
  }

  generateSkillOptions() {
    const allSkills = [
      { id: 'fireball2', name: '火球术强化', icon: '🔥', desc: '火球术伤害+20%', rarity: 'common', rarityText: '普通' },
      { id: 'critical2', name: '暴击精通', icon: '💥', desc: '暴击率+5%', rarity: 'rare', rarityText: '稀有' },
      { id: 'heal', name: '生命回复', icon: '💚', desc: '立即恢复30%HP', rarity: 'common', rarityText: '普通' },
      { id: 'attack', name: '力量提升', icon: '⚔️', desc: '基础攻击+10%', rarity: 'common', rarityText: '普通' },
      { id: 'defense', name: '铁壁', icon: '🛡️', desc: '受到伤害-10%', rarity: 'rare', rarityText: '稀有' },
      { id: 'speed', name: '急速', icon: '⚡', desc: '攻击速度+15%', rarity: 'rare', rarityText: '稀有' },
      { id: 'lifesteal', name: '生命偷取', icon: '🩸', desc: '攻击回复5%HP', rarity: 'epic', rarityText: '史诗' },
      { id: 'doublehit', name: '连击', icon: '🎯', desc: '10%几率攻击两次', rarity: 'epic', rarityText: '史诗' },
      { id: 'rage', name: '狂暴', icon: '😤', desc: 'HP<30%时伤害+50%', rarity: 'legendary', rarityText: '传说' },
    ];
    
    // 随机选3个不重复的
    const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  selectSkill(skill: any) {
    // 隐藏弹窗
    this.skillSelectOverlay.classList.remove('active');
    
    // 应用效果
    switch (skill.id) {
      case 'heal':
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + this.heroMaxHp * 0.3);
        this.addLog('💚 恢复 30% HP！', '#4CAF50');
        break;
      case 'fireball2':
        const fireball = this.skills.find(s => s.id === 'fireball');
        if (fireball && fireball.damage) {
          fireball.damage += 0.2;
          this.addLog('🔥 火球术伤害提升！', '#ff9800');
        }
        break;
      case 'critical2':
        const crit = this.skills.find(s => s.id === 'critical');
        if (crit && crit.chance) {
          crit.chance += 0.05;
          this.addLog('💥 暴击率提升！', '#ffd700');
        }
        break;
      case 'attack':
        // 可以添加基础攻击力属性
        this.addLog('⚔️ 基础攻击提升！', '#ff9800');
        break;
      case 'defense':
        this.addLog('🛡️ 防御提升！', '#4a90d9');
        break;
      case 'speed':
        this.addLog('⚡ 攻击速度提升！', '#ffd700');
        break;
      case 'lifesteal':
        this.addLog('🩸 获得生命偷取！', '#a335ee');
        break;
      case 'doublehit':
        this.addLog('🎯 获得连击！', '#a335ee');
        break;
      case 'rage':
        this.addLog('😤 获得狂暴！', '#ff8000');
        break;
    }
    
    this.updateBattleUI();
    
    // 恢复战斗
    this.isPaused = false;
    this.time.paused = false;
  }

  checkBattleResult() {
    if (this.heroHp <= 0) {
      this.battleDefeat();
    }
    
    if (this.enemies.length === 0) {
      this.battleVictory();
    }
  }

  battleVictory() {
    this.time.paused = true;
    
    this.currentLevel++;
    
    if (this.currentLevel > 3) {
      this.showResult('通关成功！', true);
    } else {
      this.saveRun('ongoing');
      
      this.time.delayedCall(1000, () => {
        this.scene.restart({ continue: true });
      });
    }
  }

  battleDefeat() {
    this.showResult('战斗失败', false);
  }

  showResult(message: string, isVictory: boolean) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    const color = isVictory ? '#4CAF50' : '#ff4444';
    this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '32px',
      color: color
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `获得: ${this.gold}💰 ${this.exp}⚡`, {
      fontSize: '20px',
      color: '#ffd700'
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height / 2 + 80, 150, 50, 0x667eea);
    this.add.text(width / 2, height / 2 + 80, '返回主界面', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.returnToMain(isVictory);
    });

    this.saveRun(isVictory ? 'completed' : 'failed');
  }

  saveRun(status: 'ongoing' | 'completed' | 'failed') {
    const user = DataManager.getCurrentUser();
    if (!user) return;

    const run: RunData = {
      runId: `run_${Date.now()}`,
      heroId: 'warrior',
      heroLevel: user.level,
      currentLevel: this.currentLevel,
      currentHp: Math.floor(this.heroHp),
      maxHp: this.heroMaxHp,
      skills: this.skills,
      equipment: [],
      gold: this.gold,
      exp: this.exp,
      startTime: Date.now(),
      status: status,
      levelsCompleted: []
    };

    if (status === 'completed' || status === 'failed') {
      user.gold += this.gold;
      user.statistics.totalRuns++;
      if (this.currentLevel > user.statistics.bestLevel) {
        user.statistics.bestLevel = this.currentLevel;
      }
      DataManager.updateUserData(user);
      DataManager.clearRunData();
    } else {
      DataManager.saveRunData(run);
    }
  }

  returnToMain(_isVictory: boolean = false) {
    this.hideUI('battle-ui');
    this.scene.start('MainScene');
  }

  addLog(message: string, color: string = '#ffffff') {
    this.battleLog.push(message);
    if (this.battleLog.length > 3) {
      this.battleLog.shift();
    }

    this.battleLogEl.innerHTML = this.battleLog
      .map(log => `<span style="color:${color}">${log}</span>`)
      .join('<br>');
  }

  shutdown() {
    this.hideUI('battle-ui');
  }
}
