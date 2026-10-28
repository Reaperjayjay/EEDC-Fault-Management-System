
const API_BASE_URL = "http://localhost:5000/api/v1";

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

async function apiGet(endpoint) {
  const token = getToken();

  if (!token) {
    throw new Error("You are not logged in. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed: ${response.status}`
    );
  }

  return result;
}

export async function getDashboardData() {
  const [faultResponse, engineerResponse, assignmentResponse] =
    await Promise.all([
      apiGet("/faults"),
      apiGet("/engineers"),
      apiGet("/assignments"),
    ]);

  return {
    faults: faultResponse.data.faults || [],
    engineers: engineerResponse.data.engineers || [],
    assignments: assignmentResponse.data.assignments || [],
  };
}
