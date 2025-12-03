import { appState } from '../config.js';
import { 
    fetchTuitionLogs, 
    fetchFinancialSummary, 
    fetchSchedulableTuitions, 
    postTuitionLog, 
    postTuitionLogCorrection, 
    voidTuitionLog, 
    fetchPaymentLogs,
    fetchParentList,
    postPaymentLog,
    voidPaymentLog,
    postPaymentLogCorrection,
    createMeetingLink,
    updateMeetingLink,
    deleteMeetingLink,
    fetchStudents,
    fetchTuitions,
    fetchTeacherSpecialties
} from '../api.js';
import { showModal, closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay } from './modals.js';
import { renderPage } from './navigation.js';
import { renderStudentProfile } from './profile.js';

// #region Utilities
function formatDate(gmtString) {
    if (!gmtString) return 'N/A';
    try {
        const date = new Date(gmtString);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { return 'Invalid Date'; }
}

function formatTime(gmtString) {
    if (!gmtString) return 'N/A';
    try {
        const date = new Date(gmtString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
    } catch (e) { return 'Invalid Time'; }
}
// #endregion

// #region Tuition Logs
function renderTuitionLogsTable(logs) {
    if (logs.length === 0) return `<div class="text-center p-8 text-gray-400">No tuition logs found.</div>`;
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
                <td class="p-3 text-center">${log.duration}</td>
                <td class="p-3">${log.subject}</td>
                <td class="p-3">${(log.charges || []).map(c => c.student_name).join('<br>')}</td>
                <td class="p-3">
                    <div class="flex items-center justify-between">
                        <span>${log.total_cost} kwd</span>
                        <button title="View Charge Details" class="view-charges-btn text-blue-400 hover:text-blue-300" data-log-id="${log.id}"><i class="fas fa-info-circle"></i></button>
                    </div>
                </td>
                <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${log.paid_status === 'Paid' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}">${log.paid_status}</span></td>
                <td class="p-3"><span class="px-2 py-1 text-xs rounded-full ${isVoid ? 'bg-gray-500/30 text-gray-300' : 'bg-blue-500/30 text-blue-300'}">${log.status}</span></td>
                <td class="p-3 text-gray-400">${log.create_type}</td>
                <td class="p-3">
                    <div class="flex items-center space-x-2">
                        <button title="Correct Log" class="correct-log-btn p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id='${log.id}'><i class="fas fa-edit"></i></button>
                        <button title="Void Log" class="void-log-btn p-2 text-sm bg-red-600 hover:bg-red-500 rounded-md ${isVoid ? 'hidden' : ''}" data-log-id="${log.id}"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    return `<div class="overflow-x-auto"><table class="w-full text-left text-sm whitespace-nowrap"><thead class="bg-gray-900/80"><tr><th class="p-3 text-center">Week #</th><th class="p-3">Date</th><th class="p-3">Start Time</th><th class="p-3">End Time</th><th class="p-3 text-center">Duration</th><th class="p-3">Subject</th><th class="p-3">Attendees</th><th class="p-3">Total Cost</th><th class="p-3">Paid Status</th><th class="p-3">Log Status</th><th class="p-3">Type</th><th class="p-3">Actions</th></tr></thead><tbody>${logsHTML}</tbody></table></div>`;
}

export async function renderTeacherTuitionLogsPage() {
    try {
        const [summary, logs] = await Promise.all([fetchFinancialSummary(), fetchTuitionLogs()]);
        appState.teacherTuitionLogs = logs;
        const tableHTML = renderTuitionLogsTable(logs);

        // Build the Parent Breakdown HTML
        let breakdownHTML = '<p class="text-gray-400 text-sm">No parent data available.</p>';
        if (summary.per_parent_breakdown && summary.per_parent_breakdown.length > 0) {
            breakdownHTML = summary.per_parent_breakdown.map(p => {
                const balance = parseFloat(p.balance);
                const balanceColor = balance > 0 ? 'text-green-400' : (balance < 0 ? 'text-red-400' : 'text-gray-400');
                const balanceText = balance > 0 ? `+${p.balance} (Credit)` : (balance < 0 ? `${p.balance} (Owed)` : '0.00');
                
                return `
                    <div class="flex justify-between items-center p-2 border-b border-gray-700 last:border-0">
                        <span class="text-gray-300 font-medium">${p.parent_name}</span>
                        <div class="text-right">
                            <span class="block ${balanceColor} font-bold">${balanceText}</span>
                            <span class="text-xs text-gray-500">${p.unpaid_lessons_count} unpaid logs</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Tuition Logs</h2>
                    <button id="add-new-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"><i class="fas fa-plus mr-2"></i> Add New Log</button>
                </div>
                
                <!-- Summary Grid -->
                <div>
                    <h3 class="text-xl font-semibold mb-4">Summary</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-blue-400">${summary.total_lessons_given_this_month}</p><p class="text-gray-400">Lessons This Month</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-green-400">${summary.total_credit_held} kwd</p><p class="text-gray-400">Total Credit Held</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-yellow-400">${summary.total_owed_to_teacher} kwd</p><p class="text-gray-400">Total Owed to You</p></div>
                    </div>

                    <!-- Parent Breakdown -->
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex justify-between items-center">
                            <h4 class="text-lg font-semibold text-indigo-300">Balances by Parent</h4>
                            <button id="toggle-parent-breakdown-btn" class="text-gray-400 hover:text-white focus:outline-none">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                        <div id="parent-breakdown-content" class="hidden mt-3 max-h-60 overflow-y-auto pr-2 border-t border-gray-700 pt-2">
                            ${breakdownHTML}
                        </div>
                    </div>
                </div>

                ${tableHTML}
            </div>`;
    } catch (error) {
        console.error("Error rendering tuition logs page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading tuition logs: ${error.message}</div>`;
    }
}

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

export function showChargesDetail(logId) {
    const log = appState.teacherTuitionLogs?.find(l => l.id === logId);
    if (!log || !log.charges) {
        showStatusMessage('error', 'Charge details not available.');
        return;
    }
    const chargesHTML = log.charges.map(charge => {
        const statusColor = charge.paid_status === 'Paid' ? 'text-green-400' : 'text-red-400';
        return `
        <li class="flex justify-between items-center p-2 bg-gray-700 rounded-md">
            <span>${charge.student_name}</span>
            <div class="text-right">
                <span class="block font-semibold">${charge.cost} kwd</span>
                <span class="text-xs ${statusColor}">${charge.paid_status}</span>
            </div>
        </li>`;
    }).join('');
    const body = `<ul class="space-y-2">${chargesHTML}</ul>`;
    const footer = `<div class="flex justify-end"><button id="modal-close-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Close</button></div>`;
    showModal('Cost Breakdown', body, footer);
}

export async function showAddTuitionLogModal(logToCorrect = null) {
    const isCorrection = logToCorrect !== null;
    let logData = {};

    const _renderFinalStep = () => {
        const now = new Date();
        const startTimeDefault = logToCorrect?.start_time || logData.scheduled_start_time || now.toISOString();
        const endTimeDefault = logToCorrect?.end_time || logData.scheduled_end_time || new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        const startTimeValue = new Date(startTimeDefault).toISOString().slice(0, 16);
        const endTimeValue = new Date(endTimeDefault).toISOString().slice(0, 16);
        
        let customDetailsHTML = '';
        let subjectDisplay = logData.subject;

        if (logData.log_type === 'custom') {
            const studentCosts = logData.charges.map(c => {
                const name = c.student_name || logData.all_students.find(s => s.id === c.student_id).first_name;
                return `${name} (${c.cost} kwd)`;
            }).join(', ');
            customDetailsHTML = `<div><p class="text-sm text-gray-400">Attendees: <span class="font-semibold text-gray-200">${studentCosts}</span></p></div>`;
            
            // Enhance subject display for custom logs
            if (logData.educational_system && logData.grade) {
                subjectDisplay = `${logData.subject} (${logData.educational_system} - Grade ${logData.grade})`;
            }
        } else {
            customDetailsHTML = `<div><p class="text-sm text-gray-400">Attendees: <span class="font-semibold text-gray-200">${logData.student_names.join(', ')}</span></p></div>`;
        }

        const body = `
            <div class="space-y-4">
                <div><p class="text-sm text-gray-400">Subject: <span class="font-semibold text-gray-200">${subjectDisplay}</span></p></div>
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
                if (logData.log_type === 'scheduled') {
                    finalLogData = { 
                        log_type: "SCHEDULED", 
                        tuition_id: logData.tuition_id, 
                        start_time: new Date(modal.querySelector('#log-start-time').value).toISOString(), 
                        end_time: new Date(modal.querySelector('#log-end-time').value).toISOString() 
                    };
                } else {
                    finalLogData = { 
                        log_type: "CUSTOM", 
                        teacher_id: appState.currentUser.id, 
                        subject: logData.subject,
                        educational_system: logData.educational_system, // Added
                        grade: logData.grade, // Added
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

    const _renderScheduledPicker = async () => {
        showLoadingOverlay('Fetching tuitions...');
        try {
            const tuitions = await fetchSchedulableTuitions();
            hideStatusOverlay();
            const formatSchedulePreview = (timeStr) => {
                if (!timeStr) return '';
                try {
                    const date = new Date(timeStr);
                    return new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date);
                } catch (e) { return ''; }
            };
            const itemsHTML = tuitions.map(t => {
                const schedulePreview = formatSchedulePreview(t.scheduled_start_time);
                return `<li class="p-3 hover:bg-gray-700 rounded-md cursor-pointer scheduled-item" data-tuition-id="${t.id}">${t.subject} - ${(t.student_names || []).join(', ')} ${schedulePreview ? `<span class="text-gray-400">- ${schedulePreview}</span>` : ''}</li>`;
            }).join('');
            const body = `<div><h3 class="font-semibold mb-2">Select a Scheduled Tuition</h3><ul class="space-y-1 max-h-60 overflow-y-auto">${itemsHTML}</ul></div>`;
            showModal('Add From Schedule', body, '', (modal) => {
                modal.querySelectorAll('.scheduled-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const selectedTuition = tuitions.find(t => t.id === item.dataset.tuitionId);
                        const studentNamesFromCharges = (selectedTuition.charges || []).map(c => c.student_name);
                        logData = { log_type: 'scheduled', tuition_id: selectedTuition.id, subject: selectedTuition.subject, student_names: studentNamesFromCharges, scheduled_start_time: selectedTuition.scheduled_start_time, scheduled_end_time: selectedTuition.scheduled_end_time };
                        _renderFinalStep();
                    });
                });
            });
        } catch(error) {
            hideStatusOverlay();
            showStatusMessage('error', error.message);
        }
    };

    const _renderCustomForm = async () => {
        showLoadingOverlay('Fetching data...');
        try {
            // FETCH SPECIALTIES INSTEAD OF TUITIONS FOR SUBJECTS
            const [students, specialties] = await Promise.all([
                fetchStudents(), 
                fetchTeacherSpecialties(appState.currentUser.id)
            ]);
            
            hideStatusOverlay();
            
            const studentsHTML = students.map(s => {
                const existingCharge = isCorrection ? logToCorrect.charges.find(c => c.student_id === s.id) : null;
                const isChecked = existingCharge ? 'checked' : '';
                const costValue = existingCharge ? existingCharge.cost : '';
                const isHidden = existingCharge ? '' : 'hidden';
                return `<label class="flex items-center justify-between p-2 hover:bg-gray-600 rounded-md"><div class="flex items-center space-x-2"><input type="checkbox" class="student-checkbox" data-student-id="${s.id}" data-student-name="${s.first_name}" ${isChecked}><span>${s.first_name} ${s.last_name}</span></div><div class="w-24"><input type="number" class="student-cost-input w-full p-1 bg-gray-800 rounded-md border border-gray-500 text-sm ${isHidden}" placeholder="Cost" step="0.5" value="${costValue}"></div></label>`;
            }).join('');

            // Create specialty options
            let specialtyOptionsHTML = '';
            if (specialties.length === 0) {
                specialtyOptionsHTML = '<option value="" disabled selected>No specialties found. Please add specialties in your profile.</option>';
            } else {
                specialtyOptionsHTML = specialties.map(s => 
                    `<option value="${s.id}">${s.subject} (${s.educational_system} - Grade ${s.grade})</option>`
                ).join('');
            }

            const body = `
                <div class="space-y-4">
                    <div>
                        <label class="text-sm text-gray-400">Select Students & Set Cost</label>
                        <div class="max-h-40 overflow-y-auto space-y-1 mt-1 border border-gray-600 p-2 rounded-md">${studentsHTML}</div>
                    </div>
                    <div>
                        <label class="text-sm text-gray-400">Select Specialty</label>
                        <select id="custom-specialty" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" ${specialties.length === 0 ? 'disabled' : ''}>
                            ${specialtyOptionsHTML}
                        </select>
                    </div>
                </div>`;
                
            const footer = `<div class="flex justify-end"><button id="next-custom-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md" ${specialties.length === 0 ? 'disabled' : ''}>Next</button></div>`;
            
            showModal('Add Custom Log', body, footer, (modal) => {
                if (isCorrection && logToCorrect.educational_system && logToCorrect.grade) {
                     // Try to find the matching specialty to pre-select
                     const matchingSpecialty = specialties.find(s => 
                        s.subject === logToCorrect.subject && 
                        s.educational_system === logToCorrect.educational_system && 
                        s.grade === logToCorrect.grade
                     );
                     if (matchingSpecialty) {
                         modal.querySelector('#custom-specialty').value = matchingSpecialty.id;
                     }
                }

                modal.querySelectorAll('.student-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const costInput = e.target.closest('label').querySelector('.student-cost-input');
                        costInput.classList.toggle('hidden', !e.target.checked);
                    });
                });

                modal.querySelector('#next-custom-btn').addEventListener('click', () => {
                    const charges = [];
                    const selectedStudentNames = [];
                    let isValid = true;

                    modal.querySelectorAll('.student-checkbox:checked').forEach(checkbox => {
                        if (!isValid) return;
                        const costInput = checkbox.closest('label').querySelector('.student-cost-input');
                        const cost = parseFloat(costInput.value);
                        if (isNaN(cost) || cost <= 0) {
                            alert(`Please enter a valid cost for ${checkbox.dataset.studentName}.`);
                            isValid = false;
                            return;
                        }
                        charges.push({ student_id: checkbox.dataset.studentId, cost: cost });
                        selectedStudentNames.push(checkbox.dataset.studentName);
                    });

                    if (!isValid || charges.length === 0) {
                        if (isValid) alert('Please select at least one student and enter their cost.');
                        return;
                    }

                    const specialtyId = modal.querySelector('#custom-specialty').value;
                    const selectedSpecialty = specialties.find(s => s.id === specialtyId);

                    logData = { 
                        log_type: 'custom', 
                        charges: charges, 
                        student_names: selectedStudentNames, 
                        all_students: students, 
                        subject: selectedSpecialty.subject,
                        educational_system: selectedSpecialty.educational_system,
                        grade: selectedSpecialty.grade
                    };
                    _renderFinalStep();
                });
            });
        } catch (error) {
            hideStatusOverlay();
            showStatusMessage('error', error.message);
        }
    };

    if (isCorrection) {
        const studentNamesFromCharges = (logToCorrect.charges || []).map(c => c.student_name);
        // Populate initial logData for correction context
        logData = { 
            log_type: logToCorrect.create_type.toLowerCase(), 
            subject: logToCorrect.subject, 
            educational_system: logToCorrect.educational_system,
            grade: logToCorrect.grade,
            student_names: studentNamesFromCharges, 
            tuition_id: logToCorrect.tuition_id, 
            charges: logToCorrect.charges 
        };
        
        if (logData.log_type === 'custom') {
            await _renderCustomForm();
        } else {
            _renderFinalStep();
        }
    } else {
        const body = `<div class="flex space-x-4"><button id="from-schedule-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md">From Schedule</button><button id="custom-entry-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md">Custom Entry</button></div>`;
        showModal('Add New Tuition Log', body, '', (modal) => {
            modal.querySelector('#from-schedule-btn').addEventListener('click', _renderScheduledPicker);
            modal.querySelector('#custom-entry-btn').addEventListener('click', _renderCustomForm);
        });
    }
}
// #endregion

// #region Payment Logs
function renderPaymentLogsTable(logs) {
    if (logs.length === 0) return `<div class="text-center p-8 text-gray-400">No payment logs found.</div>`;
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
            </tr>`;
    }).join('');
    return `<div class="overflow-x-auto"><table class="w-full text-left text-sm whitespace-nowrap"><thead class="bg-gray-900/80"><tr><th class="p-3">Date</th><th class="p-3">Parent</th><th class="p-3">Amount Paid</th><th class="p-3">Notes</th><th class="p-3">Status</th><th class="p-3">Actions</th></tr></thead><tbody>${logsHTML}</tbody></table></div>`;
}

export async function renderTeacherPaymentLogsPage() {
    try {
        const logs = await fetchPaymentLogs();
        appState.teacherPaymentLogs = logs;
        const tableHTML = renderPaymentLogsTable(logs);
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Payment Logs</h2>
                    <button id="add-new-payment-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"><i class="fas fa-plus mr-2"></i> Add Payment</button>
                </div>
                ${tableHTML}
            </div>`;
    } catch (error) {
        console.error("Error rendering payment logs page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading payment logs: ${error.message}</div>`;
    }
}

export async function showAddPaymentLogModal(logToCorrect = null) {
    const isCorrection = logToCorrect !== null;
    showLoadingOverlay('Loading...');
    try {
        const parents = await fetchParentList();
        hideStatusOverlay();
        const parentOptions = parents.map(p => `<option value="${p.id}">${p.first_name} ${p.last_name}</option>`).join('');
        const body = `<div class="space-y-4"><div><label class="text-sm text-gray-400">Parent</label><select id="payment-parent-id" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${parentOptions}</select></div><div class="grid grid-cols-2 gap-4"><div><label class="text-sm text-gray-400">Payment Date</label><input type="date" id="payment-date" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></div><div><label class="text-sm text-gray-400">Amount Paid</label><input type="number" id="payment-amount" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" step="0.5" placeholder="0.00"></div></div><div><label class="text-sm text-gray-400">Notes (Optional)</label><textarea id="payment-notes" rows="3" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></textarea></div></div>`;
        const footer = `<div class="flex justify-end"><button id="submit-payment-log-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Submit</button></div>`;
        showModal(isCorrection ? 'Correct Payment Log' : 'Add Payment Log', body, footer, (modal) => {
            if (isCorrection) {
                const parent = parents.find(p => `${p.first_name} ${p.last_name}` === logToCorrect.parent_name);
                if (parent) modal.querySelector('#payment-parent-id').value = parent.id;
                modal.querySelector('#payment-date').value = new Date(logToCorrect.payment_date).toISOString().split('T')[0];
                modal.querySelector('#payment-amount').value = logToCorrect.amount_paid;
                modal.querySelector('#payment-notes').value = logToCorrect.notes || '';
            } else {
                 modal.querySelector('#payment-date').value = new Date().toISOString().split('T')[0];
            }
            modal.querySelector('#submit-payment-log-btn').addEventListener('click', async () => {
                const logData = { teacher_id: appState.currentUser.id, parent_id: modal.querySelector('#payment-parent-id').value, amount_paid: parseFloat(modal.querySelector('#payment-amount').value), notes: modal.querySelector('#payment-notes').value, payment_date: new Date(modal.querySelector('#payment-date').value).toISOString() };
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
// #endregion

// #region Meeting Links
export function showMeetingLinkModal(tuition) {
    const existingLink = tuition.meeting_link;
    const urlValue = existingLink ? existingLink.meeting_link : '';
    const passwordValue = existingLink ? existingLink.meeting_password : '';
    const idValue = existingLink ? existingLink.meeting_id : '';

    const body = `
        <div class="space-y-4">
            <div>
                <label for="meeting-url" class="block text-sm font-medium text-gray-400">Meeting URL</label>
                <input type="text" id="meeting-url" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${urlValue || ''}" placeholder="https://meet.google.com/abc-def-ghi">
            </div>
            <div>
                <label for="meeting-id" class="block text-sm font-medium text-gray-400">Meeting ID (optional)</label>
                <input type="text" id="meeting-id" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${idValue || ''}" placeholder="abc-def-ghi">
                <p class="text-xs text-gray-500 mt-1">If left empty, will be auto-detected from Google Meet URLs.</p>
            </div>
            <div>
                <label for="meeting-password" class="block text-sm font-medium text-gray-400">Password (optional)</label>
                <input type="text" id="meeting-password" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" value="${passwordValue || ''}">
            </div>
        </div>`;
    
    const deleteButtonHTML = existingLink 
        ? `<button title="Delete Link" class="delete-meeting-link-btn p-2 px-4 text-sm bg-red-600 hover:bg-red-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-trash"></i> Delete</button>`
        : '';

    const footer = `
        <div class="flex justify-between items-center w-full">
            ${deleteButtonHTML}
            <div class="flex-grow flex justify-end space-x-4">
                 <button id="modal-close-btn" class="p-2 px-4 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                 <button id="submit-meeting-link-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Save</button>
            </div>
        </div>`;

    showModal('Add/Edit Meeting Link', body, footer, (modal) => {
        modal.querySelector('#submit-meeting-link-btn').addEventListener('click', async () => {
            const url = modal.querySelector('#meeting-url').value.trim();
            const password = modal.querySelector('#meeting-password').value.trim();
            const meetingId = modal.querySelector('#meeting-id').value.trim();

            // If URL is empty, treat as a delete or no-op
            if (!url) {
                if (existingLink) {
                    showLoadingOverlay('Deleting link...');
                    try {
                        await deleteMeetingLink(tuition.id);
                        closeModal();
                        showStatusMessage('success', 'Meeting link deleted.');
                        renderPage();
                    } catch (error) {
                        showStatusMessage('error', `Failed to delete link: ${error.message}`);
                    }
                } else {
                    closeModal();
                }
                return;
            }

            // --- Frontend Validation ---
            // This regex is a basic check for URL-like structure.
            const urlRegex = /^(https?:\/\/)?([\w\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            if (!urlRegex.test(url)) {
                showStatusMessage('error', 'Please enter a valid URL format.');
                return;
            }

            showLoadingOverlay('Saving link...');
            try {
                if (existingLink) {
                    await updateMeetingLink(tuition.id, url, password, meetingId);
                } else {
                    await createMeetingLink(tuition.id, url, password, meetingId);
                }
                closeModal();
                showStatusMessage('success', 'Meeting link saved.');
                renderPage();
            } catch (error) {
                // Catch the specific backend validation error and make it user-friendly
                if (error.message.includes('Input should be a valid URL')) {
                    showStatusMessage('error', 'The provided URL is not valid. Please check and try again.');
                } else {
                    showStatusMessage('error', `Failed to save link: ${error.message}`);
                }
            }
        });
    });
}

export function showMeetingLinkDetailsModal(tuition) {
    const link = tuition.meeting_link;
    if (!link) {
        showStatusMessage('info', 'No meeting link is set for this tuition.');
        return;
    }
    const body = `
        <div class="space-y-3 text-sm">
            <div><label class="text-xs text-gray-400">Subject</label><p class="font-semibold text-base">${tuition.subject}</p></div>
            <div class="border-t border-gray-700 pt-3"><label class="text-xs text-gray-400">URL</label><a href="${link.meeting_link}" target="_blank" rel="noopener noreferrer" class="block break-all text-blue-400 hover:underline">${link.meeting_link}</a></div>
            <div><label class="text-xs text-gray-400">Meeting ID</label><p class="font-mono">${link.meeting_id || 'None'}</p></div>
            <div><label class="text-xs text-gray-400">Password</label><p class="font-mono">${link.meeting_password || 'None'}</p></div>
        </div>`;
    const footer = `
        <div class="flex justify-end w-full">
            <button id="modal-close-btn" class="p-2 px-4 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Close</button>
        </div>`;
    showModal('Meeting Link Details', body, footer);
}
// #endregion

// #region Teacher Student Info (Updated)
export async function renderTeacherStudentInfoPage() {
    try {
        showLoadingOverlay('Loading Students...');
        const students = await fetchStudents();
        hideStatusOverlay();

        if (students.length === 0) {
            return `<div class="text-center text-gray-400 p-8">You have no students assigned yet.</div>`;
        }

        // Create options for the dropdown
        const options = students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (Grade ${s.grade})</option>`).join('');

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Student Information</h2>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg">
                    <label class="block text-sm font-medium text-gray-400 mb-2">Select Student to Manage</label>
                    <select id="teacher-student-selector" class="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="">-- Select a Student --</option>
                        ${options}
                    </select>
                </div>
                <div id="teacher-student-profile-container">
                    <div class="text-center text-gray-500 py-8">Select a student above to view and edit their details.</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error rendering teacher student info page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading student information: ${error.message}</div>`;
    }
}
// #endregion