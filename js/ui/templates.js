import { appState } from '../config.js';
import { fetchLogs, fetchNotes, fetchMeetingLinks } from '../api.js';
import { showModal, closeModal } from './modals.js';
import { renderPage } from './navigation.js';

// --- NEW: Sidebar Rendering ---
export function renderSidebar(role) {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    let navLinks = '';
    if (role === 'parent') {
        navLinks = `
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-history w-6 mr-3"></i> Logs</a>
            <a href="#" id="nav-student-info" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-graduate w-6 mr-3"></i> Student Info</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    } else if (role === 'student') {
        navLinks = `
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-meeting-links" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-video w-6 mr-3"></i> Meeting Links</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    }

    navContainer.innerHTML = navLinks;
    if (role) {
        navContainer.classList.remove('hidden');
    } else {
        navContainer.classList.add('hidden');
    }
}

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
    let studentListHTML = appState.students.map(student => `
        <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
                <p class="font-semibold text-lg">${student.firstName} ${student.lastName}</p>
                <p class="text-sm text-gray-400">Grade: ${student.grade}</p>
            </div>
            <div class="space-x-2">
                <button title="View Credentials" class="view-creds-btn p-2 bg-blue-600 hover:bg-blue-500 rounded-md" data-id="${student.id}"><i class="fas fa-key"></i></button>
                <button title="Edit Student" class="edit-student-btn p-2 bg-gray-600 hover:bg-gray-500 rounded-md" data-id="${student.id}"><i class="fas fa-edit"></i></button>
                <button title="Delete Student" class="delete-student-btn p-2 bg-red-600 hover:bg-red-500 rounded-md" data-id="${student.id}"><i class="fas fa-trash"></i></button>
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

// --- NEW: Student Page Templates ---

export async function renderNotesPage() {
    try {
        const notes = await fetchNotes(appState.currentUser.id);
        if (notes.length === 0) {
            return `<div class="text-center p-8 text-gray-400">No notes have been added for you yet.</div>`;
        }

        const notesHTML = notes.map(note => `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h3 class="font-semibold text-lg text-indigo-300">${note.name}</h3>
                <p class="text-gray-400 my-2">${note.description}</p>
                <a href="${note.url}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm text-blue-400 hover:text-blue-300">
                    Open PDF <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        `).join('');

        return `<div class="space-y-4">${notesHTML}</div>`;
    } catch (error) {
        return `<div class="text-center text-red-400 p-8">Error loading notes: ${error.message}</div>`;
    }
}

// THIS FUNCTION IS IMPROVED
export async function renderMeetingLinksPage() {
    try {
        const links = await fetchMeetingLinks(appState.currentUser.id);
        if (links.length === 0) {
            return `<div class="text-center p-8 text-gray-400">You have no scheduled tuitions with meeting links yet.</div>`;
        }

        // Helper function to format ISO dates into a readable string
        const formatScheduleTime = (startTime, endTime) => {
            if (!startTime || startTime === '--') {
                return 'Not Scheduled';
            }
            try {
                const startDate = new Date(startTime);
                const endDate = new Date(endTime);
                
                const dayOptions = { weekday: 'long' };
                const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };

                const dayString = new Intl.DateTimeFormat('en-US', dayOptions).format(startDate);
                const startTimeString = new Intl.DateTimeFormat('en-US', timeOptions).format(startDate);
                const endTimeString = new Intl.DateTimeFormat('en-US', timeOptions).format(endDate);

                return `${dayString} at ${startTimeString} - ${endTimeString}`;
            } catch (e) {
                // Fallback for any unexpected format
                return `${startTime} - ${endTime}`;
            }
        };

        const linksHTML = links.map(link => `
            <div class="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 class="font-semibold text-lg">${link.subject}</h3>
                    <p class="text-sm text-gray-400">${formatScheduleTime(link.start_time, link.end_time)}</p>
                </div>
                ${link.meeting_link
                    ? `<a href="${link.meeting_link}" target="_blank" rel="noopener noreferrer" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                           Join Meeting <i class="fas fa-video ml-2"></i>
                       </a>`
                    : `<span class="px-4 py-2 bg-gray-600 text-gray-400 rounded-md text-sm">No Link Available</span>`
                }
            </div>
        `).join('');

        return `<div class="space-y-4">${linksHTML}</div>`;
    } catch (error) {
        return `<div class="text-center text-red-400 p-8">Error loading meeting links: ${error.message}</div>`;
    }
}
