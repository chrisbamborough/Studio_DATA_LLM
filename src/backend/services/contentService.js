// src / backend / services / contentService.js
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const matter = require("gray-matter");
const { marked } = require("marked");

// Base directory for content
const contentDir = path.join(__dirname, "../../../portfolio-content");

// Parse markdown content with frontmatter
function parseMarkdownFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: marked(content), // Convert markdown to HTML
    excerpt: content.split("\n\n")[0].substring(0, 150) + "...", // Create excerpt
  };
}

// Cache objects and timestamps
let projectsCache = null;
let projectsCacheTime = 0;
let aboutCache = null;
let aboutCacheTime = 0;

// Cache duration in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Get all projects
function getProjects() {
  const now = Date.now();

  // Return cached projects if valid
  if (projectsCache && now - projectsCacheTime < CACHE_TTL) {
    return projectsCache;
  }

  // Otherwise read from files
  const projectFiles = glob.sync(path.join(contentDir, "projects", "*.md"));

  projectsCache = projectFiles.map((file) => {
    const project = parseMarkdownFile(file);
    project.id = path.basename(file, ".md");
    return project;
  });

  projectsCacheTime = now;
  return projectsCache;
}

// Get a single project by ID
function getProjectById(id) {
  const filePath = path.join(contentDir, "projects", `${id}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const project = parseMarkdownFile(filePath);
  project.id = id;
  return project;
}

// Get about information
function getAbout() {
  const now = Date.now();

  if (aboutCache && now - aboutCacheTime < CACHE_TTL) {
    return aboutCache;
  }

  const aboutPath = path.join(contentDir, "about", "about.md");

  if (!fs.existsSync(aboutPath)) {
    return null;
  }

  aboutCache = parseMarkdownFile(aboutPath);
  aboutCacheTime = now;
  return aboutCache;
}

module.exports = {
  getProjects,
  getProjectById,
  getAbout,
};
