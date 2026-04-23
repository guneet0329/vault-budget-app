# Vault — React Native Budget App

## Project Structure
```
VaultApp/
├── App.js                          ← Root: navigation + global state
├── src/
│   ├── theme.js                    ← Colors, typography, spacing
│   ├── storage/
│   │   └── store.js                ← AsyncStorage persistence
│   ├── components/
│   │   ├── WalletCard.js           ← Individual wallet card
│   │   ├── AddExpenseModal.js      ← Expense entry (single + split)
│   │   ├── SplitPanel.js           ← $ / % split allocator
│   │   └── AddWalletModal.js       ← Create / edit wallets
│   └── screens/
│       ├── WalletsScreen.js        ← Main dashboard
│       ├── AnalysisScreen.js       ← Charts & stats
│       └── MoreScreen.js           ← Transactions + tools
```

---

## 1. One-time Toolchain Setup

### Install Chocolatey (Admin PowerShell)
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Install Node + JDK
```powershell
choco install -y nodejs-lts microsoft-openjdk17
```

### Install Android Studio
Download from https://developer.android.com/studio
During setup, check: Android SDK, Android SDK Platform, Android Virtual Device

### Set Environment Variables (System → Environment Variables)
```
ANDROID_HOME = C:\Users\<YourName>\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Microsoft\jdk-17
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools\bin
```

---

## 2. Project Setup

```bash
# Scaffold new RN project
npx @react-native-community/cli init VaultApp
cd VaultApp

# Install dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install react-native-svg

# Copy the provided source files:
# - App.js           → VaultApp/App.js  (replace default)
# - src/             → VaultApp/src/
```

### Link native modules (Android auto-links, nothing extra needed)
```bash
cd android && ./gradlew clean && cd ..
```

---

## 3. Run on Device / Emulator

### USB (physical phone)
1. Enable Developer Options on your Android phone
2. Enable USB Debugging
3. Plug in via USB
4. Run:
```bash
npx react-native run-android
```

### Emulator
1. Open Android Studio → Device Manager → Create Virtual Device
2. Then:
```bash
npx react-native run-android
```

---

## 4. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

> **Signing:** For a release build you'll need a keystore.
> Generate one with:
> ```bash
> keytool -genkey -v -keystore vault-release.keystore -alias vault -keyalg RSA -keysize 2048 -validity 10000
> ```
> Then add it to `android/app/build.gradle` under `signingConfigs`.

---

## 5. Split Feature — How It Works

1. Tap **Add Expense**, enter total amount
2. Tap **✂️ Split** mode tab
3. The SplitPanel appears showing all wallets
4. For each wallet, toggle **$** (fixed dollar) or **%** (percentage of total)
5. Enter the amount — the progress bar and "remaining" counter update live
6. Tap **⚡ Auto-split evenly** to distribute equally in one tap
7. The **Log Split Expense** button activates only when the total is exactly balanced

---

## 6. Useful Dev Commands

```bash
npx react-native doctor          # check environment
npx react-native run-android     # run on connected device/emulator
npx react-native log-android     # view logs
cd android && ./gradlew clean    # clean build cache
```
