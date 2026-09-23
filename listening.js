/**
 * TalkOnEnglish — Listening Module
 * Handles audiobook cards, Web Speech API narration with natural voice selection,
 * and randomized option comprehension tests.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const audiobooksGrid = document.getElementById('audiobooks-grid');
  const testContainer = document.getElementById('listening-test-container');

  // State
  let audiobooksData = [];
  let currentBook = null;
  let testQuestions = [];
  let currentQuestionIndex = 0;
  let testScore = 0;
  let isAnswering = false;
  let questionAnswers = {};

  // Speech Synthesis State
  let currentSpeakingBookId = null;
  let availableVoices = [];

  // Level badge CSS classes
  const levelBadgeClasses = {
    'Beginner': 'badge-beginner',
    'Intermediate': 'badge-intermediate',
    'Advanced': 'badge-advanced'
  };

  // Level Icons
  const levelIcons = {
    'Beginner': '🌱',
    'Intermediate': '🌿',
    'Advanced': '🌳'
  };

  // Cache available system voices
  function loadVoices() {
    if ('speechSynthesis' in window) {
      availableVoices = window.speechSynthesis.getVoices();
    }
  }

  loadVoices();
  if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Find the most natural English voice available in the user's browser/system
  function findBestEnglishVoice() {
    if (!availableVoices.length && 'speechSynthesis' in window) {
      availableVoices = window.speechSynthesis.getVoices();
    }

    // Preferred natural voice names (Chrome, Edge, Windows, macOS/iOS)
    const preferredNames = [
      'Google US English',
      'Microsoft Zira',
      'Samantha',
      'Microsoft Jenny',
      'Microsoft Guy',
      'Google UK English Female',
      'Google UK English Male',
      'Daniel',
      'Karen',
      'Alex'
    ];

    // 1. Search for preferred natural voices
    for (const name of preferredNames) {
      const match = availableVoices.find((v) =>
        v.name.toLowerCase().includes(name.toLowerCase()) &&
        (v.lang.toLowerCase().includes('en') || v.lang.startsWith('en'))
      );
      if (match) return match;
    }

    // 2. Search for any en-US voice
    const enUS = availableVoices.find((v) => v.lang === 'en-US' || v.lang === 'en_US');
    if (enUS) return enUS;

    // 3. Fallback to any voice with English language tag
    const anyEn = availableVoices.find((v) =>
      v.lang.toLowerCase().includes('en') || v.lang.startsWith('en')
    );
    if (anyEn) return anyEn;

    return null;
  }

  // Load Audiobooks Data
  async function loadAudiobooks() {
    try {
      const response = await fetch('data/listening.json');
      if (!response.ok) {
        throw new Error(`Failed to load listening.json: ${response.status}`);
      }
      audiobooksData = await response.json();
      const listeningTotals = {};
      audiobooksData.forEach((book, index) => {
        listeningTotals[`story_${index + 1}`] = (book.questions || []).length;
      });
      localStorage.setItem('listening_totals', JSON.stringify(listeningTotals));
      renderAudiobookCards();
      window.dispatchEvent(new CustomEvent('learning-progress-updated'));
    } catch (error) {
      console.error('Error loading audiobooks data:', error);
      if (audiobooksGrid) {
        audiobooksGrid.innerHTML = `
          <div class="error-message">
            <p>Failed to load audiobooks. Please check your connection and reload.</p>
          </div>
        `;
      }
    }
  }

  // Stop any active speech synthesis
  function stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    currentSpeakingBookId = null;
    updateAllPlayButtons();
  }

  // Update UI of play/stop buttons based on currentSpeakingBookId
  function updateAllPlayButtons() {
    const playButtons = document.querySelectorAll('.audio-speech-btn');
    playButtons.forEach((btn) => {
      const bookId = parseInt(btn.dataset.bookId, 10);
      if (bookId === currentSpeakingBookId) {
        btn.classList.add('playing');
        btn.innerHTML = `<span class="btn-icon">⏹</span> Stop Audio`;
        btn.setAttribute('aria-label', 'Stop audio narration');
      } else {
        btn.classList.remove('playing');
        btn.innerHTML = `<span class="btn-icon">▶</span> Play Audio`;
        btn.setAttribute('aria-label', 'Play audio narration');
      }
    });
  }

  // Toggle narration playback using Web Speech API
  function toggleAudiobookSpeech(book) {
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support the Web Speech API.');
      return;
    }

    // If currently speaking this book, toggle stop
    if (currentSpeakingBookId === book.id) {
      stopSpeech();
      return;
    }

    // Cancel any ongoing speech before starting a new one
    stopSpeech();

    const textToRead = book.text || book.description;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    // Natural English parameters
    utterance.lang = 'en-US';
    utterance.rate = 0.9;  // Slightly slower, clear and natural pace
    utterance.pitch = 1.0; // Natural tone

    const bestVoice = findBestEnglishVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      currentSpeakingBookId = book.id;
      updateAllPlayButtons();
    };

    utterance.onend = () => {
      currentSpeakingBookId = null;
      updateAllPlayButtons();
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', event);
      }
      currentSpeakingBookId = null;
      updateAllPlayButtons();
    };

    currentSpeakingBookId = book.id;
    updateAllPlayButtons();

    // Start speaking immediately
    window.speechSynthesis.speak(utterance);
  }

  // Fisher-Yates shuffle helper to randomize option order
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Render 3 Audiobook Cards
  function renderAudiobookCards() {
    if (!audiobooksGrid || !audiobooksData.length) return;

    audiobooksGrid.innerHTML = audiobooksData.map((book) => {
      const badgeClass = levelBadgeClasses[book.level] || 'badge-intermediate';
      const icon = levelIcons[book.level] || '🎧';

      return `
        <article class="audiobook-card" data-id="${book.id}">
          <div class="audiobook-card-header">
            <span class="audiobook-level-badge ${badgeClass}">${icon} ${escapeHtml(book.level)}</span>
            <h3 class="audiobook-title">${escapeHtml(book.title)}</h3>
          </div>

          <p class="audiobook-description">${escapeHtml(book.description)}</p>

          <div class="audiobook-player-box">
            <div class="player-header">
              <span class="player-label">Listen to chapter audio:</span>
              <span class="speech-badge">🎙️ Natural Voice (0.9x)</span>
            </div>
            <button class="audio-speech-btn" type="button" data-book-id="${book.id}">
              <span class="btn-icon">▶</span> Play Audio
            </button>
          </div>

          <div class="audiobook-card-footer">
            <button class="take-test-btn" type="button" data-book-id="${book.id}">
              <span class="btn-icon">📝</span> Take a test of this book
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach Play / Stop click listeners
    audiobooksGrid.querySelectorAll('.audio-speech-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bookId = parseInt(btn.dataset.bookId, 10);
        const selected = audiobooksData.find((b) => b.id === bookId);
        if (selected) {
          toggleAudiobookSpeech(selected);
        }
      });
    });

    // Attach click listeners to "Take a test of this book" buttons
    audiobooksGrid.querySelectorAll('.take-test-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bookId = parseInt(btn.dataset.bookId, 10);
        const selected = audiobooksData.find((b) => b.id === bookId);
        if (selected) {
          startBookTest(selected);
        }
      });
    });
  }

  // Start Comprehension Test for a specific book
  function startBookTest(book) {
    stopSpeech();
    currentBook = book;
    currentQuestionIndex = 0;
    testScore = 0;
    questionAnswers = {};
    isAnswering = false;

    // Load questions from the book (shuffling will happen during render)
    testQuestions = (book.questions || []).map((q) => ({
      question: q.question,
      correct: q.correct,
      options: q.options
    }));

    // Switch view
    audiobooksGrid.classList.add('hidden');
    testContainer.classList.remove('hidden');

    renderTestQuestion();
  }

  // Close Test and Return to Books Grid
  function closeTest() {
    stopSpeech();
    testContainer.classList.add('hidden');
    audiobooksGrid.classList.remove('hidden');
    currentBook = null;
    testQuestions = [];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render Individual Test Question
  function renderTestQuestion() {
    if (!testQuestions || !testQuestions.length) return;

    if (currentQuestionIndex >= testQuestions.length) {
      renderTestResults();
      return;
    }

    const q = testQuestions[currentQuestionIndex];
    const savedAnswer = questionAnswers[currentQuestionIndex];
    isAnswering = Boolean(savedAnswer);
    const progressPercent = Math.round((currentQuestionIndex / testQuestions.length) * 100);

    // Shuffle options right before rendering to ensure variety in each test session
    const shuffledOptions = shuffleArray(q.options || []);

    testContainer.innerHTML = `
      <div class="listening-test-card">
        <!-- Top bar of test -->
        <div class="test-top-bar">
          <button class="test-return-btn" type="button" id="exit-test-btn">
            ← Return to Audiobooks
          </button>
          <span class="test-book-tag">📖 ${escapeHtml(currentBook.title)}</span>
        </div>

        <!-- Progress Header -->
        <div class="task-quiz-header">
          <div class="task-progress-info">
            <span class="task-step">Question ${currentQuestionIndex + 1} of ${testQuestions.length}</span>
            <span class="task-score-pill">Score: ${testScore}</span>
          </div>
          <div class="task-progress-bar-bg">
            <div class="task-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <!-- Question Text -->
        <div class="listening-question-box">
          <h3 class="listening-question-text">${escapeHtml(q.question)}</h3>
          <p class="task-prompt">Choose the correct answer based on the audio:</p>
        </div>

        <!-- Shuffled Options with letter markers (A, B, C) -->
        <div class="listening-options-list">
          ${shuffledOptions.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            return `
              <button class="listening-option-btn ${savedAnswer?.chosen === opt ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''} ${savedAnswer && opt === q.correct ? 'correct' : ''}" type="button" data-option="${escapeHtml(opt)}" ${savedAnswer ? 'disabled' : ''}>
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div class="test-navigation"><button class="test-nav-btn" id="listening-previous" type="button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Previous</button><button class="test-nav-btn primary" id="listening-next" type="button" ${savedAnswer ? '' : 'disabled'}>${currentQuestionIndex === testQuestions.length - 1 ? 'Finish Test' : 'Next Question →'}</button></div>
      </div>
    `;

    // Exit test listener
    document.getElementById('exit-test-btn')?.addEventListener('click', closeTest);

    // Options click listeners
    const optionBtns = testContainer.querySelectorAll('.listening-option-btn');
    optionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isAnswering) return;
        isAnswering = true;

        const chosen = btn.dataset.option;
        const isCorrect = chosen === q.correct;

        questionAnswers[currentQuestionIndex] = { chosen, correct: isCorrect };
        testScore = Object.values(questionAnswers).filter((answer) => answer.correct).length;
        if (isCorrect) {
          btn.classList.add('correct');
          testScore++;
        } else {
          btn.classList.add('incorrect');
          // Highlight correct option
          optionBtns.forEach((b) => {
            if (b.dataset.option === q.correct) {
              b.classList.add('correct');
            }
          });
          window.attachExplainButton?.(testContainer, q.question, chosen, q.correct);
        }

        // Disable options
        optionBtns.forEach((b) => {
          b.disabled = true;
        });
        testContainer.querySelector('#listening-next').disabled = false;

      });
    });
    if (savedAnswer && !savedAnswer.correct) window.attachExplainButton?.(testContainer, q.question, savedAnswer.chosen, q.correct);
    testContainer.querySelector('#listening-previous').addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex -= 1; renderTestQuestion(); } });
    testContainer.querySelector('#listening-next').addEventListener('click', () => { if (currentQuestionIndex === testQuestions.length - 1) renderTestResults(); else { currentQuestionIndex += 1; renderTestQuestion(); } });
  }

  // Render Test Completion Results
  function renderTestResults() {
    const total = testQuestions.length;
    const percentage = Math.round((testScore / total) * 100);

    const storyIndex = audiobooksData.findIndex((book) => book.id === currentBook.id);
    if (storyIndex >= 0) {
      let listeningScores = {};
      try {
        listeningScores = JSON.parse(localStorage.getItem('listening_scores') || '{}');
      } catch (error) {
        listeningScores = {};
      }
      listeningScores[`story_${storyIndex + 1}`] = testScore;
      localStorage.setItem('listening_scores', JSON.stringify(listeningScores));
      window.dispatchEvent(new CustomEvent('learning-progress-updated'));
    }

    if (typeof window.recordLearningActivity === 'function') {
      window.recordLearningActivity({
        testCompleted: true,
        correctAnswers: testScore,
        totalAnswers: total
      });
    }

    let feedbackEmoji = '🎉';
    let feedbackText = 'Superb listening comprehension! You understood the material well.';
    if (percentage < 60) {
      feedbackEmoji = '🎧';
      feedbackText = 'You might want to listen to the audio track again and retry.';
    } else if (percentage < 80) {
      feedbackEmoji = '👏';
      feedbackText = 'Good effort! A few details were missed, but overall great understanding.';
    }

    testContainer.innerHTML = `
      <div class="task-result-card">
        <div class="result-icon">${feedbackEmoji}</div>
        <h3 class="result-title">Comprehension Test Finished!</h3>
        <p class="result-subtitle">${feedbackText}</p>
        
        <div class="result-score-box">
          <span class="result-score-number">${testScore}/${total} correct answers!</span>
          <span class="result-score-percent">(${percentage}% accuracy for "${escapeHtml(currentBook.title)}")</span>
        </div>

        <div class="result-actions">
          <button id="retry-book-test-btn" class="btn-primary" type="button">
            🔄 Retry Test
          </button>
          <button id="back-to-books-btn" class="btn-secondary" type="button">
            📚 Return to Audiobooks
          </button>
        </div>
      </div>
    `;

    document.getElementById('retry-book-test-btn')?.addEventListener('click', () => {
      // Reset state for retry; options will be reshuffled in renderTestQuestion
      currentQuestionIndex = 0;
      testScore = 0;
      questionAnswers = {};
      renderTestQuestion();
    });

    document.getElementById('back-to-books-btn')?.addEventListener('click', closeTest);
  }

  // Stop audio whenever the user navigates away using 'Back to Menu'
  document.querySelectorAll('.back-to-menu-btn').forEach((btn) => {
    btn.addEventListener('click', stopSpeech);
  });

  // Stop audio if page is unloaded or tab is closed
  window.addEventListener('beforeunload', stopSpeech);

  // Utility to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize
  loadAudiobooks();
});
