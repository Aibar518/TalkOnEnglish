/**
 * TalkOnEnglish - AI Writing Assistant and Tutor Widget.
 */

document.addEventListener('DOMContentLoaded', () => {
  const writingInput = document.getElementById('writing-text-input');
  const analyzeButton = document.getElementById('analyze-writing-btn');
  const analysisResult = document.getElementById('writing-analysis-result');
  const characterCount = document.getElementById('writing-character-count');
  const tutorToggle = document.getElementById('ai-tutor-toggle');
  const tutorWidget = document.getElementById('ai-tutor-widget');
  const tutorClose = document.getElementById('ai-tutor-close');
  const tutorMessages = document.getElementById('ai-tutor-messages');
  const tutorForm = document.getElementById('ai-tutor-form');
  const tutorInput = document.getElementById('ai-tutor-input');

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatAIText(text) {
    return escapeHtml(text)
      .replace(/^\s*(\d+\.)\s+(.+)$/gm, '<h4>$1 $2</h4>')
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function renderAnalysis(text) {
    const levelMatch = text.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
    const level = levelMatch ? levelMatch[1].toUpperCase() : 'AI';
    analysisResult.innerHTML = `<div class="writing-analysis-card"><div class="writing-analysis-top"><span>✨ AI writing review</span><strong>${escapeHtml(level)}</strong></div><div class="writing-analysis-content"><p>${formatAIText(text)}</p></div></div>`;
    analysisResult.classList.remove('hidden');
  }

  analyzeButton?.addEventListener('click', async () => {
    const userText = writingInput.value.trim();
    if (!userText) {
      analysisResult.innerHTML = '<div class="writing-analysis-card writing-analysis-error"><p>Please write something before starting the analysis.</p></div>';
      analysisResult.classList.remove('hidden');
      return;
    }
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = '<span class="ai-spinner" aria-hidden="true"></span> Analyzing...';
    analysisResult.innerHTML = '<div class="writing-analysis-card"><p>Reading your text and preparing feedback...</p></div>';
    analysisResult.classList.remove('hidden');
    try {
      renderAnalysis(await window.analyzeWriting(userText));
    } catch (error) {
      analysisResult.innerHTML = `<div class="writing-analysis-card writing-analysis-error"><p>${escapeHtml(error.message)}</p></div>`;
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = '✨ Check &amp; Analyze Text';
    }
  });

  writingInput?.addEventListener('input', () => {
    characterCount.textContent = `${writingInput.value.length} character${writingInput.value.length === 1 ? '' : 's'}`;
  });

  function addChatMessage(text, type) {
    const message = document.createElement('div');
    message.className = `ai-chat-message ai-chat-${type}`;
    message.textContent = text;
    tutorMessages.appendChild(message);
    tutorMessages.scrollTop = tutorMessages.scrollHeight;
    return message;
  }


  tutorToggle?.addEventListener('click', () => {
    const isHidden = tutorWidget.classList.toggle('hidden');
    tutorToggle.setAttribute('aria-expanded', String(!isHidden));
    if (!isHidden) tutorInput.focus();
  });
  tutorClose?.addEventListener('click', () => {
    tutorWidget.classList.add('hidden');
    tutorToggle.setAttribute('aria-expanded', 'false');
  });

  tutorForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userMessage = tutorInput.value.trim();
    if (!userMessage) return;
    tutorInput.value = '';
    addChatMessage(userMessage, 'user');
    const typingMessage = addChatMessage('AI is typing...', 'bot typing');
    tutorForm.querySelector('button').disabled = true;
    try {
      const reply = await window.sendChatMessage(userMessage);
      typingMessage.textContent = reply;
      typingMessage.classList.remove('typing');
    } catch (error) {
      typingMessage.textContent = error.message;
      typingMessage.classList.remove('typing');
    } finally {
      tutorForm.querySelector('button').disabled = false;
      tutorInput.focus();
    }
  });
});
