/**
 * Global State Utilities
 * Shared state and helper functions across modules
 */

// Global knowledge base state (loaded at server startup)
export let fullPdfText = '';
export let isServerReady = false;

/**
 * Strip markdown formatting
 */
export function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
    .replace(/`(.*?)`/g, '$1')        // Remove `code`
    .replace(/~~(.*?)~~/g, '$1')      // Remove ~~strikethrough~~
    .trim();
}

/**
 * Set knowledge base content
 */
export function setKnowledgeBase(text) {
  fullPdfText = text;
}

/**
 * Get knowledge base content
 */
export function getKnowledgeBase() {
  return fullPdfText;
}

/**
 * Check if knowledge base is loaded
 */
export function hasKnowledgeBase() {
  return fullPdfText && fullPdfText.length > 100;
}

/**
 * Set server ready status
 */
export function setServerReady(status) {
  isServerReady = status;
}

/**
 * Get server ready status
 */
export function getServerReady() {
  return isServerReady;
}

