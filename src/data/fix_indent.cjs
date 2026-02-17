const fs = require('fs');
let content = fs.readFileSync('Creatures.ts', 'utf8');

// 修复 position 属性的缩进
// 将 "  position:" 改为 "    position:"
content = content.replace(/^  position: '(front|back)',$/gm, '    position: \'$1\',');

fs.writeFileSync('Creatures.ts', content);
console.log('Done');
