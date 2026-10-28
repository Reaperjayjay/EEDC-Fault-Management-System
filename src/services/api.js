
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

function getToken() {
  try {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Sends requests to the backend and returns parsed JSON.
 */
export async function apiRequest(path, options = {}) {
  const { headers: customHeaders, body, ...rest } = options;

  const headers = { ...(customHeaders || {}) };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (
    body !== undefined &&
    !isFormData &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    headers,
    body,
  });

  let data = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/**
 * Retrieves dashboard data for the customer.
 */
export async function getCustomerDashboard() {
  try {
    const result = await apiRequest("/users/customer-dashboard");
    return result?.data;
  } catch (error) {
    console.error("Failed to load customer dashboard:", error);
    throw error;
  }
}

export const getMyGPSAssignments = () => {
  return apiRequest("/gps/my-assignments");
};

export const updateEngineerLocation = (assignmentId, coordinates) => {
  return apiRequest(`/gps/${assignmentId}/location`, {
    method: "POST",
    body: JSON.stringify(coordinates),
  });
};

export const checkInAtFaultSite = (assignmentId, details) => {
  return apiRequest(`/gps/${assignmentId}/check-in`, {
    method: "POST",
    body: JSON.stringify(details),
  });
};


export const getMyAssignments = () =>
  apiRequest("/assignments/my-assignments");

export const updateAssignmentStatus = (assignmentId, payload) =>
  apiRequest(`/assignments/${assignmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });


export const getMyPerformanceReviews = () =>
  apiRequest("/performance-reviews/my-reviews");



export const getMyPerformanceSummary = () =>
  apiRequest("/performance/my-summary");

export const getMyPerformanceHistory = (period = "monthly") =>
  apiRequest(
    `/performance/my-history?period=${encodeURIComponent(period)}`
  );
