// Real Google Fit API service
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

  async fetchWithAuth(endpoint, options = {}) {
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

  // Get step data for a date range [citation:1][citation:9]
  async getStepData(startDate, endDate) {
    try {
      // Query step data
      const response = await this.fetchWithAuth("/dataset:aggregate", {
        method: "POST",
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
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

  // Parse the aggregate response into daily steps [citation:1]
  parseStepResponse(response) {
    if (!response.bucket || !Array.isArray(response.bucket)) {
      return [];
    }

    return response.bucket.map((bucket) => {
      const startDate = new Date(parseInt(bucket.startTimeMillis));
      const endDate = new Date(parseInt(bucket.endTimeMillis));

      let steps = 0;
      if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
        steps = bucket.dataset[0].point.reduce((total, point) => {
          if (point.value && point.value[0] && point.value[0].intVal) {
            return total + point.value[0].intVal;
          }
          return total;
        }, 0);
      }

      return {
        date: startDate.toISOString().split("T")[0],
        steps,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        source: "google-fit",
      };
    });
  }

  // Get today's steps so far [citation:9]
  async getTodaySteps() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const data = await this.getStepData(startOfDay, endOfDay);
    return data.length > 0 ? data[0].steps : 0;
  }
}

export default new GoogleFitService();
