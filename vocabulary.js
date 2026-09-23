/**
 * TalkOnEnglish — Vocabulary Module
 * Handles word levels (A1-A2, B1-B2, C1-C2) and interactive gap-fill tasks.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const subtabButtons = document.querySelectorAll('.vocab-tab-btn');
  const cardsGrid = document.getElementById('vocab-cards-grid');
  const tasksContainer = document.getElementById('vocab-tasks-container');

  // State
  let vocabData = null;
  let currentTab = 'A1_A2';
  let currentTaskIndex = 0;
  let taskScore = 0;
  let isAnswering = false;
  let activeTasks = [];
  let taskAnswers = {};
  let activeCategory = 'all';
  const vocabularyScoreKey = 'vocab_scores';
  const favoritesStorageKey = 'favorite_words';

  // Load Data
  async function loadVocabularyData() {
    try {
      const response = await fetch('data/words.json');
      if (!response.ok) {
        throw new Error(`Failed to load words.json: ${response.status}`);
      }
      vocabData = await response.json();
      // Initially render default level
      renderWords(currentTab);
    } catch (error) {
      console.error('Error loading vocabulary data:', error);
      if (cardsGrid) {
        cardsGrid.innerHTML = `
          <div class="error-message">
            <p>Failed to load vocabulary data. Please check connection and try again.</p>
          </div>
        `;
      }
    }
  }

  // Audio pronunciation helper (Web Speech API)
  function speakWord(word) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for clarity
      window.speechSynthesis.speak(utterance);
    }
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

  // Render Word Cards for a given level
  function renderWords(levelKey) {
    if (!vocabData || !vocabData[levelKey]) return;
    const words = vocabData[levelKey].map((item) => ({
      ...item,
      category: item.category || getWordCategory(item.word)
    }));
    renderCategoryFilters(levelKey, words);
    const visibleWords = activeCategory === 'all'
      ? words
      : words.filter((item) => item.category === activeCategory);
    const groupedWords = visibleWords.reduce((groups, item) => {
      groups[item.category] = groups[item.category] || [];
      groups[item.category].push(item);
      return groups;
    }, {});

    cardsGrid.innerHTML = Object.entries(groupedWords).map(([category, categoryWords]) => `
      <section class="vocab-category-group">
        <div class="category-header">
          <h3 class="vocab-category-title"><span class="category-emoji">${getCategoryEmoji(category)}</span>${escapeHtml(category)}</h3>
          <span class="category-count">${categoryWords.length} ${categoryWords.length === 1 ? 'word' : 'words'}</span>
        </div>
        <div class="vocab-category-grid">
          ${categoryWords.map((item) => `
            <article class="word-card">
              <div class="word-card-header">
                <div class="word-title-group">
                  <h3 class="word-text">${escapeHtml(item.word)}</h3>
                  <span class="word-transcription">${escapeHtml(item.transcription || '')}</span>
                </div>
                <div class="word-card-actions">
                  <button class="favorite-word-btn ${isFavorite(item.word) ? 'active' : ''}" type="button" title="Toggle favorite" aria-label="${isFavorite(item.word) ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${isFavorite(item.word)}" data-favorite-word="${escapeHtml(item.word)}">⭐</button>
                  <button class="word-audio-btn" type="button" title="Listen pronunciation" data-speak="${escapeHtml(item.word)}" aria-label="Listen ${escapeHtml(item.word)}">🔊</button>
                </div>
              </div>
              <div class="word-translation">${escapeHtml(item.translation)}</div>
              <div class="word-example-box">
                <span class="example-label">Example:</span>
                <p class="word-example">"${escapeHtml(item.example)}"</p>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `).join('');

    // Attach speech listeners
    cardsGrid.querySelectorAll('.word-audio-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.dataset.speak;
        if (word) speakWord(word);
      });
    });
    cardsGrid.querySelectorAll('.favorite-word-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const word = btn.dataset.favoriteWord;
        const favorites = getFavorites();
        const favoriteIndex = favorites.indexOf(word);
        if (favoriteIndex >= 0) {
          favorites.splice(favoriteIndex, 1);
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-label', 'Add to favorites');
        } else {
          favorites.push(word);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', 'Remove from favorites');
        }
        localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
      });
    });
  }

  function renderCategoryFilters(levelKey, words) {
    let filters = document.getElementById('vocab-category-filters');
    if (!filters) {
      filters = document.createElement('div');
      filters.id = 'vocab-category-filters';
      filters.className = 'vocab-category-filters';
      cardsGrid.parentNode.insertBefore(filters, cardsGrid);
    }
    const categories = [...new Set(words.map((item) => item.category))].sort();
    filters.innerHTML = ['all', ...categories].map((category) => `
      <button class="category-pill ${activeCategory === category ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}">
        ${category === 'all' ? '🗂️ All Categories' : `${getCategoryEmoji(category)} ${escapeHtml(category)}`}
      </button>
    `).join('');
    filters.querySelectorAll('.category-pill').forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.category;
        renderWords(levelKey);
      });
    });
  }

  function getFavorites() {
    try {
      const favorites = JSON.parse(localStorage.getItem(favoritesStorageKey) || '[]');
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      return [];
    }
  }

  function isFavorite(word) {
    return getFavorites().includes(word);
  }

  function getCategoryEmoji(category) {
    const emojis = {
      'Food & Daily Life': '🍕',
      'Travel & Places': '✈️',
      'People & Relationships': '👥',
      'Work & Business': '💼',
      'Technology & Science': '🔬',
      'Emotions & Mind': '🧠',
      'Actions & Communication': '💬',
      'General English': '📚'
    };
    return emojis[category] || '📚';
  }

  function getWordCategory(word) {
    const normalizedWord = word.toLowerCase();
    const categoryRules = [
      ['Food & Daily Life', /apple|water|breakfast|bread|cake|coffee|drink|eat|egg|food|juice|kitchen|lunch|milk|restaurant|meal|cook|dinner|hungry/],
      ['Travel & Places', /airport|beach|boat|city|country|garden|holiday|home|library|map|park|place|region|route|school|sea|shop|street|town|train|travel|visit/],
      ['People & Relationships', /baby|brother|child|daughter|family|father|friend|girl|grandmother|mother|parent|people|sister|son|woman|boy|community/],
      ['Work & Business', /career|company|convenient|decision|develop|expert|job|meeting|office|policy|project|reliable|solution|strategy|target|work|business|budget/],
      ['Technology & Science', /computer|camera|data|digital|economic|environment|evidence|feature|generate|research|software|technology|theory|update|science|artificial|cognitive/],
      ['Emotions & Mind', /anxious|believe|confident|curious|excited|feel|happy|important|know|love|motivate|remember|think|understand|wonder|ambiguous|lucid|profound/],
      ['Actions & Communication', /answer|ask|call|choose|come|compare|contact|create|explain|find|give|help|listen|look|make|mention|read|respond|say|speak|tell|write|learn/]
    ];
    const match = categoryRules.find(([, pattern]) => pattern.test(normalizedWord));
    return match ? match[0] : 'General English';
  }

  // Render Current Task
  function getTasksForLevel(levelKey) {
    if (!vocabData) return [];
    if (levelKey === 'full_practice') return activeTasks;
    return vocabData.tasks?.[levelKey] || [];
  }

  function getWordLevel(tabKey) {
    return tabKey.replace('words_', '');
  }

  function getTestLevel(tabKey) {
    if (tabKey === 'full_practice') return 'full_practice';
    return tabKey.replace('test_', '');
  }

  function renderTask() {
    const tasks = getTasksForLevel(currentTab);
    if (!tasks.length) return;

    if (currentTaskIndex >= tasks.length) {
      renderTaskResults();
      return;
    }

    const task = tasks[currentTaskIndex];
    const savedAnswer = taskAnswers[currentTaskIndex];
    isAnswering = Boolean(savedAnswer);

    // Shuffle options for the current task
    const shuffledOptions = shuffleArray((task.options || []).slice(0, 3));

    // Format sentence to highlight blank
    const highlightedSentence = escapeHtml(task.sentence).replace('___', '<span class="task-blank">______</span>');
    const progressPercent = Math.round(((currentTaskIndex) / tasks.length) * 100);

    tasksContainer.innerHTML = `
      <div class="task-quiz-card">
        <div class="task-quiz-header">
          <div class="task-progress-info">
            <span class="task-step">Question ${currentTaskIndex + 1} of ${tasks.length}</span>
            <span class="task-score-pill">Score: ${taskScore}</span>
          </div>
          <div class="task-progress-bar-bg">
            <div class="task-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>

        <div class="task-sentence-container">
          <p class="task-sentence">${highlightedSentence}</p>
          <p class="task-prompt">Select the correct word to complete the sentence:</p>
        </div>

        <div class="task-options-grid">
          ${shuffledOptions.map((option) => `
            <button class="task-option-btn ${savedAnswer?.chosen === option ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''} ${savedAnswer && option === task.correct ? 'correct' : ''}" type="button" data-option="${escapeHtml(option)}" ${savedAnswer ? 'disabled' : ''}>
              ${escapeHtml(option)}
            </button>
          `).join('')}
        </div>
        <div class="test-navigation"><button class="test-nav-btn" id="vocab-previous" type="button" ${currentTaskIndex === 0 ? 'disabled' : ''}>← Previous</button><button class="test-nav-btn primary" id="vocab-next" type="button" ${savedAnswer ? '' : 'disabled'}>${currentTaskIndex === tasks.length - 1 ? 'Finish Test' : 'Next Question →'}</button></div>
      </div>
    `;

    // Attach Option Click Handlers
    const optionButtons = tasksContainer.querySelectorAll('.task-option-btn');
    optionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isAnswering) return;
        isAnswering = true;

        const selectedOption = btn.dataset.option;
        const isCorrect = selectedOption === task.correct;

        taskAnswers[currentTaskIndex] = { chosen: selectedOption, correct: isCorrect };
        taskScore = Object.values(taskAnswers).filter((answer) => answer.correct).length;
        if (isCorrect) {
          btn.classList.add('correct');
          taskScore++;
        } else {
          btn.classList.add('incorrect');
          // Highlight the correct one
          optionButtons.forEach((b) => {
            if (b.dataset.option === task.correct) {
              b.classList.add('correct');
            }
          });
          window.attachExplainButton?.(tasksContainer, task.sentence, selectedOption, task.correct);
        }

        // Disable all buttons after choice
        optionButtons.forEach((b) => {
          b.disabled = true;
        });
        tasksContainer.querySelector('#vocab-next').disabled = false;

      });
    });
    if (savedAnswer && !savedAnswer.correct) window.attachExplainButton?.(tasksContainer, task.sentence, savedAnswer.chosen, task.correct);
    tasksContainer.querySelector('#vocab-previous').addEventListener('click', () => { if (currentTaskIndex > 0) { currentTaskIndex -= 1; renderTask(); } });
    tasksContainer.querySelector('#vocab-next').addEventListener('click', () => { if (currentTaskIndex === tasks.length - 1) renderTaskResults(); else { currentTaskIndex += 1; renderTask(); } });
  }

  // Render Task Completion Results
  function renderTaskResults() {
    const total = getTasksForLevel(currentTab).length;
    const percentage = Math.round((taskScore / total) * 100);
    let scores = {};
    try {
      scores = JSON.parse(localStorage.getItem(vocabularyScoreKey) || '{}');
    } catch (error) {
      scores = {};
    }
    scores[currentTab] = taskScore;
    localStorage.setItem(vocabularyScoreKey, JSON.stringify(scores));
    window.dispatchEvent(new CustomEvent('learning-progress-updated'));
    if (typeof window.recordLearningActivity === 'function') {
      window.recordLearningActivity({
        testCompleted: true,
        correctAnswers: taskScore,
        totalAnswers: total
      });
    }

    let feedbackEmoji = '🎉';
    let feedbackText = 'Outstanding! You mastered these vocabulary exercises!';
    if (percentage < 50) {
      feedbackEmoji = '📚';
      feedbackText = 'Keep reviewing! Practice makes perfect.';
    } else if (percentage < 80) {
      feedbackEmoji = '👍';
      feedbackText = 'Great job! A little more practice and you will score 100%.';
    }

    tasksContainer.innerHTML = `
      <div class="task-result-card">
        <div class="result-icon">${feedbackEmoji}</div>
        <h3 class="result-title">Task Completed!</h3>
        <p class="result-subtitle">${feedbackText}</p>
        
        <div class="result-score-box">
          <span class="result-score-number">${taskScore} / ${total}</span>
          <span class="result-score-percent">(${percentage}% correct)</span>
        </div>

        <div class="result-actions">
          <button id="restart-tasks-btn" class="btn-primary" type="button">
            🔄 Restart Tasks
          </button>
          <button id="return-words-btn" class="btn-secondary" type="button">
            📖 Back to Word Cards
          </button>
        </div>
      </div>
    `;

    // Handlers for result screen buttons
    document.getElementById('restart-tasks-btn')?.addEventListener('click', () => {
      currentTaskIndex = 0;
      taskScore = 0;
      taskAnswers = {};
      renderTask();
    });

    document.getElementById('return-words-btn')?.addEventListener('click', () => {
      switchTab(`words_${currentTab === 'full_practice' ? 'A1_A2' : currentTab}`);
    });
  }

  // Switch Subtabs
  function switchTab(tabKey) {
    const isTest = tabKey.startsWith('test_') || tabKey === 'full_practice';
    currentTab = isTest ? getTestLevel(tabKey) : getWordLevel(tabKey);

    // Update tab button active states
    subtabButtons.forEach((btn) => {
      if (btn.dataset.tab === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (isTest) {
      cardsGrid.classList.add('hidden');
      tasksContainer.classList.remove('hidden');
      currentTaskIndex = 0;
      taskScore = 0;
      taskAnswers = {};
      activeTasks = currentTab === 'full_practice'
        ? shuffleArray(Object.values(vocabData.tasks || {}).flat()).slice(0, 30)
        : getTasksForLevel(currentTab);
      renderTask();
    } else {
      activeCategory = 'all';
      tasksContainer.classList.add('hidden');
      cardsGrid.classList.remove('hidden');
      renderWords(currentTab);
    }
  }

  // Tab click listeners
  subtabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;
      if (tabKey) switchTab(tabKey);
    });
  });

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
  loadVocabularyData();
});

