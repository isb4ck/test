const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Windows için uçak modu kontrolü
async function toggleAirplaneMode(enable) {
    try {
        const command = enable 
            ? 'powershell -Command "Get-NetAdapter | Disable-NetAdapter -Confirm:$false"'
            : 'powershell -Command "Get-NetAdapter | Enable-NetAdapter -Confirm:$false"';
        
        await execAsync(command);
        console.log(`✈️ Uçak modu ${enable ? 'açıldı' : 'kapatıldı'}`);
        return true;
    } catch (error) {
        console.error(`❌ Uçak modu hatası: ${error.message}`);
        return false;
    }
}

// Mobil veri rotasyonu
async function rotateMobileData() {
    try {
        console.log('🔄 Mobil veri rotasyonu başlatılıyor...');
        
        // 1. Uçak modunu aç
        console.log('✈️ Uçak modu açılıyor...');
        await toggleAirplaneMode(true);
        
        // 2. 5 saniye bekle
        console.log('⏳ 5 saniye bekleniyor...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 3. Uçak modunu kapat
        console.log('✈️ Uçak modu kapatılıyor...');
        await toggleAirplaneMode(false);
        
        // 4. Bağlantının kurulmasını bekle
        console.log('⏳ Bağlantı kurulması bekleniyor...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('✅ Mobil veri rotasyonu tamamlandı');
        return true;
        
    } catch (error) {
        console.error('❌ Mobil veri rotasyon hatası:', error.message);
        return false;
    }
}

// Mevcut IP adresini al
async function getCurrentMobileIP() {
    try {
        const { stdout } = await execAsync('powershell -Command "(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content"');
        const ip = stdout.trim();
        console.log(`🌐 Mevcut IP: ${ip}`);
        return ip;
    } catch (error) {
        console.error('❌ IP alma hatası:', error.message);
        return 'Bilinmiyor';
    }
}

module.exports = { rotateMobileData, getCurrentMobileIP };
