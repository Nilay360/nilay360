// ── Nilay 360 Constants ─────────────────────────────────────────────────────────

export const BRAND = {
  name: "Nilay 360",
  tagline: "Your Trust. Our Promise.",
  email: "contact@nilay360.com",
  phone: "+91 7075 792497",
  whatsapp: "+917075792497",
  address: "Hyderabad, Telangana, India",
  social: {
    instagram: "https://www.instagram.com/nilay360_/",
    linkedin:  "https://linkedin.com/company/nilay360",
    facebook:  "https://facebook.com/nilay360",
    youtube:   "https://www.youtube.com/@nilay360.digital",
  },
} as const

export const CITIES = [
  "Hyderabad", "Mumbai", "Bengaluru", "Delhi NCR",
  "Chennai", "Pune", "Kolkata", "Ahmedabad",
] as const

export const PROPERTY_TYPES = [
  { value: "apartment",  label: "Apartment"  },
  { value: "villa",      label: "Villa"      },
  { value: "plot",       label: "Plot / Land"},
  { value: "office",     label: "Office"     },
  { value: "retail",     label: "Retail Shop"},
  { value: "penthouse",  label: "Penthouse"  },
  { value: "townhouse",  label: "Townhouse"  },
  { value: "warehouse",  label: "Warehouse"  },
] as const

export const AMENITIES = [
  "Swimming Pool", "Gym / Fitness Centre", "Clubhouse", "24/7 Security",
  "Power Backup", "Lift / Elevator", "Covered Parking", "Garden / Lawn",
  "Children's Play Area", "Jogging Track", "Intercom", "CCTV Surveillance",
  "Concierge Service", "Rooftop Terrace", "EV Charging", "Smart Home",
  "High-Speed Internet", "Air Conditioning", "Balcony", "Vastu Compliant",
] as const

export const BHK_OPTIONS = [1, 2, 3, 4, 5] as const

export const PRICE_RANGES = [
  { label: "Under ₹50L",      min: 0,          max: 5000000   },
  { label: "₹50L – ₹1Cr",    min: 5000000,    max: 10000000  },
  { label: "₹1Cr – ₹2Cr",    min: 10000000,   max: 20000000  },
  { label: "₹2Cr – ₹5Cr",    min: 20000000,   max: 50000000  },
  { label: "₹5Cr – ₹10Cr",   min: 50000000,   max: 100000000 },
  { label: "Above ₹10Cr",     min: 100000000,  max: 999999999 },
] as const

export const SORT_OPTIONS = [
  { value: "newest",       label: "Newest First"        },
  { value: "featured",     label: "Featured"            },
  { value: "price_asc",    label: "Price: Low to High"  },
  { value: "price_desc",   label: "Price: High to Low"  },
  { value: "most_popular", label: "Most Popular"        },
  { value: "area_desc",    label: "Largest Area"        },
] as const

export const NAV_LINKS = [
  { label: "Buy",          href: "/buy"          },
  { label: "Rent",         href: "/rent"         },
  { label: "New Projects", href: "/new-projects" },
  { label: "Commercial",   href: "/commercial"   },
  { label: "Developers",   href: "/builders"     },
  { label: "Insights",     href: "/blog"         },
] as const

export const STATS = [
  { value: "2,400+",     label: "Verified Listings"  },
  { value: "₹18,000 Cr", label: "Deals Facilitated"  },
  { value: "14 Cities",  label: "Across India"       },
  { value: "98%",        label: "Client Satisfaction"},
  { value: "500+",       label: "Verified Agents"    },
] as const

// ── Mega-menu types ───────────────────────────────────────────────────────────

export interface NavMenuLink {
  label: string
  href:  string
}

export interface NavMenuColumn {
  heading: string
  links:   NavMenuLink[]
}

export interface NavMenuData {
  leftColumn: {
    heading: string
    links:   NavMenuLink[]
  }
  columns: NavMenuColumn[]
}

// Internal city list used to build mega-menu city links
const _MENU_CITIES = [
  { name: "Hyderabad", slug: "hyderabad" },
  { name: "Bengaluru", slug: "bengaluru" },
  { name: "Mumbai",    slug: "mumbai"    },
  { name: "Delhi",     slug: "delhi"     },
  { name: "Pune",      slug: "pune"      },
  { name: "Chennai",   slug: "chennai"   },
]

// Sale is currently only available in Hyderabad — used by the Buy, New
// Projects, and Commercial mega-menus. Rent keeps the full city list.
const _MENU_CITIES_SALE = _MENU_CITIES.filter(c => c.name === "Hyderabad")

export const NAV_MENUS: Record<string, NavMenuData> = {
  "Buy": {
    leftColumn: {
      heading: "Quick Links",
      links: [
        { label: "Buy Properties",          href: "/buy"                    },
        { label: "Property Valuation",      href: "/valuation"              },
        { label: "Vaastu Calculator",       href: "/calculator"             },
        { label: "Affordability Calculator",href: "/investment-calculator"  },
        { label: "Buyer Guide",             href: "/legal-guide"            },
        { label: "Legal Services",          href: "/legal-guide"            },
      ],
    },
    columns: [
      {
        heading: "Properties for Sale",
        links: _MENU_CITIES_SALE.map(c => ({
          label: `Property in ${c.name}`,
          href:  `/buy?city=${c.slug}`,
        })),
      },
      {
        heading: "Flats",
        links: _MENU_CITIES_SALE.map(c => ({
          label: `Flats in ${c.name}`,
          href:  `/buy?city=${c.slug}&type=apartment`,
        })),
      },
      {
        heading: "Houses",
        links: _MENU_CITIES_SALE.map(c => ({
          label: `Houses in ${c.name}`,
          href:  `/buy?city=${c.slug}&type=villa`,
        })),
      },
    ],
  },

  "Rent": {
    leftColumn: {
      heading: "Quick Links",
      links: [
        { label: "Rent Properties",  href: "/rent"         },
        { label: "Rent Agreement",   href: "/legal-guide"  },
        { label: "Tenant Guide",     href: "/legal-guide"  },
        { label: "Cost of Living",   href: "/calculator"   },
        { label: "Packers & Movers", href: "/contact"      },
      ],
    },
    columns: [
      {
        heading: "Properties for Rent",
        links: _MENU_CITIES.map(c => ({
          label: `Property for Rent in ${c.name}`,
          href:  `/rent?city=${c.slug}`,
        })),
      },
      {
        heading: "Flats",
        links: _MENU_CITIES.map(c => ({
          label: `Flats for Rent in ${c.name}`,
          href:  `/rent?city=${c.slug}&type=apartment`,
        })),
      },
      {
        heading: "Houses",
        links: _MENU_CITIES.map(c => ({
          label: `Houses for Rent in ${c.name}`,
          href:  `/rent?city=${c.slug}&type=villa`,
        })),
      },
    ],
  },

  "New Projects": {
    leftColumn: {
      heading: "Explore",
      links: [
        { label: "All New Projects",   href: "/new-projects" },
        { label: "Featured Launches",  href: "/new-projects" },
      ],
    },
    columns: [
      {
        heading: "Projects by City",
        links: _MENU_CITIES_SALE.map(c => ({
          label: `New Projects in ${c.name}`,
          href:  `/new-projects?city=${c.slug}`,
        })),
      },
      {
        heading: "Top Developers",
        links: [
          { label: "Prestige Group",        href: "/builders" },
          { label: "Sobha Developers",      href: "/builders" },
          { label: "Brigade Group",         href: "/builders" },
          { label: "DLF Limited",           href: "/builders" },
          { label: "Godrej Properties",     href: "/builders" },
          { label: "Mahindra Lifespaces",   href: "/builders" },
        ],
      },
    ],
  },

  "Commercial": {
    leftColumn: {
      heading: "Property Types",
      links: [
        { label: "Office Space",        href: "/commercial?type=office"     },
        { label: "Shop / Showroom",     href: "/commercial?type=shop"       },
        { label: "Warehouse / Godown",  href: "/commercial?type=warehouse"  },
        { label: "Co-working Space",    href: "/commercial?type=coworking"  },
      ],
    },
    columns: [
      {
        heading: "Commercial by City",
        links: _MENU_CITIES_SALE.map(c => ({
          label: `Commercial in ${c.name}`,
          href:  `/commercial?city=${c.slug}`,
        })),
      },
    ],
  },

  "Developers": {
    leftColumn: {
      heading: "For Developers",
      links: [
        { label: "All Builders",      href: "/builders"     },
        { label: "RERA Compliance",   href: "/legal-guide"  },
        { label: "Project Analytics", href: "/builders"     },
      ],
    },
    columns: [
      {
        heading: "Top Builders",
        links: [
          { label: "Prestige Group",       href: "/builders" },
          { label: "Sobha Developers",     href: "/builders" },
          { label: "Brigade Group",        href: "/builders" },
          { label: "DLF Limited",          href: "/builders" },
          { label: "Godrej Properties",    href: "/builders" },
          { label: "Mahindra Lifespaces",  href: "/builders" },
        ],
      },
    ],
  },

  "Insights": {
    leftColumn: {
      heading: "Read",
      links: [
        { label: "All Articles",    href: "/blog"         },
        { label: "Market Reports",  href: "/blog"         },
        { label: "Buying Guides",   href: "/legal-guide"  },
        { label: "Investment Tips", href: "/blog"         },
      ],
    },
    columns: [
      {
        heading: "Categories",
        links: [
          { label: "Market Trends",   href: "/blog" },
          { label: "Legal & Tax",     href: "/blog" },
          { label: "NRI Corner",      href: "/blog" },
          { label: "Home Loans",      href: "/blog" },
          { label: "Locality Guides", href: "/blog" },
        ],
      },
    ],
  },
}
