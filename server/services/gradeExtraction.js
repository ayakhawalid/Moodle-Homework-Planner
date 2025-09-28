const Tesseract = require('tesseract.js');

// Configure Tesseract to avoid worker issues
const tesseractConfig = {
  logger: m => {
    if (m.status === 'recognizing text') {
      console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
    }
  }
};

class GradeExtractionService {
  constructor() {
    this.gradePatterns = [
      /(\d+)\s*\/\s*(\d+)/,           // 85/100
      /Grade:\s*(\d+)/i,              // Grade: 85
      /Score:\s*(\d+)/i,              // Score: 85
      /(\d+)\s*points/i,              // 85 points
      /(\d+)\s*out\s*of\s*(\d+)/i,    // 85 out of 100
      /(\d+)\s*%\s*\((\d+)\s*\/\s*(\d+)\)/i, // 85% (85/100)
      /(\d+)\s*\/\s*(\d+)\s*\((\d+)%\)/i,    // 85/100 (85%)
      /Total:\s*(\d+)\s*\/\s*(\d+)/i,        // Total: 85/100
      /Final:\s*(\d+)/i,              // Final: 85
      /(\d+)\s*grade/i                // 85 grade
    ];
  }

  async extractGradeFromImage(imageBuffer, manualGrade = null) {
    try {
      console.log('Processing grade verification...');
      
      // If manual grade is provided, use it instead of OCR
      if (manualGrade !== null) {
        console.log('Using manual grade entry:', manualGrade);
        
        // Parse the manual grade (could be "85/100" or just "85")
        const gradeMatch = manualGrade.toString().match(/(\d+)(?:\/(\d+))?/);
        if (gradeMatch) {
          const grade = parseInt(gradeMatch[1]);
          const total = parseInt(gradeMatch[2]) || 100;
          const percentage = Math.round((grade / total) * 100);
          
          return {
            success: true,
            grade: grade,
            total: total,
            percentage: percentage,
            confidence: 1.0, // Manual entry has 100% confidence
            rawText: `Manual entry: ${grade}/${total}`,
            source: 'manual'
          };
        } else {
          return {
            success: false,
            error: 'Invalid grade format. Please enter as "85" or "85/100"',
            rawText: 'Invalid manual grade format'
          };
        }
      }
      
      // OCR is disabled - return manual entry required
      console.log('OCR disabled - manual entry required');
      
      return {
        success: false,
        error: 'Please enter your grade manually.',
        rawText: 'Manual grade entry required',
        manualEntryRequired: true
      };
      
      /* ORIGINAL OCR CODE - COMMENTED OUT DUE TO WORKER ISSUES
      // Process image with Tesseract using safer configuration
      let result;
      try {
        // First try with our configured logger
        result = await Tesseract.recognize(imageBuffer, 'eng', tesseractConfig);
      } catch (workerError) {
        console.error('Tesseract worker error with logger:', workerError);
        try {
          // Try without logger
          result = await Tesseract.recognize(imageBuffer, 'eng');
        } catch (simpleError) {
          console.error('Tesseract simple error:', simpleError);
          // Last resort - try with minimal config
          result = await Tesseract.recognize(imageBuffer);
        }
      }

      const text = result.data.text;
      console.log('Extracted text:', text);

      // Extract grade using multiple patterns
      const extractedGrade = this.parseGradeFromText(text);
      
      if (extractedGrade) {
        console.log('Successfully extracted grade:', extractedGrade);
        return {
          success: true,
          grade: extractedGrade.grade,
          total: extractedGrade.total,
          percentage: extractedGrade.percentage,
          confidence: extractedGrade.confidence,
          rawText: text
        };
      } else {
        console.log('No grade pattern found in text');
        return {
          success: false,
          error: 'No grade pattern found in image',
          rawText: text
        };
      }
      */
    } catch (error) {
      console.error('Grade extraction error:', error);
      return {
        success: false,
        error: error.message || 'OCR processing failed',
        manualEntryRequired: true
      };
    }
  }

  parseGradeFromText(text) {
    // Clean the text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Try each pattern
    for (const pattern of this.gradePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const grade = parseInt(match[1]);
        const total = parseInt(match[2]) || parseInt(match[3]) || 100;
        const percentage = Math.round((grade / total) * 100);
        
        // Calculate confidence based on pattern match quality
        const confidence = this.calculateConfidence(match, cleanText);
        
        return {
          grade,
          total,
          percentage,
          confidence,
          pattern: pattern.toString()
        };
      }
    }
    
    return null;
  }

  calculateConfidence(match, text) {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for more specific patterns
    if (match[0].includes('Grade:') || match[0].includes('Score:')) {
      confidence += 0.2;
    }
    
    // Higher confidence for percentage patterns
    if (match[0].includes('%')) {
      confidence += 0.1;
    }
    
    // Higher confidence for fraction patterns
    if (match[0].includes('/')) {
      confidence += 0.1;
    }
    
    // Check if grade is in reasonable range
    const grade = parseInt(match[1]);
    if (grade >= 0 && grade <= 100) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Helper method to validate extracted grade
  validateGrade(grade, total) {
    const issues = [];
    
    if (grade < 0 || grade > total) {
      issues.push('Grade out of valid range');
    }
    
    if (total <= 0) {
      issues.push('Invalid total points');
    }
    
    if (grade > total) {
      issues.push('Grade exceeds total points');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

module.exports = new GradeExtractionService();
