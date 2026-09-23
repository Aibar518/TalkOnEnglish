/**
 * TalkOnEnglish — SPA Navigation & Module Routing
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dashboard = document.getElementById('dashboard');
  const menuCards = document.querySelectorAll('.menu-card');
  const moduleSections = document.querySelectorAll('.module-section');
  const backButtons = document.querySelectorAll('.back-to-menu-btn');
  const analyticsStorageKey = 'talkOnEnglish.analytics';
  const themeStorageKey = 'talkOnEnglish.theme';
  const userStorageKey = 'talkOnEnglish.user';
  const authAccountsStorageKey = 'talkOnEnglish.authAccounts';
  let authMode = 'login';

  function readAnalytics() {
    const fallback = { activeDays: [], testsCompleted: 0, correctAnswers: 0, totalAnswers: 0, topicsCompleted: 0, storiesRead: 0 };
    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem(analyticsStorageKey) || '{}') };
    } catch (error) {
      return fallback;
    }
  }

  function saveAnalytics(analytics) {
    localStorage.setItem(analyticsStorageKey, JSON.stringify(analytics));
  }

  function readUser() {
    try {
      const user = JSON.parse(localStorage.getItem(userStorageKey) || '{}');
      return user && typeof user === 'object' ? user : {};
    } catch (error) {
      return {};
    }
  }

  function saveUser(user) {
    localStorage.setItem(userStorageKey, JSON.stringify(user));
    updateHeaderProfile();
  }

  function readAuthAccounts() {
    try {
      const accounts = JSON.parse(localStorage.getItem(authAccountsStorageKey) || '{}');
      return accounts && typeof accounts === 'object' ? accounts : {};
    } catch (error) {
      return {};
    }
  }

  function saveAuthAccounts(accounts) {
    localStorage.setItem(authAccountsStorageKey, JSON.stringify(accounts));
  }

  function simpleHash(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return String(hash);
  }

  function createAvatarUrl(name, email) {
    const displayName = (name || email || 'Guest Learner').trim();
    const initial = displayName.charAt(0).toUpperCase() || 'G';
    const palette = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2'];
    const seed = (email || displayName).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const color = palette[seed % palette.length];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="48" fill="${color}"/>
        <text x="50%" y="56%" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${initial}</text>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function updateHeaderProfile() {
    const user = readUser();
    const avatar = document.querySelector('.profile-avatar');
    const greeting = document.querySelector('.user-greeting');
    const status = document.querySelector('.profile-status');
    const profileButton = document.getElementById('profile-button');
    const signoutButton = document.getElementById('signout-btn');
    const loggedIn = user.isLoggedIn && (user.name || user.email);

    if (avatar) {
      avatar.textContent = '';
      avatar.classList.toggle('has-image', Boolean(loggedIn && user.avatarUrl));
      if (loggedIn && user.avatarUrl) {
        const image = document.createElement('img');
        image.src = user.avatarUrl;
        image.alt = '';
        avatar.appendChild(image);
      } else {
        avatar.textContent = 'G';
      }
    }

    if (greeting) {
      greeting.textContent = loggedIn ? user.name || 'Learner' : 'Welcome, dear guest!';
    }
    if (status) {
      status.textContent = loggedIn ? (user.isGuest ? 'Guest mode' : 'Signed in') : 'Ready to learn';
    }
    if (profileButton) {
      profileButton.textContent = loggedIn ? 'Profile' : 'Sign In / Profile';
    }
    if (signoutButton) {
      signoutButton.classList.toggle('hidden', !loggedIn);
    }
  }

  function setAuthStatus(message, type = '') {
    const status = document.getElementById('auth-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
  }

  function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll('[data-auth-mode]').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.authMode === mode);
    });
    document.querySelectorAll('.auth-name-row').forEach((element) => {
      element.classList.toggle('hidden', mode !== 'register');
    });
    const submit = document.getElementById('auth-submit');
    const password = document.getElementById('auth-password');
    if (submit) submit.textContent = mode === 'register' ? 'Create account' : 'Login';
    if (password) password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    setAuthStatus('');
  }

  function closeProfileModal() {
    document.getElementById('profile-modal')?.classList.add('hidden');
  }

  function readDailyActivity() {
    try {
      const activity = JSON.parse(localStorage.getItem('daily_activity') || '[]');
      return Array.isArray(activity) ? activity : [];
    } catch (error) {
      return [];
    }
  }

  function recordDailyActivity(correct, total) {
    const dailyActivity = readDailyActivity();
    const today = new Date().toISOString().slice(0, 10);
    const existingDay = dailyActivity.find((day) => day.date === today);
    if (existingDay) {
      existingDay.correct += Number(correct) || 0;
      existingDay.total += Number(total) || 0;
    } else {
      dailyActivity.push({ date: today, correct: Number(correct) || 0, total: Number(total) || 0 });
    }
    if (dailyActivity.length > 5) dailyActivity.shift();
    localStorage.setItem('daily_activity', JSON.stringify(dailyActivity));
    return dailyActivity;
  }

  function renderAnalytics(analytics) {
    const activityChart = document.getElementById('activity-chart');
    const activeDays = readDailyActivity();
    const maxAccuracy = Math.max(1, ...activeDays.map((day) => Number(day.total) ? (Number(day.correct) / Number(day.total)) * 100 : 0));
    if (activityChart) {
      activityChart.innerHTML = activeDays.length
        ? activeDays.map((day) => {
          const accuracy = Number(day.total) ? Math.round((Number(day.correct) / Number(day.total)) * 100) : 0;
          const height = Math.max(22, (accuracy / maxAccuracy) * 100);
          const dateLabel = day.date.slice(5).replace('-', '/');
          return `<div class="activity-column" title="${day.correct} / ${day.total} correct"><span class="activity-score">${accuracy}%</span><span class="activity-bar" style="height: ${height}%" aria-label="${accuracy}% accuracy on ${dateLabel}"></span><span class="activity-date">${dateLabel}</span><span class="activity-total">${day.correct}/${day.total}</span></div>`;
        }).join('')
        : '<span class="activity-empty">Start a module to see your activity here.</span>';
    }
    const totalAnswers = Math.max(0, Number(analytics.totalAnswers) || 0);
    const correctAnswers = Math.max(0, Number(analytics.correctAnswers) || 0);
    const accuracy = totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    document.getElementById('activity-count').textContent = `${activeDays.length} / 5`;
    document.getElementById('tests-completed').textContent = analytics.testsCompleted || 0;
    document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
    document.getElementById('topics-completed').textContent = analytics.topicsCompleted || 0;
    document.getElementById('stories-read').textContent = analytics.storiesRead || 0;
    document.getElementById('dashboard-streak-value').textContent = `${activeDays.length} day${activeDays.length === 1 ? '' : 's'}`;
    const accuracyRing = document.getElementById('accuracy-ring');
    if (accuracyRing) {
      accuracyRing.style.setProperty('--accuracy', accuracy);
      accuracyRing.dataset.level = accuracy >= 80 ? 'high' : accuracy >= 60 ? 'medium' : 'low';
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const darkMode = theme === 'dark';
      toggle.querySelector('.theme-icon').textContent = darkMode ? '☀️' : '🌙';
      toggle.querySelector('.theme-label').textContent = darkMode ? 'Light mode' : 'Dark mode';
      toggle.setAttribute('aria-label', darkMode ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function setupDashboardTools() {
    const storedTheme = localStorage.getItem(themeStorageKey) || 'light';
    applyTheme(storedTheme);
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme);
    });

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => document.getElementById(button.dataset.closeModal)?.classList.add('hidden'));
    });
    document.querySelectorAll('.dashboard-modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.add('hidden');
      });
    });
    const openProfileModal = () => document.getElementById('profile-modal')?.classList.remove('hidden');
    document.getElementById('profile-button')?.addEventListener('click', openProfileModal);
    document.querySelector('.user-profile-badge')?.addEventListener('click', openProfileModal);
    document.querySelectorAll('[data-auth-mode]').forEach((tab) => {
      tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode));
    });
    document.getElementById('google-signin-btn')?.addEventListener('click', () => {
      const name = 'Google Learner';
      const email = 'google.learner@talkonenglish.local';
      saveUser({
        name,
        email,
        avatarUrl: createAvatarUrl(name, email),
        provider: 'google-simulated',
        isLoggedIn: true,
        isGuest: false
      });
      setAuthStatus('Google sign-in simulated successfully.', 'success');
      window.setTimeout(closeProfileModal, 450);
    });
    document.getElementById('guest-signin-btn')?.addEventListener('click', () => {
      const name = 'Guest Learner';
      const email = 'guest@talkonenglish.local';
      saveUser({
        name,
        email,
        avatarUrl: createAvatarUrl(name, email),
        provider: 'guest',
        isLoggedIn: true,
        isGuest: true
      });
      setAuthStatus('Guest profile saved on this device.', 'success');
      window.setTimeout(closeProfileModal, 450);
    });
    document.getElementById('signout-btn')?.addEventListener('click', () => {
      localStorage.removeItem(userStorageKey);
      updateHeaderProfile();
      setAuthStatus('Signed out on this device.', 'success');
    });
    document.getElementById('auth-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameInput = document.getElementById('auth-name');
      const emailInput = document.getElementById('auth-email');
      const passwordInput = document.getElementById('auth-password');
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !emailInput.checkValidity()) {
        setAuthStatus('Enter a valid email address.', 'error');
        return;
      }
      if (password.length < 4) {
        setAuthStatus('Password must be at least 4 characters.', 'error');
        return;
      }

      const accounts = readAuthAccounts();
      if (authMode === 'register') {
        const name = nameInput.value.trim() || email.split('@')[0] || 'Learner';
        accounts[email] = {
          name,
          email,
          passwordHash: simpleHash(password),
          avatarUrl: createAvatarUrl(name, email),
          provider: 'email'
        };
        saveAuthAccounts(accounts);
        saveUser({ ...accounts[email], passwordHash: undefined, isLoggedIn: true, isGuest: false });
        setAuthStatus('Account created and signed in.', 'success');
        window.setTimeout(closeProfileModal, 450);
        return;
      }

      const account = accounts[email];
      if (!account) {
        setAuthStatus('Account not found. Switch to Register first.', 'error');
        return;
      }
      if (account.passwordHash !== simpleHash(password)) {
        setAuthStatus('Password does not match this local account.', 'error');
        return;
      }
      saveUser({ ...account, passwordHash: undefined, isLoggedIn: true, isGuest: false });
      setAuthStatus('Signed in successfully.', 'success');
      window.setTimeout(closeProfileModal, 450);
    });
    setAuthMode('login');
    updateHeaderProfile();
    const updateAIKeyIndicator = () => {
      const hasKey = Boolean(localStorage.getItem('gemini_api_key')?.trim());
      const dot = document.getElementById('ai-key-dot');
      if (dot) {
        dot.classList.toggle('is-set', hasKey);
        dot.setAttribute('aria-label', hasKey ? 'Gemini API key saved' : 'Gemini API key not set');
      }
    };
    document.getElementById('ai-key-button')?.addEventListener('click', () => document.getElementById('profile-modal').classList.remove('hidden'));
    document.getElementById('gemini-api-key').value = localStorage.getItem('gemini_api_key') || '';
    updateAIKeyIndicator();
    document.getElementById('save-gemini-key')?.addEventListener('click', () => {
      const keyInput = document.getElementById('gemini-api-key');
      const status = document.getElementById('gemini-key-status');
      const key = keyInput.value.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        status.textContent = 'API key saved on this device.';
      } else {
        localStorage.removeItem('gemini_api_key');
        status.textContent = 'API key cleared.';
      }
      updateAIKeyIndicator();
    });
    document.getElementById('report-button')?.addEventListener('click', openAnalyticsModal);
  }

  function readStorageObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (error) {
      return {};
    }
  }

  async function openAnalyticsModal() {
    const details = document.getElementById('analytics-details');
    const modal = document.getElementById('analytics-modal');
    if (!details || !modal) return;

    const vocabulary = readStorageObject('vocab_scores');
    const listening = readStorageObject('listening_scores');
    const listeningTotals = readStorageObject('listening_totals');
    const grammar = readStorageObject('grammar_progress');
    const grammarTotals = readStorageObject('grammar_progress_totals');
    const reading = readStorageObject('reading_progress');
    const levelTests = readStorageObject('level_tests_scores');
    const analytics = readAnalytics();
    const totalAnswers = Number(analytics.totalAnswers) || 0;
    const accuracy = totalAnswers ? Math.round(((Number(analytics.correctAnswers) || 0) / totalAnswers) * 100) : 0;
    const dailyActivity = readDailyActivity();
    let grammarTopics = [];
    let readingStories = [];
    let listeningStories = [];
    try {
      const responses = await Promise.all([fetch('data/grammar.json'), fetch('data/reading.json'), fetch('data/listening.json')]);
      grammarTopics = (await responses[0].json()).topics || [];
      readingStories = await responses[1].json();
      listeningStories = await responses[2].json();
    } catch (error) {
      grammarTopics = [];
      readingStories = [];
      listeningStories = [];
    }

    const scoreRow = (label, value) => `<div class="analytics-report-row"><span>${label}</span><strong>${value}</strong></div>`;
    const vocabularyRows = ['A1_A2', 'B1_B2', 'C1_C2', 'full_practice'].map((key) => scoreRow(key === 'full_practice' ? 'Full Practice' : key.replace('_', '-'), vocabulary[key] === undefined ? 'Not taken' : `${vocabulary[key]} / ${key === 'full_practice' ? 30 : 15}`)).join('');
    const listeningRows = (listeningStories.length ? listeningStories : [1, 2, 3, 4, 5, 6].map((id) => ({ title: `Story ${id}`, level: '' }))).map((story, index) => scoreRow(`${story.title} ${story.level ? `(${story.level})` : ''}`, listening[`story_${index + 1}`] === undefined ? 'Not taken' : `${listening[`story_${index + 1}`]} / ${listeningTotals[`story_${index + 1}`] || 0}`)).join('');
    const grammarRows = (grammarTopics.length ? grammarTopics : Object.keys(grammar)).map((topic) => {
      const id = typeof topic === 'string' ? topic : topic.id;
      const label = typeof topic === 'string' ? topic : `${topic.icon || ''} ${topic.title}`;
      return scoreRow(label, grammar[id] === undefined ? 'Not completed' : `${grammar[id]} / ${grammarTotals[id] || 0}`);
    }).join('');
    const readingRows = (readingStories.length ? readingStories : Object.keys(reading).map((id) => ({ id, title: id, level: '' }))).map((story) => {
      const result = reading[story.id];
      return scoreRow(`${story.title} ${story.level ? `(${story.level})` : ''}`, result ? `${result.score} / ${result.total}` : 'Not taken');
    }).join('');
    const days = dailyActivity.length ? dailyActivity.map((day) => `<div class="analytics-day"><strong>${day.date}</strong><span>${day.correct} / ${day.total} correct</span></div>`).join('') : '<span class="analytics-empty">No completed tests yet.</span>';

    details.innerHTML = `
      <section class="analytics-report-section analytics-summary"><h3>📊 All-Time Summary</h3><div class="analytics-summary-value">${accuracy}%</div><p>Accuracy across ${analytics.testsCompleted || 0} completed tests</p></section>
      <section class="analytics-report-section"><h3>📅 Rolling 5-Day Active Progress</h3><div class="analytics-days">${days}</div></section>
      <section class="analytics-report-section"><h3>📚 Vocabulary</h3><div class="analytics-report-list">${vocabularyRows}</div></section>
      <section class="analytics-report-section"><h3>🎧 Listening</h3><div class="analytics-report-list">${listeningRows}</div></section>
      <section class="analytics-report-section"><h3>✍️ Writing / Grammar</h3><div class="analytics-report-list">${grammarRows || '<span class="analytics-empty">No grammar results yet.</span>'}</div></section>
      <section class="analytics-report-section"><h3>📖 Reading</h3><div class="analytics-report-list">${readingRows || '<span class="analytics-empty">No reading results yet.</span>'}</div></section>
      <section class="analytics-report-section"><h3>🎯 Level Tests</h3><div class="analytics-report-list">${scoreRow('A2 Level Test', levelTests.A2 === undefined ? 'Not taken yet' : `${levelTests.A2}%`)}${scoreRow('B2 Level Test', levelTests.B2 === undefined ? 'Not taken yet' : `${levelTests.B2}%`)}</div></section>
    `;
    modal.classList.remove('hidden');
  }

  function renderModuleProgress() {
    let vocabularyScores = {};
    let listeningScores = {};
    let listeningTotals = {};
    let grammarProgress = {};
    let grammarTotals = {};
    let readingProgress = {};
    try {
      vocabularyScores = JSON.parse(localStorage.getItem('vocab_scores') || '{}');
      listeningScores = JSON.parse(localStorage.getItem('listening_scores') || '{}');
      listeningTotals = JSON.parse(localStorage.getItem('listening_totals') || '{}');
      grammarProgress = JSON.parse(localStorage.getItem('grammar_progress') || '{}');
      grammarTotals = JSON.parse(localStorage.getItem('grammar_progress_totals') || '{}');
      readingProgress = JSON.parse(localStorage.getItem('reading_progress') || '{}');
    } catch (error) {
      vocabularyScores = {};
      listeningScores = {};
      listeningTotals = {};
      grammarProgress = {};
      grammarTotals = {};
      readingProgress = {};
    }

    const vocabularyLevelKeys = ['A1_A2', 'B1_B2', 'C1_C2'];
    const hasFullPractice = Object.prototype.hasOwnProperty.call(vocabularyScores, 'full_practice');
    const vocabularyTotal = hasFullPractice
      ? Number(vocabularyScores.full_practice) || 0
      : vocabularyLevelKeys.reduce((sum, key) => sum + (Number(vocabularyScores[key]) || 0), 0);
    const vocabularyMax = hasFullPractice ? 75 : 45;
    const vocabularyLabel = document.getElementById('vocabulary-progress-label');
    const vocabularyBar = document.getElementById('vocabulary-progress-bar');
    if (vocabularyLabel && vocabularyBar) {
      const started = Object.keys(vocabularyScores).length > 0;
      vocabularyLabel.textContent = started ? `Vocab Score: ${vocabularyTotal} / ${vocabularyMax}` : `Vocab Score: 0 / ${vocabularyMax} (Not started)`;
      vocabularyBar.style.width = `${Math.round((vocabularyTotal / vocabularyMax) * 100)}%`;
    }

    const listeningKeys = ['story_1', 'story_2', 'story_3', 'story_4', 'story_5', 'story_6'];
    const listeningTotal = listeningKeys.reduce((sum, key) => sum + (Number(listeningTotals[key]) || 0), 0);
    const listeningScore = listeningKeys.reduce((sum, key) => sum + (Number(listeningScores[key]) || 0), 0);
    const listeningLabel = document.getElementById('listening-progress-label');
    const listeningBar = document.getElementById('listening-progress-bar');
    if (listeningLabel && listeningBar) {
      const started = Object.keys(listeningScores).length > 0;
      listeningLabel.textContent = started ? `Score: ${listeningScore} / ${listeningTotal}` : `Score: 0 / ${listeningTotal} (Not started)`;
      listeningBar.style.width = listeningTotal ? `${Math.round((listeningScore / listeningTotal) * 100)}%` : '0%';
    }

    const grammarCompleted = Object.entries(grammarProgress).filter(([topicId, entry]) => {
      const score = Number(entry);
      const total = Number(grammarTotals[topicId]) || 0;
      return total > 0 && score / total >= 0.6;
    }).length;
    const grammarLabel = document.getElementById('grammar-progress-label');
    const grammarBar = document.getElementById('grammar-progress-bar');
    if (grammarLabel && grammarBar) {
      grammarLabel.textContent = `${grammarCompleted} / 12 topics completed`;
      grammarBar.style.width = `${Math.round((grammarCompleted / 12) * 100)}%`;
    }

    const readingEntries = Object.values(readingProgress).filter((entry) => entry && Number(entry.total) > 0);
    const readingCompleted = readingEntries.filter((entry) => Number(entry.score) / Number(entry.total) >= 0.6).length;
    const readingCorrectAnswers = readingEntries.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0);
    const readingLabel = document.getElementById('reading-progress-label');
    const readingDetail = document.getElementById('reading-progress-detail');
    const readingBar = document.getElementById('reading-progress-bar');
    if (readingLabel && readingDetail && readingBar) {
      readingLabel.textContent = `${readingCompleted} / 6 stories completed`;
      readingDetail.textContent = `Correct answers: ${readingCorrectAnswers}`;
      readingBar.style.width = `${Math.round((readingCompleted / 6) * 100)}%`;
    }

    let levelScores = {};
    try {
      levelScores = JSON.parse(localStorage.getItem('level_tests_scores') || '{}');
    } catch (error) {
      levelScores = {};
    }
    ['A2', 'B2'].forEach((level) => {
      const score = Number(levelScores[level]);
      const label = document.getElementById(`${level.toLowerCase()}-score-label`);
      const bar = document.getElementById(`${level.toLowerCase()}-score-bar`);
      if (label && bar) {
        label.textContent = Number.isFinite(score) && score >= 0 ? `Best Score: ${score}%` : 'Best Score: Not taken yet';
        bar.style.width = Number.isFinite(score) && score >= 0 ? `${score}%` : '0%';
      }
    });
  }

  window.recordLearningActivity = (result = {}) => {
    const analytics = readAnalytics();
    analytics.testsCompleted += result.testCompleted ? 1 : 0;
    analytics.correctAnswers += Number(result.correctAnswers) || 0;
    analytics.totalAnswers += Number(result.totalAnswers) || 0;
    analytics.topicsCompleted += result.topicCompleted ? 1 : 0;
    analytics.storiesRead += result.storyRead ? 1 : 0;
    saveAnalytics(analytics);
    recordDailyActivity(result.correctAnswers, result.totalAnswers);
    renderAnalytics(analytics);
  };

  setupDashboardTools();
  renderAnalytics(readAnalytics());
  renderModuleProgress();
  window.addEventListener('learning-progress-updated', renderModuleProgress);

  /**
   * Switch to a specific module section
   * @param {string} moduleId - Value from data-module (e.g. 'vocabulary', 'listening', etc.)
   */
  function openModule(moduleId) {
    if (moduleId === 'reading' && typeof window.resetReadingView === 'function') {
      window.resetReadingView();
    }

    // Hide main dashboard
    if (dashboard) {
      dashboard.classList.add('hidden');
    }

    // Hide all module sections
    moduleSections.forEach((section) => {
      section.classList.add('hidden');
    });

    // Show target section
    const targetSection = document.getElementById(`${moduleId}-section`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Return to main menu (Dashboard)
   */
  function backToMenu() {
    if (typeof window.resetReadingView === 'function') {
      window.resetReadingView();
    }

    // Hide all module sections
    moduleSections.forEach((section) => {
      section.classList.add('hidden');
    });

    // Show main dashboard
    if (dashboard) {
      dashboard.classList.remove('hidden');
    }

    renderAnalytics(readAnalytics());
    renderModuleProgress();

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event Listeners: Card clicks in main dashboard
  menuCards.forEach((card) => {
    card.addEventListener('click', () => {
      const moduleId = card.dataset.module;
      if (moduleId) {
        openModule(moduleId);
      }
    });
  });

  // Event Listeners: 'Back to Menu' buttons in each module section
  backButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      backToMenu();
    });
  });
});
