import { QueryClient } from "@tanstack/react-query";

// HTTP request function for mutations
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Important for cookies/sessions
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  return fetch(url, options);
}

// Default query function that uses apiRequest
export const defaultQueryFn = async ({ queryKey }: { queryKey: string[] }) => {
  const [url] = queryKey;
  const res = await apiRequest("GET", url);

  // Handle 404 and other error responses
  if (!res.ok) {
    if (res.status === 401) {
      // Authentication errors
      throw new Error("Unauthorized - Please log in");
    } else if (res.status === 404) {
      // Not found errors
      throw new Error("Resource not found");
    } else {
      // General server errors
      const errorText = await res.text();
      throw new Error(
        `Server error (${res.status}): ${
          errorText || "Unknown error occurred"
        }`
      );
    }
  }

  return res.json();
};

// Query client with defaults - makes API calls & manages cache
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query function factory that can customize for different scenarios
type QueryFnOpts = {
  on401?: "throw" | "returnNull"; // What to do on 401 unauthorized
  on404?: "throw" | "returnNull"; // What to do on 404 not found
};

export function getQueryFn(options: QueryFnOpts = {}) {
  const { on401 = "throw", on404 = "throw" } = options;

  return async ({ queryKey }: { queryKey: string[] }) => {
    const [url] = queryKey;
    try {
      const res = await apiRequest("GET", url);

      if (!res.ok) {
        if (res.status === 401 && on401 === "returnNull") {
          return null;
        }
        if (res.status === 404 && on404 === "returnNull") {
          return null;
        }

        const errorText = await res.text();
        let errorMessage = `Server error (${res.status})`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      return await res.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unknown error occurred");
    }
  };
}