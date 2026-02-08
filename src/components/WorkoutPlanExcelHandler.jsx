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
} from "@mui/material";
import ImportExportOutlinedIcon from "@mui/icons-material/ImportExportOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function WorkoutPlanExcelHandler({ open, onClose, onImport }) {
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

      // Add example data
      const exampleData = [
        ["Full Body Workout", "Bench Press", "3", "8-10", "60", "kg"],
        ["Full Body Workout", "Squats", "3", "8-12", "80", "kg"],
        ["Full Body Workout", "Pull-ups", "3", "8-10", "", ""],
        ["Push Day", "Shoulder Press", "3", "8-10", "30", "kg"],
        ["Push Day", "Tricep Extensions", "3", "10-12", "20", "kg"],
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

      XLSX.utils.book_append_sheet(wb, ws, "Workout Plan");

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

        setSuccessMessage(`${importedCount} plan(s) imported successfully!`);
        setSuccessSnackbarOpen(true);

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

  // Snackbars states
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ImportExportOutlinedIcon color="primary" />
          Import/Export Workout Plans
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
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

          <Alert severity="warning" icon={false} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Tips:</strong>
              <br />
              • One plan can have multiple exercises (same Plan Name for each
              row)
              <br />
              • Weight can be left empty for bodyweight exercises
              <br />
              • Weight Unit defaults to "kg" if empty
              <br />• Sets/Reps default to "3" and "8-10" if empty
            </Typography>
          </Alert>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            <Box display="flex" alignItems="center" gap={1}>
              <UploadOutlinedIcon />
              Export Workout Plan
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Export your existing workout plan to Excel for backup or sharing.
          </Typography>

          <Alert severity="success" icon={false}>
            <Typography variant="body2">
              <strong>Features:</strong>
              <br />
              • Simple single-sheet Excel format
              <br />
              • Matches exactly with "Create New Plan" form
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
