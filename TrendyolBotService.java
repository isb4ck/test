package com.nexabot.trendyolbot;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.PowerManager;

public class TrendyolBotService extends Service {
    
    private static final String CHANNEL_ID = "TrendyolBotChannel";
    private static final int NOTIFICATION_ID = 1;
    
    private static WebView sharedWebView;
    private WebView webView;
    private Handler mainHandler;
    private String keyword;
    private String targetUrl;
    private String targetDomain;
    private int totalLoops;
    private int currentLoop = 0; // Şu anki döngü sayısı
    private int completedLoops = 0; // Tamamlanan döngü sayısı
    private boolean isRunning = false;
    private java.util.Random random = new java.util.Random();
    private RootController rootController;
    private int browsingStep = 0;
    private int currentPage = 1; // Mevcut Google sayfa numarası
    private final int MAX_PAGES = 7; // Maksimum 7 sayfaya kadar ara
    private PowerManager.WakeLock wakeLock;
    
    private String[] userAgents = {
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.16; rv:132.0) Gecko/20100101 Firefox/132.0",
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/107.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/107.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 YaBrowser/24.1.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 YaBrowser/24.1.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/6.5.3206.63",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/6.5.3206.63",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Brave/1.61.109",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Brave/1.61.109",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.85 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; SM-G996B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
        "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "Mozilla/5.0 (Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
        "Mozilla/5.0 (Android 13; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 EdgA/131.0.2903.48",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 EdgA/130.0.2849.68",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 EdgA/131.0.2903.27",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/85.0.4341.72",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/84.0.4316.78",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/85.0.4341.56",
        "Mozilla/5.0 (Linux; Android 14; SM-G996B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 YaBrowser/24.12.0.218 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 YaBrowser/24.10.1.114 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Brave/1.61.109",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Brave/1.60.125",
        "Mozilla/5.0 (Linux; Android 13; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 DuckDuckGo/5 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 DuckDuckGo/5 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Vivaldi/6.5.3206.63",
        "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Vivaldi/6.4.3160.47",
        "Mozilla/5.0 (Linux; U; Android 14; en-US; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 UCBrowser/15.5.4.1018 Safari/537.36",
        "Mozilla/5.0 (Linux; U; Android 13; en-US; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 UCBrowser/15.4.2.1012 Safari/537.36",
        "Mozilla/5.0 (Linux; U; Android 14; tr-tr; Redmi Note 13 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 Safari/537.36 XiaoMi/MiuiBrowser/18.3.230323",
        "Mozilla/5.0 (Linux; U; Android 13; tr-tr; Mi 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Safari/537.36 XiaoMi/MiuiBrowser/18.2.221130",
        "Mozilla/5.0 (Linux; Android 14; NOH-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 HuaweiBrowser/15.0.5.302 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; ELS-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 HuaweiBrowser/15.0.4.301 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; V2324A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 VivoBrowser/20.3.10.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; V2250A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 VivoBrowser/20.2.8.0 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Safari/537.36 HeyTapBrowser/45.9.8.1",
        "Mozilla/5.0 (Linux; Android 13; CPH2399) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Safari/537.36 HeyTapBrowser/45.8.6.1",
        "Mozilla/5.0 (Linux; Android 14; RMX3890) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Safari/537.36 RealmeBrowser/1.8.22.41",
        "Mozilla/5.0 (Linux; Android 13; RMX3663) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Safari/537.36 RealmeBrowser/1.7.18.35",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Safari/537.36 Kiwi/124.0.6327.4",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Safari/537.36 Kiwi/123.0.6312.2",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; SM-G996B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
        "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "Mozilla/5.0 (Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
        "Mozilla/5.0 (Android 13; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.2903.48",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.2849.68",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.2903.27",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 OPR/85.0.4341.72",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 OPR/84.0.4316.78",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 OPR/85.0.4341.56",
        "Mozilla/5.0 (Linux; Android 14; SM-G996B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 YaBrowser/24.12.0.218 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 YaBrowser/24.10.1.114 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.61.109",
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Brave/1.60.125",
        "Mozilla/5.0 (Linux; Android 13; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 DuckDuckGo/5 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 DuckDuckGo/5 Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Vivaldi/6.5.3206.63",
        "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Vivaldi/6.4.3160.47",
        "Mozilla/5.0 (Linux; U; Android 14; en-US; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 UCBrowser/15.5.4.1018 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; U; Android 13; en-US; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 UCBrowser/15.4.2.1012 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; U; Android 14; tr-tr; Redmi Note 13 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.104 Mobile Safari/537.36 XiaoMi/MiuiBrowser/18.3.230323",
        "Mozilla/5.0 (Linux; U; Android 13; tr-tr; Mi 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 XiaoMi/MiuiBrowser/18.2.221130",
        "Mozilla/5.0 (Linux; Android 14; NOH-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 HuaweiBrowser/15.0.5.302 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; ELS-NX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 HuaweiBrowser/15.0.4.301 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; V2324A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 VivoBrowser/20.3.10.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; V2250A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 VivoBrowser/20.2.8.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 14; CPH2581) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36 HeyTapBrowser/45.9.8.1",
        "Mozilla/5.0 (Linux; Android 13; CPH2399) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36 HeyTapBrowser/45.8.6.1",
        "Mozilla/5.0 (Linux; Android 14; RMX3890) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36 RealmeBrowser/1.8.22.41",
        "Mozilla/5.0 (Linux; Android 13; RMX3663) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36 RealmeBrowser/1.7.18.35",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.104 Mobile Safari/537.36 Kiwi/124.0.6327.4",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.102 Mobile Safari/537.36 Kiwi/123.0.6312.2"
    };
    
    // ZORUNLU UÇAK MODU - HER İŞLEMDE IP DEĞİŞTİRİR
    private void toggleAirplaneModeSync(boolean enable) {
        new Thread(() -> {
            try {
                String state = enable ? "1" : "0";
                String cmd1 = "settings put global airplane_mode_on " + state;
                String cmd2 = "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state " + enable;
                
                Process proc1 = Runtime.getRuntime().exec(new String[]{"su", "-c", cmd1});
                proc1.waitFor();
                
                Process proc2 = Runtime.getRuntime().exec(new String[]{"su", "-c", cmd2});
                proc2.waitFor();
                
                if (enable) {
                    updateStatus("✈️ UÇAK MODU AÇIK - IP değişiyor (5sn)");
                    Thread.sleep(5000); // 5 saniye bekle
                    toggleAirplaneModeSync(false);
                } else {
                    updateStatus("📶 YENİ IP ALINDI - İnternet kontrol ediliyor");
                    Thread.sleep(3000); // 3 saniye bekle
                    mainHandler.post(() -> checkInternetAndStart());
                }
            } catch (Exception e) {
                updateStatus("⚠️ Root hatası - Manuel IP değişimi gerekli");
                mainHandler.post(() -> checkInternetAndStart());
            }
        }).start();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        mainHandler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
        rootController = new RootController(this);
        
        // Wake lock oluştur
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TrendyolBotService:WakeLock"
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            keyword = intent.getStringExtra("keyword");
            targetUrl = intent.getStringExtra("targetUrl");
            targetDomain = extractDomain(targetUrl);
            totalLoops = intent.getIntExtra("count", 1);
            
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Wake lock aktif et
            if (!wakeLock.isHeld()) {
                wakeLock.acquire();
            }
            
            if (sharedWebView != null) {
                webView = sharedWebView;
                setupWebViewClient();
            } else {
                initWebView();
            }
            
            startBotLoop();
        }
        return START_STICKY;
    }
    
    private void initWebView() {
        mainHandler.post(() -> {
            webView = new WebView(this);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.getSettings().setUseWideViewPort(true);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowContentAccess(true);
            webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
            
            String randomUserAgent = userAgents[random.nextInt(userAgents.length)];
            webView.getSettings().setUserAgentString(randomUserAgent);
            
            setupWebViewClient();
        });
    }
    
    private void setupWebViewClient() {
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                
                updateStatus("🔗 URL: " + (url.length() > 50 ? url.substring(0, 50) + "..." : url));
                
                if (url.contains("google.com")) {
                    if (url.contains("/search?")) {
                        updateStatus("🔍 Google sayfa " + currentPage + "/" + MAX_PAGES + " - Hedef aranıyor");
                        mainHandler.postDelayed(() -> scrollAndSearch(0), 4000);
                    } else {
                        updateStatus("🌐 Google ana sayfa - Arama yapılıyor");
                        mainHandler.postDelayed(() -> performGoogleSearch(), 3000);
                    }
                } else if (url.contains(targetDomain)) {
                    updateStatus("🎯 Hedef sitede - Doğal gezinme başlıyor");
                    if (browsingStep == 0) {
                        browsingStep = 1;
                        mainHandler.postDelayed(() -> {
                            webView.evaluateJavascript("document.readyState", result -> {
                                updateStatus("📊 Sayfa analiz ediliyor...");
                                mainHandler.postDelayed(() -> browseTargetSite(), 3000);
                            });
                        }, 5000);
                    }
                }
            }
        });
    }
    
    private void startBotLoop() {
        isRunning = true;
        currentLoop = 0;
        completedLoops = 0;
        currentPage = 1;
        // HER İŞLEMDEN ÖNCE UÇAK MODU - ASLA KENDİ IP'DE GİRMEZ
        updateStatus("✈️ IP değiştiriliyor - Uçak modu açılıyor");
        toggleAirplaneModeSync(true);
    }
    
    private void nextLoop() {
        if (!isRunning || currentLoop >= totalLoops) {
            updateStatus("✅ " + totalLoops + " kez hedef siteye giriş tamamlandı");
            stopSelf();
            return;
        }
        
        currentPage = 1;
        updateStatus("✈️ İşlem " + (currentLoop + 1) + "/" + totalLoops + " - IP değiştiriliyor");
        // HER DÖNGÜDE MUTLAKA UÇAK MODU
        toggleAirplaneModeSync(true);
    }
    
    private void checkInternetAndStart() {
        if (isInternetAvailable()) {
            updateStatus("✅ YENİ IP İLE İNTERNET HAZIR - Google açılıyor");
            mainHandler.postDelayed(() -> startGoogleSearch(), 2000);
        } else {
            updateStatus("⏳ Yeni IP bekleniyor... (15sn limit)");
            mainHandler.postDelayed(() -> {
                if (isInternetAvailable()) {
                    startGoogleSearch();
                } else {
                    updateStatus("⚠️ İnternet gelmedi - Devam ediliyor");
                    startGoogleSearch();
                }
            }, 15000);
        }
    }
    
    private boolean isInternetAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        } catch (Exception e) {
            return false;
        }
    }
    
    private void startGoogleSearch() {
        // Her döngüde farklı User Agent seç
        String newUserAgent = userAgents[random.nextInt(userAgents.length)];
        webView.getSettings().setUserAgentString(newUserAgent);
        
        updateStatus("🌐 Google.com.tr açılıyor (Yeni UA)");
        mainHandler.post(() -> webView.loadUrl("https://www.google.com.tr"));
    }
    
    private void performGoogleSearch() {
        updateStatus("🔍 '" + keyword + "' aranıyor");
        
        String searchScript = 
            "var searchBox = document.querySelector('input[name=\"q\"]') || " +
            "document.querySelector('textarea[name=\"q\"]');" +
            "if (searchBox) {" +
            "  searchBox.value = '" + keyword + "';" +
            "  searchBox.focus();" +
            "  var form = searchBox.closest('form');" +
            "  if (form) form.submit();" +
            "}";
        
        webView.evaluateJavascript(searchScript, null);
    }
    

    
    private void scrollAndSearch(int scrollCount) {
        if (!isRunning) return;
        
        if (scrollCount >= 8) {
            if (currentPage < MAX_PAGES) {
                updateStatus("⏭️ Sayfa " + currentPage + " bitti - Sayfa " + (currentPage + 1) + " açılıyor");
                mainHandler.postDelayed(() -> loadNextPageByUrl(), 3000);
            } else {
                updateStatus("❌ " + MAX_PAGES + " sayfada hedef bulunamadı - Yeni döngü");
                currentPage = 1;
                mainHandler.postDelayed(() -> nextLoop(), 4000);
            }
            return;
        }
        
        updateStatus("🔍 ARANAN: " + keyword + " + " + targetDomain + " (" + (scrollCount + 1) + "/8)");
        
        String[] keywordParts = keyword.toLowerCase().split(" ");
        String keywordForJs = String.join(" ", keywordParts);
        
        String targetSearchScript = 
            "(function() {" +
            "  var currentUrl = window.location.href;" +
            "  var keyword = '" + keywordForJs + "';" +
            "  var targetDomain = '" + targetDomain + "';" +
            "  var keywordParts = keyword.split(' ');" +
            "  " +
            "  function hasKeywords(text) {" +
            "    if (!text) return false;" +
            "    text = text.toLowerCase();" +
            "    for (var i = 0; i < keywordParts.length; i++) {" +
            "      if (text.indexOf(keywordParts[i]) > -1) return true;" +
            "    }" +
            "    return false;" +
            "  }" +
            "  " +
            "  var searchResults = document.querySelectorAll('div[data-ved], .g, .tF2Cxc, .MjjYud');" +
            "  " +
            "  for (var i = 0; i < searchResults.length; i++) {" +
            "    var result = searchResults[i];" +
            "    var links = result.querySelectorAll('a[href]');" +
            "    " +
            "    for (var j = 0; j < links.length; j++) {" +
            "      var link = links[j];" +
            "      if (!link.href || link.href.indexOf('google.com') > -1) continue;" +
            "      " +
            "      var titleElement = link.querySelector('h3') || link;" +
            "      var title = titleElement.textContent || titleElement.innerText || '';" +
            "      var url = link.href;" +
            "      " +
            "      if (url.indexOf(targetDomain) > -1 && hasKeywords(title)) {" +
            "        link.style.border = '5px solid red';" +
            "        link.style.backgroundColor = 'yellow';" +
            "        link.scrollIntoView({ behavior: 'smooth', block: 'center' });" +
            "        " +
            "        setTimeout(function() {" +
            "          link.click();" +
            "        }, 1500);" +
            "        " +
            "        return 'FOUND:' + title.substring(0, 50) + ':' + url;" +
            "      }" +
            "    }" +
            "  }" +
            "  " +
            "  return 'NOT_FOUND';" +
            "})();";
        
        webView.evaluateJavascript(targetSearchScript, result -> {
            String cleanResult = result != null ? result.replace("\"", "") : "null";
            
            if (cleanResult.startsWith("FOUND:")) {
                String[] parts = cleanResult.split(":", 3);
                String title = parts.length > 1 ? parts[1] : "";
                String url = parts.length > 2 ? parts[2] : "";
                
                updateStatus("✅ HEDEF BULUNDU: " + title);
                updateStatus("🔗 " + (url.length() > 60 ? url.substring(0, 60) + "..." : url));
            } else {
                updateStatus("❌ Hedef yok - Scroll devam (" + (scrollCount + 1) + "/8)");
                mainHandler.postDelayed(() -> {
                    webView.evaluateJavascript("window.scrollBy(0, 600);", null);
                    
                    mainHandler.postDelayed(() -> {
                        String nextPageScript = 
                            "(function() {" +
                            "  var links = document.querySelectorAll('a[href]');" +
                            "  for(var i = 0; i < links.length; i++) {" +
                            "    var link = links[i];" +
                            "    var text = (link.textContent || link.innerText || '').toLowerCase().trim();" +
                            "    if((text === 'sonraki' || text === 'next' || text === '2' || text === '3' || text === 'diğer arama sonuçları') && link.offsetParent !== null) {" +
                            "      link.style.border = '5px solid blue';" +
                            "      link.style.backgroundColor = 'lightblue';" +
                            "      link.scrollIntoView({ behavior: 'smooth', block: 'center' });" +
                            "      setTimeout(function() {" +
                            "        link.click();" +
                            "      }, 1000);" +
                            "      return 'NEXT_FOUND';" +
                            "    }" +
                            "  }" +
                            "  return 'NOT_FOUND';" +
                            "})();";
                        
                        webView.evaluateJavascript(nextPageScript, nextResult -> {
                            String cleanNextResult = nextResult != null ? nextResult.replace("\"", "") : "null";
                            if (cleanNextResult.equals("NEXT_FOUND")) {
                                updateStatus("➡️ Sonraki sayfa butonu bulundu ve tıklandı");
                            } else {
                                mainHandler.postDelayed(() -> scrollAndSearch(scrollCount + 1), 2000);
                            }
                        });
                    }, 1500);
                }, 1000);
            }
        });
    }
    
    private void browseTargetSite() {
        if (!isRunning) return;
        
        updateStatus("🌐 Sitede gezinme " + browsingStep + "/4 (15sn)");
        
        if (browsingStep >= 4) {
            completedLoops++;
            currentLoop++;
            updateStatus("✅ İşlem " + completedLoops + "/" + totalLoops + " tamamlandı - Ping gönderiliyor");
            
            sendPingAndWait(() -> {
                updateStatus("📡 Ping tamamlandı - Temizlik yapılıyor");
                
                mainHandler.removeCallbacksAndMessages(null);
                webView.stopLoading();
                webView.clearCache(true);
                webView.clearHistory();
                webView.loadUrl("about:blank");
                
                browsingStep = 0;
                
                mainHandler.postDelayed(() -> {
                    if (!isRunning) return;
                    
                    if (currentLoop < totalLoops) {
                        updateStatus("🔄 Yeni işlem başlıyor (" + (currentLoop + 1) + "/" + totalLoops + ")");
                        nextLoop();
                    } else {
                        updateStatus("✅ Tüm işlemler tamamlandı!");
                        stopSelf();
                    }
                }, 3000);
            });
            return;
        }
        
        String linkScript = 
            "var links = document.querySelectorAll('a[href]');" +
            "var validLinks = [];" +
            "for (var i = 0; i < links.length; i++) {" +
            "  var link = links[i];" +
            "  if (link.href && link.offsetParent !== null && " +
            "      link.href.includes('" + targetDomain + "')) {" +
            "    validLinks.push(link);" +
            "  }" +
            "}" +
            "if (validLinks.length > 0) {" +
            "  var randomLink = validLinks[Math.floor(Math.random() * validLinks.length)];" +
            "  randomLink.click();" +
            "}";
        
        webView.evaluateJavascript(linkScript, null);
        browsingStep++;
        
        mainHandler.postDelayed(() -> {
            if (isRunning) {
                webView.evaluateJavascript("window.scrollBy(0, " + (200 + random.nextInt(300)) + ");", null);
                mainHandler.postDelayed(() -> {
                    if (isRunning) browseTargetSite();
                }, 2000);
            }
        }, 15000);
    }
    

    
    private void loadNextPageByUrl() {
        String currentUrl = webView.getUrl();
        
        if (currentUrl == null || !currentUrl.contains("google.com/search")) {
            updateStatus("❌ Geçersiz URL - Yeni döngü");
            currentPage = 1;
            mainHandler.postDelayed(() -> nextLoop(), 3000);
            return;
        }
        
        // Sayfa numarasını artır
        currentPage++;
        int newStart = (currentPage - 1) * 10;
        
        updateStatus("🔍 DEBUG: Şu anki sayfa=" + (currentPage-1) + ", Yeni sayfa=" + currentPage + ", start=" + newStart);
        
        String nextPageUrl;
        
        if (currentUrl.contains("start=")) {
            nextPageUrl = currentUrl.replaceFirst("start=\\d+", "start=" + newStart);
        } else {
            if (currentUrl.contains("&")) {
                nextPageUrl = currentUrl + "&start=" + newStart;
            } else if (currentUrl.contains("?")) {
                nextPageUrl = currentUrl + "&start=" + newStart;
            } else {
                nextPageUrl = currentUrl + "?start=" + newStart;
            }
        }
        
        updateStatus("🔄 Sayfa " + currentPage + " açılıyor (start=" + newStart + ")");
        webView.loadUrl(nextPageUrl);
    }
    
    private String extractDomain(String url) {
        try {
            if (url.startsWith("http")) {
                java.net.URL urlObj = new java.net.URL(url);
                return urlObj.getHost();
            } else {
                return url.split("/")[0];
            }
        } catch (Exception e) {
            return url;
        }
    }
    
    // PING-O-MATIC SİSTEMİ - BOT1'DEN ALINDI
    private void sendPingAndWait(Runnable onComplete) {
        updateStatus("📡 Ping: " + keyword + " -> " + targetUrl);
        
        new Thread(() -> {
            try {
                java.net.URL url = new java.net.URL("https://rpc.pingomatic.com/");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(10000);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "text/xml; charset=UTF-8");
                conn.setDoOutput(true);
                
                String xmlRequest = 
                    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                    "<methodCall>" +
                    "<methodName>weblogUpdates.ping</methodName>" +
                    "<params>" +
                    "<param><value><string>" + keyword + "</string></value></param>" +
                    "<param><value><string>" + targetUrl + "</string></value></param>" +
                    "</params>" +
                    "</methodCall>";
                
                java.io.OutputStream os = conn.getOutputStream();
                os.write(xmlRequest.getBytes("UTF-8"));
                os.flush();
                os.close();
                
                int responseCode = conn.getResponseCode();
                conn.disconnect();
                
                mainHandler.post(() -> {
                    if (responseCode == 200) {
                        updateStatus("✅ Ping OK: " + keyword + " -> " + targetUrl + " (" + responseCode + ")");
                    } else {
                        updateStatus("⚠️ Ping HATA: " + keyword + " -> " + targetUrl + " (" + responseCode + ")");
                    }
                    if (onComplete != null) {
                        onComplete.run();
                    }
                });
                
            } catch (Exception e) {
                mainHandler.post(() -> {
                    updateStatus("❌ Ping ERR: " + e.getMessage());
                    if (onComplete != null) {
                        onComplete.run();
                    }
                });
            }
        }).start();
    }
    
    private void updateStatus(String message) {
        Intent statusIntent = new Intent("STATUS_UPDATE");
        statusIntent.putExtra("status", message);
        statusIntent.putExtra("current", completedLoops);
        statusIntent.putExtra("total", totalLoops);
        LocalBroadcastManager.getInstance(this).sendBroadcast(statusIntent);
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SEO Bot Service",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SEO Bot")
            .setContentText("Google trafiği gönderiliyor...")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .build();
    }
    
    public static void setWebView(WebView webView) {
        sharedWebView = webView;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;
        mainHandler.removeCallbacksAndMessages(null); // Tüm handler'ları temizle
        
        // Wake lock serbest bırak
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        if (webView != null) {
            webView.stopLoading();
            webView.clearCache(true);
            webView.clearHistory();
            // webView.destroy(); // BUNU KALDIRIN - Servis tekrar başlayınca WebView lazım
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}