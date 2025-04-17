// Import from Transformers.js
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0";

// Set environment variables
env.allowLocalModels = false; // Only use models from Hugging Face Hub
env.useBrowserCache = true; // Cache models in browser

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const modelStatus = document.getElementById("model-status");

// Portfolio data
let portfolioData = null;

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
      "Hi there! I'm Alex's portfolio assistant. Ask me about projects, skills, or experience!",
      false
    );
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

// Global model
let generator = null;

// Initialize model
async function initializeModel() {
  try {
    // Using a small model suitable for browser environments
    // DistilGPT2 is relatively small but still capable for simple conversational tasks
    generator = await pipeline("text-generation", "Xenova/distilgpt2");

    // Enable UI elements
    userInput.disabled = false;
    sendButton.disabled = false;
    modelStatus.textContent = "Model status: Ready";

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Model initialization error:", error);
    modelStatus.textContent = "Model status: Failed to load model";
    throw error;
  }
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

// Handle user messages
async function handleUserMessage() {
  const message = userInput.value.trim();
  if (!message) return;

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
    const response = await generateResponse(message);

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
  messageDiv.textContent = text;

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

// Generate response with the model
async function generateResponse(message) {
  // Create a context for the model with portfolio information
  const relevantInfo = extractRelevantInfo(message);

  // Create a prompt for the model
  const prompt = createPrompt(message, relevantInfo);

  // Generate response
  const result = await generator(prompt, {
    max_new_tokens: 100,
    temperature: 0.7,
    top_p: 0.9,
    repetition_penalty: 1.2,
  });

  // Process the generated text to get a clean response
  return processGeneratedText(result[0].generated_text, prompt);
}

// Extract relevant information from portfolio data based on user message
function extractRelevantInfo(message) {
  const lowercaseMessage = message.toLowerCase();
  let relevantInfo = {};

  // Check for project-related queries
  if (
    lowercaseMessage.includes("project") ||
    lowercaseMessage.includes("work") ||
    lowercaseMessage.includes("portfolio")
  ) {
    relevantInfo.projects = portfolioData.projects;
  }

  // Check for personal info queries
  if (
    lowercaseMessage.includes("about") ||
    lowercaseMessage.includes("who") ||
    lowercaseMessage.includes("background") ||
    lowercaseMessage.includes("experience")
  ) {
    relevantInfo.about = portfolioData.about;
  }

  // If nothing specific matched, include basic info
  if (Object.keys(relevantInfo).length === 0) {
    relevantInfo = {
      about: portfolioData.about,
      projectCount: portfolioData.projects.length,
    };
  }

  return relevantInfo;
}

// Create a prompt for the language model
function createPrompt(message, relevantInfo) {
  return `
You are an AI assistant for a portfolio website. Your name is Assistant and you help visitors learn about Alex, a Full Stack Developer.

PORTFOLIO INFORMATION:
${JSON.stringify(relevantInfo)}

INSTRUCTIONS:
- Be helpful, friendly, and concise
- Answer based on the portfolio information provided
- If you don't know the answer, suggest the visitor explore the portfolio sections
- Keep responses under 3 sentences when possible

User: ${message}
Assistant:`;
}

// Process the generated text to get a clean response
function processGeneratedText(generatedText, prompt) {
  // Extract just the assistant's response
  const assistantPrefix = "Assistant:";
  const assistantResponseStart =
    generatedText.lastIndexOf(assistantPrefix) + assistantPrefix.length;
  let response = generatedText.slice(assistantResponseStart).trim();

  // Clean up any incomplete sentences at the end
  const endPunctuation = response.lastIndexOf(".");
  if (endPunctuation !== -1 && endPunctuation < response.length - 1) {
    response = response.slice(0, endPunctuation + 1);
  }

  // If response is too short or empty, provide a fallback
  if (response.length < 10) {
    return "I understand your question about the portfolio, but I'm having trouble formulating a good response. Maybe try asking in a different way?";
  }

  return response;
}
