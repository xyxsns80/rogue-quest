import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';
import type { UserData } from '../utils/DataManager';

export default class LoginScene extends Phaser.Scene {
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private loginBtn!: HTMLButtonElement;
  private errorEl!: HTMLElement;

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    console.log('=== LoginScene create ===');
    
    // 显示登录 UI
    this.showUI('login-ui');
    
    // 获取元素
    this.usernameInput = document.getElementById('login-username') as HTMLInputElement;
    this.passwordInput = document.getElementById('login-password') as HTMLInputElement;
    this.loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
    this.errorEl = document.getElementById('login-error') as HTMLElement;
    
    // 绑定事件
    this.bindEvents();
    
    // 绘制背景
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
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
  }

  bindEvents() {
    // 登录按钮 - 触摸优先
    let isTouched = false;
    
    this.loginBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      isTouched = true;
      this.handleLogin();
    }, { passive: false });
    
    this.loginBtn.addEventListener('click', (e) => {
      if (!isTouched) {
        e.preventDefault();
        this.handleLogin();
      }
      isTouched = false;
    });
    
    // 回车提交
    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });
  }

  handleLogin() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value.trim();

    if (!username || !password) {
      this.showError('请输入账号和密码');
      return;
    }

    // 生成用户ID
    const userId = this.generateUserId(username, password);

    // 检查是否已有账号
    const existingUser = DataManager.loadUserData(userId);
    
    if (existingUser) {
      // 登录
      DataManager.setCurrentUser(existingUser);
      this.showMessage('欢迎回来，' + existingUser.username);
    } else {
      // 注册
      const newUser: UserData = {
        userId: userId,
        username: username,
        level: 1,
        exp: 0,
        expToLevel: 100,
        gold: 0,
        diamond: 0,
        heroes: {
          warrior: { unlocked: true, level: 1 }
        },
        talents: {
          attack: 0,
          defense: 0,
          utility: 0
        },
        equipment: {
          weapon: null,
          armor: null,
          accessory: null
        },
        inventory: [],
        statistics: {
          totalRuns: 0,
          bestLevel: 0,
          totalGold: 0
        },
        idleRewards: {
          rate: 10,
          lastCollectTime: Date.now()
        },
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      };
      
      DataManager.saveUserData(newUser);
      DataManager.setCurrentUser(newUser);
      this.showMessage('注册成功！');
    }

    // 延迟跳转
    this.time.delayedCall(500, () => {
      this.hideUI('login-ui');
      this.scene.start('MainScene');
    });
  }

  generateUserId(username: string, password: string): string {
    let hash = 0;
    const str = username + password;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'user_' + Math.abs(hash).toString(36);
  }

  showError(msg: string) {
    this.errorEl.textContent = msg;
    this.errorEl.style.color = '#ff4444';
  }

  showMessage(msg: string) {
    this.errorEl.textContent = msg;
    this.errorEl.style.color = '#4CAF50';
  }

  hideUI(uiId: string) {
    const ui = document.getElementById(uiId);
    if (ui) {
      ui.classList.remove('active');
    }
  }

  shutdown() {
    this.hideUI('login-ui');
  }
}
