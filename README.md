# EfficientTutor
## Introduction
This is a Tuition Management application. It's main purpose is to:
 - Register Student: Take in, subjects, amount per week, busy times.
 - Communicate with my "Personal Time Management" backend server which contains the MASTER ALGORITHM to take into account all studend time requirements, as well as all my time requirements to make the *perfect TimeTable* :D
 - Show Timetable for specific students.
 - Show logs of every session taken with details since begginning of year as well as summary.
 
## Upcoming Features
 - Notification center: notifiy when timetable change (matching student requirement ofcoarse), session start/end, HW posted
 - Re-schedule / cancel / add sessions!

## Development & Deployment

This project uses **Vanilla JavaScript** for logic and **Tailwind CSS** for styling, bundled by **Vite**. It supports deployment as a Web App (PWA) and a Native Mobile App (iOS/Android via Capacitor).

### Prerequisites
*   **Node.js** & **npm** (Required)
*   **Android Studio** (For Android development)
*   **Xcode** (For iOS development - Mac only)

### Local Development (Web)
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start Dev Server:**
    This command starts a local server with Hot Module Replacement (HMR). It automatically compiles Tailwind CSS and JavaScript.
    ```bash
    npm run dev
    ```
3.  **Open App:**
    The terminal will show the local URL (usually `http://localhost:3000`).

### Building for Production (Web)
To generate the final optimized files for deployment:
```bash
npm run build
```
This creates a `dist/` folder containing the minified HTML, CSS, and JS.

### Mobile Development (iOS & Android)
The mobile apps run the code generated in the `dist/` folder inside a native container.

1.  **Build & Sync:**
    Whenever you make changes to the web code, run this to build the web assets and update the native projects:
    ```bash
    npm run build:mobile
    ```
2.  **Run on Device/Emulator:**
    *   **Android:** `npm run open:android` (Opens Android Studio)
    *   **iOS:** `npm run open:ios` (Opens Xcode)

### Deployment (Render.com)
When deploying this as a **Static Site** on Render:

*   **Build Command:** `npm install && npm run build`
*   **Publish Directory:** `dist`

This ensures Render uses Vite to bundle the application correctly.

