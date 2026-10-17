import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/kaled75/AppData/Local/Programs/Antigravity IDE/resources/app/node_modules/playwright-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.resolve('tests/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const results = [];
const consoleErrors = [];
const networkFailures = [];

async function runSuite() {
  console.log('====================================================');
  console.log('🚀 بدء تشغيل حزمة اختبارات Playwright E2E المستقلة');
  console.log('الهدف: فحص واختبار كافة شاشات وميزات تطبيق رَصيدي');
  console.log('المتصفح: Google Chrome (Headless)');
  console.log('الرابط: ' + APP_URL);
  console.log('====================================================\n');

  const startTime = Date.now();
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-LY',
    colorScheme: 'light'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[Page Uncaught Error] ${err.message}`);
  });

  page.on('requestfailed', req => {
    networkFailures.push(`[Network Failed] ${req.method()} ${req.url()} (${req.failure()?.errorText})`);
  });

  async function step(suite, name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const dur = Date.now() - t0;
      results.push({ suite, test: name, status: 'passed', durationMs: dur });
      console.log(`✅ [${suite}] ${name} (${dur}ms)`);
    } catch (err) {
      const dur = Date.now() - t0;
      results.push({ suite, test: name, status: 'failed', details: err?.message, durationMs: dur });
      console.error(`❌ [${suite}] ${name} (${dur}ms): ${err?.message}`);
    }
  }

  // 1. App Launch & Initial Load
  await step('1. التشغيل والتهيئة', 'تحميل الصفحة الرئيسية والعنوان', async () => {
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 15000 });
    const title = await page.title();
    if (!title.includes('رَصيدي') && !title.includes('Raseedi')) {
      throw new Error(`عنوان الصفحة غير متوقع: ${title}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_initial_load.png'), fullPage: false });
  });

  // 2. Authentication & Lock Screen Validation
  await step('2. الحماية وتسجيل الدخول', 'فحص شاشة القفل وإلغاء القفل برمز الحماية', async () => {
    const lockCount = await page.locator('text=تطبيق رَصيدي مقفل').count();
    if (lockCount > 0) {
      await page.fill('input[type="password"]', '1234');
      await page.click('button:has-text("فتح التطبيق")');
      await page.waitForSelector('text=تطبيق رَصيدي مقفل', { state: 'detached', timeout: 6000 });
      await page.waitForTimeout(500);
    }
  });

  // 3. Dashboard KPIs & Content
  await step('3. لوحة التحكم', 'التحقق من بطاقات المؤشرات والرسوم البيانية', async () => {
    const welcome = await page.locator('text=لوحة التحكم المالية الشخصية').count();
    if (welcome === 0) throw new Error('لم يتم العثور على عنوان لوحة التحكم');
    const cards = await page.locator('text=المستحق لي').count();
    if (cards === 0) throw new Error('لم يتم العثور على بطاقة المستحق لي');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_dashboard.png'), fullPage: false });
  });

  // 4. Navigation to Contacts View
  await step('4. إدارة الأشخاص', 'الانتقال إلى صفحة الأشخاص واستعراض القائمة', async () => {
    await page.click('button:has-text("الأشخاص")');
    await page.waitForTimeout(500);
    const heading = await page.locator('h2:has-text("سجل الأشخاص والجهات")').count();
    if (heading === 0) throw new Error('لم يتم فتح صفحة الأشخاص');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_contacts.png') });
  });

  // 5. Contacts Modal
  await step('4. إدارة الأشخاص', 'فتح نموذج إضافة شخص جديد والتحقق من الحقول', async () => {
    const addBtn = page.locator('button:has-text("إضافة شخص جديد")');
    await addBtn.click();
    await page.waitForTimeout(400);
    const modalTitle = await page.locator('h3:has-text("إضافة شخص جديد")').count();
    if (modalTitle === 0) throw new Error('لم يفتح نموذج إضافة شخص جديد');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_contact_modal.png') });
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // 6. Debts Views
  await step('5. إدارة الديون', 'الانتقال لصفحة ديون مستحقة لي وفحص التبويبات', async () => {
    await page.click('button:has-text("الديون المستحقة لي")');
    await page.waitForTimeout(500);
    const heading = await page.locator('h2:has-text("الديون المستحقة لي")').count();
    if (heading === 0) throw new Error('لم تظهر صفحة ديون مستحقة لي');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_debts_for_me.png') });
  });

  await step('5. إدارة الديون', 'الانتقال لصفحة ديون مستحقة علي وفحص الجدول', async () => {
    await page.click('button:has-text("الديون المستحقة عليّ")');
    await page.waitForTimeout(500);
    const pageTitle = await page.locator('h2:has-text("الديون المستحقة عليّ")').count();
    if (pageTitle === 0) throw new Error('لم تظهر صفحة ديون مستحقة علي');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_debts_on_me.png') });
  });

  // 7. Payments View
  await step('6. المدفوعات', 'الانتقال إلى سجل المدفوعات والتحقق من الحركات', async () => {
    await page.click('button:has-text("المدفوعات")');
    await page.waitForTimeout(500);
    const paymentTitle = await page.locator('h2:has-text("سجل المدفوعات والإيصالات")').count();
    if (paymentTitle === 0) throw new Error('لم تظهر صفحة المدفوعات');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_payments.png') });
  });

  // 8. Calendar View
  await step('7. التقويم والاستحقاقات', 'الانتقال إلى صفحة التقويم والتحقق من الجدول', async () => {
    await page.click('button:has-text("التقويم والاستحقاقات")');
    await page.waitForTimeout(500);
    const calendarTitle = await page.locator('h2:has-text("تقويم الاستحقاقات")').count();
    if (calendarTitle === 0) throw new Error('لم تظهر صفحة التقويم');
  });

  // 8. Reports View
  await step('7. التقارير والتحليلات', 'الانتقال لصفحة التقارير والتحقق من الرسوم البيانية', async () => {
    await page.click('button:has-text("التقارير والتحليلات")');
    await page.waitForTimeout(500);
    const reportTitle = await page.locator('h2:has-text("التقارير والتحليلات المالية")').count();
    if (reportTitle === 0) throw new Error('لم تظهر صفحة التقارير');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_reports.png') });
  });

  // 9. Export View & Save Location Modal Verification
  await step('8. التصدير واختيار مكان الحفظ', 'فتح صفحة التصدير وفحص خيارات ومجلد الحفظ', async () => {
    await page.click('button:has-text("التصدير والطباعة")');
    await page.waitForTimeout(500);
    const exportHeading = await page.locator('h2:has-text("مركز التصدير واختيار مكان الحفظ")').count();
    if (exportHeading === 0) throw new Error('لم تظهر صفحة التصدير');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_export_page.png') });
  });

  await step('8. التصدير واختيار مكان الحفظ', 'التحقق من ظهور نافذة اختيار مكان الحفظ التفاعلية لتقرير HTML', async () => {
    const htmlExportBtn = page.locator('button:has-text("تصدير واختيار مكان حفظ تقرير HTML")');
    await htmlExportBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = await page.locator('h3:has-text("تحديد مكان واسم حفظ تقرير HTML")').count();
    if (modalTitle === 0) throw new Error('لم تنبثق نافذة اختيار مكان حفظ تقرير HTML!');

    const fileNameInput = await page.locator('input[placeholder="أدخل اسم الملف..."]').inputValue();
    if (!fileNameInput.endsWith('.html')) {
      throw new Error(`اسم الملف المقترح في النافذة غير متوقع: ${fileNameInput}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_html_save_modal.png') });
    // Cancel modal
    await page.click('button:has-text("إلغاء")');
    await page.waitForTimeout(300);
  });

  await step('8. التصدير واختيار مكان الحفظ', 'التحقق من ظهور نافذة اختيار مكان الحفظ لمصنف Excel', async () => {
    const xlsxExportBtn = page.locator('button:has-text("تصدير واختيار مكان حفظ Excel")');
    await xlsxExportBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = await page.locator('h3:has-text("تحديد مكان واسم حفظ مصنف Excel")').count();
    if (modalTitle === 0) throw new Error('لم تنبثق نافذة اختيار مكان حفظ ملف Excel!');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_excel_save_modal.png') });
    await page.click('button:has-text("إلغاء")');
    await page.waitForTimeout(300);
  });

  // 10. Backup View & Save Location Modal Verification
  await step('9. النسخ الاحتياطي واختيار مكان الحفظ', 'الانتقال لصفحة النسخ الاحتياطي وفحص الأزرار', async () => {
    await page.click('button:has-text("النسخ الاحتياطي")');
    await page.waitForTimeout(500);
    const backupHeading = await page.locator('h2:has-text("إدارة النسخ الاحتياطي وتحديد مكان الحفظ")').count();
    if (backupHeading === 0) throw new Error('لم تظهر صفحة النسخ الاحتياطي');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_backup_page.png') });
  });

  await step('9. النسخ الاحتياطي واختيار مكان الحفظ', 'التحقق من ظهور نافذة اختيار مكان واسم حفظ النسخة الاحتياطية', async () => {
    const backupBtn = page.locator('button:has-text("حفظ باسم... (اختر مكان واسم الملف الآن 💾)")');
    await backupBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = await page.locator('h3:has-text("تحديد مكان واسم حفظ النسخة الاحتياطية")').count();
    if (modalTitle === 0) throw new Error('لم تنبثق نافذة اختيار مكان حفظ النسخة الاحتياطية!');

    const fileNameInput = await page.locator('input[placeholder="أدخل اسم الملف..."]').inputValue();
    if (!fileNameInput.endsWith('.sqlite3')) {
      throw new Error(`اسم الملف المقترح للنسخة غير متوقع: ${fileNameInput}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_backup_save_modal.png') });
    await page.click('button:has-text("إلغاء")');
    await page.waitForTimeout(300);
  });

  // 11. Settings View & Tabs
  await step('10. الإعدادات والتخصيص', 'الانتقال لصفحة الإعدادات وفحص التبويبات', async () => {
    await page.click('button:has-text("الإعدادات")');
    await page.waitForTimeout(500);
    const settingsHeading = await page.locator('h2:has-text("إعدادات التطبيق والتخصيص")').count();
    if (settingsHeading === 0) throw new Error('لم تظهر صفحة الإعدادات');

    // Test Currency Tab
    await page.click('button:has-text("العملة والأرقام")');
    await page.waitForTimeout(300);
    const currSelect = await page.locator('select').first().inputValue();
    if (!currSelect) throw new Error('لم تظهر قائمة اختيار العملة');

    // Test Privacy Tab
    await page.click('button:has-text("الحماية والخصوصية")');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_settings.png') });
  });

  // 12. About View
  await step('11. حول التطبيق', 'الانتقال لصفحة حول التطبيق وفحص المعلومات', async () => {
    await page.click('button:has-text("حول التطبيق")');
    await page.waitForTimeout(500);
    const aboutTitle = await page.locator('h2:has-text("رَصيدي")').count();
    if (aboutTitle === 0) throw new Error('لم تظهر صفحة حول التطبيق');
  });

  // 13. Mobile Responsive View
  await step('12. التجاوب مع الهاتف المحمول', 'ضبط الشاشة إلى حجم هاتف محمول (375x812) وفحص القائمة', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_mobile_view.png') });
  });

  await browser.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  console.log('\n====================================================');
  console.log(`📊 ملخص نتائج الاختبارات (المدة الإجمالية: ${totalTime} ثانية)`);
  console.log(`✅ الاختبارات الناجحة: ${passedCount}`);
  console.log(`❌ الاختبارات الفاشلة: ${failedCount}`);
  console.log(`⚠️ أخطاء Console المكتشفة: ${consoleErrors.length}`);
  console.log(`🌐 طلبات الشبكة الفاشلة: ${networkFailures.length}`);
  console.log('====================================================\n');

  if (consoleErrors.length > 0) {
    console.log('--- أخطاء Console المسجلة: ---');
    consoleErrors.forEach(err => console.log(err));
  }

  if (networkFailures.length > 0) {
    console.log('--- طلبات الشبكة الفاشلة المسجلة: ---');
    networkFailures.forEach(fail => console.log(fail));
  }

  return {
    results,
    passedCount,
    failedCount,
    totalTime,
    consoleErrors,
    networkFailures
  };
}

runSuite().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
