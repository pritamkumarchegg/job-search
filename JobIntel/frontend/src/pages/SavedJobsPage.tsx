import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SavedJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
        <p className="text-muted-foreground">
          Jobs you've saved for later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your saved jobs will appear here. This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}