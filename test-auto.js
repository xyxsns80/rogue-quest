// 自动化测试脚本
import puppeteer from 'puppeteer';

async function runTests() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // 收集控制台日志
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[浏览器]', text);
  });
  
  // 收集错误
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('[页面错误]', error.message);
  });
  
  try {
    console.log('=== TC-001: 打开游戏 ===');
    await page.goto('https://xyxsns80.github.io/rogue-quest/', { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    console.log('=== TC-002: 清除数据并开始 ===');
    await page.evaluate(() => {
      localStorage.clear();
      location.reload();
    });
    await sleep(2000);
    
    // 点击开始冒险
    console.log('=== TC-003: 点击开始冒险 ===');
    const startBtn = await page.waitForSelector('#start-adventure', { timeout: 5000 });
    await startBtn.click();
    await sleep(3000);
    
    // 等待战斗结束
    console.log('=== TC-004: 等待第一场战斗结束 ===');
    await sleep(15000);  // 战斗大约需要10-15秒
    
    // 检查是否出现肉鸽选择
    console.log('=== TC-005: 检查肉鸽选择界面 ===');
    const skillOptions = await page.$$('.skill-option');
    console.log('找到选项数量:', skillOptions.length);
    
    if (skillOptions.length > 0) {
      // 点击第一个选项
      console.log('=== TC-006: 选择第一个选项 ===');
      await skillOptions[0].click();
      await sleep(2000);
      
      // 检查是否进入下一场战斗
      console.log('=== TC-007: 检查是否进入第二场战斗 ===');
      const battleLog = await page.$('#battle-log');
      if (battleLog) {
        const logText = await page.evaluate(el => el.textContent, battleLog);
        console.log('战斗日志:', logText.substring(0, 200));
      }
      
      // 等待第二场战斗结束
      console.log('=== TC-008: 等待第二场战斗结束 ===');
      await sleep(15000);
      
      // 再次检查肉鸽选择
      const skillOptions2 = await page.$$('.skill-option');
      console.log('第二关选项数量:', skillOptions2.length);
      
      if (skillOptions2.length > 0) {
        // 点击第一个选项（可能是同种族生物）
        console.log('=== TC-009: 选择第二个选项 ===');
        await skillOptions2[0].click();
        await sleep(3000);
        
        // 检查是否有错误
        console.log('=== TC-010: 检查第三场战斗是否正常 ===');
        if (errors.length > 0) {
          console.error('发现错误:', errors);
        } else {
          console.log('没有发现页面错误');
        }
        
        // 检查控制台日志
        const synergyLogs = logs.filter(l => l.includes('羁绊'));
        console.log('羁绊相关日志:', synergyLogs);
      }
    }
    
    console.log('\n=== 测试结果 ===');
    console.log('错误数量:', errors.length);
    console.log('日志数量:', logs.length);
    
    // 截图
    await page.screenshot({ path: '/tmp/test-result.png' });
    console.log('截图已保存到 /tmp/test-result.png');
    
  } catch (error) {
    console.error('测试执行出错:', error);
  } finally {
    await browser.close();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTests();
