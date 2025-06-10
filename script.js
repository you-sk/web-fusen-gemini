// --- グローバル変数と設定 ---
const notesContainer = document.getElementById('app');
const addNoteBtn = document.getElementById('add-note-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const confirmModal = document.getElementById('confirm-modal');
const confirmImportBtn = document.getElementById('confirm-import-btn');
const cancelImportBtn = document.getElementById('cancel-import-btn');

const LOCAL_STORAGE_KEY = 'stickyNotesApp.notes';
let notes = {};
let notesDataForImport = null;
let zIndexCounter = 1; // Z-indexを管理するためのカウンター
const NOTE_WIDTH = 250;
const NOTE_HEIGHT = 250;

const colors = [
    'bg-yellow-200', 'bg-green-200', 'bg-blue-200', 
    'bg-pink-200', 'bg-purple-200', 'bg-indigo-200', 'bg-red-200', 'bg-gray-200'
];

// --- データ永続化 ---
function loadNotesFromLocalStorage() {
    const savedNotes = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedNotes ? JSON.parse(savedNotes) : {};
}

function saveNotesToLocalStorage() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
}

// --- DOM操作 & 状態更新 ---
function renderAllNotes() {
    zIndexCounter = 1; 
    notesContainer.innerHTML = '';
    // updatedAtが古い順にソートして、z-indexを正しく積み上げる
    Object.values(notes)
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .forEach(note => {
            const existingEl = document.getElementById(note.id);
            if (existingEl) {
                notesContainer.removeChild(existingEl);
            }
            createNoteElement(note);
        });
}

function createNoteElement(note) {
    if (document.getElementById(note.id)) return;
    const noteEl = document.createElement('div');
    noteEl.id = note.id;
    noteEl.className = `sticky-note ${note.color || 'bg-yellow-200'}`;
    noteEl.style.left = `${note.position.x}px`;
    noteEl.style.top = `${note.position.y}px`;
    noteEl.style.zIndex = zIndexCounter++; 

    const header = document.createElement('div');
    header.className = 'note-header';
    
    const contentArea = document.createElement('div');
    contentArea.className = 'note-content-area';

    noteEl.addEventListener('mousedown', () => bringToFront(noteEl), false);

    const colorButton = document.createElement('button');
    colorButton.className = 'text-gray-500 hover:text-black transition-colors';
    colorButton.innerHTML = '<i class="fas fa-palette"></i>';
    const colorPalette = createColorPalette(note.id);
    const paletteWrapper = document.createElement('div');
    paletteWrapper.className = 'relative';
    paletteWrapper.appendChild(colorButton);
    paletteWrapper.appendChild(colorPalette);
    colorButton.onclick = (e) => { e.stopPropagation(); colorPalette.style.display = colorPalette.style.display === 'grid' ? 'none' : 'grid'; };
    document.addEventListener('click', (e) => { if (!paletteWrapper.contains(e.target)) { colorPalette.style.display = 'none'; } });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'text-gray-500 hover:text-red-500 transition-colors';
    deleteButton.innerHTML = '<i class="fas fa-times"></i>';
    deleteButton.onclick = (e) => { e.stopPropagation(); deleteNote(note.id); };
    
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'flex items-center space-x-2';
    buttonsWrapper.appendChild(paletteWrapper);
    buttonsWrapper.appendChild(deleteButton);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'note-textarea';
    textarea.value = note.content || '';
    textarea.placeholder = 'メモを入力...';
    textarea.addEventListener('blur', () => { updateNote(note.id, { content: textarea.value }); });
    
    const timestampEl = document.createElement('div');
    timestampEl.className = 'note-timestamp';
    timestampEl.textContent = formatTimestamp(note.updatedAt);
    
    header.appendChild(buttonsWrapper);
    contentArea.appendChild(textarea);
    contentArea.appendChild(timestampEl);
    noteEl.appendChild(header);
    noteEl.appendChild(contentArea);
    notesContainer.appendChild(noteEl);
    makeDraggable(noteEl, header);
}

function updateNoteElement(note) {
    const noteEl = document.getElementById(note.id);
    if (!noteEl) return;
    noteEl.style.left = `${note.position.x}px`;
    noteEl.style.top = `${note.position.y}px`;
    noteEl.className = `sticky-note ${note.color}`;
    const textarea = noteEl.querySelector('.note-textarea');
    if (document.activeElement !== textarea) { textarea.value = note.content; }
    const timestampEl = noteEl.querySelector('.note-timestamp');
    timestampEl.textContent = formatTimestamp(note.updatedAt);
}

function createColorPalette(noteId) {
    const palette = document.createElement('div');
    palette.className = 'color-palette';
    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = `color-swatch ${color}`;
        swatch.onclick = (e) => { e.stopPropagation(); updateNote(noteId, { color: color }); };
        palette.appendChild(swatch);
    });
    return palette;
}

// --- アプリケーションロジック ---
function addNewNote() {
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const containerRect = notesContainer.getBoundingClientRect();
    const randomX = Math.floor(Math.random() * (containerRect.width - NOTE_WIDTH));
    const randomY = Math.floor(Math.random() * (containerRect.height - NOTE_HEIGHT));
    const newNote = { id: newId, content: '', position: { x: randomX, y: randomY }, color: randomColor, createdAt: now, updatedAt: now };
    notes[newId] = newNote;
    createNoteElement(newNote); 
    saveNotesToLocalStorage();
}

// ★★★ 修正点: 更新ロジックを分離 ★★★
function updateNote(id, data) {
    if (!notes[id]) return;
    
    const originalNote = notes[id];
    const updatedNote = { ...originalNote, ...data };
    
    // テキストコンテンツが実際に変更された場合のみ、更新日時を更新
    if (data.hasOwnProperty('content') && originalNote.content !== updatedNote.content) {
        updatedNote.updatedAt = new Date().toISOString();
    } else if (data.hasOwnProperty('color') || data.hasOwnProperty('position')) {
         // 色や位置の変更では更新日時を変更しない
    }

    notes[id] = updatedNote;
    updateNoteElement(updatedNote);
    saveNotesToLocalStorage();
}

function bringToFront(element) {
    if (!element) return;
    element.style.zIndex = ++zIndexCounter;
    saveNotesToLocalStorage();
}

function deleteNote(id) {
    const noteEl = document.getElementById(id);
    if (noteEl) noteEl.remove();
    delete notes[id];
    saveNotesToLocalStorage();
}

// --- ドラッグ＆ドロップ ---
function makeDraggable(element, header) {
    const onMouseDown = (e) => {
        if (!header.contains(e.target)) return;
        e.preventDefault();
        
        bringToFront(element);
        element.classList.add('is-dragging');
        const containerRect = notesContainer.getBoundingClientRect();

        const offsetX = e.clientX - element.offsetLeft;
        const offsetY = e.clientY - element.offsetTop;
        
        const onMouseMove = (moveEvent) => {
            let newX = moveEvent.clientX - offsetX;
            let newY = moveEvent.clientY - offsetY;
            
            newX = Math.max(0, Math.min(newX, containerRect.width - NOTE_WIDTH));
            newY = Math.max(0, Math.min(newY, containerRect.height - NOTE_HEIGHT));
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };

        const onMouseUp = (upEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            element.classList.remove('is-dragging');

            if (upEvent.clientX === e.clientX && upEvent.clientY === e.clientY) {
                return;
            }

            updateNote(element.id, { position: { x: parseInt(element.style.left), y: parseInt(element.style.top) } });
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    
    header.addEventListener('mousedown', onMouseDown);
}

// --- ユーティリティ ---
function formatTimestamp(isoString) {
    if (!isoString) return '...'; const date = new Date(isoString);
    return `${date.getFullYear()}/${('0' + (date.getMonth() + 1)).slice(-2)}/${('0' + date.getDate()).slice(-2)} ${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}`;
}

function adjustNotePosition(note) {
    const containerRect = notesContainer.getBoundingClientRect();
    let changed = false;
    if (note.position.x > containerRect.width - NOTE_WIDTH) {
        note.position.x = containerRect.width - NOTE_WIDTH - 20; changed = true;
    } else if (note.position.x < 0) {
        note.position.x = 20; changed = true;
    }
    if (note.position.y > containerRect.height - NOTE_HEIGHT) {
        note.position.y = containerRect.height - NOTE_HEIGHT - 20; changed = true;
    } else if (note.position.y < 0) {
        note.position.y = 20; changed = true;
    }
    return changed;
}

function handleResize() {
    let needsUpdate = false;
    Object.values(notes).forEach(note => {
        if (adjustNotePosition(note)) { needsUpdate = true; }
    });
    if (needsUpdate) {
        renderAllNotes();
        saveNotesToLocalStorage();
    }
}

// --- インポート/エクスポート ---
function exportNotes() {
    const dataStr = JSON.stringify(Object.values(notes), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `stickynotes-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function hideImportModal() {
    notesDataForImport = null;
    importFile.value = '';
    confirmModal.style.display = 'none';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error('Invalid JSON format');
            notesDataForImport = importedData;
            confirmModal.style.display = 'flex';
        } catch (err) {
            console.error("Import file read failed:", err);
            alert('ファイルの読み込みに失敗しました。有効なJSONファイルを選択してください。');
        }
    };
    reader.readAsText(file);
}

function performImport(notesToImport) {
    const newNotes = {};
    notesToImport.forEach(note => {
        const id = note.id || crypto.randomUUID();
        adjustNotePosition(note);
        newNotes[id] = { ...note, id };
    });
    notes = newNotes;
    renderAllNotes();
    saveNotesToLocalStorage();
}

// --- 初期化処理 ---
function initialize() {
    addNoteBtn.addEventListener('click', addNewNote);
    exportBtn.addEventListener('click', exportNotes);
    importFile.addEventListener('change', handleFileSelect);
    confirmImportBtn.addEventListener('click', () => {
        if (notesDataForImport) performImport(notesDataForImport);
        hideImportModal();
    });
    cancelImportBtn.addEventListener('click', hideImportModal);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 100);
    });

    importFile.value = '';
    notes = loadNotesFromLocalStorage();
    renderAllNotes();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
