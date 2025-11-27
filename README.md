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

This project uses **Vanilla JavaScript** for logic and **Tailwind CSS** for styling. 

### Prerequisites
*   **Node.js** & **npm** (Required for building the CSS)

### Local Development Setup
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run CSS Watcher:**
    In a separate terminal, run this command to automatically rebuild CSS when you change files:
    ```bash
    npm run watch:css
    ```
3.  **Serve the App:**
    Open `index.html` in your browser or use a simple server like Live Server.

### Building for Production
To generate the final minified CSS file manually:
```bash
npm run build:css
```

### Deployment (Render.com)
When deploying this as a **Static Site** on Render, use the following settings to ensure Tailwind is built correctly:

*   **Build Command:** `npm install && npm run build:css`
*   **Publish Directory:** `.` (Keep default/root)

This ensures Render installs Tailwind and compiles your `css/input.css` into the `css/style.css` required by the application.

