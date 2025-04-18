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
    generator = await pipeline("text-generation", "Xenova/distilgpt2", {
      quantized: true,
      max_new_tokens: 150,
      temperature: 0.7, // Increased for more natural responses
      top_p: 0.9,
      top_k: 50, // Added for better vocabulary selection
      repetition_penalty: 1.5, // Increased to reduce repetition
      no_repeat_ngram_size: 3,
      do_sample: true,
      pad_token_id: 50256,
    });

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
    const response = await generateResponse(message);

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

// Generate response with the model
async function generateResponse(message) {
  try {
    const relevantInfo = extractRelevantInfo(message);
    const prompt = createPrompt(message, relevantInfo);

    const result = await generator(prompt, {
      max_new_tokens: 150,
      temperature: 0.3, // Reduced for more focused responses
      top_p: 0.8, // More conservative sampling
      repetition_penalty: 1.2, // Gentle repetition prevention
      do_sample: true,
      pad_token_id: 50256,
      eos_token_id: 50256,
    });

    if (!result?.[0]?.generated_text) {
      throw new Error("Invalid response");
    }

    return processGeneratedText(result[0].generated_text, prompt, relevantInfo);
  } catch (error) {
    console.error("Response generation error:", error);
    return createFallbackResponse(portfolioData.projects);
  }
}

// Add new fallback response function
function createFallbackResponse(projects) {
  return `## Available Projects

Here are all the projects in our portfolio:

${projects
  .map(
    (project) => `### ${project.title}
**Type:** ${project.media}
**Tags:** ${project.tags.join(", ")}`
  )
  .join("\n\n")}

---

*Please try:*
* Asking about a specific project listed above
* Filtering by category
* Searching by media type`;
}

// Update createPrompt function for more controlled responses
function createPrompt(message, relevantInfo) {
  const projectCount = portfolioData.projects.length;

  return `You are Studio DATA's portfolio assistant. 
ONLY respond with this exact format, replacing text in [brackets]:

## Portfolio Overview

We have ${projectCount} projects in our collection:

${relevantInfo.matchedProjects
  .map(
    (project) => `
### ${project.title}
**Media:** ${project.media}
**Tags:** ${project.tags.join(", ")}

${project.excerpt?.split(".")[0] || ""}
`
  )
  .join("\n")}

---

*What would you like to know about:*
* Any specific project details
* Browse by category: ${relevantInfo.context.availableCategories.join(", ")}
* View by media type: ${relevantInfo.context.availableMedia.join(", ")}

User query: ${message}`;
}

// Update extractRelevantInfo to include total project count
function extractRelevantInfo(message) {
  let relevantInfo = {
    context: {
      totalProjects: portfolioData.projects.length,
      availableCategories: [
        ...new Set(portfolioData.projects.flatMap((p) => p.tags)),
      ],
      availableMedia: [...new Set(portfolioData.projects.map((p) => p.media))],
    },
    matchedProjects: [],
  };

  // Include all projects for general queries about projects/count
  if (
    message.toLowerCase().includes("project") ||
    message.toLowerCase().includes("how many")
  ) {
    relevantInfo.matchedProjects = portfolioData.projects.map((project) => ({
      title: project.title,
      tags: project.tags,
      media: project.media,
      excerpt: project.excerpt,
    }));
  } else {
    const matchedProjects = searchPortfolioContent(message);
    if (matchedProjects.length > 0) {
      relevantInfo.matchedProjects = matchedProjects.map((project) => ({
        title: project.title,
        tags: project.tags,
        media: project.media,
        excerpt: project.excerpt,
      }));
    }
  }

  return relevantInfo;
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
function processGeneratedText(generatedText, prompt, relevantInfo) {
  try {
    // Start with a base structure
    let response = `## Portfolio Overview\n\n`;

    // Add project count
    response += `We have ${relevantInfo.context.totalProjects} projects:\n\n`;

    // Add cleaned project information
    relevantInfo.matchedProjects.forEach((project) => {
      const cleanExcerpt = (project.excerpt || "")
        .replace(/<[^>]*>/g, "") // Remove HTML
        .replace(/\[[^\]]*\]\([^)]*\)/g, "") // Remove markdown links
        .replace(/\{[^}]*\}/g, "") // Remove curly braces content
        .split(".")[0]; // Get first sentence

      response += `### ${project.title}\n`;
      response += `**Media:** ${project.media}\n`;
      response += `**Tags:** ${project.tags.join(", ")}\n\n`;
      response += `> ${cleanExcerpt}.\n\n`;
    });

    // Add navigation section
    response += `---\n\n`;
    response += `*Explore further:*\n`;
    response += `* Learn more about a specific project\n`;
    response += `* Browse by category: ${relevantInfo.context.availableCategories.join(
      ", "
    )}\n`;
    response += `* View by media type: ${relevantInfo.context.availableMedia.join(
      ", "
    )}`;

    return response;
  } catch (error) {
    console.error("Error processing response:", error);
    return createFallbackResponse(portfolioData.projects);
  }
}

function getResponseTitle(prompt) {
  // Extract topic from user query
  const userQuery = prompt.split("User:").pop().trim().toLowerCase();
  if (userQuery.includes("project")) return "Portfolio Projects";
  if (userQuery.includes("about")) return "About Studio DATA";
  return "Studio DATA Information";
}

// Enhanced search with semantic matching
function searchPortfolioContent(query) {
  const searchTerms = query.toLowerCase().split(" ");
  const contextTerms = conversationHistory
    .slice(-2)
    .map((msg) => msg.content.toLowerCase().split(" "))
    .flat();

  return portfolioData.projects
    .map((project) => {
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

      // Direct match scoring
      [...searchTerms, ...contextTerms].forEach((term) => {
        if (searchableContent.includes(term)) {
          score += term.length > 3 ? 2 : 1; // Prioritize longer words
          if (project.title.toLowerCase().includes(term)) score += 5;
          if (project.tags.some((tag) => tag.toLowerCase().includes(term)))
            score += 3;
        }
      });

      // Context relevance
      if (conversationHistory.length > 0) {
        const lastContext =
          conversationHistory[conversationHistory.length - 1].content;
        if (searchableContent.includes(lastContext.toLowerCase())) score += 2;
      }

      return { project, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.project);
}
