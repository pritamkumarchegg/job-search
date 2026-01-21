import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Building2, Search, Briefcase, Filter, X, ChevronLeft, ChevronRight, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import AuthRequiredModal from '@/components/AuthRequiredModal';

interface Job {
  _id: string;
  title: string;
  location?: string;
  source?: string;
  status?: string;
  applyUrl?: string;
  applyLink?: string;
  description?: string;
  meta?: {
    rawData?: {
      employer_name?: string;
      job_employment_type?: string;
    };
  };
}

export default function AllJobsPage() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 15;

  // Auth modal state
  const { isAuthenticated } = useAuthStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedJobForAuth, setSelectedJobForAuth] = useState<{ id: string; title: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/jobs?limit=5000', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const jobsArray = Array.isArray(data) ? data : [];
          console.log('✅ [AllJobsPage] Loaded jobs:', jobsArray.length);
          setAllJobs(jobsArray);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load jobs',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        toast({
          title: 'Error',
          description: 'Failed to load jobs',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [toast]);

  // Extract unique values for filters
  const companies = useMemo(
    () => [...new Set(allJobs.map((j) => j.meta?.rawData?.employer_name || 'Unknown'))].filter(Boolean).sort(),
    [allJobs]
  );
  const locations = useMemo(
    () => [...new Set(allJobs.map((j) => j.location || 'Not specified'))].filter(Boolean).sort(),
    [allJobs]
  );
  const sources = useMemo(
    () => [...new Set(allJobs.map((j) => j.source || 'Unknown'))].filter(Boolean).sort(),
    [allJobs]
  );
  const jobTypes = useMemo(
    () => [...new Set(allJobs.map((j) => j.meta?.rawData?.job_employment_type || 'Unknown'))].filter(Boolean).sort(),
    [allJobs]
  );

  // Apply filters
  const filteredJobs = useMemo(() => {
    let filtered = [...allJobs];

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          (job.meta?.rawData?.employer_name || '').toLowerCase().includes(query) ||
          (job.location || '').toLowerCase().includes(query)
      );
    }

    // Company filter
    if (selectedCompanies.length > 0) {
      filtered = filtered.filter((job) =>
        selectedCompanies.includes(job.meta?.rawData?.employer_name || 'Unknown')
      );
    }

    // Location filter
    if (selectedLocations.length > 0) {
      filtered = filtered.filter((job) =>
        selectedLocations.includes(job.location || 'Not specified')
      );
    }

    // Job Type filter
    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter((job) =>
        selectedJobTypes.includes(job.meta?.rawData?.job_employment_type || 'Unknown')
      );
    }

    // Remote filter
    if (remoteOnly) {
      filtered = filtered.filter((job) =>
        (job.meta?.rawData?.job_employment_type || '').toLowerCase().includes('remote')
      );
    }

    return filtered;
  }, [allJobs, searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, remoteOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIdx = (currentPage - 1) * jobsPerPage;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + jobsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompanies, selectedLocations, selectedJobTypes, remoteOnly]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCompanies([]);
    setSelectedLocations([]);
    setSelectedJobTypes([]);
    setRemoteOnly(false);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 sm:p-8 border border-border">
        <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">All Available Jobs</h1>
        <p className="text-xs sm:text-base text-muted-foreground">Browse all {allJobs.length} job opportunities from our database</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by job title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Toggle Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            {/* Filters Section */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t">
                {/* Company Filter */}
                <div className="space-y-3">
                  <Label className="font-semibold">Companies ({selectedCompanies.length})</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {companies.map((company) => (
                      <div key={company} className="flex items-center space-x-2">
                        <Checkbox
                          id={`company-${company}`}
                          checked={selectedCompanies.includes(company)}
                          onCheckedChange={(checked) => {
                            setSelectedCompanies(
                              checked
                                ? [...selectedCompanies, company]
                                : selectedCompanies.filter((c) => c !== company)
                            );
                          }}
                        />
                        <Label htmlFor={`company-${company}`} className="text-sm cursor-pointer">
                          {company}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location Filter */}
                <div className="space-y-3">
                  <Label className="font-semibold">Locations ({selectedLocations.length})</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {locations.slice(0, 15).map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location}`}
                          checked={selectedLocations.includes(location)}
                          onCheckedChange={(checked) => {
                            setSelectedLocations(
                              checked
                                ? [...selectedLocations, location]
                                : selectedLocations.filter((l) => l !== location)
                            );
                          }}
                        />
                        <Label htmlFor={`location-${location}`} className="text-sm cursor-pointer">
                          {location}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status and Source Filters */}
                <div className="space-y-3">
                  <Label className="font-semibold">Job Type ({selectedJobTypes.length})</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {jobTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`jobtype-${type}`}
                          checked={selectedJobTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            setSelectedJobTypes(
                              checked
                                ? [...selectedJobTypes, type]
                                : selectedJobTypes.filter((t) => t !== type)
                            );
                          }}
                        />
                        <Label htmlFor={`jobtype-${type}`} className="text-sm cursor-pointer capitalize">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {/* Remote Only */}
                  <div className="flex items-center space-x-2 pt-4 border-t">
                    <Checkbox
                      id="remote-only"
                      checked={remoteOnly}
                      onCheckedChange={(checked) => setRemoteOnly(checked as boolean)}
                    />
                    <Label htmlFor="remote-only" className="text-sm cursor-pointer">
                      Remote Only
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Info and Reset */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedJobs.length} of {filteredJobs.length} jobs
                {filteredJobs.length !== allJobs.length && ` (filtered from ${allJobs.length})`}
              </div>
              {(searchQuery || selectedCompanies.length > 0 || selectedLocations.length > 0 || selectedJobTypes.length > 0 || remoteOnly) && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {paginatedJobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-12">
              No jobs found matching your filters. Try adjusting your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedJobs.map((job) => (
            <Card key={job._id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Job Info */}
                  <div className="flex-1">
                    <Link to={`/jobs/${job._id}`} className="group">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors mb-1">
                        {job.title}
                      </h3>
                    </Link>

                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.meta?.rawData?.employer_name || 'Company'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location || 'Location not specified'}
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {job.status && (
                          <Badge className="text-xs capitalize">
                            {job.status}
                          </Badge>
                        )}
                        {job.meta?.rawData?.job_employment_type && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {job.meta.rawData.job_employment_type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Description preview */}
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description.substring(0, 200)}...
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-col">
                    {job.applyUrl || job.applyLink ? (
                      isAuthenticated ? (
                        <a
                          href={job.applyUrl || job.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors text-sm whitespace-nowrap"
                        >
                          <Briefcase className="h-4 w-4" />
                          Apply Now
                        </a>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-sm w-full justify-center gap-2"
                          onClick={() => {
                            setSelectedJobForAuth({ id: job._id, title: job.title });
                            setAuthModalOpen(true);
                          }}
                        >
                          <Briefcase className="h-4 w-4" />
                          Apply Now
                        </Button>
                      )
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-md font-medium text-sm cursor-not-allowed"
                      >
                        No Apply Link
                      </button>
                    )}
                    {isAuthenticated ? (
                      <Link
                        to={`/jobs/${job._id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/90 transition-colors text-sm whitespace-nowrap"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Link>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-sm w-full justify-center gap-2"
                        onClick={() => {
                          setSelectedJobForAuth({ id: job._id, title: job.title });
                          setAuthModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        jobTitle={selectedJobForAuth?.title}
        redirectPath={selectedJobForAuth ? `/jobs/${selectedJobForAuth.id}` : '/all-jobs'}
      />
    </div>
  );
}
