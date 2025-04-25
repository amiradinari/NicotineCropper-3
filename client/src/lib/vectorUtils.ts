/**
 * Utility functions for working with feature vectors
 */

/**
 * Parse a feature vector from JSON or string input
 * @param input The input string or object containing vector data
 * @returns The parsed feature vector or null if parsing failed
 */
export function parseFeatureVector(input: string | object): number[] | null {
  try {
    let data: any;
    
    // If the input is a string, try to parse it as JSON
    if (typeof input === 'string') {
      data = JSON.parse(input);
    } else {
      data = input;
    }
    
    // Check if the input contains a vectors array
    if (data && data.vectors && Array.isArray(data.vectors) && data.vectors.length > 0) {
      return data.vectors[0]; // Use the first vector in the array
    }
    
    // Check if the input is already an array of numbers
    if (Array.isArray(data) && data.every(item => typeof item === 'number')) {
      return data;
    }
    
    // Check if the input is a single vector object
    if (data && data.vector && Array.isArray(data.vector)) {
      return data.vector;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing feature vector:', error);
    return null;
  }
}

/**
 * Load a feature vector from the provided JSON string
 * @param jsonString JSON string containing vector data
 * @returns The loaded feature vector or null if loading failed
 */
export function loadFeatureVectorFromJSON(jsonString: string): number[] | null {
  return parseFeatureVector(jsonString);
}

/**
 * Create a sample feature vector for testing purposes
 * @returns A sample feature vector
 */
export function createSampleFeatureVector(): number[] {
  // Create a random vector with 128 dimensions
  return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
}