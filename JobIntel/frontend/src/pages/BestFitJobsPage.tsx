import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Building2, Zap, TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';


interface BestFitJob {
  jobId: string;
  title: string;
  company?: string;
  location?: string;
  workMode?: string;
  matchScore: number;
  skills?: string[];
  description?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalMatches: number;
  matchesPerPage: number;
  minScore: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function BestFitJobsPage() {
  const [jobs, setJobs] = useState<BestFitJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [triggering, setTriggering] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id) {
      fetchBestFitJobs(currentPage);
    }
  }, [currentPage, user?.id]);

  const triggerMatching = async () => {
    try {
      setTriggering(true);
      const token = localStorage.getItem('token');
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      const res = await fetch(
        `/api/ai/trigger-matching/${user.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Success',
          description: `Generated ${data.data?.matchesCreated || 'new'} job matches for you!`,
        });
        // Refresh the jobs list
        setCurrentPage(1);
        fetchBestFitJobs(1);
      } else if (res.status === 401) {
        setError('Unauthorized. Please log in again.');
      } else {
        setError('Failed to trigger matching');
      }
    } catch (err) {
      console.error('Failed to trigger matching:', err);
      setError('Failed to trigger matching');
    } finally {
      setTriggering(false);
    }
  };

  const fetchBestFitJobs = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      const res = await fetch(
        `/api/ai/best-fit-jobs/${user.id}?page=${page}&limit=50`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        const data = await res.json();
        const jobsData = data.data || [];
        console.log(`✅ Best fit jobs loaded: ${jobsData.length} jobs`);
        setJobs(jobsData);
        setPagination(data.pagination);
      } else if (res.status === 401) {
        setError('Unauthorized. Please log in again.');
        toast({
          title: 'Session Expired',
          description: 'Please log in again',
          variant: 'destructive',
        });
      } else {
        setError('Failed to load best fit jobs');
        toast({
          title: 'Error',
          description: 'Failed to load best fit jobs',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to fetch best fit jobs:', err);
      setError('Failed to load best fit jobs');
      toast({
        title: 'Error',
        description: 'Failed to load best fit jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your best fit jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Your Best Fit Jobs</h1>
          </div>
          <p className="text-gray-600 text-lg">
            AI-powered job recommendations based on your resume and skills
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!error && jobs.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No matches yet</h3>
              <p className="text-gray-600 mb-6">
                We need to analyze your profile to find the best matching jobs for you.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  onClick={triggerMatching}
                  disabled={triggering}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {triggering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Job Matches
                    </>
                  )}
                </Button>
                <Link to="/profile">
                  <Button variant="outline">
                    Complete Your Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs Grid */}
        {!error && jobs.length > 0 && (
          <>
            {/* Stats and Pagination Top */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-gray-700 font-semibold">
                  Showing {(currentPage - 1) * 50 + 1} - {Math.min(currentPage * 50, pagination?.totalMatches || 0)} of {pagination?.totalMatches || 0} best-fit jobs (≥{pagination?.minScore || 70}%)
                </p>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                AI Matched & Filtered
              </div>
            </div>

            <div className="grid gap-6">
              {jobs.map((job, index) => (
                <Card
                  key={job.jobId}
                  className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-600 overflow-hidden"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Job Info */}
                      <div className="flex-1">
                        {/* Job ID - Small Text */}
                        <p className="text-xs text-gray-500 mb-2">
                          Job {String(job.jobId).substring(0, 12)}...
                        </p>
                        
                        {/* Role Title - Large Text */}
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {job.title}
                        </h3>
                        
                        {/* Company Name - Prominent */}
                        {job.company && (
                          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <span>{job.company}</span>
                          </div>
                        )}
                        
                        {/* Location - Medium Text */}
                        {job.location && (
                          <div className="flex items-center gap-2 text-gray-600 mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        
                        {/* Additional Info Row */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <span>📅 Posted 1/21/2026</span>
                          <span>💼 {job.workMode || 'Full Time'}</span>
                          <span>🎓 Fresher</span>
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3 mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Required Skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.slice(0, 5).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skills.length > 5 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  +{job.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {job.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-3">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Match Score */}
                      <div className="flex flex-col items-center gap-4 min-w-fit">
                        <div className="text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center border-2 border-green-200">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {job.matchScore}
                              </div>
                              <div className="text-xs text-gray-600">Match %</div>
                            </div>
                          </div>
                        </div>

                        <Link to={`/jobs/${job.jobId}`}>
                          <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                            View Job
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <Button
                variant="outline"
                disabled={!pagination?.hasPrevPage || loading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, pagination?.totalPages || 1) }).map((_, i) => {
                  const pageNum = i + 1;
                  if (pagination && pageNum > pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10 h-10 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {pagination && pagination.totalPages > 5 && (
                  <>
                    <span className="text-gray-500">...</span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      className="w-10 h-10 p-0"
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                disabled={!pagination?.hasNextPage || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="text-sm text-gray-600 w-full text-center">
                Page {pagination?.currentPage} of {pagination?.totalPages}
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-gray-700 text-sm">
                💡 <span className="font-semibold">AI Filtering:</span> Showing {pagination?.totalMatches || 0} best-fit jobs scoring {pagination?.minScore || 70}% or higher based on your resume and profile.
                Update your profile to get better recommendations.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
