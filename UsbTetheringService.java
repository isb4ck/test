package com.nexabot.trendyolbot;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.lang.reflect.Method;
import android.net.ConnectivityManager;
import android.content.Context;

public class UsbTetheringService extends Service {
    
    private ConnectivityManager connectivityManager;
    private Handler handler;
    private boolean isTetheringCycling = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        handler = new Handler(Looper.getMainLooper());
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent.getStringExtra("action");
        
        if ("START_USB_CYCLE".equals(action)) {
            startUsbTetheringCycle();
        } else if ("STOP_USB_CYCLE".equals(action)) {
            stopUsbTetheringCycle();
        }
        
        return START_STICKY;
    }
    
    private void startUsbTetheringCycle() {
        if (isTetheringCycling) return;
        
        isTetheringCycling = true;
        sendStatus("🪫 USB Tethering döngüsü başlatılıyor");
        
        // USB Tethering aç
        setUsbTethering(true);
        
        handler.postDelayed(() -> {
            // USB Tethering kapat
            setUsbTethering(false);
            
            // 3 saniye sonra döngüyü tamamla
            handler.postDelayed(() -> {
                isTetheringCycling = false;
                sendStatus("✅ USB Tethering döngüsü tamamlandı");
            }, 3000);
            
        }, 2000);
    }
    
    private void stopUsbTetheringCycle() {
        isTetheringCycling = false;
        setUsbTethering(false);
        sendStatus("🛑 USB Tethering döngüsü durduruldu");
    }
    
    private void setUsbTethering(boolean enabled) {
        try {
            Method method = connectivityManager.getClass().getDeclaredMethod("setUsbTethering", boolean.class);
            method.setAccessible(true);
            method.invoke(connectivityManager, enabled);
            
            if (enabled) {
                sendStatus("🪫 USB Tethering açıldı - IP değişimi bekleniyor");
            } else {
                sendStatus("🪫 USB Tethering kapatıldı - Yeni IP alındı");
            }
        } catch (Exception e) {
            sendStatus("USB Tethering " + (enabled ? "açma" : "kapatma") + " hatası: " + e.getMessage());
        }
    }
    
    private void sendStatus(String message) {
        Intent intent = new Intent("USB_STATUS_UPDATE");
        intent.putExtra("status", message);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        stopUsbTetheringCycle();
    }
}