export interface Campus {
  id: string;
  name: string;
  shortName: string;
  location: string;
  lat: number;
  lng: number;
  region: "north" | "south";
  type: "federal" | "state" | "private";
  state?: string;
}

export const CAMPUSES: Campus[] = [
  // FEDERAL UNIVERSITIES
  { id: "abu", name: "Ahmadu Bello University", shortName: "ABU", location: "Zaria", lat: 11.1516, lng: 7.6531, region: "north", type: "federal" , state: "Kaduna" },
  { id: "buk", name: "Bayero University Kano", shortName: "BUK", location: "Kano", lat: 11.9800, lng: 8.4239, region: "north", type: "federal" , state: "Kano" },
  { id: "unimaid", name: "University of Maiduguri", shortName: "UNIMAID", location: "Maiduguri", lat: 11.8105, lng: 13.1953, region: "north", type: "federal" , state: "Borno" },
  { id: "udus", name: "Usmanu Danfodiyo University", shortName: "UDUS", location: "Sokoto", lat: 13.1360, lng: 5.2120, region: "north", type: "federal" , state: "Sokoto" },
  { id: "unilorin", name: "University of Ilorin", shortName: "UNILORIN", location: "Ilorin", lat: 8.4799, lng: 4.6769, region: "north", type: "federal" , state: "Kwara" },
  { id: "unijos", name: "University of Jos", shortName: "UNIJOS", location: "Jos", lat: 9.9571, lng: 8.8909, region: "north", type: "federal" , state: "Plateau" },
  { id: "uniabuja", name: "University of Abuja", shortName: "UNIABUJA", location: "Abuja", lat: 8.9784, lng: 7.1750, region: "north", type: "federal" , state: "FCT" },
  { id: "atbu", name: "Abubakar Tafawa Balewa University", shortName: "ATBU", location: "Bauchi", lat: 10.3158, lng: 9.8442, region: "north", type: "federal" , state: "Bauchi" },
  { id: "futminna", name: "Federal University of Technology Minna", shortName: "FUTMINNA", location: "Minna", lat: 9.5367, lng: 6.4544, region: "north", type: "federal" , state: "Niger" },
  { id: "mau", name: "Modibbo Adama University", shortName: "MAU", location: "Yola", lat: 9.3361, lng: 12.4975, region: "north", type: "federal" , state: "Adamawa" },
  { id: "fud", name: "Federal University Dutse", shortName: "FUD", location: "Dutse", lat: 11.7589, lng: 9.3400, region: "north", type: "federal" , state: "Jigawa" },
  { id: "fudma", name: "Federal University Dutsin-Ma", shortName: "FUDMA", location: "Dutsin-Ma", lat: 12.4539, lng: 7.4971, region: "north", type: "federal" , state: "Katsina" },
  { id: "fuk", name: "Federal University Kashere", shortName: "FUK", location: "Kashere", lat: 10.0827, lng: 11.1666, region: "north", type: "federal" , state: "Gombe" },
  { id: "fulafia", name: "Federal University Lafia", shortName: "FULAFIA", location: "Lafia", lat: 8.4632, lng: 8.5218, region: "north", type: "federal" , state: "Nasarawa" },
  { id: "fulokoja", name: "Federal University Lokoja", shortName: "FULOKOJA", location: "Lokoja", lat: 7.8286, lng: 6.7410, region: "north", type: "federal" , state: "Kogi" },
  { id: "fuwukari", name: "Federal University Wukari", shortName: "FUWUKARI", location: "Wukari", lat: 7.8596, lng: 9.7766, region: "north", type: "federal" , state: "Taraba" },
  { id: "fubk", name: "Federal University Birnin Kebbi", shortName: "FUBK", location: "Birnin Kebbi", lat: 12.4539, lng: 4.1975, region: "north", type: "federal" , state: "Kebbi" },
  { id: "fuga", name: "Federal University Gashua", shortName: "FUGA", location: "Gashua", lat: 12.8718, lng: 11.0428, region: "north", type: "federal" , state: "Yobe" },
  { id: "fugusau", name: "Federal University Gusau", shortName: "FUGUSAU", location: "Gusau", lat: 12.1704, lng: 6.6642, region: "north", type: "federal" , state: "Zamfara" },
  { id: "nda", name: "Nigerian Defence Academy", shortName: "NDA", location: "Kaduna", lat: 10.6014, lng: 7.4265, region: "north", type: "federal" , state: "Kaduna" },
  { id: "npa", name: "Nigeria Police Academy", shortName: "NPA", location: "Wudil", lat: 11.7946, lng: 8.8471, region: "north", type: "federal" , state: "Kano" },
  { id: "afit", name: "Air Force Institute of Technology", shortName: "AFIT", location: "Kaduna", lat: 10.5898, lng: 7.4429, region: "north", type: "federal" , state: "Kaduna" },
  { id: "naub", name: "Nigerian Army University Biu", shortName: "NAUB", location: "Biu", lat: 10.6120, lng: 12.1946, region: "north", type: "federal" , state: "Borno" },
  { id: "fuhso", name: "Federal University of Health Sciences Otukpo", shortName: "FUHSO", location: "Otukpo", lat: 7.1923, lng: 8.1360, region: "north", type: "federal" , state: "Benue" },
  { id: "fuhsa", name: "Federal University of Health Sciences Azare", shortName: "FUHSA", location: "Azare", lat: 11.6745, lng: 10.1914, region: "north", type: "federal" , state: "Bauchi" },
  { id: "fuaz", name: "Federal University of Agriculture Zuru", shortName: "FUAZ", location: "Zuru", lat: 11.4338, lng: 5.2341, region: "north", type: "federal" , state: "Kebbi" },
  
  // STATE UNIVERSITIES
  { id: "adsu", name: "Adamawa State University", shortName: "ADSU", location: "Mubi", lat: 10.2644, lng: 13.2662, region: "north", type: "state" , state: "Adamawa" },
  { id: "basug", name: "Bauchi State University", shortName: "BASUG", location: "Gadau", lat: 11.8344, lng: 10.1581, region: "north", type: "state" , state: "Bauchi" },
  { id: "bsum", name: "Benue State University", shortName: "BSUM", location: "Makurdi", lat: 7.7348, lng: 8.5448, region: "north", type: "state" , state: "Benue" },
  { id: "bosu", name: "Borno State University", shortName: "BOSU", location: "Maiduguri", lat: 11.8483, lng: 13.1256, region: "north", type: "state" , state: "Borno" },
  { id: "gsu", name: "Gombe State University", shortName: "GSU", location: "Gombe", lat: 10.3010, lng: 11.1623, region: "north", type: "state" , state: "Gombe" },
  { id: "slu", name: "Sule Lamido University", shortName: "SLU", location: "Kafin Hausa", lat: 12.2286, lng: 9.9142, region: "north", type: "state" , state: "Jigawa" },
  { id: "kasu", name: "Kaduna State University", shortName: "KASU", location: "Kaduna", lat: 10.5186, lng: 7.4357, region: "north", type: "state" , state: "Kaduna" },
  { id: "adustw", name: "Aliko Dangote University of Science and Technology", shortName: "ADUSTW", location: "Wudil", lat: 11.8103, lng: 8.9784, region: "north", type: "state" , state: "Kano" },
  { id: "yumsuk", name: "Yusuf Maitama Sule University", shortName: "YUMSUK", location: "Kano", lat: 11.9749, lng: 8.5218, region: "north", type: "state" , state: "Kano" },
  { id: "umyu", name: "Umaru Musa Yar'Adua University", shortName: "UMYU", location: "Katsina", lat: 12.9234, lng: 7.6253, region: "north", type: "state" , state: "Katsina" },
  { id: "ksusta", name: "Kebbi State University of Science and Technology", shortName: "KSUSTA", location: "Aliero", lat: 12.3025, lng: 4.4967, region: "north", type: "state" , state: "Kebbi" },
  { id: "paau", name: "Prince Abubakar Audu University", shortName: "PAAU", location: "Anyigba", lat: 7.4930, lng: 7.1729, region: "north", type: "state" , state: "Kogi" },
  { id: "kwasu", name: "Kwara State University", shortName: "KWASU", location: "Malete", lat: 8.7147, lng: 4.4754, region: "north", type: "state" , state: "Kwara" },
  { id: "nsuk", name: "Nasarawa State University", shortName: "NSUK", location: "Keffi", lat: 8.8489, lng: 7.8736, region: "north", type: "state" , state: "Nasarawa" },
  { id: "ibbu", name: "Ibrahim Badamasi Babangida University", shortName: "IBBU", location: "Lapai", lat: 8.9959, lng: 6.5796, region: "north", type: "state" , state: "Niger" },
  { id: "plasu", name: "Plateau State University", shortName: "PLASU", location: "Bokkos", lat: 9.2942, lng: 8.9950, region: "north", type: "state" , state: "Plateau" },
  { id: "ssu", name: "Sokoto State University", shortName: "SSU", location: "Sokoto", lat: 13.0033, lng: 5.2155, region: "north", type: "state" , state: "Sokoto" },
  { id: "tsu", name: "Taraba State University", shortName: "TSU", location: "Jalingo", lat: 8.9000, lng: 11.3556, region: "north", type: "state" , state: "Taraba" },
  { id: "ysu", name: "Yobe State University", shortName: "YSU", location: "Damaturu", lat: 11.7470, lng: 11.9550, region: "north", type: "state" , state: "Yobe" },
  { id: "zasu", name: "Zamfara State University", shortName: "ZASU", location: "Talata Mafara", lat: 12.5694, lng: 6.0461, region: "north", type: "state" , state: "Zamfara" },
  
  // PRIVATE UNIVERSITIES
  { id: "alqalam", name: "Al-Qalam University", shortName: "ALQALAM", location: "Katsina", lat: 12.9804, lng: 7.5759, region: "north", type: "private" , state: "Katsina" },
  { id: "aun", name: "American University of Nigeria", shortName: "AUN", location: "Yola", lat: 9.2315, lng: 12.4497, region: "north", type: "private" , state: "Adamawa" },
  { id: "baze", name: "Baze University", shortName: "BAZE", location: "Abuja", lat: 9.0146, lng: 7.4111, region: "north", type: "private" , state: "FCT" },
  { id: "bingham", name: "Bingham University", shortName: "BINGHAM", location: "Karu", lat: 9.0069, lng: 7.6253, region: "north", type: "private" , state: "Nasarawa" },
  { id: "sun", name: "Skyline University Nigeria", shortName: "SUN", location: "Kano", lat: 11.9772, lng: 8.5284, region: "north", type: "private" , state: "Kano" },
  { id: "nile", name: "Nile University of Nigeria", shortName: "NILE", location: "Abuja", lat: 9.0284, lng: 7.4261, region: "north", type: "private" , state: "FCT" },
  { id: "veritas", name: "Veritas University", shortName: "VERITAS", location: "Abuja", lat: 9.2891, lng: 7.3777, region: "north", type: "private" , state: "FCT" },
  { id: "salem", name: "Salem University", shortName: "SALEM", location: "Lokoja", lat: 7.8540, lng: 6.7214, region: "north", type: "private" , state: "Kogi" },
  { id: "kwararafa", name: "Kwararafa University", shortName: "KWARARAFA", location: "Wukari", lat: 7.8686, lng: 9.7766, region: "north", type: "private" , state: "Taraba" },
  { id: "ccuk", name: "Capital City University", shortName: "CCUK", location: "Kano", lat: 11.9667, lng: 8.5333, region: "north", type: "private" , state: "Kano" },
  { id: "maaun", name: "Maryam Abacha American University of Nigeria", shortName: "MAAUN", location: "Kano", lat: 11.9780, lng: 8.5024, region: "north", type: "private" , state: "Kano" }
];

/** Set of all northern campus IDs for fast lookup */
export const NORTHERN_CAMPUS_IDS = new Set<string>(
  CAMPUSES.filter(c => c.region === "north").map(c => c.id)
);

/** Get only northern campuses */
export const getNorthernCampuses = (): Campus[] =>
  CAMPUSES.filter(c => c.region === "north");

/** Haversine distance between two points in km */
export const getDistanceKm = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Get nearest campuses sorted by distance from a given point */
export const getNearestCampuses = (
  lat: number,
  lng: number,
  count: number = 5
): (Campus & { distanceKm: number })[] => {
  return getNorthernCampuses()
    .map(campus => ({
      ...campus,
      distanceKm: getDistanceKm(lat, lng, campus.lat, campus.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
};

/** Get campus by slug (id) */
export const getCampusBySlug = (slug: string): Campus | undefined =>
  CAMPUSES.find(c => c.id === slug.toLowerCase());

export const getCampusById = (id: string) => CAMPUSES.find(c => c.id === id);
