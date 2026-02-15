import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';

export default class MainScene extends Phaser.Scene {
  private userGoldText!: Phaser.GameObjects.Text;
  private idleAccumulatedText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const user = DataManager.getCurrentUser();

    if (!user) {
      this.scene.start('LoginScene');
      return;
    }

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 顶部信息栏
    this.createTopBar(width, user);

    // 游戏标题
    this.add.text(width / 2, 180, '🏆', { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(width / 2, 240, '肉鸽征途', {
      fontSize: '28px',
      color: '#ffd700'
    }).setOrigin(0.5);

    // 核心按钮：开始/继续冒险
    this.createAdventureButton(width, height);

    // 养成入口
    this.createCultivationButtons(width);

    // 功能入口
    this.createFunctionButtons(width);

    // 底部放置收益
    this.createIdleSection(width, height);

    // 底部导航
    this.createBottomNav(width, height);

    // 更新放置收益
    this.updateIdleRewards();
  }

  createTopBar(width: number, user: any) {
    // 背景
    this.add.rectangle(width / 2, 40, width, 80, 0x16213e);

    // 用户信息
    this.add.text(20, 25, `👤${user.username}`, {
      fontSize: '16px',
      color: '#ffffff'
    });

    this.add.text(20, 50, `LV.${user.level}`, {
      fontSize: '14px',
      color: '#7fff7f'
    });

    // 资源
    this.userGoldText = this.add.text(width - 20, 30, `💰${this.formatNumber(user.gold)}`, {
      fontSize: '18px',
      color: '#ffd700'
    }).setOrigin(1, 0);

    this.add.text(width - 20, 55, `💎${user.diamond}`, {
      fontSize: '14px',
      color: '#87ceeb'
    }).setOrigin(1, 0);

    // 经验条
    this.add.rectangle(width / 2, 75, width - 40, 8, 0x333333);
    const expPercent = user.exp / user.expToLevel;
    this.add.rectangle(width / 2 - (width - 40) / 2 * (1 - expPercent), 75, (width - 40) * expPercent, 8, 0x4CAF50)
      .setOrigin(0, 0.5);
  }

  createAdventureButton(width: number, height: number) {
    const run = DataManager.getCurrentRun();
    let buttonText = '⚔️ 开始冒险';
    let subText = '推荐等级: ★';

    if (run) {
      if (run.status === 'ongoing') {
        buttonText = '⚔️ 继续冒险';
        subText = `第${run.currentLevel}关 进行中`;
      } else if (run.status === 'completed' || run.status === 'failed') {
        buttonText = '⚔️ 新的冒险';
        subText = run.status === 'completed' ? '上次: 通关' : '上次: 失败';
      }
    }

    // 按钮背景
    const buttonBg = this.add.rectangle(width / 2, height / 2 - 50, width * 0.8, 100, 0x667eea, 0.3);
    buttonBg.setStrokeStyle(3, 0x667eea);

    // 按钮文字
    this.add.text(width / 2, height / 2 - 60, buttonText, {
      fontSize: '24px',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 30, subText, {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    // 点击区域
    const hitArea = this.add.rectangle(width / 2, height / 2 - 50, width * 0.8, 100, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.startAdventure());
    hitArea.on('pointerover', () => buttonBg.setFillStyle(0x667eea, 0.5));
    hitArea.on('pointerout', () => buttonBg.setFillStyle(0x667eea, 0.3));
  }

  createCultivationButtons(width: number) {
    const y = 450;
    const spacing = width / 3;

    const buttons = [
      { icon: '🦸', name: '英雄', key: 'hero' },
      { icon: '🌟', name: '天赋', key: 'talent' },
      { icon: '⚔️', name: '装备', key: 'equipment' }
    ];

    buttons.forEach((btn, i) => {
      const x = spacing / 2 + spacing * i;
      
      const bg = this.add.rectangle(x, y, spacing - 20, 70, 0x667eea, 0.2);
      bg.setStrokeStyle(2, 0x667eea);
      
      this.add.text(x, y - 15, btn.icon, { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(x, y + 20, btn.name, {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.showMessage('功能开发中...'));
    });
  }

  createFunctionButtons(width: number) {
    const y = 540;
    const spacing = width / 3;

    const buttons = [
      { icon: '📋', name: '任务', key: 'task' },
      { icon: '🏪', name: '商店', key: 'shop' },
      { icon: '📖', name: '图鉴', key: 'collection' }
    ];

    buttons.forEach((btn, i) => {
      const x = spacing / 2 + spacing * i;
      
      const bg = this.add.rectangle(x, y, spacing - 20, 70, 0x444444, 0.5);
      bg.setStrokeStyle(2, 0x666666);
      
      this.add.text(x, y - 15, btn.icon, { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(x, y + 20, btn.name, {
        fontSize: '14px',
        color: '#aaaaaa'
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.showMessage('功能开发中...'));
    });
  }

  createIdleSection(width: number, height: number) {
    const y = height - 150;
    
    // 背景
    this.add.rectangle(width / 2, y + 30, width - 20, 80, 0x16213e);
    
    // 标题
    this.add.text(width / 2, y, '💰 挂机收益', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    // 收益率
    const user = DataManager.getCurrentUser();
    const rate = user?.idleRewards.rate || 10;
    this.add.text(width / 2, y + 25, `+${rate}/小时`, {
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(0.5);

    // 累计
    this.idleAccumulatedText = this.add.text(width / 2, y + 50, '已累积: 0', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // 领取按钮
    const collectBtn = this.add.rectangle(width / 2 - 80, y + 75, 100, 35, 0x4CAF50);
    this.add.text(width / 2 - 80, y + 75, '📦 领取', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    collectBtn.setInteractive({ useHandCursor: true });
    collectBtn.on('pointerdown', () => this.collectIdleRewards());

    // 加速按钮
    const speedBtn = this.add.rectangle(width / 2 + 80, y + 75, 100, 35, 0xff9800);
    this.add.text(width / 2 + 80, y + 75, '⚡ 加速', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    speedBtn.setInteractive({ useHandCursor: true });
    speedBtn.on('pointerdown', () => this.showMessage('观看广告获得2小时收益'));
  }

  createBottomNav(width: number, height: number) {
    const y = height - 40;
    const spacing = width / 3;

    const navs = [
      { icon: '⚙️', name: '设置' },
      { icon: '🏠', name: '主页' },
      { icon: '📊', name: '统计' }
    ];

    navs.forEach((nav, i) => {
      const x = spacing / 2 + spacing * i;
      this.add.text(x, y - 10, nav.icon, { fontSize: '20px' }).setOrigin(0.5);
      this.add.text(x, y + 10, nav.name, {
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);
    });

    this.add.rectangle(width / 2, y - 30, width, 1, 0x333333);
  }

  updateIdleRewards() {
    const user = DataManager.getCurrentUser();
    if (!user) return;

    const now = Date.now();
    const lastCollect = user.idleRewards.lastCollectTime;
    const elapsed = (now - lastCollect) / 1000 / 3600; // 小时
    const rate = user.idleRewards.rate;
    const accumulated = Math.min(elapsed * rate, 12 * rate); // 最多12小时

    this.idleAccumulatedText.setText(`已累积: ${Math.floor(accumulated)}`);
  }

  collectIdleRewards() {
    const user = DataManager.getCurrentUser();
    if (!user) return;

    const now = Date.now();
    const lastCollect = user.idleRewards.lastCollectTime;
    const elapsed = (now - lastCollect) / 1000 / 3600;
    const rate = user.idleRewards.rate;
    const accumulated = Math.min(Math.floor(elapsed * rate), 12 * rate);

    if (accumulated > 0) {
      user.gold += accumulated;
      user.idleRewards.lastCollectTime = now;
      DataManager.updateUserData({ gold: user.gold, idleRewards: user.idleRewards });
      
      this.userGoldText.setText(`💰${this.formatNumber(user.gold)}`);
      this.idleAccumulatedText.setText('已累积: 0');
      this.showMessage(`获得 ${accumulated} 金币！`);
    } else {
      this.showMessage('暂无收益可领取');
    }
  }

  startAdventure() {
    const run = DataManager.getCurrentRun();
    
    if (run && run.status === 'ongoing') {
      // 继续冒险
      this.scene.start('BattleScene', { continue: true });
    } else {
      // 新冒险
      if (run) {
        DataManager.clearRunData();
      }
      this.scene.start('BattleScene', { continue: false });
    }
  }

  showMessage(msg: string) {
    const width = this.cameras.main.width;
    const toast = this.add.rectangle(width / 2, 300, width - 40, 40, 0x000000, 0.8);
    const text = this.add.text(width / 2, 300, msg, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [toast, text],
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => {
        toast.destroy();
        text.destroy();
      }
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}
