// Foursquare Places API + demo fallback

import type { POI } from "../stores/locationStore";

const FOURSQUARE_API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;

// Demo POIs for when no API key is configured
const demoPOIs: POI[] = [
  {
    id: "poi-1",
    name: "Warung Babi Guling Ibu Oka",
    category: "Restaurant",
    distance: 180,
    address: "Jl. Tegal Sari No.2, Ubud",
    lat: -8.5069,
    lng: 115.2624,
    buddyMessage: "Hey Sarah! There's an amazing local warung just 180m away — Ibu Oka is legendary for their roast suckling pig. It matches your love for authentic local food!",
  },
  {
    id: "poi-2",
    name: "Tirta Empul Temple",
    category: "Cultural Site",
    distance: 450,
    address: "Jl. Tirta, Manukaya, Tampaksiring",
    lat: -8.4153,
    lng: 115.3153,
    buddyMessage: "I noticed you're near Tirta Empul — a sacred water temple perfect for a peaceful morning visit. It's only a 5 minute walk and it's quiet right now.",
  },
  {
    id: "poi-3",
    name: "Tegallalang Rice Terrace Café",
    category: "Café",
    distance: 320,
    address: "Tegallalang, Gianyar",
    lat: -8.4312,
    lng: 115.2793,
    buddyMessage: "There's a lovely café overlooking the rice terraces just 320m from you. Perfect spot for that quiet morning coffee you enjoy!",
  },
  {
    id: "poi-4",
    name: "Campuhan Ridge Walk",
    category: "Nature",
    distance: 600,
    address: "Jl. Raya Campuhan, Ubud",
    lat: -8.5104,
    lng: 115.2504,
    buddyMessage: "The Campuhan Ridge Walk is just 600m away — a beautiful hillside path between two valleys. Great for your slow-paced nature walks, especially in the golden hour.",
  },
];

export async function fetchNearbyPOIs(lat: number, lng: number): Promise<POI[]> {
  if (!FOURSQUARE_API_KEY) {
    // Return demo POIs with slight randomization
    return demoPOIs.slice(0, 2 + Math.floor(Math.random() * 3));
  }

  try {
    const res = await fetch(
      `https://api.foursquare.com/v3/places/search?ll=${lat},${lng}&radius=1000&limit=5&categories=13000,16000,10000`,
      {
        headers: {
          Accept: "application/json",
          Authorization: FOURSQUARE_API_KEY,
        },
      }
    );

    if (!res.ok) return demoPOIs.slice(0, 2);

    const data = await res.json();
    return data.results.map((place: any) => ({
      id: place.fsq_id,
      name: place.name,
      category: place.categories?.[0]?.name ?? "Place",
      distance: place.distance ?? 0,
      address: place.location?.formatted_address ?? place.location?.address ?? "",
      lat: place.geocodes?.main?.latitude ?? null,
      lng: place.geocodes?.main?.longitude ?? null,
      buddyMessage: `Hey Sarah! I found ${place.name} just ${place.distance}m away — looks like a great spot based on your preferences!`,
    }));
  } catch {
    return demoPOIs.slice(0, 2);
  }
}
