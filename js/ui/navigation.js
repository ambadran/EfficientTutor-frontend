import { appState } from '../config.js';
import { toggleSidebar } from './layout.js';
import { 
    renderLoginPage, 
    renderStudentInfoPage, 
    renderLogsPage, 
    renderSettingsPage,
    renderNotesPage,
    renderMeetingLinksPage,
    renderTeacherNotesPage,
    renderTeacherTuitionsPage,
    renderTeacherTimetablesPage,
    renderTeacherStudentInfoPage
} from './templates.js';
import { renderTimetablePage } from './timetable.js';
import { displayGlobalError } from './layout.js';
import { renderTeacherTuitionLogsPage, renderTeacherPaymentLogsPage } from './teacher.js';

const pageContent = document.getElementById('page-content');
const pageTitle = document.getElementById('page-title');

export function navigateTo(pageId) {
    appState.currentPage = pageId;
    if (appState.isSidebarOpen) {
        toggleSidebar();
    }
    renderPage();
}

export async function renderPage() {
    pageContent.innerHTML = `<div class="flex justify-center items-center h-full"><div class="loader"></div></div>`;
    try {
        let content = '';
        switch (appState.currentPage) {
            case 'login':
                pageTitle.textContent = 'Login / Sign Up';
                content = renderLoginPage();
                break;
            case 'timetable':
                pageTitle.textContent = 'Timetable';
                content = await renderTimetablePage();
                break;
            case 'logs':
                pageTitle.textContent = 'Logs';
                content = await renderLogsPage();
                break;

            case 'student-info':
                pageTitle.textContent = 'Student Info';
                content = renderStudentInfoPage();
                break;

            case 'settings':
                pageTitle.textContent = 'Settings';
                content = renderSettingsPage();
                break;
            // NEW Student Pages
            case 'notes':
                pageTitle.textContent = 'Notes';
                content = await renderNotesPage();
                break;
            case 'meeting-links':
                pageTitle.textContent = 'Meeting Links';
                content = await renderMeetingLinksPage();
                break;

            // NEW: Teacher pages
            case 'teacher-tuition-logs':
                pageTitle.textContent = 'Tuition Logs';
                content = await renderTeacherTuitionLogsPage(); // Use the new function
                break; 
            case 'teacher-payment-logs':
                pageTitle.textContent = 'Payment Logs';
                content = await renderTeacherPaymentLogsPage();
                break;
            case 'teacher-notes':
                pageTitle.textContent = 'Notes';
                content = renderTeacherNotesPage();
                break;
            case 'teacher-tuitions':
                pageTitle.textContent = 'Tuitions';
                content = await renderTeacherTuitionsPage();
                break;
            case 'teacher-timetables':
                pageTitle.textContent = 'Timetables';
                content = renderTeacherTimetablesPage();
                break;
            case 'teacher-student-info':
                pageTitle.textContent = 'Student Info';
                content = renderTeacherStudentInfoPage();
                break;

            case 'teacher-payment-logs':
                pageTitle.textContent = 'Payment Logs';
                content = await renderTeacherPaymentLogsPage(); // Use the new function
                break;

            default:
                pageTitle.textContent = 'Not Found';
                content = '<p>Page not found.</p>';
        }
        pageContent.innerHTML = content;
    } catch (error) {
        console.error("Failed to render page:", error);
        displayGlobalError(`Error loading page: ${error.message}`);
    }
}
