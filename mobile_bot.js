// Mobile SEO Bot - Sequential Processing
const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
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

// Curl ile Google Arama (Android uyumlu)
async function performGoogleSearch(keyword) {
    try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
        sendLogToDashboard(`🔍 Curl Google arama: "${keyword}"`, 'info', currentIP);
        
        const siteDomain = new URL(TARGET_URL).hostname.replace('www.', '');
        sendLogToDashboard(`🔍 Aranan domain: ${siteDomain}`, 'info', currentIP);
        
        // Curl ile Google'da arama yap
        const curlCommand = `curl -s -A "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36" "${searchUrl}"`;
        const { stdout } = await execAsync(curlCommand);
        
        // Debug: HTML içeriğini kontrol et
        sendLogToDashboard(`🔍 HTML boyutu: ${stdout.length} karakter`, 'info', currentIP);
        
        // Çoklu domain kontrolü
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
            
            // Hedef siteye direkt git
            const visitCommand = `curl -s -A "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36" "${TARGET_URL}"`;
            await execAsync(visitCommand);
            
            sendLogToDashboard(`✅ Hedef siteye gidildi: ${TARGET_URL}`, 'success', currentIP);
            return true;
        } else {
            // Debug: HTML'de ne var göster
            const htmlPreview = stdout.substring(0, 500).replace(/[<>]/g, '');
            sendLogToDashboard(`🔍 HTML örneği: ${htmlPreview}...`, 'info', currentIP);
            sendLogToDashboard(`❌ ${siteDomain} bulunamadı`, 'error', currentIP);
            return false;
        }
        
    } catch (error) {
        console.error('Curl error:', error);
        sendLogToDashboard(`❌ Curl arama hatası: ${error.message}`, 'error', currentIP);
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
    
    // Basit bağlantı kontrolü
    console.log(`⏳ İnternet bağlantısı kontrol ediliyor...`);
    sendLogToDashboard(`⏳ İnternet bağlantısı bekleniyor...`, 'info', currentIP);
    
    // Sadece IP alabiliyorsak bağlantı var demektir
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
