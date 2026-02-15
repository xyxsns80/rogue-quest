import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';
import type { UserData } from '../utils/DataManager';

export default class LoginScene extends Phaser.Scene {
  private usernameInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private loginButton!: HTMLButtonElement;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Logo
    this.add.text(width / 2, 150, '🏆', {
      fontSize: '64px'
    }).setOrigin(0.5);

    this.add.text(width / 2, 230, '肉鸽征途', {
      fontSize: '32px',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(width / 2, 270, 'v1.0', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);

    // 创建HTML输入框
    this.createInputFields(width, height);

    // 提示文字
    this.add.text(width / 2, height / 2 + 120, '首次输入自动注册，再次输入自动登录', {
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    // 错误提示
    this.errorText = this.add.text(width / 2, height / 2 + 150, '', {
      fontSize: '14px',
      color: '#ff4444'
    }).setOrigin(0.5);

    // 版本信息
    this.add.text(width / 2, height - 50, 'OpenClaw Game Studio', {
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0.5);
  }

  createInputFields(width: number, height: number) {
    // 账号输入框
    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = '账号';
    this.usernameInput.style.cssText = `
      position: absolute;
      width: 280px;
      height: 44px;
      left: ${width / 2 - 140}px;
      top: ${height / 2 - 60}px;
      background: rgba(255,255,255,0.1);
      border: 2px solid #667eea;
      border-radius: 8px;
      color: white;
      font-size: 16px;
      padding: 0 15px;
      outline: none;
    `;
    document.body.appendChild(this.usernameInput);

    // 密码输入框
    this.passwordInput = document.createElement('input');
    this.passwordInput.type = 'password';
    this.passwordInput.placeholder = '密码';
    this.passwordInput.style.cssText = `
      position: absolute;
      width: 280px;
      height: 44px;
      left: ${width / 2 - 140}px;
      top: ${height / 2}px;
      background: rgba(255,255,255,0.1);
      border: 2px solid #667eea;
      border-radius: 8px;
      color: white;
      font-size: 16px;
      padding: 0 15px;
      outline: none;
    `;
    document.body.appendChild(this.passwordInput);

    // 登录按钮
    this.loginButton = document.createElement('button');
    this.loginButton.textContent = '登录 / 注册';
    this.loginButton.style.cssText = `
      position: absolute;
      width: 280px;
      height: 50px;
      left: ${width / 2 - 140}px;
      top: ${height / 2 + 60}px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
    `;
    this.loginButton.onclick = () => this.handleLogin();
    document.body.appendChild(this.loginButton);

    // 回车键提交
    this.passwordInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    };
  }

  handleLogin() {
    const username = this.usernameInput.value.trim();
    const password = this.passwordInput.value.trim();

    if (!username || !password) {
      this.errorText.setText('请输入账号和密码');
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
      this.cleanup();
      this.scene.start('MainScene');
    });
  }

  generateUserId(username: string, password: string): string {
    // 简单的ID生成（实际项目应该使用更安全的哈希）
    let hash = 0;
    const str = username + password;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'user_' + Math.abs(hash).toString(36);
  }

  showMessage(msg: string) {
    this.errorText.setText(msg);
    this.errorText.setColor('#4CAF50');
  }

  cleanup() {
    // 清理HTML元素
    if (this.usernameInput) this.usernameInput.remove();
    if (this.passwordInput) this.passwordInput.remove();
    if (this.loginButton) this.loginButton.remove();
  }

  shutdown() {
    this.cleanup();
  }
}
