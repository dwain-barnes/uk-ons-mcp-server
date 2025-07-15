import axios, { AxiosInstance } from 'axios';

export interface ONSDataset {
  id: string;
  title: string;
  description: string;
  links: {
    self: { href: string };
    latest_version: { href: string };
    editions: { href: string };
  };
  state: string;
  type: string;
  uri: string;
  qmi?: {
    href: string;
    title: string;
  };
  methodology?: {
    href: string;
    title: string;
  };
  contacts?: Array<{
    email: string;
    name: string;
    telephone: string;
  }>;
  dimensions?: Array<{
    id: string;
    name: string;
    label: string;
    links: {
      options: { href: string };
      self: { href: string };
    };
  }>;
}

export interface ONSDatasetList {
  count: number;
  items: ONSDataset[];
  limit: number;
  offset: number;
  total_count: number;
}

export interface ONSObservation {
  dimensions: Record<string, string>;
  observation: string;
  metadata?: Record<string, any>;
}

export interface ONSObservationResponse {
  observations: ONSObservation[];
  dimensions: Record<string, any>;
  links: Record<string, any>;
  total_observations: number;
}

export class ONSApiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.beta.ons.gov.uk/v1';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'uk_ons_mcp_server/1.0.0',
      },
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.message;
          
          switch (status) {
            case 404:
              throw new Error(`ONS API: Resource not found - ${message}`);
            case 400:
              throw new Error(`ONS API: Bad request - ${message}`);
            case 429:
              throw new Error(`ONS API: Rate limit exceeded - ${message}`);
            case 500:
              throw new Error(`ONS API: Server error - ${message}`);
            default:
              throw new Error(`ONS API: HTTP ${status} - ${message}`);
          }
        }
        throw new Error(`ONS API: Network error - ${error.message}`);
      }
    );
  }

  /**
   * List all available datasets
   */
  async listDatasets(limit: number = 20, offset: number = 0): Promise<ONSDatasetList> {
    const response = await this.client.get(`/datasets`, {
      params: { limit, offset },
    });
    return response.data;
  }

  /**
   * Get detailed information about a specific dataset
   */
  async getDataset(datasetId: string): Promise<ONSDataset> {
    const response = await this.client.get(`/datasets/${datasetId}`);
    return response.data;
  }

  /**
   * Get the latest version of a dataset
   */
  async getLatestVersion(datasetId: string, edition: string = 'time-series'): Promise<any> {
    const response = await this.client.get(`/datasets/${datasetId}/editions/${edition}/versions/latest`);
    return response.data;
  }

  /**
   * Get observations for a dataset with specific dimensions
   */
  async getObservations(
    datasetId: string,
    edition: string = 'time-series',
    version: string = 'latest',
    dimensions: Record<string, string>
  ): Promise<ONSObservationResponse> {
    // Build query string for dimensions
    const dimensionParams = Object.entries(dimensions)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const url = `/datasets/${datasetId}/editions/${edition}/versions/${version}/observations?${dimensionParams}`;
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * Get CSV download URL for a dataset
   */
  async getDownloadUrl(datasetId: string, edition: string = 'time-series'): Promise<string> {
    const latestVersion = await this.getLatestVersion(datasetId, edition);
    return latestVersion.downloads?.csv?.href || '';
  }

  /**
   * Search datasets (simple text search across titles and descriptions)
   */
  async searchDatasets(query: string, limit: number = 10): Promise<ONSDatasetList> {
    // Note: ONS API doesn't have native search, so we'll get all datasets and filter
    const allDatasets = await this.listDatasets(100, 0);
    const searchTerm = query.toLowerCase();
    
    const filteredItems = allDatasets.items.filter(dataset => 
      dataset.title.toLowerCase().includes(searchTerm) || 
      dataset.description.toLowerCase().includes(searchTerm) ||
      dataset.id.toLowerCase().includes(searchTerm)
    ).slice(0, limit);

    return {
      count: filteredItems.length,
      items: filteredItems,
      limit,
      offset: 0,
      total_count: filteredItems.length,
    };
  }

  /**
   * Get popular/commonly used datasets
   */
  getPopularDatasets(): string[] {
    return [
      'cpih01',
      'regional-gdp-by-year',
      'wellbeing-local-authority',
      'uk-spending-on-cards',
      'weekly-deaths-region',
      'trade',
      'ageing-population-estimates',
      'wellbeing-quarterly',
      'traffic-camera-activity',
      'tax-benefits-statistics',
    ];
  }

  /**
   * Get dimensions for a dataset
   */
  async getDatasetDimensions(datasetId: string): Promise<any> {
    const dataset = await this.getDataset(datasetId);
    return dataset.dimensions || [];
  }

  /**
   * Get dimension options for a specific dimension
   */
  async getDimensionOptions(datasetId: string, dimensionId: string): Promise<any> {
    const response = await this.client.get(`/datasets/${datasetId}/dimensions/${dimensionId}/options`);
    return response.data;
  }

  /**
   * Health check - verify API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/datasets?limit=1');
      return true;
    } catch {
      return false;
    }
  }
}
