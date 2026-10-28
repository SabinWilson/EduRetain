const fs = require('fs');
const path = require('path');
const puppeteer = require('../server/node_modules/puppeteer-core');

const executablePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function setAuth(page, email, password) {
  const res = await page.evaluate(async (e, p) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e, password: p })
    });
    const d = await r.json();
    if (d.success) {
      localStorage.setItem('eduretain_token', d.token);
      localStorage.setItem('eduretain_user', JSON.stringify(d.user));
      return d.user;
    }
    return null;
  }, email, password);
  return res;
}

async function capture() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Figure A.1: Production Login Page
  console.log('Capturing Figure A.1: Login page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a1_login.png') });

  // 2. Figure A.2: Administrator Dashboard
  console.log('Capturing Figure A.2: Administrator dashboard...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@eduretain.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  await setAuth(page, adminEmail, adminPassword);

  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a2_admin_dashboard.png') });

  // 7. Figure A.7: Model Metrics and User Management Tables (admin)
  console.log('Capturing Figure A.7: Model metrics...');
  await page.goto('http://localhost:5173/admin/metrics', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a7_model_metrics.png') });

  // 3. Figure A.3: Mentor Student Directory with Risk Badges and Filters
  console.log('Capturing Figure A.3: Mentor student directory...');
  await page.evaluate(() => localStorage.clear());
  await setAuth(page, 'mentor1@eduretain.com', 'Mentor@123');
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a3_mentor_directory.png') });

  // 4. Figure A.4: Student Risk Profile with Indicators
  console.log('Capturing Figure A.4: Student risk profile...');
  const studentId = await page.evaluate(async () => {
    const res = await fetch('/api/students?limit=1').then(r => r.json());
    return res.data?.[0]?._id;
  });
  if (studentId) {
    await page.goto(`http://localhost:5173/students/${studentId}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a4_student_risk_profile.png') });

  // 5. Figure A.5: Intervention Log with Before and After Scores
  console.log('Capturing Figure A.5: Intervention log...');
  await page.goto('http://localhost:5173/interventions', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a5_intervention_log.png') });

  // 6. Figure A.6: Student Workspace
  console.log('Capturing Figure A.6: Student workspace...');
  await page.evaluate(() => localStorage.clear());
  await setAuth(page, 'student1@eduretain.com', 'Student@123');
  await page.goto('http://localhost:5173/portal', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'fig_a6_student_workspace.png') });

  await browser.close();
  console.log('SUCCESS: All 7 screenshots captured in screenshots/ directory!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
