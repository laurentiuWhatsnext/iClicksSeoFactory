// src/lib/mock-data.ts
// Replace with real API calls once Mihai has the endpoints working.
// Data enriched to match wireframe v4 + API contract.

export const MOCK_CLIENTS = [
  {
    id: "C001", name: "Stile Floors", slug: "stile-floors",
    domain: "https://stilefloors.nl/", branche: "Flooring retail",
    tone_of_voice: "modern, professional, warm", notes: "",
    business_model: "B2C", market_model: "National",
    cta_preferences: "View collection, Request a quote",
  },
  {
    id: "C002", name: "Schadeautos.nl", slug: "schadeautos-nl",
    domain: "https://schadeautos.nl/", branche: "Automotive",
    tone_of_voice: "direct, trustworthy, business-like",
    notes: "Avoid terms like 'total loss' or 'wreck'",
    business_model: "B2C", market_model: "National",
    cta_preferences: "View inventory, Contact us",
  },
  {
    id: "C003", name: "King Laminaat", slug: "king-laminaat",
    domain: "https://kinglaminaat.nl/", branche: "Flooring retail",
    tone_of_voice: "approachable, persuasive, inviting, inspirational",
    notes: "Not 'showroom' \u00b7 'Flooring store' for Delft/Dordrecht/Rotterdam \u00b7 'Home store' for Uden/Zoetermeer/Antwerp \u00b7 No 'So...'-style conclusions",
    business_model: "B2C", market_model: "Regional",
    cta_preferences: "Visit us in store, Order free samples",
  },
  {
    id: "C004", name: "Haarkliniek De Kroon", slug: "haarkliniek-de-kroon",
    domain: "https://haarkliniekdekroon.nl/", branche: "Healthcare",
    tone_of_voice: "empathetic, expert, reassuring",
    notes: "Use 'treatment' instead of 'procedure'",
    business_model: "B2C", market_model: "Regional",
    cta_preferences: "Schedule a free consultation",
  },
];

export const MOCK_CONTENT_TYPES = [
  { id: "CT01", slug: "seo_dienstenpagina_b2b", label: "Service page (B2B)", lower_bound: 800, upper_bound: 1000, writing_perspective: "First person plural (we/our)", also_asked_handling: "Integrate as H2/H3 sections where relevant" },
  { id: "CT02", slug: "seo_ecommerce_categorie", label: "E-commerce category", lower_bound: 800, upper_bound: 1200, writing_perspective: "First person plural (we/our)", also_asked_handling: "Integrate as H2/H3 sections where relevant" },
  { id: "CT03", slug: "seo_dienstenpagina_b2c", label: "Service page (B2C)", lower_bound: 1000, upper_bound: 1250, writing_perspective: "First person plural (we/our)", also_asked_handling: "Integrate as H2/H3 sections where relevant" },
  { id: "CT04", slug: "seo_blogpost_klant", label: "Blog article", lower_bound: 1200, upper_bound: 1500, writing_perspective: "Second person (you/your)", also_asked_handling: "Use as FAQ section at the bottom" },
  { id: "CT05", slug: "seo_locatiepagina", label: "Location page", lower_bound: 800, upper_bound: 1000, writing_perspective: "First person plural (we/our)", also_asked_handling: "Integrate as H2/H3 sections where relevant" },
  { id: "CT06", slug: "seo_productpagina", label: "Product page", lower_bound: 600, upper_bound: 900, writing_perspective: "First person plural (we/our)", also_asked_handling: "Integrate as FAQ section" },
  { id: "CT07", slug: "seo_faq_pagina", label: "FAQ page", lower_bound: 800, upper_bound: 1200, writing_perspective: "Second person (you/your)", also_asked_handling: "Integrate as additional questions" },
  { id: "CT08", slug: "seo_over_ons", label: "About page", lower_bound: 600, upper_bound: 900, writing_perspective: "First person plural (we/our)", also_asked_handling: "Not applicable" },
];

export const MOCK_PAGES = [
  { id: "P001", client_id: "C003", content_type_id: "CT05", target_keyword: "laminaat amsterdam", secondary_keywords: ["laminaat kopen amsterdam", "goedkoop laminaat amsterdam"], target_url: "/amsterdam", priority: 1, status: "new" },
  { id: "P002", client_id: "C003", content_type_id: "CT05", target_keyword: "laminaat rotterdam", secondary_keywords: ["laminaat rotterdam centrum"], target_url: "/rotterdam", priority: 2, status: "in_progress" },
  { id: "P003", client_id: "C003", content_type_id: "CT01", target_keyword: "laminaat leggen service", secondary_keywords: ["laminaat installatie"], target_url: "/diensten/laminaat-leggen", priority: 1, status: "review" },
  { id: "P004", client_id: "C001", content_type_id: "CT04", target_keyword: "vinyl vloer voordelen", secondary_keywords: [], target_url: "/blog/vinyl-vloer", priority: 3, status: "approved" },
];

export const MOCK_ARTICLE = {
  id: "A001",
  page_id: "P003",
  content: "# Laminaat leggen service \u2014 professionele installatie\n\nBent u op zoek naar een betrouwbare service voor het leggen van laminaat? Onze specialisten helpen u graag...\n\n## Waarom kiezen voor onze service?\n\nMet jarenlange ervaring in het leggen van laminaatvloeren bieden wij u de beste kwaliteit...\n\n## Onze werkwijze\n\n1. Gratis inmeting bij u thuis\n2. Advies over het juiste type laminaat\n3. Professionele installatie door gecertificeerde vakmensen\n4. Nazorg en garantie op ons werk\n\n## Veelgestelde vragen\n\n**Hoe lang duurt het leggen van laminaat?**\nGemiddeld leggen wij een standaard woonkamer (20-30m\u00b2) in \u00e9\u00e9n werkdag.\n\n**Moet ik zelf ondervloer kopen?**\nNee, wij verzorgen alles inclusief ondervloer en plinten.\n\n## Contact\n\nNeem vandaag nog contact met ons op voor een vrijblijvende offerte.",
  score: 82,
  score_details: { keyword_usage: 90, word_count: 85, structure: 78, meta_optimisation: 75, readability: 80 },
  version: 1,
  created_at: "2026-03-23T09:00:00Z",
};

export const MOCK_STATS = {
  total_pages: 4,
  by_status: { new: 1, in_progress: 1, review: 1, approved: 1 },
  by_client: { C001: 1, C003: 3 },
  avg_cost: 0.14,
  avg_generation_time: 48,
};
