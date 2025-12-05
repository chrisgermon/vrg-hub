import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarDays } from "lucide-react";

const events = [
  { 
    title: "Staff Training Session", 
    date: "Dec 10",
    day: "Tue",
    time: "2:00 PM"
  },
  { 
    title: "Monthly Team Meeting", 
    date: "Dec 15",
    day: "Sun",
    time: "10:00 AM"
  },
  { 
    title: "Equipment Maintenance", 
    date: "Dec 18",
    day: "Wed",
    time: "9:00 AM"
  },
];

export function UpcomingEventsCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-lg px-2 py-1.5 min-w-[50px]">
                <span className="text-xs font-medium uppercase">{event.day}</span>
                <span className="text-sm font-bold">{event.date.split(" ")[1]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {event.title}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {event.date} at {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
