import { format } from "date-fns";

class GoogleFitService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = "https://www.googleapis.com/fitness/v1/users/me";
  }

  setAccessToken(token, expiresIn) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresIn * 1000;
    localStorage.setItem("googleFitToken", token);
    localStorage.setItem("googleFitTokenExpiry", this.tokenExpiry);
  }

  loadTokenFromStorage() {
    const token = localStorage.getItem("googleFitToken");
    const expiry = localStorage.getItem("googleFitTokenExpiry");

    if (token && expiry && Date.now() < parseInt(expiry)) {
      this.accessToken = token;
      this.tokenExpiry = parseInt(expiry);
      return true;
    }
    return false;
  }

  isTokenValid() {
    return (
      this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry
    );
  }

  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem("googleFitToken");
    localStorage.removeItem("googleFitTokenExpiry");
  }

  async refreshTokenIfNeeded() {
    // If token expires in less than 5 minutes, refresh
    if (this.tokenExpiry && this.tokenExpiry - Date.now() < 300000) {
      try {
        // You'll need to implement token refresh using your backend
        // or use Google's OAuth library
        console.log("Token needs refresh");
        // Implement your refresh logic here
      } catch (error) {
        console.error("Token refresh failed:", error);
        this.clearToken();
      }
    }
  }

  async fetchWithAuth(endpoint, options = {}) {
    await this.refreshTokenIfNeeded();

    if (!this.isTokenValid()) {
      throw new Error("Token expired or not available");
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error("Token expired");
      }
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // Get user profile from Google
  async getUserProfile() {
    try {
      // Try to get from people API first
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const profile = await response.json();
      return {
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
        sub: profile.sub,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Fallback to token info
      try {
        const tokenInfo = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`,
        );
        const info = await tokenInfo.json();
        return {
          email: info.email,
          name: info.email?.split("@")[0] || "Google User",
        };
      } catch {
        return {
          email: "google-user@example.com",
          name: "Google User",
        };
      }
    }
  }

  // Get step data for a date range with distance and calories
  async getStepData(startDate, endDate) {
    try {
      // Query step data with multiple metrics
      const response = await this.fetchWithAuth("/dataset:aggregate", {
        method: "POST",
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
            },
            {
              dataTypeName: "com.google.distance.delta",
            },
            {
              dataTypeName: "com.google.calories.expended",
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // Daily buckets
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime(),
        }),
      });

      return this.parseStepResponse(response);
    } catch (error) {
      console.error("Error fetching step data:", error);
      throw error;
    }
  }

  // Parse the aggregate response into daily steps, distance, and calories
  parseStepResponse(response) {
    if (!response.bucket || !Array.isArray(response.bucket)) {
      return [];
    }

    return response.bucket.map((bucket) => {
      const startDate = new Date(parseInt(bucket.startTimeMillis));

      let steps = 0;
      let distance = 0;
      let calories = 0;

      // Simpler, more reliable approach based on aggregateBy order
      if (bucket.dataset && bucket.dataset.length >= 3) {
        // Steps (intVal)
        if (bucket.dataset[0]?.point) {
          steps = bucket.dataset[0].point.reduce((total, point) => {
            return total + (point.value?.[0]?.intVal || 0);
          }, 0);
        }

        // Distance in meters (fpVal)
        if (bucket.dataset[1]?.point) {
          distance = bucket.dataset[1].point.reduce((total, point) => {
            return total + (point.value?.[0]?.fpVal || 0);
          }, 0);
        }

        // Calories (fpVal)
        if (bucket.dataset[2]?.point) {
          calories = bucket.dataset[2].point.reduce((total, point) => {
            return total + (point.value?.[0]?.fpVal || 0);
          }, 0);
        }
      }

      // Convert distance from meters to kilometers
      distance = distance / 1000;

      return {
        date: format(startDate, "yyyy-MM-dd"),
        steps,
        distance: parseFloat(distance.toFixed(2)),
        calories: Math.round(calories),
        startTime: startDate.toISOString(),
        endTime: new Date(parseInt(bucket.endTimeMillis)).toISOString(),
        source: "google-fit",
      };
    });
  }

  // Get today's steps so far
  async getTodaySteps() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const data = await this.getStepData(startOfDay, endOfDay);
    return data.length > 0 ? data[0] : { steps: 0, distance: 0, calories: 0 };
  }
}

export default new GoogleFitService();
