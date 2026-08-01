import { createServerFn } from "@tanstack/react-start";

export const parseMenuImage = createServerFn({ method: "POST" })
  .validator((d: { imageBase64: string }) => d)
  .handler(async () => ({
    categories: [] as Array<{
      name: string;
      items: Array<{ name: string; price: number; description?: string | null }>;
    }>,
  }));
