import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Pricing() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/payments');
        if (res.ok) setPlans((await res.json()).plans || []);
      } catch (e) { console.error(e); }
    }
    load();

    // dynamically inject Razorpay SDK
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const handleBuy = async (planId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch('/api/payments/create-order', { method: 'POST', headers, body: JSON.stringify({ planId }) });
      if (!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      const { order, key } = json;

      const options: any = {
        key,
        amount: order.amount,
        order_id: order.id,
        currency: 'INR',
        name: 'JobIntel Premium',
        description: 'Yearly Premium',
        handler: async function (response: any) {
          try {
            const vresp = await fetch('/api/payments/verify', { method: 'POST', headers, body: JSON.stringify(response) });
            if (!vresp.ok) throw new Error(await vresp.text());
            toast({ title: 'Payment successful', variant: 'default' });
            // reload user
            window.location.reload();
          } catch (e) { toast({ title: 'Verification failed', description: String(e), variant: 'destructive' }); }
        },
        prefill: {},
        theme: { color: '#3b82f6' }
      };

      // open Razorpay
      // @ts-ignore
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
;
      toast({ title: 'Purchase failed', description: String(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pricing</h1>
      <p className="text-muted-foreground">Choose a plan that suits you</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle>{p.name} {p.price > 0 ? `- ₹${p.price}/yr` : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 mb-4">
                {(p.features || []).map((f: string, i: number) => (<li key={i}>{f}</li>))}
              </ul>
              {p.id !== 'free' ? (
                <Button onClick={() => handleBuy(p.id)} disabled={loading}>Buy</Button>
              ) : (
                <Button variant="outline">Use Free</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
