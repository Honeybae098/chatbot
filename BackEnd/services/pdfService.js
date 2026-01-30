const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

class PDFService {
  constructor() {
    this.cache = null;
    this.lastModified = null;
  }

  async loadKnowledgeBase() {
    const pdfPath = path.join(__dirname, '../knowledge_base/camtech-kb.pdf');
    
    // Check if file has been modified since last load
    const stats = fs.statSync(pdfPath);
    const currentModified = stats.mtime.getTime();
    
    if (this.cache && this.lastModified === currentModified) {
      console.log('📚 Using cached knowledge base');
      return this.cache;
    }
    
    console.log('📖 Reading PDF knowledge base...');
    
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdf(dataBuffer);
      
      // Clean and structure the text
      const cleanedText = this.cleanPDFText(data.text);
      
      // Cache it
      this.cache = cleanedText;
      this.lastModified = currentModified;
      
      console.log(`✅ Knowledge base loaded: ${data.numpages} pages, ${cleanedText.length} characters`);
      
      return cleanedText;
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw new Error('Failed to load knowledge base');
    }
  }

  cleanPDFText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers
      .replace(/\bPage \d+\b/gi, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      // Remove multiple consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Method to reload knowledge base (useful for updates)
  async reloadKnowledgeBase() {
    this.cache = null;
    this.lastModified = null;
    return await this.loadKnowledgeBase();
  }
}

module.exports = new PDFService();