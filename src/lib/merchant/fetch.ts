function humanizeApiError(error: unknown, status: number): string {
  if (Array.isArray(error)) {
    return error
      .map((issue) => {
        if (issue && typeof issue === "object" && "message" in issue) {
          const path = Array.isArray(issue.path) && issue.path.length
            ? `${issue.path.join(".")}: `
            : "";
          return `${path}${String(issue.message)}`;
        }
        return String(issue);
      })
      .join(" ");
  }

  if (typeof error === "string") {
    if (error.startsWith("[")) {
      try {
        const issues = JSON.parse(error) as { message?: string; path?: (string | number)[] }[];
        if (Array.isArray(issues) && issues.length > 0) {
          return issues
            .map((issue) => {
              const path = issue.path?.length ? `${issue.path.join(".")}: ` : "";
              return `${path}${issue.message ?? "Invalid value"}`;
            })
            .join(" ");
        }
      } catch {
        /* use raw string */
      }
    }
    return error;
  }
  return `Request failed (${status})`;
}

export async function merchantApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let json: (T & { error?: string }) | { error?: string };
  try {
    json = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "Invalid server response"
        : "Database offline. Start Docker (OrbStack), then run: npm run insforge:up",
    );
  }

  if (!response.ok) {
    const message = humanizeApiError(json.error, response.status);
    if (/fetch failed|network request failed|econnrefused/i.test(message)) {
      throw new Error(
        "Database offline. Start Docker (OrbStack), then run: npm run insforge:up",
      );
    }
    throw new Error(message);
  }
  return json as T;
}
