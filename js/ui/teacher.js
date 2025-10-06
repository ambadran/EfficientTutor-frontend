import { appState } from '../config.js';
import { 
    fetchTuitionLogs, 
    fetchFinancialSummary, 
    fetchSchedulableTuitions, 
    fetchCustomLogEntryData, 
    postTuitionLog, 
    postTuitionLogCorrection, 
    voidTuitionLog, 
    fetchPaymentLogs,
    fetchParentList,
    postPaymentLog,
    voidPaymentLog,
    postPaymentLogCorrection
} from '../api.js';
import { showModal, closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay } from './modals.js';
import { renderPage } from './navigation.js';

/**
 * Formats a timestamp string into a date string.
 * e.g., "Sat, Sep 20, 2025"
 */
function formatDate(gmtString) {
    if (!gmtString) return 'N/A';
    try {
        const date = new Date(gmtString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        });
    } catch (e) { return 'Invalid Date'; }
}

/**
 * Formats a timestamp string into a time string.
 * e.g., "6:32 PM"
 */
function formatTime(gmtString) {
    if (!gmtString) return 'N/A';
    try {
        const date = new Date(gmtString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC'
        });
    } catch (e) { return 'Invalid Time'; }
}

/**
 * Renders the main table of tuition logs with the new column format.
 */
function renderTuitionLogsTable(logs) {
    if (logs.length === 0) {
        return `<div class="text-center p-8 text-gray-400">No tuition logs found.</div>`;
    }

    logs.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const logsHTML = logs.map(log => {
        const isVoid = log.status === 'VOID';
        const rowClass = isVoid ? 'opacity-50 bg-gray-800/50' : 'bg-gray-800';
        return `
            <tr class="${rowClass}">
                <td class="p-3 font-mono text-center">${log.week_number}</td>
                <td class="p-3">${formatDate(log.start_time)}</td>
                <td class="p-3">${formatTime(log.start_time)}</td>
                <td class="p-3">${formatTime(log.end_time)}</td>
                <td class="p-3">${log.subject}</td>
                <td class="p-3">${log.attendee_names.join(', ')}</td>
                <td class="p-3">${log.cost} kwd</td>
                <td class="p-3">
                    <span class="px-2 py-1 text-xs rounded-full ${log.paid_status === 'Paid' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}">
                        ${log.paid_status}
                    </span>
                </td>
                <td class="p-3">
                    <span class="px-2 py-1 text-xs rounded-full ${isVoid ? 'bg-gray-500/30 text-gray-300' : 'bg-blue-500/30 text-blue-300'}">
                        ${log.status}
                    </span>
                </td>
                <td class="p-3 text-gray-400">${log.create_type}</td>
                <td class="p-3">
                    <div class="flex items-center space-x-2">
                        <button title="Correct Log" class="correct-log-btn p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id='${log.id}'><i class="fas fa-edit"></i></button>
                        <button title="Void Log" class="void-log-btn p-2 text-sm bg-red-600 hover:bg-red-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id="${log.id}"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-gray-900/80">
                    <tr>
                        <th class="p-3 text-center">Week #</th>
                        <th class="p-3">Date</th>
                        <th class="p-3">Start Time</th>
                        <th class="p-3">End Time</th>
                        <th class="p-3">Subject</th>
                        <th class="p-3">Attendees</th>
                        <th class="p-3">Cost</th>
                        <th class="p-3">Paid Status</th>
                        <th class="p-3">Log Status</th>
                        <th class="p-3">Type</th>
                        <th class="p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>${logsHTML}</tbody>
            </table>
        </div>
    `;
}

/**
 * Main function to render the entire Teacher Tuition Logs page.
 */
export async function renderTeacherTuitionLogsPage() {
    try {
        const [summary, logs] = await Promise.all([
            fetchFinancialSummary(appState.currentUser.id),
            fetchTuitionLogs(appState.currentUser.id)
        ]);

        appState.teacherTuitionLogs = logs;
        const tableHTML = renderTuitionLogsTable(logs);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Tuition Logs</h2>
                    <button id="add-new-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                        <i class="fas fa-plus mr-2"></i> Add New Log
                    </button>
                </div>

                <div>
                    <h3 class="text-xl font-semibold mb-4">Summary</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-blue-400">${summary.total_lessons_given_this_month}</p>
                            <p class="text-gray-400">Lessons This Month</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-green-400">${summary.total_credit_held} kwd</p>
                            <p class="text-gray-400">Total Credit Held</p>
                        </div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center">
                            <p class="text-3xl font-bold text-yellow-400">${summary.total_owed_to_teacher} kwd</p>
                            <p class="text-gray-400">Total Owed to You</p>
                        </div>
                    </div>
                </div>

                ${tableHTML}
            </div>
        `;
    } catch (error) {
        console.error("Error rendering tuition logs page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading tuition logs: ${error.message}</div>`;
    }
}
/**
 * Handles the logic for voiding a tuition log with confirmation.
 */
export function handleVoidLog(logId) {
    const body = `<p>Are you sure you want to void this log? This action cannot be undone.</p>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-void-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Void Log</button></div>`;
    showModal('Confirm Void', body, footer, (modal) => {
        modal.querySelector('#modal-confirm-void-btn').addEventListener('click', async () => {
            showLoadingOverlay('Voiding log...');
            try {
                await voidTuitionLog(logId);
                closeModal();
                showStatusMessage('success', 'Log voided successfully.');
                renderPage();
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
    });
}

/**
 * Orchestrates the multi-step modal for adding or correcting a log.
 */
export async function showAddTuitionLogModal(logToCorrect = null) {
    const isCorrection = logToCorrect !== null;
    let logData = {}; // This will hold the data as we build it through the steps

    // --- Helper function for the final step (entering time) ---
    const _renderFinalStep = () => {
        const now = new Date();
        const startTimeDefault = logToCorrect?.start_time || logData.scheduled_start_time || now.toISOString();
        const endTimeDefault = logToCorrect?.end_time || logData.scheduled_end_time || new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        
        const startTimeValue = new Date(startTimeDefault).toISOString().slice(0, 16);
        const endTimeValue = new Date(endTimeDefault).toISOString().slice(0, 16);

        // For custom logs, show the student names and their costs
        let customDetailsHTML = '';
        if (logData.log_type === 'custom') {
            const studentCosts = logData.charges.map(c => {
                const student = logData.all_students.find(s => s.id === c.student_id);
                return `${student.first_name} (${c.cost} kwd)`;
            }).join(', ');
            customDetailsHTML = `<div><p class="text-sm text-gray-400">Attendees: <span class="font-semibold text-gray-200">${studentCosts}</span></p></div>`;
        } else {
            customDetailsHTML = `<div><p class="text-sm text-gray-400">Attendees: <span class="font-semibold text-gray-200">${logData.student_names.join(', ')}</span></p></div>`;
        }

        const body = `
            <div class="space-y-4">
                <div><p class="text-sm text-gray-400">Subject: <span class="font-semibold text-gray-200">${logData.subject}</span></p></div>
                ${customDetailsHTML}
                ${logData.log_type === 'custom' ? `<div><label class="text-sm text-gray-400">Lesson Index</label><input type="number" id="log-lesson-index" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${logToCorrect?.lesson_index || 1}" min="1"></div>` : ''}
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="text-sm text-gray-400">Start Time</label><input type="datetime-local" id="log-start-time" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${startTimeValue}"></div>
                    <div><label class="text-sm text-gray-400">End Time</label><input type="datetime-local" id="log-end-time" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${endTimeValue}"></div>
                </div>
            </div>`;
        const footer = `<div class="flex justify-end"><button id="submit-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Submit</button></div>`;
        
        showModal(isCorrection ? 'Correct Tuition Log' : 'Add Tuition Log', body, footer, (modal) => {
            modal.querySelector('#submit-log-btn').addEventListener('click', async () => {
                let finalLogData = {};

                // --- UPDATED: Build the correct JSON for each log type ---
                if (logData.log_type === 'scheduled') {
                    finalLogData = {
                        log_type: "scheduled",
                        tuition_id: logData.tuition_id,
                        start_time: new Date(modal.querySelector('#log-start-time').value).toISOString(),
                        end_time: new Date(modal.querySelector('#log-end-time').value).toISOString()
                    };
                } else { // custom
                    finalLogData = {
                        log_type: "custom",
                        teacher_id: appState.currentUser.id,
                        subject: logData.subject,
                        lesson_index: parseInt(modal.querySelector('#log-lesson-index').value),
                        start_time: new Date(modal.querySelector('#log-start-time').value).toISOString(),
                        end_time: new Date(modal.querySelector('#log-end-time').value).toISOString(),
                        charges: logData.charges
                    };
                }

                showLoadingOverlay('Saving log...');
                try {
                    if (isCorrection) {
                        await postTuitionLogCorrection(logToCorrect.id, finalLogData);
                    } else {
                        await postTuitionLog(finalLogData);
                    }
                    closeModal();
                    showStatusMessage('success', 'Log saved successfully.');
                    renderPage();
                } catch (error) {
                    showStatusMessage('error', error.message);
                }
            });
        });
    };

    // --- Helper function for Step 2: Scheduled Picker ---
    const _renderScheduledPicker = async () => {
        showLoadingOverlay('Fetching tuitions...');
        try {
            const tuitions = await fetchSchedulableTuitions(appState.currentUser.id);
            hideStatusOverlay();

            // NEW: Helper to format the time preview
            const formatSchedulePreview = (timeStr) => {
                if (!timeStr) return ''; // Handle cases where the time is null
                try {
                    const date = new Date(timeStr);
                    // Creates a format like "Sat, 3:30 PM"
                    return new Intl.DateTimeFormat('en-US', {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'UTC'
                    }).format(date);
                } catch (e) {
                    return ''; // Return empty string on error
                }
            };

            // UPDATED: The list item now includes the formatted time preview
            const itemsHTML = tuitions.map(t => {
                const schedulePreview = formatSchedulePreview(t.scheduled_start_time);
                return `
                    <li class="p-3 hover:bg-gray-700 rounded-md cursor-pointer scheduled-item" data-tuition-id="${t.id}">
                        ${t.subject} - ${t.student_names.join(', ')} ${schedulePreview ? `<span class="text-gray-400">- ${schedulePreview}</span>` : ''}
                    </li>
                `;
            }).join('');

            const body = `<div><h3 class="font-semibold mb-2">Select a Scheduled Tuition</h3><ul class="space-y-1 max-h-60 overflow-y-auto">${itemsHTML}</ul></div>`;
            showModal('Add From Schedule', body, '', (modal) => {
                modal.querySelectorAll('.scheduled-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const selectedTuition = tuitions.find(t => t.id === item.dataset.tuitionId);
                        logData = {
                            log_type: 'scheduled',
                            tuition_id: selectedTuition.id,
                            subject: selectedTuition.subject,
                            student_names: selectedTuition.student_names,
                            scheduled_start_time: selectedTuition.scheduled_start_time,
                            scheduled_end_time: selectedTuition.scheduled_end_time
                        };
                        _renderFinalStep();
                    });
                });
            });
        } catch(error) {
            hideStatusOverlay();
            showStatusMessage('error', error.message);
        }
    };

    // --- UPDATED Helper function for Step 2: Custom Form ---
    const _renderCustomForm = async () => {
        showLoadingOverlay('Fetching data...');
        try {
            const data = await fetchCustomLogEntryData(appState.currentUser.id);
            hideStatusOverlay();

            // UPDATED: UI now includes a cost input for each student
            const studentsHTML = data.students.map(s => `
                <label class="flex items-center justify-between p-2 hover:bg-gray-600 rounded-md">
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" class="student-checkbox" data-student-id="${s.id}" data-student-name="${s.first_name}">
                        <span>${s.first_name} ${s.last_name}</span>
                    </div>
                    <div class="w-24">
                        <input type="number" class="student-cost-input w-full p-1 bg-gray-800 rounded-md border border-gray-500 text-sm hidden" placeholder="Cost" step="0.5">
                    </div>
                </label>`).join('');

            const subjectsHTML = data.subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
            const body = `
                <div class="space-y-4">
                    <div><label class="text-sm text-gray-400">Select Students & Set Cost</label><div class="max-h-40 overflow-y-auto space-y-1 mt-1 border border-gray-600 p-2 rounded-md">${studentsHTML}</div></div>
                    <div><label class="text-sm text-gray-400">Select Subject</label><select id="custom-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${subjectsHTML}</select></div>
                </div>`;
            const footer = `<div class="flex justify-end"><button id="next-custom-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Next</button></div>`;
            
            showModal('Add Custom Log', body, footer, (modal) => {
                // Show/hide cost input when a student is checked
                modal.querySelectorAll('.student-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const costInput = e.target.closest('label').querySelector('.student-cost-input');
                        costInput.classList.toggle('hidden', !e.target.checked);
                    });
                });

                modal.querySelector('#next-custom-btn').addEventListener('click', () => {
                    const charges = [];
                    const selectedStudentNames = [];
                    modal.querySelectorAll('.student-checkbox:checked').forEach(checkbox => {
                        const costInput = checkbox.closest('label').querySelector('.student-cost-input');
                        const cost = parseFloat(costInput.value);
                        if (isNaN(cost) || cost <= 0) {
                            alert(`Please enter a valid cost for ${checkbox.dataset.studentName}.`);
                            charges.length = 0; // Invalidate charges
                            return;
                        }
                        charges.push({
                            student_id: checkbox.dataset.studentId,
                            cost: cost
                        });
                        selectedStudentNames.push(checkbox.dataset.studentName);
                    });

                    if (charges.length === 0) {
                        alert('Please select at least one student and enter their cost.');
                        return;
                    }

                    logData = {
                        log_type: 'custom',
                        charges: charges,
                        student_names: selectedStudentNames,
                        all_students: data.students, // Pass full student list for final display
                        subject: modal.querySelector('#custom-subject').value,
                    };
                    _renderFinalStep();
                });
            });
        } catch (error) {
            hideStatusOverlay();
            showStatusMessage('error', error.message);
        }
    };

    // --- Main entry point for the modal ---
    if (isCorrection) {
        // If correcting, skip the choice and go straight to the final step
        logData = {
            log_type: logToCorrect.create_type.toLowerCase(),
            subject: logToCorrect.subject,
            student_names: logToCorrect.attendee_names,
            cost: logToCorrect.cost,
            tuition_id: logToCorrect.tuition_id
            // We pass the full logToCorrect object to pre-fill times later
        };
        _renderFinalStep();
    } else {
        // If adding a new log, show the initial choice
        const body = `<div class="flex space-x-4"><button id="from-schedule-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md">From Schedule</button><button id="custom-entry-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md">Custom Entry</button></div>`;
        showModal('Add New Tuition Log', body, '', (modal) => {
            modal.querySelector('#from-schedule-btn').addEventListener('click', _renderScheduledPicker);
            modal.querySelector('#custom-entry-btn').addEventListener('click', _renderCustomForm);
        });
    }
}

// --- Payment Logs Rendering & Actions ---

/**
 * Renders the main table of payment logs.
 */
function renderPaymentLogsTable(logs) {
    if (logs.length === 0) {
        return `<div class="text-center p-8 text-gray-400">No payment logs found.</div>`;
    }

    logs.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

    const logsHTML = logs.map(log => {
        const isVoid = log.status === 'VOID';
        const rowClass = isVoid ? 'opacity-50 bg-gray-800/50' : 'bg-gray-800';
        return `
            <tr class="${rowClass}">
                <td class="p-3">${new Date(log.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td class="p-3">${log.parent_name}</td>
                <td class="p-3">${log.amount_paid} ${log.currency}</td>
                <td class="p-3 text-gray-400 italic">${log.notes || '–'}</td>
                <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${isVoid ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}">${log.status}</span></td>
                <td class="p-3">
                    <div class="flex items-center space-x-2">
                        <button title="Correct Log" class="correct-payment-log-btn p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id="${log.id}"><i class="fas fa-edit"></i></button>
                        <button title="Void Log" class="void-payment-log-btn p-2 text-sm bg-red-600 hover:bg-red-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id="${log.id}"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-gray-900/80">
                    <tr>
                        <th class="p-3">Date</th>
                        <th class="p-3">Parent</th>
                        <th class="p-3">Amount Paid</th>
                        <th class="p-3">Notes</th>
                        <th class="p-3">Status</th>
                        <th class="p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>${logsHTML}</tbody>
            </table>
        </div>
    `;
}

/**
 * Main function to render the Teacher Payment Logs page.
 */
export async function renderTeacherPaymentLogsPage() {
    try {
        const logs = await fetchPaymentLogs(appState.currentUser.id);
        appState.teacherPaymentLogs = logs; // Cache logs for Correct/Void actions
        const tableHTML = renderPaymentLogsTable(logs);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Payment Logs</h2>
                    <button id="add-new-payment-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                        <i class="fas fa-plus mr-2"></i> Add Payment
                    </button>
                </div>
                ${tableHTML}
            </div>
        `;
    } catch (error) {
        console.error("Error rendering payment logs page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading payment logs: ${error.message}</div>`;
    }
}

/**
 * NEW: Full implementation for the Add/Correct Payment Log modal.
 */
export async function showAddPaymentLogModal(logToCorrect = null) {
    const isCorrection = logToCorrect !== null;
    showLoadingOverlay('Loading...');

    try {
        const { parents } = await fetchParentList(appState.currentUser.id);
        hideStatusOverlay();

        const parentOptions = parents.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('');
        
        const body = `
            <div class="space-y-4">
                <div>
                    <label class="text-sm text-gray-400">Parent</label>
                    <select id="payment-parent-id" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${parentOptions}</select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm text-gray-400">Payment Date</label>
                        <input type="date" id="payment-date" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                    </div>
                    <div>
                        <label class="text-sm text-gray-400">Amount Paid</label>
                        <input type="number" id="payment-amount" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" step="0.5" placeholder="0.00">
                    </div>
                </div>
                <div>
                    <label class="text-sm text-gray-400">Notes (Optional)</label>
                    <textarea id="payment-notes" rows="3" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></textarea>
                </div>
            </div>
        `;
        const footer = `<div class="flex justify-end"><button id="submit-payment-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Submit</button></div>`;
        
        showModal(isCorrection ? 'Correct Payment Log' : 'Add Payment Log', body, footer, (modal) => {
            // Pre-fill form if correcting
            if (isCorrection) {
                // Find parent ID by matching the name
                const parent = parents.find(p => `${p.first_name} ${p.last_name}` === logToCorrect.parent_name);
                if (parent) modal.querySelector('#payment-parent-id').value = parent.id;
                
                modal.querySelector('#payment-date').value = new Date(logToCorrect.payment_date).toISOString().split('T')[0];
                modal.querySelector('#payment-amount').value = logToCorrect.amount_paid;
                modal.querySelector('#payment-notes').value = logToCorrect.notes || '';
            } else {
                 modal.querySelector('#payment-date').value = new Date().toISOString().split('T')[0];
            }
            
            // Handle submission
            modal.querySelector('#submit-payment-log-btn').addEventListener('click', async () => {
                const logData = {
                    teacher_id: appState.currentUser.id,
                    parent_id: modal.querySelector('#payment-parent-id').value,
                    amount_paid: parseFloat(modal.querySelector('#payment-amount').value),
                    notes: modal.querySelector('#payment-notes').value,
                    payment_date: new Date(modal.querySelector('#payment-date').value).toISOString(),
                };

                if (!logData.parent_id || !logData.amount_paid || !logData.payment_date) {
                    alert('Please fill in Parent, Date, and Amount.');
                    return;
                }

                showLoadingOverlay('Saving payment...');
                try {
                    if (isCorrection) {
                        await postPaymentLogCorrection(logToCorrect.id, logData);
                    } else {
                        await postPaymentLog(logData);
                    }
                    closeModal();
                    showStatusMessage('success', 'Payment log saved.');
                    renderPage();
                } catch (error) {
                    showStatusMessage('error', error.message);
                }
            });
        });
    } catch (error) {
        hideStatusOverlay();
        showStatusMessage('error', `Could not load data: ${error.message}`);
    }
}

/**
 * NEW: Full implementation for voiding a payment log.
 */
export function handleVoidPaymentLog(logId) {
    const body = `<p>Are you sure you want to void this payment log? This action cannot be undone.</p>`;
    const footer = `<div class="flex justify-end space-x-4"><button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button><button id="modal-confirm-void-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Void Log</button></div>`;
    
    showModal('Confirm Void', body, footer, (modal) => {
        modal.querySelector('#modal-confirm-void-btn').addEventListener('click', async () => {
            showLoadingOverlay('Voiding payment...');
            try {
                await voidPaymentLog(logId);
                closeModal();
                showStatusMessage('success', 'Payment log voided.');
                renderPage();
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
    });
}
