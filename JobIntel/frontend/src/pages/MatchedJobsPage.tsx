import { useState, useEffect, useMemo } from 'react';
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
import {
  Loader2,
  MapPin,
  Building2,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Zap,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MatchedJob {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    location?: string;
    meta?: {
      rawData?: {
        employer_name?: string;
      };
    };
  };
  scores: {
    skill: number;
    role: number;
    level: number;
    experience: number;
    location: number;
    workMode: number;
  };
  totalScore: number;
  matchType: 'excellent' | 'good' | 'okay' | 'poor';
  breakdown: {
    skillsMatched: string[];
    skillsMissing: string[];
    roleMatch: string;
    levelMatch: string;
    locationNote: string;
  };
  confidence: number;
  status: 'matched' | 'viewed' | 'applied' | 'rejected';
  createdAt?: Date;
  viewedAt?: Date;
  appliedAt?: Date;
}

interface MatchStats {
  excellent: number;
  good: number;
  okay: number;
  poor: number;
  averageScore: number;
  totalMatches: number;
}

const matchTypeColors = {
  excellent: 'bg-green-100 text-green-800 border-green-300',
  good: 'bg-blue-100 text-blue-800 border-blue-300',
  okay: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  poor: 'bg-red-100 text-red-800 border-red-300',
};

const matchTypeIcons = {
  excellent: '⭐⭐⭐⭐⭐',
  good: '⭐⭐⭐⭐',
  okay: '⭐⭐⭐',
  poor: '⭐⭐',
};

export default function MatchedJobsPage() {
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const matchesPerPage = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatchTypes, setSelectedMatchTypes] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'confidence'>('score');

  const { toast } = useToast();

  // Fetch matched jobs
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/matching/my-jobs?limit=1000', {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const matchesArray = Array.isArray(data) ? data : data.matches || [];
          console.log('✅ Matched jobs loaded:', matchesArray.length);
          setMatches(matchesArray);
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load matched jobs',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err);
        toast({
          title: 'Error',
          description: 'Failed to load matched jobs',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [toast]);

  // Calculate statistics
  const stats = useMemo(() => {
    const result: MatchStats = {
      excellent: 0,
      good: 0,
      okay: 0,
      poor: 0,
      averageScore: 0,
      totalMatches: matches.length,
    };

    let totalScore = 0;
    matches.forEach((match) => {
      if (match.matchType === 'excellent') result.excellent++;
      else if (match.matchType === 'good') result.good++;
      else if (match.matchType === 'okay') result.okay++;
      else if (match.matchType === 'poor') result.poor++;
      totalScore += match.totalScore;
    });

    result.averageScore =
      matches.length > 0 ? Math.round(totalScore / matches.length) : 0;
    return result;
  }, [matches]);

  // Apply filters and sorting
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (match) =>
          match.jobId.title.toLowerCase().includes(query) ||
          (match.jobId.meta?.rawData?.employer_name || '')
            .toLowerCase()
            .includes(query) ||
          (match.jobId.location || '').toLowerCase().includes(query)
      );
    }

    // Match type filter
    if (selectedMatchTypes.length > 0) {
      filtered = filtered.filter((match) =>
        selectedMatchTypes.includes(match.matchType)
      );
    }

    // Score filter
    if (minScore > 0) {
      filtered = filtered.filter((match) => match.totalScore >= minScore);
    }

    // Sorting
    if (sortBy === 'score') {
      filtered.sort((a, b) => b.totalScore - a.totalScore);
    } else if (sortBy === 'recent') {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === 'confidence') {
      filtered.sort((a, b) => b.confidence - a.confidence);
    }

    return filtered;
  }, [matches, searchQuery, selectedMatchTypes, minScore, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);
  const startIdx = (currentPage - 1) * matchesPerPage;
  const paginatedMatches = filteredMatches.slice(
    startIdx,
    startIdx + matchesPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMatchTypes, minScore, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMatchTypes([]);
    setMinScore(0);
    setSortBy('score');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-8 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold">Your Matched Jobs</h1>
        </div>
        <p className="text-muted-foreground">
          {stats.totalMatches} job matches based on your resume and skills
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {stats.excellent}
            </div>
            <p className="text-sm text-muted-foreground">Excellent Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.good}</div>
            <p className="text-sm text-muted-foreground">Good Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.okay}</div>
            <p className="text-sm text-muted-foreground">Okay Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.poor}</div>
            <p className="text-sm text-muted-foreground">Poor Matches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {stats.averageScore}
            </div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
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

            {/* Toggle Filters */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                {/* Match Type Filter */}
                <div className="space-y-3">
                  <Label className="font-semibold">Match Quality</Label>
                  <div className="space-y-2">
                    {['excellent', 'good', 'okay', 'poor'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedMatchTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            setSelectedMatchTypes(
                              checked
                                ? [...selectedMatchTypes, type]
                                : selectedMatchTypes.filter((t) => t !== type)
                            );
                          }}
                        />
                        <Label
                          htmlFor={`type-${type}`}
                          className="text-sm cursor-pointer capitalize"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score Filter */}
                <div className="space-y-3">
                  <Label className="font-semibold">Minimum Score</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-semibold text-primary min-w-fit">
                      {minScore}%
                    </span>
                  </div>
                </div>

                {/* Sort */}
                <div className="space-y-3">
                  <Label className="font-semibold">Sort By</Label>
                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Highest Score</SelectItem>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Filter Info and Reset */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedMatches.length} of {filteredMatches.length}{' '}
                matches
                {filteredMatches.length !== matches.length &&
                  ` (filtered from ${matches.length})`}
              </div>
              {(searchQuery ||
                selectedMatchTypes.length > 0 ||
                minScore > 0 ||
                sortBy !== 'score') && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matched Jobs Grid */}
      {paginatedMatches.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-12">
              No matches found. Try adjusting your filters or upload a resume to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {paginatedMatches.map((match) => (
            <Card
              key={match._id}
              className={`hover:shadow-lg transition-shadow border-2 ${
                matchTypeColors[match.matchType]
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/jobs/${match.jobId._id}`} className="group flex-1">
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                      {match.jobId.title}
                    </CardTitle>
                  </Link>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {match.totalScore}
                    </div>
                    <p className="text-xs text-muted-foreground">match %</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Company & Location */}
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {match.jobId.meta?.rawData?.employer_name || 'Unknown'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {match.jobId.location || 'Location not specified'}
                  </div>
                </div>

                {/* Match Type Badge */}
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <Badge className={`capitalize ${matchTypeColors[match.matchType]}`}>
                    {matchTypeIcons[match.matchType]} {match.matchType}
                  </Badge>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    SCORE BREAKDOWN
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-muted-foreground">Skills: {match.scores.skill}/40</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-muted-foreground">Role: {match.scores.role}/20</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-muted-foreground">Level: {match.scores.level}/15</p>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                      <p className="text-muted-foreground">Exp: {match.scores.experience}/10</p>
                    </div>
                  </div>
                </div>

                {/* Skills Matched */}
                {match.breakdown.skillsMatched.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-green-600">
                      ✓ SKILLS MATCHED ({match.breakdown.skillsMatched.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.breakdown.skillsMatched.slice(0, 5).map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-800"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {match.breakdown.skillsMatched.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{match.breakdown.skillsMatched.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills Missing */}
                {match.breakdown.skillsMissing.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-yellow-600">
                      ⚠ SKILLS TO LEARN ({match.breakdown.skillsMissing.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.breakdown.skillsMissing.slice(0, 5).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {match.breakdown.skillsMissing.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{match.breakdown.skillsMissing.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Confidence */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${match.confidence}%` }}
                      />
                    </div>
                    <span className="font-semibold">{match.confidence}%</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  to={`/jobs/${match.jobId._id}`}
                  className="block"
                >
                  <Button className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    View Job Details
                  </Button>
                </Link>
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
    </div>
  );
}
