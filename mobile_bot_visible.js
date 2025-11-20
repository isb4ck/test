// Mobile SEO Bot - Görünür Tarayıcı Versiyonu
const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

// Configuration
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 10;
let DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;

// Statistics
let visitCount = 0;
let successCount = 0;
let errorCount = 0;
let botRunning = false;
let currentIP = 'Unknown';
let browser = null;
let page = null;

// WebSocket server
let wss = new WebSocket.Server({ port: 8090 });

function sendLogToDashboard(message, logType = 'info', ip = null) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
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

async function initBrowser() {
    try {
        console.log('🌐 Tarayıcı başlatılıyor...');
        
        browser = await puppeteer.launch({
            headless: false, // GÖRÜNÜR TARAYICI
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--user-agent=Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            ]
        });
        
        page = await browser.newPage();
        
        // Mobil görünüm
        await page.setViewport({ width: 375, height: 667 });
        
        console.log('✅ Tarayıcı hazır');
        sendLogToDashboard('✅ Görünür tarayıcı başlatıldı', 'success');
        
        return true;
    } catch (error) {
        console.log(`❌ Tarayıcı hatası: ${error.message}`);
        sendLogToDashboard(`❌ Tarayıcı hatası: ${error.message}`, 'error');
        return false;
    }
}

async function searchGoogleVisible(keyword) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        console.log(`🔍 Görünür Google arama: "${keyword}"`);
        sendLogToDashboard(`🔍 Görünür Google arama: "${keyword}"`, 'info', currentIP);
        
        // Google'a git
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // 2 saniye bekle (görsel için)
        await page.waitForTimeout(2000);
        
        // Arama sonuçlarını bekle
        await page.waitForSelector('a', { timeout: 10000 });
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        console.log(`🔍 Aranan domain: ${siteDomain}`);
        sendLogToDashboard(`🔍 Aranan domain: ${siteDomain}`, 'info', currentIP);
        
        // Tüm linkleri al
        const links = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a'));
            return allLinks.map(link => link.href).filter(href => href && href.startsWith('http'));
        });
        
        console.log(`📊 Toplam ${links.length} link bulundu`);
        sendLogToDashboard(`📊 ${links.length} link bulundu`, 'info', currentIP);
        
        // Linkleri kontrol et
        let found = false;
        for (let i = 0; i < Math.min(links.length, 20); i++) {
            const href = links[i];
            console.log(`🔗 Link ${i+1}: ${href}`);
            
            if (href.includes(siteDomain)) {
                console.log(`🎯 BULUNDU! Hedef site: ${href}`);
                sendLogToDashboard(`🎯 Hedef site bulundu: ${href}`, 'success', currentIP);
                
                // Linke tıkla
                await page.evaluate((url) => {
                    const link = Array.from(document.querySelectorAll('a')).find(a => a.href.includes(url));
                    if (link) link.click();
                }, siteDomain);
                
                await page.waitForTimeout(3000); // 3 saniye bekle
                found = true;
                break;
            }
        }
        
        if (found) {
            console.log(`✅ Site bulundu ve ziyaret edildi`);
            sendLogToDashboard(`✅ Hedef siteye başarıyla gidildi`, 'success', currentIP);
            return true;
        } else {
            console.log(`❌ ${siteDomain} hiçbir linkte bulunamadı`);
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı`, 'error', currentIP);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Görünür arama hatası: ${error.message}`);
        sendLogToDashboard(`❌ Görünür arama hatası: ${error.message}`, 'error', currentIP);
        return false;
    }
}

async function generateVisibleTraffic() {
    if (!botRunning) return;
    
    visitCount++;
    
    // IP değiştir
    console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
    sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info', currentIP);
    
    await rotateMobileData();
    
    const newIP = await getCurrentMobileIP();
    console.log(`🌐 Yeni IP: ${newIP}`);
    sendLogToDashboard(`🌐 Yeni IP alındı: ${newIP}`, 'success', newIP);
    currentIP = newIP;
    
    // İstatistikleri güncelle
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'stats',
                data: { visitCount, successCount, errorCount, botRunning: true }
            }));
        }
    });

    try {
        const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
        const visitSuccess = await searchGoogleVisible(keyword);
        
        if (visitSuccess) {
            successCount++;
            console.log(`✅ Görünür ziyaret #${visitCount} başarılı`);
            sendLogToDashboard(`✅ Ziyaret #${visitCount} başarılı`, 'success', currentIP);
        } else {
            errorCount++;
            console.log(`❌ Görünür ziyaret #${visitCount} başarısız`);
            sendLogToDashboard(`❌ Ziyaret #${visitCount} başarısız`, 'error', currentIP);
        }

    } catch (error) {
        errorCount++;
        console.log(`❌ Ziyaret #${visitCount} hatası: ${error.message}`);
        sendLogToDashboard(`❌ Ziyaret hatası: ${error.message}`, 'error', currentIP);
    }
}

async function runVisibleBot() {
    while (botRunning) {
        await generateVisibleTraffic();
        
        if (botRunning) {
            console.log(`⏱️ ${DELAY_BETWEEN_VISITS/1000} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VISITS));
        }
    }
}

async function startBot() {
    if (botRunning) return;
    
    if (!browser) {
        const browserReady = await initBrowser();
        if (!browserReady) return;
    }
    
    botRunning = true;
    visitCount = 0;
    successCount = 0;
    errorCount = 0;
    
    console.log('📱 Görünür Mobile SEO Bot başlatıldı');
    sendLogToDashboard('📱 Görünür Mobile SEO Bot başlatıldı', 'success');
    
    runVisibleBot();
}

async function stopBot() {
    if (!botRunning) return;
    
    botRunning = false;
    
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
    
    console.log('🛑 Görünür Mobile SEO Bot durduruldu');
    sendLogToDashboard('🛑 Görünür Mobile SEO Bot durduruldu', 'error');
}

// WebSocket bağlantı yöneticisi
wss.on('connection', (ws) => {
    console.log('📱 Dashboard bağlandı');
    
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
                    DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;
                    console.log(`⚙️ Bot ayarları güncellendi`);
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

console.log('📱 Görünür Mobile SEO Bot hazır...');
console.log('🌐 WebSocket Server: ws://localhost:8090');
console.log('📱 Dashboard: mobile_dashboard.html');