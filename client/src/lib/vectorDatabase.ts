/**
 * Vector Database for Product Identification
 * This module provides functionality to find the nearest product by vector similarity.
 */

// Define the product vector type
export interface ProductVector {
  id: string;
  name: string;
  strength?: string;
  vector: number[];
}

// Initial empty array that will be populated from JSON
export const productVectors: ProductVector[] = [];

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
 * @param jsonData JSON string containing vectors and product metadata
 */
export function loadProductVectorsFromJSON(jsonData: string): void {
  try {
    const data = JSON.parse(jsonData);
    
    if (data && data.vectors && Array.isArray(data.vectors)) {
      // Clear existing vectors
      productVectors.length = 0;
      
      // Add vectors with product information if available
      data.vectors.forEach((vector: number[], index: number) => {
        let productInfo = {
          id: `P${String(index + 1).padStart(3, '0')}`,
          name: `Product ${index + 1}`,
          vector: vector
        };
        
        // Use product metadata if available
        if (data.products && Array.isArray(data.products) && data.products[index]) {
          const productData = data.products[index];
          productInfo = {
            ...productInfo,
            id: productData.id || productInfo.id,
            name: productData.name || productInfo.name,
            strength: productData.strength
          };
        }
        
        productVectors.push(productInfo);
      });
      
      console.log(`Loaded ${productVectors.length} product vectors`);
    }
  } catch (error) {
    console.error('Failed to parse vector JSON:', error);
  }
}