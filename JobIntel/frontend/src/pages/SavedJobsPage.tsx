import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Building2, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        if (!user?._id) return;
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/jobs/user/${user._id}/saved`, {
          headers,
          cache: 'no-store',
        });

        if (res.ok) {
          const jobs = await res.json();
          setSavedJobs(Array.isArray(jobs) ? jobs : []);
        } else {
          setSavedJobs([]);
        }
      } catch (err) {
        console.error('Failed to fetch saved jobs:', err);
        toast({
          title: 'Error',
          description: 'Failed to load saved jobs',
          variant: 'destructive',
        });
        setSavedJobs([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchSavedJobs();
    }
  }, [user?._id, toast]);

  const handleRemoveSaved = async (jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/jobs/${jobId}/unsave`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        setSavedJobs(savedJobs.filter((j) => j._id !== jobId));
        toast({
          title: 'Success',
          description: 'Job removed from saved',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to remove job',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to remove saved job:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove saved job',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground">
          You have {savedJobs.length} saved job{savedJobs.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              You haven't saved any jobs yet. Browse jobs and save your favorites!
            </p>
            <div className="flex justify-center">
              <Link to="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {savedJobs.map((job) => (
            <Card key={job._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/jobs/${job._id}`} className="group">
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {job.meta?.company || 'Company'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location || 'Location not specified'}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {job.type && <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground border-transparent">{job.type}</div>}
                      {job.isRemote && <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground border-border">Remote</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link to={`/jobs/${job._id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSaved(job._id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}