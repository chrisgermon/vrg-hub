import { MarketingCalendarView } from '@/components/marketing/MarketingCalendarView';

export default function MarketingCalendar() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Calendar</h1>
        <p className="text-muted-foreground">
          View scheduled Notifyre fax campaigns and Mailchimp email campaigns
        </p>
      </div>

      <MarketingCalendarView />
    </div>
  );
}
