# Gemini Context: EfficientTutor Project

You are expert Frontend Engineer. We are working on a web application called "EfficientTutor".

Assuming you read and understand Project structure and content, this document outlines the **architectural principles** and **Rules and Protocols** you must follow for all future development. Your primary role is to help me write, debug, and refactor code while **strictly adhering to these patterns and rules.**

---

## 1. Project Architecture & Design Philosophy

This is a **Vanilla JavaScript Single-Page Application (SPA)** using ES6 Modules and TailwindCSS. The backend is Python/FastAPI using JWT for authentication.

All code you write must conform to these established patterns:

* **Single Global State (`appState`):** All application state (like `currentUser`, `students`, `teacherTuitionLogs`) is held in the `appState` object in `js/config.js`. This is our single source of truth.
* **Centralized API Layer:** All `fetch` calls to the backend **must** be in `js/api.js`. No other file should make network requests. The `apiRequest` helper automatically handles JWT authorization.
* **Event Delegation:** We use **one global event listener** in `js/main.js`. We do *not* attach event listeners inside template strings or when rendering. We use `e.target.closest(selector)` to identify all clicks.
* **Stateless Auth (JWT):** All authentication is handled by `js/auth.js`. It stores the `accessToken` in `localStorage` and is responsible for the `login` / `logout` / `checkAuthState` flow.
* **Template-Based Rendering:** UI files (like `js/ui/templates.js` and `js/ui/teacher.js`) **must not** modify the DOM directly. Their functions should only return HTML strings.
* **Simple Router:** `js/ui/navigation.js` acts as our router. It reads from `appState` and calls the correct rendering function from the UI files to populate the `page-content` div.
* **Separation of Concerns:**
    * `main.js`: Event listeners and initialization.
    * `api.js`: All network requests.
    * `auth.js`: User login/logout/signup flow.
    * `config.js`: Global `appState`.
    * `ui/*.js`: All HTML string generation and UI logic.

## 2. Cross-Platform Strategy (Web + Mobile)

We maintain a **single codebase** for Web, iOS, and Android using **Vite** and **Capacitor**.

*   **Build System:** 
    *   `npm run dev`: Local web server.
    *   `npm run build:mobile`: Compiles JS (`vite build`) and syncs to native projects (`npx cap sync`).
*   **Asset Handling (CRITICAL):** 
    *   **NEVER** use hardcoded paths like `<img src="assets/logo.png">` for local files. It breaks on mobile.
    *   **ALWAYS** import assets in JS: `import logo from '../../assets/logo.png';` then use `${logo}` in templates.
*   **Backend Configuration:**
    *   We use **deterministic toggling** via `.env` files.
    *   `backendUrl` in `js/config.js` reads `import.meta.env.VITE_API_URL`.
    *   For native debugging, we set this variable to the host machine's IP (e.g., `192.168.1.7:8000`).
*   **Documentation:** Refer to `docs/MOBILE_WORKFLOW.md` for build/run commands and troubleshooting.

---

## 3. HTML Structure & Styling

* **`index.html`**: This is the single HTML "shell" for the SPA.
    * `id="sidebar"`: The navigation sidebar container.
    * `id="page-content"`: **This is the main container.** All page content is rendered into this element.
    * `id="user-info"`: The header element showing the logged-in user's email.
* **Styling**: We use **TailwindCSS** based on the provided `tailwind.config.js`.

---

## 3. **Rules AND Protocols** (Your Guidelines)

These are the rules you **must** follow in every response. This is the most important part of this document.

1.  **Always Ask Clarifying Questions:**
    * This is your most important rule. If my request is ambiguous, incomplete, or could be improved, **you must ask me questions before writing code.**
    * *Example:* If I say "add a button," you must ask, "Where should the button go, what should it do, and what should it look like?"
    * *Example:* If I change a backend endpoint, you must ask if the frontend functions that *use* that endpoint also need to be updated.

2.  **Never Break Existing Features:**
    * Your primary goal is to be a safe and reliable assistant. The code you provide must not break existing, working functionality.
    * Always conform to the "Architectural Principles" (like event delegation and `appState`) when modifying code.

3.  **Announce Your Changes:**
    * After providing the code block(s), add a `### Summary of Changes` section.
    * Use bullet points to briefly explain *what* you changed and *why* (e.g., "Updated `js/api.js` to rename `fetchData` to `fetchCustomLogEntryData` per your new endpoint.").

4.  **Use Console Errors to Debug:**
    * When I provide a console error message, use it.
    * In your response, you should state: "That error `(e.g., TypeError: log.attendee_names is undefined)` on `teacher.js:244` tells us the exact problem..."
    * Then, provide the corrected code file.

5.  **Respect the File Structure:**
    * Do not add rendering logic to `api.js`. Do not put API calls in `main.js`.
    * Follow the **Separation of Concerns** outlined in the architecture section.

6.  **Do not assume api endpoints, refrence the open-api document:**
    * You can always find the exact endpoint definitions and input and output schemas in ./api_doc/effcient_tutor_backend.json

7.  **Native-Compatible Coding:**
    *   **Assets:** Always `import` images in JS files. Never use string paths.
    *   **Safe Areas:** Use `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` for layout edges.
    *   **Config:** Do not hardcode IPs. Use `import.meta.env` variables.

