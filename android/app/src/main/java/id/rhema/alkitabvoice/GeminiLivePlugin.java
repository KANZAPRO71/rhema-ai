package id.rhema.alkitabvoice;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import id.rhema.alkitabvoice.BuildConfig;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;
import org.json.JSONObject;

@CapacitorPlugin(name = "GeminiLive")
public class GeminiLivePlugin extends Plugin {
    private static final String TAG = "RHEMA_GEMINI";
    private final OkHttpClient client = new OkHttpClient.Builder().build();
    private WebSocket webSocket;

    @PluginMethod
    public void probeLiveKey(PluginCall call) {
        String wsUrl = call.getString("wsUrl");
        String setupJson = call.getString("setupJson");
        int timeoutMs = call.getInt("timeoutMs", 15000);
        if (wsUrl == null || setupJson == null || wsUrl.isEmpty() || setupJson.isEmpty()) {
            call.reject("wsUrl dan setupJson wajib");
            return;
        }

        final Handler handler = new Handler(Looper.getMainLooper());
        final boolean[] finished = { false };
        final WebSocket[] probeSocket = { null };

        Runnable timeoutRunnable = () -> {
            if (finished[0]) return;
            finished[0] = true;
            closeProbeSocket(probeSocket[0]);
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("error", "timeout");
            ret.put("kind", "timeout");
            call.resolve(ret);
        };
        handler.postDelayed(timeoutRunnable, timeoutMs);

        Request request = new Request.Builder()
                .url(wsUrl)
                .addHeader("User-Agent", "RhemaAI-Android/1.0")
                .build();

        probeSocket[0] = this.client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket socket, Response response) {
                socket.send(setupJson);
            }

            @Override
            public void onMessage(WebSocket socket, String text) {
                handleProbeMessage(call, handler, timeoutRunnable, finished, probeSocket, text);
            }

            @Override
            public void onMessage(WebSocket socket, ByteString bytes) {
                handleProbeMessage(call, handler, timeoutRunnable, finished, probeSocket, bytes.utf8());
            }

            @Override
            public void onFailure(WebSocket socket, Throwable t, Response response) {
                if (finished[0]) return;
                finished[0] = true;
                handler.removeCallbacks(timeoutRunnable);
                closeProbeSocket(probeSocket[0]);
                String msg = (t == null || t.getMessage() == null) ? "WebSocket gagal" : t.getMessage();
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("error", msg);
                ret.put("kind", classifyProbeKind(msg));
                call.resolve(ret);
            }

            @Override
            public void onClosed(WebSocket socket, int code, String reason) {
                if (finished[0]) return;
                finished[0] = true;
                handler.removeCallbacks(timeoutRunnable);
                String r = reason != null ? reason : "";
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("error", r.isEmpty() ? ("closed:" + code) : r);
                ret.put("kind", code == 1006 ? "live_not_enabled" : "network");
                call.resolve(ret);
            }
        });
    }

    private void handleProbeMessage(
            PluginCall call,
            Handler handler,
            Runnable timeoutRunnable,
            boolean[] finished,
            WebSocket[] probeSocket,
            String text
    ) {
        if (finished[0]) return;
        try {
            JSONObject msg = new JSONObject(text);
            if (msg.has("setupComplete")) {
                finished[0] = true;
                handler.removeCallbacks(timeoutRunnable);
                closeProbeSocket(probeSocket[0]);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
                return;
            }
            if (msg.has("error")) {
                JSONObject err = msg.getJSONObject("error");
                String errMsg = err.optString("message", "live_error");
                finished[0] = true;
                handler.removeCallbacks(timeoutRunnable);
                closeProbeSocket(probeSocket[0]);
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("error", errMsg);
                ret.put("kind", classifyProbeKind(errMsg));
                call.resolve(ret);
            }
        } catch (Exception ignored) {
            /* tunggu pesan berikutnya atau timeout */
        }
    }

    private static String classifyProbeKind(String msg) {
        String lower = msg == null ? "" : msg.toLowerCase();
        if (lower.contains("429") || lower.contains("quota") || lower.contains("rate limit")) {
            return "quota";
        }
        if (lower.contains("live") || lower.contains("preview") || lower.contains("not found") || lower.contains("model")) {
            return "live_not_enabled";
        }
        if (lower.contains("api key") || lower.contains("permission") || lower.contains("denied") || lower.contains("invalid")) {
            return "invalid";
        }
        return "network";
    }

    private static void closeProbeSocket(WebSocket socket) {
        if (socket != null) {
            try {
                socket.close(1000, "probe done");
            } catch (Exception ignored) {
            }
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String wsUrl = call.getString("wsUrl");
        String setupJson = call.getString("setupJson");
        if (wsUrl == null || setupJson == null || wsUrl.isEmpty() || setupJson.isEmpty()) {
            call.reject("wsUrl dan setupJson wajib");
            return;
        }
        disconnectSocketQuietly();
        if (BuildConfig.DEBUG) Log.i(TAG, "connect setupLen=" + setupJson.length());
        Request request = new Request.Builder()
                .url(wsUrl)
                .addHeader("User-Agent", "RhemaAI-Android/1.0")
                .build();
        this.webSocket = this.client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket socket, Response response) {
                if (BuildConfig.DEBUG) Log.i(TAG, "onOpen code=" + response.code());
                boolean ok = socket.send(setupJson);
                if (BuildConfig.DEBUG) Log.i(TAG, "setup sent ok=" + ok + " len=" + setupJson.length());
                emitEvent("open", null, 0, "");
            }

            @Override
            public void onMessage(WebSocket socket, ByteString bytes) {
                if (BuildConfig.DEBUG) Log.i(TAG, "onMessage bytes len=" + bytes.size());
                emitEvent("message", bytes.utf8(), 0, "");
            }

            @Override
            public void onMessage(WebSocket socket, String text) {
                if (BuildConfig.DEBUG) Log.i(TAG, "onMessage len=" + text.length());
                emitEvent("message", text, 0, "");
            }

            @Override
            public void onFailure(WebSocket socket, Throwable t, Response response) {
                String msg = (t == null || t.getMessage() == null) ? "WebSocket gagal" : t.getMessage();
                if (BuildConfig.DEBUG) Log.e(TAG, "onFailure " + msg);
                emitEvent("error", msg, 0, "");
            }

            @Override
            public void onClosed(WebSocket socket, int code, String reason) {
                if (BuildConfig.DEBUG) Log.w(TAG, "onClosed " + code + " " + reason);
                emitEvent("close", null, code, reason != null ? reason : "");
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void send(PluginCall call) {
        String json = call.getString("json");
        if (this.webSocket != null && json != null && !json.isEmpty()) {
            this.webSocket.send(json);
        }
        call.resolve();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectSocketQuietly();
        call.resolve();
    }

    private void disconnectSocketQuietly() {
        if (this.webSocket != null) {
            try {
                this.webSocket.close(1000, "client stop");
            } catch (Exception ignored) {
            }
            this.webSocket = null;
        }
    }

    private void emitEvent(String type, String data, int code, String reason) {
        JSObject ev = new JSObject();
        ev.put("type", type);
        if (data != null) {
            ev.put("data", data);
        }
        if (code != 0) {
            ev.put("code", code);
        }
        if (reason != null && !reason.isEmpty()) {
            ev.put("reason", reason);
        }
        bridge.executeOnMainThread(() -> notifyListeners("geminiWsEvent", ev));
    }
}
