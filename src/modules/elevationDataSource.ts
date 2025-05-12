import { fromArrayBuffer } from 'geotiff';

// TODO: add unit tests

/**
 * Provides methods to load and interpolate elevation data from a GeoTIFF DEM source.
 * Handles transformation from GPS coordinates to pixel coordinates and bilinear interpolation of elevation data.
 */
export class ElevationDataProvider {
  private tiff: any = null;
  private image: any = null;
  private raster: any = null;
  private isReady: boolean = false;
  private gpsToPixel: number[] = [];

  /**
   * Loads a GeoTIFF DEM file from the provided source URL and initializes the provider.
   * Sets up the transformation matrix for GPS to pixel conversion.
   * @param source - URL to the GeoTIFF DEM file
   * @throws Error if loading or parsing fails
   */
  async initialize(source: string): Promise<void> {
    try {
      const response = await fetch(source);
      const arrayBuffer = await response.arrayBuffer();
      this.tiff = await fromArrayBuffer(arrayBuffer);
      this.image = await this.tiff.getImage();
      const rasters = await this.image.readRasters();
      this.raster = rasters[0];

      // Setup gpsToPixeltransformation matrix
      this.setupTransformationMatrix();

      this.isReady = true;
    } catch (error) {
      console.error('Failed to initialize elevation data:', error);
      throw error;
    }
  }

  /**
   * Bilinearly interpolates elevation from DEM data for given GPS coordinates.
   * @param lng - Longitude in WGS-84
   * @param lat - Latitude in WGS-84
   * @returns Interpolated elevation value (meters)
   */
  getElevation(lng: number, lat: number): number {
    if (!this.isReady) {
      console.warn('Elevation data not ready yet');
      return 0;
    }

    // Transform GPS to floating-point pixel coordinates
    const M = this.gpsToPixel;
    const x = M[0] + M[1] * lng + M[2] * lat;
    const y = M[3] + M[4] * lng + M[5] * lat;

    const width = this.image.getWidth();
    const height = this.image.getHeight();

    // Get integer pixel bounds
    const x0 = Math.floor(x);
    const x1 = Math.ceil(x);
    const y0 = Math.floor(y);
    const y1 = Math.ceil(y);

    // Clamp to raster bounds
    if (x0 < 0 || x1 >= width || y0 < 0 || y1 >= height) {
      console.warn(`Pixel coordinates (${x}, ${y}) out of bounds for elevation data`);
      return 0;
    }

    // Helper to get elevation at (x, y)
    const idx = (xi: number, yi: number) => xi + yi * width;
    const q00 = this.raster[idx(x0, y0)];
    const q10 = this.raster[idx(x1, y0)];
    const q01 = this.raster[idx(x0, y1)];
    const q11 = this.raster[idx(x1, y1)];

    // Bilinear interpolation
    const tx = x - x0;
    const ty = y - y0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const r1 = lerp(q00, q10, tx);
    const r2 = lerp(q01, q11, tx);
    return lerp(r1, r2, ty);
  }

  /**
   * Computes the transformation matrix to convert GPS coordinates to pixel coordinates
   * based on the GeoTIFF file metadata.
   */
  private setupTransformationMatrix(): void {
    const { ModelPixelScale: s, ModelTiepoint: t } = this.image.fileDirectory;
    let [sx, sy, _sz] = s;
    let [_px, _py, _k, gx, gy, _gz] = t;
    sy = -sy; // WGS-84 tiles have a "flipped" y component

    // Create transformation matrix
    this.gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
  }
}
