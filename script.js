document.addEventListener('DOMContentLoaded', function() {
    const page = document.getElementById('page');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    let cursorTimeout;
    let typingTimeout;
    let editTimeout;
    let activeTextElement = null;

    // Load text from localStorage
    loadText();

    page.addEventListener('click', function(e) {
        if (activeTextElement) {
            removeEditState(activeTextElement);
        }
        createCursor(e.pageX, e.pageY);
    });

    saveButton.addEventListener('click', function() {
        saveToFile();
    });

    clearButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete all data?')) {
            clearAll();
        }
    });

    function createCursor(x, y) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor';
        cursor.contentEditable = true;
        cursor.style.position = 'absolute';
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.whiteSpace = 'pre-wrap'; // Preserve white space and line breaks
        page.appendChild(cursor);
        cursor.focus();

        cursor.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Prevent adding a new line
                cursor.blur();
            } else if (event.key === 'Enter' && event.shiftKey) {
                document.execCommand('insertLineBreak'); // Insert line break
                event.preventDefault(); // Prevent default action
            }
        });

        cursor.addEventListener('input', function() {
            clearTimeout(typingTimeout);
            clearTimeout(cursorTimeout);

            // Start a new timeout when user stops typing
            typingTimeout = setTimeout(() => {
                cursor.blur();
            }, 2000);
        });

        cursor.addEventListener('blur', function() {
            if (cursor.innerText.trim() !== "") {
                const textId = saveText(cursor.innerText.trim(), x, y);
                displayText(cursor.innerText.trim(), x, y, textId);
            }
            cursor.remove();
        });

        // Start the timeout for cursor disappearance
        typingTimeout = setTimeout(() => {
            cursor.blur();
        }, 2000);
    }

    function saveText(text, x, y, id = null) {
        const entries = JSON.parse(localStorage.getItem('textEntries') || '[]');
        if (id) {
            // Update existing text
            const index = entries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                entries[index].text = text;
            }
        } else {
            // Add new text
            id = Date.now().toString(); // Unique ID based on timestamp
            entries.push({ id, text, x, y });
        }
        localStorage.setItem('textEntries', JSON.stringify(entries));
        return id;
    }

    function displayText(text, x, y, id) {
        const span = document.createElement('span');
        span.style.position = 'absolute';
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        span.innerHTML = text.replace(/\n/g, '<br>');  // Handle line breaks
        span.setAttribute('data-id', id);
        span.classList.add('relative', 'group');

        // Add event listener for showing delete button and border
        span.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent click from propagating to the page
            if (activeTextElement && activeTextElement !== span) {
                removeEditState(activeTextElement);
            }
            activeTextElement = span;
            addEditState(span);
        });

        page.appendChild(span);
    }

    function addEditState(textElement) {
        textElement.classList.add('border-2', 'border-gray-400');
        const deleteButton = createDeleteButton(textElement);
        textElement.appendChild(deleteButton);
        makeEditable(textElement);

        // Start the edit timeout
        editTimeout = setTimeout(() => {
            if (activeTextElement === textElement) {
                removeEditState(textElement);
            }
        }, 5000);
    }

    function removeEditState(textElement) {
        clearTimeout(editTimeout);
        textElement.classList.remove('border-2', 'border-gray-400');
        const deleteButton = textElement.querySelector('.delete-button');
        if (deleteButton) {
            deleteButton.remove();
        }
        textElement.contentEditable = false;
        activeTextElement = null;
    }

    function makeEditable(textElement) {
        textElement.contentEditable = true;
        textElement.focus();

        textElement.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault(); // Prevent adding a new line
                // Save the text and remove the edit state immediately
                if (textElement.innerText.trim() !== "") {
                    const id = textElement.getAttribute('data-id');
                    const formattedText = textElement.innerHTML.replace(/<br>/g, '\n');
                    saveText(formattedText, parseInt(textElement.style.left), parseInt(textElement.style.top), id);
                }
                removeEditState(textElement); // Remove border and delete button
            } else if (event.key === 'Enter' && event.shiftKey) {
                document.execCommand('insertLineBreak'); // Insert line break
                event.preventDefault(); // Prevent default action
            }
        });

        textElement.addEventListener('input', function() {
            clearTimeout(editTimeout);

            // Reset the edit timeout
            editTimeout = setTimeout(() => {
                if (activeTextElement === textElement) {
                    removeEditState(textElement);
                }
            }, 5000);
        });

        textElement.addEventListener('blur', function() {
            if (!textElement.classList.contains('pending-delete')) {
                if (textElement.innerText.trim() !== "") {
                    const id = textElement.getAttribute('data-id');
                    const formattedText = textElement.innerHTML.replace(/<br>/g, '\n');
                    saveText(formattedText, parseInt(textElement.style.left), parseInt(textElement.style.top), id);
                } else {
                    // Handle case where the text is empty
                    removeEditState(textElement); // Remove edit state if text is empty
                }
            }
        });
    }

    function createDeleteButton(textElement) {
        let deleteButton = textElement.querySelector('.delete-button');
        if (!deleteButton) {
            deleteButton = document.createElement('button');
            deleteButton.textContent = 'X';
            deleteButton.className = 'delete-button absolute -top-5 -right-5 bg-red-500 text-white px-2 py-0 rounded-full';
            
            // Prevent blur when clicking the delete button
            deleteButton.addEventListener('mousedown', function(event) {
                event.stopPropagation(); // Prevent triggering the click on the text itself
                event.preventDefault();  // Prevent the blur event from firing
            });

            deleteButton.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent triggering the click on the text itself
                if (confirm('Are you sure you want to delete this entry?')) {
                    deleteText(textElement.getAttribute('data-id'));
                    textElement.remove();
                    removeEditState(textElement); // Ensure edit state is removed
                }
            });
        }
        return deleteButton;
    }

    function loadText() {
        const entries = JSON.parse(localStorage.getItem('textEntries') || '[]');
        entries.forEach(entry => {
            displayText(entry.text, entry.x, entry.y, entry.id);
        });
    }

    function deleteText(id) {
        let entries = JSON.parse(localStorage.getItem('textEntries') || '[]');
        entries = entries.filter(entry => entry.id !== id);
        localStorage.setItem('textEntries', JSON.stringify(entries));
    }

    function saveToFile() {
        const entries = JSON.parse(localStorage.getItem('textEntries') || '[]');
        const textContent = entries.map(entry => entry.text).join('\n\n'); // Add two line breaks between notes
        const blob = new Blob([textContent], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'smash_note.txt';
        a.click();
    }

    function clearAll() {
        localStorage.removeItem('textEntries');
        page.innerHTML = '';
    }
});
