/**
 * Knowledge Base Formatter
 * Extracts and formats Q&A content from the raw knowledge base text
 */

/**
 * Clean and normalize PDF text content
 */
function cleanPdfText(text) {
  // Remove page markers
  text = text.replace(/--- Page \d+ ---/g, '');
  
  // Remove excessive special characters
  text = text.replace(/[═─]{2,}/g, '—');
  text = text.replace(/[╔╚╗║]/g, '');
  
  // Remove bullet characters and normalize
  text = text.replace(/[•▪▸●■◦]\s*/g, '• ');
  
  // Remove extra whitespace and newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/\s{2,}/g, ' ');
  
  // Remove content placeholders like "[ Source X ]"
  text = text.replace(/\[Source \d+\]/gi, '');
  
  // Clean up multi-line whitespace
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  return lines.join('\n');
}

/**
 * Extract Q&A pairs from knowledge base text
 */
export function formatKnowledgeBaseResponse(query, chunks) {
  // Combine and clean all chunk content
  const rawContent = chunks.map(c => c.content).join('\n\n');
  const cleanedContent = cleanPdfText(rawContent);
  
  // Special handling for program listings
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('program') || lowerQuery.includes('degree') || 
      lowerQuery.includes('course') || lowerQuery.includes('offer')) {
    const programList = extractProgramList(cleanedContent);
    if (programList) {
      return `## Available Programs\n\n${programList}\n\n---\n*For more details, please contact CamTech admissions office.*`;
    }
  }
  
  // Extract Q&A pairs from the cleaned content
  const qaPairs = extractQAPairs(cleanedContent);
  
  // Find relevant Q&A pairs based on the query
  const relevantQAs = findRelevantQAs(query, qaPairs);
  
  if (relevantQAs.length > 0) {
    return formatQAResponse(relevantQAs, query);
  }
  
  // Fallback: format sections directly
  return formatSectionContent(cleanedContent, query);
}

/**
 * Extract program list from content
 */
function extractProgramList(content) {
  const programNames = [
    'Architecture', 'Cyber Security', 'Data Science and AI Engineering',
    'Educational Technology', 'Interior Design', 'Media & Communication Technology',
    'Risk Management & Business Intelligence', 'Robotics and Automation Engineering',
    'Software Engineering', 'Innovation & Entrepreneurship'
  ];
  
  // Check if any program names exist in content
  const foundPrograms = programNames.filter(name => 
    content.toLowerCase().includes(name.toLowerCase())
  );
  
  if (foundPrograms.length > 0) {
    return `CamTech offers ${foundPrograms.length} Bachelor's degree programs across all faculties:\n\n` + 
      foundPrograms.map(p => `• ${p}`).join('\n');
  }
  
  // Try to extract numbered programs from lines
  const lines = content.split('\n');
  const programs = [];
  
  for (const line of lines) {
    // Check if line contains numbered programs
    if (line.match(/\d+\.\s*[A-Z]/)) {
      const matches = line.matchAll(/(\d+)\.\s*([A-Za-z][A-Za-z\s&]+?)(?=\s+\d+\.|$)/g);
      for (const m of matches) {
        const progName = m[2].trim();
        if (progName.length > 3 && progName.length < 50) {
          programs.push(progName);
        }
      }
      if (programs.length > 0) {
        break;
      }
    }
  }
  
  if (programs.length > 0) {
    return `CamTech offers ${programs.length} Bachelor's degree programs:\n\n` + 
      programs.map((p, i) => `• ${p}`).join('\n');
  }
  
  return null;
}

/**
 * Extract Q&A pairs from the knowledge base text
 */
function extractQAPairs(text) {
  const qaPairs = [];
  
  // Pattern for Q: ... A: ... format (case insensitive)
  const pattern1 = /Q:\s*([^Q]+?)A:\s*([^Q\n]+?)(?=Q:|$)/gis;
  let match;
  const textCopy = text;
  while ((match = pattern1.exec(textCopy)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question.length > 5 && answer.length > 10) {
      qaPairs.push({ question, answer });
    }
  }
  
  // If no Q:A format found, look for numbered questions
  if (qaPairs.length === 0) {
    const numberedPattern = /\d+\.\s*([^?\n]+)\?/g;
    while ((match = numberedPattern.exec(text)) !== null) {
      const question = match[1].trim();
      const startIndex = match.index + match[0].length;
      const nextQuestion = text.indexOf(/\d+\.\s*/, startIndex);
      const endIndex = nextQuestion > 0 ? nextQuestion : text.length;
      let answer = text.substring(startIndex, endIndex).trim();
      answer = answer.replace(/^[-:—\s]+/, '').substring(0, 500);
      
      if (answer.length > 10) {
        qaPairs.push({ question, answer });
      }
    }
  }
  
  return qaPairs;
}

/**
 * Find Q&A pairs relevant to the user's query
 */
function findRelevantQAs(query, qaPairs) {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 3);
  
  // Keywords to identify topic relevance
  const topicKeywords = {
    'about': ['type', 'university', 'campus', 'mission', 'overview', 'name', 'founded', 'location'],
    'program': ['program', 'degree', 'bachelor', 'master', 'phd', 'course', 'faculty', 'engineering'],
    'admission': ['admission', 'application', 'requirement', 'eligibility', 'apply', 'deadline', 'entrance', 'exam'],
    'fee': ['fee', 'tuition', 'cost', 'price', 'payment', 'scholarship'],
    'facility': ['facility', 'library', 'lab', 'computer', 'wifi', 'sport', 'canteen', 'hostel'],
    'contact': ['contact', 'address', 'phone', 'email', 'location'],
    'language': ['language', 'instruction', 'english', 'chinese'],
    'duration': ['duration', 'year', 'semester', 'time', 'how long'],
    'international': ['international', 'foreign', 'exchange', 'student']
  };
  
  // Determine query topic
  let queryTopic = null;
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      queryTopic = topic;
      break;
    }
  }
  
  // Score and rank Q&A pairs
  const scored = qaPairs.map(qa => {
    let score = 0;
    const lowerQ = qa.question.toLowerCase();
    const lowerA = qa.answer.toLowerCase();
    const combined = lowerQ + ' ' + lowerA;
    
    // Check for topic relevance
    if (queryTopic && topicKeywords[queryTopic]) {
      if (topicKeywords[queryTopic].some(kw => combined.includes(kw))) {
        score += 5;
      }
    }
    
    // Check for query word matches
    for (const word of queryWords) {
      if (lowerQ.includes(word)) score += 3;
      if (lowerA.includes(word)) score += 1;
    }
    
    return { ...qa, score };
  });
  
  // Sort by score and return top relevant pairs
  return scored
    .filter(qa => qa.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Format Q&A pairs into a readable response
 */
function formatQAResponse(qaPairs, query) {
  // Remove duplicates and merge similar answers
  const uniqueAnswers = [];
  const seenAnswers = new Set();
  
  for (const qa of qaPairs) {
    const shortAnswer = qa.answer.substring(0, 80).toLowerCase();
    if (!seenAnswers.has(shortAnswer)) {
      seenAnswers.add(shortAnswer);
      uniqueAnswers.push(qa);
    }
  }
  
  if (uniqueAnswers.length === 0) {
    return null;
  }
  
  const parts = [];
  
  // Create a header based on the query
  const header = generateHeader(query);
  parts.push(`## ${header}\n`);
  
  for (const qa of uniqueAnswers.slice(0, 4)) {
    // Clean up the question
    const cleanQuestion = qa.question
      .replace(/^Q:\s*/i, '')
      .replace(/\?$/, '')
      .trim();
    
    // Format the answer - clean up bullet points and excessive content
    let cleanAnswer = formatAnswerText(qa.answer);
    
    parts.push(`**${cleanQuestion}**`);
    parts.push(`${cleanAnswer}\n`);
  }
  
  parts.push('---\n*For more details, please contact CamTech admissions office.*');
  
  return parts.join('\n\n');
}

/**
 * Generate a header based on the query
 */
function generateHeader(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('program') || lowerQuery.includes('degree') || lowerQuery.includes('course')) {
    return 'Academic Programs';
  }
  if (lowerQuery.includes('admission') || lowerQuery.includes('apply') || lowerQuery.includes('requirement')) {
    return 'Admission Requirements';
  }
  if (lowerQuery.includes('fee') || lowerQuery.includes('tuition') || lowerQuery.includes('cost')) {
    return 'Fees & Tuition';
  }
  if (lowerQuery.includes('about') || lowerQuery.includes('what is') || lowerQuery.includes('camtech')) {
    return 'About CamTech';
  }
  if (lowerQuery.includes('facility') || lowerQuery.includes('campus')) {
    return 'Campus & Facilities';
  }
  if (lowerQuery.includes('contact') || lowerQuery.includes('address') || lowerQuery.includes('location')) {
    return 'Contact Information';
  }
  
  // Default: extract first significant word
  const words = query.split(/\s+/).filter(w => w.length > 3);
  return words.length > 0 
    ? words[0].charAt(0).toUpperCase() + words[0].slice(1)
    : 'Information';
}

/**
 * Clean and format answer text
 */
function formatAnswerText(text) {
  // Limit length
  if (text.length > 400) {
    text = text.substring(0, 400).replace(/\s+\S*$/, '') + '...';
  }
  
  // Clean up bullet points
  text = text.replace(/[•▪▸]\s*/g, '• ');
  
  // Clean up excessive punctuation
  text = text.replace(/[—–]{2,}/g, '—');
  
  return text.trim();
}

/**
 * Format section content when no Q&A pairs are found
 */
function formatSectionContent(content, query) {
  const header = generateHeader(query);
  const parts = [];
  parts.push(`## ${header}\n`);
  
  // Split content into meaningful sections
  const sections = content.split(/\n\n+/).filter(s => s.trim().length > 50);
  
  if (sections.length === 0) {
    // Fallback to raw content if no sections found
    const lines = content.split('\n').filter(l => l.trim().length > 5);
    for (const line of lines.slice(0, 10)) {
      const cleaned = line.replace(/^[•▪▸]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (cleaned.length > 10) {
        parts.push(`• ${cleaned}`);
      }
    }
    parts.push('\n---\n*For more details, please contact CamTech admissions office.*');
    return parts.join('\n');
  }
  
  // Process each section
  for (const section of sections.slice(0, 3)) {
    const lines = section.split('\n').filter(l => l.trim().length > 5);
    
    for (const line of lines.slice(0, 6)) {
      // Clean and format the line
      let formatted = line
        .replace(/^[•▪▸]\s*/, '• ')
        .replace(/^\d+[.)]\s*/, '');
      
      if (formatted.length > 10 && formatted.length < 400) {
        parts.push(`• ${formatted}`);
      }
    }
  }
  
  parts.push('\n---\n*For more details, please contact CamTech admissions office.*');
  
  return parts.join('\n');
}

