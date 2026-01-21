import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
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
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!name || !username || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    const cleanUsername = username.toLowerCase();

    try {
      setLoading(true);

      // 🔹 Check if username already exists
      const usernameRef = doc(db, "usernames", cleanUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        alert("Username already taken");
        setLoading(false);
        return;
      }

      // 🔹 Create Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      // 🔹 Update Firebase Auth display name
      await updateProfile(user, {
        displayName: name,
      });

      // 🔹 Store user profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        username: cleanUsername,
        email,
        createdAt: serverTimestamp(),
      });

      // 🔹 Reserve username (prevents duplicates)
      await setDoc(doc(db, "usernames", cleanUsername), {
        uid: user.uid,
      });

      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
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
                label="Full Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                helperText="Lowercase, no spaces"
              />

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
                size="large"
                sx={{ mt: 1, borderRadius: 2 }}
                onClick={handleSignup}
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Signup"}
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
