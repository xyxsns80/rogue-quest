// 生物队伍管理器
import { DataManager } from './DataManager';
import type { BattleCreature, Synergy } from './DataManager';
import { CREATURES, getCreatureById, SYNERGY_LEVELS } from '../data/Creatures';
import type { CreatureDef } from '../data/Creatures';

// 全局单例
let instance: CreatureManager | null = null;

export class CreatureManager {
  private creatures: BattleCreature[] = [];
  private teamSize: number = 5;
  
  constructor() {
    // 如果已有实例，返回现有实例
    if (instance) {
      return instance;
    }
    
    // 从存档恢复
    const run = DataManager.getCurrentRun();
    console.log('CreatureManager 初始化，从存档恢复:', run?.creatures?.length || 0, '个生物');
    
    if (run && run.creatures) {
      this.creatures = run.creatures;
      this.teamSize = run.teamSize || 5;
    }
    
    // 保存单例
    instance = this;
  }
  
  // 重置单例（用于测试或重新开始）
  static resetInstance() {
    instance = null;
  }
  
  // 获取当前队伍
  getTeam(): BattleCreature[] {
    return this.creatures;
  }
  
  // 获取队伍上限
  getTeamSize(): number {
    return this.teamSize;
  }
  
  // 设置队伍上限（特殊升级）
  setTeamSize(size: number) {
    this.teamSize = Math.min(size, 7);
  }
  
  // 队伍是否已满
  isTeamFull(): boolean {
    return this.creatures.length >= this.teamSize;
  }
  
  // 添加新生物
  addCreature(creatureId: string): { success: boolean; message: string; upgraded?: boolean; newStar?: number } {
    console.log('=== CreatureManager.addCreature ===');
    console.log('传入 creatureId:', creatureId);
    console.log('当前队伍:', this.creatures.map(c => `${c.creatureId}(★${c.star})`).join(', '));
    console.log('队伍状态:', this.creatures.length, '/', this.teamSize);
    
    const def = getCreatureById(creatureId);
    if (!def) {
      console.error('生物不存在:', creatureId);
      return { success: false, message: '生物不存在' };
    }
    
    // 检查是否已有该生物
    const existing = this.creatures.find(c => c.creatureId === creatureId);
    
    if (existing) {
      // 已有该生物，尝试升星
      if (existing.star >= 3) {
        return { success: false, message: '该生物已满星，无法继续获得' };
      }
      existing.star = (existing.star + 1) as 1 | 2 | 3;
      console.log('升星成功:', def.name, '→ ★', existing.star);
      return { success: true, message: `${def.name} 升星成功！`, upgraded: true, newStar: existing.star };
    }
    
    // 新生物
    if (this.isTeamFull()) {
      console.log('队伍已满，无法添加');
      return { success: false, message: '队伍已满' };
    }
    
    this.creatures.push({
      creatureId,
      star: 1,
      currentHp: def.baseHp,
    });
    console.log('添加成功，当前队伍:', this.creatures.map(c => c.creatureId).join(', '));
    
    return { success: true, message: `获得 ${def.name}！` };
  }
  
  // 获取可用生物池（排除已满星的）
  getAvailableCreatures(): CreatureDef[] {
    const maxedOut = this.creatures
      .filter(c => c.star >= 3)
      .map(c => c.creatureId);
    
    return CREATURES.filter(c => !maxedOut.includes(c.id));
  }
  
  // 生成肉鸽选择
  generateChoices(): CreatureChoice[] {
    console.log('=== generateChoices ===');
    console.log('当前队伍:', this.creatures.length, '/', this.teamSize);
    
    const choices: CreatureChoice[] = [];
    
    if (this.isTeamFull()) {
      // 队伍已满，只返回可以升星的生物
      console.log('队伍已满，只生成升星选项');
      this.creatures.forEach(creature => {
        if (creature.star < 3) {
          const def = getCreatureById(creature.creatureId);
          if (def) {
            choices.push({
              type: 'upgrade',
              creature: def,
              fromStar: creature.star,
              toStar: creature.star + 1,
            });
          }
        }
      });
    } else {
      // 队伍未满，返回所有可用生物
      const available = this.getAvailableCreatures();
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3);
      
      selected.forEach(creature => {
        const existing = this.creatures.find(c => c.creatureId === creature.id);
        
        if (existing) {
          // 升星
          choices.push({
            type: 'upgrade',
            creature,
            fromStar: existing.star,
            toStar: existing.star + 1,
          });
        } else {
          // 新获得
          choices.push({
            type: 'new',
            creature,
          });
        }
      });
    }
    
    console.log('生成选项:', choices.length, choices.map(c => `${c.creature.name}(${c.type})`).join(', '));
    return choices;
  }
  
  // 计算羁绊
  calculateSynergies(): Synergy[] {
    console.log('=== calculateSynergies ===');
    const raceCount: Record<string, number> = {};
    
    // 统计各种族数量
    this.creatures.forEach(c => {
      const def = getCreatureById(c.creatureId);
      if (def) {
        raceCount[def.race] = (raceCount[def.race] || 0) + 1;
        console.log(`生物 ${c.creatureId} 种族: ${def.race}`);
      } else {
        console.warn(`无法找到生物定义: ${c.creatureId}`);
      }
    });
    
    console.log('种族统计:', Object.entries(raceCount).map(([r, c]) => `${r}:${c}`).join(', '));
    
    // 计算羁绊等级
    const synergies: Synergy[] = [];
    for (const [race, count] of Object.entries(raceCount)) {
      const level = this.getSynergyLevel(count);
      if (level > 0) {
        const levelConfig = SYNERGY_LEVELS[level as keyof typeof SYNERGY_LEVELS];
        synergies.push({
          race,
          count,
          level,
          bonus: { ...levelConfig.bonus },
        });
        console.log(`羁绊激活: ${race} 等级${level} (数量:${count})`);
      }
    }
    
    return synergies;
  }
  
  // 获取羁绊等级（返回对应的阈值，用作 SYNERGY_LEVELS 的键）
  private getSynergyLevel(count: number): number {
    if (count >= 7) return 7;
    if (count >= 5) return 5;
    if (count >= 4) return 4;
    if (count >= 3) return 3;
    if (count >= 2) return 2;
    return 0;
  }
  
  // 获取生物完整属性（含星级+羁绊加成）
  getCreatureStats(creature: BattleCreature) {
    console.log('=== getCreatureStats ===', creature.creatureId, 'star:', creature.star);
    
    const def = getCreatureById(creature.creatureId);
    if (!def) {
      console.error('无法找到生物定义:', creature.creatureId);
      return null;
    }
    
    let hp = def.baseHp;
    let attack = def.baseAttack;
    let defense = def.baseDefense;
    let speed = def.baseSpeed;
    
    // 星级加成
    if (creature.star >= 2) {
      hp += def.starBonus[2].hp;
      attack += def.starBonus[2].atk;
      defense += def.starBonus[2].def;
    }
    if (creature.star >= 3) {
      hp += def.starBonus[3].hp;
      attack += def.starBonus[3].atk;
      defense += def.starBonus[3].def;
    }
    
    console.log(`基础属性: HP:${hp} ATK:${attack} DEF:${defense} SPD:${speed}`);
    
    // 羁绊加成
    try {
      const synergies = this.calculateSynergies();
      const raceSynergy = synergies.find(s => s.race === def.race);
      if (raceSynergy) {
        console.log(`应用羁绊加成: ${def.race} 等级${raceSynergy.level}`);
        hp = Math.floor(hp * (1 + (raceSynergy.bonus.hp || 0)));
        attack = Math.floor(attack * (1 + (raceSynergy.bonus.attack || 0)));
        defense = Math.floor(defense * (1 + (raceSynergy.bonus.defense || 0)));
        speed = Math.floor(speed * (1 + (raceSynergy.bonus.speed || 0)));
        console.log(`加成后: HP:${hp} ATK:${attack} DEF:${defense} SPD:${speed}`);
      }
    } catch (e) {
      console.error('羁绊计算出错:', e);
    }
    
    return { hp, attack, defense, speed };
  }
  
  // 保存到RunData
  saveToRun() {
    const run = DataManager.getCurrentRun();
    console.log('=== CreatureManager.saveToRun ===');
    console.log('当前生物:', this.creatures.length, this.creatures.map(c => c.creatureId).join(', '));
    
    if (run) {
      run.creatures = [...this.creatures];  // 复制数组
      run.teamSize = this.teamSize;
      DataManager.saveRunData(run);
      console.log('已保存到 RunData');
    } else {
      console.warn('无法保存：没有当前 RunData');
    }
  }
  
  // 清空队伍（大关卡重置）
  clear() {
    this.creatures = [];
    this.teamSize = 5;
  }
}

// 生物选择项
export interface CreatureChoice {
  type: 'new' | 'upgrade';
  creature: CreatureDef;
  fromStar?: number;
  toStar?: number;
}
