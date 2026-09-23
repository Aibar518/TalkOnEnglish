/**
 * TalkOnEnglish - A2 and B2 Level Tests.
 */

document.addEventListener('DOMContentLoaded', () => {
  const tests = {
    A2: {
      container: document.getElementById('a2-test-container'),
      title: 'A2 Level Test'
    },
    B2: {
      container: document.getElementById('b2-test-container'),
      title: 'B2 Level Test'
    }
  };

  let questionSets = {};
  let activeLevel = null;
  let activeQuestions = [];
  let questionIndex = 0;
  let score = 0;
  let isAnswering = false;
  let questionAnswers = {};
  let testsLoaded = false;
  let pendingLevel = null;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function readScores() {
    try {
      const scores = JSON.parse(localStorage.getItem('level_tests_scores') || '{}');
      return scores && typeof scores === 'object' ? scores : {};
    } catch (error) {
      return {};
    }
  }

  function saveBestScore(level, percentage) {
    const scores = readScores();
    if (!Number.isFinite(Number(scores[level])) || percentage > Number(scores[level])) {
      scores[level] = percentage;
      localStorage.setItem('level_tests_scores', JSON.stringify(scores));
      window.dispatchEvent(new CustomEvent('learning-progress-updated'));
    }
  }

  function startTest(level) {
    if (!testsLoaded) {
      pendingLevel = level;
      tests[level].container.innerHTML = '<p class="level-test-loading">Loading test questions...</p>';
      return;
    }
    activeLevel = level;
    activeQuestions = questionSets[level] || [];
    questionIndex = 0;
    score = 0;
    isAnswering = false;
    questionAnswers = {};
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion() {
    const test = tests[activeLevel];
    const question = activeQuestions[questionIndex];
    if (!test?.container || !question) return;

    const savedAnswer = questionAnswers[questionIndex];
    isAnswering = Boolean(savedAnswer);
    const progress = Math.round((questionIndex / activeQuestions.length) * 100);
    // Shuffle options immediately before rendering every question.
    const options = shuffleArray(question.options);
    test.container.innerHTML = `
      <div class="level-test-card">
        <div class="level-test-topbar">
          <span class="level-test-label">${escapeHtml(test.title)}</span>
          <span>Question ${questionIndex + 1} of ${activeQuestions.length}</span>
        </div>
        <div class="task-progress-bar-bg"><div class="task-progress-bar-fill" style="width: ${progress}%"></div></div>
        <h3 class="level-test-question">${escapeHtml(question.question)}</h3>
        <div class="level-test-options">
          ${options.map((option, index) => `<button class="level-test-option ${savedAnswer?.chosen === option ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''} ${savedAnswer && option === question.correct ? 'correct' : ''}" type="button" data-option="${escapeHtml(option)}" ${savedAnswer ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join('')}
        </div>
        <div class="test-navigation"><button class="test-nav-btn" id="level-previous" type="button" ${questionIndex === 0 ? 'disabled' : ''}>← Previous</button><button class="test-nav-btn primary" id="level-next" type="button" ${savedAnswer ? '' : 'disabled'}>${questionIndex === activeQuestions.length - 1 ? 'Finish Test' : 'Next Question →'}</button></div>
      </div>
    `;

    test.container.querySelectorAll('.level-test-option').forEach((button) => {
      button.addEventListener('click', () => {
        if (isAnswering) return;
        isAnswering = true;
        const correct = button.dataset.option === question.correct;
        questionAnswers[questionIndex] = { chosen: button.dataset.option, correct };
        score = Object.values(questionAnswers).filter((answer) => answer.correct).length;
        if (correct) {
          score += 1;
          button.classList.add('correct');
        } else {
          button.classList.add('incorrect');
          test.container.querySelectorAll('.level-test-option').forEach((optionButton) => {
            if (optionButton.dataset.option === question.correct) optionButton.classList.add('correct');
          });
          window.attachExplainButton?.(test.container, question.question, button.dataset.option, question.correct);
        }
        test.container.querySelectorAll('.level-test-option').forEach((optionButton) => {
          optionButton.disabled = true;
        });
        test.container.querySelector('#level-next').disabled = false;
      });
    });
    if (savedAnswer && !savedAnswer.correct) window.attachExplainButton?.(test.container, question.question, savedAnswer.chosen, question.correct);
    test.container.querySelector('#level-previous').addEventListener('click', () => { if (questionIndex > 0) { questionIndex -= 1; renderQuestion(); } });
    test.container.querySelector('#level-next').addEventListener('click', () => { if (questionIndex === activeQuestions.length - 1) renderResult(); else { questionIndex += 1; renderQuestion(); } });
  }

  function renderResult() {
    const test = tests[activeLevel];
    const total = activeQuestions.length;
    const percentage = Math.round((score / total) * 100);
    saveBestScore(activeLevel, percentage);
    if (typeof window.recordLearningActivity === 'function') {
      window.recordLearningActivity({
        testCompleted: true,
        correctAnswers: score,
        totalAnswers: total
      });
    }
    test.container.innerHTML = `
      <div class="level-test-card level-test-result">
        <span class="level-test-result-icon">${percentage >= 60 ? '✓' : '↺'}</span>
        <p class="dashboard-kicker">${escapeHtml(test.title)} complete</p>
        <h3>${score} / ${total} correct</h3>
        <p class="level-test-percentage">${percentage}%</p>
        <p class="level-test-feedback">${percentage >= 60 ? 'Strong result. Your best score has been saved.' : 'Keep practicing and try again to improve your result.'}</p>
        <button class="modal-primary level-test-retry" type="button">Try Again</button>
      </div>
    `;
    test.container.querySelector('.level-test-retry').addEventListener('click', () => startTest(activeLevel));
  }

  async function loadTests() {
    try {
      const response = await fetch('data/level_tests.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      questionSets = await response.json();
      testsLoaded = true;
      Object.keys(tests).forEach((level) => {
        tests[level].container.innerHTML = `<div class="level-test-intro"><p>${escapeHtml(tests[level].title)} contains 25 questions.</p><button class="modal-primary level-test-start" type="button">Start Test</button></div>`;
        tests[level].container.querySelector('.level-test-start').addEventListener('click', () => startTest(level));
      });
      if (pendingLevel) {
        const levelToStart = pendingLevel;
        pendingLevel = null;
        startTest(levelToStart);
      }
    } catch (error) {
      console.error('Failed to load level_tests.json:', error);
      Object.values(tests).forEach((test) => {
        test.container.innerHTML = '<p class="error-message">Could not load this level test.</p>';
      });
    }
  }

  document.querySelectorAll('.menu-card[data-module="a2-test"]').forEach((card) => card.addEventListener('click', () => startTest('A2')));
  document.querySelectorAll('.menu-card[data-module="b2-test"]').forEach((card) => card.addEventListener('click', () => startTest('B2')));
  loadTests();
});
