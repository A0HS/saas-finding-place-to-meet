"use client";

import { useEffect, useRef } from "react";

interface NaverMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export default function NaverMap({ lat, lng, className = "" }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const naverMaps = (window as any).naver?.maps;
    if (!mapRef.current || !naverMaps) return;

    const position = new naverMaps.LatLng(lat, lng);

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new naverMaps.Map(mapRef.current, {
        center: position,
        zoom: 16,
        zoomControl: true,
        zoomControlOptions: {
          position: naverMaps.Position.TOP_RIGHT,
        },
      });

      markerRef.current = new naverMaps.Marker({
        position,
        map: mapInstanceRef.current,
      });
    } else {
      (mapInstanceRef.current as any).setCenter(position);
      (markerRef.current as any)?.setPosition(position);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [lat, lng]);

  return <div ref={mapRef} className={`w-full h-64 rounded-lg ${className}`} />;
}
