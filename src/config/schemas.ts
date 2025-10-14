import { z } from "zod";

export const environmentSchema = z.object({
  url: z.string().min(1, "GitLab URL must not be empty").url("GitLab URL must be a valid URL"),
  token: z.string().min(1, "GitLab token must not be empty"),
});
