package com.nexabot.trendyolbot;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.util.Random;

public class BotWorker {
    private Context context;
    private WebView webView;
    private Handler handler;
    private boolean isRunning = false;
    private int currentIteration = 0;
    private int totalIterations;
    private String productQuery;
    private Random random = new Random();

    public BotWorker(Context context, WebView webView) {
        this.context = context;
        this.webView = webView;
        this.handler = new Handler(Looper.getMainLooper());
        setupWebView();
    }

    private void setupWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setUserAgentString("Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                handler.postDelayed(() -> performPageActions(), 500);
            }
        });
    }

    public void startBot(String query, int iterations) {
        this.productQuery = query;
        this.totalIterations = iterations;
        this.currentIteration = 0;
        this.isRunning = true;
        startNextIteration();
    }

    public void stopBot() {
        isRunning = false;
    }

    private void startNextIteration() {
        if (!isRunning || currentIteration >= totalIterations) {
            sendStatusUpdate("Bot tamamlandı");
            return;
        }

        currentIteration++;
        sendStatusUpdate("Döngü " + currentIteration + "/" + totalIterations);
        
        // Trendyol'u aç
        webView.loadUrl("https://www.trendyol.com");
    }

    private void performPageActions() {
        // Arama yap
        String searchScript = "document.querySelector('[data-testid=\"suggestion\"]').value = '" + productQuery + "'; " +
                             "document.querySelector('[data-testid=\"search-icon\"]').click();";
        webView.evaluateJavascript(searchScript, null);

        // 2 saniye bekle sonra ürüne tıkla
        handler.postDelayed(() -> {
            String clickScript = "document.querySelector('[data-testid=\"product-item\"]').click();";
            webView.evaluateJavascript(clickScript, null);
            
            // 6 saniye gezin
            performScrolling();
        }, 2000);
    }

    private void performScrolling() {
        for (int i = 0; i < 3; i++) {
            handler.postDelayed(() -> {
                int scrollAmount = 200 + random.nextInt(300);
                String scrollScript = "window.scrollBy(0, " + scrollAmount + ");";
                webView.evaluateJavascript(scrollScript, null);
            }, i * 2000);
        }

        // 6 saniye sonra uçak modu aç
        handler.postDelayed(this::toggleAirplaneMode, 6000);
    }

    private void toggleAirplaneMode() {
        Intent intent = new Intent("AIRPLANE_MODE_ON");
        context.sendBroadcast(intent);
        
        // 3 saniye bekle sonra kapat
        handler.postDelayed(() -> {
            Intent offIntent = new Intent("AIRPLANE_MODE_OFF");
            context.sendBroadcast(offIntent);
            
            // 5 saniye bekle sonraki döngü
            handler.postDelayed(this::startNextIteration, 5000);
        }, 3000);
    }

    private void sendStatusUpdate(String status) {
        Intent intent = new Intent("BOT_STATUS_UPDATE");
        intent.putExtra("status", status);
        context.sendBroadcast(intent);
    }
}