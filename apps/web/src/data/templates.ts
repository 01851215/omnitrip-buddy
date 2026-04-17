export interface TemplateActivity {
  title: string;
  type: "transport" | "accommodation" | "experience" | "food" | "rest" | "free";
  estimatedCost: number;
}

export interface TemplateDestination {
  name: string;
  country: string;
  days: number;
  lat: number;
  lng: number;
  timezone: string;
  coverImage: string;
  activities: TemplateActivity[];
}

export interface Template {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  destinations: TemplateDestination[];
  totalBudget: number;
  duration: number;
  tags: string[];
}

export const templates: Template[] = [
  {
    id: "tpl-bali",
    title: "Bali: Spirit & Shore",
    description:
      "A two-week journey through Bali's spiritual heartland and sun-drenched coastline. Meditate in Ubud's rice-terrace temples, then unwind on Seminyak's golden beaches.",
    coverImage:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    destinations: [
      {
        name: "Ubud",
        country: "Indonesia",
        days: 7,
        lat: -8.5069,
        lng: 115.2625,
        timezone: "Asia/Makassar",
        coverImage:
          "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
        activities: [
          { title: "Tirta Empul Temple Purification", type: "experience", estimatedCost: 20 },
          { title: "Tegallalang Rice Terrace Walk", type: "experience", estimatedCost: 35 },
          { title: "Morning Yoga at The Yoga Barn", type: "rest", estimatedCost: 15 },
          { title: "Ceramics Workshop", type: "experience", estimatedCost: 180 },
          { title: "Dinner at Locavore", type: "food", estimatedCost: 55 },
          { title: "Sacred Monkey Forest", type: "experience", estimatedCost: 10 },
          { title: "Campuhan Ridge Walk at sunrise", type: "rest", estimatedCost: 0 },
        ],
      },
      {
        name: "Seminyak",
        country: "Indonesia",
        days: 7,
        lat: -8.6913,
        lng: 115.1683,
        timezone: "Asia/Makassar",
        coverImage:
          "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&q=80",
        activities: [
          { title: "Surf Lesson at Double Six", type: "experience", estimatedCost: 40 },
          { title: "Sunset at Ku De Ta", type: "food", estimatedCost: 60 },
          { title: "Balinese Spa Treatment", type: "rest", estimatedCost: 85 },
          { title: "Explore Seminyak Boutiques", type: "experience", estimatedCost: 50 },
          { title: "Beach Club Day at Potato Head", type: "rest", estimatedCost: 75 },
          { title: "Final Sunset Dinner at La Lucciola", type: "food", estimatedCost: 55 },
        ],
      },
    ],
    totalBudget: 2500,
    duration: 14,
    tags: ["spiritual", "beach", "wellness", "culture", "bali", "indonesia"],
  },
  {
    id: "tpl-japan",
    title: "Japan: Culture & Cuisine",
    description:
      "Twelve days weaving through Japan's ancient temples, neon-lit streets, and world-class kitchens. From Tokyo's energy to Kyoto's zen gardens and Osaka's street-food alleys.",
    coverImage:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    destinations: [
      {
        name: "Tokyo",
        country: "Japan",
        days: 4,
        lat: 35.6762,
        lng: 139.6503,
        timezone: "Asia/Tokyo",
        coverImage:
          "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
        activities: [
          { title: "Tsukiji Outer Market Food Tour", type: "food", estimatedCost: 80 },
          { title: "Senso-ji Temple Visit", type: "experience", estimatedCost: 0 },
          { title: "Shibuya & Harajuku Walkabout", type: "experience", estimatedCost: 30 },
          { title: "Ramen Alley Dinner", type: "food", estimatedCost: 25 },
          { title: "TeamLab Borderless", type: "experience", estimatedCost: 35 },
        ],
      },
      {
        name: "Kyoto",
        country: "Japan",
        days: 5,
        lat: 35.0116,
        lng: 135.7681,
        timezone: "Asia/Tokyo",
        coverImage:
          "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
        activities: [
          { title: "Fushimi Inari at Sunrise", type: "experience", estimatedCost: 0 },
          { title: "Tea Ceremony in Gion", type: "experience", estimatedCost: 50 },
          { title: "Arashiyama Bamboo Grove", type: "experience", estimatedCost: 0 },
          { title: "Nishiki Market Grazing", type: "food", estimatedCost: 40 },
          { title: "Kinkaku-ji Golden Pavilion", type: "experience", estimatedCost: 10 },
          { title: "Kaiseki Dinner", type: "food", estimatedCost: 120 },
        ],
      },
      {
        name: "Osaka",
        country: "Japan",
        days: 3,
        lat: 34.6937,
        lng: 135.5023,
        timezone: "Asia/Tokyo",
        coverImage:
          "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80",
        activities: [
          { title: "Dotonbori Street Food Crawl", type: "food", estimatedCost: 45 },
          { title: "Osaka Castle", type: "experience", estimatedCost: 10 },
          { title: "Kuromon Market Breakfast", type: "food", estimatedCost: 30 },
          { title: "Shinsekai Neighbourhood Walk", type: "experience", estimatedCost: 0 },
        ],
      },
    ],
    totalBudget: 4000,
    duration: 12,
    tags: ["culture", "cuisine", "japan", "temples", "food", "train"],
  },
  {
    id: "tpl-portugal",
    title: "Portugal: Coastal Drive",
    description:
      "Ten days tracing Portugal's Atlantic edge from Lisbon's tiled streets to Porto's port cellars, with the wild Algarve coast in between.",
    coverImage:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
    destinations: [
      {
        name: "Lisbon",
        country: "Portugal",
        days: 4,
        lat: 38.7223,
        lng: -9.1393,
        timezone: "Europe/Lisbon",
        coverImage:
          "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80",
        activities: [
          { title: "Tram 28 through Alfama", type: "experience", estimatedCost: 5 },
          { title: "Pasteis de Belem Tasting", type: "food", estimatedCost: 10 },
          { title: "Time Out Market Dinner", type: "food", estimatedCost: 35 },
          { title: "Sintra Day Trip", type: "experience", estimatedCost: 45 },
          { title: "Sunset at Miradouro da Graca", type: "rest", estimatedCost: 0 },
        ],
      },
      {
        name: "Algarve",
        country: "Portugal",
        days: 3,
        lat: 37.0179,
        lng: -7.9307,
        timezone: "Europe/Lisbon",
        coverImage:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        activities: [
          { title: "Benagil Sea Cave Kayak", type: "experience", estimatedCost: 40 },
          { title: "Seafood Cataplana Lunch", type: "food", estimatedCost: 25 },
          { title: "Praia da Marinha Beach Day", type: "rest", estimatedCost: 0 },
          { title: "Cliff-top Sunset Walk", type: "experience", estimatedCost: 0 },
        ],
      },
      {
        name: "Porto",
        country: "Portugal",
        days: 3,
        lat: 41.1579,
        lng: -8.6291,
        timezone: "Europe/Lisbon",
        coverImage:
          "https://images.unsplash.com/photo-1555881400-69c5542bbd27?w=800&q=80",
        activities: [
          { title: "Port Wine Cellar Tour", type: "experience", estimatedCost: 30 },
          { title: "Ribeira District Walk", type: "experience", estimatedCost: 0 },
          { title: "Francesinha Lunch", type: "food", estimatedCost: 15 },
          { title: "Livraria Lello Visit", type: "experience", estimatedCost: 8 },
        ],
      },
    ],
    totalBudget: 2000,
    duration: 10,
    tags: ["coastal", "drive", "portugal", "beach", "wine", "europe"],
  },
  {
    id: "tpl-switzerland",
    title: "Switzerland: Alpine Majesty",
    description:
      "Eight days among soaring peaks and crystal lakes. Ride iconic trains, hike wildflower meadows, and savour fondue in timber chalets.",
    coverImage:
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    destinations: [
      {
        name: "Lucerne",
        country: "Switzerland",
        days: 3,
        lat: 47.0502,
        lng: 8.3093,
        timezone: "Europe/Zurich",
        coverImage:
          "https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=800&q=80",
        activities: [
          { title: "Chapel Bridge & Old Town Walk", type: "experience", estimatedCost: 0 },
          { title: "Mt. Pilatus Golden Round Trip", type: "experience", estimatedCost: 90 },
          { title: "Lake Lucerne Cruise", type: "experience", estimatedCost: 50 },
          { title: "Fondue Dinner", type: "food", estimatedCost: 45 },
        ],
      },
      {
        name: "Interlaken",
        country: "Switzerland",
        days: 3,
        lat: 46.6863,
        lng: 7.8632,
        timezone: "Europe/Zurich",
        coverImage:
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        activities: [
          { title: "Jungfraujoch — Top of Europe", type: "experience", estimatedCost: 200 },
          { title: "Paragliding over the Lakes", type: "experience", estimatedCost: 180 },
          { title: "Harder Kulm Sunset Hike", type: "experience", estimatedCost: 35 },
          { title: "Swiss Chocolate Workshop", type: "experience", estimatedCost: 55 },
        ],
      },
      {
        name: "Zermatt",
        country: "Switzerland",
        days: 2,
        lat: 46.0207,
        lng: 7.7491,
        timezone: "Europe/Zurich",
        coverImage:
          "https://images.unsplash.com/photo-1529983399498-841e288aa5ac?w=800&q=80",
        activities: [
          { title: "Gornergrat Railway to Matterhorn View", type: "experience", estimatedCost: 95 },
          { title: "5-Seenweg Lake Trail Hike", type: "experience", estimatedCost: 0 },
          { title: "Raclette Dinner", type: "food", estimatedCost: 40 },
        ],
      },
    ],
    totalBudget: 3500,
    duration: 8,
    tags: ["alpine", "mountains", "switzerland", "hiking", "trains", "europe", "swiss"],
  },
  {
    id: "tpl-morocco",
    title: "Morocco: Medina Trail",
    description:
      "Ten days through Morocco's labyrinthine medinas, across desert dunes, and into the Atlas Mountains. A feast for the senses at every turn.",
    coverImage:
      "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    destinations: [
      {
        name: "Marrakech",
        country: "Morocco",
        days: 4,
        lat: 31.6295,
        lng: -7.9811,
        timezone: "Africa/Casablanca",
        coverImage:
          "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80",
        activities: [
          { title: "Jemaa el-Fnaa Evening Walk", type: "experience", estimatedCost: 0 },
          { title: "Majorelle Garden Visit", type: "experience", estimatedCost: 15 },
          { title: "Moroccan Cooking Class", type: "food", estimatedCost: 40 },
          { title: "Hammam & Spa", type: "rest", estimatedCost: 30 },
          { title: "Souk Shopping & Tea", type: "experience", estimatedCost: 25 },
        ],
      },
      {
        name: "Sahara Desert",
        country: "Morocco",
        days: 3,
        lat: 31.0795,
        lng: -4.0128,
        timezone: "Africa/Casablanca",
        coverImage:
          "https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=800&q=80",
        activities: [
          { title: "Camel Trek to Desert Camp", type: "experience", estimatedCost: 80 },
          { title: "Stargazing in the Dunes", type: "experience", estimatedCost: 0 },
          { title: "Berber Music Night", type: "experience", estimatedCost: 20 },
        ],
      },
      {
        name: "Fes",
        country: "Morocco",
        days: 3,
        lat: 34.0181,
        lng: -5.0078,
        timezone: "Africa/Casablanca",
        coverImage:
          "https://images.unsplash.com/photo-1545041117-2caf6fe664a5?w=800&q=80",
        activities: [
          { title: "Fes Medina Guided Walk", type: "experience", estimatedCost: 25 },
          { title: "Chouara Tannery Viewpoint", type: "experience", estimatedCost: 5 },
          { title: "Street Food Tour", type: "food", estimatedCost: 20 },
          { title: "Bou Inania Madrasa Visit", type: "experience", estimatedCost: 5 },
        ],
      },
    ],
    totalBudget: 1800,
    duration: 10,
    tags: ["medina", "desert", "morocco", "culture", "food", "adventure", "africa"],
  },
];
