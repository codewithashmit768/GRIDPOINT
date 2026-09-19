export interface Neighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
  orders: number;
}

export const SAMPLE_NEIGHBORHOODS: Neighborhood[] = [
  { id: "n1",  name: "Koramangala",       lat: 12.9352, lng: 77.6245, orders: 450 },
  { id: "n2",  name: "Indiranagar",        lat: 12.9784, lng: 77.6408, orders: 380 },
  { id: "n3",  name: "HSR Layout",         lat: 12.9121, lng: 77.6446, orders: 410 },
  { id: "n4",  name: "Whitefield",         lat: 12.9698, lng: 77.7500, orders: 520 },
  { id: "n5",  name: "Electronic City",    lat: 12.8452, lng: 77.6602, orders: 490 },
  { id: "n6",  name: "Jayanagar",          lat: 12.9308, lng: 77.5838, orders: 310 },
  { id: "n7",  name: "JP Nagar",           lat: 12.9063, lng: 77.5857, orders: 280 },
  { id: "n8",  name: "Marathahalli",       lat: 12.9591, lng: 77.6974, orders: 360 },
  { id: "n9",  name: "Bellandur",          lat: 12.9304, lng: 77.6784, orders: 470 },
  { id: "n10", name: "Malleshwaram",       lat: 13.0031, lng: 77.5643, orders: 220 },
  { id: "n11", name: "Hebbal",             lat: 13.0358, lng: 77.5970, orders: 260 },
  { id: "n12", name: "BTM Layout",         lat: 12.9166, lng: 77.6101, orders: 340 },
];