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
  console.log('🔍 [DashboardPage] ========== COMPONENT RENDER START ==========');
  console.log('🔍 [DashboardPage] Component rendered/updated at', new Date().toISOString());
  console.log('🔍 [DashboardPage] BUILD VERSION: 2025-01-21-V2-FETCH-FIX');

  const { user, isAuthenticated, logout } = useAuthStore();
  const [skillsRating, setSkillsRating] = useState<any>({});
  
  console.log('🔍 [DashboardPage] *** AUTH STATE CHECK ***');
  console.log('🔍 [DashboardPage] isAuthenticated:', isAuthenticated);
  console.log('🔍 [DashboardPage] user exists:', !!user);
  console.log('🔍 [DashboardPage] user id:', user?.id);
  console.log('🔍 [DashboardPage] user email:', user?.email);
  console.log('🔍 [DashboardPage] Auth state:', { isAuthenticated, user: user ? { id: user.id, name: user.name, email: user.email, tier: user.tier } : null });
  console.log('🔍 [DashboardPage] Local skillsRating state:', skillsRating);
  console.log('🔍 [DashboardPage] Local skillsRating keys count:', Object.keys(skillsRating).length);

  if (!isAuthenticated || !user) {
    console.log('🔍 [DashboardPage] ❌ User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('🔍 [DashboardPage] ✅ User authenticated, proceeding with dashboard render');

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
  const [totalMatchedJobsCount, setTotalMatchedJobsCount] = useState(0); // Total count from database at current threshold
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
    console.log('🔍 [DashboardPage] ========== MOUNT EFFECT: FETCH USER PROFILE ==========');
    console.log('🔍 [DashboardPage] useEffect fired - checking user...');
    console.log('🔍 [DashboardPage] user:', user);
    console.log('🔍 [DashboardPage] user?.id:', user?.id);
    
    if (!user || !user.id) {
      console.log('🔍 [DashboardPage] ❌ No user or user.id, skipping profile fetch');
      return;
    }

    console.log('🔍 [DashboardPage] ✅ Starting to fetch full user profile');
    let mounted = true;

    const fetchUserProfile = async () => {
      try {
        const base = '';  // Use relative URL for CORS compatibility
        const url = `/api/users/${user.id}`;
        console.log('🔍 [DashboardPage] 📡 FETCH REQUEST to:', url);

        const token = localStorage.getItem('token');
        console.log('🔍 [DashboardPage] Token from localStorage:', !!token, 'length:', token?.length);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('🔍 [DashboardPage] Sending fetch with headers:', Object.keys(headers));
        const res = await fetch(url, {
          cache: 'no-store',
          headers,
        });
        
        console.log('🔍 [DashboardPage] 📥 API RESPONSE - Status:', res.status, 'OK:', res.ok);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] ❌ Failed with status:', res.status);
          const errorText = await res.text();
          console.warn('🔍 [DashboardPage] Error response:', errorText);
          return;
        }

        const userData = await res.json();
        console.log('🔍 [DashboardPage] 📊 PARSED USER DATA');
        console.log('🔍 [DashboardPage]   userData:', userData);
        console.log('🔍 [DashboardPage]   userData.skillsRating:', userData?.skillsRating);
        console.log('🔍 [DashboardPage]   skillsRating type:', typeof userData?.skillsRating);
        console.log('🔍 [DashboardPage]   skillsRating keys:', userData?.skillsRating ? Object.keys(userData.skillsRating) : []);
        console.log('🔍 [DashboardPage]   skillsRating count:', userData?.skillsRating ? Object.keys(userData.skillsRating).length : 0);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating');
          return;
        }

        // Update local skillsRating state
        if (userData?.skillsRating) {
          console.log('🔍 [DashboardPage] ✅ SETTING LOCAL SKILLSRATING STATE with', Object.keys(userData.skillsRating).length, 'skills');
          setSkillsRating(userData.skillsRating);
          console.log('🔍 [DashboardPage] setSkillsRating called');
        } else {
          console.log('🔍 [DashboardPage] ⚠️ No skillsRating in userData');
        }

        // Update user in auth store
        if (userData) {
          console.log('🔍 [DashboardPage] ✅ Updating auth store with userData');
          const { updateUserFromBackend } = useAuthStore.getState();
          updateUserFromBackend(userData);
        }
      } catch (e) {
        console.error('🔍 [DashboardPage] ❌ FETCH ERROR:', e);
      }
    };

    console.log('🔍 [DashboardPage] Calling fetchUserProfile immediately');
    fetchUserProfile();
    
    return () => {
      console.log('🔍 [DashboardPage] Mount effect cleanup');
      mounted = false;
    };
  }, []);

  // Fetch matched jobs from backend (top matches). Keep lightweight and update periodically.
  useEffect(() => {
    console.log('🔍 [DashboardPage] useEffect: Fetching matched jobs');
    let mounted = true;
    const fetchMatches = async () => {
      try {
        const base = backendBase ? backendBase.replace(/\/$/, '') : '';
        // Use the AI matching endpoint to get best-fit jobs
        const url = base 
          ? `${base}/api/ai/best-fit-jobs/${user.id}?page=1&limit=50` 
          : `/api/ai/best-fit-jobs/${user.id}?page=1&limit=50`;
        console.log('🔍 [DashboardPage] Fetching matched jobs from URL:', url);

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
        console.log('🔍 [DashboardPage] Matched jobs API response status:', res.status);

        if (!res.ok) {
          console.warn('🔍 [DashboardPage] Matched jobs API returned non-ok status:', res.status);
          return;
        }

        const data = await res.json();
        console.log('🔍 [DashboardPage] Matched jobs API response data:', data);

        if (!mounted) {
          console.log('🔍 [DashboardPage] Component unmounted, not updating jobs');
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
        
        console.log('🔍 [DashboardPage] Setting matched jobs:', jobsArray.length, 'jobs (total:', totalCount, 'at', data.pagination?.minScore || 70, '%)');
        setMatchedJobs(jobsArray);
        setTotalMatchedJobsCount(totalCount);
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

  console.log('🔍 [DashboardPage] ========== RENDER STATE SNAPSHOT ==========');
  console.log('🔍 [DashboardPage] Final component state before JSX render:');
  console.log('🔍 [DashboardPage]   - skillsRating:', skillsRating);
  console.log('🔍 [DashboardPage]   - skillsRating keys:', Object.keys(skillsRating));
  console.log('🔍 [DashboardPage]   - skillsRating count:', Object.keys(skillsRating).length);
  console.log('🔍 [DashboardPage]   - matchedJobs count:', matchedJobs.length);
  console.log('🔍 [DashboardPage]   - recentApplications count:', recentApplications.length);
  console.log('🔍 [DashboardPage]   - profileFields count:', profileFields.length);
  console.log('🔍 [DashboardPage]   - availableSkills count:', availableSkills.length);
  console.log('🔍 [DashboardPage] ========== JSX RENDER START ==========');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || 'User'}! Here's your job search overview.
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
                  Jobs that match your profile (≥70%)
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
                    console.log('🔍 [DashboardPage] RENDERING BADGE FOR SKILL:', skill);
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
