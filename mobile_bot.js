// Mobile SEO Bot - Sequential Processing
const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

// Configuration
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 10; // Düşük hız - IP rotasyonu için
let IP_ROTATION_INTERVAL = 3;
let TOTAL_VISIT_LIMIT = 0;
let DELAY_BETWEEN_VISITS = 60000 / VISITS_PER_MINUTE;

// Statistics
let visitCount = 0;
let successCount = 0;
let errorCount = 0;
let startTime = Date.now();
let botRunning = false;
let currentIP = 'Unknown';
let isProcessing = false; // Sıralı işlem kontrolü

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

// Puppeteer ile Google Arama
async function performGoogleSearch(keyword) {
    let browser = null;
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        sendLogToDashboard(`🔍 Puppeteer Google arama: "${keyword}"`, 'info', currentIP);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36');
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        sendLogToDashboard(`🔍 Aranan domain: ${siteDomain}`, 'info', currentIP);
        
        const pageTitle = await page.title();
        sendLogToDashboard(`📝 Sayfa: ${pageTitle}`, 'info', currentIP);

        // Hedef siteyi bulmak için daha gelişmiş mantık
        const targetLink = await page.evaluate((domain) => {
            // Tüm linkleri ve içerdikleri metinleri al
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
                // Linkin URL'si veya görünen metni domain'i içeriyorsa
                if (link.href.includes(domain)) {
                     // Google'ın yönlendirme linklerini atla, doğrudan siteye gideni bul
                    if (!link.href.includes('google.com')) {
                        return link.href;
                    }
                }
                // Başlık (h3) içindeki metni kontrol et
                const h3 = link.querySelector('h3');
                if (h3 && h3.innerText.toLowerCase().includes(domain.split('.')[0])) {
                     if (!link.href.includes('google.com')) {
                        return link.href;
                    }
                }
            }
            return null;
        }, siteDomain);

        let found = false;
        if (targetLink) {
            sendLogToDashboard(`🎯 Hedef bulundu: ${targetLink}`, 'success', currentIP);
            
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
                page.goto(targetLink) // Doğrudan linke gitmek daha güvenilir
            ]);

            sendLogToDashboard(`✅ Hedef siteye gidildi: ${await page.title()}`, 'success', currentIP);
            found = true;
        }
        
        if (found) {
            return true;
        } else {
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı (${links.length} link kontrol edildi)`, 'error', currentIP);
            return false;
        }

    } catch (error) {
        console.error('Puppeteer error:', error); // Detaylı hata logu
        sendLogToDashboard(`❌ Puppeteer arama hatası: ${error.message}`, 'error', currentIP);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Ana trafik üretimi - SIRALI
async function generateMobileTraffic() {
    if (!botRunning || isProcessing) return;
    
    isProcessing = true; // İşlem başladı
    
    if (TOTAL_VISIT_LIMIT > 0 && visitCount >= TOTAL_VISIT_LIMIT) {
        console.log(`🏁 Ziyaret limiti ulaşıldı: ${TOTAL_VISIT_LIMIT}`);
        stopBot();
        isProcessing = false;
        return;
    }
    
    visitCount++;
    
    // HER ZİYARET ÖNCESINDE IP DEĞİŞTİR
    console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
    sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info', currentIP);
    
    await rotateMobileData(); // IP değiştir ve bekle
    
    // İnternet bağlantısının tamamen kurulmasını bekle
    console.log(`⏳ İnternet bağlantısı kontrol ediliyor...`);
    sendLogToDashboard(`⏳ İnternet bağlantısı bekleniyor...`, 'info', currentIP);
    
    let connectionReady = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!connectionReady && attempts < maxAttempts) {
        attempts++;
        try {
            // Puppeteer ile basit bir istek atarak bağlantıyı test et
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            await page.goto('https://www.google.com', { timeout: 10000 });
            await browser.close();
            connectionReady = true;
            console.log(`✅ İnternet bağlantısı hazır (${attempts}. deneme)`);
            sendLogToDashboard(`✅ İnternet bağlantısı hazır`, 'success', currentIP);
        } catch (error) {
            console.log(`⏳ Bağlantı bekleniyor... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 saniye bekle
        }
    }
    
    if (!connectionReady) {
        console.log(`❌ İnternet bağlantısı kurulamadı`);
        sendLogToDashboard(`❌ İnternet bağlantısı kurulamadı`, 'error', currentIP);
        isProcessing = false;
        return;
    }
    
    const newIP = await getCurrentMobileIP();
    console.log(`🌐 Yeni IP: ${newIP}`);
    sendLogToDashboard(`🌐 Yeni IP alındı: ${newIP}`, 'success', newIP);
    currentIP = newIP;
    
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

    try {
        currentIP = await getCurrentMobileIP();
        console.log(`🌐 Kullanılan IP: ${currentIP}`);
        
        const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
        const visitSuccess = await performGoogleSearch(keyword);
        
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
    }
    
    isProcessing = false; // İşlem bitti
}

// SIRALI bot çalıştırma
async function runSequentialTraffic() {
    while (botRunning) {
        await generateMobileTraffic();
        
        if (botRunning) {
            console.log(`⏱️ ${DELAY_BETWEEN_VISITS/1000} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VISITS));
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
    
    console.log('📱 Mobile SEO Bot başlatıldı (Sıralı İşlem)');
    sendLogToDashboard('📱 Mobile SEO Bot başlatıldı (Sıralı İşlem)', 'success');
    
    runSequentialTraffic(); // Sıralı çalıştır
}

function stopBot() {
    if (!botRunning) return;
    
    botRunning = false;
    
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

console.log('📱 Mobile SEO Bot - HTTP Only (Sıralı İşlem)');
console.log('🔄 Mobil veri rotasyonu ile IP değiştirme');
console.log('📱 Dashboard: mobile_dashboard.html');
console.log('✅ Mobil bot hazır...');