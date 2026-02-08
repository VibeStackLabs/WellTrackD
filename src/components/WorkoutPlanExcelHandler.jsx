import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Chip,
} from "@mui/material";
import ImportExportOutlinedIcon from "@mui/icons-material/ImportExportOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import CollectionsIcon from "@mui/icons-material/Collections";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function WorkoutPlanExcelHandler({
  open,
  onClose,
  onImport,
  plans = [],
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create exercises sheet
      const headers = [
        "Plan Name",
        "Exercise Name",
        "Sets",
        "Reps",
        "Weight",
        "Weight Unit",
      ];

      // Add example data for multiple plans
      const exampleData = [
        ["Full Body Workout", "Bench Press", "3", "8-10", "60", "kg"],
        ["Full Body Workout", "Squats", "3", "8-12", "80", "kg"],
        ["Full Body Workout", "Pull-ups", "3", "8-10", "", ""],
        ["Push Day", "Shoulder Press", "3", "8-10", "30", "kg"],
        ["Push Day", "Tricep Extensions", "3", "10-12", "20", "kg"],
        ["Pull Day", "Barbell Rows", "3", "8-12", "50", "kg"],
        ["Pull Day", "Bicep Curls", "3", "10-12", "15", "kg"],
      ];

      const allData = [headers, ...exampleData];
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Set column widths for better readability
      const wscols = [
        { wch: 20 }, // Plan Name
        { wch: 25 }, // Exercise Name
        { wch: 8 }, // Sets
        { wch: 10 }, // Reps
        { wch: 10 }, // Weight
        { wch: 12 }, // Weight Unit
      ];
      ws["!cols"] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, "Workout Plans");

      // Save file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `Workout_Plan_Template_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("Error downloading template:", err);
      setError("Failed to download template. Please try again.");
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("No sheets found in the Excel file.");
        }

        const sheet = workbook.Sheets[firstSheetName];
        const allData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (allData.length < 2) {
          throw new Error(
            "No data found. Please add workout plan data to the sheet.",
          );
        }

        // Get headers from first row
        const headers = allData[0];
        const requiredHeaders = [
          "Plan Name",
          "Exercise Name",
          "Sets",
          "Reps",
          "Weight",
          "Weight Unit",
        ];

        // Check if headers match
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h),
        );
        if (missingHeaders.length > 0) {
          throw new Error(
            `Missing required columns: ${missingHeaders.join(
              ", ",
            )}. Please use the provided template.`,
          );
        }

        // Group exercises by plan name
        const plansMap = new Map();

        for (let i = 1; i < allData.length; i++) {
          const row = allData[i];
          if (!row[0] || !row[0].trim()) continue; // Skip rows without plan name

          const planNameIndex = headers.indexOf("Plan Name");
          const exerciseNameIndex = headers.indexOf("Exercise Name");
          const setsIndex = headers.indexOf("Sets");
          const repsIndex = headers.indexOf("Reps");
          const weightIndex = headers.indexOf("Weight");
          const weightUnitIndex = headers.indexOf("Weight Unit");

          const planName = row[planNameIndex]?.toString().trim() || "";
          const exerciseName = row[exerciseNameIndex]?.toString().trim() || "";

          if (!planName || !exerciseName) continue;

          const exercise = {
            id: i,
            name: exerciseName,
            sets: row[setsIndex]?.toString().trim() || "3",
            reps: row[repsIndex]?.toString().trim() || "8-10",
            weight: row[weightIndex]?.toString().trim() || "",
            weightUnit: row[weightUnitIndex]?.toString().trim() || "kg",
          };

          if (!plansMap.has(planName)) {
            plansMap.set(planName, []);
          }
          plansMap.get(planName).push(exercise);
        }

        if (plansMap.size === 0) {
          throw new Error("No valid workout plans found in the file.");
        }

        // Import each plan
        let importedCount = 0;
        plansMap.forEach((exercises, planName) => {
          if (exercises.length > 0) {
            onImport({
              name: planName,
              description: `Imported from Excel - ${exercises.length} exercises`,
              exercises: exercises,
            });
            importedCount++;
          }
        });

        onClose();
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        setError(
          err.message || "Failed to parse Excel file. Please check the format.",
        );
      } finally {
        setLoading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Export single plan
  const exportPlan = (plan) => {
    if (!plan) return;

    try {
      const wb = XLSX.utils.book_new();

      // Create headers
      const headers = [
        "Plan Name",
        "Exercise Name",
        "Sets",
        "Reps",
        "Weight",
        "Weight Unit",
      ];

      const allData = [headers];

      // Add each exercise
      plan.exercises?.forEach((exercise) => {
        allData.push([
          plan.name,
          exercise.name,
          exercise.sets,
          exercise.reps,
          exercise.weight,
          exercise.weightUnit || "kg",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Set column widths
      const wscols = [
        { wch: 20 }, // Plan Name
        { wch: 25 }, // Exercise Name
        { wch: 8 }, // Sets
        { wch: 10 }, // Reps
        { wch: 10 }, // Weight
        { wch: 12 }, // Weight Unit
      ];
      ws["!cols"] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, plan.name.substring(0, 31)); // Sheet name max 31 chars

      // Save file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `Workout_Plan_${plan.name.replace(/[^a-z0-9]/gi, "_")}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      );
    } catch (err) {
      console.error("Error exporting plan:", err);
      setError("Failed to export plan. Please try again.");
    }
  };

  // Export ALL plans
  const exportAllPlans = () => {
    if (plans.length === 0) {
      setError("No plans available to export.");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Create a summary sheet
      const summaryHeaders = [
        "Plan Name",
        "Total Exercises",
        "Total Sets",
        "Created Date",
      ];
      const summaryData = [summaryHeaders];

      plans.forEach((plan) => {
        const totalSets =
          plan.exercises?.reduce((sum, exercise) => {
            return sum + (parseInt(exercise.sets) || 0);
          }, 0) || 0;

        summaryData.push([
          plan.name,
          plan.exercises?.length || 0,
          totalSets,
          new Date(
            plan.createdAt?.toDate?.() || plan.createdAt,
          ).toLocaleDateString(),
        ]);
      });

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      const summaryCols = [
        { wch: 25 }, // Plan Name
        { wch: 15 }, // Total Exercises
        { wch: 12 }, // Total Sets
        { wch: 15 }, // Created Date
      ];
      summaryWs["!cols"] = summaryCols;
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Create combined data sheet
      const combinedHeaders = [
        "Plan Name",
        "Exercise Name",
        "Sets",
        "Reps",
        "Weight",
        "Weight Unit",
      ];
      const combinedData = [combinedHeaders];

      // Add all exercises from all plans
      plans.forEach((plan) => {
        plan.exercises?.forEach((exercise) => {
          combinedData.push([
            plan.name,
            exercise.name,
            exercise.sets,
            exercise.reps,
            exercise.weight,
            exercise.weightUnit || "kg",
          ]);
        });
      });

      const combinedWs = XLSX.utils.aoa_to_sheet(combinedData);
      const combinedCols = [
        { wch: 20 }, // Plan Name
        { wch: 25 }, // Exercise Name
        { wch: 8 }, // Sets
        { wch: 10 }, // Reps
        { wch: 10 }, // Weight
        { wch: 12 }, // Weight Unit
      ];
      combinedWs["!cols"] = combinedCols;
      XLSX.utils.book_append_sheet(wb, combinedWs, "All Exercises");

      // Create individual sheets for each plan (if not too many)
      if (plans.length <= 10) {
        // Limit to prevent too many sheets
        plans.forEach((plan, index) => {
          if (index < 10) {
            // Max 10 individual sheets
            const planHeaders = [
              "Exercise Name",
              "Sets",
              "Reps",
              "Weight",
              "Weight Unit",
            ];
            const planData = [planHeaders];

            plan.exercises?.forEach((exercise) => {
              planData.push([
                exercise.name,
                exercise.sets,
                exercise.reps,
                exercise.weight,
                exercise.weightUnit || "kg",
              ]);
            });

            const planWs = XLSX.utils.aoa_to_sheet(planData);
            const planCols = [
              { wch: 25 }, // Exercise Name
              { wch: 8 }, // Sets
              { wch: 10 }, // Reps
              { wch: 10 }, // Weight
              { wch: 12 }, // Weight Unit
            ];
            planWs["!cols"] = planCols;

            // Truncate sheet name if too long
            const sheetName = plan.name.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, planWs, sheetName);
          }
        });
      }

      // Save file
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `All_Workout_Plans_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
    } catch (err) {
      console.error("Error exporting all plans:", err);
      setError("Failed to export all plans. Please try again.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ImportExportOutlinedIcon color="primary" />
          Import/Export Workout Plans
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            <Box display="flex" alignItems="center" gap={1}>
              <DownloadOutlinedIcon />
              Import Workout Plan
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Download the template, fill it with your exercises, and import it
            back.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={downloadTemplate}
              disabled={loading}
            >
              Download Template
            </Button>

            <Button
              variant="outlined"
              component="label"
              color="success"
              startIcon={
                loading ? (
                  <CircularProgress size={20} />
                ) : (
                  <UploadOutlinedIcon />
                )
              }
              disabled={loading}
            >
              Upload & Import
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </Button>
          </Box>

          <Alert severity="info" icon={false}>
            <Typography variant="body2">
              <strong>Simple Excel Format (1 sheet only):</strong>
              <br />
              • Column 1: Plan Name
              <br />
              • Column 2: Exercise Name
              <br />
              • Column 3: Sets
              <br />
              • Column 4: Reps
              <br />
              • Column 5: Weight
              <br />• Column 6: Weight Unit (kg or lbs)
            </Typography>
          </Alert>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Export Section */}
        <Box>
          <Typography variant="h6" gutterBottom>
            <Box display="flex" alignItems="center" gap={1}>
              <UploadOutlinedIcon />
              Export Workout Plan
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Export your workout plans to Excel for backup or sharing.
          </Typography>

          {/* Export All Plans Button */}
          {plans.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<CollectionsIcon />}
                onClick={exportAllPlans}
                fullWidth
                sx={{ mb: 2 }}
              >
                Export ALL Plans ({plans.length} plans)
              </Button>
              <Typography variant="caption" color="text.secondary">
                Creates a comprehensive Excel file with summary, combined data,
                and individual plan sheets.
              </Typography>
            </Box>
          )}

          {/* Export Individual Plans */}
          {plans.length > 0 ? (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Export Individual Plans:
              </Typography>
              <List
                sx={{
                  maxHeight: 300,
                  overflow: "auto",
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                }}
              >
                {plans.map((plan) => (
                  <ListItem
                    key={plan.id}
                    disablePadding
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => exportPlan(plan)}
                      >
                        Export
                      </Button>
                    }
                  >
                    <ListItemButton>
                      <ListItemIcon>
                        <FitnessCenterIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={plan.name}
                        secondary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                            }}
                          >
                            <Chip
                              label={`${plan.exercises?.length || 0} exercises`}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={`${plan.exercises?.reduce((sum, e) => sum + (parseInt(e.sets) || 0), 0) || 0} sets`}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Alert severity="info" icon={false}>
              <Typography variant="body2">
                No workout plans available to export. Create a plan first.
              </Typography>
            </Alert>
          )}

          <Alert severity="success" icon={false} sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Export Features:</strong>
              <br />
              • Export individual plans
              <br />
              • Export ALL plans in one file
              <br />
              • Includes summary sheet with statistics
              <br />
              • Compatible with Microsoft Excel & Google Sheets
              <br />• Can be re-imported later
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
