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
} from "@mui/material";
import { format, subDays } from "date-fns";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ScaleIcon from "@mui/icons-material/Scale";

export default function BMIChart({
  data,
  filter = "all",
  getFilteredChartData,
  getWeightStats,
  getBMIColor,
  latestBMIEntry,
}) {
  const [chartType, setChartType] = React.useState("area");

  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  // Filter and format data based on date range
  const chartData = React.useMemo(() => {
    const now = new Date();
    let startDate;

    switch (filter) {
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = subDays(now, 30);
        break;
      case "3months":
        startDate = subDays(now, 90);
        break;
      default:
        startDate = null; // all data
    }

    let filtered = data;
    if (startDate) {
      filtered = data.filter((entry) => {
        const entryDate = entry.createdAt?.toDate?.() || new Date(entry.date);
        return entryDate >= startDate;
      });
    }

    // Sort by date
    return filtered
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((entry) => {
        const entryDate = entry.createdAt?.toDate?.() || new Date(entry.date);
        return {
          ...entry,
          date: format(entryDate, "dd MMM"), // Short date for x-axis
          fullDate: format(entryDate, "dd MMM yyyy"),
          weight: entry.bodyweight,
          bmi: entry.bmi,
        };
      });
  }, [data, filter]);

  const getBMICategory = (bmi) => {
    if (!bmi) return { label: "—", color: "text.secondary" };
    if (bmi < 18.5) return { label: "Underweight", color: "warning.main" };
    if (bmi < 25) return { label: "Normal", color: "success.main" };
    if (bmi < 30) return { label: "Overweight", color: "warning.main" };
    return { label: "Obese", color: "error.main" };
  };

  const latestBMI = chartData[chartData.length - 1]?.bmi;

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const category = getBMICategory(data.bmi);
                    return (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Weight: {data.weight?.toFixed(1)} kg
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          BMI: {data.bmi?.toFixed(1)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: category.color }}
                        >
                          Status: {category.label}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="weight"
                fill="#8884d8"
                name="Weight (kg)"
              />
              <Bar yAxisId="right" dataKey="bmi" fill="#82ca9d" name="BMI" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const category = getBMICategory(data.bmi);
                    return (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Weight: {data.weight?.toFixed(1)} kg
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          BMI: {data.bmi?.toFixed(1)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: category.color }}
                        >
                          Status: {category.label}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Weight (kg)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bmi"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="BMI"
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
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorBMI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const category = getBMICategory(data.bmi);
                    return (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {data.fullDate}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Weight: {data.weight?.toFixed(1)} kg
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          BMI: {data.bmi?.toFixed(1)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: category.color }}
                        >
                          Status: {category.label}
                        </Typography>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorWeight)"
                name="Weight (kg)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="bmi"
                stroke="#82ca9d"
                fillOpacity={1}
                fill="url(#colorBMI)"
                name="BMI"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Box>
      {/* Chart Type Toggle */}
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

      {/* Statistics Summary */}
      {getFilteredChartData().length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 3,
          }}
        >
          {/* Starting Weight */}
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
              Starting Weight
            </Typography>
            <Typography variant="h6">
              {getWeightStats().startingWeight?.toFixed(1) || "--"} kg
            </Typography>
          </Paper>

          {/* Current Weight */}
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
              Current Weight
            </Typography>
            <Typography variant="h6">
              {getWeightStats().currentWeight?.toFixed(1) || "--"} kg
            </Typography>
          </Paper>

          {/* Overall Change */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor:
                getWeightStats().change > 0
                  ? "error.main"
                  : getWeightStats().change < 0
                    ? "success.main"
                    : "text.primary",
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Overall Change
            </Typography>
            <Typography variant="h6">
              {getWeightStats().change !== null
                ? `${Math.abs(getWeightStats().change).toFixed(1)} kg ${
                    getWeightStats().change > 0 ? "↗" : "↘"
                  }`
                : "--"}
            </Typography>
          </Paper>

          {/* BMI Range */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: getBMIColor(latestBMIEntry.bmi),
            }}
          >
            <Typography variant="caption" color="text.secondary">
              BMI Range
            </Typography>
            <Typography variant="h6">
              {getWeightStats().minBMI?.toFixed(1) || "--"} –{" "}
              {getWeightStats().maxBMI?.toFixed(1) || "--"}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Chart */}
      {chartData.length === 0 ? (
        <Box
          sx={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 1,
            flexDirection: "column",
            gap: 2,
          }}
        >
          <ScaleIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography color="text.secondary">
            No BMI data available for the selected period
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Add your BMI entry using the + button
          </Typography>
        </Box>
      ) : (
        <Box sx={{ height: 300, width: "100%" }}>{renderChart()}</Box>
      )}
    </Box>
  );
}
