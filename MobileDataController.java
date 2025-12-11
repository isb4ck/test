package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.os.Handler;
import android.os.Looper;
import android.telephony.TelephonyManager;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import java.lang.reflect.Method;

public class MobileDataController {
    
    private Context context;
    private Handler handler;
    
    public MobileDataController(Context context) {
        this.context = context;
        this.handler = new Handler(Looper.getMainLooper());
    }
    
    public void toggleMobileData(boolean enable) {
        // Strateji 1: Reflection ile ConnectivityManager
        if (tryConnectivityManager(enable)) {
            sendResult(true, enable ? "ON" : "OFF");
            return;
        }
        
        // Strateji 2: TelephonyManager reflection
        if (tryTelephonyManager(enable)) {
            sendResult(true, enable ? "ON" : "OFF");
            return;
        }
        
        // Strateji 3: Manuel kullanıcı müdahalesi
        requestManualToggle(enable);
    }
    
    private boolean tryConnectivityManager(boolean enable) {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            Method setMobileDataEnabled = cm.getClass().getDeclaredMethod("setMobileDataEnabled", boolean.class);
            setMobileDataEnabled.setAccessible(true);
            setMobileDataEnabled.invoke(cm, enable);
            return true;
        } catch (Exception e) {
            // Reflection başarısız
        }
        return false;
    }
    
    private boolean tryTelephonyManager(boolean enable) {
        try {
            TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            Method setDataEnabled = tm.getClass().getDeclaredMethod("setDataEnabled", boolean.class);
            setDataEnabled.setAccessible(true);
            setDataEnabled.invoke(tm, enable);
            return true;
        } catch (Exception e) {
            // TelephonyManager başarısız
        }
        return false;
    }
    
    private void requestManualToggle(boolean enable) {
        Intent intent = new Intent("MANUAL_DATA_REQUEST");
        intent.putExtra("enable", enable);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
        
        // 10 saniye timeout
        handler.postDelayed(() -> {
            sendResult(false, enable ? "ON" : "OFF");
        }, 10000);
    }
    
    private void sendResult(boolean success, String mode) {
        Intent intent = new Intent("MOBILE_DATA_RESULT");
        intent.putExtra("success", success);
        intent.putExtra("mode", mode);
        LocalBroadcastManager.getInstance(context).sendBroadcast(intent);
    }
    
    public void confirmManualToggle(boolean enable) {
        sendResult(true, enable ? "ON" : "OFF");
    }
}