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
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DashboardPage = () => {
  console.log('🔍 [DashboardPage] Component rendered/updated');

  const { user, isAuthenticated } = useAuthStore();
  console.log('🔍 [DashboardPage] Auth state:', { isAuthenticated, user: user ? { id: user.id, name: user.name, email: user.email, tier: user.tier } : null });

  if (!isAuthenticated || !user) {
    console.log('🔍 [DashboardPage] User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔍 [DashboardPage] User authenticated, proceeding with dashboard render');

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
  console.log('🔍 [DashboardPage] Notification preferences:', notifPrefs);

  // Real-time data: fetch from backend and stay in sync with app store
  const backendBase = (import.meta as any).env?.VITE_API_URL || '';
  console.log('🔍 [DashboardPage] Backend base URL:', backendBase);

  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [profileFields, setProfileFields] = useState<any[]>([]);
  const appStore = useApplicationStore();
  console.log('🔍 [DashboardPage] Application store state:', { applicationsCount: Object.keys(appStore.applications || {}).length });

  const [recentApplications, setRecentApplications] = useState<any[]>(Object.values(appStore.applications || {}));
  console.log('🔍 [DashboardPage] Initial recent applications:', recentApplications.length);
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
  const [skillsForm, setSkillsForm] = useState<string[]>(user.skills || []);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [newSkill, setNewSkill] = useState('');

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

  // Fetch matched jobs from backend (top matches). Keep lightweight and update periodically.
  useEffect(() => {
    console.log('🔍 [DashboardPage] useEffect: Fetching matched jobs');
    let mounted = true;
    const fetchMatches = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/jobs?status=active` : '/api/jobs?status=active';
        console.log('🔍 [DashboardPage] Fetching jobs from URL:', url);

        const res = await fetch(url, { cache: 'no-store' });
        console.log('🔍 [DashboardPage] Jobs API response status:', res.status);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] Jobs API returned non-ok status:', res.status);
          return;
        }

        const jobs = await res.json();
        console.log('🔍 [DashboardPage] Jobs API response data:', jobs);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating jobs');
          return;
        }

        const jobsArray = Array.isArray(jobs) ? jobs.slice(0, 3) : [];
        console.log('🔍 [DashboardPage] Setting matched jobs:', jobsArray.length, 'jobs');
        setMatchedJobs(jobsArray);
      } catch (e) {
        console.error('🔍 [DashboardPage] Failed to fetch matched jobs:', e);
      }
    };
    fetchMatches();
    const iv = setInterval(fetchMatches, 15000);
    console.log('🔍 [DashboardPage] Set up jobs polling interval');

    return () => {
      console.log('🔍 [DashboardPage] Cleaning up jobs polling interval');
      mounted = false;
      clearInterval(iv);
    };
  }, [backendBase, user]);

  // Fetch user's applications from backend and keep in sync with application store (SSE updates)
  useEffect(() => {
    console.log('🔍 [DashboardPage] useEffect: Fetching user applications');
    let mounted = true;
    const fetchApps = async () => {
      if (!user || !user.id) {
        console.log('🔍 [DashboardPage] No user or user ID, skipping applications fetch');
        return;
      }

      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/applications?userId=${user.id}` : `/api/applications?userId=${user.id}`;
        console.log('🔍 [DashboardPage] Fetching applications from URL:', url);

        const res = await fetch(url, { cache: 'no-store' });
        console.log('🔍 [DashboardPage] Applications API response status:', res.status);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] Applications API returned non-ok status:', res.status);
          return;
        }

        const apps = await res.json();
        console.log('🔍 [DashboardPage] Applications API response data:', apps);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating applications');
          return;
        }

        const appsArray = Array.isArray(apps) ? apps : [];
        console.log('🔍 [DashboardPage] Setting recent applications:', appsArray.length, 'applications');
        setRecentApplications(appsArray);
      } catch (e) {
        console.error('🔍 [DashboardPage] Failed to fetch recent applications:', e);
      }
    };
    fetchApps();
    const iv = setInterval(fetchApps, 15000);
    console.log('🔍 [DashboardPage] Set up applications polling interval');

    return () => {
      console.log('🔍 [DashboardPage] Cleaning up applications polling interval');
      mounted = false;
      clearInterval(iv);
    };
  }, [backendBase, user]);

  // Keep in-sync with application store (SSE may update appStore.application map)
  useEffect(() => {
    console.log('🔍 [DashboardPage] useEffect: Syncing with application store');
    const apps = Object.values(appStore.applications || {});
    console.log('🔍 [DashboardPage] Application store has', apps.length, 'applications');
    console.log('🔍 [DashboardPage] Application store applications:', apps);
    setRecentApplications(apps);
  }, [appStore.applications]);

  // Load available skills when skills modal opens
  useEffect(() => {
    if (!editSkillsOpen) {
      console.log('🔍 [DashboardPage] Skills modal not open, skipping skills fetch');
      return;
    }

    console.log('🔍 [DashboardPage] useEffect: Loading available skills for modal');
    let mounted = true;
    const fetchSkills = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/skills` : '/api/skills';
        console.log('🔍 [DashboardPage] Fetching skills from URL:', url);

        const res = await fetch(url, { cache: 'no-store' });
        console.log('🔍 [DashboardPage] Skills API response status:', res.status);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] Skills API returned non-ok status:', res.status);
          return;
        }

        const skills = await res.json();
        console.log('🔍 [DashboardPage] Skills API response data:', skills);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating skills');
          return;
        }

        const skillsArray = Array.isArray(skills) ? skills : [];
        console.log('🔍 [DashboardPage] Setting available skills:', skillsArray.length, 'skills');
        setAvailableSkills(skillsArray);
      } catch (e) {
        console.error('🔍 [DashboardPage] Failed to fetch skills:', e);
      }
    };
    fetchSkills();
    return () => {
      console.log('🔍 [DashboardPage] Cleaning up skills fetch');
      mounted = false;
    };
  }, [editSkillsOpen, backendBase]);

  // Load profile fields when profile modal opens (or on mount)
  useEffect(() => {
    console.log('🔍 [DashboardPage] useEffect: Loading profile fields for modal');
    let mounted = true;
    const fetchFields = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        const url = base ? `${base}/api/profile-fields` : '/api/profile-fields';
        console.log('🔍 [DashboardPage] Fetching profile fields for modal from URL:', url);

        const res = await fetch(url, { cache: 'no-store' });
        console.log('🔍 [DashboardPage] Profile fields modal API response status:', res.status);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] Profile fields modal API returned non-ok status:', res.status);
          return;
        }

        const fields = await res.json();
        console.log('🔍 [DashboardPage] Profile fields modal API response data:', fields);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating profile fields for modal');
          return;
        }

        const fieldsArray = Array.isArray(fields) ? fields : [];
        console.log('🔍 [DashboardPage] Setting profile fields for modal:', fieldsArray.length, 'fields');
        setProfileFields(fieldsArray);
      } catch (e) {
        console.error('🔍 [DashboardPage] Failed to fetch profile fields for modal:', e);
      }
    };
    fetchFields();
    return () => {
      console.log('🔍 [DashboardPage] Cleaning up profile fields modal fetch');
      mounted = false;
    };
  }, [backendBase]);

  // keep profile form and skills form in sync with current user
  useEffect(() => {
    // initialize profile form with admin-defined profile fields if available
    const baseForm: any = {
      name: user.name || '',
      email: user.email || '',
      phone: (user as any).phone || '',
      batch: (user as any).batch || '',
    };
    (profileFields || []).forEach((f: any) => {
      baseForm[f.key] = (user as any)[f.key] ?? '';
    });
    setProfileForm(baseForm);
    setSkillsForm(Array.from(new Set(user.skills || [])));
  }, [user, profileFields]);

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
        console.warn('failed to save profile', await res.text());
      }
    } catch (e) {
      console.error('saveProfile error', e);
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
        console.warn('failed to save skills', await res.text());
      }
    } catch (e) {
      console.error('saveSkills error', e);
    } finally {
      setSavingSkills(false);
    }
  };

  console.log('🔍 [DashboardPage] Rendering component');
  console.log('🔍 [DashboardPage] Current user:', user);
  console.log('🔍 [DashboardPage] Matched jobs count:', matchedJobs.length);
  console.log('🔍 [DashboardPage] Recent applications count:', recentApplications.length);
  console.log('🔍 [DashboardPage] Profile fields count:', profileFields.length);
  console.log('🔍 [DashboardPage] Available skills count:', availableSkills.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'User'}! Here's your job search overview.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="matches">Job Matches</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matched Jobs</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{matchedJobs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Jobs that match your profile
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Skills</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user?.skills?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Skills in your profile
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Job Matches</CardTitle>
              </CardHeader>
              <CardContent>
                {matchedJobs.length > 0 ? (
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
                            {job.skills?.slice(0, 3).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button size="sm">Apply Now</Button>
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
