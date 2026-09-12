export {};

declare global {
  interface Document {
    modelContext?: {
      registerTool(
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: Record<string, unknown>;
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
          };
          execute(input: unknown): object | Promise<object>;
        },
        options?: { signal?: AbortSignal },
      ): void | Promise<void>;
    };
  }
}
