/* This file is the main router for your frontend. Its primary job is 
 * to decide which page to render based on the application's current 
 * state (appState.currentPage). It holds the HTML templates for each 
 * of the main pages and handles UI updates like showing/hiding the sidebar.
 */
import { appState, navigateTo } from './main.js';
import { handleLogin, handleSignup } from './auth.js';
import { api } from './api.js';
import { renderTimetableComponent } from './components/timetable.js';

const app = document.getElementById('app');

export async function showPage(pageName) {
    // ... (This function remains the same as your latest version)
    if (!app) return;
    
    if (['timetable', 'students', 'logs'].includes(pageName)) {
        app.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="loader"></div></div>`;
    }

    try {
        if (['timetable', 'students', 'logs'].includes(pageName) && appState.currentUser) {
            const { success, data, error } = await api.getStudents(appState.currentUser.id);
            if (!success) {
                throw new Error(error || 'Could not load student data.');
            }
            appState.students = data;
        }

        appState.currentPage = pageName;
        switch (pageName) {
            case 'login': renderAuthPage(); break;
            case 'timetable': renderTimetablePage(); break;
            case 'students': renderStudentsPage(); break;
            case 'logs': renderLogsPage(); break;
            case 'settings': renderSettingsPage(); break;
            default: renderAuthPage();
        }
    } catch (error) {
        console.error("Failed to load page:", error);
        app.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h2 class="text-2xl font-bold text-white mb-2">Failed to Load Page</h2>
                <p class="text-gray-400">${error.message}</p>
                <button onclick="location.reload()" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                    Try Again
                </button>
            </div>
        `;
    }
}

// ... (renderAuthPage, renderMainAppShell, renderSidebar, renderPageContent are unchanged) ...
function renderAuthPage() {
    const isLogin = appState.authMode === 'login';

    const buttonText = isLogin ? 'Login' : 'Sign Up';
    const linkText = isLogin ? "Don't have an account?" : 'Already have an account?';
    const linkActionText = isLogin ? 'Sign Up' : 'Login';
    const linkId = isLogin ? 'signup-link' : 'login-link';

    app.innerHTML = `
        <div class="w-full min-h-screen bg-gray-900 flex items-center justify-center">
            <div class="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
                <div class="flex items-center justify-center mb-6">
                    <img src="assets/EfficientTutor_logo.png" alt="Logo" class="h-12 w-12 mr-3">
                    <h1 class="text-3xl font-bold text-white">EfficientTutor</h1>
                </div>
                <form id="auth-form">
                    <div class="mb-4">
                        <input type="email" name="email" placeholder="Email" required class="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                    </div>
                    <div class="mb-6">
                        <input type="password" name="password" placeholder="Password" required class="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">${buttonText}</button>
                </form>
                <p class="text-center text-gray-400 mt-6">
                    ${linkText} <a href="#" id="${linkId}" class="text-blue-400 hover:underline">${linkActionText}</a>
                </p>
            </div>
        </div>
    `;
}

function renderMainAppShell() {
    app.innerHTML = `
        <div class="flex h-screen bg-gray-900 text-white">
            ${renderSidebar()}
            <main id="main-content" class="flex-1 p-4 md:p-8 flex flex-col min-w-0">
            </main>
        </div>
    `;
}

function renderSidebar() {
     return `
        <aside class="w-64 bg-gray-800 p-6 flex-shrink-0 flex flex-col">
            <div class="flex flex-col items-center justify-center mb-10 text-center">
                <img src="assets/EfficientTutor_logo.png" alt="Logo" class="h-16 w-16 mb-2">
                <h1 class="text-2xl font-bold text-white">EfficientTutor</h1>
            </div>
            <nav class="flex-1 space-y-2">
                <a href="#" class="nav-link flex items-center p-3 rounded-lg hover:bg-gray-700" data-page="timetable"><i class="fas fa-calendar-alt w-6 mr-3"></i>Timetable</a>
                <a href="#" class="nav-link flex items-center p-3 rounded-lg hover:bg-gray-700" data-page="students"><i class="fas fa-user-graduate w-6 mr-3"></i>Student Info</a>
                <a href="#" class="nav-link flex items-center p-3 rounded-lg hover:bg-gray-700" data-page="logs"><i class="fas fa-history w-6 mr-3"></i>Logs</a>
                <a href="#" class="nav-link flex items-center p-3 rounded-lg hover:bg-gray-700" data-page="settings"><i class="fas fa-cog w-6 mr-3"></i>Settings</a>
            </nav>
            <div>
                <button id="logout-btn" class="flex items-center p-3 w-full rounded-lg text-red-400 hover:bg-red-500 hover:text-white">
                    <i class="fas fa-sign-out-alt w-6 mr-3"></i>Logout
                </button>
            </div>
        </aside>
    `;
}

function renderPageContent(content) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.innerHTML = content;
}


/**
 * THE FIX: This function has been rewritten with a cleaner layout structure
 * to ensure the timetable is full-width and the header is correctly ordered.
 */
async function renderTimetablePage() {
    renderMainAppShell();

    // --- State Initialization ---
    if (!appState.selectedStudentIdForTimetable && appState.students?.length > 0) {
        appState.selectedStudentIdForTimetable = appState.students[0].id;
    }
    if (appState.currentTimetableDayIndex === null) {
        const todayJsIndex = new Date().getDay();
        appState.currentTimetableDayIndex = (todayJsIndex + 1) % 7;
    }

    const selectedStudent = appState.students.find(s => s.id === appState.selectedStudentIdForTimetable);
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const currentDayName = dayNames[appState.currentTimetableDayIndex];

    // --- Dynamic Header Content ---
    let studentSelectorHTML = '';
    if (appState.students && appState.students.length > 1) {
        studentSelectorHTML = `
            <div class="w-full md:w-auto md:max-w-xs">
                <select id="student-selector" class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    ${appState.students.map(s => `<option value="${s.id}" ${s.id === selectedStudent.id ? 'selected' : ''}>${s.firstName} ${s.lastName}'s Timetable</option>`).join('')}
                </select>
            </div>
        `;
    } else if (selectedStudent) {
        studentSelectorHTML = `<h2 class="text-2xl font-bold">${selectedStudent.firstName}'s Timetable</h2>`;
    } else {
        studentSelectorHTML = `<h2 class="text-2xl font-bold">Timetable</h2>`;
    }

    // --- Main Page Structure ---
    const content = `
        <!-- Header -->
        <div class="flex flex-col items-center mb-4 gap-4 flex-shrink-0">
            ${studentSelectorHTML}
            <div class="flex items-center justify-center gap-4 w-full">
                <button class="day-nav-btn p-2 rounded-full hover:bg-gray-700" data-direction="-1"><i class="fas fa-chevron-left"></i></button>
                <h3 class="text-xl font-bold text-white text-center w-40">${currentDayName}</h3>
                <button class="day-nav-btn p-2 rounded-full hover:bg-gray-700" data-direction="1"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>

        <!-- Timetable Grid -->
        <div id="timetable-grid" class="bg-gray-800 p-4 rounded-lg flex-grow min-h-0">
            <div class="w-full h-full flex items-center justify-center"><div class="loader"></div></div>
        </div>
    `;
    renderPageContent(content);

    // --- Data Fetching and Rendering ---
    const timetableGrid = document.getElementById('timetable-grid');
    if (!selectedStudent) {
        timetableGrid.innerHTML = '<p class="text-gray-500 text-center py-8">No students registered. Please add a student first.</p>';
        return;
    }

    const { success, data, error } = await api.getTimetable(selectedStudent.id);
    if (success) {
        renderTimetableComponent(timetableGrid, new Date(), data.tuitions, selectedStudent.availability, appState.currentTimetableDayIndex);
    } else {
        timetableGrid.innerHTML = `<p class="text-red-500">Could not load timetable: ${error}</p>`;
    }

    // --- Event Listeners ---
    // Use the main content area for delegation to ensure listeners are always active
    const mainContent = document.getElementById('main-content');

    mainContent.addEventListener('change', (e) => {
        if (e.target.id === 'student-selector') {
            appState.selectedStudentIdForTimetable = e.target.value;
            const todayJsIndex = new Date().getDay();
            appState.currentTimetableDayIndex = (todayJsIndex + 1) % 7;
            renderTimetablePage();
        }
    });

    mainContent.addEventListener('click', (e) => {
        if (e.target.closest('.day-nav-btn')) {
            const direction = parseInt(e.target.closest('.day-nav-btn').dataset.direction, 10);
            appState.currentTimetableDayIndex = (appState.currentTimetableDayIndex + direction + 7) % 7;
            renderTimetablePage();
        }
    });
}


// ... (renderStudentsPage, renderLogsPage, renderSettingsPage are unchanged) ...
function renderStudentsPage() {
    renderMainAppShell();
    const studentListHTML = appState.students && appState.students.length > 0 ? appState.students.map(student => `
        <li class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
            <div>
                <p class="font-bold text-white text-lg">${student.firstName} ${student.lastName}</p>
                <p class="text-sm text-gray-400">Grade ${student.grade}</p>
            </div>
            <div class="flex items-center gap-4">
                 <button class="edit-student-btn text-gray-400 hover:text-blue-400" data-student-id="${student.id}"><i class="fas fa-pencil-alt"></i></button>
                 <button class="delete-student-btn text-gray-400 hover:text-red-500" data-student-id="${student.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        </li>
    `).join('') : '<p class="text-gray-500 text-center py-8">No students have been registered yet.</p>';

    const content = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold">Student Information</h2>
            <button id="add-student-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                <i class="fas fa-plus mr-2"></i>Add New Student
            </button>
        </div>
        <ul class="space-y-4">${studentListHTML}</ul>
    `;
    renderPageContent(content);
}

async function renderLogsPage() {
    renderMainAppShell();
    const logsContentContainer = document.createElement('div');
    logsContentContainer.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="loader"></div></div>`;
    renderPageContent(logsContentContainer.innerHTML);

    const { success, data, error } = await api.getLogs(appState.currentUser.id);
    if (!success) {
        renderPageContent(`<p class="text-red-500">Error loading logs: ${error}</p>`);
        return;
    }
    
    const { summary, detailed_logs } = data;
    const summaryHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-red-500/20 p-4 rounded-lg text-center">
                <p class="text-4xl font-bold text-red-400">${summary.unpaid_count}</p>
                <p class="text-red-300">Unpaid Lessons</p>
            </div>
            <div class="bg-green-500/20 p-4 rounded-lg text-center">
                <p class="text-4xl font-bold text-green-400">${summary.paid_count}</p>
                <p class="text-green-300">Paid Lessons</p>
            </div>
            <div class="bg-yellow-500/20 p-4 rounded-lg text-center">
                <p class="text-4xl font-bold text-yellow-400">$${summary.total_due.toFixed(2)}</p>
                <p class="text-yellow-300">Total Due</p>
            </div>
        </div>
    `;

    const logsHTML = detailed_logs.map(log => `
        <tr class="border-b border-gray-700">
            <td class="py-3 px-4">${log.date}</td>
            <td class="py-3 px-4">${log.subject}</td>
            <td class="py-3 px-4">${log.attendees.join(', ')}</td>
            <td class="py-3 px-4">${log.time_start} - ${log.time_end}</td>
            <td class="py-3 px-4 text-center ${log.status === 'Paid' ? 'text-green-400' : 'text-red-400'}">${log.status}</td>
        </tr>
    `).join('');

    const content = `
        <h2 class="text-3xl font-bold mb-6">Logs & Summary</h2>
        ${summaryHTML}
        <div class="bg-gray-800 rounded-lg overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-gray-700">
                    <tr>
                        <th class="py-3 px-4 font-semibold">Date</th>
                        <th class="py-3 px-4 font-semibold">Subject</th>
                        <th class="py-3 px-4 font-semibold">Attendees</th>
                        <th class="py-3 px-4 font-semibold">Time</th>
                        <th class="py-3 px-4 font-semibold text-center">Status</th>
                    </tr>
                </thead>
                <tbody>${logsHTML}</tbody>
            </table>
        </div>
    `;
    renderPageContent(content);
}


function renderSettingsPage() {
    renderMainAppShell();
    const content = `<h2 class="text-3xl font-bold">Settings</h2><p>Settings content goes here...</p>`;
    renderPageContent(content);
}

// Alias for backwards compatibility
export const renderPage = showPage;


