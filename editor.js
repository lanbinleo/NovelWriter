// Main app state
const state = {
  bookList: [],
  currentBook: null,
  currentChapter: null,
  unsavedChanges: false,
  darkMode: localStorage.getItem('darkMode') === 'true',
  editor: null
};

// DOM Elements
const elements = {
  bookList: document.getElementById('bookList'),
  chapterList: document.getElementById('chapterList'),
  editor: document.getElementById('editor'),
  preview: document.getElementById('preview'),
  wordCount: document.getElementById('wordCount'),
  saveStatus: document.getElementById('saveStatus'),
  currentBookInfo: document.getElementById('currentBookInfo'),
  toastMessage: document.getElementById('toastMessage'),
  
  // Panes
  editorPane: document.getElementById('editorPane'),
  previewPane: document.getElementById('previewPane'),
  
  // Buttons
  backToReaderBtn: document.getElementById('backToReaderBtn'),
  createBookBtn: document.getElementById('createBookBtn'),
  createChapterBtn: document.getElementById('createChapterBtn'),
  toggleDarkMode: document.getElementById('toggleDarkMode'),
  exportBookBtn: document.getElementById('exportBookBtn'),
  importBookBtn: document.getElementById('importBookBtn'),
  saveBtn: document.getElementById('saveBtn'),
  
  // View toggle buttons
  editorViewBtn: document.getElementById('editorViewBtn'),
  previewViewBtn: document.getElementById('previewViewBtn'),
  splitViewBtn: document.getElementById('splitViewBtn'),
  
  // Modals
  createBookModal: document.getElementById('createBookModal'),
  createChapterModal: document.getElementById('createChapterModal')
};

// Initialize editor
function initEditor() {
  // Apply dark mode if enabled
  if (state.darkMode) {
    document.body.classList.add('dark-mode');
  }
  
  // Initialize CodeMirror
  state.editor = CodeMirror.fromTextArea(elements.editor, {
    mode: 'markdown',
    theme: state.darkMode ? 'monokai' : 'mdn-like',
    lineNumbers: true,
    lineWrapping: true,
    autofocus: true
  });
  
  // Set editor as disabled initially
  state.editor.setOption('readOnly', 'nocursor');
  
  // Listen for changes to update preview and save status
  state.editor.on('change', () => {
    updatePreview();
    updateWordCount();
    
    if (state.currentChapter) {
      state.unsavedChanges = true;
      elements.saveStatus.textContent = '未保存';
      elements.saveBtn.disabled = false;
    }
  });
  
  // Load book list
  loadBookList();
  
  // Set up event listeners
  setupEventListeners();
}

// Load the book list from JSON
async function loadBookList() {
  try {
    const response = await fetch('data/bookList.json');
    if (!response.ok) {
      throw new Error('Failed to load book list');
    }
    
    state.bookList = await response.json();
    renderBookList();
  } catch (error) {
    showToast('加载书籍列表失败: ' + error.message);
    // Create an empty book list if file doesn't exist yet
    state.bookList = [];
    renderBookList();
  }
}

// Render book list in sidebar
function renderBookList() {
  elements.bookList.innerHTML = '';
  
  if (state.bookList.length === 0) {
    elements.bookList.innerHTML = '<div class="empty-message">没有书籍。点击"+"按钮添加书籍。</div>';
    return;
  }
  
  state.bookList.forEach(book => {
    const bookItem = document.createElement('div');
    bookItem.className = 'list-item';
    bookItem.dataset.id = book.id;
    
    if (state.currentBook && state.currentBook.id === book.id) {
      bookItem.classList.add('active');
    }
    
    bookItem.innerHTML = `
      <span class="title">${book.title}</span>
      <div class="actions">
        <button class="edit-book-btn" data-id="${book.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-book-btn" data-id="${book.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    bookItem.addEventListener('click', (e) => {
      if (!e.target.closest('.actions')) {
        openBook(book.id);
      }
    });
    
    elements.bookList.appendChild(bookItem);
  });
  
  // Add event listeners for book actions
  document.querySelectorAll('.edit-book-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookId = btn.dataset.id;
      editBook(bookId);
    });
  });
  
  document.querySelectorAll('.delete-book-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookId = btn.dataset.id;
      deleteBook(bookId);
    });
  });
}

// Load a book
async function openBook(bookId) {
  try {
    // Check for unsaved changes
    if (state.unsavedChanges) {
      const confirm = window.confirm('你有未保存的更改。继续将丢失这些更改。');
      if (!confirm) return;
    }
    
    const response = await fetch(`data/books/${bookId}.json`);
    if (!response.ok) {
      throw new Error('Failed to load book');
    }
    
    state.currentBook = await response.json();
    state.currentChapter = null;
    state.unsavedChanges = false;
    
    // Update UI
    elements.currentBookInfo.innerHTML = `<span>${state.currentBook.title}</span> <small>by ${state.currentBook.author || '未知作者'}</small>`;
    elements.createChapterBtn.disabled = false;
    elements.exportBookBtn.disabled = false;
    
    // Reset editor
    state.editor.setValue('');
    state.editor.setOption('readOnly', 'nocursor');
    elements.saveBtn.disabled = true;
    elements.saveStatus.textContent = '选择章节';
    
    // Clear preview
    elements.preview.innerHTML = '';
    
    // Update book list highlight
    document.querySelectorAll('.list-item').forEach(item => {
      if (item.dataset.id === bookId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Render chapters
    renderChapterList();
  } catch (error) {
    showToast('加载书籍失败: ' + error.message);
  }
}

// Render chapter list for current book
function renderChapterList() {
  elements.chapterList.innerHTML = '';
  
  if (!state.currentBook || !state.currentBook.chapters || state.currentBook.chapters.length === 0) {
    elements.chapterList.innerHTML = '<div class="empty-message">没有章节。点击"+"按钮添加章节。</div>';
    return;
  }
  
  state.currentBook.chapters.forEach((chapter, index) => {
    const chapterItem = document.createElement('div');
    chapterItem.className = 'list-item';
    chapterItem.dataset.index = index;
    
    if (state.currentChapter && state.currentChapter.index === index) {
      chapterItem.classList.add('active');
    }
    
    chapterItem.innerHTML = `
      <span class="title">${chapter.title}</span>
      <div class="actions">
        <button class="move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
        <button class="move-down-btn" data-index="${index}" ${index === state.currentBook.chapters.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
        <button class="delete-chapter-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    
    chapterItem.addEventListener('click', (e) => {
      if (!e.target.closest('.actions')) {
        openChapter(index);
      }
    });
    
    elements.chapterList.appendChild(chapterItem);
  });
  
  // Add event listeners for chapter actions
  document.querySelectorAll('.move-up-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        moveChapter(index, index - 1);
      });
    }
  });
  
  document.querySelectorAll('.move-down-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        moveChapter(index, index + 1);
      });
    }
  });
  
  document.querySelectorAll('.delete-chapter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      deleteChapter(index);
    });
  });
}

// Open a chapter in the editor
function openChapter(index) {
  // Check for unsaved changes
  if (state.unsavedChanges) {
    const confirm = window.confirm('你有未保存的更改。继续将丢失这些更改。');
    if (!confirm) return;
  }
  
  const chapter = state.currentBook.chapters[index];
  state.currentChapter = { ...chapter, index };
  state.unsavedChanges = false;
  
  // Update chapter list highlight
  document.querySelectorAll('.list-item').forEach(item => {
    if (item.dataset.index && parseInt(item.dataset.index) === index) {
      item.classList.add('active');
    } else if (item.dataset.index) {
      item.classList.remove('active');
    }
  });
  
  // Load content into editor
  state.editor.setValue(chapter.content || '');
  state.editor.setOption('readOnly', false);
  
  // Update editor status
  elements.saveStatus.textContent = '无更改';
  elements.saveBtn.disabled = true;
  
  // Update preview
  updatePreview();
  updateWordCount();
}

// Move a chapter up or down
function moveChapter(fromIndex, toIndex) {
  if (
    toIndex < 0 ||
    toIndex >= state.currentBook.chapters.length ||
    fromIndex < 0 ||
    fromIndex >= state.currentBook.chapters.length
  ) {
    return;
  }
  
  // Swap chapters
  const chapter = state.currentBook.chapters[fromIndex];
  state.currentBook.chapters.splice(fromIndex, 1);
  state.currentBook.chapters.splice(toIndex, 0, chapter);
  
  // Update the current chapter index if it was moved
  if (state.currentChapter && state.currentChapter.index === fromIndex) {
    state.currentChapter.index = toIndex;
  } else if (state.currentChapter && state.currentChapter.index === toIndex) {
    state.currentChapter.index = fromIndex;
  }
  
  // Save book
  saveBook();
  
  // Update UI
  renderChapterList();
}

// Delete a chapter
function deleteChapter(index) {
  const confirm = window.confirm(`确定要删除章节 "${state.currentBook.chapters[index].title}" 吗？此操作不可撤销。`);
  if (!confirm) return;
  
  // Remove chapter
  state.currentBook.chapters.splice(index, 1);
  
  // Update current chapter if it was deleted
  if (state.currentChapter && state.currentChapter.index === index) {
    state.currentChapter = null;
    state.editor.setValue('');
    state.editor.setOption('readOnly', 'nocursor');
    elements.saveBtn.disabled = true;
    elements.saveStatus.textContent = '选择章节';
    elements.preview.innerHTML = '';
  } else if (state.currentChapter && state.currentChapter.index > index) {
    state.currentChapter.index--;
  }
  
  // Update book
  state.currentBook.chapterCount = state.currentBook.chapters.length;
  state.currentBook.lastUpdated = new Date().toISOString();
  
  // Save book
  saveBook();
  
  // Update UI
  renderChapterList();
  showToast('章节已删除');
}

// Edit book details
function editBook(bookId) {
  const book = state.bookList.find(b => b.id === bookId);
  if (!book) return;
  
  // Populate form
  document.getElementById('bookTitle').value = book.title;
  document.getElementById('bookAuthor').value = book.author || '';
  document.getElementById('bookDesc').value = book.description || '';
  document.getElementById('bookCover').value = book.coverUrl || '';
  
  // Show modal
  elements.createBookModal.classList.remove('hidden');
  
  // Change button text
  document.getElementById('createBookConfirmBtn').textContent = '更新';
  
  // Store book ID in button for reference
  document.getElementById('createBookConfirmBtn').dataset.id = bookId;
}

// Delete book
function deleteBook(bookId) {
  const book = state.bookList.find(b => b.id === bookId);
  if (!book) return;
  
  const confirm = window.confirm(`确定要删除书籍 "${book.title}" 吗？此操作不可撤销。`);
  if (!confirm) return;
  
  // Remove book from list
  state.bookList = state.bookList.filter(b => b.id !== bookId);
  
  // Clear current book if it was deleted
  if (state.currentBook && state.currentBook.id === bookId) {
    state.currentBook = null;
    state.currentChapter = null;
    state.editor.setValue('');
    state.editor.setOption('readOnly', 'nocursor');
    elements.saveBtn.disabled = true;
    elements.saveStatus.textContent = '选择书籍';
    elements.preview.innerHTML = '';
    elements.currentBookInfo.innerHTML = '<span>选择或创建一本书</span>';
    elements.createChapterBtn.disabled = true;
    elements.exportBookBtn.disabled = true;
    elements.chapterList.innerHTML = '';
  }
  
  // Save book list
  saveBookList();
  
  // Delete book file
  deleteBookFile(bookId);
  
  // Update UI
  renderBookList();
  showToast('书籍已删除');
}

// Save the current chapter
function saveChapter() {
  if (!state.currentBook || !state.currentChapter) return;
  
  // Get content from editor
  const content = state.editor.getValue();
  
  // Update chapter content
  state.currentBook.chapters[state.currentChapter.index].content = content;
  
  // Update book metadata
  state.currentBook.lastUpdated = new Date().toISOString();
  
  // Save book
  saveBook();
  
  // Update UI
  state.unsavedChanges = false;
  elements.saveStatus.textContent = '已保存';
  elements.saveBtn.disabled = true;
  
  showToast('章节已保存');
}

// Save the current book
function saveBook() {
  if (!state.currentBook) return;
  
  // Update book metadata
  state.currentBook.chapterCount = state.currentBook.chapters.length;
  state.currentBook.lastUpdated = new Date().toISOString();
  
  // Find book in book list and update
  const bookIndex = state.bookList.findIndex(b => b.id === state.currentBook.id);
  if (bookIndex >= 0) {
    state.bookList[bookIndex] = {
      id: state.currentBook.id,
      title: state.currentBook.title,
      author: state.currentBook.author,
      description: state.currentBook.description,
      coverUrl: state.currentBook.coverUrl,
      chapterCount: state.currentBook.chapterCount,
      lastUpdated: state.currentBook.lastUpdated
    };
  }
  
  // Save book list
  saveBookList();
  
  // Save book to file via API
  saveBookFile(state.currentBook);
}

// Save book list to JSON
function saveBookList() {
  // Save book list to file via API
  fetch('/api/save-book-list', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(state.bookList)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save book list');
    }
    return response.json();
  })
  .catch(error => {
    showToast('保存书籍列表失败: ' + error.message);
    console.error('Error saving book list:', error);
  });
}

// Save book to JSON file
function saveBookFile(book) {
  fetch('/api/save-book', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(book)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save book');
    }
    return response.json();
  })
  .catch(error => {
    showToast('保存书籍失败: ' + error.message);
    console.error('Error saving book:', error);
  });
}

// Delete book file
function deleteBookFile(bookId) {
  fetch(`/api/delete-book?id=${bookId}`, {
    method: 'DELETE'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to delete book');
    }
    return response.json();
  })
  .catch(error => {
    showToast('删除书籍失败: ' + error.message);
    console.error('Error deleting book:', error);
  });
}

// Create a new book
function createBook(bookData) {
  // Generate a unique ID for the book
  const bookId = 'book_' + Date.now();
  
  // Create book object
  const newBook = {
    id: bookId,
    title: bookData.title,
    author: bookData.author,
    description: bookData.description,
    coverUrl: bookData.coverUrl,
    chapterCount: 0,
    chapters: [],
    lastUpdated: new Date().toISOString()
  };
  
  // Add to book list
  state.bookList.push({
    id: bookId,
    title: bookData.title,
    author: bookData.author,
    description: bookData.description,
    coverUrl: bookData.coverUrl,
    chapterCount: 0,
    lastUpdated: new Date().toISOString()
  });
  
  // Save book list
  saveBookList();
  
  // Save new book
  saveBookFile(newBook);
  
  // Update UI
  renderBookList();
  
  // Open the new book
  state.currentBook = newBook;
  elements.currentBookInfo.innerHTML = `<span>${newBook.title}</span> <small>by ${newBook.author || '未知作者'}</small>`;
  elements.createChapterBtn.disabled = false;
  elements.exportBookBtn.disabled = false;
  elements.chapterList.innerHTML = '<div class="empty-message">没有章节。点击"+"按钮添加章节。</div>';
  
  showToast('书籍已创建');
  
  return bookId;
}

// Create a new chapter
function createChapter(chapterData) {
  if (!state.currentBook) return;
  
  // Create chapter object
  const newChapter = {
    title: chapterData.title,
    description: chapterData.description,
    content: '',
    createDate: new Date().toISOString()
  };
  
  // Add to book
  if (!state.currentBook.chapters) {
    state.currentBook.chapters = [];
  }
  
  state.currentBook.chapters.push(newChapter);
  
  // Update book metadata
  state.currentBook.chapterCount = state.currentBook.chapters.length;
  state.currentBook.lastUpdated = new Date().toISOString();
  
  // Save book
  saveBook();
  
  // Update UI
  renderChapterList();
  
  // Open the new chapter
  openChapter(state.currentBook.chapters.length - 1);
  
  showToast('章节已创建');
}

// Update preview pane with rendered markdown
function updatePreview() {
  if (!state.currentChapter) return;
  
  const content = state.editor.getValue();
  
  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });
  
  // Render markdown
  const renderedContent = marked.parse(content);
  elements.preview.innerHTML = renderedContent;
}

// Update word count
function updateWordCount() {
    const content = state.editor.getValue();
    
    // Count words including Chinese characters (treating each Chinese character as a word)
    // For non-Chinese text, count traditional space-separated words
    const chineseCharsCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const nonChineseWordsCount = content.replace(/[\u4e00-\u9fa5]/g, '').trim() ? 
                                content.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).length : 0;
    
    const wordCount = chineseCharsCount + nonChineseWordsCount;
    elements.wordCount.textContent = `字数: ${wordCount}`;
  }
  

// Toggle dark mode
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  localStorage.setItem('darkMode', state.darkMode);
  
  // Update CodeMirror theme
  state.editor.setOption('theme', state.darkMode ? 'monokai' : 'mdn-like');
}

// Export book as JSON file
function exportBook() {
  if (!state.currentBook) return;
  
  // Create a blob from the book JSON
  const bookJson = JSON.stringify(state.currentBook, null, 2);
  const blob = new Blob([bookJson], { type: 'application/json' });
  
  // Create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentBook.title.replace(/\s+/g, '_')}.json`;
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('书籍已导出');
}

// Import book from JSON file
function importBook() {
  // Create a file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const book = JSON.parse(e.target.result);
        
        // Validate book structure
        if (!book.title || !book.chapters) {
          throw new Error('Invalid book format');
        }
        
        // Generate a new ID to avoid conflicts
        book.id = 'book_' + Date.now();
        
        // Add to book list
        state.bookList.push({
          id: book.id,
          title: book.title,
          author: book.author || '',
          description: book.description || '',
          coverUrl: book.coverUrl || '',
          chapterCount: book.chapters.length,
          lastUpdated: new Date().toISOString()
        });
        
        // Save book list
        saveBookList();
        
        // Save book
        saveBookFile(book);
        
        // Update UI
        renderBookList();
        
        showToast('书籍已导入');
      } catch (error) {
        showToast('导入书籍失败: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  });
  
  // Trigger file selection
  input.click();
}

// Show a toast message
function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toastMessage.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toastMessage.classList.add('hidden');
  }, duration);
}

// Set up event listeners
function setupEventListeners() {
  // Navigation
  elements.backToReaderBtn.addEventListener('click', () => {
    if (state.unsavedChanges) {
      const confirm = window.confirm('你有未保存的更改。返回阅读器将丢失这些更改。');
      if (!confirm) return;
    }
    window.location.href = 'index.html';
  });
  
  // Book actions
  elements.createBookBtn.addEventListener('click', () => {
    // Reset form
    document.getElementById('bookTitle').value = '';
    document.getElementById('bookAuthor').value = '';
    document.getElementById('bookDesc').value = '';
    document.getElementById('bookCover').value = '';
    
    // Reset button text and data
    document.getElementById('createBookConfirmBtn').textContent = '创建';
    document.getElementById('createBookConfirmBtn').dataset.id = '';
    
    // Show modal
    elements.createBookModal.classList.remove('hidden');
  });
  
  // Chapter actions
  elements.createChapterBtn.addEventListener('click', () => {
    // Reset form
    document.getElementById('chapterTitle').value = '';
    document.getElementById('chapterDesc').value = '';
    
    // Show modal
    elements.createChapterModal.classList.remove('hidden');
  });
  
  // Save button
  elements.saveBtn.addEventListener('click', saveChapter);
  
  // View toggle
  elements.editorViewBtn.addEventListener('click', () => {
    elements.editorPane.classList.remove('half', 'hidden');
    elements.previewPane.classList.add('hidden');
    
    elements.editorViewBtn.classList.add('active');
    elements.previewViewBtn.classList.remove('active');
    elements.splitViewBtn.classList.remove('active');
  });
  
  elements.previewViewBtn.addEventListener('click', () => {
    elements.editorPane.classList.add('hidden');
    elements.previewPane.classList.remove('half', 'hidden');
    
    elements.editorViewBtn.classList.remove('active');
    elements.previewViewBtn.classList.add('active');
    elements.splitViewBtn.classList.remove('active');
    
    updatePreview();
  });
  
  elements.splitViewBtn.addEventListener('click', () => {
    elements.editorPane.classList.remove('hidden');
    elements.editorPane.classList.add('half');
    elements.previewPane.classList.remove('hidden');
    elements.previewPane.classList.add('half');
    
    elements.editorViewBtn.classList.remove('active');
    elements.previewViewBtn.classList.remove('active');
    elements.splitViewBtn.classList.add('active');
    
    updatePreview();
  });
  
  // Dark mode toggle
  elements.toggleDarkMode.addEventListener('click', toggleDarkMode);
  
  // Export/Import
  elements.exportBookBtn.addEventListener('click', exportBook);
  elements.importBookBtn.addEventListener('click', importBook);
  
  // Modal handlers
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.createBookModal.classList.add('hidden');
      elements.createChapterModal.classList.add('hidden');
    });
  });
  
  // Create book confirm
  document.getElementById('createBookConfirmBtn').addEventListener('click', () => {
    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const description = document.getElementById('bookDesc').value.trim();
    const coverUrl = document.getElementById('bookCover').value.trim();
    
    if (!title) {
      alert('书名不能为空');
      return;
    }
    
    const bookId = document.getElementById('createBookConfirmBtn').dataset.id;
    
    // If editing existing book
    if (bookId) {
      const bookIndex = state.bookList.findIndex(b => b.id === bookId);
      if (bookIndex >= 0) {
        // Update book list entry
        state.bookList[bookIndex].title = title;
        state.bookList[bookIndex].author = author;
        state.bookList[bookIndex].description = description;
        state.bookList[bookIndex].coverUrl = coverUrl;
        state.bookList[bookIndex].lastUpdated = new Date().toISOString();
        
        // If this is the current book, update it
        if (state.currentBook && state.currentBook.id === bookId) {
          state.currentBook.title = title;
          state.currentBook.author = author;
          state.currentBook.description = description;
          state.currentBook.coverUrl = coverUrl;
          state.currentBook.lastUpdated = new Date().toISOString();
          
          elements.currentBookInfo.innerHTML = `<span>${title}</span> <small>by ${author || '未知作者'}</small>`;
        }
        
        // Save changes
        saveBookList();
        if (state.currentBook && state.currentBook.id === bookId) {
          saveBook();
        }
        
        // Update UI
        renderBookList();
        
        showToast('书籍已更新');
      }
    } 
    // Creating a new book
    else {
      createBook({
        title,
        author,
        description,
        coverUrl
      });
    }
    
    // Hide modal
    elements.createBookModal.classList.add('hidden');
  });
  
  // Create chapter confirm
  document.getElementById('createChapterConfirmBtn').addEventListener('click', () => {
    const title = document.getElementById('chapterTitle').value.trim();
    const description = document.getElementById('chapterDesc').value.trim();
    
    if (!title) {
      alert('章节标题不能为空');
      return;
    }
    
    createChapter({
      title,
      description
    });
    
    // Hide modal
    elements.createChapterModal.classList.add('hidden');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!elements.saveBtn.disabled) {
        saveChapter();
      }
    }
  });
  
  // Window beforeunload to warn about unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (state.unsavedChanges) {
      const message = '你有未保存的更改。离开将丢失这些更改。';
      e.returnValue = message;
      return message;
    }
  });
}

// Initialize the editor when page loads
document.addEventListener('DOMContentLoaded', initEditor);