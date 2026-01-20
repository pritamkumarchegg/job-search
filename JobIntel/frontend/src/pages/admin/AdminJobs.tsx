import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  Upload,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { adminJobs } from '@/data/adminMockData';
import { cn } from '@/lib/utils';
import { parseJobText, ParsedJobData } from '@/services/aiJobParser';
import { JobPreviewDialog } from '@/components/admin/JobPreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { useJobsStore } from '@/store/jobsStore';
import { useAuthStore } from '@/store/authStore';

// use ParsedJobData from aiJobParser

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-800 border-gray-200',
};

const sourceColors: Record<string, string> = {
  manual: 'bg-purple-100 text-purple-800',
  crawler: 'bg-teal-100 text-teal-800',
  api: 'bg-indigo-100 text-indigo-800',
};

export default function AdminJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 15;
  const [rawJobText, setRawJobText] = useState('');
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [parsedJob, setParsedJob] = useState<ParsedJobData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { publishedJobs, publishJob } = useJobsStore();

  const [backendJobs, setBackendJobs] = useState<any[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  // Form state for manual job creation/editing
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    isRemote: false,
    type: 'full-time' as const,
    description: '',
    experience: '',
    salary: '',
    techStack: [] as string[],
    eligibility: '',
    batch: [] as number[],
    applyLink: '',
    deadline: '',
  });

  const fetchBackendJobs = async () => {
    setLoadingBackend(true);
    setBackendError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/admin/jobs/list', { 
        cache: 'no-store',
        headers 
      });
      if (response.ok) {
        const jobs = await response.json();
        setBackendJobs(jobs || []);
        console.debug('Admin: fetched', Array.isArray(jobs) ? jobs.length : 0, 'backend jobs from admin endpoint');
      } else {
        setBackendJobs([]);
        setBackendError(`Status ${response.status}`);
      }
    } catch (err: any) {
      setBackendJobs([]);
      setBackendError(err?.message || String(err));
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    fetchBackendJobs();
  }, []);

  // Open edit form with job data
  const handleEditJob = (jobId: string) => {
    const job = combinedJobs.find(j => j.id === jobId);
    if (!job) return;
    
    setEditingJobId(jobId);
    setFormData({
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      isRemote: job.isRemote || false,
      type: job.type || 'full-time',
      description: job.description || '',
      experience: job.experience || '',
      salary: job.salary?.max?.toString() || '',
      techStack: job.techStack || [],
      eligibility: job.eligibility || '',
      batch: job.batch || [],
      applyLink: job.applyLink || '',
      deadline: job.deadline || '',
    });
    setIsManualFormOpen(true);
  };

  // Handle form submission for add/edit
  const handleSubmitForm = async () => {
    if (!formData.title || !formData.company) {
      toast({ title: 'Error', description: 'Title and company are required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title,
        company: formData.company,
        location: formData.location,
        isRemote: formData.isRemote,
        type: formData.type,
        description: formData.description,
        experience: formData.experience,
        salary: formData.salary ? { max: parseInt(formData.salary) } : undefined,
        meta: {
          company: formData.company,
          location: formData.location,
          isRemote: formData.isRemote,
          techStack: formData.techStack,
          batch: formData.batch,
          applyLink: formData.applyLink,
        },
        batch: formData.batch,
        applyLink: formData.applyLink,
        deadline: formData.deadline || undefined,
        status: 'active',
      };

      let url = '/api/jobs';
      let method = 'POST';

      if (editingJobId) {
        url = `/api/jobs/${editingJobId}`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: editingJobId ? 'Job Updated' : 'Job Created',
          description: editingJobId ? 'Job updated successfully' : 'Job created successfully',
        });
        setIsManualFormOpen(false);
        setEditingJobId(null);
        setFormData({
          title: '',
          company: '',
          location: '',
          isRemote: false,
          type: 'full-time',
          description: '',
          experience: '',
          salary: '',
          techStack: [],
          eligibility: '',
          batch: [],
          applyLink: '',
          deadline: '',
        });
        fetchBackendJobs();
      } else {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save job',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      isRemote: false,
      type: 'full-time',
      description: '',
      experience: '',
      salary: '',
      techStack: [],
      eligibility: '',
      batch: [],
      applyLink: '',
      deadline: '',
    });
    setEditingJobId(null);
    setIsManualFormOpen(false);
  };

  // Handlers for admin actions
  const handleDelete = async (id: string, source?: string) => {
    try {
      if (source === 'manual') {
        // local store
        // publishedJobs in store have numeric-ish ids (string timestamps)
        // try remove
        const { removeJob } = useJobsStore.getState();
        removeJob(id);
        toast({ title: 'Deleted locally', description: 'Job removed from local store' });
        // also refetch backend to be safe
        fetchBackendJobs();
        return;
      }

      const resp = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        toast({ title: 'Deleted', description: 'Job deleted from backend' });
        fetchBackendJobs();
      } else {
        toast({ title: 'Delete failed', description: `Status ${resp.status}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string, source?: string) => {
    try {
      if (source === 'manual') {
        useJobsStore.getState().updateJobStatus(id, 'active');
        toast({ title: 'Approved locally' });
        return;
      }
      const resp = await fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
      if (resp.ok) {
        toast({ title: 'Approved' });
        fetchBackendJobs();
      } else {
        toast({ title: 'Approve failed', description: `Status ${resp.status}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  };

  const handleReject = async (id: string, source?: string) => {
    try {
      if (source === 'manual') {
        useJobsStore.getState().updateJobStatus(id, 'rejected');
        toast({ title: 'Rejected locally' });
        return;
      }
      const resp = await fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) });
      if (resp.ok) {
        toast({ title: 'Rejected' });
        fetchBackendJobs();
      } else {
        toast({ title: 'Reject failed', description: `Status ${resp.status}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  };

  const combinedJobs = useMemo(() => {
    // map publishedJobs from store to admin row shape
    const fromPublished = publishedJobs.map((pj) => ({
      id: pj.id,
      title: pj.title,
      company: pj.company,
      location: pj.location || 'Remote',
      description: pj.description || '',
      applyUrl: pj.applyUrl || pj.applyLink || '#',
      status: pj.status || 'active',
      source: 'manual',
      applicants: pj.applicantsCount || 0,
      postedAt: pj.createdAt,
      deadline: pj.deadline || null,
    }));

    const fromBackend = backendJobs.map((bj: any) => ({
      id: bj.id,
      title: bj.title,
      company: bj.company,
      location: bj.location || 'Remote',
      description: bj.description || '',
      applyUrl: bj.applyUrl || '#',
      status: bj.status || 'active',
      source: bj.source || 'api',
      applicants: bj.applicants || 0,
      postedAt: bj.postedAt,
      deadline: bj.deadline || null,
    }));

    // Use only backend jobs to avoid duplicates, sort by newest first
    const result = backendJobs.length > 0 
      ? fromBackend.sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime())
      : [...adminJobs, ...fromPublished].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
    console.debug('Admin: combined jobs counts', { mock: adminJobs.length, published: fromPublished.length, backend: fromBackend.length, total: result.length });
    return result;
  }, [publishedJobs, backendJobs]);

  const filteredJobs = combinedJobs.filter(
    (job) => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (String(job.company) || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || job.status === statusFilter;
      const matchesSource = !sourceFilter || job.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    }
  );

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIdx = (currentPage - 1) * jobsPerPage;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + jobsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sourceFilter]);

  const handleAiParse = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Use local AI parser (frontend)
      const parsed = parseJobText(rawJobText);
      setParsedJob(parsed);
      setIsAiDialogOpen(false);
      setIsPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse job text');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishJob = async () => {
    if (!parsedJob) return;
    
    setIsLoading(true);
    try {
      // Try to publish to backend if available, otherwise save locally
      try {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: parsedJob.title,
            company: parsedJob.company,
            description: parsedJob.description,
            location: parsedJob.location,
            isRemote: parsedJob.isRemote,
            salary: parsedJob.salary,
            stipend: parsedJob.stipend,
            techStack: parsedJob.techStack,
            tags: parsedJob.tags,
            eligibility: parsedJob.eligibility,
            experience: parsedJob.experience,
            batch: parsedJob.batch,
            applyLink: (parsedJob as any).applyLink || undefined,
            status: 'active',
            rawText: rawJobText,
          }),
        });
        if (response.ok) {
          const created = await response.json();
          console.log('Job published to backend', created._id || created.id);
          // refresh backend jobs listing in admin
          fetchBackendJobs();
          setIsPreviewOpen(false);
          setRawJobText('');
          setParsedJob(null);
          toast({
            title: 'Job Published! 🎉',
            description: `"${parsedJob.title}" has been published and is now visible in the jobs listing.`,
            duration: 4000,
          });
        } else {
          const text = await response.text().catch(() => '');
          throw new Error(`Backend returned ${response.status} ${text}`);
        }
      } catch (backendErr) {
        console.log('Backend not available or failed; not saving locally:', backendErr);
        toast({ title: 'Publish failed', description: String(backendErr), variant: 'destructive' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish job');
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to publish job',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Management</h1>
          <p className="text-muted-foreground">Manage and approve job listings</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Parse
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Job Parser
                </DialogTitle>
                <DialogDescription>
                  Paste raw job text or a job link. AI will automatically extract and structure the job details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="rawJob">Raw Job Text or URL</Label>
                  <Textarea
                    id="rawJob"
                    placeholder="Paste job description text or a careers page URL..."
                    value={rawJobText}
                    onChange={(e) => setRawJobText(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAiParse} className="gap-2" disabled={isLoading || !rawJobText.trim()}>
                  <Sparkles className="h-4 w-4" />
                  {isLoading ? 'Parsing...' : 'Parse with AI'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJobId ? 'Edit Job' : 'Add New Job'}</DialogTitle>
                <DialogDescription>
                  Fill in all the job details below. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Senior Software Engineer"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      placeholder="e.g., Google"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Bangalore, India"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Job Type</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="salary">Salary (Max Amount)</Label>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="e.g., 100000"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-2 h-10">
                      <input
                        type="checkbox"
                        id="remote"
                        checked={formData.isRemote}
                        onChange={(e) => setFormData({ ...formData, isRemote: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="remote" className="cursor-pointer">Remote</Label>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Job description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="experience">Experience Required</Label>
                    <Input
                      id="experience"
                      placeholder="e.g., 3-5 years"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="techStack">Tech Stack (comma separated)</Label>
                    <Input
                      id="techStack"
                      placeholder="e.g., React, Node.js, MongoDB"
                      value={formData.techStack.join(', ')}
                      onChange={(e) => setFormData({ ...formData, techStack: e.target.value.split(',').map(s => s.trim()) })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="batch">Batch (comma separated)</Label>
                    <Input
                      id="batch"
                      placeholder="e.g., 2024, 2025, 2026"
                      value={formData.batch.join(', ')}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="applyLink">Apply Link</Label>
                    <Input
                      id="applyLink"
                      placeholder="https://..."
                      value={formData.applyLink}
                      onChange={(e) => setFormData({ ...formData, applyLink: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitForm} disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingJobId ? 'Update Job' : 'Create Job')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{combinedJobs.filter(j => j.status === 'pending').length}</div>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{combinedJobs.filter(j => j.status === 'active').length}</div>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{combinedJobs.reduce((acc, j) => acc + (j.applicants || 0), 0)}</div>
            <p className="text-sm text-muted-foreground">Total Applicants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{combinedJobs.filter(j => j.source === 'crawler').length}</div>
            <p className="text-sm text-muted-foreground">From Crawlers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>All Jobs</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            {/* Filter Tags */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
              </div>
              {/* Status Filter */}
              {statusFilter && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  Status: {statusFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setStatusFilter('')}
                  />
                </Badge>
              )}
              {/* Source Filter */}
              {sourceFilter && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  Source: {sourceFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSourceFilter('')}
                  />
                </Badge>
              )}
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 rounded-md border border-input bg-background text-sm hover:bg-muted cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
              {/* Source Dropdown */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-1 rounded-md border border-input bg-background text-sm hover:bg-muted cursor-pointer"
              >
                <option value="">All Sources</option>
                <option value="JSearch API">JSearch API</option>
                <option value="Fallback Data">Fallback Data</option>
                <option value="manual">Manual</option>
                <option value="crawler">Crawler</option>
              </select>
              {(statusFilter || sourceFilter) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setSourceFilter('');
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Remote</TableHead>
                  <TableHead>Job Details</TableHead>
                  <TableHead>Apply Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell className="font-semibold">{job.company || 'Unknown'}</TableCell>
                    <TableCell className="text-sm">{job.location || 'Remote'}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className="capitalize">
                        {job.jobType || job.type || 'Full-time'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={job.isRemote ? 'default' : 'secondary'} className="capitalize">
                        {job.isRemote ? '🌍 Remote' : '📍 On-site'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{job.description || 'N/A'}</TableCell>
                    <TableCell>
                      {job.applyUrl ? (
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          Apply Here
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', statusColors[job.status])}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('capitalize', sourceColors[job.source])}>
                        {job.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.applicants}</TableCell>
                    <TableCell>{job.postedAt}</TableCell>
                    <TableCell>{job.deadline || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleEditJob(job.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {job.status === 'pending' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-green-600" onSelect={() => handleApprove(job.id, job.source)}>
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onSelect={() => handleReject(job.id, job.source)}>
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(job.id, job.source)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Info */}
          <div className="p-4 border-t text-sm text-muted-foreground">
            Showing {paginatedJobs.length} of {filteredJobs.length} jobs
            {filteredJobs.length !== combinedJobs.length && ` (filtered from ${combinedJobs.length})`}
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </Button>

              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Preview Dialog */}
      <JobPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        parsedJob={parsedJob}
        isLoading={isLoading}
        onPublish={handlePublishJob}
      />
    </div>
  );
}
