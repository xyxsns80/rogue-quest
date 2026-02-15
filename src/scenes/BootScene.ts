import Phaser from 'phaser';
import { DataManager } from '../utils/DataManager';

export default class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 创建进度条
    this.createProgressBar();
    
    // 加载资源
    this.loadAssets();
  }

  createProgressBar() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // 进度条背景
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    // 进度条
    this.progressBar = this.add.graphics();
    
    // 加载文字
    this.loadingText = this.add.text(width / 2, height / 2 - 50, '加载中...', {
      font: '20px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // 百分比文字
    const percentText = this.add.text(width / 2, height / 2, '0%', {
      font: '18px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // 监听加载进度
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x667eea, 1);
      this.progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(Math.floor(value * 100) + '%');
    });
    
    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      percentText.destroy();
    });
  }

  loadAssets() {
    // 这里预加载游戏资源
    // 由于使用emoji风格，暂时不需要加载图片
  }

  create() {
    // 初始化数据管理器
    DataManager.init();
    
    // 延迟一下，让加载界面显示
    this.time.delayedCall(500, () => {
      this.scene.start('LoginScene');
    });
  }
}
