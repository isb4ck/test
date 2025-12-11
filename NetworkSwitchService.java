package com.nexabot.trendyolbot;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.net.wifi.WifiManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class NetworkSwitchService extends Service {
    
    private WifiManager wifiManager;
    private Handler handler;
    private boolean originalWifiState = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        wifiManager = (WifiManager) getSystemService(Context.WIFI_SERVICE);
        handler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent.getStringExtra("action");
        
        if ("RESET_NETWORK".equals(action)) {
            resetNetworkForNewIP();
        } else if ("RESTORE_NETWORK".equals(action)) {
            restoreOriginalNetwork();
        }
        
        return START_STICKY;
    }
    
    private void resetNetworkForNewIP() {
        try {
            // Mevcut WiFi durumunu kaydet
            originalWifiState = wifiManager.isWifiEnabled();
            
            sendStatus("🔄 Ağ sıfırlanıyor - IP yenileniyor...");
            
            if (originalWifiState) {
                // WiFi açıksa → Kapat (Mobil veriye geç)
                sendStatus("📶 WiFi kapatılıyor → Mobil veriye geçiliyor");
                wifiManager.setWifiEnabled(false);
                
                // 3 saniye bekle (mobil veri bağlansın)
                handler.postDelayed(() -> {
                    sendStatus("📱 Mobil veriye geçildi - YENİ IP ALINDI!");
                }, 3000);
                
            } else {
                // Mobil veri açıksa → WiFi aç
                sendStatus("📶 WiFi açılıyor → WiFi ağına geçiliyor");
                wifiManager.setWifiEnabled(true);
                
                // 5 saniye bekle (WiFi bağlansın)
                handler.postDelayed(() -> {
                    sendStatus("📶 WiFi'ye geçildi - YENİ IP ALINDI!");
                }, 5000);
            }
            
        } catch (Exception e) {
            sendStatus("❌ Ağ sıfırlama hatası: " + e.getMessage());
        }
    }
    
    private void restoreOriginalNetwork() {
        try {
            sendStatus("🔄 Orijinal ağ ayarları geri yükleniyor...");
            
            // Orijinal duruma geri dön
            if (originalWifiState != wifiManager.isWifiEnabled()) {
                wifiManager.setWifiEnabled(originalWifiState);
                
                handler.postDelayed(() -> {
                    if (originalWifiState) {
                        sendStatus("✅ WiFi geri açıldı - Orijinal ağa dönüldü");
                    } else {
                        sendStatus("✅ WiFi kapatıldı - Mobil veriye dönüldü");
                    }
                }, 3000);
            } else {
                sendStatus("✅ Ağ ayarları zaten doğru durumda");
            }
            
        } catch (Exception e) {
            sendStatus("❌ Ağ geri yükleme hatası: " + e.getMessage());
        }
    }
    
    private void sendStatus(String message) {
        Intent intent = new Intent("NETWORK_STATUS_UPDATE");
        intent.putExtra("status", message);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}