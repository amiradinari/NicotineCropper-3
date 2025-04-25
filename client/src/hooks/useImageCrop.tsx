import { useState, useCallback } from "react";
import { Area } from "react-easy-crop/types";
import { createCircleCrop } from "@/lib/imageUtils";

export function useImageCrop() {
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const cropImage = useCallback(
    async (
      imageSrc: string,
      croppedAreaPixels: Area
    ) => {
      try {
        const canvas = document.createElement("canvas");
        await createCircleCrop(imageSrc, croppedAreaPixels, canvas);
        const dataUrl = canvas.toDataURL("image/png");
        setCroppedImage(dataUrl);
        return dataUrl;
      } catch (error) {
        console.error("Error cropping image:", error);
        throw error;
      }
    },
    []
  );

  return { croppedImage, cropImage };
}
