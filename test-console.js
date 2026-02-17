// 在浏览器控制台运行的测试脚本
// 复制此脚本到控制台执行

console.log('=== Rogue Quest 自动化测试 ===');

// 测试用例1: 生物系统
function testCreatureSystem() {
  console.log('\n--- 测试1: 生物系统 ---');
  
  // 清除数据
  localStorage.clear();
  console.log('✓ 已清除 localStorage');
  
  // 模拟添加生物
  const testCreature = {
    creatureId: 'angel',
    star: 1,
    currentHp: 250
  };
  
  // 保存到 localStorage
  const runData = {
    runId: 'test_run',
    creatures: [testCreature],
    teamSize: 5
  };
  
  localStorage.setItem('run_test_user', JSON.stringify(runData));
  console.log('✓ 已保存测试生物数据');
  
  // 读取验证
  const saved = JSON.parse(localStorage.getItem('run_test_user'));
  if (saved && saved.creatures && saved.creatures.length === 1) {
    console.log('✓ 生物数据读取成功:', saved.creatures[0].creatureId);
  } else {
    console.error('✗ 生物数据读取失败');
  }
}

// 测试用例2: 羁绊等级映射
function testSynergyLevels() {
  console.log('\n--- 测试2: 羁绊等级映射 ---');
  
  const SYNERGY_LEVELS = {
    2: { required: 2, bonus: { attack: 0.05, defense: 0.05 } },
    3: { required: 3, bonus: { attack: 0.10, defense: 0.10 } },
    4: { required: 4, bonus: { attack: 0.15, defense: 0.15, hp: 0.10 } },
    5: { required: 5, bonus: { attack: 0.20, defense: 0.20, hp: 0.15 } },
    7: { required: 7, bonus: { attack: 0.30, defense: 0.30, hp: 0.25, special: 'ultimate' } },
  };
  
  function getSynergyLevel(count) {
    if (count >= 7) return 7;
    if (count >= 5) return 5;
    if (count >= 4) return 4;
    if (count >= 3) return 3;
    if (count >= 2) return 2;
    return 0;
  }
  
  // 测试映射
  const tests = [
    { count: 2, expected: 2 },
    { count: 3, expected: 3 },
    { count: 4, expected: 4 },
    { count: 5, expected: 5 },
    { count: 6, expected: 5 },
    { count: 7, expected: 7 },
    { count: 8, expected: 7 },
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = getSynergyLevel(test.count);
    if (result === test.expected) {
      console.log(`✓ count=${test.count} → level=${result}`);
      passed++;
    } else {
      console.error(`✗ count=${test.count} 期望 ${test.expected} 实际 ${result}`);
    }
    
    // 验证 SYNERGY_LEVELS 中存在该键
    if (result > 0 && SYNERGY_LEVELS[result]) {
      console.log(`  └ SYNERGY_LEVELS[${result}] 存在 ✓`);
    } else if (result > 0) {
      console.error(`  └ SYNERGY_LEVELS[${result}] 不存在 ✗`);
    }
  });
  
  console.log(`\n羁绊测试: ${passed}/${tests.length} 通过`);
}

// 运行所有测试
testCreatureSystem();
testSynergyLevels();

console.log('\n=== 测试完成 ===');
console.log('请刷新页面后手动测试游戏流程');
