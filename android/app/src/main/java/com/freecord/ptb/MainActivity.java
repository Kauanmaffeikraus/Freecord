package com.freecord.ptb;

import android.Manifest;
import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioManager;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Rational;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MEDIA_PROJECTION = 2049;
    private static final int REQUEST_FILE_CHOOSER = 2050;
    private static MainActivity instance;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private HandlerThread captureThread;
    private Handler captureHandler;
    private ByteBuffer reusablePixelBuffer;

    private ActivityResultLauncher<Intent> screenCaptureLauncher;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private ValueCallback<Uri[]> filePathCallback;
    private int pendingResultCode = 0;
    private Intent pendingResultData = null;

    private volatile boolean isCapturingScreen = false;
    private volatile boolean isVoiceCallActive = false;
    private volatile boolean isDownloadingApkUpdate = false;
    private volatile boolean pendingApkInstallOnResume = false;
    private String activeVoiceChannelName = "Chamada P2P";
    private int requestedMaxDim = 960;
    private int requestedFps = 15;
    private long lastFrameSentAt = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register ActivityResultLaunchers before super.onCreate so BridgeActivity lifecycle accepts them
        screenCaptureLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> handleScreenCapturePermissionResult(result.getResultCode(), result.getData())
        );

        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> handleFileChooserResult(result.getResultCode(), result.getData())
        );

        super.onCreate(savedInstanceState);
        instance = this;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#111214"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#111214"));
        }
        projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        // Prompt for Android OS runtime permissions (Microphone, Camera, Notifications on Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> perms = new ArrayList<>();
            perms.add(Manifest.permission.RECORD_AUDIO);
            perms.add(Manifest.permission.CAMERA);
            perms.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            if (Build.VERSION.SDK_INT >= 33) {
                perms.add("android.permission.POST_NOTIFICATIONS");
                perms.add("android.permission.READ_MEDIA_IMAGES");
                perms.add("android.permission.READ_MEDIA_VIDEO");
                perms.add("android.permission.READ_MEDIA_AUDIO");
            } else {
                perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
            List<String> needed = new ArrayList<>();
            for (String perm : perms) {
                if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(perm);
                }
            }
            if (!needed.isEmpty()) {
                requestPermissions(needed.toArray(new String[0]), 1001);
            }
        }

        // Allow cleartext WebSocket (ws://) & HTTP LAN P2P connections + grant WebRTC permissions & File Chooser
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings webSettings = webView.getSettings();
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            webSettings.setDomStorageEnabled(true);
            webSettings.setJavaScriptEnabled(true);
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);
            webSettings.setMediaPlaybackRequiresUserGesture(false);

            webView.addJavascriptInterface(new FreecordAndroidBridge(), "FreecordAndroid");

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        try {
                            request.grant(request.getResources());
                        } catch (Exception ignored) {
                        }
                    });
                }

                @Override
                public boolean onShowFileChooser(
                        WebView webView,
                        ValueCallback<Uri[]> filePathCallback,
                        FileChooserParams fileChooserParams
                ) {
                    if (MainActivity.this.filePathCallback != null) {
                        try {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                        } catch (Exception ignored) {
                        }
                        MainActivity.this.filePathCallback = null;
                    }
                    MainActivity.this.filePathCallback = filePathCallback;

                    String mimeType = "*/*";
                    if (fileChooserParams != null && fileChooserParams.getAcceptTypes() != null) {
                        for (String raw : fileChooserParams.getAcceptTypes()) {
                            if (raw == null) continue;
                            String t = raw.trim().toLowerCase();
                            if (t.startsWith("image/")) {
                                mimeType = "image/*";
                                break;
                            } else if (t.startsWith("video/")) {
                                mimeType = "video/*";
                                break;
                            } else if (t.startsWith("audio/")) {
                                mimeType = "audio/*";
                                break;
                            }
                        }
                    }

                    Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                    contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    contentSelectionIntent.setType(mimeType);
                    contentSelectionIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    if (fileChooserParams != null
                            && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        contentSelectionIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    }

                    Intent chooserIntent = Intent.createChooser(contentSelectionIntent, "Selecionar arquivo");
                    try {
                        if (fileChooserLauncher != null) {
                            fileChooserLauncher.launch(chooserIntent);
                        } else {
                            startActivityForResult(chooserIntent, REQUEST_FILE_CHOOSER);
                        }
                        return true;
                    } catch (Exception e) {
                        if (MainActivity.this.filePathCallback != null) {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                            MainActivity.this.filePathCallback = null;
                        }
                        return false;
                    }
                }
            });

            // Reload once after registering JavascriptInterface so window.FreecordAndroid is bound in JS context
            if (savedInstanceState == null) {
                webView.reload();
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingApkInstallOnResume) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                pendingApkInstallOnResume = false;
                triggerNativeApkInstall(new File(getCacheDir(), "Freecord-update.apk"));
            }
        }
    }

    private void handleFileChooserResult(int resultCode, Intent data) {
        if (filePathCallback == null) return;
        final ValueCallback<Uri[]> callback = filePathCallback;
        filePathCallback = null;

        Uri[] results = null;
        try {
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                } else {
                    results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                }
            }
        } catch (Exception ignored) {
        }

        final Uri[] finalResults = results;
        if (this.bridge != null && this.bridge.getWebView() != null) {
            final WebView webView = this.bridge.getWebView();
            webView.post(() -> {
                try {
                    webView.onResume();
                    webView.resumeTimers();
                } catch (Exception ignored) {
                }
                callback.onReceiveValue(finalResults);
            });
        } else {
            callback.onReceiveValue(finalResults);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewAwakeInBackground();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAwakeInBackground();
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        keepWebViewAwakeInBackground();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            final WebView webView = this.bridge.getWebView();
            final String js = "if(window.__onAndroidPipChanged){window.__onAndroidPipChanged(" + (isInPictureInPictureMode ? "true" : "false") + ");}";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }
    }

    private void keepWebViewAwakeInBackground() {
        if (!isVoiceCallActive && !isCapturingScreen && !isDownloadingApkUpdate) return;
        if (this.bridge != null && this.bridge.getWebView() != null) {
            final WebView webView = this.bridge.getWebView();
            webView.post(() -> {
                try {
                    webView.onResume();
                    webView.resumeTimers();
                } catch (Exception ignored) {
                }
            });
        }
    }

    private void notifyJsUpdateStatus(final String status, final int percent, final String version, final String message) {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        final WebView webView = this.bridge.getWebView();
        final String safeVer = version == null ? "" : version.replace("'", "\\'");
        final String safeMsg = message == null ? "" : message.replace("'", "\\'").replace("\n", " ");
        webView.post(() -> {
            String js = "if(window.__onAndroidUpdateProgress){window.__onAndroidUpdateProgress({"
                    + "status:'" + status + "',"
                    + "percent:" + percent + ","
                    + "version:'" + safeVer + "',"
                    + "message:'" + safeMsg + "'"
                    + "});}";
            webView.evaluateJavascript(js, null);
        });
    }

    private void triggerNativeApkInstall(final File apkFile) {
        runOnUiThread(() -> {
            try {
                if (apkFile == null || !apkFile.exists()) {
                    Toast.makeText(MainActivity.this, "Arquivo APK de atualizacao nao encontrado", Toast.LENGTH_LONG).show();
                    return;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!getPackageManager().canRequestPackageInstalls()) {
                        pendingApkInstallOnResume = true;
                        Toast.makeText(
                                MainActivity.this,
                                "Ative 'Permitir desta fonte' para o Freecord instalar a atualizacao",
                                Toast.LENGTH_LONG
                        ).show();
                        Intent permIntent = new Intent(
                                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + getPackageName())
                        );
                        permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(permIntent);
                        return;
                    }
                }
                Uri apkUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        apkFile
                );
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(installIntent);
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "Erro ao abrir instalador: " + e.getMessage(), Toast.LENGTH_LONG).show();
                notifyJsUpdateStatus("error", 0, "", e.getMessage());
            }
        });
    }

    public class FreecordAndroidBridge {
        @JavascriptInterface
        public boolean isScreenCaptureSupported() {
            return projectionManager != null;
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0.0";
            }
        }

        @JavascriptInterface
        public void downloadAndInstallApk(final String apkUrl, final String version) {
            if (apkUrl == null || apkUrl.isEmpty()) return;
            if (isDownloadingApkUpdate) return;
            isDownloadingApkUpdate = true;
            notifyJsUpdateStatus("downloading", 0, version, "");

            new Thread(() -> {
                HttpURLConnection conn = null;
                InputStream in = null;
                FileOutputStream out = null;
                try {
                    String currentUrl = apkUrl;
                    int redirects = 0;
                    while (redirects < 8) {
                        URL url = new URL(currentUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setInstanceFollowRedirects(false);
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", "Freecord-Android-Updater");
                        conn.setRequestProperty("Accept", "application/octet-stream, */*");
                        conn.connect();

                        int code = conn.getResponseCode();
                        if (code == HttpURLConnection.HTTP_MOVED_PERM
                                || code == HttpURLConnection.HTTP_MOVED_TEMP
                                || code == HttpURLConnection.HTTP_SEE_OTHER
                                || code == 307
                                || code == 308) {
                            String location = conn.getHeaderField("Location");
                            conn.disconnect();
                            if (location == null || location.isEmpty()) break;
                            currentUrl = location;
                            redirects++;
                        } else {
                            break;
                        }
                    }

                    if (conn == null || conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                        int code = conn != null ? conn.getResponseCode() : -1;
                        throw new Exception("HTTP " + code + " ao baixar APK");
                    }

                    long totalBytes = conn.getContentLengthLong();
                    File outFile = new File(getCacheDir(), "Freecord-update.apk");
                    if (outFile.exists()) {
                        outFile.delete();
                    }

                    in = conn.getInputStream();
                    out = new FileOutputStream(outFile);
                    byte[] buffer = new byte[32768];
                    long downloaded = 0L;
                    int lastPercent = -1;
                    int read;

                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        downloaded += read;
                        if (totalBytes > 0) {
                            int pct = (int) Math.min(99L, (downloaded * 100L) / totalBytes);
                            if (pct != lastPercent) {
                                lastPercent = pct;
                                notifyJsUpdateStatus("downloading", pct, version, "");
                            }
                        }
                    }
                    out.flush();
                    out.close();
                    out = null;
                    in.close();
                    in = null;

                    isDownloadingApkUpdate = false;
                    notifyJsUpdateStatus("downloaded", 100, version, "");
                    triggerNativeApkInstall(outFile);
                } catch (Exception e) {
                    isDownloadingApkUpdate = false;
                    notifyJsUpdateStatus("error", 0, version, e.getMessage());
                } finally {
                    isDownloadingApkUpdate = false;
                    try {
                        if (out != null) out.close();
                    } catch (Exception ignored) {
                    }
                    try {
                        if (in != null) in.close();
                    } catch (Exception ignored) {
                    }
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }, "FreecordApkUpdaterThread").start();
        }

        @JavascriptInterface
        public void installDownloadedApk() {
            File outFile = new File(getCacheDir(), "Freecord-update.apk");
            triggerNativeApkInstall(outFile);
        }

        @JavascriptInterface
        public boolean saveTextFile(final String filename, final String content, final String mimeType) {
            if (content == null) return false;
            final String safeName = (filename != null && !filename.isEmpty()) ? filename : "freecord-backup.json";
            final String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/json";
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, safeMime);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            if (os != null) {
                                os.write(content.getBytes(StandardCharsets.UTF_8));
                                os.flush();
                                runOnUiThread(() -> Toast.makeText(
                                        MainActivity.this,
                                        "Salvo em Downloads: " + safeName,
                                        Toast.LENGTH_LONG
                                ).show());
                                return true;
                            }
                        }
                    }
                } else {
                    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!dir.exists()) dir.mkdirs();
                    File file = new File(dir, safeName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(content.getBytes(StandardCharsets.UTF_8));
                        fos.flush();
                        runOnUiThread(() -> Toast.makeText(
                                MainActivity.this,
                                "Salvo em Downloads: " + safeName,
                                Toast.LENGTH_LONG
                        ).show());
                        return true;
                    }
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public void openExternalUrl(final String url) {
            if (url == null || url.isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(browserIntent);
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public boolean enterPipMode() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                runOnUiThread(() -> {
                    try {
                        PictureInPictureParams params = new PictureInPictureParams.Builder()
                                .setAspectRatio(new Rational(16, 9))
                                .build();
                        enterPictureInPictureMode(params);
                    } catch (Exception ignored) {
                    }
                });
                return true;
            }
            return false;
        }

        @JavascriptInterface
        public void setImmersiveFullscreen(final boolean enable) {
            runOnUiThread(() -> {
                try {
                    View decorView = getWindow().getDecorView();
                    if (enable) {
                        decorView.setSystemUiVisibility(
                                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        );
                    } else {
                        decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
                    }
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void startVoiceCallService(String channelName) {
            isVoiceCallActive = true;
            activeVoiceChannelName = (channelName != null && !channelName.isEmpty()) ? channelName : "Chamada P2P";
            runOnUiThread(() -> {
                try {
                    AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                    if (am != null) {
                        am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        am.setSpeakerphoneOn(true);
                    }
                } catch (Exception ignored) {
                }
                if (!isCapturingScreen) {
                    try {
                        Intent serviceIntent = new Intent(MainActivity.this, ScreenCaptureService.class);
                        serviceIntent.setAction("START_VOICE_CALL");
                        serviceIntent.putExtra("channelName", activeVoiceChannelName);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent);
                        } else {
                            startService(serviceIntent);
                        }
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void stopVoiceCallService() {
            isVoiceCallActive = false;
            runOnUiThread(() -> {
                try {
                    AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                    if (am != null) {
                        am.setMode(AudioManager.MODE_NORMAL);
                    }
                } catch (Exception ignored) {
                }
                if (!isCapturingScreen) {
                    try {
                        stopService(new Intent(MainActivity.this, ScreenCaptureService.class));
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public void startScreenCapture(int maxDim, int fps) {
            requestedMaxDim = Math.max(480, Math.min(1280, maxDim > 0 ? maxDim : 960));
            requestedFps = Math.max(5, Math.min(30, fps > 0 ? fps : 15));
            runOnUiThread(() -> {
                try {
                    if (projectionManager == null) {
                        notifyJsCaptureState("error", "MediaProjectionManager indisponivel");
                        return;
                    }
                    Intent captureIntent = projectionManager.createScreenCaptureIntent();
                    if (screenCaptureLauncher != null) {
                        screenCaptureLauncher.launch(captureIntent);
                    } else {
                        startActivityForResult(captureIntent, REQUEST_MEDIA_PROJECTION);
                    }
                } catch (Exception e) {
                    notifyJsCaptureState("error", e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void stopScreenCapture() {
            runOnUiThread(() -> teardownScreenCapture(true));
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            handleScreenCapturePermissionResult(resultCode, data);
        } else if (requestCode == REQUEST_FILE_CHOOSER) {
            handleFileChooserResult(resultCode, data);
        }
    }

    private void handleScreenCapturePermissionResult(int resultCode, Intent data) {
        if (resultCode == Activity.RESULT_OK && data != null) {
            pendingResultCode = resultCode;
            pendingResultData = data;
            try {
                Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                serviceIntent.setAction("START_CAPTURE");
                serviceIntent.putExtra("channelName", activeVoiceChannelName);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception e) {
                notifyJsCaptureState("error", e.getMessage());
            }
        } else {
            notifyJsCaptureState("denied", "Permissao de captura de tela negada");
        }
    }

    public static void onScreenCaptureServiceReady() {
        if (instance != null) {
            instance.runOnUiThread(() -> {
                if (instance.pendingResultData != null) {
                    instance.beginMediaProjection(
                            instance.pendingResultCode,
                            instance.pendingResultData,
                            instance.requestedMaxDim,
                            instance.requestedFps
                    );
                }
            });
        }
    }

    private void beginMediaProjection(int resultCode, Intent data, int maxDim, int fps) {
        teardownScreenCapture(false);
        try {
            mediaProjection = projectionManager.getMediaProjection(resultCode, data);
            if (mediaProjection == null) {
                notifyJsCaptureState("error", "Falha ao obter MediaProjection");
                return;
            }

            captureThread = new HandlerThread("FreecordScreenCaptureThread");
            captureThread.start();
            captureHandler = new Handler(captureThread.getLooper());

            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    runOnUiThread(() -> teardownScreenCapture(true));
                }
            }, captureHandler);

            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int rawW = metrics.widthPixels > 0 ? metrics.widthPixels : 720;
            int rawH = metrics.heightPixels > 0 ? metrics.heightPixels : 1280;
            int density = metrics.densityDpi > 0 ? metrics.densityDpi : 320;

            double scale = 1.0;
            int longest = Math.max(rawW, rawH);
            if (longest > maxDim) {
                scale = (double) maxDim / (double) longest;
            }
            final int captureW = Math.max(240, ((int) Math.round(rawW * scale) / 2) * 2);
            final int captureH = Math.max(240, ((int) Math.round(rawH * scale) / 2) * 2);

            imageReader = ImageReader.newInstance(captureW, captureH, PixelFormat.RGBA_8888, 2);
            isCapturingScreen = true;
            final long minIntervalMs = Math.max(45L, 1000L / Math.max(5, fps));

            imageReader.setOnImageAvailableListener(reader -> {
                if (!isCapturingScreen) return;
                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image == null) return;
                    long now = System.currentTimeMillis();
                    if (now - lastFrameSentAt < minIntervalMs) {
                        return;
                    }
                    lastFrameSentAt = now;

                    Image.Plane[] planes = image.getPlanes();
                    if (planes == null || planes.length == 0) return;
                    ByteBuffer buffer = planes[0].getBuffer();
                    int pixelStride = planes[0].getPixelStride();
                    int rowStride = planes[0].getRowStride();
                    int rowPadding = rowStride - pixelStride * captureW;

                    int bitmapWidth = captureW + Math.max(0, rowPadding / pixelStride);
                    int requiredBytes = bitmapWidth * captureH * 4;
                    if (reusablePixelBuffer == null || reusablePixelBuffer.capacity() < requiredBytes) {
                        reusablePixelBuffer = ByteBuffer.allocateDirect(requiredBytes);
                    }
                    reusablePixelBuffer.clear();
                    buffer.rewind();
                    int copyLen = Math.min(buffer.remaining(), requiredBytes);
                    int prevLimit = buffer.limit();
                    buffer.limit(copyLen);
                    reusablePixelBuffer.put(buffer);
                    buffer.limit(prevLimit);
                    reusablePixelBuffer.rewind();

                    Bitmap paddedBitmap = Bitmap.createBitmap(
                            bitmapWidth,
                            captureH,
                            Bitmap.Config.ARGB_8888
                    );
                    paddedBitmap.copyPixelsFromBuffer(reusablePixelBuffer);

                    Bitmap cleanBitmap = (bitmapWidth > captureW)
                            ? Bitmap.createBitmap(paddedBitmap, 0, 0, captureW, captureH)
                            : paddedBitmap;

                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 65, baos);
                    if (cleanBitmap != paddedBitmap) {
                        cleanBitmap.recycle();
                    }
                    paddedBitmap.recycle();

                    String base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                    sendFrameToJs(base64, captureW, captureH);
                } catch (Exception ignored) {
                } finally {
                    if (image != null) {
                        try {
                            image.close();
                        } catch (Exception ignored) {
                        }
                    }
                }
            }, captureHandler);

            virtualDisplay = mediaProjection.createVirtualDisplay(
                    "FreecordScreenShare",
                    captureW,
                    captureH,
                    density,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader.getSurface(),
                    null,
                    captureHandler
            );

            notifyJsCaptureState("started", captureW + "x" + captureH);
        } catch (Exception e) {
            teardownScreenCapture(false);
            notifyJsCaptureState("error", e.getMessage());
        }
    }

    private void sendFrameToJs(final String base64Jpeg, final int width, final int height) {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        final WebView webView = this.bridge.getWebView();
        webView.post(() -> {
            if (!isCapturingScreen) return;
            try {
                webView.onResume();
                webView.resumeTimers();
            } catch (Exception ignored) {
            }
            String js = "if(window.__onAndroidScreenFrame){window.__onAndroidScreenFrame('data:image/jpeg;base64,"
                    + base64Jpeg + "'," + width + "," + height + ");}";
            webView.evaluateJavascript(js, null);
        });
    }

    private void notifyJsCaptureState(final String state, final String detail) {
        if (this.bridge == null || this.bridge.getWebView() == null) return;
        final WebView webView = this.bridge.getWebView();
        final String safeDetail = detail == null ? "" : detail.replace("'", "\\'").replace("\n", " ");
        webView.post(() -> {
            String js = "if(window.__onAndroidScreenCaptureState){window.__onAndroidScreenCaptureState('"
                    + state + "','" + safeDetail + "');}";
            webView.evaluateJavascript(js, null);
        });
    }

    private void teardownScreenCapture(boolean notifyJs) {
        isCapturingScreen = false;
        try {
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
        } catch (Exception ignored) {
        }
        try {
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }
        } catch (Exception ignored) {
        }
        try {
            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
            }
        } catch (Exception ignored) {
        }
        try {
            if (captureThread != null) {
                captureThread.quitSafely();
                captureThread = null;
                captureHandler = null;
            }
        } catch (Exception ignored) {
        }
        if (isVoiceCallActive) {
            // Downgrade foreground service back to voice call mode
            try {
                Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                serviceIntent.setAction("START_VOICE_CALL");
                serviceIntent.putExtra("channelName", activeVoiceChannelName);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception ignored) {
            }
        } else {
            try {
                stopService(new Intent(this, ScreenCaptureService.class));
            } catch (Exception ignored) {
            }
        }
        if (notifyJs) {
            notifyJsCaptureState("stopped", "");
        }
    }

    @Override
    public void onDestroy() {
        isVoiceCallActive = false;
        teardownScreenCapture(false);
        super.onDestroy();
    }
}
