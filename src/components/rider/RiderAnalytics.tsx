"use client";

import { useState } from "react";
import { Calendar, MoreVertical, ArrowUp } from "lucide-react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

const deliveriesData = [
  { hour: "6 AM", deliveries: 2 },
  { hour: "8 AM", deliveries: 1 },
  { hour: "10 AM", deliveries: 0 },
  { hour: "12 PM", deliveries: 0 },
  { hour: "2 PM", deliveries: 1 },
  { hour: "4 PM", deliveries: 3 },
  { hour: "6 PM", deliveries: 5 },
  { hour: "8 PM", deliveries: 8 },
  { hour: "10 PM", deliveries: 12 },
];

export function RiderAnalytics() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
          Deliveries Analytics
        </h3>
        <Button className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto">
          <ArrowUp className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Card with Chart */}
      <Card className="border shadow-sm mt-6">
        <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal h-9 px-3 w-full sm:w-auto"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2025}
                  className="rounded-md border shadow-sm"
                />
              </PopoverContent>
            </Popover>
            <MoreVertical className="w-4 h-4" />
          </div>
        </CardHeader>

        <CardContent>
          {/* Chart Area - Scrollable on small screens */}
          <div className="bg-gray-50 rounded-lg overflow-x-auto">
            {/* force min width so it scrolls */}
            <div className="min-w-[800px] h-72">
              <ChartContainer
                className="h-full w-full"
                config={{
                  type: { label: "Line Chart", color: "black" },
                  title: { label: "Deliveries per Hour" },
                  xKey: { label: "Hour of Day" },
                  yKey: { label: "Deliveries" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={deliveriesData}
                    margin={{
                      left: 12,
                      right: 12,
                      top: 12,
                      bottom: 40, // extra bottom margin for label
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      label={{
                        value: "Hour of Day",
                        position: "insideBottom",
                        offset: -20,
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={40}
                      label={{
                        value: "Deliveries",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Line
                      type="monotone"
                      dataKey="deliveries"
                      stroke="black"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        stroke: "black",
                        strokeWidth: 2,
                        fill: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}