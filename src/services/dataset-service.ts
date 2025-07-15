import { ONSApiClient, ONSDatasetList, ONSDataset, ONSObservationResponse } from '../api/ons-client.js';

export interface DatasetListOptions {
  limit: number;
  offset: number;
}

export interface LatestDataOptions {
  geography?: string;
  time_period?: string;
}

export class ONSDatasetService {
  constructor(private apiClient: ONSApiClient) {}

  /**
   * List datasets with pagination
   */
  async listDatasets(options: DatasetListOptions): Promise<ONSDatasetList> {
    return this.apiClient.listDatasets(options.limit, options.offset);
  }

  /**
   * Get a specific dataset by ID
   */
  async getDataset(datasetId: string): Promise<ONSDataset> {
    return this.apiClient.getDataset(datasetId);
  }

  /**
   * Search datasets by query
   */
  async searchDatasets(query: string, limit: number = 10): Promise<ONSDatasetList> {
    return this.apiClient.searchDatasets(query, limit);
  }

  /**
   * Get observations with dimension filters
   */
  async getObservations(
    datasetId: string,
    edition: string = 'time-series',
    version: string = 'latest',
    dimensions: Record<string, string>
  ): Promise<ONSObservationResponse> {
    return this.apiClient.getObservations(datasetId, edition, version, dimensions);
  }

  /**
   * Get the latest available data for a dataset with common filters
   */
  async getLatestData(
    datasetId: string,
    geography?: string,
    timePeriod?: string
  ): Promise<any> {
    try {
      // Get dataset info to understand available dimensions
      const dataset = await this.getDataset(datasetId);
      
      // Build dimension filters
      const dimensions: Record<string, string> = {};
      
      // Add geography filter if provided
      if (geography) {
        dimensions.geography = geography;
      }
      
      // Add time filter if provided
      if (timePeriod) {
        dimensions.time = timePeriod;
      }
      
      // If no specific dimensions provided, try to get recent data
      if (Object.keys(dimensions).length === 0) {
        // For time-series data, try to get latest time period
        if (dataset.dimensions?.some(d => d.id === 'time')) {
          dimensions.time = '*'; // Use wildcard to get all time periods
        }
        
        // Default to UK-wide data if geography dimension exists
        if (dataset.dimensions?.some(d => d.id === 'geography')) {
          dimensions.geography = 'K02000001'; // UK country code
        }
      }
      
      // Get observations
      const observations = await this.getObservations(datasetId, 'time-series', 'latest', dimensions);
      
      // Process and format the response
      return {
        dataset_id: datasetId,
        dataset_title: dataset.title,
        dataset_description: dataset.description,
        filters_applied: {
          geography,
          time_period: timePeriod,
        },
        dimensions_used: dimensions,
        total_observations: observations.total_observations,
        observations: observations.observations,
        metadata: {
          dimensions: observations.dimensions,
          links: observations.links,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get latest data for ${datasetId}: ${errorMessage}`);
    }
  }

  /**
   * Get popular datasets with metadata
   */
  async getPopularDatasets(): Promise<ONSDataset[]> {
    const popularIds = this.apiClient.getPopularDatasets();
    const datasets: ONSDataset[] = [];
    
    for (const id of popularIds.slice(0, 10)) { // Limit to first 10 to avoid too many requests
      try {
        const dataset = await this.getDataset(id);
        datasets.push(dataset);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to fetch popular dataset ${id}:`, errorMessage);
      }
    }
    
    return datasets;
  }

  /**
   * Get dataset dimensions and their options
   */
  async getDatasetDimensions(datasetId: string): Promise<any> {
    const dataset = await this.getDataset(datasetId);
    const dimensions = dataset.dimensions || [];
    
    const dimensionDetails = await Promise.all(
      dimensions.map(async (dim) => {
        try {
          const options = await this.apiClient.getDimensionOptions(datasetId, dim.id);
          return {
            id: dim.id,
            name: dim.name,
            label: dim.label,
            options: options.items || [],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            id: dim.id,
            name: dim.name,
            label: dim.label,
            options: [],
            error: errorMessage,
          };
        }
      })
    );
    
    return {
      dataset_id: datasetId,
      dataset_title: dataset.title,
      dimensions: dimensionDetails,
    };
  }

  /**
   * Get time series data for a specific geography
   */
  async getTimeSeriesData(
    datasetId: string,
    geography: string = 'K02000001' // Default to UK
  ): Promise<any> {
    const dimensions = {
      geography,
      time: '*', // Get all time periods
    };
    
    const observations = await this.getObservations(datasetId, 'time-series', 'latest', dimensions);
    
    // Sort observations by time if time dimension exists
    const sortedObservations = observations.observations.sort((a, b) => {
      const timeA = a.dimensions.time || '';
      const timeB = b.dimensions.time || '';
      return timeA.localeCompare(timeB);
    });
    
    return {
      dataset_id: datasetId,
      geography,
      time_series: sortedObservations,
      total_observations: observations.total_observations,
    };
  }

  /**
   * Get regional comparison data
   */
  async getRegionalData(
    datasetId: string,
    timePeriod?: string
  ): Promise<any> {
    const dimensions: Record<string, string> = {
      geography: '*', // Get all geographies
    };
    
    if (timePeriod) {
      dimensions.time = timePeriod;
    }
    
    const observations = await this.getObservations(datasetId, 'time-series', 'latest', dimensions);
    
    return {
      dataset_id: datasetId,
      time_period: timePeriod,
      regional_data: observations.observations,
      total_observations: observations.total_observations,
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: string; api_accessible: boolean }> {
    const apiAccessible = await this.apiClient.healthCheck();
    return {
      status: apiAccessible ? 'healthy' : 'unhealthy',
      api_accessible: apiAccessible,
    };
  }
}
