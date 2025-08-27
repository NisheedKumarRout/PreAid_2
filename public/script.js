document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const healthIssueInput = document.getElementById('health-issue');
    const micButton = document.getElementById('mic-button');
    const getAdviceButton = document.getElementById('get-advice');
    const adviceResult = document.getElementById('advice-result');
    const currentYearElement = document.getElementById('current-year');
    const themeToggle = document.getElementById('theme-toggle'); // Added theme toggle button
  
    // Set current year in the footer
    currentYearElement.textContent = new Date().getFullYear();

    // Add history panel functionality
    async function loadHistoryPanel() {
      const history = await loadUserHistory();
      if (history.length > 0) {
        showHistoryPanel(history);
      }
    }

    function showHistoryPanel(history) {
      let historyPanel = document.getElementById('history-panel');
      if (!historyPanel) {
        historyPanel = document.createElement('div');
        historyPanel.id = 'history-panel';
        historyPanel.className = 'history-panel';
        document.querySelector('.form-container').appendChild(historyPanel);
      }
      
      const recentHistory = history.slice(-5).reverse();
      historyPanel.innerHTML = `
        <h3>Recent Consultations</h3>
        <div class="history-items">
          ${recentHistory.map((item, index) => `
            <div class="history-item" data-index="${history.length - 1 - index}">
              <div class="history-content" onclick="fillInput('${item.issue.replace(/'/g, "\\'")}')">  
                <div class="history-issue">${item.issue}</div>
                <div class="history-date">${new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
              <div class="history-actions">
                <button class="history-btn edit-btn" onclick="editHistory(${history.length - 1 - index})" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="history-btn share-btn" onclick="shareHistory(${history.length - 1 - index})" title="Share">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  </svg>
                </button>
                <button class="history-btn delete-btn" onclick="deleteHistory(${history.length - 1 - index})" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    window.fillInput = function(issue) {
      healthIssueInput.value = issue;
      healthIssueInput.focus();
    }
    
    window.editHistory = function(index) {
      loadUserHistory().then(history => {
        if (history[index]) {
          healthIssueInput.value = history[index].issue;
          healthIssueInput.focus();
        }
      });
    }
    
    window.shareHistory = function(index) {
      loadUserHistory().then(history => {
        if (history[index]) {
          const item = history[index];
          const shareText = `Health Issue: ${item.issue}\n\nAdvice: ${item.advice}`;
          if (navigator.share) {
            navigator.share({ title: 'Health Consultation', text: shareText });
          } else {
            navigator.clipboard.writeText(shareText).then(() => {
              alert('Copied to clipboard!');
            });
          }
        }
      });
    }
    
    window.deleteHistory = async function(index) {
      if (confirm('Delete this consultation?')) {
        try {
          const response = await fetch('/api/history?index=' + index, {
            method: 'DELETE',
            headers: { 'X-User-Id': getUserId() }
          });
          if (response.ok) {
            loadHistoryPanel();
          }
        } catch (error) {
          console.error('Error deleting history:', error);
        }
      }
    }
  
    // Theme management
    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  
    // Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check for system preference
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDarkMode ? 'dark' : 'light');
    }
  
    // Toggle theme on button click
    themeToggle.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    });
  
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) { // Only update if user hasn't manually set theme
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  
    // Initialize speech recognition
    let recognition = null;
    let isListening = false;
    const isRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  
    function initSpeechRecognition() {
      if (!isRecognitionSupported) {
        micButton.classList.add('not-supported');
        micButton.title = 'Voice input not supported in this browser';
        return;
      }
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
  
      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        healthIssueInput.value = transcript;
        resetMicButton();
        setTimeout(() => getAdviceButton.click(), 500);
      };
  
      recognition.onend = function() {
        resetMicButton();
      };
      
      recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
        resetMicButton();
        if (event.error === 'not-allowed') {
          micButton.classList.add('not-supported');
          micButton.title = 'Microphone access denied';
        }
      };
    }
    
    function resetMicButton() {
      isListening = false;
      micButton.classList.remove('listening');
      micButton.title = 'Voice input';
      const animation = document.getElementById('listening-animation');
      if (animation) animation.remove();
    }
  
    micButton.addEventListener('click', function () {
      if (!isRecognitionSupported || micButton.classList.contains('not-supported')) {
        return;
      }
      
      if (isListening) {
        if (recognition) {
          recognition.stop();
        }
        resetMicButton();
      } else {
        // Create fresh recognition instance each time
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function (event) {
          const transcript = event.results[0][0].transcript;
          healthIssueInput.value = transcript;
          resetMicButton();
          setTimeout(() => getAdviceButton.click(), 500);
        };
    
        recognition.onend = function() {
          resetMicButton();
        };
        
        recognition.onerror = function (event) {
          console.error('Speech recognition error:', event.error);
          resetMicButton();
        };
        
        isListening = true;
        micButton.classList.add('listening');
        micButton.title = 'Stop listening';
        
        const animation = document.createElement('div');
        animation.id = 'listening-animation';
        animation.innerHTML = `<div class="dot dot1"></div><div class="dot dot2"></div><div class="dot dot3"></div>`;
        document.querySelector('.mic-container').appendChild(animation);
  
        try {
          recognition.start();
          setTimeout(() => {
            if (isListening && recognition) {
              recognition.stop();
              resetMicButton();
            }
          }, 8000);
        } catch (e) {
          console.error('Error starting speech recognition:', e);
          resetMicButton();
        }
      }
    });
    
    initSpeechRecognition();
  
    getAdviceButton.addEventListener('click', async function () {
      const healthIssue = healthIssueInput.value.trim();
      if (!healthIssue) {
        showError("Please describe your health issue to get advice.");
        return;
      }
  
      showLoading();
  
      try {
        const advice = await getHealthAdvice(healthIssue);
        displayAdvice(advice, healthIssue);
        loadHistoryPanel(); // Refresh history after new advice
      } catch (error) {
        showError(error.message || "Network error. Please check your connection and try again.");
      }
    });

    // Load history panel on page load
    loadHistoryPanel();
  
    healthIssueInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') getAdviceButton.click();
    });
  
// Generate or get user ID
function getUserId() {
    let userId = localStorage.getItem('preaid-user-id');
    if (!userId) {
        userId = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('preaid-user-id', userId);
    }
    return userId;
}

// Load user history
async function loadUserHistory() {
    try {
        const response = await fetch('/api/history', {
            headers: { 'X-User-Id': getUserId() }
        });
        return response.ok ? await response.json() : [];
    } catch {
        return [];
    }
}

async function getHealthAdvice(issue) {
    try {
        const response = await fetch('/api/health-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': getUserId()
            },
            body: JSON.stringify({ issue })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get health advice');
        }

        return data.advice;
    } catch (error) {
        console.error('Error fetching health advice:', error);
        throw error;
    }
}
  
    function displayAdvice(advice, query) {
      const formattedAdvice = formatAdvice(advice);
      const plainTextAdvice = stripHtmlTags(advice);
  
      const adviceHTML = `
        <div class="result-header">
          <div class="hex-icon" style="width: 32px; height: 28px; margin-right: 10px;">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="result-title">Health Advice for "${query}"</h3>
          <div class="result-actions">
            <div class="speech-controls">
              <button id="speak-advice" class="speak-button" aria-label="Listen to advice" title="Listen to advice">
                <svg xmlns="http://www.w3.org/2000/svg" class="speak-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <div class="speed-control">
                <label for="speech-speed">Speed:</label>
                <input type="range" id="speech-speed" min="0.5" max="2" step="0.1" value="1" title="Speech Speed">
                <span id="speed-value">1x</span>
              </div>
            </div>
            <button id="share-advice" class="share-button" aria-label="Share advice" title="Share advice">
              <svg xmlns="http://www.w3.org/2000/svg" class="share-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
        <div class="result-content">${formattedAdvice}</div>
        <div class="disclaimer-note">
          <b>Note:</b> This advice is generated by AI and should not replace professional medical consultation.
        </div>
      `;
  
      adviceResult.innerHTML = adviceHTML;
      adviceResult.classList.add('show');
  
      // Add share modal to the DOM if it doesn't exist
      if (!document.getElementById('share-modal')) {
        const shareModalHTML = `
          <div id="share-modal" class="share-modal">
            <div class="share-modal-content">
              <div class="share-modal-header">
                <h3>Share Health Advice</h3>
                <button id="close-share-modal" class="close-share-modal">&times;</button>
              </div>
              <div class="share-modal-body">
                <p>Choose how you'd like to share:</p>
                <div class="share-options">
                  <button id="share-email" class="share-option-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                  <button id="share-whatsapp" class="share-option-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.241-.584-.486-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                      <path d="M20.52 3.449a12.871 12.871 0 00-9.07-3.769 13 13 0 00-11.092 19.9l-1.352 4.943 5.046-1.336A13.039 13.039 0 0012 24c6.988 0 12.5-5.512 12.5-12.5 0-3.248-1.23-6.253-3.48-8.501zM12 22.125a10.954 10.954 0 01-5.907-1.729l-.422-.254-4.395 1.156.934-3.85-.422-.422A10.919 10.919 0 012.625 12c0-5.964 4.8-10.956 10.794-10.956 2.934 0 5.612 1.148 7.699 3.235a10.87 10.87 0 013.117 7.723c-.003 6.157-4.984 11.125-11.235 11.125z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button id="share-sms" class="share-option-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    SMS
                  </button>
                  <button id="share-copy" class="share-option-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Text
                  </button>
                  <button id="share-twitter" class="share-option-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                    </svg>
                    Twitter
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', shareModalHTML);
      }
  
      const speakButton = document.getElementById('speak-advice');
      const speedSlider = document.getElementById('speech-speed');
      const speedValue = document.getElementById('speed-value');
      
      if (speakButton) {
        speakButton.addEventListener('click', () => speakText(plainTextAdvice));
      }
      
      if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
          const speed = parseFloat(e.target.value);
          speedValue.textContent = speed + 'x';
          localStorage.setItem('speech-speed', speed);
        });
        
        // Load saved speed
        const savedSpeed = localStorage.getItem('speech-speed') || '1';
        speedSlider.value = savedSpeed;
        speedValue.textContent = savedSpeed + 'x';
      }
  
      const shareButton = document.getElementById('share-advice');
      const shareModal = document.getElementById('share-modal');
      const closeShareModal = document.getElementById('close-share-modal');
      const shareTitle = `Health advice for: ${query}`;
      const shareText = `Health advice from PreAid: ${plainTextAdvice.substring(0, 100)}...`;
  
      if (shareButton) {
        shareButton.addEventListener('click', () => {
          if (shareModal) {
            shareModal.classList.add('show');
          }
        });
      }
  
      if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
          if (shareModal) {
            shareModal.classList.remove('show');
          }
        });
      }
  
      window.addEventListener('click', (e) => {
        if (e.target === shareModal) {
          shareModal.classList.remove('show');
        }
      });
  
      const emailButton = document.getElementById('share-email');
      if (emailButton) {
        emailButton.addEventListener('click', () => {
          const mailtoLink = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(plainTextAdvice)}`;
          window.open(mailtoLink);
          shareModal.classList.remove('show');
        });
      }
  
      const whatsappButton = document.getElementById('share-whatsapp');
      if (whatsappButton) {
        whatsappButton.addEventListener('click', () => {
          const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n\n${plainTextAdvice}`)}`;
          window.open(whatsappLink);
          shareModal.classList.remove('show');
        });
      }
  
      const smsButton = document.getElementById('share-sms');
      if (smsButton) {
        smsButton.addEventListener('click', () => {
          const smsLink = `sms:?body=${encodeURIComponent(`${shareTitle}\n\n${plainTextAdvice}`)}`;
          window.open(smsLink);
          shareModal.classList.remove('show');
        });
      }
  
      const twitterButton = document.getElementById('share-twitter');
      if (twitterButton) {
        twitterButton.addEventListener('click', () => {
          const twitterText = `${shareTitle.substring(0, 50)}... ${plainTextAdvice.substring(0, 100)}...`;
          const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`;
          window.open(twitterLink);
          shareModal.classList.remove('show');
        });
      }
  
      const copyButton = document.getElementById('share-copy');
      if (copyButton) {
        copyButton.addEventListener('click', () => {
          const tempElement = document.createElement('textarea');
          tempElement.value = `${shareTitle}\n\n${plainTextAdvice}`;
          document.body.appendChild(tempElement);
          tempElement.select();
  
          try {
            document.execCommand('copy');
            copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Copied!`;
  
            setTimeout(() => {
              copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Text`;
            }, 2000);
          } catch (err) {
            console.error('Failed to copy: ', err);
          }
  
          document.body.removeChild(tempElement);
  
          setTimeout(() => {
            shareModal.classList.remove('show');
          }, 1500);
        });
      }
    }
  
    function stripHtmlTags(html) {
      const div = document.createElement('div');
      div.innerHTML = html;
      let text = div.textContent || div.innerText || '';
      // Clean up text for speech
      text = text.replace(/[*#_`~]/g, ''); // Remove markdown symbols
      text = text.replace(/\s+/g, ' '); // Replace multiple spaces with single space
      text = text.replace(/([.!?])\s*([A-Z])/g, '$1 $2'); // Add space after punctuation
      return text.trim();
    }
  
    function formatAdvice(text) {
      const paragraphs = text.split('\n\n');
      let formatted = '';
      paragraphs.forEach(para => {
        if (para.includes('- ')) {
          const items = para.split('- ').filter(i => i.trim());
          formatted += '<ul>' + items.map(i => `<li>${i.trim()}</li>`).join('') + '</ul>';
        } else {
          formatted += `<p>${para}</p>`;
        }
      });
      return formatted;
    }
  
    function showLoading() {
      adviceResult.innerHTML = `
        <div class="loading">
          <div class="loading-icon">
            <div class="loading-pulse"></div>
            <div class="loading-hex">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
          </div>
          <p class="loading-text">Analyzing your health concern...</p>
        </div>
      `;
      adviceResult.classList.add('show');
    }
  
    function showError(msg) {
      const isInput = msg.includes('Please describe');
      adviceResult.innerHTML = `
        <div class="${isInput ? 'warning' : 'error'}">
          <div class="${isInput ? 'warning-icon' : 'error-icon'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="${isInput ? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'}"/>
            </svg>
          </div>
          <div class="${isInput ? 'warning-message' : 'error-message'}">${msg}</div>
        </div>
      `;
      adviceResult.classList.add('show');
    }
  
    // ============ SPEECH SYNTHESIS ============
    let currentUtterance = null;
    let voices = [];
  
    function initSpeechSynthesis() {
      if ('speechSynthesis' in window) {
        voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
          };
        }
      }
    }
  
    initSpeechSynthesis();
  
    function speakText(text) {
      if ('speechSynthesis' in window) {
        const speakButton = document.getElementById('speak-advice');
        
        // Stop current speech if playing
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          speakButton?.classList.remove('speaking');
          currentUtterance = null;
          return;
        }
  
        const utterance = new SpeechSynthesisUtterance(text);
        const englishVoice = voices.find(voice => voice.lang.includes('en-'));
        if (englishVoice) utterance.voice = englishVoice;
  
        // Get speed from slider
        const speedSlider = document.getElementById('speech-speed');
        const speed = speedSlider ? parseFloat(speedSlider.value) : 1;
        
        utterance.rate = speed;
        utterance.pitch = 1;
        utterance.volume = 1;
  
        currentUtterance = utterance;
  
        utterance.onstart = () => {
          speakButton?.classList.add('speaking');
        };
  
        utterance.onend = () => {
          speakButton?.classList.remove('speaking');
          currentUtterance = null;
        };
  
        utterance.onerror = () => {
          speakButton?.classList.remove('speaking');
          currentUtterance = null;
        };
  
        window.speechSynthesis.speak(utterance);
      } else {
        alert('Text-to-speech is not supported in your browser.');
      }
    }
  });
