document.addEventListener('DOMContentLoaded', function () {
  // Elements
  const healthIssueInput = document.getElementById('health-issue');
  const micButton = document.getElementById('mic-button');
  const getAdviceButton = document.getElementById('get-advice');
  const adviceResult = document.getElementById('advice-result');
  const currentYearElement = document.getElementById('current-year');

  // Set current year in the footer
  currentYearElement.textContent = new Date().getFullYear();

  // Initialize speech recognition
  let recognition = null;
  let isListening = false;
  const isRecognitionSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  if (isRecognitionSupported) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      healthIssueInput.value = transcript;
      stopListening();
      setTimeout(() => {
        getAdviceButton.click();
      }, 300);
    };

    recognition.onend = stopListening;
    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
      stopListening();
    };
  } else {
    micButton.style.opacity = '0.5';
    micButton.style.cursor = 'not-allowed';
    micButton.title = 'Voice input is not supported in your browser';
  }

  micButton.addEventListener('click', function () {
    if (!isRecognitionSupported) return;
    isListening ? stopListening() : startListening();
  });

  function startListening() {
    if (recognition) {
      isListening = true;
      const animation = document.createElement('div');
      animation.id = 'listening-animation';
      animation.innerHTML = `<div class="dot dot1"></div><div class="dot dot2"></div><div class="dot dot3"></div>`;
      document.querySelector('.mic-container').appendChild(animation);

      try {
        recognition.start();
        setTimeout(() => {
          if (isListening) stopListening();
        }, 7000);
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        stopListening();
      }
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      isListening = false;
      const animation = document.getElementById('listening-animation');
      if (animation) animation.remove();
      try {
        recognition.stop();
      } catch {
        console.log('Recognition already stopped');
      }
    }
  }

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
    } catch (error) {
      showError(error.message || "Network error. Please check your connection and try again.");
    }
  });

  healthIssueInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') getAdviceButton.click();
  });

  async function getHealthAdvice(issue) {
    const API_KEY = "AIzaSyDJP_zSrVOGFPrN0aNqeiGEiGexzAe0aNQ";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Provide first aid or health advice for: ${issue}` }]
        }]
      })
    });

    const data = await response.json();
    if (response.ok && data.candidates && data.candidates[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error(data.error ? data.error.message : "Failed to fetch advice");
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
        <button id="speak-advice" class="speak-button" aria-label="Listen to advice" title="Listen to advice">
          <svg xmlns="http://www.w3.org/2000/svg" class="speak-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>
      <div class="result-content">${formattedAdvice}</div>
      <div class="disclaimer-note">
        <b>Note:</b> This advice is generated by AI and should not replace professional medical consultation.
      </div>
    `;

    adviceResult.innerHTML = adviceHTML;
    adviceResult.classList.add('show');

    const speakButton = document.getElementById('speak-advice');
    if (speakButton) {
      speakButton.addEventListener('click', () => speakText(plainTextAdvice));
    }

    setTimeout(() => {
      adviceResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }

  function stripHtmlTags(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
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
              d="${isInput
        ? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'}"/>
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
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (currentUtterance && currentUtterance.text === text) {
          speakButton?.classList.remove('speaking');
          currentUtterance = null;
          return;
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const englishVoice = voices.find(voice => voice.lang.includes('en-'));
      if (englishVoice) utterance.voice = englishVoice;

      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      currentUtterance = utterance;

      utterance.onstart = () => {
        speakButton?.classList.add('speaking');
        speakButton?.setAttribute('aria-label', 'Stop speaking');
        speakButton?.setAttribute('title', 'Stop speaking');
      };

      utterance.onend = () => {
        speakButton?.classList.remove('speaking');
        speakButton?.setAttribute('aria-label', 'Listen to advice');
        speakButton?.setAttribute('title', 'Listen to advice');
        currentUtterance = null;
      };

      utterance.onerror = () => {
        speakButton?.classList.remove('speaking');
        currentUtterance = null;
      };

      if (text.length > 200) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const speakSentences = (i = 0) => {
          if (i < sentences.length) {
            const sentenceUtterance = new SpeechSynthesisUtterance(sentences[i].trim());
            if (englishVoice) sentenceUtterance.voice = englishVoice;
            sentenceUtterance.rate = utterance.rate;
            sentenceUtterance.pitch = utterance.pitch;
            sentenceUtterance.onend = (i === sentences.length - 1)
              ? utterance.onend
              : () => speakSentences(i + 1);
            window.speechSynthesis.speak(sentenceUtterance);
          }
        };
        speakSentences();
      } else {
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert('Text-to-speech is not supported in your browser.');
    }
  }
});
