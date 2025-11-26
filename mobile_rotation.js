const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ADB ile uçak modu kontrolü (Rootlu Android)
async function toggleAirplaneMode(enable) {
    try {
        const command = enable 
            ? 'adb shell settings put global airplane_mode_on 1 && adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true'
            : 'adb shell settings put global airplane_mode_on 0 && adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false';
        
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
        console.log('⏳ Mobil veri bağlantısı bekleniyor...');
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
        const { stdout } = await execAsync('curl -s https://api.ipify.org');
        const ip = stdout.trim();
        console.log(`🌐 Mevcut IP: ${ip}`);
        return ip || 'Bilinmiyor';
    } catch (error) {
        console.error('❌ IP alma hatası:', error.message);
        return 'Bilinmiyor';
    }
}

module.exports = { rotateMobileData, getCurrentMobileIP };
