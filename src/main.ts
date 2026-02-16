import Phaser from 'phaser';

// 场景
import BootScene from './scenes/BootScene';
import LoginScene from './scenes/LoginScene';
import MainScene from './scenes/MainScene';
import BattleScene from './scenes/BattleScene';

// 游戏配置
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  banner: false,
  scene: [BootScene, LoginScene, MainScene, BattleScene]
};

// 创建游戏实例
const game = new Phaser.Game(config);

// 暴露游戏实例供 HTML UI 使用
(window as any).game = game;

export default game;
