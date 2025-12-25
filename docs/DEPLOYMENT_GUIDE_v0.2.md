# EfficientTutor v0.2 Deployment Guide

This guide details the complete workflow for promoting the `v0.2` development branch to production (`main`) and configuring the hosting environment on Render.com.

## Prerequisites

*   You have the [Render.com](https://dashboard.render.com/) dashboard open.
*   You have a terminal open in the project root (`EfficientTutor-frontend/`).
*   Your backend is already deployed on Render (e.g., `https://personal-time-manager.onrender.com`).

---

## Part 1: Git Merge Workflow (Promoting v0.2 to Main)

We use a **Fast-Forward Merge** to safely update the production branch (`main`) with your latest work from `v0.2`. This method avoids rewrite history risks and ensures a clean linear history.

1.  **Switch to the production branch:**
    ```bash
    git checkout main
    ```

2.  **Ensure local main is up-to-date:**
    ```bash
    git pull origin main
    ```

3.  **Merge v0.2 changes into main:**
    ```bash
    git merge v0.2
    ```
    *Note: You should see a "Fast-forward" message indicating a clean update with no conflicts.*

4.  **Deploy to GitHub (Triggers Render):**
    ```bash
    git push origin main
    ```

5.  **Return to development branch:**
    ```bash
    git checkout v0.2
    ```

---

## Part 2: Render.com Setup (Static Site)

Since this project uses **Vite**, we deploy it as a high-performance **Static Site**.

1.  **Create Service:**
    *   Log in to Render Dashboard.
    *   Click **New +** -> **Static Site**.
    *   Connect your GitHub repository: `EfficientTutor`.

2.  **Configure Build Settings:**
    Enter the following values exactly:

    *   **Name:** `efficient-tutor-frontend`
    *   **Branch:** `main` (This ensures production is always stable)
    *   **Root Directory:** `.` (Leave as default/dot since `package.json` is in the repo root)
    *   **Build Command:** `npm install && npm run build`
    *   **Publish Directory:** `dist`

3.  **Configure Environment Variables:**
    Scroll down to "Environment Variables" and add:
    *   **Key:** `VITE_API_URL`
    *   **Value:** `https://personal-time-manager.onrender.com`
    *(Replace with your actual backend Service URL if different)*

4.  **Configure SPA Routing (Critical for Navigation):**
    *   After creating the site, go to the **Redirects/Rewrites** tab in the service dashboard.
    *   Add a new Rewrite Rule:
        *   **Source:** `/*`
        *   **Destination:** `/index.html`
        *   **Action:** `Rewrite`
    *   *Why?* This ensures that when a user refreshes a page like `/timetable`, the server sends the main index file so JavaScript can handle the routing, instead of returning a 404 error.

---

## Part 3: Backend CORS Configuration

Your Frontend will now be hosted at a new URL (e.g., `https://efficient-tutor-frontend.onrender.com`). The Backend must explicitly allow this URL to make requests.

1.  **Copy your Frontend URL:**
    *   From the Render dashboard, copy the URL of your new Static Site (e.g., `https://efficient-tutor-frontend.onrender.com`).

2.  **Update Backend Service:**
    *   Navigate to your **Python Backend Service** on Render.
    *   Go to **Environment**.
    *   Find or Add the `BACKEND_CORS_ORIGINS` variable.
    *   Update it to include your new frontend URL. It should look like a JSON list string:
        ```text
        ["http://localhost:3000", "https://efficient-tutor-frontend.onrender.com"]
        ```
    *   **Save Changes.** Render will automatically restart the backend to apply the new CORS rules.

---

## Part 4: Verification

1.  Wait for both the Frontend Build and Backend Restart to finish on Render.
2.  Open your new Frontend URL in a browser.
3.  **Test:**
    *   **Login:** Try logging in (verifies API connection + CORS).
    *   **Navigation:** Go to the "Timetable" page and refresh the browser (verifies Rewrite Rules).
    *   **Visuals:** Ensure icons and styles load (verifies Asset paths).

You are now fully deployed! 🚀
