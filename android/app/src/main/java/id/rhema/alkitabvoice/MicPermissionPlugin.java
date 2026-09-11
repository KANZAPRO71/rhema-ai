package id.rhema.alkitabvoice;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "MicPermission",
        permissions = {
                @Permission(alias = "microphone", strings = {"android.permission.RECORD_AUDIO"})
        }
)
public class MicPermissionPlugin extends Plugin {
    @PluginMethod
    public void check(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void ensure(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermCallback");
        } else {
            call.resolve();
        }
    }

    @PermissionCallback
    private void micPermCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve();
        } else {
            call.reject("Izin mikrofon ditolak");
        }
    }
}
