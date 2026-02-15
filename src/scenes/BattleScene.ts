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
  cooldownText?: Phaser.GameObjects.Text;
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
  
  private heroHpBar!: Phaser.GameObjects.Graphics;
  private heroHpText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private logContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: { continue: boolean }) {
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
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x2d3436);

    // 顶部信息栏
    this.createTopBar(width);

    // 战斗区域
    this.createBattleArea(width, height);

    // 技能按钮
    this.createSkillButtons(width, height);

    // 战斗日志
    this.createBattleLog(width, height);

    // 底部控制
    this.createControls(width, height);

    // 生成敌人
    this.spawnEnemies();

    // 开始战斗
    this.startBattle();
  }

  createTopBar(_width: number) {
    this.add.rectangle(_width / 2, 40, _width, 80, 0x1a1a2e);

    // 关卡
    this.add.text(_width / 2, 20, `第 ${this.currentLevel} 关`, {
      fontSize: '20px',
      color: '#ffd700'
    }).setOrigin(0.5);

    // 金币
    this.goldText = this.add.text(_width - 20, 30, `💰${this.gold}`, {
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(1, 0);

    // 经验
    this.expText = this.add.text(_width - 20, 55, `⚡${this.exp}`, {
      fontSize: '14px',
      color: '#7fff7f'
    }).setOrigin(1, 0);

    // 英雄血条
    this.heroHpBar = this.add.graphics();
    this.updateHeroHpBar();
    
    this.heroHpText = this.add.text(20, 55, `HP: ${this.heroHp}/${this.heroMaxHp}`, {
      fontSize: '14px',
      color: '#ffffff'
    });

    // 自动模式指示
    const autoText = this.add.text(_width / 2, 55, this.isAutoMode ? '🤖 自动' : '👆 手动', {
      fontSize: '12px',
      color: this.isAutoMode ? '#4CAF50' : '#ff9800'
    }).setOrigin(0.5);
    autoText.setInteractive({ useHandCursor: true });
    autoText.on('pointerdown', () => {
      this.isAutoMode = !this.isAutoMode;
      autoText.setText(this.isAutoMode ? '🤖 自动' : '👆 手动');
      autoText.setColor(this.isAutoMode ? '#4CAF50' : '#ff9800');
    });
  }

  updateHeroHpBar() {
    const width = this.cameras.main.width;
    this.heroHpBar.clear();
    
    // 背景
    this.heroHpBar.fillStyle(0x333333);
    this.heroHpBar.fillRect(20, 35, width - 40, 15);
    
    // 血条
    const percent = this.heroHp / this.heroMaxHp;
    this.heroHpBar.fillStyle(0xff4444);
    this.heroHpBar.fillRect(20, 35, (width - 40) * percent, 15);
    
    this.heroHpText.setText(`HP: ${Math.floor(this.heroHp)}/${this.heroMaxHp}`);
  }

  createBattleArea(_width: number, height: number) {
    // 英雄
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
      
      // 敌人数据
      enemy.setData('hp', 50 + this.currentLevel * 10);
      enemy.setData('maxHp', 50 + this.currentLevel * 10);
      enemy.setData('attack', 5 + this.currentLevel * 2);
      
      this.enemies.push(enemy);
    }
  }

  createSkillButtons(width: number, height: number) {
    const y = height - 200;
    const skillWidth = 60;
    const spacing = 10;
    const startX = width / 2 - (skillWidth * 3 + spacing * 2) / 2;

    // 初始技能
    if (this.skills.length === 0) {
      this.skills = [
        {
          id: 'fireball',
          name: '火球术',
          icon: '🔥',
          type: 'active',
          description: '造成攻击力150%伤害',
          cooldown: 3,
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

    this.skills.forEach((skill, i) => {
      const x = startX + i * (skillWidth + spacing);
      
      const bg = this.add.rectangle(x, y, skillWidth, 60, 0x333333, 0.8);
      bg.setStrokeStyle(2, skill.type === 'active' ? 0xff9800 : 0x4CAF50);
      
      this.add.text(x, y - 15, skill.icon, { fontSize: '24px' }).setOrigin(0.5);
      this.add.text(x, y + 15, skill.name, {
        fontSize: '10px',
        color: '#ffffff'
      }).setOrigin(0.5);

      if (skill.type === 'active' && skill.cooldown) {
        const cdText = this.add.text(x + 25, y - 25, `${skill.cooldown}`, {
          fontSize: '12px',
          color: '#ff4444'
        });
        skill.cooldownText = cdText;
      }

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.useSkill(skill));
    });
  }

  createBattleLog(width: number, height: number) {
    const y = height - 120;
    
    // 日志背景
    this.add.rectangle(width / 2, y, width - 20, 80, 0x000000, 0.5);
    
    // 日志容器
    this.logContainer = this.add.container(width / 2, y);
  }

  addLog(message: string, color: string = '#ffffff') {
    this.battleLog.push(message);
    if (this.battleLog.length > 3) {
      this.battleLog.shift();
    }

    // 更新显示
    this.logContainer.removeAll(true);
    this.battleLog.forEach((log, i) => {
      const text = this.add.text(0, -30 + i * 20, log, {
        fontSize: '12px',
        color: color
      }).setOrigin(0.5);
      this.logContainer.add(text);
    });
  }

  createControls(_width: number, _height: number) {
    const y = _height - 40;
    
    // 返回按钮
    const backBtn = this.add.rectangle(60, y, 80, 35, 0x666666);
    this.add.text(60, y, '🏠 返回', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.returnToMain());
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
      this.skills.forEach(skill => {
        if (skill.type === 'active' && skill.cooldown === 0) {
          this.useSkill(skill);
        }
      });
    }

    // 更新技能冷却
    this.skills.forEach(skill => {
      if (skill.cooldown && skill.cooldown > 0) {
        skill.cooldown--;
        if (skill.cooldownText) {
          skill.cooldownText.setText(skill.cooldown.toString());
        }
      }
    });

    // 检查战斗结果
    this.checkBattleResult();
  }

  heroAttack() {
    if (this.enemies.length === 0) return;

    const target = this.enemies[0];
    let damage = 10 + this.currentLevel * 2; // 基础攻击

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

    // 检查敌人死亡
    if (target.getData('hp') <= 0) {
      this.killEnemy(target);
    }
  }

  enemyAttack(enemy: Phaser.GameObjects.Container) {
    const damage = enemy.getData('attack') || 5;
    
    // 闪避判定（可以后期添加）
    this.heroHp -= damage;
    this.updateHeroHpBar();
    this.addLog(`敌人攻击造成 ${damage} 伤害`, '#ff4444');

    // 敌人攻击动画
    this.tweens.add({
      targets: enemy,
      x: enemy.x - 20,
      duration: 100,
      yoyo: true
    });
  }

  useSkill(skill: Skill) {
    if (skill.type === 'active' && skill.cooldown && skill.cooldown > 0) {
      this.addLog(`${skill.name} 冷却中...`, '#888888');
      return;
    }

    if (skill.id === 'fireball' && this.enemies.length > 0) {
      const target = this.enemies[0];
      const damage = (10 + this.currentLevel * 2) * (skill.damage || 1.5);
      target.setData('hp', target.getData('hp') - damage);
      this.addLog(`🔥 火球术造成 ${Math.floor(damage)} 伤害！`, '#ff9800');
      
      skill.cooldown = 3; // 重置冷却
      
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

    // 死亡动画
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => enemy.destroy()
    });

    // 奖励
    const goldReward = 10 + this.currentLevel * 5;
    const expReward = 5 + this.currentLevel * 3;
    
    this.gold += goldReward;
    this.exp += expReward;
    this.goldText.setText(`💰${this.gold}`);
    this.expText.setText(`⚡${this.exp}`);

    this.addLog(`击杀敌人！+${goldReward}💰 +${expReward}⚡`, '#ffd700');

    // 检查升级
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
      this.updateHeroHpBar();
      
      // 技能选择
      this.showSkillSelection();
    }
  }

  showSkillSelection() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 遮罩
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    
    // 标题
    this.add.text(width / 2, 150, '选择技能升级', {
      fontSize: '24px',
      color: '#ffd700'
    }).setOrigin(0.5);

    // 随机3个技能选项
    const availableSkills = [
      { id: 'fireball2', name: '火球术+1', icon: '🔥', desc: '伤害+20%' },
      { id: 'critical2', name: '暴击+1', icon: '💥', desc: '暴击率+5%' },
      { id: 'heal', name: '治疗', icon: '💚', desc: '回复30%HP' }
    ];

    // 暂停战斗，显示选择
    this.time.paused = true;

    availableSkills.forEach((skill, i) => {
      const x = width / 2;
      const y = 250 + i * 80;
      
      const btn = this.add.rectangle(x, y, width - 40, 60, 0x667eea, 0.8);
      btn.setStrokeStyle(2, 0x667eea);
      
      this.add.text(x - 100, y, skill.icon, { fontSize: '32px' }).setOrigin(0.5);
      this.add.text(x, y - 10, skill.name, {
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.add.text(x, y + 15, skill.desc, {
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);

      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.selectSkill(skill);
        overlay.destroy();
        btn.destroy();
        this.time.paused = false;
      });
    });
  }

  selectSkill(skill: any) {
    if (skill.id === 'heal') {
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + this.heroMaxHp * 0.3);
      this.updateHeroHpBar();
      this.addLog('💚 恢复 30% HP！', '#4CAF50');
    } else if (skill.id === 'fireball2') {
      const fireball = this.skills.find(s => s.id === 'fireball');
      if (fireball && fireball.damage) {
        fireball.damage += 0.2;
        this.addLog('🔥 火球术伤害提升！', '#ff9800');
      }
    } else if (skill.id === 'critical2') {
      const crit = this.skills.find(s => s.id === 'critical');
      if (crit && crit.chance) {
        crit.chance += 0.05;
        this.addLog('💥 暴击率提升！', '#ffd700');
      }
    }
  }

  checkBattleResult() {
    // 失败
    if (this.heroHp <= 0) {
      this.battleDefeat();
    }
    
    // 胜利
    if (this.enemies.length === 0) {
      this.battleVictory();
    }
  }

  battleVictory() {
    this.time.paused = true;
    
    this.currentLevel++;
    
    if (this.currentLevel > 3) {
      // 通关
      this.showResult('通关成功！', true);
    } else {
      // 继续下一关
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

    // 遮罩
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // 结果文字
    const color = isVictory ? '#4CAF50' : '#ff4444';
    this.add.text(width / 2, height / 2 - 50, message, {
      fontSize: '32px',
      color: color
    }).setOrigin(0.5);

    // 奖励显示
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
    btn.on('pointerdown', () => {
      this.returnToMain(isVictory);
    });

    // 保存结果
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
      // 结算到账号
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
    this.scene.start('MainScene');
  }
}
