import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';

export default class MainScene extends Phaser.Scene {
  private idleAccumulatedText!: HTMLElement;
  private adventureBtn!: HTMLElement;
  private adventureSubtitle!: HTMLElement;
  private uiOverlay!: HTMLElement;
  private toastEl!: HTMLElement;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    const user = DataManager.getCurrentUser();

    if (!user) {
      this.scene.start('LoginScene');
      return;
    }

    // 获取 HTML 元素引用
    this.uiOverlay = document.getElementById('ui-overlay')!;
    this.idleAccumulatedText = document.getElementById('idle-accumulated')!;
    this.adventureBtn = document.getElementById('adventure-btn')!;
    this.adventureSubtitle = document.getElementById('adventure-subtitle')!;
    this.toastEl = document.getElementById('toast')!;

    // 显示 UI
    this.uiOverlay.classList.add('active');

    // 更新玩家信息
    this.updatePlayerInfo(user);

    // 更新按钮状态
    this.updateAdventureButton();

    // 更新放置收益
    this.updateIdleRewards();

    // 绑定事件
    this.bindEvents();

    // 绘制背景（保持 Phaser 画布有内容）
    this.add.rectangle(195, 422, 390, 844, 0x1a1a2e);
    
    // 绘制标题（可选，也可以用 HTML）
    this.add.text(195, 245, '🏆', { fontSize: '48px' }).setOrigin(0.5);
    this.add.text(195, 295, '肉鸽征途', {
      fontSize: '28px',
      color: '#ffd700'
    }).setOrigin(0.5);
  }

  updatePlayerInfo(user: any) {
    const nameEl = document.getElementById('player-name');
    const levelEl = document.getElementById('player-level');
    const goldEl = document.getElementById('gold');
    const diamondEl = document.getElementById('diamond');

    if (nameEl) nameEl.textContent = user.username;
    if (levelEl) levelEl.textContent = user.level;
    if (goldEl) goldEl.textContent = this.formatNumber(user.gold);
    if (diamondEl) diamondEl.textContent = user.diamond;
  }

  updateAdventureButton() {
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

    const titleEl = this.adventureBtn.querySelector('.title');
    if (titleEl) titleEl.textContent = buttonText;
    this.adventureSubtitle.textContent = subText;
  }

  updateIdleRewards() {
    const user = DataManager.getCurrentUser();
    if (!user) return;

    const now = Date.now();
    const lastCollect = user.idleRewards.lastCollectTime;
    const elapsed = (now - lastCollect) / 1000 / 3600;
    const rate = user.idleRewards.rate;
    const accumulated = Math.min(elapsed * rate, 12 * rate);

    const rateEl = document.getElementById('idle-rate');
    if (rateEl) rateEl.textContent = rate.toString();
    this.idleAccumulatedText.textContent = Math.floor(accumulated).toString();
  }

  bindEvents() {
    // 开始冒险按钮
    this.adventureBtn.addEventListener('click', () => this.startAdventure());
    this.adventureBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.startAdventure();
    });

    // 功能按钮
    document.querySelectorAll('.func-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showMessage('功能开发中...'));
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.showMessage('功能开发中...');
      });
    });

    // 领取按钮
    const collectBtn = document.getElementById('collect-btn');
    if (collectBtn) {
      collectBtn.addEventListener('click', () => this.collectIdleRewards());
      collectBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.collectIdleRewards();
      });
    }

    // 加速按钮
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => this.showMessage('观看广告获得2小时收益'));
      speedBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.showMessage('观看广告获得2小时收益');
      });
    }

    // 底部导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.showMessage('功能开发中...'));
      item.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.showMessage('功能开发中...');
      });
    });
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
      
      this.updatePlayerInfo(user);
      this.idleAccumulatedText.textContent = '0';
      this.showMessage(`获得 ${accumulated} 金币！`);
    } else {
      this.showMessage('暂无收益可领取');
    }
  }

  startAdventure() {
    console.log('=== startAdventure called ===');
    
    // 隐藏 UI
    this.uiOverlay.classList.remove('active');
    
    const run = DataManager.getCurrentRun();
    console.log('Current run:', run);
    
    // 先停止当前场景的输入处理
    this.input.enabled = false;
    
    if (run && run.status === 'ongoing') {
      console.log('Starting BattleScene with continue=true');
      this.scene.start('BattleScene', { continue: true });
    } else {
      if (run) {
        DataManager.clearRunData();
      }
      console.log('Starting BattleScene with continue=false');
      this.scene.start('BattleScene', { continue: false });
    }
  }

  showMessage(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    
    setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2000);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  shutdown() {
    // 离开场景时隐藏 UI
    this.uiOverlay.classList.remove('active');
  }
}
