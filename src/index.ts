#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode, 
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ONSApiClient } from './api/ons-client.js';
import { ONSDatasetService } from './services/dataset-service.js';

// Initialize the ONS API client
const onsClient = new ONSApiClient();
const datasetService = new ONSDatasetService(onsClient);

// Create the MCP server
const server = new Server(
  {
    name: 'uk_ons_mcp_server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool schemas
const ListDatasetsArgsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
});

const GetDatasetArgsSchema = z.object({
  dataset_id: z.string().describe('The ID of the dataset to retrieve'),
});

const SearchDatasetsArgsSchema = z.object({
  query: z.string().describe('Search query for datasets'),
  limit: z.number().optional().default(10),
});

const GetObservationArgsSchema = z.object({
  dataset_id: z.string().describe('The ID of the dataset'),
  edition: z.string().optional().default('time-series'),
  version: z.string().optional().default('latest'),
  dimensions: z.record(z.string()).describe('Dimension filters as key-value pairs'),
});

const GetLatestDataArgsSchema = z.object({
  dataset_id: z.string().describe('The ID of the dataset'),
  geography: z.string().optional().describe('Geographic filter (e.g., K02000001 for UK)'),
  time_period: z.string().optional().describe('Time period filter (e.g., 2023, Q1-2023)'),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_datasets',
        description: 'List available ONS datasets with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of datasets to return', default: 20 },
            offset: { type: 'number', description: 'Offset for pagination', default: 0 },
          },
        },
      },
      {
        name: 'get_dataset',
        description: 'Get detailed information about a specific dataset',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The ID of the dataset to retrieve' },
          },
          required: ['dataset_id'],
        },
      },
      {
        name: 'search_datasets',
        description: 'Search for datasets by name or description',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for datasets' },
            limit: { type: 'number', description: 'Maximum number of results', default: 10 },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_observation',
        description: 'Get specific data observations with dimension filters',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The ID of the dataset' },
            edition: { type: 'string', description: 'Dataset edition', default: 'time-series' },
            version: { type: 'string', description: 'Dataset version', default: 'latest' },
            dimensions: { 
              type: 'object', 
              description: 'Dimension filters as key-value pairs (e.g., {"geography": "K02000001", "time": "2023"})' 
            },
          },
          required: ['dataset_id', 'dimensions'],
        },
      },
      {
        name: 'get_latest_data',
        description: 'Get the latest available data for a dataset with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_id: { type: 'string', description: 'The ID of the dataset' },
            geography: { type: 'string', description: 'Geographic filter (e.g., K02000001 for UK)' },
            time_period: { type: 'string', description: 'Time period filter (e.g., 2023, Q1-2023)' },
          },
          required: ['dataset_id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_datasets': {
        const { limit, offset } = ListDatasetsArgsSchema.parse(args);
        const datasets = await datasetService.listDatasets({ limit, offset });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                datasets: datasets.items,
                total: datasets.total_count,
                limit,
                offset,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_dataset': {
        const { dataset_id } = GetDatasetArgsSchema.parse(args);
        const dataset = await datasetService.getDataset(dataset_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dataset, null, 2),
            },
          ],
        };
      }

      case 'search_datasets': {
        const { query, limit } = SearchDatasetsArgsSchema.parse(args);
        const results = await datasetService.searchDatasets(query, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                results: results.items,
                total: results.total_count,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_observation': {
        const { dataset_id, edition, version, dimensions } = GetObservationArgsSchema.parse(args);
        const observations = await datasetService.getObservations(dataset_id, edition, version, dimensions);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(observations, null, 2),
            },
          ],
        };
      }

      case 'get_latest_data': {
        const { dataset_id, geography, time_period } = GetLatestDataArgsSchema.parse(args);
        const data = await datasetService.getLatestData(dataset_id, geography, time_period);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw error;
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'ons://popular_datasets',
        name: 'Popular ONS Datasets',
        description: 'List of commonly used ONS datasets',
        mimeType: 'application/json',
      },
      {
        uri: 'ons://api_info',
        name: 'ONS API Information',
        description: 'Information about the ONS API endpoints and capabilities',
        mimeType: 'application/json',
      },
    ],
  };
});

// Handle resource requests
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'ons://popular_datasets':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              popular_datasets: [
                {
                  id: 'cpih01',
                  title: 'Consumer Price Index including Housing',
                  description: 'UK inflation data',
                },
                {
                  id: 'regional-gdp-by-year',
                  title: 'Regional GDP by Year',
                  description: 'GDP data by UK regions',
                },
                {
                  id: 'wellbeing-local-authority',
                  title: 'Personal Wellbeing by Local Authority',
                  description: 'Wellbeing statistics by local area',
                },
                {
                  id: 'uk-spending-on-cards',
                  title: 'UK Spending on Cards',
                  description: 'Card spending data',
                },
              ],
            }, null, 2),
          },
        ],
      };

    case 'ons://api_info':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              api_info: {
                base_url: 'https://api.beta.ons.gov.uk/v1',
                authentication: 'None required',
                rate_limits: 'Standard fair use policy',
                data_format: 'JSON',
                documentation: 'https://developer.ons.gov.uk/',
              },
            }, null, 2),
          },
        ],
      };

    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('UK ONS MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
