// Mobile SEO Bot - Sequential Processing
const axios = require('axios');
const cheerio = require('cheerio');
const WebSocket = require('ws');
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

// HTTP-only Google arama
async function searchGoogleHTTP(keyword) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        console.log(`🔍 HTTP Google arama: "${keyword}"`);
        sendLogToDashboard(`🔍 HTTP Google arama: "${keyword}"`, 'info', currentIP);
        
        const response = await axios.get(searchUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive'
            }
        });
        
        const $ = cheerio.load(response.data);
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        
        // Arama sonuçlarında hedef domain'i ara
        let found = false;
        $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.includes(siteDomain)) {
                console.log(`🎯 Google'da hedef site bulundu: ${href}`);
                sendLogToDashboard(`🎯 Google'da hedef site bulundu`, 'success', currentIP);
                found = true;
                return false; // break
            }
        });
        
        if (found) {
            // Hedef siteye HTTP isteği gönder
            await axios.get(TARGET_URL, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Referer': searchUrl
                }
            });
            
            sendLogToDashboard(`✅ Hedef siteye HTTP isteği gönderildi`, 'success', currentIP);
            return true;
        } else {
            sendLogToDashboard(`⚠️ Google'da site bulunamadı`, 'error', currentIP);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ HTTP arama hatası: ${error.message}`);
        sendLogToDashboard(`❌ HTTP arama hatası: ${error.message}`, 'error', currentIP);
        return false;
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
        const visitSuccess = await searchGoogleHTTP(keyword);
        
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