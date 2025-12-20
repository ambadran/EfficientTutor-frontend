# Mobile Application Migration Plan (EfficientTutor)

**Current Status:** ✅ Phase 1 & 2 Complete (Vite & Capacitor Integrated).
**Active Workflow:** Use `npm run dev` for web, `npm run build:mobile` for app updates.

This document outlines the step-by-step strategy to transform the EfficientTutor web application into a native mobile application for iOS and Android using **Capacitor**.

## Core Strategy
We will strictly maintain a **single codebase**. We will not rewrite logic in Swift or Kotlin. Instead, we will use Capacitor to wrap the existing web application in a native container. To ensure performance and maintainability, we will introduce **Vite** as a build tool to bundle our assets before they are synced to the mobile projects.

---

## Phase 1: Infrastructure & Build System (Vite)

Currently, the app serves raw source files. For mobile, we need a bundled, optimized `dist/` folder.

### 1.1 Install Dependencies
We need to add Vite and a plugin to handle legacy browser support (optional but good for older phones).
```bash
npm install -D vite @vitejs/plugin-legacy
```

### 1.2 Create `vite.config.js`
Create this file in the root directory to tell Vite how to handle our Vanilla JS structure.
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // This ensures our local development server works similarly to the raw file server
  server: {
    port: 3000,
    open: true
  }
});
```

### 1.3 Update `package.json` Scripts
We replace the old manual build scripts with unified Vite and Capacitor commands. This is the **final configuration**:
```json
"scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "build:mobile": "vite build && npx cap sync",
    "open:android": "npx cap open android",
    "open:ios": "npx cap open ios"
}
```
*Note: Vite handles CSS imports automatically, so we might adjust how Tailwind is included (importing CSS in JS instead of a separate process).*

---

## Phase 2: Capacitor Integration

### 2.1 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### 2.2 Initialize Capacitor
```bash
npx cap init EfficientTutor com.efficienttutor.app --web-dir=dist
```
*   **App Name:** EfficientTutor
*   **Package ID:** `com.efficienttutor.app` (Unique identifier for App Stores)
*   **Web Dir:** `dist` (This is crucial; it points to the folder Vite creates)

### 2.3 Add Platforms
```bash
npx cap add android
npx cap add ios
```

---

## Phase 3: UI & UX Adaptation (The "Native Feel")

This is the most critical phase to ensure the app doesn't look like a website.

### 3.1 Viewport & Safe Areas (The Notch)
Mobile phones have notches and gesture bars. We must tell the browser to render underneath them.

**Step 1: Update Meta Tag in `index.html`**
Change the viewport meta tag to include `viewport-fit=cover`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
```

**Step 2: Configure Tailwind for Safe Areas**
We need utilities to add padding where the notch is.
*Install plugin:* `npm install -D tailwindcss-safe-area`
*Update `tailwind.config.js`:*
```javascript
module.exports = {
  // ...
  plugins: [
    require('tailwindcss-safe-area'),
  ],
}
```

**Step 3: Apply Safe Area Classes**
Update the main layout elements in `index.html` or `js/ui/templates.js`:
*   **Header/Navbar:** Add `pt-safe` (Padding Top Safe) so content doesn't overlap the status bar.
*   **Sidebar:** Add `pt-safe` and `pb-safe` (Padding Bottom Safe) for the home indicator area.

### 3.2 Touch Interactions
Native apps don't select text when you tap headers, and they react instantly.

**Step 1: Global CSS in `css/input.css`**
```css
:root {
    /* Disable text selection globally, re-enable on inputs */
    -webkit-user-select: none;
    user-select: none;
    /* Remove tap highlight color on Android */
    -webkit-tap-highlight-color: transparent;
    /* Prevent iOS rubber-banding on the body (we handle scroll areas specifically) */
    overscroll-behavior: none;
}

input, textarea {
    -webkit-user-select: text;
    user-select: text;
}

/* Optimize touch response */
button, a {
    touch-action: manipulation;
}
```

**Step 2: Active States**
Ensure all buttons have a visual feedback state. Tailwind's `active:` classes work well here.
*Example:* `class="bg-blue-500 active:bg-blue-700 transition-colors"`

### 3.3 Hardware Back Button (Android)
Android users expect the physical back button to close modals or go back in history.
In `js/main.js`:
```javascript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (document.querySelector('.modal-backdrop')) {
    // If a modal is open, close it
    closeModal(); 
  } else if (appState.currentPage !== 'login') {
    // If logged in, maybe go back or minimize?
    // logic to navigate back or App.exitApp();
  } else {
    App.exitApp();
  }
});
```

---

## Phase 4: Configuration & API

### 4.1 Dynamic Backend URL
The app cannot use `localhost` when running on the phone.
Update `js/config.js`:
```javascript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const config = {
    backendUrl: isNative 
        ? 'https://personal-time-manager.onrender.com' // Always production on mobile
        : (window.location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : 'https://...'),
    // ...
};
```

---

## Phase 5: Push Notifications (Future Prep)

### 5.1 Install Plugin
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 5.2 Registration Logic
In `js/main.js` (inside `initialize()`):
```javascript
import { PushNotifications } from '@capacitor/push-notifications';

if (Capacitor.isNativePlatform()) {
    PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
            PushNotifications.register();
        }
    });

    PushNotifications.addListener('registration', (token) => {
        // Send this token.value to your backend to associate with the user
        console.log('Push Token:', token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Show an alert or update UI
    });
}
```

---

## Phase 6: The "Master Build Script"

To automate everything, we add a specific command to `package.json`.

```json
"scripts": {
  "build:mobile": "vite build && npx cap sync",
  "open:android": "npx cap open android",
  "open:ios": "npx cap open ios"
}
```

### Workflow using this script:
1.  You make changes to your JS/CSS code.
2.  You run `npm run build:mobile`.
    *   This compiles your Tailwind.
    *   This bundles your JS.
    *   This updates the Android/iOS native projects with the new code.
3.  You run `npm run open:android` (or `ios`).
4.  This opens Android Studio/Xcode where you just press "Play" to run it on your device/emulator.

---

## Phase 7: Final Polishing & Assets

1.  **Icons & Splash Screen:**
    Use `@capacitor/assets` to automatically generate all icon sizes from a single source image.
    ```bash
    npm install @capacitor/assets --save-dev
    npx capacitor-assets generate
    ```
2.  **Permissions:**
    Check `AndroidManifest.xml` and `Info.plist` to ensure you are only requesting permissions you use (Internet is default, but Camera/Push need explicit entries).
3.  **Asset Path Fixes (Important):**
    In templates (e.g., `js/ui/templates.js`), Vite cannot automatically detect image paths inside string literals. 
    *Action:* Import images at the top of the file: `import logo from '../../assets/logo.png';` and use the variable in the HTML string.
4.  **Versioning:**
    Sync your `package.json` version with the native app versions using `npx cap sync` configuration or manual updates in Xcode/Android Studio before release.

---

## Phase 8: Native IDE Configuration (Post-Sync)

These steps are done directly in Xcode or Android Studio and are persistent as long as the `ios/` and `android/` folders are committed.

### 8.1 iOS (Xcode)
1.  **Signing:** Select the 'App' target -> Signing & Capabilities -> Select your Team.
2.  **Capabilities:** 
    *   Click `+ Capability`.
    *   Add **Push Notifications**.
    *   Add **Background Modes** -> Check **Remote notifications**.
3.  **Info.plist:** Add user-friendly descriptions for any requested permissions (e.g., `NSCameraUsageDescription`).

### 8.2 Android (Android Studio)
1.  **Permissions:** Ensure `POST_NOTIFICATIONS` is in `AndroidManifest.xml` for Android 13+.
2.  **Variables:** Check `variables.gradle` for matching support library versions if plugins conflict.
