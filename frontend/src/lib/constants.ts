export const VEHICLE_CATALOG: Record<string, string[]> = {
  "Renault Trucks": ["Kerax", "C-Series"],
  "Toyota": ["Hilux", "Land Cruiser"],
  "Mitsubishi": ["L200"],
  "Isuzu": ["D-Max"],
  "Nissan": ["Navara"],
  "Ford": ["Ranger"],
  "Mahindra": ["Pik Up"],
  "Hyundai": ["HD78"],
  "Kia": ["K2700"],
  "Iveco": ["Trakker"],
  "Mercedes-Benz": ["Actros", "Atego"],
  "MAN": ["TGS"],
  "Volvo": ["FMX"],
  "Scania": ["P360"],
  "John Deere": ["6110M", "5075E"],
  "Massey Ferguson": ["MF 385", "MF 4707"],
  "New Holland": ["TT75", "TD90D"],
  "Case IH": ["Farmall 110A"],
  "Kubota": ["M7040"],
  "Caterpillar": ["420F"],
  "JCB": ["3CX"],
  "Komatsu": ["WA200"],
  "Bobcat": ["S650"],
  "Autre": []
};

export const TRUCK_CATEGORIES = {
  AGR: { label: "ENGINS AGRICOLES", sub: ["Tracteur", "Moissonneuse-batteuse", "Motoculteur", "Pulvérisateur", "Ensileuse", "Chargeuse agricole", "Télescopique"] },
  TRP: { label: "TRANSPORT", sub: ["Camion benne", "Camion plateau", "Camion citerne", "Semi-remorque", "Remorque agricole", "Porte-engins"] },
  UTL: { label: "UTILITAIRES", sub: ["Pick-up", "Fourgonnette", "Véhicule tout-terrain", "Véhicule utilitaire léger"] },
  MOB: { label: "MOBILITÉ TERRAIN", sub: ["Moto", "Quad", "Tricycle", "Vélo électrique"] },
  MNT: { label: "MANUTENTION", sub: ["Chariot élévateur", "Chargeuse", "Transpalette motorisé", "Reach stacker"] },
  ADM: { label: "ADMINISTRATION", sub: ["Berline", "SUV", "Minibus", "Bus du personnel"] }
};

export const TRUCK_ASSIGNMENTS = {
  EXP: "Exploitation",
  LOG: "Logistique",
  MNT: "Maintenance",
  ADM: "Administration",
  SEC: "Sécurité",
  PRO: "Projet"
};

export const TRUCK_STATUSES = ["Disponible", "Affecté", "En mission", "En maintenance", "En panne", "Hors service", "Réformé"];

export const ENERGY_TYPES = ["Diesel", "Essence", "Électrique", "Hybride", "Gaz"];

export const SPECULATION_CATEGORIES = ["Cultures Industrielles", "Cultures Vivrières", "Elevage", "Services"];

export const SPECULATIONS_BY_CATEGORY: Record<string, string[]> = {
  "Cultures Industrielles": ["Hévéa", "Cacao", "Palmier à huile"],
  "Cultures Vivrières": ["Maïs", "Riz", "Igname", "Manioc", "Arachides", "Gombo", "Piment", "Papaye", "Aubergine", "Banane plantain"],
  "Elevage": ["Canards", "Poules pondeuses", "Poules hybrides", "Porcs"],
  "Services": []
};

export const STOCK_CATEGORIES = ["Engrais", "Semences", "Produit Fini", "Matériel", "Autre"];

export const CONTRACT_TYPES = [
  { value: "CDI", label: "CDI (Indéterminé)" },
  { value: "CDD", label: "CDD (Déterminé)" },
  { value: "STAGIAIRE", label: "Stagiaire" },
  { value: "INTERIM", label: "Intérim" },
  { value: "TEMPS_PARTIEL", label: "Temps Partiel" }
];
