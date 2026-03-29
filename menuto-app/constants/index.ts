// Centralized constants for the Menuto app
// These were previously duplicated across TastePreferencesScreen, ProfileScreen,
// RestaurantSelectionScreen, and RestaurantSearchScreen.

// ─── Cuisine Constants ───────────────────────────────────────────────────────

export const POPULAR_CUISINES = [
  'Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian',
  'Thai', 'French', 'American', 'Korean', 'Vietnamese',
  'Turkish', 'Greek', 'Lebanese', 'Spanish',
] as const;

export const ALL_CUISINES = [
  // Popular cuisines
  ...POPULAR_CUISINES,

  // Regional Asian
  'Persian', 'Georgian', 'Nepalese', 'Pakistani',
  'Bangladeshi', 'Sri Lankan', 'Afghan', 'Indonesian',
  'Malaysian', 'Filipino', 'Burmese', 'Laotian', 'Cambodian',
  'Tibetan', 'Mongolian', 'Uzbek', 'Kazakh',

  // Middle Eastern & North African
  'Moroccan', 'Tunisian', 'Algerian', 'Egyptian', 'Palestinian', 'Israeli',
  'Syrian', 'Jordanian', 'Iraqi', 'Yemeni', 'Kurdish', 'Cypriot',
  'Ethiopian', 'Eritrean', 'Sudanese', 'Libyan',

  // European
  'Basque', 'Catalan', 'Galician', 'Sicilian', 'Sardinian',
  'Russian', 'Ukrainian', 'Polish', 'Hungarian', 'Czech',
  'Romanian', 'Bulgarian', 'Croatian', 'Serbian', 'Albanian', 'Bosnian',
  'Portuguese', 'Dutch', 'German', 'Austrian', 'Swiss', 'Belgian',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Icelandic',
  'Estonian', 'Latvian', 'Lithuanian',
  'Scottish', 'Welsh', 'Irish',

  // Latin American & Caribbean
  'Peruvian', 'Colombian', 'Venezuelan', 'Ecuadorian', 'Brazilian',
  'Argentinian', 'Chilean', 'Bolivian', 'Paraguayan', 'Uruguayan',
  'Cuban', 'Dominican', 'Puerto Rican', 'Jamaican', 'Haitian',
  'Trinidadian', 'Barbadian', 'Oaxacan', 'Yucatecan',

  // African
  'Nigerian', 'Ghanaian', 'Senegalese', 'Ivorian', 'Malian',
  'South African', 'Kenyan', 'Tanzanian', 'Ugandan',
  'Congolese', 'Somali', 'Mozambican', 'Cameroonian',

  // Specialty & Fusion
  'Fusion', 'Experimental', 'Vegan', 'Vegetarian', 'Raw', 'Molecular Gastronomy',
  'Farm-to-Table', 'Comfort Food', 'Soul Food', 'Cajun', 'Creole',
  'Sichuan', 'Cantonese', 'Hunan', 'Dim Sum',
] as const;

// ─── Dietary Restrictions ────────────────────────────────────────────────────

export const DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Keto', 'Pescatarian', 'Halal', 'Kosher',
] as const;

// ─── Spice Levels ────────────────────────────────────────────────────────────

export const SPICE_LEVELS = [1, 2, 3, 4, 5] as const;

export const SPICE_LABELS: Record<number, string> = {
  1: 'Hand me the milk',
  2: 'Gentle warmth',
  3: 'Bring it on',
  4: 'Spicy is my middle name',
  5: 'Set me on fire',
};

// ─── Home Base Cities (for onboarding taste preferences) ─────────────────────

export interface HomeBaseCity {
  name: string;
  emoji: string;
  coordinates: string;
}

export const HOME_BASE_CITIES: HomeBaseCity[] = [
  { name: 'New York', emoji: '\u{1F5FD}', coordinates: '40.7128,-74.0060' },
  { name: 'Los Angeles', emoji: '\u{1F334}', coordinates: '34.0522,-118.2437' },
  { name: 'San Francisco', emoji: '\u{1F309}', coordinates: '37.7749,-122.4194' },
  { name: 'London', emoji: '\u2615', coordinates: '51.5074,-0.1278' },
  { name: 'Istanbul', emoji: '\u{1F54C}', coordinates: '41.0082,28.9784' },
];

// ─── City Type & Popular Cities (for restaurant search) ──────────────────────

export interface City {
  name: string;
  coordinates: string; // "lat,lng" format
  country?: string;
  isLocal?: boolean; // For user's home base or nearby cities
}

export const POPULAR_CITIES: City[] = [
  // Major US cities
  { name: 'New York', coordinates: '40.7128,-74.0060', country: 'USA', isLocal: true },
  { name: 'San Francisco', coordinates: '37.7749,-122.4194', country: 'USA' },
  { name: 'Los Angeles', coordinates: '34.0522,-118.2437', country: 'USA' },
  { name: 'Chicago', coordinates: '41.8781,-87.6298', country: 'USA' },
  { name: 'Seattle', coordinates: '47.6062,-122.3321', country: 'USA' },
  { name: 'Boston', coordinates: '42.3601,-71.0589', country: 'USA' },
  { name: 'Austin', coordinates: '30.2672,-97.7431', country: 'USA' },
  { name: 'Miami', coordinates: '25.7617,-80.1918', country: 'USA' },
  { name: 'Denver', coordinates: '39.7392,-104.9903', country: 'USA' },
  { name: 'Portland', coordinates: '45.5152,-122.6784', country: 'USA' },
  { name: 'Nashville', coordinates: '36.1627,-86.7816', country: 'USA' },
  { name: 'Atlanta', coordinates: '33.7490,-84.3880', country: 'USA' },
  { name: 'Dallas', coordinates: '32.7767,-96.7970', country: 'USA' },
  { name: 'Houston', coordinates: '29.7604,-95.3698', country: 'USA' },
  { name: 'Phoenix', coordinates: '33.4484,-112.0740', country: 'USA' },
  { name: 'Las Vegas', coordinates: '36.1699,-115.1398', country: 'USA' },

  // International cities
  { name: 'London', coordinates: '51.5074,-0.1278', country: 'UK' },
  { name: 'Paris', coordinates: '48.8566,2.3522', country: 'France' },
  { name: 'Tokyo', coordinates: '35.6762,139.6503', country: 'Japan' },
  { name: 'Sydney', coordinates: '-33.8688,151.2093', country: 'Australia' },
  { name: 'Toronto', coordinates: '43.6532,-79.3832', country: 'Canada' },
  { name: 'Vancouver', coordinates: '49.2827,-123.1207', country: 'Canada' },
  { name: 'Berlin', coordinates: '52.5200,13.4050', country: 'Germany' },
  { name: 'Amsterdam', coordinates: '52.3676,4.9041', country: 'Netherlands' },
  { name: 'Barcelona', coordinates: '41.3851,2.1734', country: 'Spain' },
  { name: 'Rome', coordinates: '41.9028,12.4964', country: 'Italy' },
  { name: 'Madrid', coordinates: '40.4168,-3.7038', country: 'Spain' },
  { name: 'Milan', coordinates: '45.4642,9.1900', country: 'Italy' },
  { name: 'Zurich', coordinates: '47.3769,8.5417', country: 'Switzerland' },
  { name: 'Vienna', coordinates: '48.2082,16.3738', country: 'Austria' },
  { name: 'Prague', coordinates: '50.0755,14.4378', country: 'Czech Republic' },
  { name: 'Warsaw', coordinates: '52.2297,21.0122', country: 'Poland' },
  { name: 'Stockholm', coordinates: '59.3293,18.0686', country: 'Sweden' },
  { name: 'Copenhagen', coordinates: '55.6761,12.5683', country: 'Denmark' },
  { name: 'Oslo', coordinates: '59.9139,10.7522', country: 'Norway' },
  { name: 'Helsinki', coordinates: '60.1699,24.9384', country: 'Finland' },
];
