import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Building2, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApplicationStore } from '@/store/applicationStore';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const appStore = useApplicationStore();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/applications', {
          headers,
          cache: 'no-store',
        });

        if (res.ok) {
          const apps = await res.json();
          setApplications(Array.isArray(apps) ? apps : []);
        }
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  // Use application store for realtime updates
  useEffect(() => {
    const apps = Object.values(appStore.applications || {});
    if (apps.length > 0) {
      setApplications(apps);
    }
  }, [appStore.applications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'interview':
        return <Badge className="bg-blue-500">Interview Scheduled</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'in-review':
        return <Badge className="bg-yellow-500">In Review</Badge>;
      default:
        return <Badge variant="secondary">Applied</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'interview':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track all your job applications in one place.
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              You haven't applied to any jobs yet. Start applying now!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <Link to={`/jobs/${app.jobId}`} className="group">
                      <h3 className="text-base sm:text-lg font-semibold group-hover:text-primary transition-colors break-words">
                        {app.jobTitle || 'Job Title'}
                      </h3>
                    </Link>
                    <div className="flex flex-col gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="break-words">{app.company || 'Company'}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="break-words">{app.location || 'Location'}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recently'}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusIcon(app.status)}
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