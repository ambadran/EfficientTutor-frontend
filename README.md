# EfficientTutor

EfficientTutor is a comprehensive Tuition Management application designed to streamline scheduling, financial tracking, and communication between teachers, parents, and students.

The application leverages a sophisticated "Personal Time Management" backend algorithm to generate optimized timetables based on student requirements and teacher availability.

## 🚀 Key Features

- **Dynamic Timetable**: Automated scheduling that accounts for student busy times and academic requirements.
- **Financial Tracking**: Comprehensive logs for tuitions and payments, including monthly summaries and "Owed" status.
- **Student Management**: Detailed profiles for students, including subject enrollment, availability management, and credential generation.
- **Notes System**: Centralized repository for study notes, homework, and past papers.
- **Multi-Role Support**: Tailored experiences for Teachers, Parents, and Students.
- **Cross-Platform**: Fully functional as a Web Application and Native Mobile App (iOS & Android).

## 🛠 Architecture & Tech Stack

This project follows a "Vanilla JavaScript" philosophy for performance and simplicity, enhanced with modern build tools.

- **Frontend**: Vanilla JavaScript (ES6 Modules) with a Single Global State (`appState`).
- **Styling**: Tailwind CSS with Mobile Safe Area support.
- **Build Tool**: Vite for bundling and optimized asset delivery.
- **Mobile Wrapper**: Capacitor for native iOS and Android integration.
- **Backend**: Python/FastAPI (Centralized API layer in `js/api.js`).

## 💻 Development Workflow

### Prerequisites

- **Node.js** (v18+) & **npm**
- **Xcode** (for iOS development)
- **Android Studio** (for Android development)
- **CocoaPods** (for iOS dependency management)

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/ambadran/EfficientTutor.git
cd EfficientTutor-frontend

# Install dependencies
npm install
```

### 2. Local Development (Web)

For logic and UI development, use the Vite dev server for hot-reloading:

```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Testing on Local Network (e.g., Mobile Safari/Chrome)

To test the application on other devices (like a phone) connected to the same Wi-Fi network:

#### Step 1: Find your PC's Local IP Address
Run the following command on your host machine:
```bash
hostname -I
```
*Example Output: `192.168.1.8`*

#### Step 2: Configure Environment Variables
1.  **Frontend (`.env`):** Set `VITE_API_URL` to your PC's IP with the backend port:
    ```text
    VITE_API_URL=http://192.168.1.8:8000
    ```
2.  **Backend (`.env`):** Ensure the backend allows requests from your frontend's network URL to avoid CORS issues:
    ```text
    BACKEND_CORS_ORIGINS=["http://192.168.1.8:3000"]
    ```

#### Step 3: Run the Servers
1.  **Backend:** Host the FastAPI server on all interfaces:
    ```bash
    fastapi dev src/path/to/main.py --host 0.0.0.0 --port 8000
    ```
2.  **Frontend:** Run the Vite server with the `--host` flag:
    ```bash
    npm run dev -- --host
    ```

#### Step 4: Access the App
On your mobile device, open Safari or Chrome and navigate to:
`http://192.168.1.8:3000`

### 4. Mobile Development (iOS & Android)

The mobile apps serve the bundled assets from the `dist/` folder.

```bash
# Build the web assets and sync with native projects
npm run build:mobile

# Open in Native IDEs
npm run open:ios      # Opens Xcode
npm run open:android  # Opens Android Studio
```

*Note: After any code change, you must run `npm run build:mobile` before testing in the mobile simulator.*

## 📚 Documentation

For more detailed information, please refer to the documents in the `docs/` folder:

- [Mobile Workflow](./docs/MOBILE_WORKFLOW.md): Detailed guide on the Vite + Capacitor build system.
- [iOS Setup Log](./docs/IOS_BUILD_SETUP_LOG.md): Steps for configuring the iOS development environment.
- [Layout Fixes](./docs/LAYOUT_FIX_REPORT.md): Information regarding UI adjustments for mobile.

## 🌐 Environment Configuration

The application automatically detects its environment in `js/config.js`:
- **Local Web**: Connects to `http://127.0.0.1:8000`
- **Native Mobile / Production**: Connects to the production backend on Render.com.

---
*Version: 0.2*

