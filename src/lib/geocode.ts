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
