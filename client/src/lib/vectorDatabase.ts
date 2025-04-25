/**
 * Vector Database for Product Identification
 * This module provides functionality to find the nearest product by vector similarity.
 */

// Define the product vector type
export interface ProductVector {
  id: string;
  name: string;
  vector: number[];
}

// Sample product database with vectors
// This would normally be loaded from a server or external API
export const productVectors: ProductVector[] = [
  {
    id: "P001",
    name: "Nordic Spirit Mint",
    vector: [0.158, 0.347, 1.045, 0.0, 0.832, 1.605, 1.675, 0.161, 0.0, 0.011, 0.608]
  },
  {
    id: "P002",
    name: "LYFT Freeze X-Strong",
    vector: [0.245, 0.456, 0.987, 0.123, 0.765, 1.432, 1.543, 0.234, 0.098, 0.023, 0.543]
  },
  {
    id: "P003",
    name: "Zyn Citrus",
    vector: [0.321, 0.534, 1.123, 0.076, 0.912, 1.765, 1.834, 0.176, 0.045, 0.034, 0.723]
  },
  {
    id: "P004",
    name: "Skruf Super White",
    vector: [0.187, 0.398, 1.076, 0.024, 0.843, 1.621, 1.687, 0.155, 0.012, 0.018, 0.612]
  },
  {
    id: "P005",
    name: "VELO Polar Mint",
    vector: [0.267, 0.423, 1.034, 0.056, 0.789, 1.598, 1.654, 0.143, 0.032, 0.027, 0.587]
  }
];

/**
 * Calculate Euclidean distance between two vectors
 */
function euclideanDistance(a: number[], b: number[]): number {
  // Use the shorter vector length to avoid index errors
  const length = Math.min(a.length, b.length);
  let sum = 0;
  
  for (let i = 0; i < length; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  // Use the shorter vector length to avoid index errors
  const length = Math.min(a.length, b.length);
  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;
  
  for (let i = 0; i < length; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;
    
    dotProduct += aVal * bVal;
    aMagnitude += aVal * aVal;
    bMagnitude += bVal * bVal;
  }
  
  aMagnitude = Math.sqrt(aMagnitude);
  bMagnitude = Math.sqrt(bMagnitude);
  
  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }
  
  return dotProduct / (aMagnitude * bMagnitude);
}

/**
 * Find the nearest product by vector
 * @param queryVector The vector to search for
 * @param topK Number of results to return
 * @returns Array of nearest products with similarity scores
 */
export function findNearestProducts(
  queryVector: number[], 
  topK: number = 3
): Array<{ product: ProductVector, similarity: number }> {
  // Calculate similarity for each product
  const similarities = productVectors.map(product => ({
    product,
    similarity: cosineSimilarity(queryVector, product.vector)
  }));
  
  // Sort by similarity (highest first)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K results
  return similarities.slice(0, topK);
}

/**
 * Load product vectors from a file or external source
 * @param vectors Array of vectors from external source
 */
export function loadProductVectors(vectors: any[]): void {
  // Clear existing vectors
  productVectors.length = 0;
  
  // Add new vectors
  vectors.forEach((vector, index) => {
    productVectors.push({
      id: `P${String(index + 1).padStart(3, '0')}`,
      name: `Product ${index + 1}`,
      vector: vector
    });
  });
}

/**
 * Load product vectors from JSON string
 * @param jsonData JSON string containing vectors
 */
export function loadProductVectorsFromJSON(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);
    if (data && data.vectors && Array.isArray(data.vectors)) {
      loadProductVectors(data.vectors);
    }
  } catch (error) {
    console.error('Failed to parse vector JSON:', error);
  }
}