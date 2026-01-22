import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, CreditCard, Eye, Loader2, RefreshCw } from 'lucide-react';

interface RevenueMonth {
  date: string;
  revenue: number;
  transactionCount: number;
}

interface RevenueResponse {
  monthlyData: RevenueMonth[];
  totalRevenue: number;
  averageMonthlyRevenue: number;
  timestamp: string;
}

export default function AdminRevenue() {
  const [monthlyData, setMonthlyData] = useState<RevenueMonth[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageMonthlyRevenue, setAverageMonthlyRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchData = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch('/api/admin/analytics/revenue', { headers });
      
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data: RevenueResponse = await res.json();
          setMonthlyData(data.monthlyData);
          setTotalRevenue(data.totalRevenue);
          setAverageMonthlyRevenue(data.averageMonthlyRevenue);
          setLastUpdated(new Date().toLocaleTimeString());
        } else {
          setError('Server returned non-JSON response. Please ensure you are logged in as an admin.');
        }
      } else if (res.status === 401) {
        setError('Unauthorized. Please log in as an admin.');
      } else {
        setError(`Failed to fetch revenue data: ${res.statusText}`);
      }
    } catch (err) {
      setError('Failed to fetch revenue data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
          <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">Track and manage revenue streams</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  const yearlyProjection = averageMonthlyRevenue * 12;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
          <p className="text-muted-foreground">Track and manage revenue streams - Real-time data from database</p>
          {lastUpdated && <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated}</p>}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(2)}L</div>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(averageMonthlyRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">Average per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyData.reduce((sum, m) => sum + m.transactionCount, 0)}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Projected Yearly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(yearlyProjection / 100000).toFixed(2)}L</div>
            <p className="text-xs text-muted-foreground">Projected annually</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend - Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Count by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="transactionCount" stroke="#f59e0b" name="Transactions" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              ✅ <strong>Real-time Data:</strong> Revenue data is fetched directly from the database in real-time.
            </p>
            <p>
              ✅ <strong>Automatic Tracking:</strong> Revenue is created automatically when a job is posted (₹500 per job).
            </p>
            <p>
              ✅ <strong>Database Model:</strong> All revenue is stored in the Revenue collection with full transaction details.
            </p>
            <p>
              ✅ <strong>Auto Refresh:</strong> Data refreshes automatically every 5 minutes.
            </p>
            <p>
              📊 <strong>Metrics:</strong> Total Revenue, Monthly Average, Transaction Count, and Yearly Projection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
