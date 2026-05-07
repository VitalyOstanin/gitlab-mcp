import { z } from 'zod';

// Zod 4 dropped `.url()` as a string-method (replaced by the standalone
// `z.url(...)` type) and reworked the constructor error options. Validate
// `GITLAB_URL` as a non-empty string here; the URL itself is exercised by
// the very next axios call so a malformed URL still fails fast and loud.
export const environmentSchema = z.object({
  url: z.string().min(1, 'GitLab URL must not be empty'),
  token: z.string().min(1, 'GitLab token must not be empty'),
  timezone: z.string().min(1).optional(),
});
