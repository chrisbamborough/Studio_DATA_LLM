// Import from Transformers.js
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import {
  initializeModel,
  generateResponse,
  getModelStatus,
} from "./llm-module.js";

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const modelStatus = document.getElementById("model-status");

// Portfolio data
let portfolioData = null;

// Add conversation memory
let conversationHistory = [];

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load portfolio data
    modelStatus.textContent = "Model status: Loading portfolio data...";
    portfolioData = await loadPortfolioData();

    // Load model
    modelStatus.textContent = "Model status: Loading language model...";
    await initializeModel();

    // Add welcome message
    addMessage(
      "Hi there! I'm Studio DATA's agent. What would you like to find out about?",
      false
    );

    // Enable UI elements
    userInput.disabled = false;
    sendButton.disabled = false;
    modelStatus.textContent = `Model status: ${getModelStatus()}`;

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    modelStatus.textContent =
      "Model status: Error initializing. Please refresh.";
  }
});

// Load portfolio data from API
async function loadPortfolioData() {
  const response = await fetch("/api/portfolio-data");
  if (!response.ok) {
    throw new Error("Failed to load portfolio data");
  }
  return await response.json();
}

// Set up event listeners
function setupEventListeners() {
  sendButton.addEventListener("click", handleUserMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleUserMessage();
    }
  });
}

// Update message handling
async function handleUserMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  // Add to conversation history
  conversationHistory.push({ isUser: true, content: message });
  if (conversationHistory.length > 6) conversationHistory.shift();

  // Clear input
  userInput.value = "";

  // Add user message to chat
  addMessage(message, true);

  // Disable input while processing
  userInput.disabled = true;
  sendButton.disabled = true;

  // Show thinking animation
  const thinkingElement = showThinking();

  try {
    // Process message
    const response = await generateResponse(
      message,
      portfolioData,
      conversationHistory
    );

    // Add to conversation history
    conversationHistory.push({ isUser: false, content: response });

    // Remove thinking animation
    chatMessages.removeChild(thinkingElement);

    // Add response
    addMessage(response, false);
  } catch (error) {
    console.error("Error generating response:", error);

    // Remove thinking animation
    chatMessages.removeChild(thinkingElement);

    // Show error message
    addMessage(
      "I'm sorry, I encountered an error processing your request.",
      false
    );
  } finally {
    // Re-enable input
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

// Add message to chat
function addMessage(text, isUser) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.classList.add(isUser ? "user-message" : "assistant-message");

  // Parse markdown for assistant messages only
  if (!isUser) {
    messageDiv.innerHTML = marked.parse(text);
  } else {
    messageDiv.textContent = text;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show thinking animation
function showThinking() {
  const thinkingDiv = document.createElement("div");
  thinkingDiv.classList.add("message", "assistant-message", "thinking");

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.classList.add("dot");
    thinkingDiv.appendChild(dot);
  }

  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return thinkingDiv;
}
