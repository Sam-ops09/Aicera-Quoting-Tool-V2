import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FileText, DollarSign, Target, Calendar, PieChart, MapPin, Users, Activity, BarChart3, ArrowUpRight, ArrowDownRight, Download, Filter } from "lucide-react";
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
    Area,
    AreaChart,
    ComposedChart
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                    <Skeleton className="h-24 w-full" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-40" />
                        ))}
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-96" />
                        <Skeleton className="h-96" />
                    </div>
                </div>
            </div>
        );
    }

    const StatCard = ({ title, value, change, icon: Icon, trend, subtitle }: any) => (
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">{title}</p>
                        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
                        {subtitle && (
                            <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${
                        trend === 'up' ? 'bg-emerald-50' : trend === 'down' ? 'bg-red-50' : 'bg-blue-50'
                    }`}>
                        <Icon className={`h-6 w-6 ${
                            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                    </div>
                </div>
                {change && (
                    <div className="flex items-center gap-1 mt-4">
                        {trend === 'up' ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${
                            trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
              {change}
            </span>
                        <span className="text-sm text-slate-500">vs last period</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Business Analytics</h1>
                            <p className="text-slate-600 mt-1">Comprehensive performance metrics and insights</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Filter
                            </Button>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export
                            </Button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                <Calendar className="h-4 w-4 text-slate-600" />
                                <Select value={timeRange} onValueChange={setTimeRange}>
                                    <SelectTrigger className="w-36 border-none shadow-none h-auto p-0 focus:ring-0">
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
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-white p-1 shadow-sm border border-slate-200">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="pipeline" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            Sales Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            Market Insights
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-8">
                        {data && (
                            <>
                                {/* KPI Cards */}
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        title="Total Quotes"
                                        value={data.overview.totalQuotes}
                                        change="+12.5%"
                                        icon={FileText}
                                        trend="up"
                                        subtitle="Active proposals"
                                    />
                                    <StatCard
                                        title="Total Revenue"
                                        value={`₹${data.overview.totalRevenue}`}
                                        change="+23.1%"
                                        icon={DollarSign}
                                        trend="up"
                                        subtitle="Closed deals"
                                    />
                                    <StatCard
                                        title="Average Deal Size"
                                        value={`₹${data.overview.avgQuoteValue}`}
                                        change="+8.3%"
                                        icon={TrendingUp}
                                        trend="up"
                                        subtitle="Per transaction"
                                    />
                                    <StatCard
                                        title="Conversion Rate"
                                        value={`${data.overview.conversionRate}%`}
                                        change="-2.4%"
                                        icon={Target}
                                        trend="down"
                                        subtitle="Quote to close"
                                    />
                                </div>

                                {/* Main Charts */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                                        <CardHeader className="border-b border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-slate-900">Revenue Performance</CardTitle>
                                                    <CardDescription className="text-slate-600">Monthly revenue and quote volume trends</CardDescription>
                                                </div>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Year to Date
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <ResponsiveContainer width="100%" height={320}>
                                                <ComposedChart data={data.monthlyData}>
                                                    <defs>
                                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                    <XAxis
                                                        dataKey="month"
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={{ stroke: '#e2e8f0' }}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={{ stroke: '#e2e8f0' }}
                                                        tickFormatter={(value) => `₹${value}`}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={{ stroke: '#e2e8f0' }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                        }}
                                                    />
                                                    <Legend
                                                        wrapperStyle={{ paddingTop: '20px' }}
                                                        iconType="circle"
                                                    />
                                                    <Area
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="revenue"
                                                        fill="url(#revenueGradient)"
                                                        stroke="#3b82f6"
                                                        strokeWidth={3}
                                                        name="Revenue (₹)"
                                                    />
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="quotes"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={3}
                                                        dot={{ fill: '#8b5cf6', r: 4 }}
                                                        name="Quotes"
                                                    />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-white">
                                        <CardHeader className="border-b border-slate-100">
                                            <CardTitle className="text-lg font-semibold text-slate-900">Top Clients</CardTitle>
                                            <CardDescription className="text-slate-600">Highest revenue contributors</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="space-y-4">
                                                {data.topClients.slice(0, 5).map((client, index) => (
                                                    <div
                                                        key={client.name}
                                                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{client.name}</p>
                                                                <p className="text-xs text-slate-500">{client.quoteCount} quotes</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-slate-900">₹{client.totalRevenue}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Status Breakdown */}
                                <Card className="border-none shadow-sm bg-white">
                                    <CardHeader className="border-b border-slate-100">
                                        <CardTitle className="text-lg font-semibold text-slate-900">Quote Status Distribution</CardTitle>
                                        <CardDescription className="text-slate-600">Performance across all pipeline stages</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={data.statusBreakdown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis
                                                    dataKey="status"
                                                    stroke="#64748b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <YAxis
                                                    stroke="#64748b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#e2e8f0' }}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Legend iconType="circle" />
                                                <Bar dataKey="count" fill="#3b82f6" name="Quote Count" radius={[8, 8, 0, 0]} barSize={40} />
                                                <Bar dataKey="value" fill="#8b5cf6" name="Value (₹)" radius={[8, 8, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>

                    {/* Performance Tab */}
                    <TabsContent value="performance" className="space-y-8">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader className="border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        <CardTitle className="text-lg font-semibold text-slate-900">Revenue Forecast</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-600">Projected revenue for upcoming months</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {forecast && forecast.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={forecast}>
                                                <defs>
                                                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="forecastedRevenue"
                                                    stroke="#10b981"
                                                    fill="url(#forecastGradient)"
                                                    strokeWidth={3}
                                                    name="Forecasted Revenue (₹)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-slate-400">
                                            No forecast data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader className="border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-purple-600" />
                                        <CardTitle className="text-lg font-semibold text-slate-900">Regional Performance</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-600">Sales distribution by region</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {regionalData && regionalData.length > 0 ? (
                                        <div className="space-y-5">
                                            {regionalData.map((region, index) => (
                                                <div key={index} className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-slate-900">{region.region}</span>
                                                        <Badge variant="outline" className="bg-slate-50">
                                                            {region.percentage.toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                    <Progress value={region.percentage} className="h-3" />
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-slate-600">{region.quoteCount} quotes</span>
                                                        <span className="font-semibold text-slate-900">₹{region.totalRevenue.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-slate-400">
                                            No regional data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {dealDistribution && dealDistribution.length > 0 && (
                            <Card className="border-none shadow-sm bg-white">
                                <CardHeader className="border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-pink-600" />
                                        <CardTitle className="text-lg font-semibold text-slate-900">Deal Size Distribution</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-600">Breakdown of quotes by value range</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <RechartsPieChart>
                                                <Pie
                                                    data={dealDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={100}
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
                                                                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                                                                    <p className="font-semibold text-slate-900">{data.range}</p>
                                                                    <p className="text-sm text-slate-600">Count: {data.count}</p>
                                                                    <p className="text-sm text-slate-600">Value: ₹{data.totalValue.toLocaleString()}</p>
                                                                    <p className="text-sm font-semibold text-slate-900">{data.percentage.toFixed(1)}%</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </RechartsPieChart>
                                        </ResponsiveContainer>
                                        <div className="space-y-3">
                                            {dealDistribution.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        <span className="font-medium text-slate-900">{item.range}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-slate-900">{item.count}</p>
                                                        <p className="text-xs text-slate-500">₹{item.totalValue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Pipeline Tab */}
                    <TabsContent value="pipeline" className="space-y-8">
                        {pipeline && pipeline.length > 0 && (
                            <>
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <Card className="lg:col-span-2 border-none shadow-sm bg-white">
                                        <CardHeader className="border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-5 w-5 text-blue-600" />
                                                <CardTitle className="text-lg font-semibold text-slate-900">Sales Pipeline Overview</CardTitle>
                                            </div>
                                            <CardDescription className="text-slate-600">Quote distribution across pipeline stages</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <ResponsiveContainer width="100%" height={320}>
                                                <BarChart data={pipeline} layout="horizontal">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                                    <XAxis
                                                        type="number"
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={{ stroke: '#e2e8f0' }}
                                                    />
                                                    <YAxis
                                                        dataKey="stage"
                                                        type="category"
                                                        stroke="#64748b"
                                                        fontSize={12}
                                                        tickLine={false}
                                                        axisLine={{ stroke: '#e2e8f0' }}
                                                        width={100}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="count"
                                                        fill="#3b82f6"
                                                        radius={[0, 8, 8, 0]}
                                                        barSize={30}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-white">
                                        <CardHeader className="border-b border-slate-100">
                                            <CardTitle className="text-lg font-semibold text-slate-900">Pipeline Health</CardTitle>
                                            <CardDescription className="text-slate-600">Stage metrics</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="space-y-4">
                                                {pipeline.map((stage, index) => (
                                                    <div key={index} className="p-4 rounded-lg bg-slate-50 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <Badge className="capitalize bg-blue-600">{stage.stage}</Badge>
                                                            <span className="text-sm font-semibold text-slate-900">{stage.count} quotes</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <p className="text-slate-600">Total Value</p>
                                                                <p className="font-bold text-slate-900">₹{stage.totalValue.toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-600">Avg Deal</p>
                                                                <p className="font-bold text-slate-900">₹{stage.avgDealValue.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* Insights Tab */}
                    <TabsContent value="insights" className="space-y-8">
                        {insights && (
                            <>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                    <StatCard
                                        title="Market Avg Quote"
                                        value={`₹${insights.avgQuoteValue.toLocaleString()}`}
                                        icon={DollarSign}
                                        subtitle="Industry benchmark"
                                    />
                                    <StatCard
                                        title="Median Quote Value"
                                        value={`₹${insights.medianQuoteValue.toLocaleString()}`}
                                        icon={BarChart3}
                                        subtitle="Middle point"
                                    />
                                    <StatCard
                                        title="Quote Frequency"
                                        value={insights.quoteFrequency}
                                        icon={Activity}
                                        subtitle="Per week"
                                    />
                                    <StatCard
                                        title="Conversion Trend"
                                        value={`${insights.conversionTrend.toFixed(1)}%`}
                                        icon={TrendingUp}
                                        subtitle="Overall rate"
                                    />
                                </div>

                                <div className="grid gap-6 lg:grid-cols-3">
                                    <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-600 rounded-xl">
                                                    <DollarSign className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 mb-2">Deal Size Analysis</h4>
                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                        Your average quote value of ₹{insights.avgQuoteValue.toLocaleString()} with a median of
                                                        ₹{insights.medianQuoteValue.toLocaleString()} indicates{' '}
                                                        {insights.avgQuoteValue > insights.medianQuoteValue
                                                            ? 'some high-value outliers pulling the average up, suggesting opportunities in premium segments'
                                                            : 'consistent deal sizes across your portfolio, indicating stable market positioning'
                                                        }.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-purple-600 rounded-xl">
                                                    <Activity className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 mb-2">Activity Level</h4>
                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                        With {insights.quoteFrequency} quotes generated per week, your quoting activity is{' '}
                                                        {insights.quoteFrequency > 10
                                                            ? 'very high, indicating strong market demand and sales momentum'
                                                            : insights.quoteFrequency > 5
                                                                ? 'healthy, showing consistent business development efforts'
                                                                : 'moderate, with room for increased prospecting activity'
                                                        }.
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-emerald-600 rounded-xl">
                                                    <Target className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 mb-2">Conversion Performance</h4>
                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                        Your {insights.conversionTrend.toFixed(1)}% conversion rate is{' '}
                                                        {insights.conversionTrend > 30
                                                            ? 'excellent, exceeding industry benchmarks significantly'
                                                            : insights.conversionTrend > 20
                                                                ? 'solid and competitive within the market'
                                                                : 'below industry average of 25%'
                                                        }.
                                                        {insights.conversionTrend < 20 && ' Consider reviewing pricing strategy and follow-up processes.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-none shadow-sm bg-white">
                                    <CardHeader className="border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            <CardTitle className="text-lg font-semibold text-slate-900">Strategic Recommendations</CardTitle>
                                        </div>
                                        <CardDescription className="text-slate-600">Data-driven insights for business growth</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-blue-100 rounded-lg">
                                                        <TrendingUp className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-slate-900 mb-1">Growth Opportunities</h5>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            Focus on expanding your presence in high-performing regions and consider increasing deal sizes through value-added services.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-purple-100 rounded-lg">
                                                        <Target className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-slate-900 mb-1">Pipeline Optimization</h5>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            Streamline your sales process to reduce quote-to-close time and implement automated follow-ups for pending proposals.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-emerald-100 rounded-lg">
                                                        <Users className="h-4 w-4 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-slate-900 mb-1">Client Retention</h5>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            Develop loyalty programs for your top clients and explore upselling opportunities with existing customer base.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-amber-100 rounded-lg">
                                                        <BarChart3 className="h-4 w-4 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-semibold text-slate-900 mb-1">Market Positioning</h5>
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            Benchmark against competitors regularly and adjust pricing strategies to maintain competitive advantage in key segments.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}