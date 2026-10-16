const fs = require('fs');
const p = 'C:/Users/Mohamed Helmy/Downloads/The_Calm_WMS_V2.1/wms-monorepo/apps/web/src/app/dashboard/DashboardContent.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/stroke="rgba\(255,255,255,0\.4\)"/g, 'stroke="var(--text-muted)"');
c = c.replace(/stroke="rgba\(255,255,255,0\.7\)"/g, 'stroke="var(--text-secondary)"');
c = c.replace(/stroke="rgba\(255,255,255,0\.05\)"/g, 'stroke="var(--border-light)"');
c = c.replace(/fill="rgba\(255,255,255,0\.02\)"/g, 'fill="var(--bg-tertiary)"');
c = c.replace(/backgroundColor: 'rgba\(15, 23, 42, 0\.9\)'/g, 'backgroundColor: \'var(--bg-secondary)\'');
c = c.replace(/border: '1px solid rgba\(255,255,255,0\.1\)'/g, 'border: \'1px solid var(--border-light)\'');

c = c.replace(/color: 'rgba\(255,255,255,0\.8\)'/g, 'color: \'var(--text-secondary)\'');
c = c.replace(/color: 'rgba\(255,255,255,0\.7\)'/g, 'color: \'var(--text-secondary)\'');
c = c.replace(/color: 'rgba\(255,255,255,0\.6\)'/g, 'color: \'var(--text-secondary)\'');
c = c.replace(/color: 'rgba\(255,255,255,0\.5\)'/g, 'color: \'var(--text-muted)\'');
c = c.replace(/color: 'rgba\(255,255,255,0\.4\)'/g, 'color: \'var(--text-muted)\'');
c = c.replace(/color: 'white'/g, 'color: \'var(--text-primary)\'');

c = c.replace(/background: 'rgba\(255,255,255,0\.1\)'/g, 'background: \'var(--bg-tertiary)\'');
c = c.replace(/background: 'rgba\(255,255,255,0\.03\)'/g, 'background: \'var(--bg-glass)\'');
c = c.replace(/background: 'rgba\(0,0,0,0\.2\)'/g, 'background: \'var(--bg-glass)\'');
c = c.replace(/borderBottom: '1px solid rgba\(255,255,255,0\.08\)'/g, 'borderBottom: \'1px solid var(--border-light)\'');
c = c.replace(/borderBottom: i !== 4 \? '1px solid rgba\(255,255,255,0\.05\)'/g, 'borderBottom: i !== 4 ? \'1px solid var(--border-light)\'');
c = c.replace(/border: '1px solid rgba\(255,255,255,0\.08\)'/g, 'border: \'1px solid var(--border-light)\'');
c = c.replace(/border: '1px solid rgba\(255,255,255,0\.2\)'/g, 'border: \'1px solid var(--border-light)\'');

fs.writeFileSync(p, c);
console.log('Colors replaced successfully!');
