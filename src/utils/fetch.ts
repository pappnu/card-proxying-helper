import { ZodType } from "zod";
import { isError } from "./typeGuards";

export interface FetchSuccess<T> {
  data: T;
  response: Response;
  ok: true;
}

export interface FetchFailure {
  data?: JSONValues;
  errorCode: string;
  errorInfo: string;
  response?: Response;
  ok: false;
}

export type JSONValues =
  | undefined
  | null
  | string
  | number
  | boolean
  | object
  | (undefined | null | string | number | boolean | object)[];

export type FetchResult<T> = FetchSuccess<T> | FetchFailure;

export interface TryFetchOptions<T> {
  timeout?: number;
  abortController?: AbortController;
  abortSignal?: AbortSignal;
  validator?: ZodType<T>;
}

/** Default timeout for tryFetch in milliseconds */
const DEFAULT_TIMEOUT = 8000;

export async function tryFetch<T>(
  url: string | URL,
  options: RequestInit,
  {
    timeout = DEFAULT_TIMEOUT,
    abortController = new AbortController(),
    abortSignal,
    validator,
  }: TryFetchOptions<T> = {},
): Promise<FetchResult<T>> {
  try {
    const requestTimeout = timeout
      ? setTimeout(() => abortController.abort(), timeout)
      : undefined;

    // Allow aborting via an external signal in addition to the timeout signal
    const signal =
      abortSignal && AbortSignal?.any
        ? AbortSignal.any([abortSignal, abortController.signal])
        : abortController.signal;

    const response = await fetch(url, { ...options, signal });
    clearTimeout(requestTimeout);

    const contentType = response.headers.get("Content-Type");

    if (response.ok) {
      // Success
      if (contentType?.startsWith("application/json")) {
        try {
          const jsonData = await response.json();
          return {
            data: validator?.parse(jsonData) ?? jsonData,
            response,
            ok: true,
          };
        } catch (error) {
          console.error(
            "Failed to parse response json body:",
            url.toString(),
            options,
            error,
          );
          return {
            errorCode: response.status.toString(),
            errorInfo: stringifyHeaders(response.headers),
            response,
            ok: false,
          };
        }
      } else {
        return { data: undefined as T, response, ok: true };
      }
    }

    // Failure
    let data: JSONValues | undefined;
    try {
      if (contentType === "application/json") {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (_error) {
      data = undefined;
    }
    console.error("Fetch request failed:", url.toString(), options, data);
    return {
      data,
      errorCode: response.status.toString(),
      errorInfo: stringifyHeaders(response.headers),
      response,
      ok: false,
    };
  } catch (error) {
    console.error(
      "Unexpected fetch error occurred:",
      url.toString(),
      options,
      error,
    );
    if (isError(error)) {
      return { errorCode: error.name, errorInfo: error.message, ok: false };
    }
  }
  return { errorCode: "", errorInfo: "", ok: false };
}

function stringifyHeaders(headers: Headers): string {
  const headersObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return JSON.stringify(headersObj, null, 2);
}

export function constructQueryUrl(
  baseUrl: string | URL,
  queryParams?: string[][] | Record<string, string> | string | URLSearchParams,
) {
  const urlParamsStr = queryParams
    ? new URLSearchParams(queryParams).toString()
    : undefined;
  return baseUrl.toString() + (urlParamsStr ? `?${urlParamsStr}` : "");
}
