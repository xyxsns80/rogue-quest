import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';

export default class MainScene extends Phaser.Scene {
  private toastEl!: HTMLElement;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    console.log('=== MainScene create ===');
    
    const user = DataManager.getCurrentUser();
    if (!user) {
      console.log('No user, going to login');
      this.showUI('login-ui');
      return;
    }

    console.log('User found:', user.username);
    
    // 获取 Toast 元素
    this.toastEl = document.getElementById('toast')!;
    
    // 显示主界面
    this.showUI('main-ui');
    
    // 更新玩家信息
    this.updatePlayerInfo(user);
    
    // 更新冒险按钮状态
    this.updateAdventureButton();
    
    // 更新放置收益
    this.updateIdleRewards();
    
    // 绑定事件
    this.bindEvents();
    
    // 绘制背景（Phaser 层）
    this.drawBackground();
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

  drawBackground() {
    // 简单的渐变背景
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
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
    const user = DataManager.getCurrentUser();
    const currentChapter = user?.statistics?.bestLevel ? user.statistics.bestLevel + 1 : 1;
    
    let buttonText = '⚔️ 开始冒险';
    let subText = `第 ${currentChapter} 大关卡`;

    if (run && run.status === 'ongoing') {
      // 有进行中的冒险（中途退出的）
      buttonText = '⚔️ 继续冒险';
      subText = `第1-${run.currentLevel}关 进行中`;
    }

    const titleEl = document.querySelector('.adventure-btn .title');
    const subtitleEl = document.getElementById('adventure-subtitle');
    
    if (titleEl) titleEl.textContent = buttonText;
    if (subtitleEl) subtitleEl.textContent = subText;
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
    const accumulatedEl = document.getElementById('idle-accumulated');
    
    if (rateEl) rateEl.textContent = rate.toString();
    if (accumulatedEl) accumulatedEl.textContent = Math.floor(accumulated).toString();
  }

  bindEvents() {
    // 开始冒险按钮
    const adventureBtn = document.getElementById('adventure-btn');
    if (adventureBtn) {
      this.addTapListener(adventureBtn, () => this.startAdventure());
    }

    // 功能按钮
    document.querySelectorAll('.func-btn').forEach(btn => {
      this.addTapListener(btn as HTMLElement, () => {
        const action = btn.getAttribute('data-action');
        this.showMessage(`${action} 功能开发中...`);
      });
    });

    // 领取按钮
    const collectBtn = document.getElementById('collect-btn');
    if (collectBtn) {
      this.addTapListener(collectBtn, () => this.collectIdleRewards());
    }

    // 加速按钮
    const speedBtn = document.getElementById('speed-btn');
    if (speedBtn) {
      this.addTapListener(speedBtn, () => {
        this.showMessage('观看广告获得2小时收益');
      });
    }

    // 底部导航
    document.querySelectorAll('.nav-item').forEach(item => {
      this.addTapListener(item as HTMLElement, () => {
        const action = item.getAttribute('data-action');
        this.showMessage(`${action} 功能开发中...`);
      });
    });
  }

  // 统一的触摸/点击事件处理
  addTapListener(element: HTMLElement, callback: () => void) {
    let isTouched = false;
    
    // touchstart - 最快响应
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isTouched = true;
      callback();
    }, { passive: false });
    
    // click - 作为 fallback
    element.addEventListener('click', (e) => {
      if (!isTouched) {
        e.preventDefault();
        callback();
      }
      isTouched = false;
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
      const accumulatedEl = document.getElementById('idle-accumulated');
      if (accumulatedEl) accumulatedEl.textContent = '0';
      
      this.showMessage(`获得 ${accumulated} 金币！`);
    } else {
      this.showMessage('暂无收益可领取');
    }
  }

  startAdventure() {
    console.log('=== startAdventure ===');
    
    // 隐藏主界面 UI
    this.hideUI('main-ui');
    
    const run = DataManager.getCurrentRun();
    
    // 禁用输入，防止重复点击
    this.input.enabled = false;
    
    if (run && run.status === 'ongoing') {
      console.log('Continuing existing run');
      this.scene.start('BattleScene', { continue: true });
    } else {
      if (run) {
        DataManager.clearRunData();
      }
      console.log('Starting new run');
      this.scene.start('BattleScene', { continue: false });
    }
  }

  hideUI(uiId: string) {
    const ui = document.getElementById(uiId);
    if (ui) {
      ui.classList.remove('active');
    }
  }

  showMessage(msg: string) {
    if (!this.toastEl) {
      this.toastEl = document.getElementById('toast')!;
    }
    
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
    this.hideUI('main-ui');
  }
}
