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
  private static readonly LAST_USER_KEY = 'last_user_id';

  static init() {
    // 初始化时尝试恢复上次登录的用户
    this.restoreLastUser();
    console.log('DataManager initialized, user restored:', this.currentUser?.username);
  }

  // 恢复上次登录的用户
  private static restoreLastUser() {
    const lastUserId = localStorage.getItem(this.LAST_USER_KEY);
    if (lastUserId) {
      const user = this.loadUserData(lastUserId);
      if (user) {
        this.currentUser = user;
      }
    }
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
    // 保存最后登录的用户ID，用于刷新后恢复
    localStorage.setItem(this.LAST_USER_KEY, user.userId);
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
