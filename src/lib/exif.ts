import exifr from "exifr";
import { calculateDistanceMeters } from "./geo";

export interface ExifExtractionResult {
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  capturedAt?: Date;
  make?: string;
  model?: string;
  isAuthenticCameraCapture: boolean;
}

export interface ExifSpoofCheck {
  isConsistent: boolean;
  distanceMeters?: number;
  warning?: string;
}

/**
 * Extracts GPS coordinates, timestamp and hardware metadata from image binary
 */
export async function extractExifData(buffer: Buffer | ArrayBuffer): Promise<ExifExtractionResult> {
  try {
    const data = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      exif: true,
    });

    if (!data) {
      return {
        hasGps: false,
        isAuthenticCameraCapture: false,
      };
    }

    const hasGps = typeof data.latitude === "number" && typeof data.longitude === "number";

    return {
      hasGps,
      latitude: hasGps ? data.latitude : undefined,
      longitude: hasGps ? data.longitude : undefined,
      altitude: typeof data.GPSAltitude === "number" ? data.GPSAltitude : undefined,
      capturedAt: data.DateTimeOriginal ? new Date(data.DateTimeOriginal) : undefined,
      make: data.Make || undefined,
      model: data.Model || undefined,
      isAuthenticCameraCapture: Boolean(data.Make || data.Model || data.DateTimeOriginal),
    };
  } catch (err) {
    console.warn("EXIF extraction notice:", err);
    return {
      hasGps: false,
      isAuthenticCameraCapture: false,
    };
  }
}

/**
 * Validates whether the EXIF GPS embedded in the photo matches the user's reported location
 */
export function verifyCoordinateCoherence(
  reportedLat: number,
  reportedLng: number,
  exifLat?: number,
  exifLng?: number,
  toleranceMeters: number = 300
): ExifSpoofCheck {
  if (exifLat === undefined || exifLng === undefined) {
    return {
      isConsistent: true, // No EXIF GPS found, graceful fallback allowed
    };
  }

  const dist = calculateDistanceMeters(reportedLat, reportedLng, exifLat, exifLng);

  if (dist > toleranceMeters) {
    return {
      isConsistent: false,
      distanceMeters: dist,
      warning: `Possible location spoofing: Photo EXIF indicates it was taken ${dist}m away from the reported incident coordinates.`,
    };
  }

  return {
    isConsistent: true,
    distanceMeters: dist,
  };
}
