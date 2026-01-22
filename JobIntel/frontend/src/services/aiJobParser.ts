/**
 * AI Job Parser Service
 * Simulates AI parsing of raw job text to extract structured job details
 */

export interface ParsedJobData {
  title: string;
  company: string;
  description: string;
  location: string;
  isRemote: boolean;
  salary?: string;
  stipend?: string;
  techStack: string[];
  tags: string[];
  eligibility?: string;
  experience?: string;
  batch?: string[];
  applyLink?: string;
}

const TECH_KEYWORDS = [
  'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'C++', 'Go',
  'TypeScript', 'JavaScript', 'PHP', 'Ruby', 'Rust', 'Kotlin', 'Swift',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
  'MySQL', 'Redis', 'Elasticsearch', 'GraphQL', 'REST', 'Django', 'Flask',
  'Spring', 'Express', 'Next.js', 'Gatsby', 'WebSocket', 'MQTT', 'gRPC'
];

const JOB_TAGS = [
  'Internship', 'Full-time', 'Part-time', 'Contract',
  'Remote', 'On-site', 'Hybrid',
  'Entry-level', 'Mid-level', 'Senior',
  'Fresher', 'Graduate', 'Experienced'
];

export const parseJobText = (rawText: string): ParsedJobData => {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Please provide job text to parse');
  }

  const lines = rawText.split('\n').map(line => line.trim());
  const fullText = rawText.toLowerCase();

  // Extract Company
  const companyMatch = rawText.match(/(?:Company|🏢)\s*[:\-]?\s*([^\n]+)/i);
  let company = companyMatch ? companyMatch[1].trim() : '';
  // Fallback: sometimes the job title starts with "Company – Role" or "Company - Role"
  if (!company) {
    const firstLine = lines[0] || '';
    const dashMatch = firstLine.match(/^([A-Z][A-Za-z0-9&\-.\s]{2,80})\s*[-–—:\|]/);
    if (dashMatch) company = dashMatch[1].trim();
  }
  if (!company) company = 'Company Name';

  // Extract Job Title
  const titleMatch = rawText.match(/(?:Role|Position|Job Title|👨‍💻)\s*[:\-]?\s*([^\n]+)/i);
  let title = titleMatch ? titleMatch[1].trim() : 'Job Title';
  // Clean up title from emojis
  title = title.replace(/[🚀📍💰🎓🛠️👨‍💻🏢]/g, '').trim();

  // Extract Location
  const locationMatch = rawText.match(/(?:Location|📍|Based in)\s*[:\-]?\s*([^\n]+)/i);
  let location = locationMatch ? locationMatch[1].trim() : 'Bangalore, India';
  location = location.replace(/[📍]/g, '').trim();

  const isRemote = fullText.includes('remote') || fullText.includes('work from home') || fullText.includes('wfh');

  // Extract Salary/Stipend
  const salaryMatch = rawText.match(/(?:Salary|Stipend|CTC|Pay|💰)\s*[:\-]?\s*([^\n]+)/i);
  const salaryText = salaryMatch ? salaryMatch[1].trim().replace(/[💰]/g, '').trim() : '';
  
  let salary = '';
  let stipend = '';
  
  // Treat explicit 'stipend' or monthly terms as stipend, otherwise treat amounts (₹, LPA, CTC) as salary
  const lowerSalary = salaryText.toLowerCase();
  if (lowerSalary.includes('stipend') || /per\s*(month|mo|pm|monthly)/i.test(salaryText) ) {
    stipend = salaryText;
  } else if (salaryText) {
    salary = salaryText;
  }

  // Extract Tech Stack
  const techStack: string[] = [];
  TECH_KEYWORDS.forEach(tech => {
    if (fullText.includes(tech.toLowerCase())) {
      techStack.push(tech);
    }
  });

  // Extract Experience
  const expMatch = rawText.match(/(?:Experience|🎖️|Experience Level)\s*[:\-]?\s*([^\n]+)/i);
  const experience = expMatch ? expMatch[1].trim().replace(/[🎖️]/g, '').trim() : 'Not specified';

  // Extract Eligibility
  const eligMatch = rawText.match(/(?:Eligibility|Qualifications|Requirements|🎓)\s*[:\-]?\s*([^\n]+)/i);
  const eligibility = eligMatch ? eligMatch[1].trim().replace(/[🎓]/g, '').trim() : 'Graduates';

  // Extract Batch info: try explicit phrases then fallback to any 4-digit year matches
  const batch: string[] = [];
  const batchMatch = rawText.match(/(?:Eligible Batch|BATCH|Batch|Year)\s*[:\-]?\s*(\d{4})(?:\s*[&,\-]\s*(\d{4}))?/i);
  if (batchMatch) {
    batch.push(batchMatch[1]);
    if (batchMatch[2]) batch.push(batchMatch[2]);
  } else {
    const years = Array.from(rawText.matchAll(/\b(20\d{2})\b/g)).map(m => m[1]);
    years.forEach(y => { if (!batch.includes(y)) batch.push(y); });
  }

  // Generate tags
  const tags: string[] = [];
  
  if (experience.toLowerCase().includes('fresher') || experience.toLowerCase().includes('0-1')) {
    tags.push('Fresher');
  }
  if (experience.toLowerCase().includes('junior') || experience.toLowerCase().includes('1-3')) {
    tags.push('Entry-level');
  }
  if (experience.toLowerCase().includes('senior')) {
    tags.push('Senior');
  }
  
  tags.push('Internship');
  
  if (isRemote) {
    tags.push('Remote');
  } else {
    tags.push('On-site');
  }

  // Auto-tag company name (useful for filtering/search)
  if (company && company !== 'Company Name') {
    tags.push(company);
  }

  // Add batch years as tags (e.g., 2025, 2026)
  if (batch && batch.length > 0) {
    batch.forEach((b) => {
      if (b && !tags.includes(b)) tags.push(b);
    });
  }

  // Generate description from raw text WITHOUT apply links
  let descriptionText = rawText;
  // Remove all URLs from description
  descriptionText = descriptionText.replace(/(https?:\/\/[^\s)]+)/gi, '').trim();
  // Remove "Application Link:", "Apply Link:", etc.
  descriptionText = descriptionText.replace(/(?:Application\s+Link|Apply\s+Link|🔗)[:\-]?\s*/gi, '').trim();
  // Clean up extra whitespace and newlines
  descriptionText = descriptionText.replace(/\n\n+/g, '\n').trim();
  
  const description = descriptionText.substring(0, 500) + (descriptionText.length > 500 ? '...' : '');

  // Extract first likely application link (look for URLs containing apply/jobs/ats or any URL)
  const urlRegex = /(https?:\/\/[^\s)]+)/gi;
  let applyLink: string | undefined;
  const urls = Array.from(rawText.matchAll(urlRegex)).map(m => m[1]);
  if (urls.length > 0) {
    applyLink = urls.find(u => /apply|jobs|ats|careers|applynow/i.test(u)) || urls[0];
  }

  return {
    title,
    company,
    description,
    location,
    isRemote,
    salary: salary || undefined,
    stipend: stipend || undefined,
    techStack: [...new Set(techStack)],
    tags: [...new Set(tags)],
    eligibility: eligibility || undefined,
    experience: experience || undefined,
    batch: batch.length > 0 ? batch : undefined,
    applyLink: applyLink || undefined,
  };
};
