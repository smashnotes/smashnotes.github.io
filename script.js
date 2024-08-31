document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('page');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    let activeTextElement = null;
    let typingTimeout, editTimeout;

    initialize();

    function initialize() {
        loadTextFromStorage();  // Load existing notes first
        displayFirstLoadMessageIfNeeded(); // Then check if the first load message should be shown
        setupEventListeners();
    }

    function displayFirstLoadMessageIfNeeded() {
        const entries = getTextEntries();
        if (entries.length === 0) {
            showFirstLoadMessage();
        }
    }

    function showFirstLoadMessage() {
        if (!document.querySelector('.first-load-message')) { // Ensure we don't duplicate the message
            const message = createMessageElement();
            page.appendChild(message);
            removeMessageOnFirstClick(message);
        }
    }

    function createMessageElement() {
        const message = document.createElement('div');
        message.className = 'first-load-message';
        Object.assign(message.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px',
            zIndex: '1000'
        });
        message.innerHTML = `<p class="text-center -mt-16 mb-2">Click anywhere on the page and start typing to add your notes.</p><p class="text-center">Click an existing note to edit or delete it.</p>`;
        return message;
    }

    function removeMessageOnFirstClick(message) {
        const removeMessage = () => {
            message.remove();
            page.removeEventListener('click', removeMessage);
        };
        page.addEventListener('click', removeMessage);
    }

    function loadTextFromStorage() {
        const entries = getTextEntries();
        entries.forEach(entry => displayText(entry.text, entry.x, entry.y, entry.id));
    }

    function getTextEntries() {
        return JSON.parse(localStorage.getItem('textEntries') || '[]');
    }

    function setupEventListeners() {
        page.addEventListener('click', handlePageClick);
        saveButton.addEventListener('click', saveToFile);
        clearButton.addEventListener('click', clearAll);
    }

    function handlePageClick(e) {
        if (activeTextElement) {
            removeEditState(activeTextElement);
        }
        createTextCursor(e.pageX, e.pageY);
    }

    function createTextCursor(x, y) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor';
        Object.assign(cursor.style, {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            whiteSpace: 'pre-wrap'
        });
        cursor.contentEditable = true;
        page.appendChild(cursor);
        cursor.focus();

        addCursorEventListeners(cursor, x, y);
        setCursorBlurTimeout(cursor);
    }

    function addCursorEventListeners(cursor, x, y) {
        cursor.addEventListener('keydown', handleCursorKeyDown);
        cursor.addEventListener('input', resetCursorBlurTimeout);
        cursor.addEventListener('blur', () => handleCursorBlur(cursor, x, y));
    }

    function handleCursorKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.blur();
        } else if (event.key === 'Enter' && event.shiftKey) {
            document.execCommand('insertLineBreak');
            event.preventDefault();
        }
    }

    function resetCursorBlurTimeout() {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => this.blur(), 2000);
    }

    function setCursorBlurTimeout(cursor) {
        typingTimeout = setTimeout(() => cursor.blur(), 2000);
    }

    function handleCursorBlur(cursor, x, y) {
        if (cursor.innerText.trim() !== "") {
            const textId = saveTextToStorage(cursor.innerText.trim(), x, y);
            displayText(cursor.innerText.trim(), x, y, textId);
        }
        cursor.remove();
    }

    function saveTextToStorage(text, x, y, id = null) {
        const entries = getTextEntries();
        if (id) {
            updateExistingText(entries, text, id);
        } else {
            id = addNewText(entries, text, x, y);
        }
        localStorage.setItem('textEntries', JSON.stringify(entries));
        return id;
    }

    function updateExistingText(entries, text, id) {
        const index = entries.findIndex(entry => entry.id === id);
        if (index !== -1) entries[index].text = text;
    }

    function addNewText(entries, text, x, y) {
        const id = Date.now().toString();
        entries.push({ id, text, x, y });
        return id;
    }

    function displayText(text, x, y, id) {
        const span = createTextElement(text, x, y, id);
        page.appendChild(span);
    }

    function createTextElement(text, x, y, id) {
        const span = document.createElement('span');
        Object.assign(span.style, {
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`
        });
        span.innerHTML = text.replace(/\n/g, '<br>');
        span.setAttribute('data-id', id);
        span.classList.add('relative', 'group');
        span.addEventListener('click', handleTextClick);
        return span;
    }

    function handleTextClick(e) {
        e.stopPropagation();
        if (activeTextElement && activeTextElement !== this) {
            removeEditState(activeTextElement);
        }
        activeTextElement = this;
        enterEditState(this);
    }

    function enterEditState(textElement) {
        textElement.classList.add('border-2', 'border-gray-400');
        const deleteButton = createDeleteButton(textElement);
        textElement.appendChild(deleteButton);
        makeTextEditable(textElement);
        startEditTimeout(textElement);
    }

    function makeTextEditable(textElement) {
        textElement.contentEditable = true;
        textElement.focus();

        textElement.addEventListener('keydown', handleTextKeyDown);
        textElement.addEventListener('input', resetEditTimeout);
        textElement.addEventListener('blur', () => handleTextBlur(textElement));
    }

    function handleTextKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            saveTextAndExitEditState(this);
        } else if (event.key === 'Enter' && event.shiftKey) {
            document.execCommand('insertLineBreak');
            event.preventDefault();
        }
    }

    function saveTextAndExitEditState(textElement) {
        if (textElement.innerText.trim() !== "") {
            const id = textElement.getAttribute('data-id');
            const formattedText = textElement.innerHTML.replace(/<br>/g, '\n');
            saveTextToStorage(formattedText, parseInt(textElement.style.left), parseInt(textElement.style.top), id);
        }
        removeEditState(textElement);
    }

    function resetEditTimeout() {
        clearTimeout(editTimeout);
        startEditTimeout(this);
    }

    function startEditTimeout(textElement) {
        editTimeout = setTimeout(() => {
            if (activeTextElement === textElement) {
                removeEditState(textElement);
            }
        }, 5000);
    }

    function handleTextBlur(textElement) {
        if (!textElement.classList.contains('pending-delete') && textElement.innerText.trim() !== "") {
            saveTextAndExitEditState(textElement);
        } else {
            removeEditState(textElement);
        }
    }

    function removeEditState(textElement) {
        clearTimeout(editTimeout);
        textElement.classList.remove('border-2', 'border-gray-400');
        const deleteButton = textElement.querySelector('.delete-button');
        if (deleteButton) deleteButton.remove();
        textElement.contentEditable = false;
        activeTextElement = null;
    }

    function createDeleteButton(textElement) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete-button absolute -top-5 -right-5 bg-red-500 text-white px-2 py-0 rounded-full';
        deleteButton.addEventListener('mousedown', preventBlur);
        deleteButton.addEventListener('click', () => handleDeleteClick(textElement));
        return deleteButton;
    }

    function preventBlur(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    function handleDeleteClick(textElement) {
        if (confirm('Are you sure you want to delete this entry?')) {
            deleteTextFromStorage(textElement.getAttribute('data-id'));
            textElement.remove();
            removeEditState(textElement);
            displayFirstLoadMessageIfNeeded(); // Check if the first load message should be shown after deletion
        }
    }

    function deleteTextFromStorage(id) {
        const entries = getTextEntries().filter(entry => entry.id !== id);
        localStorage.setItem('textEntries', JSON.stringify(entries));
    }

    function saveToFile() {
        const entries = getTextEntries();
        const textContent = entries.map(entry => entry.text).join('\n\n');
        const blob = new Blob([textContent], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'smash_note.txt';
        a.click();
    }

    function clearAll() {
        if (confirm('Are you sure you want to delete all data?')) {
            localStorage.removeItem('textEntries');
            localStorage.removeItem('firstLoadMessageShown');
            page.innerHTML = '';
            displayFirstLoadMessageIfNeeded(); // Ensure the first load message appears if everything is cleared
        }
    }
});
