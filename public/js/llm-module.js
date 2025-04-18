// LLM Module - Handles all language model functionality
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0";

// Set environment variables
env.allowLocalModels = false;
env.useBrowserCache = true;

// Initialize model
let generator = null;
let modelStatus = "Initializing";

// Initialize the language model
async function initializeModel() {
  try {
    modelStatus = "Loading language model...";

    generator = await pipeline("text-generation", "Xenova/distilgpt2", {
      quantized: true,
      max_new_tokens: 150,
      temperature: 0.3,
      top_p: 0.8,
      top_k: 50,
      repetition_penalty: 1.5,
      no_repeat_ngram_size: 3,
      do_sample: true,
      pad_token_id: 50256,
    });

    modelStatus = "Ready";
    return true;
  } catch (error) {
    console.error("Model initialization error:", error);
    modelStatus = "Failed to load model";
    throw error;
  }
}

// Generate response with the model
async function generateResponse(message, portfolioData, conversationHistory) {
  try {
    const relevantInfo = extractRelevantInfo(
      message,
      portfolioData,
      conversationHistory
    );
    const prompt = createPrompt(message, relevantInfo, portfolioData);

    const result = await generator(prompt, {
      max_new_tokens: 150,
      temperature: 0.3,
      top_p: 0.8,
      repetition_penalty: 1.2,
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

// Extract relevant information from the message and portfolio data
function extractRelevantInfo(message, portfolioData, conversationHistory) {
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
    const matchedProjects = searchPortfolioContent(
      message,
      portfolioData,
      conversationHistory
    );
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

// Create a prompt for the language model
function createPrompt(message, relevantInfo, portfolioData) {
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

// Create fallback response
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

// Clean project content
function cleanProjectContent(project) {
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

// Process the generated text
function processGeneratedText(generatedText, prompt, relevantInfo) {
  try {
    // Start with a base structure
    let response = `## Portfolio Overview\n\n`;

    // Add project count
    response += `We have ${relevantInfo.context.totalProjects} projects:\n\n`;

    // Add cleaned project information
    relevantInfo.matchedProjects.forEach((project) => {
      const cleanExcerpt = (project.excerpt || "")
        .replace(/<[^>]*>/g, "")
        .replace(/\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\{[^}]*\}/g, "")
        .split(".")[0];

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
    return createFallbackResponse(relevantInfo.context.projects || []);
  }
}

// Search for content in the portfolio
function searchPortfolioContent(query, portfolioData, conversationHistory) {
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
          score += term.length > 3 ? 2 : 1;
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

// Get status of the model
function getModelStatus() {
  return modelStatus;
}

// Export functions
export { initializeModel, generateResponse, getModelStatus };
