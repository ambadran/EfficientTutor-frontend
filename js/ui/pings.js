import { appState } from '../config.js';
import { pingUser } from '../api.js';
import { showModal, closeModal, showLoadingOverlay, hideStatusOverlay, showStatusMessage } from './modals.js';

/**
 * Shows the Ping/Notification Modal for a specific tuition.
 * @param {object} tuition - The tuition object.
 * @param {object} timeContext - { start_time, end_time } for validity checks.
 */
export function showPingModal(tuition, timeContext = {}) {
    const role = appState.currentUser.role;
    let body = '';
    let targets = [];
    let isTimeValid = true;

    // --- Logic Per Role ---

    if (role === 'teacher') {
        // Teacher can ping:
        // 1. Placeholder: Whole Class / Students Only
        // 2. Specific User (derived from charges)
        
        const students = [];
        const parents = [];

        if (tuition.charges) {
            tuition.charges.forEach(charge => {
                if (charge.student) {
                    students.push({ 
                        id: charge.student.id, 
                        name: `${charge.student.first_name} ${charge.student.last_name}`, 
                        type: 'Student' 
                    });
                }
                if (charge.parent) {
                    parents.push({ 
                        id: charge.parent.id, 
                        name: `${charge.parent.first_name} ${charge.parent.last_name}`, 
                        type: 'Parent' 
                    });
                }
            });
        }

        // Deduplicate
        const uniqueUsers = new Map();
        [...students, ...parents].forEach(u => uniqueUsers.set(u.id, u));
        targets = Array.from(uniqueUsers.values());

        const targetOptions = targets.map(t => `<option value="${t.id}">${t.name} (${t.type})</option>`).join('');

        body = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-400">Recipient</label>
                    <select id="ping-recipient" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled selected>-- Select Recipient --</option>
                        <option value="topic_all" disabled>Whole Class (Parents & Students) - Coming Soon</option>
                        <option value="topic_students" disabled>Students Only - Coming Soon</option>
                        <optgroup label="Specific People">
                            ${targetOptions}
                        </optgroup>
                    </select>
                </div>
                ${renderMessageInputs()}
            </div>
        `;

    } else if (role === 'parent') {
        // Parent can ping:
        // 1. Teacher (if id exists)
        // 2. Their own children (appState.students)
        
        if (tuition.teacher_id) {
            targets.push({ id: tuition.teacher_id, name: 'Teacher', type: 'Teacher' });
        }
        
        appState.students.forEach(s => {
            targets.push({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'My Child' });
        });

        const targetOptions = targets.map(t => `<option value="${t.id}">${t.name} (${t.type})</option>`).join('');

        body = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-400">Recipient</label>
                    <select id="ping-recipient" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500">
                        <option value="" disabled selected>-- Select Recipient --</option>
                        ${targetOptions}
                    </select>
                </div>
                ${renderMessageInputs()}
            </div>
        `;

    } else if (role === 'student') {
        // Student can ping:
        // 1. Teacher ONLY
        // Condition: NOW is between start_time and end_time (with small buffer maybe?)
        // Strict adherence: "if NOW time is between the scheduled tuition time"

        const now = new Date();
        const start = timeContext.start_time ? new Date(timeContext.start_time) : null;
        const end = timeContext.end_time ? new Date(timeContext.end_time) : null;

        if (!start || !end) {
            isTimeValid = false;
            body = renderErrorState("You can only ping the teacher during a scheduled class.");
        } else if (now < start || now > end) {
            isTimeValid = false;
            body = renderErrorState(`Class is not active.<br>Schedule: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);
        } else {
             // Valid Time
             if (tuition.teacher_id) {
                 targets.push({ id: tuition.teacher_id, name: 'Teacher' });
             }

             // Auto-select teacher since it's the only option
             body = `
                <div class="space-y-4">
                    <div class="bg-indigo-900/30 border border-indigo-500/50 p-3 rounded-md flex items-center">
                        <i class="fas fa-check-circle text-green-400 mr-3 text-xl"></i>
                        <div>
                            <p class="text-sm font-semibold text-white">Class is Active</p>
                            <p class="text-xs text-indigo-300">You can notify the teacher.</p>
                        </div>
                    </div>
                    <input type="hidden" id="ping-recipient" value="${tuition.teacher_id}">
                    ${renderMessageInputs(true)} 
                </div>
             `;
        }
    }

    // --- Render Modal ---
    const footer = isTimeValid 
        ? `<div class="flex justify-end space-x-3">
             <button id="modal-close-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white">Cancel</button>
             <button id="send-ping-btn" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-bold"><i class="fas fa-paper-plane mr-2"></i> Send</button>
           </div>`
        : `<div class="flex justify-end"><button id="modal-close-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white">Close</button></div>`;

    showModal(`Ping - ${tuition.subject}`, body, footer, (modal) => {
        if (!isTimeValid) return;

        modal.querySelector('#send-ping-btn').addEventListener('click', async () => {
            const recipientId = modal.querySelector('#ping-recipient').value;
            const title = modal.querySelector('#ping-title').value.trim();
            const message = modal.querySelector('#ping-message').value.trim();

            if (!recipientId) {
                showStatusMessage('error', 'Please select a recipient.');
                return;
            }
            if (!title || !message) {
                showStatusMessage('error', 'Title and Message are required.');
                return;
            }

            // Check for Placeholders
            if (recipientId.startsWith('topic_')) {
                showStatusMessage('info', 'Topic messaging coming soon.');
                return;
            }

            showLoadingOverlay('Sending Ping...');
            try {
                const payload = {
                    target_user_id: recipientId,
                    tuition_id: tuition.id,
                    custom_title: title,
                    custom_body: message
                };

                await pingUser(payload);
                closeModal();
                showStatusMessage('success', 'Ping sent successfully!');
            } catch (error) {
                showStatusMessage('error', error.message);
            } finally {
                hideStatusOverlay();
            }
        });
    });
}

// --- HTML Helpers ---

function renderMessageInputs(isStudent = false) {
    const defaultTitle = isStudent ? "I have a question" : "Class Update";
    const placeholderMsg = isStudent ? "e.g., I'm waiting in the waiting room." : "e.g., Class is starting in 5 minutes.";
    
    return `
        <div>
            <label class="block text-sm font-medium text-gray-400">Title</label>
            <input type="text" id="ping-title" value="${defaultTitle}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600 text-white placeholder-gray-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-400">Message</label>
            <textarea id="ping-message" rows="3" placeholder="${placeholderMsg}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600 text-white placeholder-gray-500"></textarea>
        </div>
    `;
}

function renderErrorState(message) {
    return `
        <div class="flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-gray-750 rounded-lg border border-gray-700 border-dashed">
            <i class="fas fa-clock text-4xl mb-3 text-yellow-500"></i>
            <p class="text-lg font-medium text-gray-300">Ping Unavailable</p>
            <p class="text-sm mt-1">${message}</p>
        </div>
    `;
}
