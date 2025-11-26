// Mobile SEO Bot - Advanced Traffic Simulator
const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

// ---------------- CONFIG ----------------
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 8;
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
let isProcessing = false;

// WebSocket server
let wss;
try {
    wss = new WebSocket.Server({ port: 8090 });
    console.log('🌐 WebSocket Server: ws://localhost:8090');
} catch (error) {
    wss = new WebSocket.Server({ port: 8091 });
    console.log('🌐 WebSocket Server: ws://localhost:8091');
}

// Utility
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Chrome Version Rotation
const CHROME_VERSIONS = [
    "117.0.5938.60",
    "118.0.5993.70",
    "120.0.6099.20",
    "121.0.6200.10"
];

// DNS Rotation
const DNS_LIST = ["8.8.8.8", "1.1.1.1", "9.9.9.9"];

// Mobile App Traffic (Fake Requests)
const APP_DOMAINS = [
    "https://i.instagram.com/api/v1/users/",
    "https://www.youtube.com/youtubei/v1/browse",
    "https://web.whatsapp.com/check/",
    "https://m.facebook.com/api/graphql/"
];

// Behavior Modes
const BEHAVIOR_MODES = ["normal", "wrong_search", "bounce", "no_click"];

// Send log to dashboard
function sendLogToDashboard(message, logType = 'info', ip = null) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'log',
                message: message,
                logType: logType,
                ip: ip || currentIP
            }));
        }
    });
}

// Mobile-like curl wrapper with signal noise + DNS rotation
async function mobileCurl(url) {
    const chrome = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)];
    const dns = DNS_LIST[Math.floor(Math.random() * DNS_LIST.length)];
    const maxTime = Math.floor(Math.random() * 6) + 4; // 4–10s timeout

    const ua = `Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/${chrome} Mobile Safari/537.36`;

    const cmd = `curl -s --dns-servers ${dns} -A "${ua}" --max-time ${maxTime} "${url}"`;

    try {
        const { stdout } = await execAsync(cmd);
        return stdout;
    } catch (error) {
        sendLogToDashboard(`❌ Curl hatası: ${error.message}`, 'error');
        return '';
    }
}

// Fake mobile app signals
async function simulateAppTraffic() {
    const url = APP_DOMAINS[Math.floor(Math.random() * APP_DOMAINS.length)];
    await mobileCurl(url);
    sendLogToDashboard(`📱 Mobil uygulama sinyali: ${url.split('/')[2]}`, 'info');
}

// Google Search Simulation
async function performGoogleSearch(keyword) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        sendLogToDashboard(`🔍 Google arama: "${keyword}"`, 'info');
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        
        // SERP depth (page 1-3)
        const depth = [0, 10, 20][Math.floor(Math.random() * 3)];
        const searchWithDepth = `${searchUrl}&start=${depth}`;
        
        const html = await mobileCurl(searchWithDepth);
        sendLogToDashboard(`📄 SERP sayfa ${depth/10 + 1} tarandı`, 'info');
        
        // Domain kontrolü
        const domainVariations = [
            siteDomain,
            siteDomain.replace('.com.tr', ''),
            siteDomain.replace('.com', ''),
            TARGET_URL
        ];
        
        let domainFound = false;
        let foundVariation = '';
        
        for (const variation of domainVariations) {
            if (html.toLowerCase().includes(variation.toLowerCase())) {
                domainFound = true;
                foundVariation = variation;
                break;
            }
        }
        
        if (domainFound) {
            sendLogToDashboard(`🎯 Hedef bulundu: ${foundVariation}`, 'success');
            return true;
        } else {
            sendLogToDashboard(`❌ ${siteDomain} SERP'te bulunamadı`, 'error');
            return false;
        }
        
    } catch (error) {
        sendLogToDashboard(`❌ Arama hatası: ${error.message}`, 'error');
        return false;
    }
}

// Main traffic generator
async function generateMobileTraffic() {
    if (!botRunning || isProcessing) return;
    
    isProcessing = true;
    
    if (TOTAL_VISIT_LIMIT > 0 && visitCount >= TOTAL_VISIT_LIMIT) {
        console.log(`🏁 Ziyaret limiti ulaşıldı: ${TOTAL_VISIT_LIMIT}`);
        stopBot();
        isProcessing = false;
        return;
    }
    
    visitCount++;
    sendLogToDashboard(`🚀 Yeni trafik başlıyor (#${visitCount})`, 'info');
    
    // IP Rotation
    console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
    sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info');
    
    await rotateMobileData();
    await wait(2000);
    
    // Get new IP
    const testIP = await getCurrentMobileIP();
    if (testIP === 'Unknown') {
        sendLogToDashboard(`❌ İnternet bağlantısı kurulamadı`, 'error');
        isProcessing = false;
        return;
    }
    
    currentIP = testIP;
    sendLogToDashboard(`🌐 Yeni IP: ${currentIP}`, 'success');
    
    // Simulate mobile app signals (Instagram/YouTube/WhatsApp)
    if (Math.random() < 0.4) {
        await simulateAppTraffic();
    }
    
    const behavior = BEHAVIOR_MODES[Math.floor(Math.random() * BEHAVIOR_MODES.length)];
    sendLogToDashboard(`🎭 Davranış modu: ${behavior}`, 'info');
    
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
        // WRONG SEARCH (simulate human error)
        if (behavior === "wrong_search") {
            await mobileCurl("https://www.google.com/search?q=hava+durumu+ankara");
            sendLogToDashboard(`🤷 Yanlış arama yapıldı: "hava durumu"`, 'warning');
            errorCount++;
            isProcessing = false;
            return;
        }
        
        // Normal search simulation
        const keyword = SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];
        const searchSuccess = await performGoogleSearch(keyword);
        
        // NO CLICK scenario (scroll but no click)
        if (behavior === "no_click") {
            sendLogToDashboard(`👀 Sadece SERP tarandı, tıklanmadı`, 'warning');
            errorCount++;
            isProcessing = false;
            return;
        }
        
        if (!searchSuccess) {
            errorCount++;
            sendLogToDashboard(`❌ Ziyaret #${visitCount} başarısız`, 'error');
            isProcessing = false;
            return;
        }
        
        // Visit target URL
        await mobileCurl(TARGET_URL);
        sendLogToDashboard(`📲 Siteye giriş yapıldı: ${TARGET_URL}`, 'success');
        
        // Bounce behavior
        if (behavior === "bounce") {
            await wait(1000 + Math.random() * 2000);
            sendLogToDashboard(`↩️ Hızlı çıkış (bounce) - 1-3 saniye`, 'warning');
            errorCount++;
            isProcessing = false;
            return;
        }
        
        // Normal stay 3–12 seconds (SEO Boost)
        const dwellTime = 3000 + Math.random() * 9000;
        await wait(dwellTime);
        sendLogToDashboard(`⏳ Sitede ${Math.round(dwellTime/1000)} saniye kalındı`, 'success');
        sendLogToDashboard(`🚀 SEO Boost: Dwell time optimized`, 'success');
        
        successCount++;
        sendLogToDashboard(`✅ Ziyaret #${visitCount} başarılı`, 'success');

    } catch (error) {
        errorCount++;
        console.log(`❌ Ziyaret #${visitCount} hatası: ${error.message}`);
        sendLogToDashboard(`❌ Ziyaret hatası: ${error.message}`, 'error');
    }
    
    isProcessing = false;
}

// Bot loop
async function runSequentialTraffic() {
    while (botRunning) {
        await generateMobileTraffic();
        
        if (botRunning) {
            const randomDelay = DELAY_BETWEEN_VISITS + (Math.random() * 10000);
            console.log(`⏱️ ${Math.round(randomDelay/1000)} saniye bekleniyor...`);
            await wait(randomDelay);
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
    
    console.log('📱 Advanced Mobile SEO Bot başlatıldı');
    sendLogToDashboard('📱 Advanced Mobile SEO Bot başlatıldı', 'success');
    
    runSequentialTraffic();
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

console.log('📱 Advanced Mobile SEO Bot - Ready');
console.log('🔄 Mobil veri rotasyonu + DNS rotasyonu aktif');
console.log('📱 Dashboard: mobile_dashboard.html');
console.log('✅ Bot hazır...');
