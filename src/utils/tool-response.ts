import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

let defaultUseStructuredContent = true;

export function setDefaultUseStructuredContent(value: boolean) {
  defaultUseStructuredContent = value;
}

export function getDefaultUseStructuredContent(): boolean {
  return defaultUseStructuredContent;
}

export function toolSuccess<T>(payload: T, useStructuredContent: boolean = defaultUseStructuredContent): CallToolResult {
  const base = { success: true, payload } as const;

  if (useStructuredContent) {
    return {
      content: [],
      structuredContent: base,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(base),
      },
    ],
  };
}

export function toolError(error: unknown, useStructuredContent: boolean = defaultUseStructuredContent): CallToolResult {
  if (error instanceof ZodError) {
    const errObj = {
      name: 'ValidationError',
      message: 'Invalid input',
      details: error.flatten(),
    } as const;

    return useStructuredContent
      ? ({ isError: true, content: [], structuredContent: errObj })
      : ({
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(errObj),
            },
          ],
        });
  }

  if (error instanceof Error) {
    const errObj = {
      name: error.name,
      message: error.message,
    } as const;

    return useStructuredContent
      ? ({ isError: true, content: [], structuredContent: errObj })
      : ({
          isError: true,
          content: [
            { type: 'text', text: JSON.stringify(errObj) },
          ],
        });
  }

  const errObj = {
    name: 'UnknownError',
    message: 'An unknown error occurred',
    details: error,
  } as const;

  return useStructuredContent
    ? ({ isError: true, content: [], structuredContent: errObj })
    : ({
        isError: true,
        content: [
          { type: 'text', text: JSON.stringify(errObj) },
        ],
      });
}
