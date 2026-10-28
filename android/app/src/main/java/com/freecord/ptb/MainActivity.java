package com.freecord.ptb;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioManager;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MEDIA_PROJECTION = 2049;
    private static MainActivity instance;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private HandlerThread captureThread;
    private Handler captureHandler;
    private ByteBuffer reusablePixelBuffer;

    private ActivityResultLauncher<Intent> screenCaptureLauncher;
    private int pendingResultCode = 0;
    private Intent pendingResultData = null;

    private volatile boolean isCapturingScreen = false;
    private volatile boolean isVoiceCallActive = false;
    private String activeVoiceChannelName = "Chamada P2P";
    private int requestedMaxDim = 960;
    private int requestedFps = 15;
    private long lastFrameSentAt = 0L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register ActivityResultLauncher before super.onCreate so BridgeActivity lifecycle accepts it
        screenCaptureLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> handleScreenCapturePermissionResult(result.getResultCode(), result.getData())
        );

        super.onCreate(savedInstanceState);
        instance = this;
        projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        // Prompt for Android OS runtime permissions (Microphone, Camera, Notifications on Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> perms = new ArrayList<>();
            perms.add(Manifest.permission.RECORD_AUDIO);
            perms.add(Manifest.permission.CAMERA);
            perms.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            if (Build.VERSION.SDK_INT >= 33) {
                perms.add("android.permission.POST_NOTIFICATIONS");
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

        // Allow cleartext WebSocket (ws://) & HTTP LAN P2P connections + grant WebRTC permissions
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings webSettings = webView.getSettings();
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            webSettings.setDomStorageEnabled(true);
            webSettings.setJavaScriptEnabled(true);
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
            });

            // Reload once after registering JavascriptInterface so window.FreecordAndroid is bound in JS context
            if (savedInstanceState == null) {
                webView.reload();
            }
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

    private void keepWebViewAwakeInBackground() {
        if (!isVoiceCallActive && !isCapturingScreen) return;
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

    public class FreecordAndroidBridge {
        @JavascriptInterface
        public boolean isScreenCaptureSupported() {
            return projectionManager != null;
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
