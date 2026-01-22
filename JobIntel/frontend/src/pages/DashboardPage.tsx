import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';
import {
  Briefcase,
  TrendingUp,
  Bell,
  Settings,
  Bookmark,
  FileText,
  Crown,
  MessageCircle,
  Mail,
  Send,
  Building2,
  MapPin,
  Clock,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Calendar,
  Target,
  Zap,
  User,
  Activity,
  Award,
  X,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DashboardPage = () => {
;
;
;

  const { user, isAuthenticated, logout } = useAuthStore();
  const [skillsRating, setSkillsRating] = useState<any>({});
  
;
;
;
;
;
;
;
;

  if (!isAuthenticated || !user) {
;
    return <Navigate to="/login" replace />;
  }

;

  // Add extra safety check for notificationPreferences
  const notifPrefs = user.notificationPreferences || {
    email: true,
    whatsapp: false,
    telegram: false,
    newJobMatch: true,
    deadlineReminder: true,
    applicationUpdate: true,
    referralUpdate: false,
  };
;

  // Real-time data: fetch from backend and stay in sync with app store
  const backendBase = (import.meta as any).env?.VITE_API_URL || '';
;

  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [totalMatchedJobsCount, setTotalMatchedJobsCount] = useState(0); // Total count from database at current threshold
  const [profileFields, setProfileFields] = useState<any[]>([]);
  const appStore = useApplicationStore();
;

  const [recentApplications, setRecentApplications] = useState<any[]>(Object.values(appStore.applications || {}));
  const [minMatchScore, setMinMatchScore] = useState(70); // Dynamic threshold from admin settings
;
  // Edit profile modal state (profile only)
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    batch: (user as any).batch || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  // Skills modal state
  const [editSkillsOpen, setEditSkillsOpen] = useState(false);
  const [skillsForm, setSkillsForm] = useState<string[]>(() => {
    // Get skills from skillsRating map (from parsed resume) or fall back to skills array
    if ((user as any).skillsRating && typeof (user as any).skillsRating === 'object') {
      return Object.keys((user as any).skillsRating);
    }
    return user.skills || [];
  });
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'interview':
        return <Badge variant="success">Interview</Badge>;
      case 'in-review':
        return <Badge variant="info">In Review</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'offered':
        return <Badge variant="premium">Offered</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const stats = [
    { label: 'Job Matches', value: matchedJobs.length, icon: Target, color: 'text-primary' },
    { label: 'Applications', value: recentApplications.length, icon: Briefcase, color: 'text-accent' },
    { label: 'Interviews', value: 0, icon: Calendar, color: 'text-success' },
    { label: 'Saved Jobs', value: 0, icon: Bookmark, color: 'text-warning' },
  ];

  // Fetch full user profile including skillsRating from backend - fires once on mount
  useEffect(() => {
;
;
;
;
    
    if (!user || !user.id) {
;
      return;
    }

;
    let mounted = true;

    const fetchUserProfile = async () => {
      try {
        const base = '';  // Use relative URL for CORS compatibility
        const url = `/api/users/${user.id}`;
;

        const token = localStorage.getItem('token');
;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

;
        const res = await fetch(url, {
          cache: 'no-store',
          headers,
        });
        
;

        if (!res.ok) {
;
          const errorText = await res.text();
;
          return;
        }

        const userData = await res.json();
;
;
;
;
;
;

        if (!mounted) {
;
          return;
        }

        // Update local skillsRating state
        if (userData?.skillsRating) {
;
          setSkillsRating(userData.skillsRating);
;
        } else {
;
        }

        // Update user in auth store
        if (userData) {
;
          const { updateUserFromBackend } = useAuthStore.getState();
          updateUserFromBackend(userData);
        }
      } catch (e) {
;
      }
    };

;
    fetchUserProfile();
    
    return () => {
;
      mounted = false;
    };
  }, []);

  // Fetch matched jobs from backend (top matches). Keep lightweight and update periodically.
  useEffect(() => {
;
    let mounted = true;
    const fetchMatches = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        // Use the AI matching endpoint to get best-fit jobs
        const url = base 
          ? `${base}/api/ai/best-fit-jobs/${user.id}?page=1&limit=50` 
          : `/api/ai/best-fit-jobs/${user.id}?page=1&limit=50`;
;

        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, { 
          cache: 'no-store',
          headers,
        });
;

        if (!res.ok) {
;
          return;
        }

        const data = await res.json();
;

        if (!mounted) {
;
          return;
        }

        // Extract jobs from the response
        // The API returns: { success: true, data: [...jobs], pagination: {...totalMatches, minScore, ...} }
        let jobsArray: any[] = [];
        let totalCount = 0;
        
        if (Array.isArray(data)) {
          jobsArray = data;
        } else if (data.data && Array.isArray(data.data)) {
          jobsArray = data.data;
        } else if (data.jobs && Array.isArray(data.jobs)) {
          jobsArray = data.jobs;
        }
        
        // Get total count from pagination if available
        if (data.pagination?.totalMatches) {
          totalCount = data.pagination.totalMatches;
        } else {
          totalCount = jobsArray.length;
        }
        
;
        setMatchedJobs(jobsArray);
        setTotalMatchedJobsCount(totalCount);
        setMinMatchScore(data.pagination?.minScore || 70);
      } catch (e) {
;
      }
    };
    fetchMatches();
    const iv = setInterval(fetchMatches, 15000);
;

    return () => {
;
      mounted = false;
      clearInterval(iv);
    };
  }, [backendBase, user]);

  // Fetch user's applications from backend and keep in sync with application store (SSE updates)
  useEffect(() => {
;
    let mounted = true;
    const fetchApps = async () => {
      if (!user || !user.id) {
;
        return;
      }

      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/applications?userId=${user.id}` : `/api/applications?userId=${user.id}`;
;

        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, { 
          cache: 'no-store',
          headers,
        });
;

        if (!res.ok) {
;
          return;
        }

        const apps = await res.json();
;

        if (!mounted) {
;
          return;
        }

        const appsArray = Array.isArray(apps) ? apps : [];
;
        setRecentApplications(appsArray);
      } catch (e) {
;
      }
    };
    fetchApps();
    const iv = setInterval(fetchApps, 15000);
;

    return () => {
;
      mounted = false;
      clearInterval(iv);
    };
  }, [backendBase, user]);

  // Keep in-sync with application store (SSE may update appStore.application map)
  useEffect(() => {
;
    const apps = Object.values(appStore.applications || {});
;
;
    setRecentApplications(apps);
  }, [appStore.applications]);

  // Load available skills when skills modal opens
  useEffect(() => {
    if (!editSkillsOpen) {
;
      return;
    }

;
    let mounted = true;
    const fetchSkills = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/skills` : '/api/skills';
;

        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, { 
          cache: 'no-store',
          headers,
        });
;

        if (!res.ok) {
;
          return;
        }

        const skills = await res.json();
;

        if (!mounted) {
;
          return;
        }

        const skillsArray = Array.isArray(skills) ? skills : [];
;
        setAvailableSkills(skillsArray);
      } catch (e) {
;
      }
    };
    fetchSkills();
    return () => {
;
      mounted = false;
    };
  }, [editSkillsOpen, backendBase]);

  // Load profile fields when profile modal opens (or on mount)
  useEffect(() => {
;
    // Simplified: only load skills, ignore complex profile fields
    setProfileFields([]);
  }, []);

  // keep profile form and skills form in sync with current user
  useEffect(() => {
    // Simple profile form - only basic fields, focus on skills
    const baseForm: any = {
      name: user.name || '',
      email: user.email || '',
      phone: (user as any).phone || '',
    };
    setProfileForm(baseForm);
    // Get skills from skillsRating (extracted from resume) or fall back to skills array
    if ((user as any).skillsRating && typeof (user as any).skillsRating === 'object') {
      setSkillsForm(Array.from(new Set(Object.keys((user as any).skillsRating))));
    } else {
      setSkillsForm(Array.from(new Set(user.skills || [])));
    }
  }, [user]);

  const toggleSkill = (skill: string) => {
    setSkillsForm((prev) => {
      const s = new Set(prev || []);
      if (s.has(skill)) s.delete(skill); else s.add(skill);
      return Array.from(s);
    });
  };

  const addCustomSkill = () => {
    const sk = String(newSkill || '').trim();
    if (!sk) return;
    setNewSkill('');
    setAvailableSkills((prev) => Array.from(new Set([sk, ...prev])));
    setSkillsForm((prev) => Array.from(new Set([sk, ...(prev || [])])));
  };

  const saveProfile = async () => {
    if (!user || !user.id) return;
    setSavingProfile(true);
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/users/${user.id}` : `/api/users/${user.id}`;
      // send dynamic form values (only include keys present in profileForm)
      const body: any = {};
      Object.keys(profileForm || {}).forEach((k) => { body[k] = profileForm[k]; });
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const updated = await res.json();
        useAuthStore.getState().updateUser({ ...updated });
        setEditProfileOpen(false);
      } else {
;
      }
    } catch (e) {
;
    } finally {
      setSavingProfile(false);
    }
  };

  // React to realtime updates for skills or profile fields
  useEffect(() => {
    const handler = (e: any) => {
      const payload = e?.detail;
      if (!payload) return;
      if (payload.type === 'skills') {
        const url = backendBase ? `${backendBase.replace(/\/$/, '')}/api/skills` : '/api/skills';
        fetch(url).then((r) => r.ok && r.json()).then((s) => setAvailableSkills(Array.isArray(s) ? s : [])).catch(() => {});
      }
      if (payload.type === 'profile_fields') {
        // refetch profile fields and reinitialize form
        const url = backendBase ? `${backendBase.replace(/\/$/, '')}/api/profile-fields` : '/api/profile-fields';
        fetch(url).then((r) => r.ok && r.json()).then((f) => { setProfileFields(Array.isArray(f) ? f : []); }).catch(() => {});
      }
    };
    window.addEventListener('realtime:update', handler as EventListener);
    return () => window.removeEventListener('realtime:update', handler as EventListener);
  }, [backendBase, editSkillsOpen, profileFields]);

  const saveSkills = async () => {
    if (!user || !user.id) return;
    setSavingSkills(true);
    try {
      const base = backendBase ? backendBase.replace(/\/$/, '') : '';
      const url = base ? `${base}/api/users/${user.id}` : `/api/users/${user.id}`;
      const body = { skills: skillsForm };
      const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const updated = await res.json();
        useAuthStore.getState().updateUser({ ...updated });
        setEditSkillsOpen(false);
      } else {
;
      }
    } catch (e) {
;
    } finally {
      setSavingSkills(false);
    }
  };

;
;
;
;
;
;
;
;
;
;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'User'}! Here's your job search overview.
          </p>
          <p className="text-sm text-blue-600 mt-2">
            💼 For premium access, connect with our admin on{' '}
            <a
              href="https://www.linkedin.com/in/alok-kumar-singh-119481218/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              LinkedIn
            </a>
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="matches" className="text-xs sm:text-sm">Matches</TabsTrigger>
          <TabsTrigger value="applications" className="text-xs sm:text-sm hidden sm:block">Apps</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs sm:text-sm hidden sm:block">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {console.log('🔍 [DashboardPage] RENDERING 5-COLUMN GRID - skillsRating count:', Object.keys(skillsRating).length) || null}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matched Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMatchedJobsCount || matchedJobs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs that match your profile (≥{minMatchScore}%)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentApplications.length}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs you've applied to
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {user?.skills?.length ? Math.min(100, (user.skills.length * 10) + 50) : 50}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Complete your profile for better matches
                </p>
              </CardContent>
            </Card>
            <Card>
              {console.log('🔍 [DashboardPage] RENDERING SKILLS CARD - current skillsRating:', skillsRating, 'count:', Object.keys(skillsRating).length) || null}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Skills</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(skillsRating).length || (user?.skills?.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Skills extracted from resume
                </p>
              </CardContent>
            </Card>
            <Card>
              {console.log('🔍 [DashboardPage] RENDERING RESUME SKILLS CARD - skillsRating keys:', Object.keys(skillsRating)) || null}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resume Skills</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(skillsRating).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Skills from your resume
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resume Skills Card */}
          <Card className="col-span-full">
            {console.log('🔍 [DashboardPage] RENDERING RESUME SKILLS CARD - skillsRating:', skillsRating, 'keys count:', Object.keys(skillsRating).length) || null}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Resume Skills
              </CardTitle>
              <CardDescription>
                Skills extracted from your resume ({Object.keys(skillsRating).length} skills)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {console.log('🔍 [DashboardPage] RENDERING SKILL BADGES - skillsRating keys:', Object.keys(skillsRating), 'count:', Object.keys(skillsRating).length) || null}
                {Object.keys(skillsRating).length > 0 ? (
                  Object.keys(skillsRating).map((skill: string) => {
;
                    return (
                      <Badge key={skill} variant="secondary" className="px-3 py-1.5">
                        {skill}
                      </Badge>
                    );
                  })
                ) : user?.skills && user.skills.length > 0 ? (
                  user.skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1.5">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills found. Upload your resume to extract skills.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-2 sm:gap-4 grid-cols-1 md:grid-cols-2">
            <Card className="overflow-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Recent Job Matches</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {matchedJobs && Array.isArray(matchedJobs) && matchedJobs.length > 0 ? (
                  <div className="space-y-4">
                    {matchedJobs.slice(0, 3).map((job: any) => (
                      <div key={job._id} className="flex items-center space-x-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.location}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No job matches yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {recentApplications.slice(0, 3).map((app: any) => (
                      <div key={app._id} className="flex items-center space-x-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{app.job?.title || 'Unknown Job'}</p>
                          <p className="text-sm text-muted-foreground">{app.job?.company || 'Unknown Company'}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No applications yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Job Matches</CardTitle>
              <CardDescription>
                Jobs that match your skills and profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matchedJobs.length > 0 ? (
                <div className="space-y-4">
                  {matchedJobs.map((job: any) => (
                    <div key={job._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">{job.company}</p>
                          <p className="text-sm">{job.location}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills?.matched && Array.isArray(job.skills.matched) 
                              ? job.skills.matched.slice(0, 3).map((skill: string) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))
                              : job.skills?.missing && Array.isArray(job.skills.missing)
                                ? job.skills.missing.slice(0, 3).map((skill: string) => (
                                    <Badge key={skill} variant="secondary" className="text-xs bg-yellow-100">
                                      {skill}
                                    </Badge>
                                  ))
                                : null
                            }
                          </div>
                        </div>
                        <a 
                          href={job.applyLink || job.applyUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:opacity-90 shadow-soft h-9 rounded-md px-4 text-sm"
                        >
                          Apply Now
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No job matches found. Update your profile and skills to get better matches.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Applications</CardTitle>
              <CardDescription>
                Track the status of your job applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentApplications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app: any) => (
                    <div key={app._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{app.job?.title || 'Unknown Job'}</h3>
                          <p className="text-sm text-muted-foreground">{app.job?.company || 'Unknown Company'}</p>
                          <p className="text-sm">Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
                          <Badge variant={app.status === 'pending' ? 'secondary' : 'default'} className="mt-2">
                            {app.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No applications yet. Start applying to jobs to see them here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profileForm?.name || ''}
                    onChange={(e) => setProfileForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm?.email || ''}
                    onChange={(e) => setProfileForm((prev: any) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm?.phone || ''}
                    onChange={(e) => setProfileForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>
                  Manage your skills for better job matches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Add New Skill</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                    />
                    <Button onClick={addCustomSkill} size="sm">Add</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Skills</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {availableSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={skillsForm?.includes(skill) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Selected Skills</Label>
                  <div className="flex flex-wrap gap-2">
                    {skillsForm?.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={saveSkills} disabled={savingSkills}>
                  {savingSkills && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Skills
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};



export default DashboardPage;
