import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

export function toolSuccess<T>(payload: T): CallToolResult {
  const structuredContent = {
    success: true,
    payload,
  } satisfies Record<string, unknown>;
  const result = {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
    structuredContent,
  };

  return result;
}

export function toolError(error: unknown): CallToolResult {
  if (error instanceof ZodError) {
    const structuredContent = {
      success: false,
      error: {
        name: "ValidationError",
        message: "Invalid input",
        details: error.flatten(),
      },
    } as Record<string, unknown>;
    const result = {
      content: [],
      isError: true,
      structuredContent,
    };

    return result;
  }

  if (error instanceof Error) {
    const structuredContent = {
      success: false,
      error: {
        name: error.name,
        message: error.message,
      },
    } as Record<string, unknown>;
    const result = {
      content: [],
      isError: true,
      structuredContent,
    };

    return result;
  }

  const structuredContent = {
    success: false,
    error: {
      name: "UnknownError",
      message: "An unknown error occurred",
      details: error,
    },
  } as Record<string, unknown>;
  const result = {
    content: [],
    isError: true,
    structuredContent,
  };

  return result;
}
