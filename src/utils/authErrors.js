export const getAuthErrorMessage = (error, context = "general") => {
  if (!error || !error.code) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    // Email Errors
    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/missing-email":
      return "Email is required.";

    case "auth/email-already-in-use":
      // For signup only
      if (context === "signup") {
        return "An account already exists with this email. Please log in.";
      }
      return "This email is already registered.";

    case "auth/user-not-found":
      // For login only
      if (context === "login") {
        return "Invalid email or password.";
      }

      if (context === "reset-password") {
        // For security, don't reveal if account exists
        return "If an account exists with this email, a reset link has been sent.";
      }

      return "User not found.";

    // Password Errors
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-mismatch":
      if (context === "password-change") {
        return "Current password is incorrect.";
      }
      return "Invalid email or password.";

    case "auth/weak-password":
      return "Password must be at least 6 characters long.";

    case "auth/missing-password":
      return "Please enter your password.";

    // Security / Rate limiting
    case "auth/requires-recent-login":
      return "Please log out and log in again before changing your password.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    // Network Errors
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";

    default:
      return "Authentication failed. Please try again.";
  }
};
