import * as jobNormalization from './jobNormalizationService';
import * as dedupe from './deduplicationService';
import * as apiUsage from './apiUsageService';
import * as scraping from './scrapingService';
import * as matching from './matchingEngine';

export async function initPhase3Services(): Promise<void> {
  // initialize each sub-service; keep lightweight to ensure startup is fast
  try {
    await jobNormalization.initJobNormalization();
    await dedupe.initDeduplication();
    await apiUsage.initApiUsageService();
    await scraping.initScrapingService();
    await matching.initMatchingEngine();
  } catch (err) {
    // avoid crashing startup; log and rethrow if necessary
    // eslint-disable-next-line no-console
    throw err;
  }
}

export { jobNormalization, dedupe, apiUsage, scraping, matching };
