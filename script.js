document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('page');
    const clearButton = document.getElementById('clearButton');
    const saveNotesToFileButton = document.getElementById('saveNotesToFile');
    const textBiggerButton = document.getElementById('textBiggerButton');
    const textSmallerButton = document.getElementById('textSmallerButton');
    let activeTextElement = null;
    let typingTimeout;

    // Initial setup
    initializeFontSize(); // Load and apply the saved font size

    // Event listeners for buttons
    saveNotesToFileButton.addEventListener("click", saveNotesToFile);
    textBiggerButton.addEventListener("click", increaseFontSize);
    textSmallerButton.addEventListener("click", decreaseFontSize);

    initialize();

    function initialize() {
        loadTextFromStorage();  // Load existing notes first
        displayFirstLoadMessageIfNeeded(); // Then check if the first load message should be shown
        setupEventListeners();
    }

    page.addEventListener('dragover', (event) => {
        event.preventDefault(); // Prevent default behavior that causes the bounce
    });

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
          <div class="instruction-text text-sm leading-6 text-center">
          <p class="mt-96 md:mt-16 mb-2">Click anywhere on the page</p>
          <p class="instruction-text text-center mb-6">and start typing to add a note.</p>
          
          <p class="mb-6"><span class="bg-[#ffff00]">Click drag</span> a note to move it.</p>
          
          <p class="mb-2">Click an existing note to edit or delete it.</p>
          <p class="mb-2">Press the Escape key <span class="text-red-500">(ESC)</span> to exit note editing</p>
          
          <p class="mt-8 mb-2 text-gray-500">Notes are stored on your machine only,</p>
          <p class="mb-2 text-gray-600">keeping your data private.</p>
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
    getTextEntries().forEach(entry => {
        displayText(entry.text, entry.x, entry.y, entry.id);
    });
}


    function getTextEntries() {
        return JSON.parse(localStorage.getItem('textEntries') || '[]');
    }

    function setupEventListeners() {
        page.addEventListener('click', handlePageClick);
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
        minWidth: '1ch',
        minHeight: '1em',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
        background: 'transparent',
        display: 'inline-block',
        zIndex: '1000',
    });
    cursor.contentEditable = true;
    page.appendChild(cursor);

    // Delay focus slightly for Chrome layout
    setTimeout(() => cursor.focus(), 10);

    addCursorEventListeners(cursor, x, y);
    setCursorBlurTimeout(cursor);
}


    function addCursorEventListeners(cursor, x, y) {
        cursor.addEventListener('keydown', handleCursorKeyDown);
        cursor.addEventListener('input', resetCursorBlurTimeout);
        cursor.addEventListener('blur', () => handleCursorBlur(cursor, x, y));
    }

    function handleCursorKeyDown(event) {
    switch (event.key) {
        case 'Enter':
            // Create a new line
            document.execCommand('insertLineBreak');
            event.preventDefault(); // Prevent the default behavior of Enter key
            break;

        case 'Escape':
            // End note editing
            event.preventDefault();
            this.blur();
            break;

        default:
            // No action for other keys
            break;
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
        const index = entries.findIndex(entry => entry.id === id);
        if (index !== -1) {
            entries[index].text = text;
            entries[index].x = x; // Update x coordinate
            entries[index].y = y; // Update y coordinate
        }
    } else {
        id = Date.now().toString();
        entries.push({ id, text, x, y });
    }

    localStorage.setItem('textEntries', JSON.stringify(entries));
    return id;
}


    // function updateExistingText(entries, text, id) {
    //     const index = entries.findIndex(entry => entry.id === id);
    //     if (index !== -1) entries[index].text = text;
    // }

    // function addNewText(entries, text, x, y) {
    //     const id = Date.now().toString();
    //     entries.push({ id, text, x, y });
    //     return id;
    // }

    function displayText(text, x, y, id) {
        const span = createTextElement(text, x, y, id);
        page.appendChild(span);
    }

    function createTextElement(text, x, y, id) {
    const span = document.createElement('span');
    Object.assign(span.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: '1000', // Bring the element to the front
        cursor: 'move', // Indicate draggable status
    });
    span.draggable = true; // Make the element draggable
    span.innerHTML = text.replace(/\n/g, '<br>');
    span.setAttribute('data-id', id);

    // Event listeners for dragging
    addDragEventListeners(span);

    span.addEventListener('click', handleTextClick);
    return span;
}

function addDragEventListeners(span) {
  // FOR WEB ONLY
  span.addEventListener('mousedown', (event) => {
    const initialX = event.clientX;
    const initialY = event.clientY;
    const rect = span.getBoundingClientRect();

    const onMouseMove = (moveEvent) => {
        const newX = rect.left + (moveEvent.clientX - initialX);
        const newY = rect.top + (moveEvent.clientY - initialY);
        span.style.left = `${newX}px`;
        span.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

    // USED IN ELECTRON APP - DOESN'T WORK FOR WEB
    // SEE ABOVE ALT CODE
    
    // let offsetX = 0, offsetY = 0;

    // span.addEventListener('dragstart', (event) => {
    //     offsetX = event.offsetX;
    //     offsetY = event.offsetY;
    //     span.classList.add('dragging');

    //     event.dataTransfer.setDragImage(span, offsetX, offsetY);
    // });

    // span.addEventListener('drag', (event) => {
    //     event.preventDefault(); // Prevent default browser behavior
    //     if (event.pageX !== 0 && event.pageY !== 0) { // Prevent invalid drag events
    //         const newX = event.pageX - offsetX;
    //         const newY = event.pageY - offsetY;

    //         // Dynamically update position during the drag
    //         span.style.left = `${newX}px`;
    //         span.style.top = `${newY}px`;
    //     }
    // });

    // span.addEventListener('dragend', (event) => {
    //     span.classList.remove('dragging');

    //     const newX = parseInt(span.style.left, 10);
    //     const newY = parseInt(span.style.top, 10);

    //     // Save the updated position to localStorage
    //     const id = span.getAttribute('data-id');
    //     const text = span.innerHTML.replace(/<br>/g, '\n');
    //     saveTextToStorage(text, newX, newY, id);
    // });
}


function handleTextClick(e) {
    e.stopPropagation();
    if (activeTextElement && activeTextElement !== this) {
        removeEditState(activeTextElement);
    }
    activeTextElement = this;

    // Temporarily disable dragging during editing
    this.draggable = false;

    enterEditState(this);
}


function enterEditState(textElement) {
    // textElement.classList.add('border-2', 'border-gray-400');

    // Check if a delete button already exists
    if (!textElement.querySelector('.delete-button')) {
        const deleteButton = createDeleteButton(textElement);
        textElement.appendChild(deleteButton);
    }
    makeTextEditable(textElement);

    // Remove any existing event listeners to avoid conflicts
    textElement.removeEventListener('keydown', handleTextKeyDown);
    // Re-attach the keydown listener for handling Escape key
    textElement.addEventListener('keydown', handleTextKeyDown);
}





 function makeTextEditable(textElement) {
    textElement.contentEditable = true;
    textElement.focus();

    textElement.addEventListener('keydown', handleTextKeyDown);
    textElement.addEventListener('input', resetEditBlurTimeout);
    textElement.addEventListener('blur', () => handleTextBlur(textElement));
}

function handleTextKeyDown(event) {
    if (event.key === 'Enter') {
        // Prevent the default Enter behavior to avoid unwanted form submissions
        event.preventDefault();
        // Insert a new line within the text element (editable area)
        document.execCommand('insertLineBreak');
    } else if (event.key === 'Escape') {
        // Escape exits the edit mode without saving changes
        event.preventDefault();
        removeEditState(this);
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
    const text = textElement.innerText.trim(); // Use innerText to get just the text
    if (text === "") {
        deleteTextFromStorage(textElement.getAttribute('data-id'));
        textElement.remove();
    } else {
        const id = textElement.getAttribute('data-id');
        // Save only the text, not the HTML structure
        saveTextToStorage(text, parseInt(textElement.style.left), parseInt(textElement.style.top), id);
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
    // textElement.classList.remove('border-2', 'border-gray-400');
    
    // Find and remove the delete button
    const deleteButton = textElement.querySelector('.delete-button');
    if (deleteButton) {
        deleteButton.remove();
    }

    textElement.contentEditable = false;

    // Re-enable dragging after editing
    textElement.draggable = true;

    // Remove keydown listener to avoid memory leaks
    textElement.removeEventListener('keydown', handleTextKeyDown);

    activeTextElement = null;
}



function createDeleteButton(textElement) {
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<span>X</span>'; // Keep the span for styling if necessary
    deleteButton.setAttribute('type', 'button');
    deleteButton.setAttribute('contentEditable', 'false'); // Ensure the button is not editable
    deleteButton.style.userSelect = 'none'; // Prevent text selection
    deleteButton.className = 'absolute -top-7 -right-5 text-red-500 p-1 rounded-full select-none delete-button'; // Apply `delete-button` class here
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










    function saveNotesToFile() {
    // Get data from localStorage
    const notesData = JSON.parse(localStorage.getItem('textEntries') || '[]');

    // Check if there's any data to save
    if (notesData.length === 0) {
        alert('No notes available to save.');
        return;
    }

    // Create a Blob object with the notes data (id, coordinates, text etc)
    // const blob = new Blob([notesData], { type: 'text/plain' });
    
    // Extract the text from each note and join them with line breaks
    const notesText = notesData.map(note => note.text).join('\n\n');
    const blob = new Blob([notesText], { type: 'text/plain' });

    // Create a temporary anchor element to download the file
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notes.txt'; // Set the desired file name
    document.body.appendChild(a); // Append the anchor to the body

    // Trigger the download
    a.click();

    // Clean up by removing the temporary anchor
    document.body.removeChild(a);
}


});

