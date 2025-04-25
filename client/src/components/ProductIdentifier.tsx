import { useState, useEffect } from "react";
import { findNearestProducts, loadProductVectorsFromJSON, ProductVector } from "@/lib/vectorDatabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader, Search, Zap, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductIdentifierProps {
  featureVector?: number[];
}

export default function ProductIdentifier({ featureVector }: ProductIdentifierProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVectorDBLoaded, setIsVectorDBLoaded] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Array<{ product: ProductVector, similarity: number }>>([]);
  const { toast } = useToast();

  // Load vector database on component mount
  useEffect(() => {
    const loadVectorDB = async () => {
      try {
        // Fetch the vectors.json file
        const response = await fetch('/data/vectors.json');
        if (!response.ok) {
          throw new Error('Failed to load product vectors');
        }
        
        const data = await response.text();
        loadProductVectorsFromJSON(data);
        setIsVectorDBLoaded(true);
      } catch (error) {
        console.error('Error loading vector database:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load product database",
        });
      }
    };
    
    loadVectorDB();
  }, [toast]);

  // Identify product when feature vector is provided
  const identifyProduct = async () => {
    if (!featureVector || featureVector.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing Data",
        description: "No feature vector provided for identification",
      });
      return;
    }
    
    if (!isVectorDBLoaded) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Product database is still loading",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Find the nearest products
      const nearestProducts = findNearestProducts(featureVector, 3);
      setMatchedProducts(nearestProducts);
      
      if (nearestProducts.length > 0) {
        toast({
          title: "Product Identified",
          description: `Found match: ${nearestProducts[0].product.name}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "No Match",
          description: "Could not find a matching product",
        });
      }
    } catch (error) {
      console.error('Error identifying product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to identify product",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col bg-white rounded-lg shadow-sm p-4">
      <Button 
        onClick={identifyProduct}
        className="flex items-center justify-center"
        disabled={isLoading || !featureVector || !isVectorDBLoaded}
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Identifying Product...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Identify Product
          </>
        )}
      </Button>
      
      <div className="text-xs text-center mt-1 text-gray-500">
        Uses vector similarity to find the closest product match
      </div>
      
      {matchedProducts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Matched Products</h3>
          
          <div className="space-y-3">
            {matchedProducts.map((match, index) => (
              <div 
                key={match.product.id}
                className={`p-3 rounded border ${index === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {index === 0 && <Check className="h-4 w-4 text-green-500 mr-2" />}
                    <span className="font-medium">{match.product.name}</span>
                  </div>
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    {(match.similarity * 100).toFixed(1)}% match
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Product ID: {match.product.id}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <p className="flex items-center">
              <Zap className="h-3 w-3 mr-1 text-blue-500" />
              Based on extracted features and vector similarity
            </p>
          </div>
        </div>
      )}
    </div>
  );
}