# Mobile Development Workflow Guide (EfficientTutor)

**Objective:** This document explains the complete workflow for developing, building, and running the EfficientTutor application on Web, iOS, and Android. It clarifies the role of each tool and provides a quick reference for daily commands.

---

## 1. The Architecture: Who Does What?

To understand the commands, you must understand the tools.

### 🔌 Vite (The Compiler)
*   **Analogy:** `gcc` / C Compiler.
*   **Input:** Your source code (`js/`, `css/`, `index.html`).
*   **Action:** Bundles, minifies, and optimizes your code into a single "production-ready" package.
*   **Output:** The `dist/` folder.
*   **Key Command:** `npm run build`

### ⚡ Capacitor (The Bridge / Flasher)
*   **Analogy:** The Linker & Flashing Tool.
*   **Input:** The `dist/` folder (produced by Vite).
*   **Action:** 
    1.  **Copies** the contents of `dist/` into the native project folders (`android/app/src/main/assets/public` and `ios/App/App/public`).
    2.  **Syncs** native configuration (plugins, permissions) defined in `package.json` to the native projects.
*   **Output:** Updated Android and iOS projects ready to be compiled by Android Studio/Xcode.
*   **Key Command:** `npx cap sync`

### 📱 Xcode / Android Studio (The Native IDEs)
*   **Analogy:** The Debugger / Hardware Interface.
*   **Input:** The `ios/` and `android/` folders.
*   **Action:** Compiles the native wrapper code, signs the app, and launches the Simulator/Emulator.

---

## 2. Detailed Workflows

### Mode A: Fast Development (Web Only)
*Use this for 90% of your work (logic, UI layout, CSS).*

1.  **Edit Code:** Modify files in `js/` or `css/`.
2.  **Run Server:**
    ```bash
    npm run dev
    ```
3.  **Preview:** Open `http://localhost:3000` in your browser.
    *   *Note:* Changes appear instantly (Hot Reload). No build/sync required.

### Mode B: Mobile Simulation & Testing
*Use this when testing native features (Push Notifications, Safe Areas) or before a release.*

1.  **Edit Code:** Modify files.
2.  **Flash Changes (The Master Command):**
    ```bash
    npm run build:mobile
    ```
    *   **What happens:**
        1.  Runs `vite build` → Updates `dist/`.
        2.  Runs `npx cap sync` → Copies `dist/` to `ios/` & `android/`.
3.  **Open Native IDE:**
    *   **iOS:** `npm run open:ios` (Opens Xcode).
    *   **Android:** `npm run open:android` (Opens Android Studio).
4.  **Launch Simulator:**
    *   **In Xcode:** Click the **Play (▶)** button at the top left.
    *   **In Android Studio:** Click the **Run (▶)** button at the top right.

---

## 3. Command Reference & FAQ

### Quick Reference Table

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `npm run dev` | Fast web preview with hot-reload. |
| **Update Mobile Code** | `npm run build:mobile` | Compiles JS and updates native projects. **Run this after every code change.** |
| **Open Xcode** | `npm run open:ios` | Launches Xcode with your project. |
| **Open Android Studio** | `npm run open:android` | Launches Android Studio with your project. |

### FAQ

**Q: What is the difference between `npx cap open ios` and `npm run open:ios`?**
*   **`npx cap open ios`**: This is the raw Capacitor command. `npx` executes a binary from your `node_modules`. It tells Capacitor to find the installed Xcode application and open the `ios/` directory within it.
*   **`npm run open:ios`**: This is a **shortcut alias** we defined in your `package.json`. It simply runs `npx cap open ios`.
*   **Verdict:** They do exactly the same thing. We created the alias just to keep all our commands consistent (`npm run ...`).

**Q: Do I need to commit the `dist/` folder?**
*   **No.** It is a build artifact (like a `.o` file). We have added it to `.gitignore`.

**Q: Do I need to commit `ios/` and `android/`?**
*   **Yes.** These folders contain your project configuration (permissions, icons, signing config). Capacitor manages the *code* inside them, but you manage the *configuration*.

## 4. Local Debugging on Device (USB)

If your phone and computer are on different Wi-Fi networks (or you have router isolation), use this reliable USB method.

### 4.1 Setup (One-Time)
1.  Connect iPhone to Mac via USB.
2.  **Mac:** System Settings -> General -> Sharing.
3.  Enable **Internet Sharing** (Share from: Ethernet/Wi-Fi -> To: iPhone USB).
4.  **iPhone:** Turn **OFF** Wi-Fi. (Forces data over USB).
5.  **Verify:** Open Safari on iPhone and load `google.com`.

### 4.2 Run Backend
The backend must listen on all interfaces (`0.0.0.0`), not just localhost.
```bash
fastapi dev main.py --host 0.0.0.0 --port 8000
```

### 4.3 Configure App
Update `js/config.js` to point to your Mac's Bridge IP (usually `192.168.2.1`).
```javascript
backendUrl: Capacitor.isNativePlatform() ? 'http://192.168.2.1:8000' : ...
```

---

## 5. Asset Generation (Icons & Splash)

If you change `assets/EfficientTutor_logo.png`, regenerate the native assets:

```bash
# 1. Copy to standard name
cp assets/EfficientTutor_logo.png assets/logo.png

# 2. Generate
npx capacitor-assets generate --ios --android

# 3. Cleanup
rm assets/logo.png
```
*Note: This updates `ios/App/App/Assets.xcassets` and `android/app/src/main/res`.*


