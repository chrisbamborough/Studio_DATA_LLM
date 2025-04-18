// Import from Transformers.js
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0";

// Add marked library import at the top
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

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
      "Hi there! I'm Studio DATA's agent. What would you like to find out about?",
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

// Generate response with the model
async function generateResponse(message) {
  const relevantInfo = extractRelevantInfo(message);
  const prompt = createPrompt(message, relevantInfo);

  const result = await generator(prompt, {
    max_new_tokens: 200, // Increased for more detailed responses
    temperature: 0.2, // Reduced further for more factual responses
    top_p: 0.5, // More conservative sampling
    repetition_penalty: 1.8, // Increased to avoid repetition
    no_repeat_ngram_size: 3, // Prevent repetitive phrases
  });

  return processGeneratedText(result[0].generated_text, prompt);
}

// Extract relevant information from portfolio data based on user message
function extractRelevantInfo(message) {
  let relevantInfo = {
    context: {},
    matchedProjects: [],
  };

  // Search for relevant projects
  const matchedProjects = searchPortfolioContent(message);

  if (matchedProjects.length > 0) {
    relevantInfo.matchedProjects = matchedProjects.map((project) => ({
      title: project.title,
      tags: project.tags,
      media: project.media,
      content: project.content,
      excerpt: project.excerpt,
    }));
  }

  // Add specific context based on query type
  if (message.toLowerCase().includes("about")) {
    relevantInfo.context.about = portfolioData.about;
  }

  return relevantInfo;
}

// Create a prompt for the language model
function createPrompt(message, relevantInfo) {
  const projectCount = portfolioData.projects.length;

  // Create a simpler, more direct prompt
  return `Format the response exactly like this markdown template:

## Portfolio Projects

${portfolioData.projects.length} projects are available:

${relevantInfo.matchedProjects
  .map(
    (project) => `### ${project.title}
**Type:** ${project.media}
**Tags:** ${project.tags.join(", ")}

> ${
      project.excerpt
        ? project.excerpt.split(".")[0]
        : project.content.split(".")[0]
    }.
`
  )
  .join("\n\n")}

---

*Next steps:*
* Learn more about a specific project
* See projects by category
* Browse by media type

User: ${message}`;
}

// Add this new helper function
function cleanProjectContent(project) {
  // Clean content/excerpt of HTML and markup
  const cleanContent = (project.excerpt || project.content || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .split(".")[0];

  return `### ${project.title}
**Tags:** ${project.tags.join(", ")}
**Media:** ${project.media}

> ${cleanContent}.`;
}

// Process the generated text to get a clean response
function processGeneratedText(generatedText, prompt) {
  // Extract only the generated response
  const responseStart = generatedText.indexOf("##");
  if (responseStart === -1) {
    // Fallback response if formatting fails
    return `## Portfolio Projects

${portfolioData.projects.length} projects are available.

${portfolioData.projects
  .map(
    (project) => `### ${project.title}
**Type:** ${project.media}
**Tags:** ${project.tags.join(", ")}

> ${
      project.excerpt
        ? project.excerpt.split(".")[0]
        : project.content.split(".")[0]
    }.
`
  )
  .join("\n\n")}

---

*Next steps:*
* Learn more about a specific project
* See projects by category
* Browse by media type`;
  }

  // Clean up the response
  let response = generatedText
    .slice(responseStart)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/<[^>]*>/g, "")
    .trim();

  // Ensure it ends with the options section
  if (!response.includes("---")) {
    response +=
      "\n\n---\n\n*Next steps:*\n* Learn more about a specific project\n* See projects by category\n* Browse by media type";
  }

  return response;
}

function getResponseTitle(prompt) {
  // Extract topic from user query
  const userQuery = prompt.split("User:").pop().trim().toLowerCase();
  if (userQuery.includes("project")) return "Portfolio Projects";
  if (userQuery.includes("about")) return "About Studio DATA";
  return "Studio DATA Information";
}

// Search portfolio content
function searchPortfolioContent(query) {
  // If querying for all projects, return everything
  if (
    query.toLowerCase().includes("projects") ||
    query.toLowerCase().includes("all")
  ) {
    return portfolioData.projects;
  }

  const searchTerms = query.toLowerCase().split(" ");

  // Score and rank projects based on relevance
  const scoredProjects = portfolioData.projects.map((project) => {
    let score = 0;
    const searchableContent = [
      project.title,
      project.content,
      project.excerpt,
      ...project.tags,
      project.media,
    ]
      .join(" ")
      .toLowerCase();

    searchTerms.forEach((term) => {
      const matches = searchableContent.match(new RegExp(term, "g"));
      if (matches) score += matches.length;

      // Boost score for exact matches in title and tags
      if (project.title.toLowerCase().includes(term)) score += 5;
      if (project.tags.some((tag) => tag.toLowerCase().includes(term)))
        score += 3;
    });

    return { project, score };
  });

  // Return all relevant projects (removed the slice limit)
  return scoredProjects
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.project);
}
