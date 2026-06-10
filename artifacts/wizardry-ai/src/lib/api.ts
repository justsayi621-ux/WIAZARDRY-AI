// Wizardry AI — shared API utilities

// 1. Set the absolute server domain so frontend port 3000 can reach backend port 5000
export const BASE_URL = "http://localhost:5000";

// 2. Original Logic: Retrieve local session user configurations
export function getUserId(): number {
  try {
    const v = localStorage.getItem("wizardry_user_id");
    const id = v ? parseInt(v, 10) : 0;
    return isNaN(id) ? 0 : id;
  } catch {
    return 0;
  }
}

// 3. Original Logic: Append custom authentication headers dynamically
export function getHeaders(): Record<string, string> {
  const userId = getUserId();
  return {
    "Content-Type": "application/json",
    ...(userId > 0 ? { "x-user-id": String(userId) } : {}),
  };
}

// 4. Fixed Routing Logic: Resolves endpoint paths cleanly without double-stacking "/api"
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const finalPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  
  return `${BASE_URL}${finalPath}`;
}
