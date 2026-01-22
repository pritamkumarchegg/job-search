import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, MessageCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  _id: string;
  senderId: { _id: string; name: string; email: string };
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
  replies?: Array<{
    senderId: { _id: string; name: string; email: string };
    body: string;
    createdAt: string;
  }>;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/messages', {
          headers,
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        } else {
          setMessages([]);
        }
      } catch (err) {
;
        toast({
          title: 'Error',
          description: 'Failed to load messages',
          variant: 'destructive',
        });
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [toast]);

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedMessage) return;

    try {
      setSendingReply(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/messages/${selectedMessage._id}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: reply }),
      });

      if (res.ok) {
        const updatedMessage = await res.json();
        setSelectedMessage(updatedMessage);
        setReply('');
        toast({
          title: 'Success',
          description: 'Reply sent successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send reply',
          variant: 'destructive',
        });
      }
    } catch (err) {
;
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with employers and recruiters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Inbox ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No messages yet
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <button
                      key={msg._id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedMessage?._id === msg._id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-semibold truncate">
                          {msg.senderId.name}
                        </span>
                        {!msg.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-xs truncate opacity-75">
                        {msg.subject}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Content */}
        <div className="md:col-span-2">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedMessage.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      From: {selectedMessage.senderId.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedMessage.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!selectedMessage.read && <Badge>New</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{selectedMessage.body}</p>
                </div>

                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="space-y-3 py-4 border-t">
                    <h4 className="font-semibold text-sm">Replies:</h4>
                    {selectedMessage.replies.map((reply, idx) => (
                      <div key={idx} className="bg-muted p-3 rounded-lg">
                        <p className="text-xs font-semibold mb-1">
                          {reply.senderId.name}
                        </p>
                        <p className="text-sm">{reply.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(reply.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Your Reply
                  </label>
                  <Textarea
                    placeholder="Type your reply here..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="resize-none h-32"
                  />
                </div>

                <Button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sendingReply}
                  className="w-full"
                >
                  {sendingReply && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">
                  Select a message to read
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
