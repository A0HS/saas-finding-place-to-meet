export interface DemoFriend {
  id: string;
  name: string;
  address_raw: string;
  address_display: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DemoPlace {
  id: string;
  name: string;
  category_id: string | null;
  category: { id: string; name: string } | null;
  address_raw: string;
  address_display: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DemoCategory {
  id: string;
  name: string;
  places_count?: number;
}

export const DUMMY_FRIENDS: DemoFriend[] = [
  {
    id: "demo-1",
    name: "김민수",
    address_raw: "서울 용산구 한강대로 405",
    address_display: "서울특별시 용산구 한강대로 405",
    latitude: 37.5547,
    longitude: 126.9707,
  },
  {
    id: "demo-2",
    name: "이서연",
    address_raw: "서울 강남구 강남대로 396",
    address_display: "서울특별시 강남구 강남대로 396",
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "demo-3",
    name: "박지훈",
    address_raw: "서울 마포구 양화로 160",
    address_display: "서울특별시 마포구 양화로 160",
    latitude: 37.5563,
    longitude: 126.9237,
  },
  {
    id: "demo-4",
    name: "최유진",
    address_raw: "서울 송파구 올림픽로 300",
    address_display: "서울특별시 송파구 올림픽로 300",
    latitude: 37.5133,
    longitude: 127.1000,
  },
  {
    id: "demo-5",
    name: "정현우",
    address_raw: "서울 서대문구 신촌로 73",
    address_display: "서울특별시 서대문구 신촌로 73",
    latitude: 37.5550,
    longitude: 126.9368,
  },
];

export const DUMMY_PLACES: DemoPlace[] = [
  {
    id: "demo-place-1",
    name: "을지로입구역 스타벅스",
    category_id: null,
    category: null,
    address_raw: "서울 중구 을지로 65",
    address_display: "서울특별시 중구 을지로 65",
    latitude: 37.5660,
    longitude: 126.9827,
  },
];

export const DUMMY_CATEGORIES: DemoCategory[] = [];
