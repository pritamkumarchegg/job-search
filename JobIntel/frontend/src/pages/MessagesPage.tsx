import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with employers and recruiters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your messages will appear here. This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}