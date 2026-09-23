/**
 * TalkOnEnglish — Writing & Grammar Module
 * Handles grammar topic selection, theory display, and randomized practice tests.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const topicsList   = document.getElementById('grammar-topics-list');
  const theoryBox    = document.getElementById('grammar-theory-box');
  const practiceBox  = document.getElementById('grammar-practice-container');

  // State
  let grammarData          = null;
  let currentTopic         = null;
  let practiceQuestions    = [];
  let currentQuestionIndex = 0;
  let practiceScore        = 0;
  let isAnswering          = false;
  let practiceAnswers      = {};
  const tenseMiniQuizStorageKey = 'talkOnEnglish.tenseMiniQuizzes';
  const TENSE_MINI_QUIZZES = [
    {
      key: 'present-simple',
      questions: [
        { question: 'She ___ coffee every morning.', options: ['drinks', 'is drinking', 'drank', 'has drunk'], correct: 'drinks' },
        { question: 'They usually ___ lunch at noon.', options: ['have', 'are having', 'had', 'will have'], correct: 'have' },
        { question: 'Does he ___ English?', options: ['speak', 'speaks', 'speaking', 'spoke'], correct: 'speak' }
      ]
    },
    {
      key: 'present-continuous',
      questions: [
        { question: 'Look! It ___.', options: ['is raining', 'rains', 'rained', 'has rained'], correct: 'is raining' },
        { question: 'I ___ English right now.', options: ['am studying', 'study', 'studied', 'have studied'], correct: 'am studying' },
        { question: 'They ___ at the moment.', options: ['are working', 'work', 'worked', 'have worked'], correct: 'are working' }
      ]
    },
    {
      key: 'present-perfect',
      questions: [
        { question: 'I ___ my keys.', options: ['have lost', 'lost', 'am losing', 'lose'], correct: 'have lost' },
        { question: 'She ___ this movie twice.', options: ['has seen', 'saw', 'sees', 'is seeing'], correct: 'has seen' },
        { question: 'Have you ___ sushi before?', options: ['tried', 'try', 'trying', 'tries'], correct: 'tried' }
      ]
    },
    {
      key: 'present-perfect-continuous',
      questions: [
        { question: 'We ___ for two hours.', options: ['have been waiting', 'have waited', 'are waiting', 'waited'], correct: 'have been waiting' },
        { question: 'She ___ here since 2020.', options: ['has been working', 'works', 'worked', 'is working'], correct: 'has been working' },
        { question: 'It ___ all day.', options: ['has been raining', 'rained', 'rains', 'is raining'], correct: 'has been raining' }
      ]
    },
    {
      key: 'past-simple',
      questions: [
        { question: 'I ___ him yesterday.', options: ['saw', 'have seen', 'was seeing', 'see'], correct: 'saw' },
        { question: 'Did you ___ the homework?', options: ['do', 'did', 'done', 'doing'], correct: 'do' },
        { question: 'They ___ to London last year.', options: ['went', 'have gone', 'go', 'were going'], correct: 'went' }
      ]
    },
    {
      key: 'past-continuous',
      questions: [
        { question: 'I ___ TV when she called.', options: ['was watching', 'watched', 'have watched', 'watch'], correct: 'was watching' },
        { question: 'They ___ dinner at 8 pm yesterday.', options: ['were having', 'had', 'have had', 'have'], correct: 'were having' },
        { question: 'While he ___, it started to rain.', options: ['was running', 'ran', 'runs', 'has run'], correct: 'was running' }
      ]
    },
    {
      key: 'past-perfect',
      questions: [
        { question: 'The train ___ before we arrived.', options: ['had left', 'left', 'has left', 'was leaving'], correct: 'had left' },
        { question: 'She ___ dinner by 7 pm.', options: ['had cooked', 'cooked', 'has cooked', 'was cooking'], correct: 'had cooked' },
        { question: 'I knew the city because I ___ there before.', options: ['had lived', 'lived', 'have lived', 'was living'], correct: 'had lived' }
      ]
    },
    {
      key: 'past-perfect-continuous',
      questions: [
        { question: 'He was tired because he ___ all day.', options: ['had been working', 'worked', 'has worked', 'was working'], correct: 'had been working' },
        { question: 'They ___ for hours before help arrived.', options: ['had been waiting', 'waited', 'have waited', 'were waiting'], correct: 'had been waiting' },
        { question: 'Her eyes were red because she ___ all night.', options: ['had been studying', 'studied', 'has studied', 'was studying'], correct: 'had been studying' }
      ]
    },
    {
      key: 'future-simple',
      questions: [
        { question: 'I think it ___ tomorrow.', options: ['will rain', 'rains', 'is raining', 'rained'], correct: 'will rain' },
        { question: 'She ___ you later.', options: ['will call', 'calls', 'called', 'has called'], correct: 'will call' },
        { question: 'Will they ___ us?', options: ['help', 'to help', 'helping', 'helped'], correct: 'help' }
      ]
    },
    {
      key: 'future-continuous',
      questions: [
        { question: 'At 9 tomorrow, I ___.', options: ['will be flying', 'will fly', 'fly', 'am flying'], correct: 'will be flying' },
        { question: 'This time next week, we ___ on the beach.', options: ['will be relaxing', 'will relax', 'relaxed', 'have relaxed'], correct: 'will be relaxing' },
        { question: 'Will you ___ the car tonight?', options: ['be using', 'use', 'used', 'to use'], correct: 'be using' }
      ]
    },
    {
      key: 'future-perfect',
      questions: [
        { question: 'By Friday, I ___ the report.', options: ['will have finished', 'will finish', 'finish', 'finished'], correct: 'will have finished' },
        { question: 'She ___ home by 8.', options: ['will have arrived', 'will arrive', 'arrives', 'arrived'], correct: 'will have arrived' },
        { question: 'They ___ the project before the deadline.', options: ['will have completed', 'will complete', 'completed', 'complete'], correct: 'will have completed' }
      ]
    },
    {
      key: 'future-perfect-continuous',
      questions: [
        { question: 'By June, I ___ here for five years.', options: ['will have been working', 'will work', 'will have worked', 'am working'], correct: 'will have been working' },
        { question: 'By 6 pm, she ___ for three hours.', options: ['will have been studying', 'will study', 'will have studied', 'is studying'], correct: 'will have been studying' },
        { question: 'They ___ for ten hours by the time they arrive.', options: ['will have been driving', 'will drive', 'will have driven', 'drive'], correct: 'will have been driving' }
      ]
    }
  ];

  // ─── Data Loading ─────────────────────────────────────────────────────────

  async function loadGrammarData() {
    try {
      const response = await fetch('data/grammar.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      grammarData = await response.json();
      renderTopicsSidebar();
    } catch (err) {
      console.error('Failed to load grammar.json:', err);
      if (topicsList) {
        topicsList.innerHTML = `<p class="error-message">Could not load grammar data.</p>`;
      }
    }
  }

  // ─── Sidebar ──────────────────────────────────────────────────────────────

  function renderTopicsSidebar() {
    if (!topicsList || !grammarData?.topics?.length) return;

    topicsList.innerHTML = grammarData.topics.map((topic) => {
      const icon = topic.icon || '';
      return `
        <button class="grammar-topic-btn" type="button" data-topic-id="${escapeHtml(topic.id)}">
          <span class="topic-btn-icon">${escapeHtml(icon)}</span>
          <span class="topic-btn-label">${escapeHtml(topic.title)}</span>
          <span class="topic-btn-arrow">›</span>
        </button>
      `;
    }).join('');

    topicsList.querySelectorAll('.grammar-topic-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const topicId = btn.dataset.topicId;
        const topic = grammarData.topics.find((t) => t.id === topicId);
        if (topic) selectTopic(topic);
      });
    });
  }

  // ─── Topic Selection ──────────────────────────────────────────────────────

  function selectTopic(topic) {
    currentTopic = topic;

    // Highlight active sidebar button
    document.querySelectorAll('.grammar-topic-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.topicId === topic.id);
    });

    // Hide practice, show theory
    practiceBox.classList.add('hidden');
    theoryBox.classList.remove('hidden');

    renderTheory(topic);
  }

  function renderTheory(topic) {
    const icon = topic.icon || '';

    // Card-based "Bro-Explanation" theory.
    // Falls back to the old plain-text explanation when no cards are present.
    const theoryHtml = (topic.cards && topic.cards.length > 0)
      ? topic.cards.map((card, index) => renderGrammarCard(card, topic, index)).join('')
      : `<div class="theory-body">${formatExplanation(topic.explanation)}</div>`;

    theoryBox.innerHTML = `
      <div class="theory-card">
        <div class="theory-header">
          <span class="theory-icon">${icon}</span>
          <h3 class="theory-title">${escapeHtml(topic.title)}</h3>
        </div>
        <div class="theory-content-area">
          ${theoryHtml}
        </div>
        <div class="theory-footer">
          <button class="btn-primary start-practice-btn" type="button" id="start-practice-btn">
            🎯 Start Practice for this Topic
            <span class="practice-count">${topic.tasks.length} questions</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('start-practice-btn')?.addEventListener('click', () => {
      startPractice(topic);
    });
    if (topic.id === 'tenses') {
      initializeTenseMiniQuizzes();
    }
  }

  // Convert plain-text explanation to styled HTML
  function formatExplanation(text) {
    if (!text) return '';
    return text
      // Bold markers **...**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Lines starting with ✦ → styled list item
      .replace(/^(✦.+)$/gm, '<div class="theory-example">$1</div>')
      // Lines starting with ⚠️ → warning
      .replace(/^(⚠️.+)$/gm, '<div class="theory-warning">$1</div>')
      // Lines starting with 💡 → tip
      .replace(/^(💡.+)$/gm, '<div class="theory-tip">$1</div>')
      // Numbered lines e.g. "1." → styled rule
      .replace(/^(\d+\..+)$/gm, '<div class="theory-rule">$1</div>')
      // Two or more newlines → paragraph break
      .replace(/\n{2,}/g, '</p><p class="theory-paragraph">')
      // Single newlines → line break
      .replace(/\n/g, '<br>')
      // Wrap everything in a paragraph
      .replace(/^/, '<p class="theory-paragraph">')
      .replace(/$/, '</p>');
  }

  // Build one rule card: title + formula badge + bro explanation + mistake + examples
  function renderGrammarCard(card, topic, index) {
    const title = card.title || card.subtitle || '';

    return `
      <article class="grammar-card">
        ${title ? `<h4 class="grammar-card-subtitle">${escapeHtml(title)}</h4>` : ''}
        ${card.formula ? `<div class="formula-badge">${escapeHtml(card.formula)}</div>` : ''}
        ${card.bro_explanation ? `
          <div class="bro-box">
            <span class="bro-box-icon" aria-hidden="true">👊</span>
            <p class="bro-box-text">${escapeHtml(card.bro_explanation)}</p>
          </div>` : ''}
        ${card.common_mistake ? `
          <div class="mistake-box">
            <span class="mistake-box-icon" aria-hidden="true">⚠️</span>
            <p class="mistake-box-text">${escapeHtml(card.common_mistake)}</p>
          </div>` : ''}
        ${renderExamplesList(card.examples)}
        ${topic?.id === 'tenses' ? renderTenseMiniQuizShell(index, title) : ''}
      </article>
    `;
  }

  function renderTenseMiniQuizShell(index, title) {
    const quiz = TENSE_MINI_QUIZZES[index];
    if (!quiz) return '';
    return `
      <section class="tense-mini-quiz" data-mini-index="${index}" data-mini-key="${escapeHtml(quiz.key)}">
        <div class="mini-quiz-heading">
          <div>
            <p class="mini-quiz-kicker">Practice this Tense</p>
            <h5>${escapeHtml(title.replace(/^\d+\.\s*/, ''))}</h5>
          </div>
          <span class="mini-quiz-count">${quiz.questions.length} questions</span>
        </div>
        <div class="mini-quiz-body"></div>
      </section>
    `;
  }

  function initializeTenseMiniQuizzes() {
    theoryBox.querySelectorAll('.tense-mini-quiz').forEach((quizElement) => {
      renderTenseMiniQuiz(quizElement);
    });
  }

  function readTenseMiniQuizProgress() {
    try {
      const progress = JSON.parse(localStorage.getItem(tenseMiniQuizStorageKey) || '{}');
      return progress && typeof progress === 'object' ? progress : {};
    } catch (error) {
      return {};
    }
  }

  function saveTenseMiniQuizState(key, state) {
    const progress = readTenseMiniQuizProgress();
    progress[key] = state;
    localStorage.setItem(tenseMiniQuizStorageKey, JSON.stringify(progress));
  }

  function getTenseMiniQuizState(key, total) {
    const progress = readTenseMiniQuizProgress();
    const state = progress[key] || {};
    const answers = state.answers && typeof state.answers === 'object' ? state.answers : {};
    const currentIndex = Math.min(Math.max(Number(state.currentIndex) || 0, 0), total - 1);
    return { currentIndex, answers };
  }

  function renderTenseMiniQuiz(quizElement) {
    const index = Number(quizElement.dataset.miniIndex);
    const quiz = TENSE_MINI_QUIZZES[index];
    if (!quiz) return;

    const body = quizElement.querySelector('.mini-quiz-body');
    if (!body) return;

    const state = getTenseMiniQuizState(quiz.key, quiz.questions.length);
    const question = quiz.questions[state.currentIndex];
    const savedAnswer = state.answers[state.currentIndex];
    const answeredCount = Object.keys(state.answers).length;
    const score = Object.values(state.answers).filter((answer) => answer.correct).length;
    const progressPct = Math.round((answeredCount / quiz.questions.length) * 100);

    body.innerHTML = `
      <div class="mini-quiz-progress">
        <span>Question ${state.currentIndex + 1} of ${quiz.questions.length}</span>
        <strong>${score} / ${quiz.questions.length} correct</strong>
      </div>
      <div class="mini-quiz-progress-track"><span style="width: ${progressPct}%"></span></div>
      <p class="mini-quiz-question">${escapeHtml(question.question)}</p>
      <div class="mini-quiz-options">
        ${question.options.map((option, optionIndex) => {
          const isChosen = savedAnswer?.chosen === option;
          const isCorrectOption = savedAnswer && option === question.correct;
          const stateClass = isChosen ? (savedAnswer.correct ? 'correct' : 'incorrect') : isCorrectOption ? 'correct' : '';
          return `
            <button class="mini-quiz-option ${stateClass}" type="button" data-option="${escapeHtml(option)}" ${savedAnswer ? 'disabled' : ''}>
              <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
              <span class="option-text">${escapeHtml(option)}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="mini-quiz-feedback ${savedAnswer ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''}">
        ${savedAnswer ? (savedAnswer.correct ? 'Correct. Nice one.' : `Not quite. Correct answer: ${escapeHtml(question.correct)}.`) : 'Choose an answer to save your progress.'}
      </div>
      <div class="test-navigation mini-quiz-navigation">
        <button class="test-nav-btn mini-prev" type="button" ${state.currentIndex === 0 ? 'disabled' : ''}>Previous Question</button>
        <button class="test-nav-btn primary mini-next" type="button" ${state.currentIndex === quiz.questions.length - 1 ? 'disabled' : ''}>Next Question</button>
      </div>
    `;

    body.querySelectorAll('.mini-quiz-option').forEach((button) => {
      button.addEventListener('click', () => {
        if (savedAnswer) return;
        const chosen = button.dataset.option;
        const isCorrect = chosen === question.correct;
        const nextState = getTenseMiniQuizState(quiz.key, quiz.questions.length);
        nextState.answers[state.currentIndex] = { chosen, correct: isCorrect };
        saveTenseMiniQuizState(quiz.key, nextState);
        renderTenseMiniQuiz(quizElement);
      });
    });

    body.querySelector('.mini-prev')?.addEventListener('click', () => {
      const nextState = getTenseMiniQuizState(quiz.key, quiz.questions.length);
      nextState.currentIndex = Math.max(0, state.currentIndex - 1);
      saveTenseMiniQuizState(quiz.key, nextState);
      renderTenseMiniQuiz(quizElement);
    });

    body.querySelector('.mini-next')?.addEventListener('click', () => {
      const nextState = getTenseMiniQuizState(quiz.key, quiz.questions.length);
      nextState.currentIndex = Math.min(quiz.questions.length - 1, state.currentIndex + 1);
      saveTenseMiniQuizState(quiz.key, nextState);
      renderTenseMiniQuiz(quizElement);
    });
  }

  // Examples are either plain strings (legacy) or { en, ru } objects (current)
  function renderExamplesList(examples) {
    if (!examples || !examples.length) return '';

    const items = examples.map((example) => {
      if (typeof example === 'string') {
        return `<li class="grammar-example-item">${escapeHtml(example)}</li>`;
      }

      const sentence    = example.en || example.sentence || '';
      const translation = example.ru || example.translation || '';

      return `
        <li class="grammar-example-item">
          <span class="example-sentence">${escapeHtml(sentence)}</span>
          ${translation ? `<span class="example-translation">${escapeHtml(translation)}</span>` : ''}
        </li>
      `;
    }).join('');

    return `<ul class="grammar-examples-list">${items}</ul>`;
  }

  // ─── Practice Test ────────────────────────────────────────────────────────

  function startPractice(topic) {
    currentQuestionIndex = 0;
    practiceScore        = 0;
    isAnswering          = false;
    practiceAnswers      = {};

    // Shuffle options for each task (Fisher-Yates)
    practiceQuestions = topic.tasks.map((task) => ({
      question: task.question,
      correct:  task.correct,
      options:  shuffleArray(task.options)
    }));

    // Show practice, hide theory
    theoryBox.classList.add('hidden');
    practiceBox.classList.remove('hidden');

    renderPracticeQuestion();
  }

  function getPracticeScore() {
    return Object.values(practiceAnswers).filter((answer) => answer.correct).length;
  }

  function renderPracticeQuestion() {
    if (currentQuestionIndex >= practiceQuestions.length) {
      renderPracticeResults();
      return;
    }

    const q = practiceQuestions[currentQuestionIndex];
    const savedAnswer = practiceAnswers[currentQuestionIndex];
    isAnswering = Boolean(savedAnswer);
    practiceScore = getPracticeScore();
    const total = practiceQuestions.length;
    const pct   = Math.round((currentQuestionIndex / total) * 100);
    const icon  = currentTopic?.icon || '';

    practiceBox.innerHTML = `
      <div class="practice-card">
        <!-- Header -->
        <div class="practice-header">
          <button class="practice-back-btn" type="button" id="back-to-theory-btn">
            ← Back to Theory
          </button>
          <span class="practice-topic-tag">${icon} ${escapeHtml(currentTopic?.title || '')}</span>
        </div>

        <!-- Progress -->
        <div class="task-quiz-header">
          <div class="task-progress-info">
            <span class="task-step">Question ${currentQuestionIndex + 1} of ${total}</span>
            <span class="task-score-pill">Score: ${practiceScore}</span>
          </div>
          <div class="task-progress-bar-bg">
            <div class="task-progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <!-- Question -->
        <div class="practice-question-box">
          <p class="practice-question-text">${escapeHtml(q.question)}</p>
          <p class="task-prompt">Choose the correct answer:</p>
        </div>

        <!-- Shuffled Options -->
        <div class="practice-options-grid">
          ${q.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            return `
              <button class="practice-option-btn ${savedAnswer?.chosen === opt ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''} ${savedAnswer && opt === q.correct ? 'correct' : ''}" type="button" data-option="${escapeHtml(opt)}" ${savedAnswer ? 'disabled' : ''}>
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div class="test-navigation"><button class="test-nav-btn" id="grammar-previous" type="button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Previous</button><button class="test-nav-btn primary" id="grammar-next" type="button" ${savedAnswer ? '' : 'disabled'}>${currentQuestionIndex === total - 1 ? 'Finish Test' : 'Next Question →'}</button></div>
      </div>
    `;

    // Back to theory
    document.getElementById('back-to-theory-btn')?.addEventListener('click', () => {
      practiceBox.classList.add('hidden');
      theoryBox.classList.remove('hidden');
    });

    // Answer click handlers
    const optionBtns = practiceBox.querySelectorAll('.practice-option-btn');
    optionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isAnswering) return;
        isAnswering = true;

        const chosen    = btn.dataset.option;
        const isCorrect = chosen === q.correct;

        practiceAnswers[currentQuestionIndex] = { chosen, correct: isCorrect };
        practiceScore = getPracticeScore();
        if (isCorrect) {
          btn.classList.add('correct');
        } else {
          btn.classList.add('incorrect');
          optionBtns.forEach((b) => {
            if (b.dataset.option === q.correct) b.classList.add('correct');
          });
          window.attachExplainButton?.(practiceBox, q.question, chosen, q.correct);
        }

        optionBtns.forEach((b) => { b.disabled = true; });
        practiceBox.querySelector('#grammar-next').disabled = false;
        const scorePill = practiceBox.querySelector('.task-score-pill');
        if (scorePill) scorePill.textContent = `Score: ${practiceScore}`;

      });
    });
    if (savedAnswer && !savedAnswer.correct) window.attachExplainButton?.(practiceBox, q.question, savedAnswer.chosen, q.correct);
    practiceBox.querySelector('#grammar-previous').addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex -= 1; renderPracticeQuestion(); } });
    practiceBox.querySelector('#grammar-next').addEventListener('click', () => { if (currentQuestionIndex === total - 1) renderPracticeResults(); else { currentQuestionIndex += 1; renderPracticeQuestion(); } });
  }

  function renderPracticeResults() {
    const total = practiceQuestions.length;
    practiceScore = getPracticeScore();
    const pct   = Math.round((practiceScore / total) * 100);
    const icon  = currentTopic?.icon || '';

    let grammarProgress = {};
    let grammarTotals = {};
    try {
      grammarProgress = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
      grammarTotals = JSON.parse(localStorage.getItem('grammar_progress_totals') || '{}');
    } catch (error) {
      grammarProgress = {};
      grammarTotals = {};
    }
    const previousScore = Number(grammarProgress[currentTopic.id]) || 0;
    if (!grammarProgress[currentTopic.id] || practiceScore > previousScore) {
      grammarProgress[currentTopic.id] = practiceScore;
      localStorage.setItem('grammar_progress', JSON.stringify(grammarProgress));
    }
    grammarTotals[currentTopic.id] = total;
    localStorage.setItem('grammar_progress_totals', JSON.stringify(grammarTotals));
    window.dispatchEvent(new CustomEvent('learning-progress-updated'));

    if (typeof window.recordLearningActivity === 'function') {
      window.recordLearningActivity({
        testCompleted: true,
        correctAnswers: practiceScore,
        totalAnswers: total,
        topicCompleted: pct === 100
      });
    }

    let emoji = '🎉';
    let msg   = 'Excellent! You have mastered this grammar topic!';
    if (pct < 60)       { emoji = '📚'; msg = 'Review the theory and try again — you can do it!'; }
    else if (pct < 80)  { emoji = '👍'; msg = 'Good work! Read the explanation again to reach 100%.'; }

    practiceBox.innerHTML = `
      <div class="task-result-card">
        <div class="result-icon">${emoji}</div>
        <h3 class="result-title">Practice Complete!</h3>
        <p class="result-subtitle">${msg}</p>

        <div class="result-score-box">
          <span class="result-score-number">${practiceScore} / ${total}</span>
          <span class="result-score-percent">(${pct}% correct)</span>
        </div>

        <p class="result-topic-label">${icon} ${escapeHtml(currentTopic?.title || '')}</p>

        <div class="result-actions">
          <button id="retry-practice-btn" class="btn-primary" type="button">🔄 Retry Practice</button>
          <button id="back-to-theory-result-btn" class="btn-secondary" type="button">📘 Back to Theory</button>
        </div>
      </div>
    `;

    document.getElementById('retry-practice-btn')?.addEventListener('click', () => {
      startPractice(currentTopic);
    });

    document.getElementById('back-to-theory-result-btn')?.addEventListener('click', () => {
      practiceBox.classList.add('hidden');
      theoryBox.classList.remove('hidden');
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Fisher-Yates shuffle
  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // XSS-safe HTML escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  loadGrammarData();
});
