declare namespace naver.maps {
  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    setCenter(latlng: LatLng): void;
    setZoom(zoom: number): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
  }

  class Marker {
    constructor(options: MarkerOptions);
    setPosition(latlng: LatLng): void;
    setMap(map: Map | null): void;
  }

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    zoomControl?: boolean;
    zoomControlOptions?: {
      position?: unknown;
    };
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
  }

  const Position: {
    TOP_RIGHT: unknown;
    TOP_LEFT: unknown;
    BOTTOM_RIGHT: unknown;
    BOTTOM_LEFT: unknown;
  };
}
