/**
 * ChatGPT Clone Application
 * A simple chat interface with persistent storage and AI responses
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const darkModeToggle = document.getElementById('darkModeToggle');
  const inputField = document.querySelector(".input-area input[type='text']");
  const sendButton = document.querySelector(".send-msg");
  const uploadButton = document.querySelector(".upload-img");
  const fileInput = document.getElementById("fileInput");
  const chatArea = document.querySelector(".chat-area");
  const chatHistory = document.querySelector(".chat-history");

  // Application State
// Application State
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyBXmB1mgMxVD3KIRmWS2SAtgTrQ3tLJgfI";
  let currentChatId = null;
  let chats = JSON.parse(localStorage.getItem("chats")) || {};
  let uploadedImage = null;
  let uploadedImageBase64 = null;
  let uploadedMimeType = null;

  /**
   * Initialize the chat application
   */
  function initApp() {
    // Load saved theme preference
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference === 'true') {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerText = '☀️ Light Mode';
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Fix mobile-specific issues
    setupMobileOptimizations();
    
    // Check if there are existing chats
    const chatIds = Object.keys(chats);
    
    if (chatIds.length === 0) {
      // Only create a new chat if there are no existing chats
      createNewChat();
    } else {
      // Load the most recent chat instead
      const sortedChats = Object.entries(chats)
        .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
      
      if (sortedChats.length > 0) {
        currentChatId = sortedChats[0][0];
        loadChat(currentChatId);
      }
    }
    
    // Initial render
    updateChatHistory();
  }

  /**
   * Set up all event listeners for the application
   */
  function setupEventListeners() {
    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Input field auto-resize
    inputField.addEventListener("input", autoResizeInput);
    
    // Send message on Enter key or button click
    inputField.addEventListener("keydown", handleInputKeydown);
    sendButton.addEventListener("click", sendMessage);
    
    // Image upload handling
    uploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileUpload);
    
    // Create new chat
    document.querySelector(".new-chat").addEventListener("click", createNewChat);
  }

  /**
   * Toggle dark mode
   */
  function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    darkModeToggle.innerText = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    
    // Update mobile toggle if it exists
    const mobileToggle = document.querySelector('.mobile-dark-toggle');
    if (mobileToggle) {
      mobileToggle.innerHTML = isDarkMode ? '☀️' : '🌙';
    }
    
    // Save theme preference
    saveThemePreference();
  }
  
  /**
   * Save theme preference to localStorage
   */
  function saveThemePreference() {
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  }
  
  /**
   * Update theme colors consistently across all elements
   */
  function updateThemeColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update mobile toggle if it exists
    const mobileToggle = document.querySelector('.mobile-dark-toggle');
    if (mobileToggle) {
      mobileToggle.innerHTML = isDarkMode ? '☀️' : '🌙';
    }
    
    // Update the main toggle button text
    darkModeToggle.innerText = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    
    // Force a repaint on key elements to ensure consistent styling
    const elementsToUpdate = [
      document.querySelector('.sidebar'),
      document.querySelector('.header'),
      document.querySelector('.chat-area'),
      document.querySelector('.input-area')
    ];
    
    elementsToUpdate.forEach(el => {
      if (el) {
        el.style.display = 'none';
        void el.offsetHeight; // Force reflow
        el.style.display = '';
      }
    });
  }

  /**
   * Auto-resize input field based on content
   */
  function autoResizeInput() {
    inputField.style.height = "auto";
    inputField.style.height = (inputField.scrollHeight < 150) ? 
      `${inputField.scrollHeight}px` : "150px";
  }

  /**
   * Handle keydown events in the input field
   */
  function handleInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /**
   * Create and save a new chat
   */
  function createNewChat() {
    const newChatId = Date.now().toString();
    chats[newChatId] = { 
      messages: [{ role: "bot", content: "Hello! How can I assist you today?" }], 
      createdAt: new Date().toISOString() 
    };
    saveChats();
    currentChatId = newChatId;
    updateChatHistory();
    loadChat(newChatId);
  }

  /**
   * Save chats to local storage
   */
  function saveChats() {
    localStorage.setItem("chats", JSON.stringify(chats));
  }

  /**
   * Create a message element
   */
  function createMessage(content, role) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", role);
    messageDiv.innerHTML = content;
    return messageDiv;
  }

  /**
   * Create a chat history item
   */
  function createChatItem(chatId, title, isActive = false) {
    const item = document.createElement("div");
    item.classList.add("chat-item");
    item.dataset.id = chatId;
    if (isActive) item.classList.add("active-chat");
    
    // Chat title
    const titleElem = document.createElement("span");
    titleElem.textContent = title || "New Chat";
    titleElem.style.flex = "1";
    titleElem.style.overflow = "hidden";
    titleElem.style.textOverflow = "ellipsis";
    item.appendChild(titleElem);
    
    // Delete button
    const deleteBtn = document.createElement("span");
    deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.title = "Delete Chat";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      delete chats[chatId];
      saveChats();
      updateChatHistory();
      if (currentChatId === chatId) {
        createNewChat();
      }
    });
    item.appendChild(deleteBtn);
    
    // Chat selection
    item.addEventListener("click", () => loadChat(chatId));
    
    return item;
  }

  /**
   * Format date for chat history display
   */
  function formatDate(dateString) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day
      
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0); // Reset to start of day
      
      const diffTime = today - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    }

  /**
   * Update the chat history display
   */
  function updateChatHistory() {
    chatHistory.innerHTML = "";
    
    // Sort chats by date (newest first)
    const sortedChats = Object.entries(chats)
      .sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt));

      if (sortedChats.length === 0) {
        // If no chats, show a default "New Chat" item
        const defaultItem = document.createElement("div");
        defaultItem.className = "chat-item";
        defaultItem.textContent = "New Chat";
        chatHistory.appendChild(defaultItem);
        return; // Don't continue further
      }
    
    // Group chats by date
    let lastDate = "";
    sortedChats.forEach(([chatId, chatData]) => {
      const dateGroup = formatDate(chatData.createdAt);
      
      // Add date header if this is a new date group
      if (dateGroup !== lastDate) {
        const dateHeader = document.createElement("div");
        dateHeader.className = "chat-history-date";
        dateHeader.textContent = dateGroup;
        chatHistory.appendChild(dateHeader);
        lastDate = dateGroup;
      }
      
      // Get chat title from first user message or use default
      const firstUserMessage = chatData.messages.find(m => m.role === "user");
      const title = firstUserMessage 
        ? firstUserMessage.content.replace(/<[^>]*>?/gm, '').slice(0, 25) + (firstUserMessage.content.length > 25 ? "..." : "")
        : "New Chat";
      
      // Create and add the chat item
      chatHistory.appendChild(createChatItem(chatId, title, chatId === currentChatId));
    });
    
    // Always call updateActiveChatStyle after updating chat history
    setTimeout(updateActiveChatStyle, 10); // Short timeout to ensure DOM is updated
  }

  /**
   * Ensure active chat is highlighted correctly
   */
  function updateActiveChatStyle() {
    // First, remove 'active-chat' class from all items
    document.querySelectorAll(".chat-item").forEach(item => {
      item.classList.remove("active-chat");
    });
    
    // Then, add it only to the current chat
    const currentChatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
    if (currentChatItem) {
      currentChatItem.classList.add("active-chat");
      // Optionally scroll the item into view in the sidebar
      if (window.innerWidth <= 768) {
        currentChatItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  /**
   * Load a specific chat
   */
  function loadChat(chatId) {
    currentChatId = chatId;
    chatArea.innerHTML = "";
    
    // Add all messages from this chat
    chats[chatId].messages.forEach(msg => {
      chatArea.appendChild(createMessage(msg.content, msg.role));
    });
    
    // Scroll to bottom and update active state
    scrollToBottom();
    updateActiveChatStyle();
  }

  /**
   * Handle file upload
   */
  function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large! Please upload an image smaller than 5MB.");
      fileInput.value = '';
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      fileInput.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImage = reader.result;
      uploadedImageBase64 = reader.result.split(",")[1];
      uploadedMimeType = file.type;
    
      // Update upload button to show image thumbnail
      uploadButton.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px;">
          <img src="${uploadedImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
          <span id="removeImage" style="position: absolute; top: -6px; right: -6px; background: red; color: white; border-radius: 50%; font-size: 12px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 2px #000;">×</span>
        </div>
      `;
      
      // Add remove button event listener
      document.getElementById("removeImage").addEventListener("click", (e) => {
        e.stopPropagation();
        removeUploadedImage();
      });
    };
    
    reader.readAsDataURL(file);
  }

  /**
   * Remove uploaded image
   */
  function removeUploadedImage() {
    uploadedImage = null;
    uploadedImageBase64 = null;
    uploadedMimeType = null;
    fileInput.value = "";
    uploadButton.innerHTML = "📷";
  }

  /**
   * Scroll chat area to bottom
   */
  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  /**
   * Send message to API and display response
   */
  async function sendMessage() {
    // Create new chat if none exists
    if (!currentChatId) createNewChat();

    // Get user message
    const userMessage = inputField.value.trim();
    if (!userMessage && !uploadedImageBase64) return;

    // Remove the greeting message if this is the first user message
    if (chats[currentChatId].messages.length === 1 && chats[currentChatId].messages[0].content === "Hello! How can I assist you today?") {
      chats[currentChatId].messages = [];
      chatArea.innerHTML = "";
    }

    // Prepare message content
    let fullMessage = "";
    if (uploadedImage) {
      fullMessage += `<img src="${uploadedImage}" alt="Uploaded Image" style="max-width: 200px; border-radius: 8px;"><br>`;
    }
    if (userMessage) {
      fullMessage += userMessage;
    }

    // Add user message to UI and save
    const userMsgElement = createMessage(fullMessage, "user");
    chatArea.appendChild(userMsgElement);
    chats[currentChatId].messages.push({ role: "user", content: fullMessage });
    saveChats();

    // Reset input field
    inputField.value = "";
    inputField.style.height = "auto";
    scrollToBottom();

    // Show loading indicator
    const loadingMsgElement = createMessage(
      `<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`, 
      "bot"
    );
    chatArea.appendChild(loadingMsgElement);
    scrollToBottom();
    updateChatHistory(); // Update history to show the new message title

    try {
      // Prepare API request
      let requestBody = {
        contents: [{
          parts: [{ text: userMessage }]
        }]
      };

      // Add image to request if present
      if (uploadedImageBase64) {
        requestBody.contents[0].parts.push({
          inline_data: {
            mime_type: uploadedMimeType,
            data: uploadedImageBase64
          }
        });
      }

      // Send request to AI API
     const response = await fetch(API_URL, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(requestBody)
      });

      const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "API request failed");
        }

      // Format the AI response
      let aiResponse = data.candidates[0].content.parts[0].text.trim();
      aiResponse = aiResponse
        .replace(/(?:\r\n|\r|\n)/g, "<br>") // Preserve line breaks
        .replace(/### (.*?)<br>/g, "<h3>$1</h3>") // Convert Markdown headings
        .replace(/## (.*?)<br>/g, "<h2>$1</h2>")
        .replace(/# (.*?)<br>/g, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
        .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>") // Code blocks
        .replace(/`([^`]+)`/g, "<code>$1</code>"); // Inline code

      // Replace loading with actual response
      chatArea.removeChild(loadingMsgElement);
      const botMsgElement = createMessage(aiResponse, "bot");
      chatArea.appendChild(botMsgElement);
      scrollToBottom();

      // Save the AI response
      chats[currentChatId].messages.push({ role: "bot", content: aiResponse });
      saveChats();

      // Clear uploaded image if present
      if (uploadedImage) {
        removeUploadedImage();
      }

    } catch (error) {
      console.error("Error communicating with API:", error);
      
      // Show error message
      chatArea.removeChild(loadingMsgElement);
      const errorMsg = createMessage(
        "Sorry, I couldn't process your request. Please try again later.", 
        "bot"
      );
      chatArea.appendChild(errorMsg);
      scrollToBottom();
      
      // Save the error message
      chats[currentChatId].messages.push({ 
        role: "bot", 
        content: "Sorry, I couldn't process your request. Please try again later." 
      });
      saveChats();
    }
  }

  /**
   * Mobile specific optimizations
   */
  function setupMobileOptimizations() {
    // Fix iOS Safari 100vh issue
    const appHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', appHeight);
    appHeight();
    
    // Add mobile dark mode toggle for smaller screens and handle resize
    const handleMobileToggle = () => {
      const existingToggle = document.querySelector('.mobile-dark-toggle');
      
      if (window.innerWidth <= 768) {
        if (!existingToggle) {
          const mobileToggle = document.createElement('button');
          mobileToggle.className = 'mobile-dark-toggle';
          mobileToggle.innerHTML = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
          mobileToggle.setAttribute('aria-label', 'Toggle dark mode');
          document.body.appendChild(mobileToggle);
          mobileToggle.addEventListener('click', toggleDarkMode);
        }
      } else {
        // Remove toggle if screen is larger than mobile
        if (existingToggle) {
          existingToggle.remove();
        }
      }
      
      // Ensure active chat is highlighted after resize
      updateActiveChatStyle();
    };
    
    // Call initially and add resize listener
    handleMobileToggle();
    window.addEventListener('resize', handleMobileToggle);
    
    // Force update of chat history and active chat when screen size changes
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // Debounce the resize event
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Force update theme colors
        updateThemeColors();
        // Force update chat highlighting
        updateActiveChatStyle();
      }, 250);
    });
  }

  // Initialize the application
  initApp();

  //sidebar toggle
  const mobileToggle = document.getElementById('mobileSidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  
  function toggleSidebar() {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    document.querySelector('.container').classList.toggle('sidebar-hidden', isCollapsed);
  }
  
  
  mobileToggle?.addEventListener('click', toggleSidebar);

});

//api key -- sk-dFgqagteV09lapmEoDT1j0bP3eBgku2bHgtjIM5Jk3qbHWgU