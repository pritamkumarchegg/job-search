/**
 * JSearch API Service
 * Integrates with OpenWeb Ninja JSearch API for real job data
 * Replaces simulated Math.random() with actual API calls
 * 
 * Enhanced with:
 * - Multi-page scraping (up to 100+ pages)
 * - Indian job filtering with location detection
 * - Proper pagination support
 * - Rate limiting and exponential backoff
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger';

export interface JobSearchParams {
  query: string;
  location?: string;
  country?: string;
  numPages?: number;
  pageSize?: number;
  page?: number;
  filterIndianJobs?: boolean;  // Whether to filter for Indian jobs only
}

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  salaryPeriod?: string;
  jobType?: string;
  postedDate?: string;
  externalLink?: string;
  jobId?: string;
  source: string;
  rawData?: any;
  isRemote?: boolean;
}

// Indian locations and keywords for filtering
const INDIAN_LOCATIONS = [
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'gurgaon', 'gurugram',
  'pune', 'hyderabad', 'kolkata', 'chennai', 'jaipur', 'lucknow', 'ahmedabad',
  'chandigarh', 'indore', 'bhopal', 'visakhapatnam', 'kochi', 'vadodara',
  'surat', 'nagpur', 'coimbatore', 'ghaziabad', 'ludhiana', 'noida', 'faridabad',
  'trivandrum', 'thiruvananthapuram', 'kottayam', 'thrissur', 'ernakulam',
  'kozhikode', 'kannur', 'palakkad', 'malappuram', 'pathanamthitta',
];

const INDIAN_STATE_CODES = ['in', 'in-ka', 'in-tn', 'in-mh', 'in-dl', 'in-hr', 'in-up', 'in-ap', 'in-jk', 'in-hp', 'in-pb', 'in-gj'];

const EXCLUDE_US_STATES = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'hampshire', 'jersey', 'mexico', 'york', 'carolina', 'dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode', 'south', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'wisconsin', 'wyoming'];

function isIndianLocation(location: string, city?: string, state?: string, country?: string): boolean {
  if (!location) return false;
  
  const locLower = location.toLowerCase();
  const fullLocation = [city, state, country].filter(Boolean).join(' ').toLowerCase();
  
  // STRICT: If country is explicitly mentioned and it's not India, reject immediately
  if (country) {
    const countryLower = country.toLowerCase().trim();
    // US indicators
    if (countryLower.includes('us') || countryLower.includes('united states') || countryLower.includes('usa') || countryLower === 'us' || countryLower === 'u.s.') {
      return false;
    }
    // India indicators
    if (countryLower.includes('in') && countryLower !== 'in') {
      // "in" alone is ambiguous, but "india" or "in," is India
      if (countryLower === 'india' || countryLower.startsWith('in-') || countryLower === 'in,') {
        return true;
      }
    }
  }
  
  // Check if it contains US state abbreviations or state names (but not just substring match to avoid "Indiana" matching "India")
  for (const usState of EXCLUDE_US_STATES) {
    if (locLower.includes(`, ${usState}`) || locLower.includes(`, ${usState.toUpperCase()}`) || locLower.endsWith(`, ${usState}`)) {
      // Check for ", STATE, US" or ", STATE," pattern
      if (locLower.includes('us') || locLower.includes('united states')) {
        return false;
      }
    }
  }
  
  // Check Indian state codes  
  for (const stateCode of INDIAN_STATE_CODES) {
    if (locLower.includes(stateCode) || fullLocation.includes(stateCode)) {
      return true;
    }
  }
  
  // Check Indian city names (exact word match, not substring)
  for (const indianCity of INDIAN_LOCATIONS) {
    // Check for word boundaries: comma, space, or start/end of string
    const pattern = new RegExp(`(^|\\s|,)${indianCity}(\\s|,|$)`, 'i');
    if (pattern.test(locLower) || pattern.test(fullLocation)) {
      return true;
    }
  }
  
  // Check for "India" explicitly
  if (locLower.includes(', india') || locLower.endsWith(', india') || locLower === 'india' || fullLocation === 'india') {
    return true;
  }
  
  return false;
}

class JSearchService {
  private apiKey: string;
  private apiHost: string;
  private baseUrl: string;
  private requestDelay: number;
  private maxRetries: number;
  private debugLogCount = 0; // Track first API response logged

  constructor() {
    this.apiKey = process.env.OPENWEBNINJA_API_KEY || process.env.API_KEY || '';
    this.apiHost = process.env.API_HOST || 'api.openwebninja.com';
    this.baseUrl = `https://${this.apiHost}`;
    this.requestDelay = parseInt(process.env.API_REQUEST_DELAY_MS || '1000');
    this.maxRetries = parseInt(process.env.API_RETRY_ATTEMPTS || '3');

    if (!this.apiKey) {
      logger.warn('⚠️  JSearch API Key not configured. Scraping will use fallback data.');
    }
  }

  /**
   * Search jobs using JSearch API with multi-page support
   * Implements rate limiting and retry logic
   * Supports Indian job filtering
   */
  async searchJobs(params: JobSearchParams): Promise<ParsedJob[]> {
    try {
      logger.info(`🔍 Searching jobs: ${params.query} in ${params.location || 'All locations'}`);
      logger.info(`🔑 API Key Status: ${this.apiKey ? '✅ LOADED' : '❌ NOT LOADED'}`);
      if (this.apiKey) {
        logger.info(`🔐 API Key (first 20 chars): ${this.apiKey.substring(0, 20)}...`);
        logger.info(`🌐 API Host: ${this.apiHost}`);
      }

      const jobs: ParsedJob[] = [];

      // If no API key, return empty array (NO FALLBACK)
      if (!this.apiKey) {
        logger.error('❌ CRITICAL: No API key found in environment variables!');
        logger.error('   Checked: OPENWEBNINJA_API_KEY, API_KEY');
        logger.error('❌ Cannot proceed without API key - NO FALLBACK DATA');
        return [];
      }

      // Multi-page scraping support: Search up to 100 pages automatically
      const numPages = params.numPages || 100;  // Default to 100 pages for comprehensive search
      const pageSize = params.pageSize || 50;
      
      logger.info(`📄 Fetching up to ${numPages} pages with ${pageSize} jobs per page`);
      const shouldFilterIndian = params.filterIndianJobs !== false;  // Default to true
      if (shouldFilterIndian) {
        logger.info(`🇮🇳 Indian Job Filter Enabled: YES - Will only keep jobs from India`);
      } else {
        logger.info(`🌍 Country Filter: NO - Accepting jobs from all countries (USA, UK, Canada, etc.)`);
      }
      logger.info(`🔄 Auto-pagination enabled - Will continue until 100 pages or no results found`);

      for (let page = 1; page <= numPages; page++) {
        try {
          logger.debug(`📖 Fetching page ${page}/${numPages}...`);
          logger.debug(`   Query: "${params.query}"`);
          logger.debug(`   Location: "${params.location || 'All'}"`);

          // Make API request for this page with retry logic
          // NOTE: OpenWeb Ninja JSearch API may ignore location/country filters
          // So we search globally and filter in code
          const requestParams = {
            query: params.query,
            // Don't send location/country - let API return all results, we'll filter
            page: page,
            num_pages: 1,
            page_size: pageSize,
          };
          
          logger.info(`🔹 REQUEST PARAMS being sent to API: ${JSON.stringify(requestParams)}`);
          logger.info(`📌 STRATEGY: Getting all results, filtering by location in code`);
          
          const response = await this.makeRequestWithRetry('search', requestParams);

          if (response && response.data) {
            const apiJobs = Array.isArray(response.data) ? response.data : response.data.jobs || [];
            logger.debug(`   Response received: ${apiJobs.length} jobs on page ${page}`);

            if (apiJobs.length === 0) {
              logger.info(`✅ No more jobs found on page ${page}, stopping pagination`);
              logger.info(`📊 Total pages searched: ${page - 1}`);
              break;
            }

            let acceptedJobsCount = 0;
            for (const job of apiJobs) {
              const parsed = this.parseJobData(job);
              if (parsed) {
                // DEBUG: Log every job location
                logger.debug(`   Job: "${parsed.title}" | Location: "${parsed.location}" | City: "${parsed.city}" | State: "${parsed.state}" | Country: "${parsed.country}"`);
                
                // Apply location filter if enabled
                const shouldFilterIndian = params.filterIndianJobs !== false;
                if (shouldFilterIndian) {
                  // Filter to only Indian jobs
                  if (isIndianLocation(parsed.location, parsed.city, parsed.state, parsed.country)) {
                    jobs.push(parsed);
                    acceptedJobsCount++;
                    logger.debug(`   ✅ ACCEPTED Indian job: ${parsed.title} at ${parsed.company} (${parsed.location})`);
                  } else {
                    logger.debug(`   ❌ REJECTED non-Indian: ${parsed.title} (${parsed.location})`);
                  }
                } else {
                  // Accept all jobs from any country
                  jobs.push(parsed);
                  acceptedJobsCount++;
                  logger.debug(`   ✅ ACCEPTED ${parsed.country || 'Unknown'} job: ${parsed.title} at ${parsed.company} (${parsed.location})`);
                }
              }
            }

            const filterStatus = params.filterIndianJobs !== false ? 'Indian' : 'from all countries';
            logger.info(`✅ Page ${page}: Found ${apiJobs.length} jobs, kept ${acceptedJobsCount} ${filterStatus} (Total: ${jobs.length})`);

            // Rate limiting between pages
            await this.delay(this.requestDelay * 2);
          } else {
            logger.warn(`⚠️  Empty response for page ${page}`);
            break;
          }
        } catch (pageError: any) {
          logger.warn(`⚠️  Error fetching page ${page}: ${pageError?.message || pageError}`);
          // Continue to next page instead of stopping
          logger.info(`🔄 Continuing to next page...`);
          await this.delay(this.requestDelay * 3); // Longer delay after error
          continue;
        }
      }

      // Return jobs from API (NO FALLBACK)
      logger.info(`✅ Scraping completed! Total Indian jobs found: ${jobs.length}`);
      logger.info(`✅ Source: Real JSearch API data (100% REAL - NO FALLBACK)`);
      
      if (jobs.length === 0) {
        const filterType = params.filterIndianJobs !== false ? 'Indian' : 'global';
        logger.warn(`⚠️  No ${filterType} jobs found after searching up to 100 pages`);
        logger.warn('💡 This may indicate:');
        if (params.filterIndianJobs !== false) {
          logger.warn('   1. No Indian jobs available for this search term');
          logger.warn('   2. Try different keywords (e.g., "software engineer India")');
        } else {
          logger.warn('   1. No jobs available for this search term');
          logger.warn('   2. Try different keywords');
        }
        logger.warn('   3. Check API rate limits or connectivity');
        logger.error('❌ Zero results - returning empty array (NO FALLBACK DATA)');
      }
      
      return jobs;
    } catch (error: any) {
      logger.error(`❌ Error searching jobs: ${error?.message || error}`);
      if (error?.stack) logger.error(`Error stack: ${error.stack}`);
      logger.error('❌ API Error - returning empty array (NO FALLBACK DATA)');
      return [];
    }
  }

  /**
   * Get detailed information for a specific job
   */
  async getJobDetails(jobId: string): Promise<ParsedJob | null> {
    try {
      if (!this.apiKey) {
        return null;
      }

      const response = await this.makeRequestWithRetry('job_details', {
        job_id: jobId,
        country: 'US',
      });

      if (response && response.data) {
        const jobData = Array.isArray(response.data) ? response.data[0] : response.data;
        return this.parseJobData(jobData);
      }

      return null;
    } catch (error) {
      logger.error(`❌ Error getting job details: ${error}`);
      return null;
    }
  }

  /**
   * Get salary estimates for a job title
   */
  async getSalaryEstimate(jobTitle: string, location: string): Promise<any> {
    try {
      if (!this.apiKey) {
        return this.generateFallbackSalary(jobTitle);
      }

      const response = await this.makeRequestWithRetry('salary_estimate', {
        job_title: jobTitle,
        location: location,
        location_type: 'ANY',
        years_of_experience: 'ALL',
      });

      return response?.data || this.generateFallbackSalary(jobTitle);
    } catch (error) {
      logger.error(`❌ Error getting salary estimate: ${error}`);
      return this.generateFallbackSalary(jobTitle);
    }
  }

  /**
   * Make HTTP request to JSearch API with retry logic
   */
  private async makeRequestWithRetry(endpoint: string, params: any, retryCount = 0): Promise<any> {
    try {
      // Rate limiting
      await this.delay(this.requestDelay);

      const url = new URL(`${this.baseUrl}/jsearch/${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      logger.info(`📡 MAKING API REQUEST:`);
      logger.info(`   Endpoint: ${endpoint}`);
      logger.info(`   URL: ${url.toString().substring(0, 150)}...`);
      logger.info(`   API Key: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 10)}`);
      logger.info(`   Params: ${JSON.stringify(params)}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
        },
        timeout: 30000,
      } as any);

      logger.info(`   Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`   ❌ HTTP Error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`   ✅ API Response received: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // DEBUG: Log the jobs array from API
      const apiJobs = (data as any).data || [];
      logger.info(`🔍 API RESPONSE: Status="${(data as any).status}" | Total Jobs in Array: ${apiJobs.length}`);
      if (apiJobs.length > 0) {
        logger.info(`📊 First job from API: ${JSON.stringify(apiJobs[0]).substring(0, 300)}`);
      } else {
        logger.warn(`⚠️  API returned 0 jobs! Full response: ${JSON.stringify(data)}`);
      }

      if ((data as any).error) {
        logger.error(`   ❌ API Error: ${(data as any).error}`);
        throw new Error((data as any).error);
      }

      logger.info(`✅ API Call successful!`);
      return data;
    } catch (error: any) {
      if (retryCount < this.maxRetries) {
        logger.warn(`⚠️  API Error (attempt ${retryCount + 1}/${this.maxRetries}): ${error?.message}`);
        logger.warn(`   Retrying after ${2000 * (retryCount + 1)}ms with exponential backoff...`);
        await this.delay(2000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequestWithRetry(endpoint, params, retryCount + 1);
      }
      logger.error(`❌ API Request failed after ${this.maxRetries} retries: ${error?.message}`);
      throw error;
    }
  }

  /**
   * Parse raw job data from API into standardized format
   * Using OpenWeb Ninja JSearch API field names (based on LinkedIn scraper reference)
   * Includes Indian job detection and location validation
   */
  private parseJobData(jobData: any): ParsedJob | null {
    try {
      if (!jobData) return null;

      // DEBUG: Log raw API response structure (first job only)
      if (this.debugLogCount === 0) {
        logger.info(`🔍 RAW API Job Structure (First): ${JSON.stringify(jobData).substring(0, 600)}`);
        logger.info(`🔑 All available fields in API response: ${Object.keys(jobData).join(', ')}`);
        this.debugLogCount++;
      }

      // Extract location fields separately for better control
      let city = jobData.job_city || jobData.city || '';
      let state = jobData.job_state || jobData.state || '';
      let country = jobData.job_country || jobData.country || '';
      
      // Log what fields we found
      logger.info(`📌 API Fields - job_city: "${jobData.job_city}" | job_state: "${jobData.job_state}" | job_country: "${jobData.job_country}" | job_location: "${jobData.job_location}"`);
      
      // If we have a raw location string, parse it to extract city, state, country
      let rawLocation = jobData.job_location || '';
      if (rawLocation && !city && !state) {
        // Try to parse raw location like "Indiana, US" or "San Francisco, CA, US"
        const parts = rawLocation.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          // Assume last part is country
          country = country || parts[parts.length - 1];
          // Second to last is state
          state = state || parts[parts.length - 2];
          // Everything else is city
          city = city || parts.slice(0, -2).join(', ');
        } else if (parts.length === 1) {
          // Single part could be city or state
          city = city || parts[0];
        }
      }
      
      // Build the display location string with city and state
      const locationParts = [];
      if (city) locationParts.push(city);
      if (state) locationParts.push(state);
      if (country) locationParts.push(country);
      const location = locationParts.length > 0 ? locationParts.join(', ') : 'Remote';
      
      // DEBUG: Log extracted location for each job
      logger.info(`   📍 Extracted: city="${city}" | state="${state}" | country="${country}" | FINAL="${location}"`);

      // Extract company name - be more aggressive in finding it
      let companyName = '';
      if (jobData.employer_name) {
        companyName = jobData.employer_name;
      } else if (jobData.company) {
        companyName = jobData.company;
      } else if (jobData.employer) {
        companyName = jobData.employer;
      } else if (jobData.job_publisher) {
        companyName = jobData.job_publisher;
      } else if (jobData.employer_name_simple) {
        companyName = jobData.employer_name_simple;
      } else if (jobData.publisher_name) {
        companyName = jobData.publisher_name;
      } else if (jobData.job_offer_expiration_date) {
        // Sometimes company is in different field
        companyName = '';
      }
      
      // If we still don't have a company name, try to extract from description or hiring_company
      if (!companyName) {
        // Try alternative fields that might contain company
        companyName = jobData.hiring_company || jobData.job_company || jobData.business_name || '';
      }
      
      // Clean up company name - remove "Company" if that's all we have
      if (!companyName || companyName === 'Company' || companyName.toLowerCase() === 'unknown') {
        // Try to extract from description as last resort
        if (jobData.job_description) {
          const descMatch = jobData.job_description.match(/(?:At|About|Join|For) ([A-Z][A-Za-z\s&,\.]+?)(?:\,|\.|\s(?:is|we))/);
          if (descMatch && descMatch[1]) {
            companyName = descMatch[1].trim();
          }
        }
      }
      
      // Final fallback
      if (!companyName || companyName === 'Company' || companyName.toLowerCase() === 'unknown') {
        companyName = 'Unknown Company';
      }
      // Trim whitespace and remove quotes
      companyName = companyName.trim().replace(/^["']|["']$/g, '');

      // Handle various API response formats - prioritize real JSearch API fields
      // IMPORTANT: Use the actual apply link from the API
      const applyLink = jobData.job_apply_link || jobData.apply_link || jobData.job_url || jobData.google_link || jobData.link || '';
      
      const parsed: ParsedJob = {
        title: jobData.job_title || jobData.title || 'Untitled',
        company: companyName || 'Unknown Company',
        location,
        city,
        state,
        country,
        description: jobData.job_description || jobData.description || '',
        minSalary: jobData.job_min_salary || jobData.min_salary || jobData.minSalary,
        maxSalary: jobData.job_max_salary || jobData.max_salary || jobData.maxSalary,
        salaryPeriod: jobData.job_salary_period || jobData.salary_period || 'YEARLY',
        jobType: jobData.job_employment_type || jobData.jobType || 'Full-time',
        postedDate: jobData.job_posted_at_datetime_utc || jobData.job_posted_at_timestamp || jobData.posted_date,
        externalLink: applyLink,
        jobId: jobData.job_id || jobData.id,
        source: applyLink && !applyLink.includes('example.com') ? 'JSearch API' : 'Fallback Data',
        isRemote: jobData.job_is_remote || jobData.is_remote || location.toLowerCase().includes('remote'),
        rawData: jobData,
      };

      // Log parsed job for debugging
      if (parsed.source === 'JSearch API') {
        logger.debug(`✅ Parsed real API job: "${parsed.title}" from ${parsed.company} (${parsed.location})`);
      } else {
        logger.debug(`⚠️  Parsed fallback job: "${parsed.title}" (likely fake apply link: ${parsed.externalLink})`);
      }

      return parsed;
    } catch (error) {
      logger.warn(`⚠️  Error parsing job data: ${error}`);
      return null;
    }
  }

  /**
   * Filter jobs to only Indian locations
   * Used during scraping to collect India-specific jobs
   */
  filterIndianJobs(jobs: ParsedJob[]): ParsedJob[] {
    const indianJobs = jobs.filter(job => 
      isIndianLocation(job.location, job.city, job.state, job.country)
    );

    logger.info(`🇮🇳 Filtered: ${indianJobs.length}/${jobs.length} jobs are in India`);
    return indianJobs;
  }

  /**
   * Get statistics about job locations
   */
  getLocationStats(jobs: ParsedJob[]): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const job of jobs) {
      const country = job.country || 'Unknown';
      stats[country] = (stats[country] || 0) + 1;
    }

    return stats;
  }

  /**
   * Generate fallback job data when API is unavailable
   * Uses realistic job titles and companies
   */
  private generateFallbackJobs(params: JobSearchParams): ParsedJob[] {
    const companies = [
      'Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Netflix',
      'Uber', 'Airbnb', 'Tesla', 'SpaceX', 'Meta', 'LinkedIn',
      'Adobe', 'Salesforce', 'Cisco', 'Intel', 'Oracle', 'IBM',
      'GitHub', 'Stripe', 'Figma', 'Slack', 'Zoom', 'Notion',
    ];

    const locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Remote'];

    const jobTypes = ['Full-time', 'Contract', 'Part-time'];

    const jobs: ParsedJob[] = [];
    const count = Math.floor(Math.random() * 30) + 20; // 20-50 jobs

    for (let i = 0; i < count; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      jobs.push({
        title: `${params.query} - Level ${Math.floor(Math.random() * 3) + 1}`,
        company,
        location,
        description: `${params.query} position at ${company}. We are looking for experienced professionals...`,
        minSalary: 80000 + Math.floor(Math.random() * 100000),
        maxSalary: 150000 + Math.floor(Math.random() * 100000),
        salaryPeriod: 'YEARLY',
        jobType: jobTypes[Math.floor(Math.random() * jobTypes.length)],
        postedDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        externalLink: `https://example.com/jobs/${i}`,
        jobId: `job_${Date.now()}_${i}`,
        source: 'Fallback Data',
      });
    }

    return jobs;
  }

  /**
   * Generate fallback salary data
   */
  private generateFallbackSalary(jobTitle: string): any {
    const baseRanges: any = {
      'developer': { min: 80000, max: 180000 },
      'engineer': { min: 90000, max: 200000 },
      'manager': { min: 100000, max: 250000 },
      'analyst': { min: 70000, max: 150000 },
      'designer': { min: 75000, max: 160000 },
      'default': { min: 60000, max: 120000 },
    };

    const keyword = jobTitle.toLowerCase();
    let range = baseRanges.default;

    for (const [key, value] of Object.entries(baseRanges)) {
      if (keyword.includes(key)) {
        range = value as any;
        break;
      }
    }

    return {
      job_title: jobTitle,
      min_salary: range.min,
      max_salary: range.max,
      salary_period: 'YEARLY',
      currency: 'USD',
    };
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const jsearchService = new JSearchService();
