package com.nexabot.trendyolbot;

import android.animation.ObjectAnimator;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.webkit.WebView;
import android.os.PowerManager;

public class MainActivity extends AppCompatActivity {
    
    private EditText etKeyword, etTargetUrl, etLoopCount;
    private Button btnStart, btnStop, btnSystemInfo, btnTestPing;
    private TextView tvStatus, tvProgress;
    private WebView webView;
    private PowerManager.WakeLock wakeLock;
    
    private BroadcastReceiver statusReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if ("STATUS_UPDATE".equals(action)) {
                String status = intent.getStringExtra("status");
                int current = intent.getIntExtra("current", 0);
                int total = intent.getIntExtra("total", 0);
                
                // Animasyonlu status güncelleme
                animateStatusUpdate(status, current + "/" + total);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initViews();
        setupListeners();
        startupAnimation();
        
        LocalBroadcastManager.getInstance(this)
            .registerReceiver(statusReceiver, new IntentFilter("STATUS_UPDATE"));
    }
    
    private void initViews() {
        etKeyword = findViewById(R.id.etKeyword);
        etTargetUrl = findViewById(R.id.etTargetUrl);
        etLoopCount = findViewById(R.id.etLoopCount);
        btnStart = findViewById(R.id.btnStart);
        btnStop = findViewById(R.id.btnStop);
        btnSystemInfo = findViewById(R.id.btnSystemInfo);
        btnTestPing = findViewById(R.id.btnTestPing);
        tvStatus = findViewById(R.id.tvStatus);
        tvProgress = findViewById(R.id.tvProgress);
        webView = findViewById(R.id.webView);
        
        setupWebView();
        
        // Örnek değerler
        etKeyword.setText("ümraniye mobilya imalat");
        etTargetUrl.setText("https://birde.com.tr");
        etLoopCount.setText("5");
    }
    
    private void setupListeners() {
        btnStart.setOnClickListener(v -> {
            animateButtonClick(v);
            new Handler().postDelayed(this::startBot, 200);
        });
        
        btnStop.setOnClickListener(v -> {
            animateButtonClick(v);
            new Handler().postDelayed(this::stopBot, 200);
        });
        
        btnSystemInfo.setOnClickListener(v -> {
            animateButtonClick(v);
            new Handler().postDelayed(this::showSystemInfo, 200);
        });
        
        btnTestPing.setOnClickListener(v -> {
            animateButtonClick(v);
            new Handler().postDelayed(this::testPingSystem, 200);
        });
    }
    
    private void startupAnimation() {
        // Başlangıç animasyonu
        View[] views = {etKeyword, etTargetUrl, etLoopCount, btnSystemInfo, btnTestPing, btnStart, btnStop};
        
        for (int i = 0; i < views.length; i++) {
            View view = views[i];
            view.setAlpha(0f);
            view.setTranslationY(50f);
            
            ObjectAnimator fadeIn = ObjectAnimator.ofFloat(view, "alpha", 0f, 1f);
            ObjectAnimator slideUp = ObjectAnimator.ofFloat(view, "translationY", 50f, 0f);
            
            fadeIn.setDuration(600);
            slideUp.setDuration(600);
            fadeIn.setStartDelay(i * 100);
            slideUp.setStartDelay(i * 100);
            fadeIn.setInterpolator(new AccelerateDecelerateInterpolator());
            slideUp.setInterpolator(new AccelerateDecelerateInterpolator());
            
            fadeIn.start();
            slideUp.start();
        }
    }
    
    private void animateButtonClick(View view) {
        ObjectAnimator scaleX = ObjectAnimator.ofFloat(view, "scaleX", 1f, 0.95f, 1f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(view, "scaleY", 1f, 0.95f, 1f);
        scaleX.setDuration(200);
        scaleY.setDuration(200);
        scaleX.start();
        scaleY.start();
    }
    
    private void animateStatusUpdate(String status, String progress) {
        // Status güncelleme animasyonu
        ObjectAnimator fadeOut = ObjectAnimator.ofFloat(tvStatus, "alpha", 1f, 0f);
        fadeOut.setDuration(150);
        fadeOut.start();
        
        new Handler().postDelayed(() -> {
            tvStatus.setText(status);
            tvProgress.setText(progress);
            
            ObjectAnimator fadeIn = ObjectAnimator.ofFloat(tvStatus, "alpha", 0f, 1f);
            fadeIn.setDuration(150);
            fadeIn.start();
        }, 150);
    }
    
    private void startBot() {
        String keyword = etKeyword.getText().toString().trim();
        String targetUrl = etTargetUrl.getText().toString().trim();
        String countStr = etLoopCount.getText().toString().trim();
        
        if (keyword.isEmpty() || targetUrl.isEmpty() || countStr.isEmpty()) {
            showStyledToast("❌ Lütfen tüm alanları doldurun!");
            return;
        }
        
        if (!targetUrl.startsWith("http")) {
            showStyledToast("❌ Geçerli bir URL girin! (http:// veya https://)");
            return;
        }
        
        int count = Integer.parseInt(countStr);
        
        Intent serviceIntent = new Intent(this, TrendyolBotService.class);
        serviceIntent.putExtra("keyword", keyword);
        serviceIntent.putExtra("targetUrl", targetUrl);
        serviceIntent.putExtra("count", count);
        
        TrendyolBotService.setWebView(webView);
        startForegroundService(serviceIntent);
        
        // Wake lock aktif et
        acquireWakeLock();
        
        btnStart.setEnabled(false);
        btnStop.setEnabled(true);
        
        showStyledToast("🚀 Google trafik botu başlatıldı! Ekran açık kalacak.");
    }
    
    private void stopBot() {
        Intent serviceIntent = new Intent(this, TrendyolBotService.class);
        stopService(serviceIntent);
        
        // Wake lock serbest bırak
        releaseWakeLock();
        
        btnStart.setEnabled(true);
        btnStop.setEnabled(false);
        tvStatus.setText("⏹️ Durduruldu - Sistem hazır");
        
        showStyledToast("⏹️ Bot durduruldu!");
    }
    
    private void showSystemInfo() {
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this, R.style.DarkAlertDialog);
        builder.setTitle("🔥 İHSAN HAMURCU VİSİTOR SEO BOT");
        builder.setMessage("🚀 Botçu eboya selamlar\n\n" +
                "🔍 GOOGLE ARAMA SÜRECİ:\n" +
                "• ZORUNLU uçak modu (IP değişimi)\n" +
                "• Google.com.tr otomatik açılır\n" +
                "• Anahtar kelime aratılır\n" +
                "• Hedef site bulunur ve tıklanır\n" +
                "• Sitede gezinme ve buton tıklama\n\n" +
                "✈️ ZORUNLU IP DEĞİŞİMİ:\n" +
                "• Her işlemden ÖNCE uçak modu\n" +
                "• 5 saniye IP değişimi\n" +
                "• ASLA kendi IP'de girmez\n" +
                "• %100 farklı IP garantisi\n\n" +
                "⚡ ÖZELLİKLER:\n" +
                "• 40+ farklı User Agent\n" +
                "• Otomatik buton tıklama\n" +
                "• Profesyonel gezinme\n" +
                "• Root + Uçak modu optimized\n\n" +
                "🎯 SONUÇ: Google sonuçlarından %100 organik trafik!\n\n" +
                "📡 YENİ: Ping-o-matic sistemi!\n" +
                "• Otomatik ping gönderimi\n" +
                "• SEO indexleme desteği\n" +
                "• Test butonu ile kontrol");
        builder.setPositiveButton("🔓 Root Test Et", (dialog, which) -> testRootAccess());
        builder.setNegativeButton("✅ Tamam", null);
        builder.show();
    }
    
    private void testRootAccess() {
        showStyledToast("🔍 Root erişimi test ediliyor...");
        
        new Thread(() -> {
            try {
                Process su = Runtime.getRuntime().exec("su");
                java.io.DataOutputStream os = new java.io.DataOutputStream(su.getOutputStream());
                os.writeBytes("id\n");
                os.writeBytes("exit\n");
                os.flush();
                
                int result = su.waitFor();
                
                runOnUiThread(() -> {
                    if (result == 0) {
                        showStyledToast("✅ ROOT ERİŞİMİ TAMAM! Sistem hazır 🔥");
                    } else {
                        showStyledToast("❌ ROOT ERİŞİMİ YOK! Cihaz root'lanmalı");
                    }
                });
                
            } catch (Exception e) {
                runOnUiThread(() -> {
                    showStyledToast("❌ ROOT TESTİ BAŞARISIZ: " + e.getMessage());
                });
            }
        }).start();
    }
    
    private void showStyledToast(String message) {
        Toast toast = Toast.makeText(this, message, Toast.LENGTH_LONG);
        toast.show();
    }
    
    // PING-O-MATIC SİSTEMİ - BOT1'DEN ALINDI
    private void sendPingAndWait(Runnable onComplete) {
        String keyword = etKeyword.getText().toString().trim();
        String targetUrl = etTargetUrl.getText().toString().trim();
        
        tvStatus.setText("📡 Ping: " + keyword + " -> " + targetUrl);
        showStyledToast("📡 Ping-o-matic'e ping gönderiliyor...");
        
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
                
                runOnUiThread(() -> {
                    if (responseCode == 200) {
                        tvStatus.setText("✅ Ping OK: " + keyword + " -> " + targetUrl + " (" + responseCode + ")");
                        showStyledToast("📡 Ping-o-matic BAŞARILI! ✅");
                    } else {
                        tvStatus.setText("⚠️ Ping HATA: " + keyword + " -> " + targetUrl + " (" + responseCode + ")");
                        showStyledToast("⚠️ Ping başarısız ama devam ediyor");
                    }
                    if (onComplete != null) {
                        onComplete.run();
                    }
                });
                
            } catch (Exception e) {
                runOnUiThread(() -> {
                    tvStatus.setText("❌ Ping ERR: " + e.getMessage());
                    showStyledToast("⚠️ Ping hatası: " + e.getMessage() + " - Devam ediyor");
                    if (onComplete != null) {
                        onComplete.run();
                    }
                });
            }
        }).start();
    }
    
    // PING TEST METODU - MANUEL TEST İÇİN (UÇAK MODU İLE)
    public void testPingSystem() {
        showStyledToast("✈️ Önce IP değiştiriliyor, sonra ping test...");
        tvStatus.setText("✈️ Test için IP değiştiriliyor...");
        
        // Test için de uçak modu kullan
        new Thread(() -> {
            try {
                // Uçak modu aç
                Process proc1 = Runtime.getRuntime().exec(new String[]{"su", "-c", "settings put global airplane_mode_on 1"});
                proc1.waitFor();
                Process proc2 = Runtime.getRuntime().exec(new String[]{"su", "-c", "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true"});
                proc2.waitFor();
                
                runOnUiThread(() -> tvStatus.setText("✈️ Test - Uçak modu açık (5sn)"));
                Thread.sleep(5000);
                
                // Uçak modu kapat
                Process proc3 = Runtime.getRuntime().exec(new String[]{"su", "-c", "settings put global airplane_mode_on 0"});
                proc3.waitFor();
                Process proc4 = Runtime.getRuntime().exec(new String[]{"su", "-c", "am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false"});
                proc4.waitFor();
                
                runOnUiThread(() -> tvStatus.setText("📶 Test - Yeni IP alındı, ping başlıyor"));
                Thread.sleep(3000);
                
                runOnUiThread(() -> {
                    sendPingAndWait(() -> {
                        showStyledToast("✅ IP değişimi + Ping test tamamlandı!");
                    });
                });
                
            } catch (Exception e) {
                runOnUiThread(() -> {
                    tvStatus.setText("⚠️ Root hatası - Direkt ping test");
                    sendPingAndWait(() -> {
                        showStyledToast("✅ Ping test tamamlandı (IP değişmedi)!");
                    });
                });
            }
        }).start();
    }
    
    private void setupWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setBuiltInZoomControls(true);
        webView.getSettings().setDisplayZoomControls(false);
        webView.getSettings().setSupportZoom(true);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.setInitialScale(1);
        
        // Desktop user agent ayarla
        webView.getSettings().setUserAgentString("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
        
        // WebView'i tam ekran yap
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
    }
    
    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wakeLock = powerManager.newWakeLock(
                PowerManager.SCREEN_DIM_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "TrendyolBot:WakeLock"
            );
        }
        if (!wakeLock.isHeld()) {
            wakeLock.acquire();
        }
    }
    
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        tvStatus.setText("✅ Hazır - Google arama + Root sistemi aktif 🔥");
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        LocalBroadcastManager.getInstance(this).unregisterReceiver(statusReceiver);
        releaseWakeLock();
    }
}