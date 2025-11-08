export interface DetectedPerson {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: {
    r: number;
    g: number;
    b: number;
  };
  confidence: number;
}
