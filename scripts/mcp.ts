import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/ is 1 level deep, so project root is ..
const PROJECT_ROOT = path.resolve(__dirname, "..");

const server = new Server(
  {
    name: "lms-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_prisma_schema",
        description: "Get the content of the Prisma schema file",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_routes",
        description: "List all SvelteKit routes in the project",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_file",
        description: "Read a specific file from the project",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Relative path to the file from project root (e.g., src/routes/+page.svelte)",
            },
          },
          required: ["filePath"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_prisma_schema") {
      const schemaPath = path.join(PROJECT_ROOT, "prisma", "schema.prisma");
      const content = await fs.readFile(schemaPath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
      };
    }

    if (name === "list_routes") {
      const routesDir = path.join(PROJECT_ROOT, "src", "routes");
      
      async function getFiles(dir: string): Promise<string[]> {
        let results: string[] = [];
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
          const res = path.resolve(dir, dirent.name);
          if (dirent.isDirectory()) {
            results = results.concat(await getFiles(res));
          } else {
            results.push(res);
          }
        }
        return results;
      }

      const files = await getFiles(routesDir);
      const routes = files.map((f) => path.relative(PROJECT_ROOT, f));
      
      return {
        content: [{ type: "text", text: routes.join("\n") }],
      };
    }

    if (name === "read_file") {
      const filePath = String(args?.filePath);
      const absolutePath = path.resolve(PROJECT_ROOT, filePath);
      
      if (!absolutePath.startsWith(PROJECT_ROOT)) {
        throw new Error("Access denied: path outside project root");
      }
      
      const content = await fs.readFile(absolutePath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const err = error as Error;
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LMS Local MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
