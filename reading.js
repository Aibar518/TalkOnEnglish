/**
 * TalkOnEnglish - Reading Module
 * Loads stories, presents readable text, and runs comprehension quizzes.
 */

document.addEventListener('DOMContentLoaded', () => {
	const grid = document.getElementById('reading-grid');
	const libraryView = document.getElementById('reading-library-view');
	const readingView = document.getElementById('reading-view');
	const quizView = document.getElementById('reading-quiz');
	const filterButtons = document.querySelectorAll('.reading-filter-btn');

	let articles = [];
	let currentArticle = null;
	let currentQuestionIndex = 0;
	let score = 0;
	let questionAnswers = {};

	function escapeHtml(value) {
		return String(value)
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}

	// Return a new array so the source question options remain unchanged.
	function shuffleArray(array) {
		const shuffled = [...array];
		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			const randomIndex = Math.floor(Math.random() * (index + 1));
			[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
		}
		return shuffled;
	}

	function renderCards(level = 'all') {
		const visibleArticles = level === 'all'
			? articles
			: articles.filter((article) => article.level === level);

		if (!visibleArticles.length) {
			grid.innerHTML = '<p class="reading-empty">No stories are available for this level yet.</p>';
			return;
		}

		grid.innerHTML = visibleArticles.map((article) => `
			<article class="reading-card">
				<div class="reading-card-meta">
					<span class="reading-level-badge reading-level-${article.level.toLowerCase()}">${escapeHtml(article.level)}</span>
					<span class="reading-category">${escapeHtml(article.category)}</span>
				</div>
				<h3 class="reading-card-title">${escapeHtml(article.title)}</h3>
				<div class="reading-card-footer">
					<span class="reading-time">◷ ${escapeHtml(article.read_time)}</span>
					<button class="read-story-btn" type="button" data-article-id="${escapeHtml(article.id)}">Read Story <span aria-hidden="true">→</span></button>
				</div>
			</article>
		`).join('');

		grid.querySelectorAll('.read-story-btn').forEach((button) => {
			button.addEventListener('click', () => {
				const article = articles.find((item) => item.id === button.dataset.articleId);
				if (article) openReadingView(article);
			});
		});
	}

	function openReadingView(article) {
		currentArticle = article;
		libraryView.classList.add('hidden');
		quizView.classList.add('hidden');
		readingView.classList.remove('hidden');
		readingView.innerHTML = `
			<div class="reading-view-header">
				<button class="back-btn reading-back-btn" id="back-to-stories" type="button">← Back to Stories</button>
				<span class="reading-level-badge reading-level-${article.level.toLowerCase()}">${escapeHtml(article.level)}</span>
			</div>
			<p class="reading-eyebrow">${escapeHtml(article.category)} · ${escapeHtml(article.read_time)}</p>
			<h3 class="reading-view-title">${escapeHtml(article.title)}</h3>
			<div class="reading-content">${article.content.split('\n\n').map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>
			<aside class="vocabulary-bar">
				<h4>Key vocabulary</h4>
				<div class="vocabulary-hints">${article.vocabulary_hints.map((hint) => `<span class="vocabulary-hint"><strong>${escapeHtml(hint.word)}</strong><small>${escapeHtml(hint.translation)}</small></span>`).join('')}</div>
			</aside>
			<button class="reading-quiz-start" type="button">Start Comprehension Quiz <span aria-hidden="true">→</span></button>
		`;
		readingView.querySelector('.reading-back-btn').addEventListener('click', showLibrary);
		readingView.querySelector('.reading-quiz-start').addEventListener('click', startQuiz);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function showLibrary() {
		readingView.classList.add('hidden');
		quizView.classList.add('hidden');
		libraryView.classList.remove('hidden');
	}

	function resetReadingView() {
		currentArticle = null;
		currentQuestionIndex = 0;
		score = 0;
		questionAnswers = {};
		readingView.classList.add('hidden');
		quizView.classList.add('hidden');
		libraryView.classList.remove('hidden');
		filterButtons.forEach((filter) => filter.classList.toggle('active', filter.dataset.readingLevel === 'all'));
		if (articles.length) renderCards('all');
	}

	window.resetReadingView = resetReadingView;

	function startQuiz() {
		currentQuestionIndex = 0;
		score = 0;
		questionAnswers = {};
		readingView.classList.add('hidden');
		quizView.classList.remove('hidden');
		renderQuestion();
	}

	function renderQuestion() {
		const question = currentArticle.tasks[currentQuestionIndex];
		const savedAnswer = questionAnswers[currentQuestionIndex];
		const options = shuffleArray(question.options);
		quizView.innerHTML = `
			<div class="reading-quiz-card">
				<div class="reading-quiz-topbar">
					<button class="back-btn reading-back-btn" type="button">← Back to story</button>
					<span>Question ${currentQuestionIndex + 1} of ${currentArticle.tasks.length}</span>
				</div>
				<p class="reading-eyebrow">Comprehension check</p>
				<h3 class="reading-question">${escapeHtml(question.question)}</h3>
				<div class="reading-options">${options.map((option) => `<button class="reading-option ${savedAnswer?.chosen === option ? (savedAnswer.correct ? 'correct' : 'incorrect') : ''} ${savedAnswer && option === question.correct ? 'correct' : ''}" type="button" ${savedAnswer ? 'disabled' : ''}>${escapeHtml(option)}</button>`).join('')}</div>
				<div class="test-navigation"><button class="test-nav-btn" id="reading-previous" type="button" ${currentQuestionIndex === 0 ? 'disabled' : ''}>← Previous</button><button class="test-nav-btn primary" id="reading-next" type="button" ${savedAnswer ? '' : 'disabled'}>${currentQuestionIndex === currentArticle.tasks.length - 1 ? 'Finish Test' : 'Next Question →'}</button></div>
			</div>
		`;
		quizView.querySelector('.reading-back-btn').addEventListener('click', () => openReadingView(currentArticle));
		quizView.querySelectorAll('.reading-option').forEach((button) => {
			button.addEventListener('click', () => {
				if (questionAnswers[currentQuestionIndex]) return;
				quizView.querySelectorAll('.reading-option').forEach((optionButton) => {
					optionButton.disabled = true;
				});
				quizView.querySelector('#reading-next').disabled = false;
				const chosen = button.textContent;
				const isCorrect = chosen === question.correct;
				questionAnswers[currentQuestionIndex] = { chosen, correct: isCorrect };
				score = Object.values(questionAnswers).filter((answer) => answer.correct).length;
				button.classList.add(isCorrect ? 'correct' : 'incorrect');
				if (!isCorrect) {
					quizView.querySelectorAll('.reading-option').forEach((optionButton) => {
						if (optionButton.textContent === question.correct) optionButton.classList.add('correct');
					});
				}
				if (!isCorrect) {
					window.attachExplainButton?.(quizView, question.question, chosen, question.correct, currentArticle.content);
				}
			});
		});
			if (savedAnswer && !savedAnswer.correct) window.attachExplainButton?.(quizView, question.question, savedAnswer.chosen, question.correct, currentArticle.content);
		quizView.querySelector('#reading-previous').addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex -= 1; renderQuestion(); } });
		quizView.querySelector('#reading-next').addEventListener('click', () => { if (currentQuestionIndex === currentArticle.tasks.length - 1) renderQuizResult(); else { currentQuestionIndex += 1; renderQuestion(); } });
	}

	function renderQuizResult() {
		const total = currentArticle.tasks.length;
		let readingProgress = {};
		try {
			readingProgress = JSON.parse(localStorage.getItem('reading_progress') || '{}');
		} catch (error) {
			readingProgress = {};
		}
		const previousResult = readingProgress[currentArticle.id];
		if (!previousResult || score > Number(previousResult.score)) {
			readingProgress[currentArticle.id] = { score, total };
			localStorage.setItem('reading_progress', JSON.stringify(readingProgress));
		}
		window.dispatchEvent(new CustomEvent('learning-progress-updated'));
		if (typeof window.recordLearningActivity === 'function') {
			window.recordLearningActivity({
				testCompleted: true,
				correctAnswers: score,
				totalAnswers: total,
				storyRead: true
			});
		}
		quizView.innerHTML = `
			<div class="reading-quiz-card reading-result">
				<span class="reading-result-icon">✓</span>
				<p class="reading-eyebrow">Reading complete</p>
				<h3 class="reading-view-title">${escapeHtml(currentArticle.title)}</h3>
				<p class="reading-score">${score} / ${total}</p>
				<p class="reading-result-copy">You answered ${score === total ? 'every question correctly' : `${score} question${score === 1 ? '' : 's'} correctly`}.</p>
				<div class="reading-result-actions">
					<button class="reading-quiz-start" type="button">Try Again</button>
					<button class="back-btn reading-back-btn" type="button">← Back to Story</button>
				</div>
			</div>
		`;
		quizView.querySelector('.reading-quiz-start').addEventListener('click', startQuiz);
		quizView.querySelector('.reading-back-btn').addEventListener('click', () => openReadingView(currentArticle));
	}

	async function loadReadingData() {
		try {
			const response = await fetch('data/reading.json');
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			articles = await response.json();
			renderCards();
		} catch (error) {
			console.error('Failed to load reading.json:', error);
			grid.innerHTML = '<p class="reading-empty">Could not load reading stories. Please reload the page.</p>';
		}
	}

	filterButtons.forEach((button) => {
		button.addEventListener('click', () => {
			filterButtons.forEach((filter) => filter.classList.remove('active'));
			button.classList.add('active');
			renderCards(button.dataset.readingLevel);
		});
	});

	loadReadingData();
});
