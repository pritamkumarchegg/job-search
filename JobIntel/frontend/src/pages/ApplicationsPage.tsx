import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
        <p className="text-muted-foreground">
          Track and manage your job applications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your applications will appear here. This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}