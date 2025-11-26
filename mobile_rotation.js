const { exec } = require('child_process');

async function rotateMobileData() {
    return new Promise((resolve) => {
        console.log('✈️ Uçak modu açılıyor...');
        
        exec('su -c "settings put global airplane_mode_on 1"', (error) => {
            if (error) {
                console.log('⚠️ Root erişimi gerekli');
                resolve();
                return;
            }
            
            exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true"');
            
            setTimeout(() => {
                console.log('📱 Uçak modu kapatılıyor...');
                
                exec('su -c "settings put global airplane_mode_on 0"', () => {
                    exec('su -c "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false"');
                    
                    setTimeout(() => {
                        console.log('🌐 Yeni IP alındı');
                        resolve();
                    }, 8000);
                });
            }, 4000);
        });
    });
}

async function getCurrentMobileIP() {
    return new Promise((resolve) => {
        const ipServices = [
            'curl -s --connect-timeout 10 httpbin.org/ip | grep -o "[0-9.]\\+"',
            'curl -s --connect-timeout 10 ifconfig.me',
            'curl -s --connect-timeout 10 ipecho.net/plain',
            'curl -s --connect-timeout 10 icanhazip.com'
        ];
        
        let tried = 0;
        
        function tryNext() {
            if (tried >= ipServices.length) {
                resolve('Unknown');
                return;
            }
            
            console.log(`🔍 IP kontrol ediliyor... (${tried + 1}/${ipServices.length})`);
            
            exec(ipServices[tried], { timeout: 15000 }, (error, stdout) => {
                if (error || !stdout || !stdout.trim()) {
                    tried++;
                    setTimeout(tryNext, 1000);
                } else {
                    const ip = stdout.trim().replace(/[^0-9.]/g, '');
                    if (ip && ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
                        resolve(ip);
                    } else {
                        tried++;
                        setTimeout(tryNext, 1000);
                    }
                }
            });
        }
        
        tryNext();
    });
}

module.exports = { rotateMobileData, getCurrentMobileIP };
