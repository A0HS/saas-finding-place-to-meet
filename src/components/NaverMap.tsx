"use client";

import { useEffect, useRef } from "react";

interface NaverMapProps {
  lat: number;
  lng: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function NaverMap({ lat, lng, className = "", onMapClick }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const clickListenerRef = useRef<unknown>(null);

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

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const naverMaps = (window as any).naver?.maps;
    const map = mapInstanceRef.current as any;
    if (!map || !naverMaps) return;

    // Remove previous click listener
    if (clickListenerRef.current) {
      naverMaps.Event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (onMapClick) {
      clickListenerRef.current = naverMaps.Event.addListener(map, "click", (e: any) => {
        const coord = e.coord;
        onMapClick(coord.lat(), coord.lng());
        // Move marker to clicked position
        (markerRef.current as any)?.setPosition(coord);
      });
    }

    return () => {
      if (clickListenerRef.current) {
        naverMaps.Event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, [onMapClick]);

  return <div ref={mapRef} className={`w-full h-64 rounded-lg ${className}`} />;
}
