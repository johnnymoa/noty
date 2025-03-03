(function() {
    // Helper functions
    function getParameterByName(name) {
      const url = window.location.href;
      const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
      const results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    function generateNoteId() {
      return 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function updatePageTitle(title) {
      document.title = title ? title + ' - Noty' : 'Noty';
    }

    // Format a timestamp to a human-readable date
    function formatDate(timestamp) {
      if (!timestamp) return 'Unknown date';
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Format date as DD/MM/YYYY or time in HH:MM format for today
    function getRelativeTime(timestamp) {
      if (!timestamp) return 'Unknown';
      
      const date = new Date(timestamp);
      const today = new Date();
      
      // Check if it's today
      if (date.getDate() === today.getDate() && 
          date.getMonth() === today.getMonth() && 
          date.getFullYear() === today.getFullYear()) {
        // Return time in 24-hour format for today
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      
      // Format as DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }

    // Show a toast notification
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Animate in
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      // Remove after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    }

    let noteId = getParameterByName('noteId');
    let isNewNote = false;
    let sortPreference = localStorage.getItem('noty_sort_preference') || 'created'; // Default sort by creation date

    // DOM elements
    const noteTitle = document.getElementById('noteTitle');
    const noteContent = document.getElementById('noteContent');
    const sidebar = document.getElementById('sidebar');
    const notebook = document.getElementById('notebook');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const noteList = document.getElementById('noteList');
    const exportNotesBtn = document.getElementById('exportNotes');
    const importNotesBtn = document.getElementById('importNotes');
    const importNotesInput = document.getElementById('importNotesInput');
    const deleteAllNotesBtn = document.getElementById('deleteAllNotes');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const sortOptions = document.querySelectorAll('.sort-option');

    // Set active sort option based on preference
    document.querySelector(`.sort-option[data-sort="${sortPreference}"]`).classList.add('active');
    document.querySelector(`.sort-option[data-sort="${sortPreference === 'created' ? 'updated' : 'created'}"]`).classList.remove('active');

    // Add event listeners to sort options
    sortOptions.forEach(option => {
      option.addEventListener('click', function() {
        // Update UI
        sortOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Save preference
        sortPreference = this.dataset.sort;
        localStorage.setItem('noty_sort_preference', sortPreference);
        
        // Reload notes list with new sorting
        loadNotesList();
      });
    });

    // Check if this is the first time using the app
    if (!localStorage.getItem('noty_welcomed') && Object.keys(localStorage).filter(key => key.startsWith('note-')).length === 0) {
      // Set welcome flag
      localStorage.setItem('noty_welcomed', 'true');
      
      // Show the welcome modal instead of creating a welcome note
      showHelpModal();
    }
    
    // Set initial notebook class based on sidebar visibility
    if (sidebar.classList.contains('hidden') || sidebar.classList.contains('auto-hidden')) {
      notebook.classList.add('full-width');
    }

    // Check if we have a note ID in the URL
    if (noteId) {
      // Try to load the note
      const savedNote = JSON.parse(localStorage.getItem(noteId));
      if (savedNote) {
        // Note exists, load it
        noteTitle.value = savedNote.title || '';
        noteContent.value = savedNote.content || '';
        updatePageTitle(savedNote.title);
        
        // Update note with timestamps if they don't exist (backward compatibility)
        if (!savedNote.created || !savedNote.updated) {
          // For old notes, use the existing timestamp for both timestamps
          // or create new timestamps if none exist
          const now = Date.now();
          savedNote.created = savedNote.created || savedNote.timestamp || now;
          savedNote.updated = savedNote.updated || savedNote.timestamp || now;
          
          // Save the updated note with timestamps
          localStorage.setItem(noteId, JSON.stringify(savedNote));
        }
      } else {
        // Note ID in URL doesn't exist, redirect to root
        window.location.href = window.location.pathname;
        return; // Stop execution since we're redirecting
      }
    } else {
      // No note ID in URL - we're at the root
      // Just set empty values but don't create a note yet
      noteTitle.value = '';
      noteContent.value = '';
      updatePageTitle('');
      isNewNote = true;
    }

    // Save note content to localStorage on input
    function saveNote() {
      // If we're at the root with no note ID and this is the first edit, create a new note
      if (isNewNote) {
        // Generate a new note ID
        noteId = generateNoteId();
        
        const now = Date.now();
        // Save the note data immediately with both timestamps
        const noteData = {
          title: noteTitle.value,
          content: noteContent.value,
          created: now,
          updated: now
        };
        localStorage.setItem(noteId, JSON.stringify(noteData));
        
        // Update URL
        history.replaceState(null, '', '?noteId=' + noteId);
        isNewNote = false;
        
        // Make the sidebar visible to show the new note (on desktop)
        if (window.innerWidth > 768) {
          sidebar.classList.remove('hidden');
          sidebar.classList.remove('auto-hidden');
          notebook.classList.remove('full-width');
          toggleSidebar.classList.add('active');
        } else {
          // On mobile, briefly show the sidebar then hide it
          sidebar.classList.remove('hidden');
          sidebar.classList.remove('auto-hidden');
          notebook.classList.remove('full-width');
          toggleSidebar.classList.add('active');
          
          setTimeout(() => {
            sidebar.classList.add('hidden');
            notebook.classList.add('full-width');
            toggleSidebar.classList.remove('active');
          }, 2000);
        }
        
        // Force rebuild of the notes list to include the new note
        loadNotesList();
        
        // Show a confirmation toast
        showToast('New note created!', 'info');
      } else {
        // Get the existing note to preserve creation date
        const existingNote = JSON.parse(localStorage.getItem(noteId));
        
        // Regular save for existing note
        const noteData = {
          title: noteTitle.value,
          content: noteContent.value,
          created: existingNote.created || existingNote.timestamp || Date.now(), // Backward compatibility
          updated: Date.now()
        };
        localStorage.setItem(noteId, JSON.stringify(noteData));
        
        // Update the sidebar notes list if sorting by update time or if the sidebar is visible
        if (sortPreference === 'updated' || (!sidebar.classList.contains('hidden') && !sidebar.classList.contains('auto-hidden'))) {
          // Refresh the entire notes list to ensure proper sorting and updated timestamps
          loadNotesList();
        } else {
          // Just update the title if we're not refreshing the entire list
          const activeNoteLink = document.querySelector('#noteList li.active a');
          if (activeNoteLink) {
            const titleElement = activeNoteLink.querySelector('.note-title');
            if (titleElement) {
              titleElement.textContent = noteTitle.value && noteTitle.value.trim() ? noteTitle.value : 'Untitled Note';
            }
          }
        }
      }
      
      // Always update the page title
      updatePageTitle(noteTitle.value);
    }

    // Add debounce to save function for better performance
    let saveTimeout;
    function debouncedSave() {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveNote();
        
        // If this was a new note creation, update the sidebar to show it
        if (sidebar.classList.contains('hidden') || sidebar.classList.contains('auto-hidden')) {
          // Even if sidebar is hidden, update the list so it's ready when shown
          loadNotesList();
        }
      }, 300);
    }

    noteTitle.addEventListener('input', function() {
      debouncedSave();
    });
    
    noteContent.addEventListener('input', debouncedSave);
    
    // Function to check window width and auto-hide sidebar if needed
    function checkWindowSize() {
      if (window.innerWidth <= 768) {
        sidebar.classList.add('auto-hidden');
        sidebar.classList.add('hidden');
        notebook.classList.add('full-width');
        toggleSidebar.classList.remove('active');
      } else {
        sidebar.classList.remove('auto-hidden');
        sidebar.classList.remove('hidden');
        notebook.classList.remove('full-width');
        toggleSidebar.classList.add('active');
      }
    }
    
    // Run on initial load
    checkWindowSize();
    
    // Add window resize event listener
    window.addEventListener('resize', checkWindowSize);

    // Toggle Sidebar with animation - add both click and touch events
    toggleSidebar.addEventListener('click', toggleSidebarHandler);
    toggleSidebar.addEventListener('touchend', function(e) {
      e.preventDefault(); // Prevent default touch behavior
      toggleSidebarHandler(e);
    });
    
    // Separate the handler function for reuse
    function toggleSidebarHandler(e) {
      // Prevent any default behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Clear both classes that could hide the sidebar
      sidebar.classList.remove('auto-hidden');
      
      // Toggle hidden class
      sidebar.classList.toggle('hidden');
      
      // Toggle notebook width
      notebook.classList.toggle('full-width');
      
      // Toggle active state for button styling
      toggleSidebar.classList.toggle('active');
      
      // Always load notes list when sidebar is shown
      if (!sidebar.classList.contains('hidden')) {
        loadNotesList();
      }
    }

    // Load notes list
    function loadNotesList() {
      noteList.innerHTML = '';
      const notes = [];

      // Collect all notes from localStorage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('note-')) {
          try {
            const note = JSON.parse(localStorage.getItem(key));
            
            // Backward compatibility with old notes having only one timestamp
            const created = note.created || note.timestamp || 0;
            const updated = note.updated || note.timestamp || 0;
            
            notes.push({
              id: key,
              title: note.title && note.title.trim() ? note.title : 'Untitled Note',
              created: created,
              updated: updated
            });
          } catch (e) {
            console.error('Error parsing note:', e);
          }
        }
      }

      // Sort notes based on preference
      if (sortPreference === 'created') {
        // Sort by creation date (most recent first)
        notes.sort((a, b) => b.created - a.created);
      } else {
        // Sort by update date (most recent first)
        notes.sort((a, b) => b.updated - a.updated);
      }

      if (notes.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
          <p>No notes yet!</p>
          <p>Click on the New Note button or start typing to create your first note.</p>
        `;
        noteList.appendChild(emptyState);
        return;
      }

      // Render the notes list
      notes.forEach((note, index) => {
        const listItem = document.createElement('li');
        
        // Properly mark the current note as active
        if (note.id === noteId) {
          listItem.classList.add('active');
        }

        const link = document.createElement('a');
        link.href = '?noteId=' + note.id;
        
        // Create a container for the note info
        const noteInfo = document.createElement('div');
        noteInfo.className = 'note-info';
        
        // Add title
        const titleElement = document.createElement('div');
        titleElement.className = 'note-title';
        titleElement.textContent = note.title;
        noteInfo.appendChild(titleElement);
        
        // Add timestamp based on sort preference
        const timestampElement = document.createElement('div');
        timestampElement.className = 'note-timestamp';
        if (sortPreference === 'created') {
          timestampElement.textContent = `${getRelativeTime(note.created)}`;
          timestampElement.title = `Created: ${formatDate(note.created)}\nUpdated: ${formatDate(note.updated)}`;
        } else {
          timestampElement.textContent = `${getRelativeTime(note.updated)}`;
          timestampElement.title = `Updated: ${formatDate(note.updated)}\nCreated: ${formatDate(note.created)}`;
        }
        noteInfo.appendChild(timestampElement);
        
        link.appendChild(noteInfo);
        listItem.appendChild(link);

        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'deleteNote';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete Note';
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          
          // Replace delete button with confirm/cancel buttons
          const confirmContainer = document.createElement('div');
          confirmContainer.className = 'delete-confirm-container';
          
          // Confirm button
          const confirmBtn = document.createElement('button');
          confirmBtn.className = 'confirm-delete';
          confirmBtn.innerHTML = '✓';
          confirmBtn.title = 'Confirm Delete';
          confirmBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            performDelete(note.id, note.title);
          });
          
          // Cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.className = 'cancel-delete';
          cancelBtn.innerHTML = '✕';
          cancelBtn.title = 'Cancel Delete';
          cancelBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            // Replace confirmation buttons with original delete button
            confirmContainer.replaceWith(deleteBtn);
          });
          
          confirmContainer.appendChild(confirmBtn);
          confirmContainer.appendChild(cancelBtn);
          
          // Replace delete button with confirmation buttons
          this.replaceWith(confirmContainer);
        });

        link.appendChild(deleteBtn);
        
        // No animation when loading menu items - immediately add with full opacity
        listItem.style.opacity = '1';
        listItem.style.transform = 'translateY(0)';
        noteList.appendChild(listItem);
      });
      
      // Make sure sidebar shows the current note if available
      if (noteId) {
        const activeElement = document.querySelector('#noteList li.active');
        if (activeElement) {
          // Ensure the active note is visible in the scrollable area
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    // Delete individual note
    function performDelete(id, title) {
      // Get the note element
      const noteElement = document.querySelector(`#noteList li a[href="?noteId=${id}"]`).parentNode;
      
      // Add CSS transition to ensure smooth animation
      noteElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // Start the animation
      noteElement.style.opacity = '0';
      noteElement.style.transform = 'translateX(20px)';
      
      // After animation completes
      setTimeout(() => {
        // Remove the note from localStorage
        localStorage.removeItem(id);
        
        // Remove the element from DOM
        noteElement.remove();
        
        // If we deleted the current note, go back to root
        if (id === noteId) {
          history.pushState(null, '', window.location.pathname);
          noteId = null;
          isNewNote = true;
          noteTitle.value = '';
          noteContent.value = '';
          updatePageTitle('');
        }
        
        // Only reload the entire list if it was the last note
        const remainingNotes = Object.keys(localStorage).filter(key => key.startsWith('note-'));
        if (remainingNotes.length === 0) {
          loadNotesList(); // Show the empty state
        }
        
        showToast(`"${title}" has been deleted`, 'success');
      }, 300); // Match this timing with the transition duration
    }

    // Delete individual note (legacy function kept for compatibility)
    function deleteNote(id, title) {
      performDelete(id, title);
    }

    // Export all notes
    exportNotesBtn.addEventListener('click', function() {
      const allNotes = {};
      let noteCount = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('note-')) {
          allNotes[key] = localStorage.getItem(key);
          noteCount++;
        }
      }
      
      if (noteCount === 0) {
        showToast('No notes to export', 'error');
        return;
      }
      
      const dataStr = JSON.stringify(allNotes, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'noty_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast(`${noteCount} notes exported successfully!`, 'success');
    });

    // Import notes
    importNotesBtn.addEventListener('click', function() {
      importNotesInput.click();
    });

    importNotesInput.addEventListener('change', function() {
      const file = importNotesInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const importedNotes = JSON.parse(e.target.result);
            let importCount = 0;
            
            for (let key in importedNotes) {
              if (importedNotes.hasOwnProperty(key) && key.startsWith('note-')) {
                try {
                  // Parse note to handle timestamp migration
                  const noteData = JSON.parse(importedNotes[key]);
                  
                  // Ensure note has both timestamps for compatibility with new system
                  if (!noteData.created && noteData.timestamp) {
                    noteData.created = noteData.timestamp;
                  }
                  
                  if (!noteData.updated && noteData.timestamp) {
                    noteData.updated = noteData.timestamp;
                  }
                  
                  // If somehow neither timestamp exists, add them
                  if (!noteData.created && !noteData.updated) {
                    const now = Date.now();
                    noteData.created = now;
                    noteData.updated = now;
                  }
                  
                  // Save the modernized note data
                  localStorage.setItem(key, JSON.stringify(noteData));
                  importCount++;
                } catch (parseError) {
                  // If we can't parse the note data, just import it as-is (backward compatibility)
                  localStorage.setItem(key, importedNotes[key]);
                  importCount++;
                }
              }
            }
            
            showToast(`${importCount} notes imported successfully!`, 'success');
            loadNotesList();
          } catch (error) {
            showToast('Failed to import notes. Invalid file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
    });

    // Delete all notes
    deleteAllNotesBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to delete all notes? This action cannot be undone.')) {
        let noteCount = 0;
        
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key) && key.startsWith('note-')) {
            localStorage.removeItem(key);
            noteCount++;
          }
        }
        
        // Reset to root with empty state
        history.pushState(null, '', window.location.pathname);
        noteId = null;
        isNewNote = true;
        noteTitle.value = '';
        noteContent.value = '';
        updatePageTitle('');
        loadNotesList();
        
        showToast(`${noteCount} notes have been deleted`, 'success');
      }
    });

    // Create new note
    function createNewNote() {
      // Generate a new note ID immediately
      const newNoteId = generateNoteId();
      
      // Create a new empty note right away
      const now = Date.now();
      const noteData = {
        title: '',
        content: '',
        created: now,
        updated: now
      };
      
      // Save it to localStorage
      localStorage.setItem(newNoteId, JSON.stringify(noteData));
      
      // Update the URL to point to the new note
      history.pushState(null, '', '?noteId=' + newNoteId);
      
      // Set the current note ID
      noteId = newNoteId;
      isNewNote = false;
      
      // Clear fields
      noteTitle.value = '';
      noteContent.value = '';
      updatePageTitle('');
      
      // Make sure sidebar is visible (on desktop)
      if (window.innerWidth > 768) {
        sidebar.classList.remove('hidden');
        sidebar.classList.remove('auto-hidden');
        notebook.classList.remove('full-width');
        toggleSidebar.classList.add('active');
      }
      
      // Update the notes list to include the new note
      loadNotesList();
      
      // Focus on title with a slight delay to ensure the DOM is ready
      setTimeout(() => {
        noteTitle.focus();
      }, 100);
      
      // Show confirmation
      showToast('New note created!', 'info');
    }

    // New Note button event listener
    newNoteBtn.addEventListener('click', function() {
      createNewNote();
    });

    // Handle Ctrl+N for new note
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewNote();
      }
    });

    // Load initial notes list
    loadNotesList();

    // Handle note navigation
    window.addEventListener('popstate', function() {
      location.reload();
    });

    // Check if we need to create a new note
    function checkNoteExists() {
      // If we're at the root and there are no notes, create a new empty state
      if (!noteId && Object.keys(localStorage).filter(key => key.startsWith('note-')).length === 0) {
        isNewNote = true;
      }
    }

    // Run the check after loading notes list
    checkNoteExists();

    // Show the help/welcome modal
    function showHelpModal() {
      const modal = document.getElementById('helpModal');
      modal.style.display = 'block';
      
      // Handle close button
      const closeBtn = document.querySelector('.close-modal');
      closeBtn.onclick = function() {
        modal.style.display = 'none';
      };
      
      // Close when clicking outside the modal
      window.onclick = function(event) {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      };
    }
    
    // Handle the help button click
    const helpButton = document.getElementById('helpButton');
    helpButton.addEventListener('click', showHelpModal);
    
    // Handle bookmark home button (now "Start Taking Notes" button)
    const bookmarkHomeButton = document.getElementById('bookmarkHomeButton');
    
    // Change functionality to simply close the modal
    bookmarkHomeButton.addEventListener('click', function() {
      const modal = document.getElementById('helpModal');
      modal.style.display = 'none';
    });
  })();