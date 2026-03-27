'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface MappedEvent {
  id: string;
  title: string;
  date: string;
  views: number;
  clicks: number;
  rsvps: number;
  tickets: number;
  revenue: number;
}

export default function AnalyticsDashboard() {
  const t = useTranslations('dashboard');
  const supabase = createClient();
  const [data, setData] = useState<{
    totalFollowers: number,
    totalEvents: number,
    totalTicketsSold: number,
    revenue: number,
    profileViews: number,
    recentEvents: MappedEvent[]
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch creator stats
        const { data: stats } = await supabase
          .from('creator_stats')
          .select('total_followers, total_profile_views')
          .eq('creator_id', user.id)
          .single();

        // Fetch recent events
        const { data: events } = await supabase
          .from('events')
          .select(`
            id, title, created_at,
            event_analytics ( views, clicks, tickets_sold, revenue )
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        let totalRevenue = 0;
        let totalTickets = 0;
        let mappedEvents: MappedEvent[] = [];

        if (events) {
          events.forEach((ev: any) => {
            const analytics = ev.event_analytics || [];
            const sumViews = analytics.reduce((a: number, b: any) => a + (b.views || 0), 0);
            const sumClicks = analytics.reduce((a: number, b: any) => a + (b.clicks || 0), 0);
            const sumTickets = analytics.reduce((a: number, b: any) => a + (b.tickets_sold || 0), 0);
            const sumRev = analytics.reduce((a: number, b: any) => a + (b.revenue || 0), 0);
            
            totalTickets += sumTickets;
            totalRevenue += sumRev;
            mappedEvents.push({
              id: ev.id,
              title: ev.title,
              date: ev.created_at,
              views: sumViews,
              clicks: sumClicks,
              rsvps: sumTickets,
              tickets: sumTickets,
              revenue: sumRev
            });
          });
        }

        setData({
          totalFollowers: stats?.total_followers || 0,
          totalEvents: events?.length || 0,
          totalTicketsSold: totalTickets,
          revenue: totalRevenue,
          profileViews: stats?.total_profile_views || 0,
          recentEvents: mappedEvents
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalytics();
  }, [supabase]);

  if (loading || !data) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">{t('creatorHub')}</h1>
          <p className="text-vibe-text-secondary">{t('analyticsSubtitle')}</p>
        </div>
        <Button variant="outline" className="text-xs">
          {t('downloadCsv')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border-vibe-purple/20 bg-vibe-purple/5">
          <p className="text-vibe-text-secondary text-xs uppercase font-bold mb-1">{t('ticketsSold')}</p>
          <p className="text-3xl font-bold font-display text-white">{data.totalTicketsSold.toLocaleString()}</p>
          <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
            <span>↑ 12%</span> {t('thisMonth')}
          </p>
        </Card>
        
        <Card className="p-5 bg-white/5 border-white/10">
          <p className="text-vibe-text-secondary text-xs uppercase font-bold mb-1">{t('revenueKpi')}</p>
          <p className="text-3xl font-bold font-display text-vibe-green">{data.revenue.toLocaleString()}</p>
          <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
            <span>↑ 8%</span> {t('thisMonth')}
          </p>
        </Card>

        <Card className="p-5 bg-white/5 border-white/10">
          <p className="text-vibe-text-secondary text-xs uppercase font-bold mb-1">{t('profileViews')}</p>
          <p className="text-3xl font-bold font-display text-white">{data.profileViews.toLocaleString()}</p>
          <p className="text-vibe-pink text-xs mt-2 flex items-center gap-1">
            <span>↑ 24%</span> {t('thisMonth')}
          </p>
        </Card>

        <Card className="p-5 bg-white/5 border-white/10">
          <p className="text-vibe-text-secondary text-xs uppercase font-bold mb-1">{t('followersCovered')}</p>
          <p className="text-3xl font-bold font-display text-white">{data.totalFollowers.toLocaleString()}</p>
          <p className="text-vibe-text-secondary text-xs mt-2">
            {t('reachMore')}
          </p>
        </Card>
      </div>

      {/* Table Section */}
      <h2 className="text-xl font-bold mb-4">{t('recentEvents')}</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-vibe-text-secondary">
            <tr>
              <th className="px-6 py-4 font-semibold">{t('eventTitle')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('views')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('ctr')}</th>
              <th className="px-6 py-4 font-semibold text-right">{t('tickets')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.recentEvents.map((evt, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{evt.title}</td>
                <td className="px-6 py-4 text-right">{evt.views.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-vibe-purple font-semibold">
                  {evt.views > 0 ? Math.round((evt.clicks / evt.views) * 100) : 0}%
                </td>
                <td className="px-6 py-4 text-right font-bold text-vibe-green">{evt.tickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
