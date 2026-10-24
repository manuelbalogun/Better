package com.bytesandpixels.better;

import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Small bridge for the system screens Better needs to send people to so reminders stay reliable.
 * Nothing here reads or sends any user data.
 */
@CapacitorPlugin(name = "BetterNative")
public class BetterNativePlugin extends Plugin {

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        boolean unrestricted = true;
        try {
            if (Build.VERSION.SDK_INT >= 23) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                unrestricted = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            }
        } catch (Exception ignored) {
        }
        JSObject ret = new JSObject();
        ret.put("unrestricted", unrestricted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSetting(PluginCall call) {
        String key = call.getString("key", "");
        String pkg = getContext().getPackageName();
        Intent[] tries;
        switch (key) {
            case "notif":
                tries = new Intent[]{
                    new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg)
                };
                break;
            case "battery":
                tries = new Intent[]{
                    new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                };
                break;
            case "dnd":
                tries = new Intent[]{
                    new Intent(Settings.ACTION_SOUND_SETTINGS)
                };
                break;
            case "autostart":
                tries = new Intent[]{
                    // Xiaomi / Redmi / Poco
                    comp("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
                    // Tecno / Infinix / itel (Transsion)
                    comp("com.transsion.phonemaster", "com.cyin.himgr.autostart.AutostartActivity"),
                    comp("com.itel.autobootmanager", "com.itel.autobootmanager.activity.AutoBootMgrActivity"),
                    // Oppo / Realme / OnePlus
                    comp("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
                    comp("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
                    // Vivo
                    comp("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
                    comp("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
                    // Huawei / Honor
                    comp("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
                    // Samsung (battery manager page that holds the "never sleeping apps" list)
                    comp("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
                };
                break;
            default:
                tries = new Intent[0];
        }
        boolean opened = false;
        for (Intent i : tries) {
            if (launch(i)) {
                opened = true;
                break;
            }
        }
        if (!opened) {
            // Fallback that exists on every phone: this app's own settings page.
            Intent details = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg));
            opened = launch(details);
        }
        JSObject ret = new JSObject();
        ret.put("opened", opened);
        call.resolve(ret);
    }

    private Intent comp(String pkg, String cls) {
        Intent i = new Intent();
        i.setComponent(new ComponentName(pkg, cls));
        return i;
    }

    private boolean launch(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            return true;
        } catch (ActivityNotFoundException | SecurityException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}
