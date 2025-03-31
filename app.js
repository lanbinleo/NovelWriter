BASEURL = "https://raw.githubusercontent.com/lanbinleo/NovelWriter/refs/heads/main/";

// Main app state
const state = {
  bookList: [],
  currentBook: null,
  currentChapter: 0,
  lastReadPositions: JSON.parse(localStorage.getItem('lastReadPositions') || '{}'),
  bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '{}'),
  underlines: JSON.parse(localStorage.getItem('underlines') || '{}'),
  darkMode: localStorage.getItem('darkMode') === 'true',
  theme: localStorage.getItem('theme') || 'default'

};

// DOM Elements
const elements = {
  bookshelf: document.getElementById('bookshelf'),
  reader: document.getElementById('reader'),
  bookList: document.getElementById('bookList'),
  bookTitle: document.getElementById('bookTitle'),
  chapterTitle: document.getElementById('chapterTitle'),
  chapterContent: document.getElementById('chapterContent'),
  tableOfContents: document.getElementById('tableOfContents'),
  bookmarksList: document.getElementById('bookmarksList'),
  toastMessage: document.getElementById('toastMessage'),
  wordCount: document.getElementById('wordCount'), // Add this line
  
  // Buttons
  backToShelf: document.getElementById('backToShelf'),
  toggleDarkMode: document.getElementById('toggleDarkMode'),
  toggleReaderDarkMode: document.getElementById('toggleReaderDarkMode'),
  prevChapter: document.getElementById('prevChapter'),
  nextChapter: document.getElementById('nextChapter'),
  addBookmark: document.getElementById('addBookmark'),
  shareBook: document.getElementById('shareBook'),
  addBookBtn: document.getElementById('addBookBtn'),

  themeSelector: document.getElementById('themeSelector'),
  readerThemeSelector: document.getElementById('readerThemeSelector'),
  themeModal: document.getElementById('themeModal'),
  themeOptions: document.querySelectorAll('.theme-option'),
  closeModalBtn: document.querySelector('.close-btn')

};

// 添加主题选择和应用函数
function applyTheme(themeName) {
    // 移除所有现有主题类
    document.body.classList.remove('default-theme', 'sepia-theme', 'night-theme', 'forest-theme');
    
    // 添加新主题类
    document.body.classList.add(`${themeName}-theme`);
    
    // 更新状态并保存到本地存储
    state.theme = themeName;
    localStorage.setItem('theme', themeName);
    
    // 如果选择了夜间主题，也启用暗模式
    if (themeName === 'night') {
      state.darkMode = true;
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else if (state.darkMode) {
      // 如果从夜间主题切换到其他主题，关闭暗模式
      state.darkMode = false;
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
    }
    
    showToast(`已应用${getThemeDisplayName(themeName)}主题`);
  }
  
  // 获取主题的显示名称
  function getThemeDisplayName(themeName) {
    const themeNames = {
      'default': '默认',
      'sepia': '羊皮纸',
      'night': '夜间',
      'forest': '森林'
    };
    return themeNames[themeName] || themeName;
  }
  
  // 显示主题选择器模态框
  function showThemeModal() {
    elements.themeModal.classList.remove('hidden');
  }
  
  // 隐藏主题选择器模态框
  function hideThemeModal() {
    elements.themeModal.classList.add('hidden');
  }

// Initialize the app
async function initApp() {

  applyTheme(state.theme); // Apply saved theme
  // Apply dark mode if enabled
  if (state.darkMode) {
    document.body.classList.add('dark-mode');
  }

  // Check if we're in a server environment
  const isServerEnvironment = await checkServerEnvironment();

  // Load books list
  await loadBookList();
  
  // Check if there's a hash in the URL
  parseURLHash();
  
  // Add event listeners
  setupEventListeners(isServerEnvironment);
}

// Check if we're running in a server environment
async function checkServerEnvironment() {
  try {
    const response = await fetch('server.py');
    return response.status === 404; // If we get a 404, it means the server is running
  } catch (error) {
    return false; // If we get an error, we're probably in a local file environment
  }
}

// Load the book list from JSON
async function loadBookList() {
  try {
    const response = await fetch(`${BASEURL}data/bookList.json`);
    if (!response.ok) {
      throw new Error('Failed to load book list');
    }
    
    state.bookList = await response.json();
    renderBookshelf();
  } catch (error) {
    showToast('Error loading book list: ' + error.message);
    // Create an empty book list if file doesn't exist yet
    state.bookList = [];
    renderBookshelf();
  }
}

// Render all books in the bookshelf
function renderBookshelf() {
  elements.bookList.innerHTML = '';
  
  if (state.bookList.length === 0) {
    elements.bookList.innerHTML = '<div class="empty-message">没有找到书籍。点击"添加书籍"来创建你的第一本书。</div>';
    return;
  }
  
  state.bookList.forEach(book => {
    const lastPosition = state.lastReadPositions[book.id] || { chapter: 0, progress: 0 };
    const progressPercentage = calculateBookProgress(book, lastPosition);
    
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;
    
    // Use random image from Bing if no cover is specified
    const coverUrl = book.coverUrl || `https://bing.ee123.net/img/`;
    
    bookCard.innerHTML = `
      <div class="book-cover" style="background-image: url('${coverUrl}')">
        <div class="reading-progress" style="width: ${progressPercentage}%"></div>
      </div>
      <div class="book-title">${book.title}</div>
      <div class="book-author">${book.author || '未知作者'}</div>
      <div class="book-info">
        <span>${book.chapterCount || 0} 章</span>
        <span>最近阅读: ${formatDate(book.lastUpdated) || '从未'}</span>
      </div>
    `;
    
    bookCard.addEventListener('click', () => openBook(book.id));
    elements.bookList.appendChild(bookCard);
  });
}

// Calculate book reading progress
function calculateBookProgress(book, lastPosition) {
  if (!book.chapterCount || book.chapterCount === 0) return 0;
  
  const chapterProgress = lastPosition.progress / 100;
  const overallProgress = ((lastPosition.chapter + chapterProgress) / book.chapterCount) * 100;
  return Math.min(Math.max(overallProgress, 0), 100);
}

// Open a book by ID
async function openBook(bookId) {
  try {
    const response = await fetch(`${BASEURL}data/books/${bookId}.json`);
    if (!response.ok) {
      throw new Error('Failed to load book');
    }
    
    state.currentBook = await response.json();
    
    // Set book title
    elements.bookTitle.textContent = state.currentBook.title;
    
    // Render table of contents
    renderTableOfContents();
    
    // Render bookmarks
    renderBookmarks();
    
    // Load last read position or first chapter
    const lastPosition = state.lastReadPositions[bookId] || { chapter: 0, progress: 0 };
    state.currentChapter = lastPosition.chapter;
    
    // Load chapter content
    await loadChapter(state.currentChapter);
    
    // Switch to reader view
    elements.bookshelf.classList.add('hidden');
    elements.reader.classList.remove('hidden');
    
    // Save this as the last opened book
    localStorage.setItem('lastOpenedBook', bookId);
  } catch (error) {
    showToast('Error loading book: ' + error.message);
  }
}

// Render table of contents
function renderTableOfContents() {
  elements.tableOfContents.innerHTML = '';
  
  state.currentBook.chapters.forEach((chapter, index) => {
    const tocItem = document.createElement('div');
    tocItem.className = 'toc-item';
    tocItem.textContent = chapter.title;
    
    if (index === state.currentChapter) {
      tocItem.classList.add('active');
    }
    
    tocItem.addEventListener('click', () => {
      loadChapter(index);
    });
    
    elements.tableOfContents.appendChild(tocItem);
  });
}

// Render bookmarks
function renderBookmarks() {
  elements.bookmarksList.innerHTML = '';
  
  const bookBookmarks = state.bookmarks[state.currentBook.id] || [];
  
  if (bookBookmarks.length === 0) {
    elements.bookmarksList.innerHTML = '<div class="empty-bookmark">没有书签</div>';
    return;
  }
  
  bookBookmarks.forEach((bookmark, index) => {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    
    const chapterTitle = state.currentBook.chapters[bookmark.chapter]?.title || '未知章节';
    
    bookmarkItem.innerHTML = `
      <span>${chapterTitle} (${bookmark.note || '无备注'})</span>
      <button class="remove-bookmark" data-index="${index}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    bookmarkItem.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-bookmark')) {
        loadChapter(bookmark.chapter, bookmark.position);
      }
    });
    
    elements.bookmarksList.appendChild(bookmarkItem);
  });
  
  // Add event listeners for removing bookmarks
  document.querySelectorAll('.remove-bookmark').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(button.dataset.index);
      removeBookmark(index);
    });
  });
}

// Add a bookmark for the current position
function addBookmark() {
  const bookId = state.currentBook.id;
  if (!state.bookmarks[bookId]) {
    state.bookmarks[bookId] = [];
  }
  
  // Calculate current scroll position
  const contentArea = document.querySelector('.content-area');
  const scrollPercentage = (contentArea.scrollTop / (contentArea.scrollHeight - contentArea.clientHeight)) * 100;
  
  // Prompt for a note
  const note = prompt('添加备注 (可选):', '');
  
  // Create bookmark object
  const bookmark = {
    chapter: state.currentChapter,
    position: scrollPercentage,
    note: note || '',
    timestamp: new Date().toISOString()
  };
  
  // Add bookmark
  state.bookmarks[bookId].push(bookmark);
  
  // Save to local storage
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
  
  // Update bookmarks list
  renderBookmarks();
  
  showToast('书签已添加');
}

// Remove a bookmark
function removeBookmark(index) {
  const bookId = state.currentBook.id;
  
  if (state.bookmarks[bookId] && state.bookmarks[bookId][index]) {
    state.bookmarks[bookId].splice(index, 1);
    
    // Save to local storage
    localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
    
    // Update bookmarks list
    renderBookmarks();
    
    showToast('书签已删除');
  }
}

// Load a chapter by index and optional scroll position
async function loadChapter(chapterIndex, scrollPosition = 0) {
  if (chapterIndex < 0 || chapterIndex >= state.currentBook.chapters.length) {
    showToast('章节不存在');
    return;
  }
  
  state.currentChapter = chapterIndex;
  
  const chapter = state.currentBook.chapters[chapterIndex];
  elements.chapterTitle.textContent = chapter.title;
  
  try {
    // If content is provided directly in the chapter object
    if (chapter.content) {
      renderChapterContent(chapter.content);
    } 
    // Otherwise, fetch content from the specified source
    else if (chapter.contentUrl) {
      const response = await fetch(chapter.contentUrl);
      if (!response.ok) {
        throw new Error('Failed to load chapter content');
      }
      const content = await response.text();
      renderChapterContent(content);
    } else {
      throw new Error('No content available for this chapter');
    }
    
    // Update TOC active item
    const tocItems = elements.tableOfContents.querySelectorAll('.toc-item');
    tocItems.forEach((item, index) => {
      if (index === chapterIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Save last read position
    saveLastReadPosition();
    
    // Scroll to position if provided
    if (scrollPosition > 0) {
      const contentArea = document.querySelector('.content-area');
      const targetScroll = (contentArea.scrollHeight - contentArea.clientHeight) * (scrollPosition / 100);
      contentArea.scrollTop = targetScroll;
    } else {
      // Otherwise scroll to top
      document.querySelector('.content-area').scrollTop = 0;
    }
    
    // Update URL hash
    updateUrlHash();
  } catch (error) {
    showToast('Error loading chapter: ' + error.message);
    elements.chapterContent.innerHTML = '<p class="error-message">无法加载章节内容</p>';
  }
}

// Render chapter content with markdown support
function renderChapterContent(content) {
  // Configure marked for markdown rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      } else {
        return code;
      }
    }
  });
  
  // Render content
  const renderedContent = marked.parse(content);
  elements.chapterContent.innerHTML = renderedContent;
  
  // Apply underlines
  applyUnderlines();
  
  // Add selection listener for text highlighting
  elements.chapterContent.addEventListener('mouseup', handleTextSelection);
  
  // Update word count
  updateWordCount(content);
}

// Add this new function for word count
function updateWordCount(content) {
  if (!content) return;
  
  // Count words including Chinese characters (treating each Chinese character as a word)
  // For non-Chinese text, count traditional space-separated words
  const chineseCharsCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const nonChineseWordsCount = content.replace(/[\u4e00-\u9fa5]/g, '').trim() ? 
                            content.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).length : 0;
  
  const wordCount = chineseCharsCount + nonChineseWordsCount;
  
  // Display word count if element exists
  if (elements.wordCount) {
    elements.wordCount.textContent = `字数: ${wordCount}`;
  }
}

// Apply saved underlines to the chapter content
function applyUnderlines() {
  const bookId = state.currentBook.id;
  const chapterUnderlines = state.underlines[bookId]?.[state.currentChapter] || [];
  
  if (chapterUnderlines.length === 0) return;
  
  // This is a simplified approach that would need to be enhanced
  // for a more robust underlining system
  const paragraphs = elements.chapterContent.querySelectorAll('p');
  
  chapterUnderlines.forEach(underline => {
    const p = paragraphs[underline.paragraphIndex];
    if (p) {
      const text = p.textContent;
      const highlightedText = text.substring(underline.start, underline.end);
      
      const newHTML = text.substring(0, underline.start) +
        `<span class="highlighted">${highlightedText}</span>` +
        text.substring(underline.end);
      
      p.innerHTML = newHTML;
    }
  });
}

// Handle text selection for underlining
function handleTextSelection(e) {
  const selection = window.getSelection();
  if (selection.toString().trim().length === 0) return;
  
  // Check if selection is already highlighted
  const range = selection.getRangeAt(0);
  const highlightedElement = range.commonAncestorContainer.parentNode;
  const isHighlighted = highlightedElement.classList && highlightedElement.classList.contains('highlighted');
  
  // Create a context menu (simplified version)
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  
  if (isHighlighted) {
    contextMenu.innerHTML = `
      <button class="remove-highlight-btn">Remove Highlight</button>
    `;
  } else {
    contextMenu.innerHTML = `
      <button class="highlight-btn">Highlight</button>
    `;
  }
  
  // Position menu near selection
  const rect = range.getBoundingClientRect();
  
  contextMenu.style.position = 'absolute';
  contextMenu.style.top = `${rect.bottom + window.scrollY + 5}px`;
  contextMenu.style.left = `${rect.left + window.scrollX}px`;
  contextMenu.style.backgroundColor = 'white';
  contextMenu.style.border = '1px solid #ccc';
  contextMenu.style.padding = '5px';
  contextMenu.style.borderRadius = '3px';
  contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  contextMenu.style.zIndex = '1000';
  
  document.body.appendChild(contextMenu);
  
  // Handle highlight button click
  if (!isHighlighted) {
    contextMenu.querySelector('.highlight-btn').addEventListener('click', () => {
      saveUnderline(selection, range);
      contextMenu.remove();
      selection.removeAllRanges();
    });
  } else {
    // Handle remove highlight button click
    contextMenu.querySelector('.remove-highlight-btn').addEventListener('click', () => {
      removeHighlight(highlightedElement, range);
      contextMenu.remove();
      selection.removeAllRanges();
    });
  }
  
  // Remove menu when clicking elsewhere
  document.addEventListener('mousedown', function removeMenu(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('mousedown', removeMenu);
    }
  });
}

// Save an underline/highlight
function saveUnderline(selection, range) {
  const bookId = state.currentBook.id;
  const chapterIndex = state.currentChapter;
  
  // Create book and chapter entries in underlines if they don't exist
  if (!state.underlines[bookId]) {
    state.underlines[bookId] = {};
  }
  if (!state.underlines[bookId][chapterIndex]) {
    state.underlines[bookId][chapterIndex] = [];
  }
  
  // Get the container element and find which paragraph it is
  let node = range.startContainer;
  while (node && node.tagName !== 'P') {
    node = node.parentNode;
  }
  
  if (!node) {
    showToast('只能在段落中高亮文本');
    return;
  }
  
  // Find paragraph index
  const paragraphs = elements.chapterContent.querySelectorAll('p');
  let paragraphIndex = -1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i] === node) {
      paragraphIndex = i;
      break;
    }
  }
  
  if (paragraphIndex === -1) {
    showToast('无法确定段落位置');
    return;
  }
  
  // Get selection details
  const text = selection.toString();
  const paragraph = paragraphs[paragraphIndex].textContent;
  
  // Find exact position in paragraph (this is simplified and may need improvement)
  const start = paragraph.indexOf(text);
  const end = start + text.length;
  
  if (start === -1) {
    showToast('无法确定文本位置');
    return;
  }
  
  // Create highlight object
  const highlight = {
    paragraphIndex,
    start,
    end,
    text,
    timestamp: new Date().toISOString()
  };
  
  // Add to underlines
  state.underlines[bookId][chapterIndex].push(highlight);
  
  // Save to local storage
  localStorage.setItem('underlines', JSON.stringify(state.underlines));
  
  // Apply highlight to the DOM
  const p = paragraphs[paragraphIndex];
  const highlightedHTML = paragraph.substring(0, start) +
    `<span class="highlighted">${text}</span>` +
    paragraph.substring(end);
  
  p.innerHTML = highlightedHTML;
  
  showToast('文本已高亮');
}

// Remove a highlight
function removeHighlight(highlightedElement, range) {
  if (!highlightedElement || !highlightedElement.classList || !highlightedElement.classList.contains('highlighted')) {
    return;
  }
  
  const bookId = state.currentBook.id;
  const chapterIndex = state.currentChapter;
  
  // Get the text content of the highlighted span
  const highlightedText = highlightedElement.textContent;
  
  // Replace the highlighted span with plain text
  const textNode = document.createTextNode(highlightedText);
  highlightedElement.parentNode.replaceChild(textNode, highlightedElement);
  
  // Find and remove the underline object from state
  if (state.underlines[bookId] && state.underlines[bookId][chapterIndex]) {
    // Find the highlight in the array by matching text content
    const highlightIndex = state.underlines[bookId][chapterIndex].findIndex(
      u => u.text === highlightedText
    );
    
    if (highlightIndex >= 0) {
      // Remove it from the array
      state.underlines[bookId][chapterIndex].splice(highlightIndex, 1);
      
      // Save updated underlines to local storage
      localStorage.setItem('underlines', JSON.stringify(state.underlines));
      
      showToast('Highlight removed');
    }
  }
}

// Save the last read position
function saveLastReadPosition() {
  const bookId = state.currentBook.id;
  const contentArea = document.querySelector('.content-area');
  const scrollPercentage = (contentArea.scrollTop / (contentArea.scrollHeight - contentArea.clientHeight)) * 100;
  
  state.lastReadPositions[bookId] = {
    chapter: state.currentChapter,
    progress: isNaN(scrollPercentage) ? 0 : scrollPercentage,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('lastReadPositions', JSON.stringify(state.lastReadPositions));
}

// Create a share link
function shareCurrentPosition() {
  const bookId = state.currentBook.id;
  const chapterIndex = state.currentChapter;
  
  // Calculate current scroll position
  const contentArea = document.querySelector('.content-area');
  const scrollPercentage = (contentArea.scrollTop / (contentArea.scrollHeight - contentArea.clientHeight)) * 100;
  
  // Create share URL with hash
  const shareUrl = `${window.location.origin}${window.location.pathname}#${bookId}.${chapterIndex}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl)
    .then(() => {
      showToast('分享链接已复制到剪贴板');
    })
    .catch(err => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('分享链接已复制到剪贴板');
    });
}

// Parse URL hash for direct navigation
function parseURLHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return;
  
  const parts = hash.split('.');
  if (parts.length >= 2) {
    const bookId = parts[0];
    const chapterIndex = parseInt(parts[1]);
    const position = parts.length >= 3 ? parseFloat(parts[2]) : 0;
    
    // Open book and navigate to chapter
    openBook(bookId).then(() => {
      loadChapter(chapterIndex, position);
    });
  }
}

// Update URL hash to reflect current position
function updateUrlHash() {
  const bookId = state.currentBook.id;
  const chapterIndex = state.currentChapter;
  
  window.location.hash = `${bookId}.${chapterIndex}`;
}

// Toggle dark mode
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark-mode', state.darkMode);
  localStorage.setItem('darkMode', state.darkMode);
}

// Show a toast message
function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toastMessage.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toastMessage.classList.add('hidden');
  }, duration);
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString();
}

// Setup event listeners
function setupEventListeners(isServerEnvironment) {
  // Navigation buttons
  elements.backToShelf.addEventListener('click', () => {
    elements.reader.classList.add('hidden');
    elements.bookshelf.classList.remove('hidden');
    window.location.hash = '';
  });
  
  elements.prevChapter.addEventListener('click', () => {
    loadChapter(state.currentChapter - 1);
  });
  
  elements.nextChapter.addEventListener('click', () => {
    loadChapter(state.currentChapter + 1);
  });
  
  // Dark mode toggle
  elements.toggleDarkMode.addEventListener('click', toggleDarkMode);
  elements.toggleReaderDarkMode.addEventListener('click', toggleDarkMode);
  
  // Add bookmark
  elements.addBookmark.addEventListener('click', addBookmark);
  
  // Share button
  elements.shareBook.addEventListener('click', shareCurrentPosition);
  
  // Add book button - only show in non-server environment
  if (!isServerEnvironment) {
    elements.addBookBtn.addEventListener('click', () => {
      window.location.href = 'editor.html';
    });
  } else {
    // Hide the add book button in server environment
    elements.addBookBtn.style.display = 'none';
  }

  // 主题选择器按钮点击事件
  elements.themeSelector.addEventListener('click', showThemeModal);
  elements.readerThemeSelector.addEventListener('click', showThemeModal);
  
  // 关闭模态框按钮点击事件
  elements.closeModalBtn.addEventListener('click', hideThemeModal);
  
  // 主题选项点击事件
  elements.themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const themeName = option.dataset.theme;
      applyTheme(themeName);
      hideThemeModal();
    });
  });
  
  // 点击模态框外部关闭模态框
  elements.themeModal.addEventListener('click', (e) => {
    if (e.target === elements.themeModal) {
      hideThemeModal();
    }
  });
  
  // Periodically save reading position
  setInterval(saveLastReadPosition, 5000);
  
  // Handle browser back button
  window.addEventListener('popstate', () => {
    parseURLHash();
  });
}

// 更新页脚年份和最后更新时间
document.addEventListener('DOMContentLoaded', () => {
    const currentYearElement = document.getElementById('currentYear');
    const lastUpdateTimeElement = document.getElementById('lastUpdateTime');
    
    if (currentYearElement) {
      currentYearElement.textContent = new Date().getFullYear();
    }
    
    if (lastUpdateTimeElement) {
      lastUpdateTimeElement.textContent = '2025年3月31日';
    }
});



// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', initApp);