
import { fromArrayBuffer } from 'geotiff';

// TODO: add unit tests

export class ElevationDataProvider {
    private tiff: any = null;
    private image: any = null;
    private raster: any = null;
    private isReady: boolean = false;
    private gpsToPixel: number[] = [];
  
    async initialize(source: string): Promise<void> {
      try {
        const response = await fetch(source);
        const arrayBuffer = await response.arrayBuffer();
        this.tiff = await fromArrayBuffer(arrayBuffer);
        this.image = await this.tiff.getImage();
        const rasters = await this.image.readRasters();
        this.raster = rasters[0];
        
        // Setup transformation matrices
        this.setupTransformationMatrices();
        
        this.isReady = true;
      } catch (error) {
        console.error('Failed to initialize elevation data:', error);
        throw error;
      }
    }
  
    getElevationFromGPS(lng: number, lat: number): number {
      if (!this.isReady) {
        console.warn('Elevation data not ready yet');
        return 0;
      }
      
      const [x, y] = this.transform(lng, lat, this.gpsToPixel, true);
      const width = this.image.getWidth();
      const index = x + y * width;
      
      if (index < 0 || index >= this.raster.length) {
        console.warn(`Index ${index} out of bounds for elevation data`);
        return 0;
      }
      
      return this.raster[index];
    }
    
    private setupTransformationMatrices(): void {
      const { ModelPixelScale: s, ModelTiepoint: t } = this.image.fileDirectory;
      let [sx, sy, _sz] = s;
      let [_px, _py, _k, gx, gy, _gz] = t;
      sy = -sy; // WGS-84 tiles have a "flipped" y component
      
      // Create transformation matrices
      this.gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];
    }
    private transform(a: number, b: number, M: number[], roundToInt = false): number[] {
      const round = (v: number) => (roundToInt ? v | 0 : v);
      return [
        round(M[0] + M[1] * a + M[2] * b),
        round(M[3] + M[4] * a + M[5] * b),
      ];
    }
  }