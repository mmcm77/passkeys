/**
 * Helper functions for client-side API interactions
 */

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

type ApiJsonResponse<T> = ApiResponse<T> | ApiErrorResponse | T;

/**
 * Extracts data from the new API response format
 *
 * @param responseJson The JSON response from an API call
 * @returns The data from the response, extracted from the nested structure if necessary
 */
export function extractApiData<T>(responseJson: unknown): T {
  // Check if the response is an error response
  if (
    responseJson &&
    typeof responseJson === "object" &&
    "error" in responseJson
  ) {
    throw new Error((responseJson as ApiErrorResponse).error);
  }

  // Check if the response uses the new format with success and data properties
  if (
    responseJson &&
    typeof responseJson === "object" &&
    "success" in responseJson &&
    "data" in responseJson
  ) {
    const typedResponse = responseJson as ApiResponse<T>;
    if (typedResponse.success === true && typedResponse.data !== undefined) {
      return typedResponse.data;
    }
    throw new Error("Invalid API response format");
  }

  // If it doesn't use the new format, validate and return the response
  if (responseJson === null || responseJson === undefined) {
    throw new Error("Empty API response");
  }

  // Type guard to ensure responseJson is of type T
  const validateResponse = (data: unknown): data is T => {
    return data !== null && data !== undefined;
  };

  if (!validateResponse(responseJson)) {
    throw new Error("Invalid API response data");
  }

  return responseJson;
}

/**
 * Handles API responses with proper error handling and data extraction
 *
 * @param response The fetch Response object
 * @returns The extracted data
 * @throws Error if the response is not OK
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  const responseJson = (await response.json()) as ApiJsonResponse<T>;
  return extractApiData<T>(responseJson);
}

/**
 * Makes an API request and handles the response
 *
 * @param url The URL to request
 * @param options Fetch options
 * @returns The extracted data
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  return handleApiResponse<T>(response);
}
