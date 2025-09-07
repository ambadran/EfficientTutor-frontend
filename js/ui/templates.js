import { appState } from '../config.js';
import { fetchLogs } from '../api.js';
import { showModal, closeModal } from './modals.js';
import { renderPage } from './navigation.js';

export function renderLoginPage() {
    return `
        <div class="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl shadow-lg">
            <img src="assets/EfficientTutor_logo.png" alt="EfficientTutor Logo" class="mx-auto h-16 w-auto mb-4">
            <h3 class="text-2xl font-bold text-center mb-6">Welcome to EfficientTutor</h3>
            <form id="login-form" class="space-y-4">
                <input type="email" id="email" placeholder="Email" required class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                <input type="password" id="password" placeholder="Password" required class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                
                <div id="auth-feedback" class="text-center min-h-[1.5rem]"></div>

                <div class="flex space-x-4">
                    <button type="submit" id="login-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">Login</button>
                    <button type="button" id="signup-btn" class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-md transition duration-300">Sign Up</button>
                </div>
            </form>
        </div>`;
}

// ... rest of the file is unchanged
export function confirmDeleteStudent(student, onDeleteCallback) {
    const footer = `
        <div class="flex justify-end space-x-4">
            <button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button>
            <button id="modal-confirm-delete-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Delete</button>
        </div>`;
    // Reads from student.firstName
    showModal('Confirm Deletion', `<p>Are you sure you want to delete ${student.firstName}?</p>`, footer, (modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target.closest('#modal-confirm-delete-btn')) {
                onDeleteCallback(student.id);
                closeModal();
            }
            if (e.target.closest('#modal-cancel-btn')) {
                closeModal();
            }
        });
    });
}

export function renderStudentInfoPage() {
    // Reads from student.firstName, student.lastName, and student.grade
    let studentListHTML = appState.students.map(student => `
        <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
                <p class="font-semibold text-lg">${student.firstName} ${student.lastName}</p>
                <p class="text-sm text-gray-400">Grade: ${student.grade}</p>
            </div>
            <div class="space-x-2">
                <button class="edit-student-btn p-2 bg-gray-600 hover:bg-gray-500 rounded-md" data-id="${student.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-student-btn p-2 bg-red-600 hover:bg-red-500 rounded-md" data-id="${student.id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    
    if (appState.students.length === 0) {
        studentListHTML = `<p class="text-center text-gray-400 py-8">No students registered yet. Add one to get started!</p>`;
    }

    return `
        <div class="space-y-4">${studentListHTML}</div>
        <button id="add-new-student-btn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center">
            <i class="fas fa-plus mr-2"></i> Add New Student
        </button>`;
}

export async function renderLogsPage() {
    if (!appState.currentStudent) return `<div class="text-center p-8 text-gray-400">Select a student to view logs.</div>`;
    
    try {
        const logData = await fetchLogs(appState.currentStudent.id);
        const { summary, detailed_logs } = logData;
        
        const logsHTML = detailed_logs.map(log => {
            const attendees = log.attendees || [];
            return `
                <div class="bg-gray-800 p-4 rounded-lg grid grid-cols-3 md:grid-cols-4 gap-4 items-center">
                    <div>
                        <p class="font-semibold">${log.subject}</p>
                        <p class="text-sm text-indigo-300">${attendees.join(', ')}</p>
                    </div>
                    <div class="text-sm text-gray-400 text-center">
                        <p>${log.date}</p>
                        <p>${log.time_start} - ${log.time_end}</p>
                    </div>
                    <div class="text-center">${log.duration}</div>
                    <div class="text-center"><span class="px-3 py-1 rounded-full text-sm font-semibold ${log.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${log.status}</span></div>
                </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-xl font-semibold mb-4">Summary</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-red-500">${summary.unpaid_count}</p><p class="text-gray-400">Lessons Unpaid</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-green-500">${summary.paid_count}</p><p class="text-gray-400">Lessons Paid</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-yellow-400">$${summary.total_due.toFixed(2)}</p><p class="text-gray-400">Total Amount Due</p></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-xl font-semibold mb-4">Detailed Logs</h3>
                    <div class="space-y-2">${logsHTML}</div>
                </div>
            </div>`;
    } catch (error) {
        console.error("Error fetching logs:", error);
        return `<div class="text-center text-red-400 p-8">Error loading logs: ${error.message}</div>`;
    }
}

export function renderSettingsPage() {
    const isDark = document.documentElement.classList.contains('dark');
    return `
        <div class="max-w-2xl mx-auto space-y-6">
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">Appearance</h3>
                <div class="flex items-center justify-between">
                    <span>Theme</span>
                    <button id="theme-toggle-btn" class="px-4 py-2 rounded-md font-semibold ${isDark ? 'bg-gray-700' : 'bg-gray-300 text-gray-800'}">
                        ${isDark ? '<i class="fas fa-moon mr-2"></i>Dark' : '<i class="fas fa-sun mr-2"></i>Light'}
                    </button>
                </div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">About</h3>
                <p class="text-gray-400">EfficientTutor v1.0.0</p>
            </div>
        </div>`;
}
