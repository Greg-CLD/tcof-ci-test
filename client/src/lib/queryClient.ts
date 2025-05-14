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

  try {
    // Using Promise with timeout to handle infrastructure connectivity issues
    const fetchPromise = fetch(url, options);
    
    // Create a timeout promise that rejects after 10 seconds
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out. Please try again later."));
      }, 10000); // 10 second timeout
    });
    
    // Race between the fetch and timeout
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    // Create a mock Response for network errors
    console.error(`Network error during ${method} to ${url}:`, error);
    
    // Custom error response with helpful message
    const errorBody = JSON.stringify({
      error: true,

// Log all API requests
async function logRequest(url: string, config: any) {
  console.log(`API Request to ${url}:`, {
    headers: config.headers,
    method: config.method
  });
}

async function logResponse(response: Response) {
  console.log('API Response:', {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    url: response.url
  });
}

      message: "Connection failed. Please check your internet connection and try again.",
      details: error instanceof Error ? error.message : String(error)
    });
    
    return new Response(errorBody, {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Default query function that uses apiRequest
export const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const [url] = queryKey as readonly string[];
  const res = await apiRequest("GET", url as string);

  // Handle 404 and other error responses
  if (!res.ok) {
    if (res.status === 401) {
      // Authentication errors
      throw new Error("Unauthorized - Please log in");
    } else if (res.status === 404) {
      // Not found errors
      throw new Error("Resource not found");
    } else if (res.status === 500) {
      // Server errors that might be due to infrastructure issues
      try {
        const errorData = await res.json();
        if (errorData.message) {
          throw new Error(`Server error: ${errorData.message}`);
        }
      } catch (parseError) {
        // If can't parse JSON, try text
        const errorText = await res.text().catch(() => "");
        
        // Check for compute node errors specifically
        if (errorText.includes("compute node") || errorText.includes("infrastructure")) {
          throw new Error("Temporary server issue. Please try again in a moment.");
        }
        
        throw new Error(
          `Server error (${res.status}): ${errorText || "Unknown error occurred"}`
        );
      }
    } else if (res.status === 503) {
      // Service unavailable - likely infrastructure error
      try {
        const errorData = await res.json();
        throw new Error(errorData.message || "Service temporarily unavailable. Please try again later.");
      } catch (parseError) {
        throw new Error("Service temporarily unavailable. Please try again later.");
      }
    } else {
      // General server errors
      const errorText = await res.text().catch(() => "");
      throw new Error(
        `Server error (${res.status}): ${errorText || "Unknown error occurred"}`
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

  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const [url] = queryKey as readonly string[];
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