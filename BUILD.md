# Better for Android: build and release

Better is a web app (in `www/`) wrapped by Capacitor, with a small native Android layer for reminders. The Android project is in `android/`. Package name: `com.bytesandpixels.better`. Version 1.0.0 (versionCode 1). Targets Android 16 (API 36), minimum Android 7 (API 24).

## 1. Get a test APK (no setup, no Android Studio)
1. Create a **private** GitHub repository and push this folder to its `main` branch.
2. Open the repository, go to **Actions**, then the **Build Android** run.
3. When it finishes, download the artifact **better-debug-apk**, unzip, and send `app-debug.apk` to your phone. Install it (allow "Install unknown apps" for the app you opened it from).
4. If the build fails, open the failed step and send the error text to Claude.

## 2. Make your upload key (once)
On a computer with Java installed (Android Studio includes it):
```
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
Keep `upload.jks` and its passwords somewhere safe, and back them up. Then in GitHub: **Settings → Secrets and variables → Actions → New repository secret**, add:
- `KEYSTORE_BASE64`: the output of `base64 -w0 upload.jks` (on Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks"))`)
- `KEYSTORE_PASSWORD`, `KEY_ALIAS` (use `upload`), `KEY_PASSWORD`

Re-run the workflow. It now also produces **better-release-aab**, the signed bundle for Play Console.

## 3. Upload to Google Play
1. Play Console → your app → **Testing → Closed testing** → create a release → upload `app-release.aab`. Accept **Play App Signing**.
2. Fill in the store listing and declarations using `store/LISTING.md` and `store/DECLARATIONS.md`. Assets are in `store/`.
3. Host `docs/privacy.html` (GitHub Pages: Settings → Pages → deploy from `main` / `docs`) and paste the URL.
4. Add 12 or more testers, keep them opted in for 14 days, then apply for production access.

## Every new release
Raise `versionCode` (and `versionName`) in `android/app/build.gradle`, push, and upload the new `.aab`.
