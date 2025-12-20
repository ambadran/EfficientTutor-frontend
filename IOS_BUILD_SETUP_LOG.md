# iOS Build Setup Log & Replication Guide

**Date:** December 18, 2025
**Objective:** Configure the development environment to successfully build the EfficientTutor mobile app for iOS and open it in Xcode.

This document records the exact steps taken to resolve build errors and configure the system for Capacitor iOS development. Follow these steps to replicate the setup on a new macOS machine.

## 1. Project Dependencies Fix
The build process (`vite build`) was failing because a Tailwind plugin was configured but not installed.

**Error:** `Cannot find module 'tailwindcss-safe-area'`
**Action:** Install the missing development dependency.

```bash
npm install -D tailwindcss-safe-area@0.5.1
```
*Note: We pinned version 0.5.1 to ensure compatibility with Tailwind CSS v3.*

## 2. iOS Environment Setup
The Capacitor sync process (`npx cap sync`) failed due to missing tools required for iOS native dependency management.

### 2.1 Install CocoaPods
Capacitor uses CocoaPods to manage iOS plugins. It was missing from the system.

**Action:** Install via Homebrew.
```bash
brew install cocoapods
```

### 2.2 Configure Xcode Command Line Tools
The system was using the standalone Command Line Tools instead of the full Xcode application, preventing Capacitor from accessing `xcodebuild`.

**Error:** `xcode-select: error: tool 'xcodebuild' requires Xcode...`
**Action:** Point `xcode-select` to the active Xcode application directory.
*(Requires Admin Privileges)*
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## 3. Configuration Updates
We made necessary adjustments to the native configuration files to support the features currently implemented in the JavaScript codebase (specifically Push Notifications).

**Action:** Updated `android/app/src/main/AndroidManifest.xml`
Added the following permission to support Android 13+ notifications (ensuring the Android build stays in sync with the codebase features):
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

## 4. Building the Application
With dependencies installed and the environment configured, we ran the master build script.

**Action:** Run the mobile build command.
```bash
npm run build:mobile
```
*This command executes:* `vite build && npx cap sync`
1.  **Vite Build:** Compiles the JS/CSS assets into the `dist/` folder.
2.  **Cap Sync:** Copies the `dist/` folder to the native iOS/Android projects and updates native plugins.

## 5. Opening in Xcode
The build is now ready to be run on a simulator or physical device.

**Action:** Open the project in Xcode.
```bash
npm run open:ios
```
*(Or manually: `npx cap open ios`)*

---

## Summary of Commands for Replication
If setting this up again from scratch, run these commands in order:

```bash
# 1. Install Node Dependencies (including the fix)
npm install
npm install -D tailwindcss-safe-area@0.5.1

# 2. Install System Tools (macOS only)
brew install cocoapods
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 3. Build and Sync
npm run build:mobile

# 4. Launch Xcode
npm run open:ios
```
