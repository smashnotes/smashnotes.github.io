document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('page');
    const clearButton = document.getElementById('clearButton');
    const textColorButton = document.getElementById('textColorButton');
    const textBiggerButton = document.getElementById('textBiggerButton');
    const textSmallerButton = document.getElementById('textSmallerButton');
    let activeTextElement = null;
    let typingTimeout;

    // Initial setup
    initializeFontSize(); // Load and apply the saved font size
    initializeTextColor(); // Set up initial text color and button state

    // Event listeners for buttons
    textColorButton.addEventListener("click", toggleTextColor);
    textBiggerButton.addEventListener("click", increaseFontSize);
    textSmallerButton.addEventListener("click", decreaseFontSize);

    initialize();

    function initialize() {
        loadTextFromStorage();  // Load existing notes first
        displayFirstLoadMessageIfNeeded(); // Then check if the first load message should be shown
        setupEventListeners();
    }

    // Font size functions
    function initializeFontSize() {
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            page.style.fontSize = savedFontSize;
        } else {
            page.style.fontSize = '16px'; // Default font size
        }
    }

    function increaseFontSize() {
        changeFontSize(2);
    }

    function decreaseFontSize() {
        changeFontSize(-2);
    }

    function changeFontSize(amount) {
        const currentFontSize = parseInt(window.getComputedStyle(page).fontSize);
        const newFontSize = currentFontSize + amount;
        page.style.fontSize = newFontSize + "px";
        localStorage.setItem('fontSize', newFontSize + "px"); // Save the new font size to localStorage
    }

    // Text color functions
    function initializeTextColor() {
        document.body.style.color = "black";
        textColorButton.innerText = "Red Text";
        textColorButton.classList.add("bg-red-500", "text-white");
    }

    function toggleTextColor() {
        const currentColor = document.body.style.color;

        if (currentColor === "red") {
            document.body.style.color = "black";
            textColorButton.innerText = "Red Text";
            textColorButton.classList.remove("bg-black");
            textColorButton.classList.add("bg-red-500");
        } else {
            document.body.style.color = "red";
            textColorButton.innerText = "Black Text";
            textColorButton.classList.remove("bg-red-500");
            textColorButton.classList.add("bg-black");
        }
    }

    function displayFirstLoadMessageIfNeeded() {
        if (getTextEntries().length === 0) {
            showFirstLoadMessage();
        } else {
            removeFirstLoadMessage(); // Ensure the first load message is removed if there are entries
        }
    }

    function showFirstLoadMessage() {
        if (!document.querySelector('.first-load-message')) { // Ensure we don't duplicate the message
            const message = createMessageElement();
            page.appendChild(message);
            removeMessageOnFirstClick(message);
        }
    }

    function removeFirstLoadMessage() {
        const message = document.querySelector('.first-load-message');
        if (message) {
            message.remove();
        }
    }

    function createMessageElement() {
        const message = document.createElement('div');
        message.className = 'first-load-message';
        Object.assign(message.style, {
            position: 'absolute',
            left: '50%',
            top: '25%',
            transform: 'translate(-50%, -50%)',
            padding: '0px',
            zIndex: '1000',
            width: '98%'
        });
      message.innerHTML = `
        <div class="instruction-text text-center">
          <p class="mb-2">Click anywhere on the page</p>
          <p class="instruction-text text-center mb-2">and start typing to add a note.</p>
          
          <p class="mb-2">Click an existing note to edit or delete it.</p>
          <p class="mb-2">Use Shift + Enter to add line breaks in notes.</p>
          
          <p class="mt-8 mb-2 text-gray-300">Notes are stored on your machine only,</p>
          <p class="mb-2 text-gray-300">keeping your data private.</p>

          <p class="mt-16 text-gray-400">If you like this app you can support us</p>
          <p class="text-gray-400">by playing: <a href="https://open.spotify.com/artist/66OsKKYin7yLMQUsZxjE91" target="_blank"><span class="text-gray-600">Matthew via Music</span></a> on Spotify.</p>
        </div>`;
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
        getTextEntries().forEach(entry => displayText(entry.text, entry.x, entry.y, entry.id));
    }

    function getTextEntries() {
        return JSON.parse(localStorage.getItem('textEntries') || '[]');
    }

    function setupEventListeners() {
        page.addEventListener('click', handlePageClick);
        clearButton.addEventListener('click', clearAll);
        saveButton.addEventListener('click', saveToFile);
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
        typingTimeout = setTimeout(() => this.blur(), 5000);
    }

    function setCursorBlurTimeout(cursor) {
        typingTimeout = setTimeout(() => cursor.blur(), 5000);
    }

    function handleCursorBlur(cursor, x, y) {
        const text = cursor.innerText.trim();
        if (text !== "") {
            const textId = saveTextToStorage(text, x, y);
            displayText(text, x, y, textId);
        }
        cursor.remove();
        displayFirstLoadMessageIfNeeded(); // Check if the first load message should be shown after editing
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

        // Start the blur timeout when entering the edit state
        // setEditBlurTimeout(textElement);
    }

    function makeTextEditable(textElement) {
        textElement.contentEditable = true;
        textElement.focus();

        textElement.addEventListener('keydown', handleTextKeyDown);
        textElement.addEventListener('input', resetEditBlurTimeout);
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

    function resetEditBlurTimeout() {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => saveTextAndExitEditState(this), 5000);
    }

    // function setEditBlurTimeout(textElement) {
    //     typingTimeout = setTimeout(() => saveTextAndExitEditState(textElement), 5000);
    // }

    function saveTextAndExitEditState(textElement) {
        const text = textElement.innerText.trim();
        if (text === "") {
            deleteTextFromStorage(textElement.getAttribute('data-id'));
            textElement.remove();
        } else {
            const id = textElement.getAttribute('data-id');
            const formattedText = textElement.innerHTML.replace(/<br>/g, '\n');
            saveTextToStorage(formattedText, parseInt(textElement.style.left), parseInt(textElement.style.top), id);
        }
        removeEditState(textElement);
        displayFirstLoadMessageIfNeeded(); // Check if the first load message should be shown after saving
    }

    function handleTextBlur(textElement) {
        if (!textElement.classList.contains('pending-delete')) {
            saveTextAndExitEditState(textElement);
        }
    }

    function removeEditState(textElement) {
        textElement.classList.remove('border-2', 'border-gray-400');
        const deleteButton = textElement.querySelector('.delete-button');
        if (deleteButton) deleteButton.remove();
        textElement.contentEditable = false;
        activeTextElement = null;
    }

    function createDeleteButton(textElement) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'X';
        deleteButton.className = 'delete-button absolute -top-7 -right-5 text-red-500 p-1 rounded-full select-none';
        deleteButton.setAttribute('type', 'button');
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


    function clearAll() {
      if(getTextEntries().length > 0){
        if (confirm('Are you sure you want to delete all data?')) {
            localStorage.removeItem('textEntries');
            page.innerHTML = '';
            displayFirstLoadMessageIfNeeded(); // Ensure the first load message appears if everything is cleared
          }
      } else{
        confirm('There is nothing to clear, except your mind :)')
      }
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

});

