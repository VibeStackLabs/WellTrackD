import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  Box,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  useMediaQuery,
} from "@mui/material";
import { format, parseISO, eachDayOfInterval, subDays } from "date-fns";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useTheme as useMuiTheme } from "@mui/material/styles";

export default function StepChart({ data, days = 7 }) {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const mobileTick = isMobile ? { fontSize: 12 } : undefined;

  const [chartType, setChartType] = React.useState("area");

  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  // Generate last 7 days data with steps
  const chartData = React.useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return last7Days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayData = data.find((d) => d.date === dateStr) || {
        steps: 0,
        goal: 10000,
      };

      return {
        date: format(date, "EEE"), // Mon, Tue, etc.
        fullDate: format(date, "dd MMM"),
        steps: dayData.steps || 0,
        goal: dayData.goal || 10000,
        calories: dayData.calories || Math.round((dayData.steps || 0) * 0.04), // Approx 40 cal per 1000 steps
        distance:
          dayData.distance || ((dayData.steps || 0) * 0.000762).toFixed(2), // Approx 0.762m per step
        activeMinutes:
          dayData.activeMinutes || Math.round((dayData.steps || 0) / 100),
      };
    });
  }, [data, days]);

  const totalSteps = React.useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.steps, 0);
  }, [chartData]);

  const averageSteps = React.useMemo(() => {
    return Math.round(totalSteps / chartData.length);
  }, [totalSteps, chartData]);

  const goalAchievedDays = React.useMemo(() => {
    return chartData.filter((day) => day.steps >= day.goal).length;
  }, [chartData]);

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={mobileTick}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#8884d8"
                tick={mobileTick}
                width={isMobile ? 30 : 50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#82ca9d"
                tick={mobileTick}
                width={isMobile ? 30 : 50}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 1.5, maxWidth: 180 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Steps: {data.steps.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="secondary">
                          Goal: {data.goal.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Distance: {data.distance} km
                        </Typography>
                        <Typography variant="body2" color="warning.main">
                          Calories: {data.calories}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="steps" fill="#8884d8" name="Steps" />
              <Bar
                yAxisId="right"
                dataKey="goal"
                fill="#82ca9d"
                name="Daily Goal"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={mobileTick}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 1.5, maxWidth: 180 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Steps: {data.steps.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="secondary">
                          Goal: {data.goal.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Distance: {data.distance} km
                        </Typography>
                        <Typography variant="body2" color="warning.main">
                          Calories: {data.calories}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="steps"
                stroke="#8884d8"
                name="Steps"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#82ca9d"
                name="Daily Goal"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={mobileTick}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Paper sx={{ p: 1.5, maxWidth: 180 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Steps: {data.steps.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="secondary">
                          Goal: {data.goal.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Distance: {data.distance} km
                        </Typography>
                        <Typography variant="body2" color="warning.main">
                          Calories: {data.calories}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="steps"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorSteps)"
                name="Steps"
              />
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#82ca9d"
                name="Daily Goal"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Box>
      <Box sx={{ mt: 2, mb: 3 }}>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none",
              px: 2,
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: "primary.main",
              color: "primary.contrastText",
            },
            "& .MuiToggleButton-root.Mui-selected:hover": {
              backgroundColor: "primary.dark",
            },
          }}
        >
          <ToggleButton value="area" title="Area Chart">
            <ShowChartIcon />
          </ToggleButton>
          <ToggleButton value="line" title="Line Chart">
            <TrendingUpIcon />
          </ToggleButton>
          <ToggleButton value="bar" title="Bar Chart">
            <BarChartIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: 1,
            borderLeft: "4px solid",
            borderColor: "warning.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Total Steps
          </Typography>
          <Typography variant="h6">{totalSteps.toLocaleString()}</Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: 1,
            borderLeft: "4px solid",
            borderColor: "error.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Daily Average
          </Typography>
          <Typography variant="h6">{averageSteps.toLocaleString()}</Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: 1,
            borderLeft: "4px solid",
            borderColor: "primary.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Goal Achieved
          </Typography>
          <Typography variant="h6">
            {goalAchievedDays}/{days} days
          </Typography>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: 1,
            borderLeft: "4px solid",
            borderColor: "success.main",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Est. Distance
          </Typography>
          <Typography variant="h6">
            {(totalSteps * 0.000762).toFixed(1)} km
          </Typography>
        </Paper>
      </Box>

      {/* Chart */}
      <Box sx={{ height: 300, width: "100%" }}>{renderChart()}</Box>
    </Box>
  );
}
