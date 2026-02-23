export interface GeocodeResult {
  lat: number;
  lng: number;
  displayAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const naverMaps = (window as any).naver?.maps;
    if (!naverMaps?.Service) {
      reject(new Error("네이버 지도 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요."));
      return;
    }

    naverMaps.Service.geocode({ query: address }, (status: any, response: any) => {
      if (status !== naverMaps.Service.Status.OK) {
        reject(new Error(`지오코딩에 실패했습니다. (status: ${status})`));
        return;
      }

      const result = response.v2;
      if (!result.addresses || result.addresses.length === 0) {
        reject(new Error("해당 주소를 찾을 수 없습니다."));
        return;
      }

      const addr = result.addresses[0];
      resolve({
        lat: parseFloat(addr.y),
        lng: parseFloat(addr.x),
        displayAddress: addr.roadAddress || addr.jibunAddress || address,
      });
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const naverMaps = (window as any).naver?.maps;
    if (!naverMaps?.Service) {
      reject(new Error("네이버 지도 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요."));
      return;
    }

    naverMaps.Service.reverseGeocode(
      {
        coords: new naverMaps.LatLng(lat, lng),
        orders: [naverMaps.Service.OrderType.ROAD_ADDR, naverMaps.Service.OrderType.ADDR].join(","),
      },
      (status: any, response: any) => {
        if (status !== naverMaps.Service.Status.OK) {
          reject(new Error(`역지오코딩에 실패했습니다. (status: ${status})`));
          return;
        }

        const result = response.v2;
        const items = result.results;
        if (!items || items.length === 0) {
          reject(new Error("해당 위치의 주소를 찾을 수 없습니다."));
          return;
        }

        // ROAD_ADDR 우선, 없으면 ADDR 사용
        const roadItem = items.find((i: any) => i.name === "roadaddr");
        const addrItem = items.find((i: any) => i.name === "addr");
        const item = roadItem || addrItem;

        if (!item) {
          reject(new Error("해당 위치의 주소를 찾을 수 없습니다."));
          return;
        }

        const land = item.land;
        const region = item.region;
        let displayAddress: string;

        if (item.name === "roadaddr" && land) {
          const area1 = region?.area1?.name || "";
          const area2 = region?.area2?.name || "";
          const roadName = land.name || "";
          const number = land.number1 || "";
          const number2 = land.number2 ? `-${land.number2}` : "";
          displayAddress = `${area1} ${area2} ${roadName} ${number}${number2}`.trim();
        } else if (land) {
          const area1 = region?.area1?.name || "";
          const area2 = region?.area2?.name || "";
          const area3 = region?.area3?.name || "";
          const number = land.number1 || "";
          const number2 = land.number2 ? `-${land.number2}` : "";
          displayAddress = `${area1} ${area2} ${area3} ${number}${number2}`.trim();
        } else {
          displayAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        resolve({ lat, lng, displayAddress });
      }
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
}
