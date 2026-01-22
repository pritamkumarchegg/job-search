import { useEffect, useState } from 'react';
import {
  Briefcase,
  Users,
  Bell,
  TrendingUp,
  Activity,
  DollarSign,
  FileText,
  Zap,
  Loader2,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface AdminStatsData {
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  totalApplications: number;
  applicationsToday: number;
  notificationsSent: number;
}

interface AnalyticsData {
  date: string;
  posted?: number;
  jobs?: number;
  revenue?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [jobAnalytics, setJobAnalytics] = useState<AnalyticsData[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [statsRes, jobRes, userRes] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/analytics/jobs', { headers }),
          fetch('/api/admin/analytics/users', { headers }),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setJobAnalytics(jobData);
        }
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserAnalytics(userData);
        }
      } catch (err) {
        setError('Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs sm:text-base text-muted-foreground">Welcome back, Admin. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4\">
        <StatsCard
          title="Total Jobs"
          value={formatNumber(stats?.totalJobs || 0)}
          change={`${stats?.activeJobs || 0} active`}
          changeType="positive"
          icon={Briefcase}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatsCard
          title="Active Jobs"
          value={formatNumber(stats?.activeJobs || 0)}
          change={`${stats?.pendingJobs || 0} pending`}
          changeType="neutral"
          icon={Activity}
          iconColor="bg-green-100 text-green-600"
        />
        <StatsCard
          title="Applications"
          value={formatNumber(stats?.totalApplications || 0)}
          change={`${stats?.applicationsToday || 0} today`}
          changeType="positive"
          icon={FileText}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatsCard
          title="Notifications Sent"
          value={formatNumber(stats?.notificationsSent || 0)}
          change="This period"
          changeType="neutral"
          icon={Bell}
          iconColor="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Analytics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Analytics - Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="posted" fill="#3b82f6" name="Jobs Posted" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Postings - Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userAnalytics}>
                  <defs>
                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="jobs"
                    stroke="#3b82f6"
                    fill="url(#colorJobs)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Posting Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="posted" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/admin/jobs"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
            >
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Add New Job</p>
                <p className="text-sm text-muted-foreground">Post a new job listing</p>
              </div>
            </a>
            <a
              href="/admin/notifications"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
            >
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Send Notification</p>
                <p className="text-sm text-muted-foreground">Broadcast to users</p>
              </div>
            </a>
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-muted-foreground">View user analytics</p>
              </div>
            </a>
            <a
              href="/admin/crawlers"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted"
            >
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Crawler Status</p>
                <p className="text-sm text-muted-foreground">Monitor job crawlers</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
