import { appState, config } from '../config.js';
import { fetchNotes, fetchStudents, createNote, updateNote } from '../api.js';
import { showModal, closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay } from './modals.js';
import { renderPage } from './navigation.js';

/**
 * Renders the top-level container for the Notes page.
 * It fetches the required data (students and notes) and then delegates rendering
 * to other functions based on the current state.
 */
export async function renderNotesPage() {
    // For students, the filter is always their own ID.
    // For others, it's whatever is in the state's filter.
    if (appState.currentUser.role === 'student') {
        appState.notesStudentFilter = appState.currentUser.id;
    }

    // Fetch all necessary data
    try {
        showLoadingOverlay('Loading Notes...');
        // Fetch all notes visible to the user. Filtering happens on the frontend.
        const notes = await fetchNotes();
        appState.notes = notes;

        // Fetch student list only if user is not a student
        if (appState.currentUser.role !== 'student') {
            const students = await fetchStudents();
            appState.allStudents = students;
        }
        
        hideStatusOverlay();

        const studentSelectorHTML = renderStudentSelectorForNotes();
        
        // Determine which notes to show based on the filter.
        const filteredNotes = appState.notesStudentFilter
            ? appState.notes.filter(note => note.student.id === appState.notesStudentFilter)
            : [];

        const contentHTML = renderSubjectGrid(filteredNotes);

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Notes</h2>
                    ${appState.currentUser.role === 'teacher' ? '<button id="add-new-note-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"><i class="fas fa-plus mr-2"></i> Add New Note</button>' : ''}
                </div>
                ${studentSelectorHTML}
                <div id="notes-content-container">
                    ${contentHTML}
                </div>
            </div>
        `;
    } catch (error) {
        hideStatusOverlay();
        console.error("Error rendering notes page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading notes: ${error.message}</div>`;
    }
}

/**
 * Renders the student selection dropdown if the user is a parent or teacher.
 */
function renderStudentSelectorForNotes() {
    const userRole = appState.currentUser?.role;
    if (userRole !== 'parent' && userRole !== 'teacher') return '';

    const students = appState.allStudents || [];
    if (students.length === 0) {
        return '<p class="text-gray-400">No students found.</p>';
    }

    const options = students.map(s => 
        `<option value="${s.id}" ${appState.notesStudentFilter === s.id ? 'selected' : ''}>
            ${s.first_name} ${s.last_name}
        </option>`
    ).join('');

    return `
        <div class="max-w-sm">
            <label for="notes-student-selector" class="block text-sm font-medium text-gray-400">Viewing Notes For:</label>
            <select id="notes-student-selector" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                <option value="">Select a student...</option>
                ${options}
            </select>
        </div>
    `;
}

/**
 * Renders a grid of subject cards based on the available notes.
 * @param {Array} notes - The notes for the selected student.
 */
function renderSubjectGrid(notes) {
    if (!appState.notesStudentFilter) {
        return '<div class="text-center p-8 text-gray-400 bg-gray-800 rounded-lg">Please select a student to view their notes.</div>';
    }
    
    if (notes.length === 0) {
        return '<div class="text-center p-8 text-gray-400 bg-gray-800 rounded-lg">No notes found for this student.</div>';
    }

    const subjects = notes.reduce((acc, note) => {
        if (!acc[note.subject]) {
            acc[note.subject] = 0;
        }
        acc[note.subject]++;
        return acc;
    }, {});

    const subjectCardsHTML = Object.entries(subjects).map(([subject, count]) => `
        <div class="subject-card-button bg-gray-800 hover:bg-indigo-800/50 p-6 rounded-lg text-center cursor-pointer transition-all duration-300 transform hover:scale-105" data-subject="${subject}">
            <i class="fas fa-folder text-4xl text-indigo-400 mb-3"></i>
            <h3 class="font-bold text-lg">${subject}</h3>
            <p class="text-sm text-gray-400">${count} ${count === 1 ? 'Note' : 'Notes'}</p>
        </div>
    `).join('');

    return `
        <div>
            <h3 class="text-xl font-semibold mb-4">Subjects</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${subjectCardsHTML}
            </div>
        </div>
        <div id="notes-list-container" class="mt-8"></div>
    `;
}


/**
 * Renders the list of notes for a specific subject, grouped by type.
 * @param {string} subject - The subject to display notes for.
 */
export function renderNotesList(subject) {
    const notesForSubject = appState.notes.filter(note => 
        note.student.id === appState.notesStudentFilter && note.subject === subject
    );

    if (notesForSubject.length === 0) {
        return '<p class="text-gray-400">No notes found for this subject.</p>';
    }

    const groupedNotes = notesForSubject.reduce((acc, note) => {
        const type = note.note_type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(note);
        return acc;
    }, {});

    const canEdit = appState.currentUser?.role === 'teacher';

    const listHTML = Object.entries(groupedNotes).map(([type, notes]) => {
        const formattedType = type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
        
        const noteCardsHTML = notes.map(note => {
            const editButtons = canEdit ? `
                <div class="flex-shrink-0 space-x-2">
                    <button title="Edit Note" class="edit-note-btn p-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md" data-note-id="${note.id}"><i class="fas fa-edit"></i></button>
                    <button title="Delete Note" class="delete-note-btn p-2 text-sm bg-red-600 hover:bg-red-500 rounded-md" data-note-id="${note.id}"><i class="fas fa-trash"></i></button>
                </div>
            ` : '';

            return `
                <div class="bg-gray-800 p-4 rounded-lg flex items-start justify-between gap-4">
                    <div class="flex-grow">
                        <h4 class="font-semibold text-md text-indigo-300">${note.name}</h4>
                        <p class="text-sm text-gray-400 my-2">${note.description || 'No description.'}</p>
                        ${note.url ? `<a href="${note.url}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm text-blue-400 hover:underline">Open Link <i class="fas fa-external-link-alt ml-1"></i></a>` : ''}
                    </div>
                    ${editButtons}
                </div>
            `;
        }).join('');

        return `
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-300 mb-3">${formattedType}</h3>
                <div class="space-y-3">
                    ${noteCardsHTML}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="mt-6">
            <button id="back-to-subjects-btn" class="text-sm text-indigo-400 hover:underline mb-4"><i class="fas fa-arrow-left mr-2"></i>Back to Subjects</button>
            <h2 class="text-2xl font-bold mb-4">Notes for ${subject}</h2>
            ${listHTML}
        </div>
    `;
}


/**
 * Shows a modal dialog for creating a new note.
 */
export function showCreateNoteModal() {
    const studentOptions = appState.allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('');
    const subjectOptions = config.noteSubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const typeOptions = config.noteTypes.map(t => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('');

    const body = `
        <div class="space-y-4">
            <div>
                <label for="note-student-id" class="block text-sm font-medium text-gray-400">Student</label>
                <select id="note-student-id" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${studentOptions}</select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="note-subject" class="block text-sm font-medium text-gray-400">Subject</label>
                    <select id="note-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${subjectOptions}</select>
                </div>
                <div>
                    <label for="note-type" class="block text-sm font-medium text-gray-400">Note Type</label>
                    <select id="note-type" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${typeOptions}</select>
                </div>
            </div>
            <div>
                <label for="note-name" class="block text-sm font-medium text-gray-400">Note Name</label>
                <input type="text" id="note-name" placeholder="e.g., Algebra Chapter 5 Review" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
            </div>
            <div>
                <label for="note-description" class="block text-sm font-medium text-gray-400">Description</label>
                <textarea id="note-description" rows="3" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></textarea>
            </div>
            <div>
                <label for="note-url" class="block text-sm font-medium text-gray-400">URL</label>
                <input type="url" id="note-url" placeholder="https://example.com/document.pdf" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
            </div>
        </div>
    `;

    const footer = `<div class="flex justify-end"><button id="submit-note-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Create Note</button></div>`;

    showModal('Add New Note', body, footer, (modal) => {
        // Pre-select the student if one is already filtered in the main view
        if (appState.notesStudentFilter) {
            modal.querySelector('#note-student-id').value = appState.notesStudentFilter;
        }

        modal.querySelector('#submit-note-btn').addEventListener('click', async () => {
            const noteData = {
                student_id: modal.querySelector('#note-student-id').value,
                subject: modal.querySelector('#note-subject').value,
                note_type: modal.querySelector('#note-type').value,
                name: modal.querySelector('#note-name').value.trim(),
                description: modal.querySelector('#note-description').value.trim(),
                url: modal.querySelector('#note-url').value.trim(),
            };

            if (!noteData.student_id || !noteData.name) {
                showStatusMessage('error', 'Student and Note Name are required.');
                return;
            }

            showLoadingOverlay('Creating note...');
            try {
                await createNote(noteData);
                closeModal();
                showStatusMessage('success', 'Note created successfully.');
                await renderPage(); // Refresh the notes page
            } catch (error) {
                showStatusMessage('error', `Failed to create note: ${error.message}`);
            }
        });
    });
}


/**
 * Shows a modal dialog for updating an existing note.
 * @param {object} note - The note object to edit.
 */
export function showUpdateNoteModal(note) {
    const subjectOptions = config.noteSubjects.map(s => `<option value="${s}" ${note.subject === s ? 'selected' : ''}>${s}</option>`).join('');
    const typeOptions = config.noteTypes.map(t => `<option value="${t}" ${note.note_type === t ? 'selected' : ''}>${t.replace(/_/g, ' ')}</option>`).join('');

    const body = `
        <div class="space-y-4">
             <p class="text-sm text-gray-400">Student: <span class="font-semibold">${note.student.first_name} ${note.student.last_name}</span></p>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label for="note-subject" class="block text-sm font-medium text-gray-400">Subject</label>
                    <select id="note-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${subjectOptions}</select>
                </div>
                <div>
                    <label for="note-type" class="block text-sm font-medium text-gray-400">Note Type</label>
                    <select id="note-type" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${typeOptions}</select>
                </div>
            </div>
            <div>
                <label for="note-name" class="block text-sm font-medium text-gray-400">Note Name</label>
                <input type="text" id="note-name" value="${note.name}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
            </div>
            <div>
                <label for="note-description" class="block text-sm font-medium text-gray-400">Description</label>
                <textarea id="note-description" rows="3" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${note.description || ''}</textarea>
            </div>
            <div>
                <label for="note-url" class="block text-sm font-medium text-gray-400">URL</label>
                <input type="url" id="note-url" value="${note.url || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
            </div>
        </div>
    `;

    const footer = `<div class="flex justify-end"><button id="submit-update-note-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Save Changes</button></div>`;

    showModal('Edit Note', body, footer, (modal) => {
        modal.querySelector('#submit-update-note-btn').addEventListener('click', async () => {
            const noteData = {
                subject: modal.querySelector('#note-subject').value,
                note_type: modal.querySelector('#note-type').value,
                name: modal.querySelector('#note-name').value.trim(),
                description: modal.querySelector('#note-description').value.trim(),
                url: modal.querySelector('#note-url').value.trim(),
            };

            if (!noteData.name) {
                showStatusMessage('error', 'Note Name is required.');
                return;
            }

            showLoadingOverlay('Updating note...');
            try {
                await updateNote(note.id, noteData);
                closeModal();
                showStatusMessage('success', 'Note updated successfully.');
                await renderPage(); // Refresh the notes page
            } catch (error) {
                showStatusMessage('error', `Failed to update note: ${error.message}`);
            }
        });
    });
}
