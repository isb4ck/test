// Mobile SEO Bot - Sadece Google Arama
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { setTimeout: delay } = require('timers/promises');
const WebSocket = require('ws');
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

puppeteer.use(StealthPlugin());

// Configuration
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 20;
let IP_ROTATION_INTERVAL = 5;
let TOTAL_VISIT_LIMIT = 0;
let DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;

// Statistics
let visitCount = 0;
let successCount = 0;
let errorCount = 0;
let startTime = Date.now();
let botRunning = false;
let botInterval = null;
let currentIP = 'Unknown';

// WebSocket server
let wss;
try {
    wss = new WebSocket.Server({ port: 8090 });
    console.log('🌐 WebSocket Server: ws://localhost:8090');
} catch (error) {
    wss = new WebSocket.Server({ port: 8091 });
    console.log('🌐 WebSocket Server: ws://localhost:8091');
}

function sendLogToDashboard(message, logType = 'info', ip = null) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'log',
                message: message,
                logType: logType,
                ip: ip
            }));
        }
    });
}

// Google arama ve tıklama
async function searchAndClickGoogle(page) {
    try {
        const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
        console.log(`🔍 Google arama: "${keyword}"`);
        sendLogToDashboard(`🔍 Google arama: "${keyword}"`, 'info', currentIP);
        
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 20000 });
        
        // Çerez kabul et
        try {
            await page.waitForSelector('button[id="L2AGLb"]', { timeout: 3000 });
            await page.click('button[id="L2AGLb"]');
            await delay(1000);
        } catch (e) {}
        
        // Hedef domain
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        const searchPageContent = await page.content();
        
        if (searchPageContent.includes(siteDomain)) {
            console.log(`🎯 ${siteDomain} Google'da bulundu!`);
            sendLogToDashboard(`🎯 ${siteDomain} Google'da bulundu!`, 'success', currentIP);
            
            // Tüm linkleri kontrol et
            const allLinks = await page.$$('a');
            
            for (let i = 0; i < Math.min(allLinks.length, 30); i++) {
                try {
                    const href = await allLinks[i].evaluate(el => el.href);
                    if (href && href.includes(siteDomain)) {
                        console.log(`🎯 Hedef link bulundu: ${href}`);
                        sendLogToDashboard(`🎯 Google'da tıklanıyor`, 'success', currentIP);
                        
                        await allLinks[i].click();
                        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
                        
                        const finalUrl = page.url();
                        if (finalUrl.includes(siteDomain)) {
                            sendLogToDashboard(`✅ Hedef siteye başarıyla giriş`, 'success', currentIP);
                            await simulateMobileBrowsing(page);
                            return true;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        // Site: araması dene
        console.log(`🔄 Site: araması deneniyor...`);
        const siteSearchUrl = `https://www.google.com/search?q=site:${siteDomain}`;
        await page.goto(siteSearchUrl, { waitUntil: 'networkidle0', timeout: 20000 });
        await delay(2000);
        
        const siteLinks = await page.$$('a');
        for (let i = 0; i < Math.min(siteLinks.length, 10); i++) {
            try {
                const href = await siteLinks[i].evaluate(el => el.href);
                if (href && href.includes(siteDomain)) {
                    console.log(`🎯 Site: aramasında bulundu`);
                    sendLogToDashboard(`🎯 Site: aramasında bulundu`, 'success', currentIP);
                    
                    await siteLinks[i].click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
                    
                    await simulateMobileBrowsing(page);
                    return true;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Manuel giriş
        console.log(`🎯 Manuel giriş yapılıyor`);
        sendLogToDashboard(`🎯 Manuel olarak siteye giriş`, 'info', currentIP);
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await simulateMobileBrowsing(page);
        return true;
        
    } catch (error) {
        console.log(`❌ Google arama hatası: ${error.message}`);
        sendLogToDashboard(`❌ Arama hatası: ${error.message}`, 'error', currentIP);
        return false;
    }
}

// Mobil gezinti simülasyonu
async function simulateMobileBrowsing(page) {
    try {
        console.log(`📱 Mobil gezinti başlatılıyor...`);
        sendLogToDashboard(`📱 Sitede mobil gezinti`, 'info', currentIP);
        
        // Mobil scroll
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                window.scrollTo({ top: window.scrollY + 300, behavior: 'smooth' });
            });
            await delay(1500);
        }
        
        // Rastgele link tıklama
        if (Math.random() > 0.6) {
            const internalLinks = await page.$$('a[href*="' + new URL(TARGET_URL).hostname + '"]');
            if (internalLinks.length > 0) {
                const randomLink = internalLinks[Math.floor(Math.random() * internalLinks.length)];
                try {
                    await randomLink.click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
                    sendLogToDashboard(`🔗 İç sayfa ziyareti`, 'info', currentIP);
                    await delay(3000);
                } catch (e) {}
            }
        }
        
        // Son scroll ve bekleme
        await page.evaluate(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        });
        await delay(2000);
        
        sendLogToDashboard(`✅ Mobil gezinti tamamlandı`, 'success', currentIP);
        
    } catch (error) {
        console.log(`⚠️ Gezinti hatası: ${error.message}`);
    }
}

// Ana trafik üretimi
async function generateMobileTraffic() {
    if (!botRunning) return;
    
    if (TOTAL_VISIT_LIMIT > 0 && visitCount >= TOTAL_VISIT_LIMIT) {
        console.log(`🏁 Ziyaret limiti ulaşıldı: ${TOTAL_VISIT_LIMIT}`);
        stopBot();
        return;
    }
    
    visitCount++;
    
    // IP rotasyonu
    if (visitCount % IP_ROTATION_INTERVAL === 0) {
        console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
        sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info', currentIP);
        
        await rotateMobileData();
        
        const newIP = await getCurrentMobileIP();
        console.log(`🌐 Yeni IP: ${newIP}`);
        sendLogToDashboard(`🌐 Yeni IP alındı: ${newIP}`, 'success', newIP);
        currentIP = newIP;
    }
    
    console.log(`🚀 Mobil ziyaret #${visitCount} başlatılıyor...`);
    
    // İstatistikleri güncelle
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning: true }
            }));
        }
    });

    let browser = null;
    try {
        // Termux için browser path'ini otomatik bul
        let executablePath = null;
        const browserPaths = [
            '/data/data/com.termux/files/usr/bin/chromium',
            '/data/data/com.termux/files/usr/bin/firefox',
            process.env.PUPPETEER_EXECUTABLE_PATH
        ];
        
        for (const path of browserPaths) {
            if (path && require('fs').existsSync(path)) {
                executablePath = path;
                break;
            }
        }
        
        const launchOptions = {
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--user-agent=Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            ]
        };
        
        if (executablePath) {
            launchOptions.executablePath = executablePath;
            console.log(`🌐 Browser path: ${executablePath}`);
        }
        
        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        
        // Mobil viewport
        await page.setViewport({
            width: 375,
            height: 667,
            isMobile: true,
            hasTouch: true
        });
        
        currentIP = await getCurrentMobileIP();
        console.log(`🌐 Kullanılan IP: ${currentIP}`);
        
        const visitSuccess = await searchAndClickGoogle(page);
        
        if (visitSuccess) {
            successCount++;
            console.log(`✅ Mobil ziyaret #${visitCount} başarılı`);
            sendLogToDashboard(`✅ Ziyaret #${visitCount} başarılı`, 'success', currentIP);
        } else {
            errorCount++;
            console.log(`❌ Mobil ziyaret #${visitCount} başarısız`);
            sendLogToDashboard(`❌ Ziyaret #${visitCount} başarısız`, 'error', currentIP);
        }

    } catch (error) {
        errorCount++;
        console.log(`❌ Ziyaret #${visitCount} hatası: ${error.message}`);
        sendLogToDashboard(`❌ Ziyaret hatası: ${error.message}`, 'error', currentIP);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Bot kontrol fonksiyonları
function startBot() {
    if (botRunning) return;
    
    botRunning = true;
    startTime = Date.now();
    visitCount = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log('📱 Mobile SEO Bot başlatıldı');
    sendLogToDashboard('📱 Mobile SEO Bot başlatıldı', 'success');
    
    if (botInterval) clearInterval(botInterval);
    
    generateMobileTraffic();
    
    botInterval = setInterval(async () => {
        await generateMobileTraffic();
    }, DELAY_BETWEEN_VISITS);
}

function stopBot() {
    if (!botRunning) return;
    
    botRunning = false;
    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    
    console.log('🛑 Mobile SEO Bot durduruldu');
    sendLogToDashboard('🛑 Mobile SEO Bot durduruldu', 'error');
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning: false }
            }));
        }
    });
}

// WebSocket bağlantı yöneticisi
wss.on('connection', (ws) => {
    console.log('📱 Mobile Dashboard bağlandı');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.action) {
                case 'start':
                    startBot();
                    break;
                case 'stop':
                    stopBot();
                    break;
                case 'config':
                    TARGET_URL = data.targetUrl || TARGET_URL;
                    SEARCH_KEYWORDS = data.keywords || SEARCH_KEYWORDS;
                    VISITS_PER_MINUTE = data.visitsPerMinute || VISITS_PER_MINUTE;
                    IP_ROTATION_INTERVAL = data.ipRotation || IP_ROTATION_INTERVAL;
                    TOTAL_VISIT_LIMIT = data.totalVisitLimit || 0;
                    DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;
                    console.log(`⚙️ Mobil bot ayarları güncellendi`);
                    break;
            }
            
            ws.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning }
            }));
            
        } catch (error) {
            console.log('❌ WebSocket hatası:', error.message);
        }
    });
});

console.log('📱 Mobile SEO Bot - Google Arama Trafiği');
console.log('🔄 Mobil veri rotasyonu ile IP değiştirme');
console.log('📱 Dashboard: mobile_dashboard.html');
console.log('✅ Mobil bot hazır...');