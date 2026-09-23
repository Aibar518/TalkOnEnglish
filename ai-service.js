/**
 * TalkOnEnglish - Gemini AI helper.
 */

(function setupAIService() {
  const unavailableMessage = 'AI Service Temporarily Unavailable. Please check your API key or try again in a few seconds.';
  const overloadMessage = 'Сервер ИИ временно перегружен. Попробуйте нажать кнопку еще раз через несколько секунд.';

  async function askGemini(prompt) {
    const apiKey = localStorage.getItem('gemini_api_key')?.trim();
    if (!apiKey) {
      throw new Error('Please set your Gemini API Key in Profile.');
    }

    const requestBody = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    };

    async function requestModel(model) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      let last503 = false;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (response.status === 503) {
            last503 = true;
            const responseText = await response.text();
            console.error(`Gemini 503 attempt ${attempt + 1}/3 for ${model}:`, responseText);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
              continue;
            }
            break;
          }

          if (!response.ok) {
            const responseText = await response.text();
            let responseJson;
            try {
              responseJson = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
              responseJson = { raw: responseText || 'Empty response body' };
            }
            console.error('Full Gemini API Response:', responseJson);
            throw new Error(`AI Error [Status ${response.status}]: ${responseJson.error?.message || responseJson.raw || response.statusText || 'Unknown error'}`);
          }

          const responseData = await response.json();
          const text = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            console.error('Full Gemini Payload:', responseData);
            throw new Error('No text content found in response');
          }
          return text;
        } catch (error) {
          console.error(`Gemini API request failed for ${model}:`, error);
          if (error.message === 'No text content found in response' || error.message.startsWith('AI Error')) throw error;
          if (!last503) throw new Error(`AI Error [Request failed]: ${error.message || unavailableMessage}`);
        }
      }

      return null;
    }

    const primaryResult = await requestModel('gemini-3.6-flash');
    if (primaryResult) return primaryResult;
    throw new Error(overloadMessage);
  }

  async function analyzeWriting(userText) {
    const prompt = `You are an expert English writing evaluator. Analyze the user's text and provide a structured response with:\n1. Estimated CEFR Level (e.g., A2, B1, B2, C1).\n2. Key Grammar & Spelling Corrections (bullet points).\n3. Improved / More Natural Version of the text.\n4. Brief Encouraging Feedback.\n\nUser text:\n${userText}`;
    return askGemini(prompt);
  }

  async function sendChatMessage(userMessage) {
    const prompt = `You are a friendly, encouraging English language tutor. Help the user with English grammar, vocabulary, idiom explanations, and practice. Keep responses concise and helpful.\n\nUser message:\n${userMessage}`;
    return askGemini(prompt);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function attachExplainButton(container, question, wrongAnswer, correctAnswer, passageText = '') {
    if (!container || typeof window.askGemini !== 'function') return;
    const slot = document.createElement('div');
    slot.className = 'ai-explanation-slot';
    slot.innerHTML = '<button class="ai-explain-btn" type="button">💡 Explain with AI</button>';
    container.appendChild(slot);

    slot.querySelector('.ai-explain-btn').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.innerHTML = '<span class="ai-spinner" aria-hidden="true"></span> Thinking...';
      const prompt = passageText
        ? `Context Passage: ${passageText}\nQuestion: ${question}\nUser selected: ${wrongAnswer}\nCorrect answer: ${correctAnswer}\n\nTask: Briefly explain in 2 short sentences why ${wrongAnswer} is incorrect based on the passage, and quote/point to the evidence in the passage that supports ${correctAnswer}.`
        : `You are a helpful English teacher. Explain briefly in 2 short sentences why answering '${wrongAnswer}' to '${question}' is wrong and why '${correctAnswer}' is right.`;
      try {
        const explanation = await window.askGemini(prompt);
        slot.innerHTML = `<div class="ai-explanation-card"><strong>💡 AI explanation</strong><p>${escapeHtml(explanation).replaceAll('\n', '<br>')}</p></div>`;
        requestAnimationFrame(() => {
          const explanationCard = slot.querySelector('.ai-explanation-card');
          if (explanationCard) explanationCard.style.height = 'auto';
        });
      } catch (error) {
        slot.innerHTML = `<div class="ai-explanation-card ai-explanation-error"><strong>AI explanation unavailable</strong><p>${escapeHtml(error.message)}</p></div>`;
      }
    });
  }

  window.askGemini = askGemini;
  window.analyzeWriting = analyzeWriting;
  window.sendChatMessage = sendChatMessage;
  window.attachExplainButton = attachExplainButton;
}());
