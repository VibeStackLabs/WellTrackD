import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
} from "@mui/material";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6", // match dashboard
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3, p: 4, boxShadow: 8 }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Signup
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 1, borderRadius: 2 }}
                onClick={handleSignup}
              >
                Signup
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{ textDecoration: "none", color: "#4f46e5" }}
              >
                Login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
