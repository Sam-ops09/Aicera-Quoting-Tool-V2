import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, FileText, DollarSign, Target, Calendar, PieChart, MapPin, Users, Activity, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface AnalyticsData {
  overview: {
    totalQuotes: number;
    totalRevenue: string;
    avgQuoteValue: string;
    conversionRate: string;
  };
  monthlyData: Array<{
    month: string;
    quotes: number;
    revenue: number;
    conversions: number;
  }>;
  topClients: Array<{
    name: string;
    totalRevenue: string;
    quoteCount: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    value: number;
  }>;
}

interface RevenueForecast {
  month: string;
  forecastedRevenue: number;
  confidence: number;
}

interface DealDistribution {
  range: string;
  count: number;
  totalValue: number;
  percentage: number;
}

interface RegionalData {
  region: string;
  quoteCount: number;
  totalRevenue: number;
  percentage: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  totalValue: number;
  avgDealValue: number;
}

interface CompetitorInsights {
  avgQuoteValue: number;
  medianQuoteValue: number;
  quoteFrequency: number;
  conversionTrend: number;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("12");
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", timeRange],
  });

  const { data: forecast } = useQuery<RevenueForecast[]>({
    queryKey: ["/api/analytics/forecast"],
  });

  const { data: dealDistribution } = useQuery<DealDistribution[]>({
    queryKey: ["/api/analytics/deal-distribution"],
  });

  const { data: regionalData } = useQuery<RegionalData[]>({
    queryKey: ["/api/analytics/regional"],
  });

  const { data: pipeline } = useQuery<PipelineStage[]>({
    queryKey: ["/api/analytics/pipeline"],
  });

  const { data: insights } = useQuery<CompetitorInsights>({
    queryKey: ["/api/analytics/competitor-insights"],
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground font-['Open_Sans'] mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {data && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
                    <FileText className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{data.overview.totalQuotes}</div>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-1">
                      In selected period
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-5 w-5 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-secondary">₹{data.overview.totalRevenue}</div>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-1">
                      From approved quotes
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-foreground">₹{data.overview.avgQuoteValue}</div>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-1">
                      Average deal size
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <Target className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-accent">{data.overview.conversionRate}%</div>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-1">
                      Quote to invoice
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue & Quote Trends</CardTitle>
                    <CardDescription>Monthly performance overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Revenue (₹)"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="quotes"
                          stroke="hsl(var(--accent))"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Quotes"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Clients by Revenue</CardTitle>
                    <CardDescription>Your most valuable clients</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.topClients.slice(0, 5).map((client, index) => (
                        <div
                          key={client.name}
                          className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-xs text-muted-foreground font-['Open_Sans']">
                                {client.quoteCount} quotes
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">₹{client.totalRevenue}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quote Status Breakdown</CardTitle>
                  <CardDescription>Distribution across all stages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.statusBreakdown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="status" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Count" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" name="Value (₹)" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Forecasting Tab */}
        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Forecast
                </CardTitle>
                <CardDescription>Predicted revenue for upcoming months</CardDescription>
              </CardHeader>
              <CardContent>
                {forecast && forecast.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="forecastedRevenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Forecasted Revenue (₹)"
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No forecast data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forecast Confidence</CardTitle>
                <CardDescription>Reliability of predictions</CardDescription>
              </CardHeader>
              <CardContent>
                {forecast && forecast.length > 0 ? (
                  <div className="space-y-4">
                    {forecast.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.month}</span>
                          <Badge variant="outline">
                            {(item.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                        <Progress value={item.confidence * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Forecasted: ₹{item.forecastedRevenue.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No confidence data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Sales Pipeline
                </CardTitle>
                <CardDescription>Quotes at each stage</CardDescription>
              </CardHeader>
              <CardContent>
                {pipeline && pipeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pipeline} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="stage" type="category" className="text-xs" width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Quote Count" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No pipeline data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Metrics</CardTitle>
                <CardDescription>Value and averages by stage</CardDescription>
              </CardHeader>
              <CardContent>
                {pipeline && pipeline.length > 0 ? (
                  <div className="space-y-4">
                    {pipeline.map((stage, index) => (
                      <div key={index} className="p-3 rounded-md border space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="capitalize">
                            {stage.stage}
                          </Badge>
                          <span className="text-sm font-semibold">{stage.count} quotes</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Value</p>
                            <p className="font-semibold">₹{stage.totalValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Deal</p>
                            <p className="font-semibold">₹{stage.avgDealValue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No metrics available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Deal Distribution
                </CardTitle>
                <CardDescription>Quotes by value range</CardDescription>
              </CardHeader>
              <CardContent>
                {dealDistribution && dealDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={dealDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {dealDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="font-semibold">{data.range}</p>
                                <p className="text-sm">Count: {data.count}</p>
                                <p className="text-sm">Value: ₹{data.totalValue.toLocaleString()}</p>
                                <p className="text-sm">{data.percentage.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => `${entry.payload.range} (${entry.payload.count})`}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No distribution data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Regional Distribution
                </CardTitle>
                <CardDescription>Sales by region</CardDescription>
              </CardHeader>
              <CardContent>
                {regionalData && regionalData.length > 0 ? (
                  <div className="space-y-4">
                    {regionalData.map((region, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{region.region}</span>
                          <Badge variant="outline">
                            {region.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={region.percentage} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{region.quoteCount} quotes</span>
                          <span>₹{region.totalRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No regional data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {insights && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
                    <DollarSign className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{insights.avgQuoteValue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Market average
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Median Quote</CardTitle>
                    <BarChart3 className="h-5 w-5 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{insights.medianQuoteValue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Middle point value
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quote Frequency</CardTitle>
                    <Activity className="h-5 w-5 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insights.quoteFrequency}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quotes per week
                    </p>
                  </CardContent>
                </Card>

                <Card className="hover-elevate">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Trend</CardTitle>
                    <TrendingUp className="h-5 w-5 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{insights.conversionTrend.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Overall conversion
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Market Insights
                  </CardTitle>
                  <CardDescription>Competitive analysis and benchmarks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="font-semibold mb-2">Deal Size Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        Your average quote value of ₹{insights.avgQuoteValue.toLocaleString()} with a median of
                        ₹{insights.medianQuoteValue.toLocaleString()} indicates{' '}
                        {insights.avgQuoteValue > insights.medianQuoteValue
                          ? 'some high-value outliers pulling the average up'
                          : 'consistent deal sizes across your portfolio'
                        }.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                      <h4 className="font-semibold mb-2">Activity Level</h4>
                      <p className="text-sm text-muted-foreground">
                        With {insights.quoteFrequency} quotes generated per week, your quoting activity is{' '}
                        {insights.quoteFrequency > 10 ? 'very high' : insights.quoteFrequency > 5 ? 'healthy' : 'moderate'}.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                      <h4 className="font-semibold mb-2">Conversion Performance</h4>
                      <p className="text-sm text-muted-foreground">
                        Your {insights.conversionTrend.toFixed(1)}% conversion rate is{' '}
                        {insights.conversionTrend > 30 ? 'excellent' : insights.conversionTrend > 20 ? 'good' : 'below industry average'}.
                        {insights.conversionTrend < 20 && ' Consider reviewing your pricing strategy and follow-up process.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
