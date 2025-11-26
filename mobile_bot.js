// Mobile SEO Bot - Sequential Processing
const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { rotateMobileData, getCurrentMobileIP } = require('./mobile_rotation');

// Anti-Detection Arrays
const MOBILE_UA_LIST = [
    "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; SM-M526BR) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; M2101K9AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Safari/537.36"
];

const HEADER_SETS = [
    '-H "Accept-Language: tr-TR,tr;q=0.9,en;q=0.8" -H "Connection: keep-alive"',
    '-H "Accept-Language: en-US,en;q=0.9,tr;q=0.8" -H "Upgrade-Insecure-Requests: 1"',
    '-H "Accept-Language: tr,en-US;q=0.9,en;q=0.8" -H "DNT: 1"'
];

const REF_LIST = [
    "https://www.google.com/",
    "https://m.youtube.com/",
    "https://www.instagram.com/",
    "https://www.facebook.com/"
];

function randomUA() {
    return MOBILE_UA_LIST[Math.floor(Math.random() * MOBILE_UA_LIST.length)];
}

function randomHeaders() {
    return HEADER_SETS[Math.floor(Math.random() * HEADER_SETS.length)];
}

function randomReferer() {
    return REF_LIST[Math.floor(Math.random() * REF_LIST.length)];
}

// Configuration
let TARGET_URL = 'https://fedaiforklift.com';
let SEARCH_KEYWORDS = ['kayseri forklift kiralama', 'forklift kiralama', 'iş makinesi kiralama'];
let VISITS_PER_MINUTE = 10;
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

// Basit Google Arama (Android uyumlu)
async function performGoogleSearch(keyword) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        sendLogToDashboard(`🔍 Google arama: "${keyword}"`, 'info', currentIP);
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        const ua = randomUA();
        const headers = randomHeaders();
        const referer = randomReferer();
        
        const deviceName = ua.match(/Android \d+; ([^)]+)/)?.[1] || 'Unknown';
        sendLogToDashboard(`📱 Cihaz: ${deviceName}`, 'info', currentIP);
        
        // Curl ile Google'da arama yap
        const curlCommand = `curl -s --http2 ${headers} -e "${referer}" -A "${ua}" "${searchUrl}"`;
        const { stdout } = await execAsync(curlCommand);
        
        sendLogToDashboard(`🔍 HTML boyutu: ${stdout.length} karakter`, 'info', currentIP);
        
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
            if (stdout.toLowerCase().includes(variation.toLowerCase())) {
                domainFound = true;
                foundVariation = variation;
                break;
            }
        }
        
        if (domainFound) {
            sendLogToDashboard(`🎯 Hedef bulundu: ${foundVariation}`, 'success', currentIP);
            
            // Hedef siteye git
            const visitCommand = `curl -s --http2 ${headers} -e "${referer}" -A "${ua}" "${TARGET_URL}"`;
            await execAsync(visitCommand);
            
            // SEO Boost simülasyonu
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));
            
            sendLogToDashboard(`✅ Hedef siteye gidildi: ${TARGET_URL}`, 'success', currentIP);
            sendLogToDashboard(`🚀 SEO Boost: 15-25 saniye dwell time`, 'success', currentIP);
            return true;
        } else {
            const htmlPreview = stdout.substring(0, 300).replace(/[<>]/g, '');
            sendLogToDashboard(`🔍 HTML örneği: ${htmlPreview}...`, 'info', currentIP);
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı`, 'error', currentIP);
            return false;
        }
        
    } catch (error) {
        console.error('Search error:', error);
        sendLogToDashboard(`❌ Arama hatası: ${error.message}`, 'error', currentIP);
        return false;
    }
}

// Ana trafik üretimi
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
    
    console.log(`🔄 IP rotasyonu başlatılıyor... (#${visitCount})`);
    sendLogToDashboard(`🔄 Mobil veri rotasyonu (#${visitCount})`, 'info', currentIP);
    
    await rotateMobileData();
    
    console.log(`⏳ İnternet bağlantısı kontrol ediliyor...`);
    sendLogToDashboard(`⏳ İnternet bağlantısı bekleniyor...`, 'info', currentIP);
    
    const testIP = await getCurrentMobileIP();
    if (testIP === 'Unknown') {
        console.log(`❌ İnternet bağlantısı yok`);
        sendLogToDashboard(`❌ İnternet bağlantısı kurulamadı`, 'error', currentIP);
        isProcessing = false;
        return;
    }
    
    console.log(`✅ İnternet bağlantısı hazır`);
    sendLogToDashboard(`✅ İnternet bağlantısı hazır`, 'success', testIP);
    
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
    
    isProcessing = false;
}

// Bot çalıştırma
async function runSequentialTraffic() {
    while (botRunning) {
        await generateMobileTraffic();
        
        if (botRunning) {
            const randomDelay = DELAY_BETWEEN_VISITS + (Math.random() * 10000);
            console.log(`⏱️ ${Math.round(randomDelay/1000)} saniye bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));
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

console.log('📱 Mobile SEO Bot - Ready');
console.log('🔄 Mobil veri rotasyonu aktif');
console.log('📱 Dashboard: mobile_dashboard.html');
console.log('✅ Bot hazır...');
