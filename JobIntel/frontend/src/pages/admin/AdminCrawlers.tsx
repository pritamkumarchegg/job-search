import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ScrapingLog {
  _id?: string;
  sessionId: string;
  status: 'in-progress' | 'completed' | 'failed' | 'partial';
  bucketsRequested: string[];
  bucketsCompleted: string[];
  bucketsFailed: string[];
  totalApiCalls: number;
  totalJobsFound: number;
  newJobsAdded: number;
  jobsUpdated: number;
  indianJobsFound: number;
  indianJobsAdded: number;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  bucketProgress?: Record<string, { status: string; found: number; added: number; progress: number }>;
}

const SCRAPE_BUCKETS = [
  'fresher',
  'batch',
  'software',
  'data',
  'cloud',
  'mobile',
  'qa',
  'non-tech',
  'experience',
  'employment',
  'work-mode',
];

// Company-wise buckets for targeted scraping
const COMPANY_BUCKETS = [
  'faang-meta', // Meta (Facebook)
  'faang-apple',
  'faang-amazon',
  'faang-netflix',
  'faang-google',
  'service-tcs', // TCS
  'service-infosys',
  'service-wipro',
  'service-hcl',
  'service-cognizant',
  'service-accenture',
  'startup-flipkart',
  'startup-amazon-india',
  'startup-zomato',
  'startup-swiggy',
  'startup-razorpay',
  'startup-ola',
  'it-consulting-deloitte',
  'it-consulting-pwc',
  'it-consulting-capgemini',
];

interface BucketProgress {
  bucket: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  found: number;
  added: number;
  progress: number;
  error?: string;
}

export default function AdminCrawlers() {
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([...SCRAPE_BUCKETS]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [mongoMessage, setMongoMessage] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [bucketProgress, setBucketProgress] = useState<BucketProgress[]>([]);
  const [realTimeStats, setRealTimeStats] = useState({
    totalJobsFound: 0,
    totalJobsAdded: 0,
    indianJobsFound: 0,
    indianJobsAdded: 0,
    completedBuckets: 0,
    failedBuckets: 0,
  });
  const [filterIndianOnly, setFilterIndianOnly] = useState(true);
  const token = useAuthStore((s) => s.token);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const api = (path: string, opts: RequestInit = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`/api/admin${path}`, { headers, ...opts });
  };

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await api('/scrape/logs');
      if (res.ok) {
        const data = await res.json();
        const newLogs = Array.isArray(data) ? data : (data.logs || []);
        setLogs(newLogs);

        // Update bucket progress if scraping in progress
        if (currentSessionId) {
          const currentLog = newLogs.find((l) => l.sessionId === currentSessionId);
          if (currentLog) {
            // Update bucket progress
            const progress = selectedBuckets.map(bucket => ({
              bucket,
              status: currentLog.bucketsCompleted?.includes(bucket) 
                ? 'completed' 
                : currentLog.bucketsFailed?.includes(bucket)
                ? 'failed'
                : currentLog.bucketsRequested?.includes(bucket)
                ? 'in-progress'
                : 'pending' as any,
              found: 0, // Would come from real-time API
              added: 0,
              progress: currentLog.bucketsCompleted?.includes(bucket) ? 100 : currentLog.bucketsRequested?.includes(bucket) ? 50 : 0,
            }));
            setBucketProgress(progress);

            // Update real-time stats
            setRealTimeStats({
              totalJobsFound: currentLog.totalJobsFound || 0,
              totalJobsAdded: currentLog.newJobsAdded || 0,
              indianJobsFound: currentLog.indianJobsFound || 0,
              indianJobsAdded: currentLog.indianJobsAdded || 0,
              completedBuckets: currentLog.bucketsCompleted?.length || 0,
              failedBuckets: currentLog.bucketsFailed?.length || 0,
            });

            if (currentLog.status === 'completed') {
              setSuccessMessage(`✅ Scraping completed! Found ${currentLog.totalJobsFound} ${filterIndianOnly ? '(Indian) ' : ''}jobs - ${currentLog.newJobsAdded} new added, ${currentLog.jobsUpdated} updated`);
              setMongoMessage(`✨ MongoDB updated: ${currentLog.newJobsAdded} new documents added to 'jobs' collection${filterIndianOnly ? ` (${currentLog.indianJobsAdded} from India)` : ''}`);
              setCurrentSessionId(null);
            } else if (currentLog.status === 'failed') {
              setSuccessMessage(`❌ Scraping failed for some buckets`);
              setCurrentSessionId(null);
            }
          }
        }
      } else {
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh logs every 2 seconds while scraping is in progress
  useEffect(() => {
    if (token) {
      loadLogs();
    }

    let interval: NodeJS.Timeout;
    if (currentSessionId) {
      interval = setInterval(() => {
        loadLogs();
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [token, currentSessionId]);

  async function startScraping() {
    if (selectedBuckets.length === 0) {
      alert('Please select at least one bucket to scrape');
      return;
    }

    setScraping(true);
    setSuccessMessage('');
    setMongoMessage('');
    setBucketProgress(selectedBuckets.map(bucket => ({
      bucket,
      status: 'pending',
      found: 0,
      added: 0,
      progress: 0,
    })));
    setRealTimeStats({
      totalJobsFound: 0,
      totalJobsAdded: 0,
      indianJobsFound: 0,
      indianJobsAdded: 0,
      completedBuckets: 0,
      failedBuckets: 0,
    });
    
    try {
      const res = await api('/scrape/run', {
        method: 'POST',
        body: JSON.stringify({
          buckets: selectedBuckets,
          triggeredBy: 'admin',
          filterIndianJobs: filterIndianOnly,
          country: 'India',
          location: 'India',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(data.sessionId);
        setSuccessMessage(`🔄 Scraping started for: ${selectedBuckets.join(', ')}`);
        setMongoMessage(`⏳ Scraping in progress... Connecting to OpenWeb Ninja API for ${filterIndianOnly ? 'Indian jobs' : 'global jobs'}`);
        // Reload logs after a short delay
        setTimeout(loadLogs, 1000);
      } else {
        const errorText = await res.text();
        alert('Failed to start scraping: ' + errorText);
        setSuccessMessage('');
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSuccessMessage('');
    } finally {
      setScraping(false);
    }
  }

  const toggleBucket = (bucket: string) => {
    setSelectedBuckets((prev) =>
      prev.includes(bucket) ? prev.filter((b) => b !== bucket) : [...prev, bucket]
    );
  };

  const toggleAllBuckets = () => {
    if (selectedBuckets.length === SCRAPE_BUCKETS.length) {
      setSelectedBuckets([]);
    } else {
      setSelectedBuckets([...SCRAPE_BUCKETS]);
    }
  };

  async function verifyDatabaseData() {
    setVerifying(true);
    setVerificationData(null);
    try {
      const res = await api('/verify-data');
      if (res.ok) {
        const data = await res.json();
        setVerificationData(data);
      } else {
        alert('Failed to verify database: ' + (await res.text()));
      }
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">
          {filterIndianOnly ? '🇮🇳 Indian Jobs' : '🌍 Global Jobs'} - Web Crawlers & Scraping
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time job scraping from OpenWeb Ninja API. {filterIndianOnly ? 'Filtering for India only' : 'Global job search across all countries'}. Monitor progress per bucket.
        </p>
      </div>

      {/* Real-Time Stats Dashboard */}
      {currentSessionId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <p className="text-xs text-blue-600 dark:text-blue-300 font-medium uppercase mb-1">Total Found</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{realTimeStats.totalJobsFound}</p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">from all APIs</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <p className="text-xs text-green-600 dark:text-green-300 font-medium uppercase mb-1">
              {filterIndianOnly ? 'Indian Jobs 🇮🇳' : 'Global Jobs 🌍'}
            </p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{realTimeStats.indianJobsFound}</p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">{filterIndianOnly ? 'filtered & verified' : 'from all countries'}</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <p className="text-xs text-purple-600 dark:text-purple-300 font-medium uppercase mb-1">Added to DB</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{realTimeStats.totalJobsAdded}</p>
            <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">new documents</p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <p className="text-xs text-orange-600 dark:text-orange-300 font-medium uppercase mb-1">Buckets</p>
            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {realTimeStats.completedBuckets}/{selectedBuckets.length}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">completed</p>
          </Card>
        </div>
      )}

      {/* Success Messages */}
      {successMessage && (
        <Card className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <p className="text-green-900 dark:text-green-100 font-semibold">{successMessage}</p>
        </Card>
      )}

      {mongoMessage && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <p className="text-blue-900 dark:text-blue-100 font-semibold">{mongoMessage}</p>
        </Card>
      )}

      {/* Bucket Progress Section */}
      {currentSessionId && bucketProgress.length > 0 && (
        <Card className="p-6 border-l-4 border-l-blue-500">
          <h3 className="text-lg font-semibold mb-4">📊 Real-Time Bucket Progress</h3>
          <div className="space-y-3">
            {bucketProgress.map((bp) => (
              <div key={bp.bucket} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{bp.bucket}</span>
                  <span className="text-xs px-2 py-1 rounded font-medium" style={{
                    backgroundColor: bp.status === 'completed' ? '#d4edda' : 
                                   bp.status === 'failed' ? '#f8d7da' :
                                   bp.status === 'in-progress' ? '#cce5ff' : '#e8e8e8',
                    color: bp.status === 'completed' ? '#155724' : 
                           bp.status === 'failed' ? '#721c24' :
                           bp.status === 'in-progress' ? '#004085' : '#666'
                  }}>
                    {bp.status === 'completed' && '✅ Completed'}
                    {bp.status === 'in-progress' && '⏳ In Progress'}
                    {bp.status === 'failed' && '❌ Failed'}
                    {bp.status === 'pending' && '⏸ Pending'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${bp.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scraping Control Section */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">⚙️ Trigger Scraping Job</h3>
        
        <div className="space-y-4">
          {/* Indian Jobs Filter */}
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <input
              type="checkbox"
              id="filterIndian"
              checked={filterIndianOnly}
              onChange={(e) => setFilterIndianOnly(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="filterIndian" className="text-sm font-medium cursor-pointer">
              {filterIndianOnly ? '🇮🇳 Filter for Indian Jobs Only' : '🌍 Search Global Jobs'} - {filterIndianOnly ? 'Recommended for India-based hiring' : 'Include USA, UK, Canada, etc.'}
            </label>
          </div>

          {/* Bucket Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Select Job Buckets to Scrape</label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllBuckets}
              >
                {selectedBuckets.length === SCRAPE_BUCKETS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {SCRAPE_BUCKETS.map((bucket) => (
                <div key={bucket} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`bucket-${bucket}`}
                    checked={selectedBuckets.includes(bucket)}
                    onChange={() => toggleBucket(bucket)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor={`bucket-${bucket}`} className="text-sm capitalize cursor-pointer">
                    {bucket}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Company-Wise Bucket Selection */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              🏢 Company-Wise Buckets (Optional)
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Select specific companies to scrape targeted jobs. This will add to your selected buckets above.
            </p>

            <div className="space-y-3">
              {/* FAANG Companies */}
              <div>
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">💰 FAANG Companies</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {COMPANY_BUCKETS.filter(b => b.startsWith('faang')).map((bucket) => (
                    <div key={bucket} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`bucket-${bucket}`}
                        checked={selectedBuckets.includes(bucket)}
                        onChange={() => toggleBucket(bucket)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor={`bucket-${bucket}`} className="text-xs capitalize cursor-pointer">
                        {bucket.replace('faang-', '').toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service-Based Companies */}
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">🏭 Service-Based Companies</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {COMPANY_BUCKETS.filter(b => b.startsWith('service')).map((bucket) => (
                    <div key={bucket} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`bucket-${bucket}`}
                        checked={selectedBuckets.includes(bucket)}
                        onChange={() => toggleBucket(bucket)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor={`bucket-${bucket}`} className="text-xs capitalize cursor-pointer">
                        {bucket.replace('service-', '').toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indian Startups */}
              <div>
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">🚀 Indian Startups</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {COMPANY_BUCKETS.filter(b => b.startsWith('startup')).map((bucket) => (
                    <div key={bucket} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`bucket-${bucket}`}
                        checked={selectedBuckets.includes(bucket)}
                        onChange={() => toggleBucket(bucket)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor={`bucket-${bucket}`} className="text-xs capitalize cursor-pointer">
                        {bucket.replace('startup-', '').toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* IT Consulting */}
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">💼 IT Consulting</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {COMPANY_BUCKETS.filter(b => b.startsWith('it-consulting')).map((bucket) => (
                    <div key={bucket} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`bucket-${bucket}`}
                        checked={selectedBuckets.includes(bucket)}
                        onChange={() => toggleBucket(bucket)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor={`bucket-${bucket}`} className="text-xs capitalize cursor-pointer">
                        {bucket.replace('it-consulting-', '').toUpperCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-4 text-sm text-blue-900 dark:text-blue-100 space-y-2">
            <p>
              <strong>🔍 Filter Mode:</strong> {filterIndianOnly ? '🇮🇳 Indian Jobs Only' : '🌍 Global Jobs'} {filterIndianOnly ? '✅' : '✅'}
            </p>
            <p>
              <strong>📍 Locations:</strong> {filterIndianOnly ? '🇮🇳 India only (Mumbai, Delhi, Bangalore, Hyderabad, Pune, etc.)' : '🌍 Worldwide (USA, UK, Canada, Singapore, India, etc.)'}
            </p>
            <p>
              <strong>💼 Job Coverage:</strong> {filterIndianOnly ? 'Focused on India-based positions' : 'Broad international opportunities'} 
            </p>
            <p>
              <strong>📄 Multi-Page Scraping:</strong> ✅ 10 pages per bucket (500+ jobs per category)
            </p>
            <p>
              <strong>🏙️ Indian Cities Covered:</strong> Bangalore, Delhi, Mumbai, Hyderabad, Pune, Gurgaon, Kolkata, Chennai, Jaipur, Indore, Chandigarh, Kochi, Ahmedabad, Surat, Nagpur, and 15+ more
            </p>
            <p>
              <strong>🏢 Companies Detected:</strong> TCS, Infosys, Wipro, HCL, Cognizant, Flipkart, Amazon India, Zomato, PayPal, Microsoft India
            </p>
            <p>
              <strong>🔗 Apply Links:</strong> ✅ Real apply URLs extracted from JSearch API (Indeed, LinkedIn, company career pages)
            </p>
            <p>
              <strong>⏱️ Rate Limiting:</strong> 1-2 seconds between pages to respect API limits
            </p>
            <p>
              <strong>🪣 Selected Buckets:</strong> {selectedBuckets.length} / {SCRAPE_BUCKETS.length}
            </p>
            <p className="pt-2 border-t border-blue-200 dark:border-blue-700 mt-2">
              <strong>⏳ Expected Time:</strong> ~30-60 seconds per bucket (depending on API response time)
            </p>
          </div>

          {/* Start Button */}
          <Button
            onClick={startScraping}
            disabled={scraping || selectedBuckets.length === 0 || currentSessionId !== null}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {scraping ? '🔄 Starting Scraping...' : currentSessionId ? '⏳ Scraping In Progress...' : '▶️ Start Scraping'}
          </Button>
        </div>
      </Card>

      {/* Scraping Logs Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">📊 Scraping History (Real-time)</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={verifyDatabaseData} 
              disabled={verifying}
              className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100 hover:bg-purple-100 dark:hover:bg-purple-900"
            >
              {verifying ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>Verifying...
                </>
              ) : (
                '🔍 Verify DB'
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>

        {/* Verification Results Modal */}
        {verificationData && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">📋 Database Verification Report</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setVerificationData(null)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>

              {/* Proof of Persistence */}
              <div className="p-3 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800">
                <p className="text-green-900 dark:text-green-100 font-semibold">
                  {verificationData.proofOfPersistence?.message}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  {verificationData.proofOfPersistence?.details}
                </p>
              </div>

              {/* Statistics Grid */}
              {verificationData.scrapingSessions?.latest && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {verificationData.scrapingSessions.latest.newJobsAdded}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">New Jobs</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900 rounded text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {verificationData.scrapingSessions.latest.jobsUpdated}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Updated</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900 rounded text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {verificationData.jobs.total}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Jobs</p>
                  </div>
                  <div className="p-2 bg-white dark:bg-gray-900 rounded text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {verificationData.scrapingSessions.latest.durationMs}ms
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                  </div>
                </div>
              )}

              {/* Database Type Info */}
              <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <p>
                  <strong>Environment:</strong> {verificationData.verification?.environment}
                  <br />
                  <strong>Note:</strong> {verificationData.verification?.databaseNote}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Loading scraping logs...</p>
        ) : logs.length === 0 ? (
          <div className="space-y-4">
            <p className="text-center py-8 text-muted-foreground">No scraping logs yet. Start a scraping job to see logs here.</p>
            
            {/* Demo Data Example */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-semibold text-muted-foreground mb-3">📌 Example of what you'll see:</p>
              <div className="border rounded p-4 bg-muted/50 hover:bg-muted transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Session ID: demo-session-abc-123</p>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date().toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    COMPLETED
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                  <div>
                    <p className="text-muted-foreground">API Calls</p>
                    <p className="font-semibold text-lg">11</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Jobs Found</p>
                    <p className="font-semibold text-lg">342</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">New Added</p>
                    <p className="font-semibold text-lg text-green-600 dark:text-green-400">287</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-semibold text-lg text-blue-600 dark:text-blue-400">55</p>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">Completed Buckets:</p>
                  <div className="flex flex-wrap gap-1">
                    {['fresher', 'batch', 'software', 'data', 'cloud'].map((bucket) => (
                      <span
                        key={bucket}
                        className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-0.5 rounded capitalize"
                      >
                        ✓ {bucket}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  ✨ MongoDB: 287 new documents added to 'jobs' collection (indexes: externalJobId, title, company)
                </p>
                <p className="text-xs text-muted-foreground">
                  Duration: 45.32s
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={log.sessionId}
                className={`border rounded p-4 hover:bg-muted transition ${
                  log.status === 'in-progress' ? 'animate-pulse bg-blue-50 dark:bg-blue-950 border-blue-300' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Session ID: {log.sessionId}</p>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(log.startedAt).toLocaleString()}
                    </p>
                    {log.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(log.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                      log.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : log.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        : log.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}
                  >
                    {log.status === 'in-progress' && <span className="animate-spin">⟳</span>}
                    {log.status?.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground">API Calls</p>
                    <p className="font-semibold text-lg">{log.totalApiCalls || 0}</p>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground">Total Jobs</p>
                    <p className="font-semibold text-lg">{log.totalJobsFound || 0}</p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                    <p className="text-muted-foreground">🇮🇳 Indian</p>
                    <p className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">{log.indianJobsFound || 0}</p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
                    <p className="text-muted-foreground">✅ New Added</p>
                    <p className="font-semibold text-lg text-green-600 dark:text-green-400">{log.newJobsAdded || 0}</p>
                  </div>
                </div>

                {/* Indian Jobs Added Detail */}
                <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    🇮🇳 Indian Jobs Added: {log.indianJobsAdded || 0} / {log.newJobsAdded || 0}
                  </p>
                </div>

                {log.bucketsCompleted && log.bucketsCompleted.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">✅ Completed Buckets ({log.bucketsCompleted.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {log.bucketsCompleted.map((bucket) => (
                        <span
                          key={bucket}
                          className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-0.5 rounded capitalize font-medium"
                        >
                          ✓ {bucket}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {log.bucketsFailed && log.bucketsFailed.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">❌ Failed Buckets ({log.bucketsFailed.length}):</p>
                    <div className="flex flex-wrap gap-1">
                      {log.bucketsFailed.map((bucket) => (
                        <span
                          key={bucket}
                          className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 px-2 py-0.5 rounded capitalize font-medium"
                        >
                          ✗ {bucket}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {log.durationMs && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <p>⏱️ Duration: {(log.durationMs / 1000).toFixed(2)}s</p>
                    <p>💾 MongoDB Status: {log.newJobsAdded} new documents added to 'jobs' collection</p>
                  </div>
                )}

                {log.status === 'in-progress' && (
                  <div className="mt-2 pt-2 border-t text-xs text-blue-600 dark:text-blue-400">
                    <p>⏳ Scraping in progress... API calls: {log.totalApiCalls} | Jobs found: {log.totalJobsFound}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
