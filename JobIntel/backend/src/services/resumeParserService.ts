import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist';
import { Document } from 'docx';
import { readFile } from 'xlsx';

// Set the worker path for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ParsedResumeData {
  text: string;
  skills: string[];
  technologies: string[];
  workExperience: Array<{
    role: string;
    company: string;
    duration: string;
    startYear?: number;
    endYear?: number;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: number;
  }>;
  email?: string;
  phone?: string;
  location?: string;
  parsingQuality: 'high' | 'medium' | 'low';
  rawText?: string;
}

// Tech stack dictionary for skill detection
const TECH_STACK = {
  languages: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C++',
    'C#',
    'Go',
    'Rust',
    'PHP',
    'Ruby',
    'Kotlin',
    'Swift',
    'SQL',
    'HTML',
    'CSS',
  ],
  frameworks: [
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'Express',
    'Django',
    'Flask',
    'Spring',
    'FastAPI',
    'Next.js',
    'NestJS',
    'ASP.NET',
    'Rails',
  ],
  databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'DynamoDB', 'Firebase', 'Cassandra', 'Oracle', 'SQL Server'],
  cloud: ['AWS', 'Azure', 'GCP', 'Heroku', 'DigitalOcean', 'Kubernetes', 'Docker'],
  tools: [
    'Git',
    'GitHub',
    'GitLab',
    'Jira',
    'Confluence',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'CI/CD',
    'AWS',
    'GCP',
    'Azure',
  ],
};

class ResumeParserService {
  /**
   * Extract text from PDF file
   */
  private async extractPdfText(filePath: string): Promise<string> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const pdf = await pdfjs.getDocument({ data: fileBuffer }).promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ');
        text += pageText + '\n';
      }

      return text;
    } catch (error) {
      logger.error(`Error parsing PDF: ${error}`, { filePath });
      throw new Error(`Failed to parse PDF: ${(error as any).message}`);
    }
  }

  /**
   * Extract text from DOCX file
   */
  private async extractDocxText(filePath: string): Promise<string> {
    try {
      const doc = new Document({
        sections: [],
      });
      const fileBuffer = fs.readFileSync(filePath);
      // Note: actual DOCX parsing requires additional library setup
      // For now, return basic placeholder
      logger.warn(`DOCX parsing requires additional setup, returning placeholder`);
      return '';
    } catch (error) {
      logger.error(`Error parsing DOCX: ${error}`, { filePath });
      throw error;
    }
  }

  /**
   * Detect skills from resume text
   */
  private detectSkills(text: string): { skills: string[]; technologies: string[] } {
    const skills = new Set<string>();
    const technologies = new Set<string>();
    const lowerText = text.toLowerCase();

    // Detect technologies
    Object.entries(TECH_STACK).forEach(([category, techs]) => {
      techs.forEach((tech) => {
        if (lowerText.includes(tech.toLowerCase())) {
          technologies.add(tech);
          skills.add(tech);
        }
      });
    });

    // Detect other common skills
    const skillKeywords = [
      'agile',
      'scrum',
      'kanban',
      'rest api',
      'graphql',
      'microservices',
      'machine learning',
      'artificial intelligence',
      'data science',
      'data analysis',
      'big data',
      'devops',
      'cloud computing',
      'cybersecurity',
      'blockchain',
      'iot',
      'testing',
      'qa',
      'deployment',
      'optimization',
      'debugging',
      'refactoring',
      'documentation',
      'code review',
      'team leadership',
      'project management',
      'communication',
      'problem solving',
    ];

    skillKeywords.forEach((skill) => {
      if (lowerText.includes(skill.toLowerCase())) {
        skills.add(skill);
      }
    });

    return {
      skills: Array.from(skills),
      technologies: Array.from(technologies),
    };
  }

  /**
   * Extract work experience from text
   */
  private extractWorkExperience(text: string): ParsedResumeData['workExperience'] {
    const workExperience: ParsedResumeData['workExperience'] = [];

    // Regex patterns for work experience
    const patterns = [
      /([A-Za-z\s]+)\s*[-–]\s*([A-Za-z\s]+)\s*[\n|]\s*(.*?)(?:\n\n|$)/gi,
      /(?:experience|employment|professional history)[\s\S]*?(.*?)(?:education|skills|$)/i,
    ];

    // Simple extraction: look for common role titles
    const rolePatterns = [
      /(?:senior|junior|lead)?(?:\s+)?(developer|engineer|architect|manager|analyst|specialist)/gi,
      /(frontend|backend|full[- ]?stack|data scientist|qa|devops|product manager)/gi,
    ];

    rolePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const role = match[0];
        // Extract surrounding context for company name
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + 200);
        const context = text.substring(contextStart, contextEnd);

        // Try to extract company name from context
        const companyMatch = context.match(/(?:at|@|company:\s*)([A-Za-z0-9\s.]+)/i);
        const company = companyMatch ? companyMatch[1].trim() : 'Unknown Company';

        workExperience.push({
          role,
          company,
          duration: '(duration not extracted)',
        });
      }
    });

    return workExperience;
  }

  /**
   * Extract education from text
   */
  private extractEducation(text: string): ParsedResumeData['education'] {
    const education: ParsedResumeData['education'] = [];

    // Education patterns
    const degreePatterns = [
      /(?:B\.?A|M\.?A|B\.?S|M\.?S|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Com|M\.?Com|B\.?Sc|M\.?Sc|BCA|MCA|MBA|PhD|B\.?Des|M\.?Des)\s+(?:in\s+)?([A-Za-z\s&]+)/gi,
      /([A-Za-z\s]+)\s+(?:B\.?A|M\.?A|B\.?S|M\.?S|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?Com|M\.?Com|B\.?Sc|M\.?Sc|BCA|MCA|MBA|PhD|B\.?Des|M\.?Des)/gi,
    ];

    degreePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const degree = match[0];
        // Try to extract institution
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
        const context = text.substring(contextStart, contextEnd);

        const institutionMatch = context.match(/(?:from|university|college|institute|school:\s*)([A-Za-z0-9\s.]+)/i);
        const institution = institutionMatch ? institutionMatch[1].trim() : 'Unknown Institution';

        education.push({
          degree,
          institution,
        });
      }
    });

    return education;
  }

  /**
   * Extract email and phone from text
   */
  private extractContactInfo(text: string): { email?: string; phone?: string } {
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const phoneMatch = text.match(/(?:\+?91|0)?(?:\s|-)?(?:[0-9]{10}|\([0-9]{3}\)\s?[0-9]{3}-?[0-9]{4})/);

    return {
      email: emailMatch ? emailMatch[1] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
    };
  }

  /**
   * Extract location from text
   */
  private extractLocation(text: string): string | undefined {
    // Common Indian cities
    const cities = [
      'Delhi',
      'Mumbai',
      'Bangalore',
      'Hyderabad',
      'Chennai',
      'Pune',
      'Kolkata',
      'Ahmedabad',
      'Jaipur',
      'Lucknow',
      'Indore',
      'Thane',
      'Noida',
      'Gurgaon',
      'Chandigarh',
    ];

    for (const city of cities) {
      if (text.includes(city)) {
        return city;
      }
    }

    return undefined;
  }

  /**
   * Calculate parsing quality score
   */
  private calculateParsingQuality(
    parsed: Partial<ParsedResumeData>,
    rawText: string
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Check for extracted components
    if (parsed.skills && parsed.skills.length > 0) score += 20;
    if (parsed.technologies && parsed.technologies.length > 0) score += 20;
    if (parsed.workExperience && parsed.workExperience.length > 0) score += 20;
    if (parsed.education && parsed.education.length > 0) score += 20;
    if (parsed.email || parsed.phone) score += 10;
    if (rawText.length > 500) score += 10;

    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Parse resume from file
   */
  async parseResume(filePath: string): Promise<ParsedResumeData> {
    try {
      logger.info(`Parsing resume: ${filePath}`);

      const ext = path.extname(filePath).toLowerCase();
      let rawText = '';

      // Extract text based on file type
      if (ext === '.pdf') {
        rawText = await this.extractPdfText(filePath);
      } else if (ext === '.docx') {
        rawText = await this.extractDocxText(filePath);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      if (!rawText || rawText.trim().length === 0) {
        throw new Error('Could not extract text from resume');
      }

      // Extract components
      const { skills, technologies } = this.detectSkills(rawText);
      const workExperience = this.extractWorkExperience(rawText);
      const education = this.extractEducation(rawText);
      const { email, phone } = this.extractContactInfo(rawText);
      const location = this.extractLocation(rawText);

      const parsed: Partial<ParsedResumeData> = {
        skills,
        technologies,
        workExperience,
        education,
        email,
        phone,
        location,
      };

      const parsingQuality = this.calculateParsingQuality(parsed, rawText);

      const result: ParsedResumeData = {
        text: rawText,
        skills,
        technologies,
        workExperience,
        education,
        email,
        phone,
        location,
        parsingQuality,
        rawText,
      };

      logger.info(`Resume parsed successfully with ${skills.length} skills detected`, { filePath });

      return result;
    } catch (error) {
      logger.error(`Error parsing resume: ${error}`, { filePath });
      throw error;
    }
  }
}

export const resumeParserService = new ResumeParserService();

export async function initResumeParser(): Promise<void> {
  logger.info('Resume Parser Service initialized');
}
