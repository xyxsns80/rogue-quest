// 用户数据接口
export interface UserData {
  userId: string;
  username: string;
  level: number;
  exp: number;
  expToLevel: number;
  gold: number;
  diamond: number;
  heroes: {
    [key: string]: {
      unlocked: boolean;
      level: number;
    };
  };
  talents: {
    attack: number;
    defense: number;
    utility: number;
  };
  equipment: {
    weapon: any;
    armor: any;
    accessory: any;
  };
  inventory: any[];
  statistics: {
    totalRuns: number;
    bestLevel: number;
    totalGold: number;
  };
  idleRewards: {
    rate: number;
    lastCollectTime: number;
  };
  createdAt: number;
  lastLoginAt: number;
}

// 冒险数据接口
export interface RunData {
  runId: string;
  heroId: string;
  heroLevel: number;
  currentLevel: number;
  currentHp: number;
  maxHp: number;
  skills: any[];
  equipment: any[];
  gold: number;
  exp: number;
  startTime: number;
  status: 'ongoing' | 'completed' | 'failed';
  levelsCompleted: number[];
}

// 数据管理器
export class DataManager {
  private static currentUser: UserData | null = null;
  private static currentRun: RunData | null = null;

  static init() {
    // 初始化时可以做一些检查
    console.log('DataManager initialized');
  }

  // 保存用户数据
  static saveUserData(user: UserData) {
    const key = `user_${user.userId}`;
    localStorage.setItem(key, JSON.stringify(user));
  }

  // 加载用户数据
  static loadUserData(userId: string): UserData | null {
    const key = `user_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // 设置当前用户
  static setCurrentUser(user: UserData) {
    this.currentUser = user;
    user.lastLoginAt = Date.now();
    this.saveUserData(user);
  }

  // 获取当前用户
  static getCurrentUser(): UserData | null {
    return this.currentUser;
  }

  // 保存冒险数据
  static saveRunData(run: RunData) {
    if (!this.currentUser) return;
    const key = `run_${this.currentUser.userId}`;
    localStorage.setItem(key, JSON.stringify(run));
    this.currentRun = run;
  }

  // 加载冒险数据
  static loadRunData(): RunData | null {
    if (!this.currentUser) return null;
    const key = `run_${this.currentUser.userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // 清除冒险数据
  static clearRunData() {
    if (!this.currentUser) return;
    const key = `run_${this.currentUser.userId}`;
    localStorage.removeItem(key);
    this.currentRun = null;
  }

  // 获取当前冒险数据
  static getCurrentRun(): RunData | null {
    if (!this.currentRun && this.currentUser) {
      this.currentRun = this.loadRunData();
    }
    return this.currentRun;
  }

  // 更新用户数据
  static updateUserData(updates: Partial<UserData>) {
    if (!this.currentUser) return;
    Object.assign(this.currentUser, updates);
    this.saveUserData(this.currentUser);
  }
}
