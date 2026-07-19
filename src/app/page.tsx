"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import { createClient } from "@/lib/supabase/client";
import { useSavedProperties } from "@/hooks/useSavedProperties";

/* ─── Palette ─────────────────────────────────────────────── */
const G = {
  dark:      "#000000",
  elevated:  "#0B0D10",
  surface:   "#121519",
  card:      "#161A1F",
  mid:       "#0B0D10",
  gold:      "#2BA8E0",
  goldLt:    "#3DBEF5",
  ivory:     "#0B0D10",
  black:     "#05080C",
  border:    "rgba(255,255,255,0.07)",
  borderBlue:"rgba(43,168,224,0.20)",
};

const CITIES = ["Hyderabad","Mumbai","Bengaluru","Delhi NCR","Chennai","Pune","Kolkata","Ahmedabad"];

/* ─── Service cards ─────────────────────────────────────────── */
const SERVICES: Record<string,{icon:string;label:string;href:string}[]> = {
  "For Buyers": [
    { icon:"M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10M9 21H3", label:"Home Loan", href:"/calculator" },
    { icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6", label:"Property Valuation", href:"/valuation" },
    { icon:"M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 010 2H4a1 1 0 010-2zm2 4h12v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z", label:"EMI Calculator", href:"/calculator" },
    { icon:"M3 6l3 1m0 0l-3 9a5 5 0 006.9 3.9L12 21l2.1-1.1A5 5 0 0021 16l-3-9m-3 1L12 3m0 0l-3 5m3-5l3 5", label:"Legal Services", href:"/legal-guide" },
    { icon:"M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9", label:"NRI Services", href:"/nri" },
    { icon:"M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", label:"Buyer Guide", href:"/legal-guide" },
  ],
  "For Tenants": [
    { icon:"M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z", label:"Rental Properties", href:"/rent" },
    { icon:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label:"PG / Hostel", href:"/rent?type=pg" },
    { icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", label:"Rent Agreement", href:"/legal-guide" },
    { icon:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label:"Tenant Rights", href:"/legal-guide" },
    { icon:"M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label:"Deposit Calculator", href:"/calculator" },
    { icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label:"Move-in Checklist", href:"/blog" },
  ],
  "For Agents": [
    { icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label:"Join Nilay 360", href:"/agents" },
    { icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6", label:"Lead Dashboard", href:"/dashboard" },
    { icon:"M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", label:"List Property", href:"/register" },
    { icon:"M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z", label:"Training", href:"/blog" },
    { icon:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", label:"Subscription Plans", href:"/agents" },
    { icon:"M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z", label:"Marketing Tools", href:"/blog" },
  ],
  "For Developers": [
    { icon:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", label:"Project Listing", href:"/new-projects" },
    { icon:"M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", label:"RERA Compliance", href:"/legal-guide" },
    { icon:"M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z", label:"Analytics", href:"/dashboard" },
    { icon:"M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z", label:"Lead Generation", href:"/contact" },
    { icon:"M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", label:"Branding", href:"/contact" },
    { icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label:"Investor Connect", href:"/contact" },
  ],
};

/* ─── Market data ─────────────────────────────────────────── */
const MARKET: Record<string,{price:string;growth:string;localities:{name:string;demand:string}[];newListings:number;trend:number[]}> = {
  Hyderabad:  { price:"₹7,200", growth:"+14.2%", localities:[{name:"Kokapet",demand:"Very High"},{name:"Gachibowli",demand:"High"},{name:"Kondapur",demand:"High"},{name:"Manikonda",demand:"Medium"},{name:"Nallagandla",demand:"Medium"}], newListings:342, trend:[5800,6100,6400,6900,7200] },
  Mumbai:     { price:"₹28,400", growth:"+8.6%", localities:[{name:"Bandra West",demand:"Very High"},{name:"Powai",demand:"High"},{name:"Andheri West",demand:"High"},{name:"Juhu",demand:"Medium"},{name:"Borivali",demand:"Medium"}], newListings:510, trend:[24000,25200,26100,27400,28400] },
  Bengaluru:  { price:"₹9,100", growth:"+12.1%", localities:[{name:"Whitefield",demand:"Very High"},{name:"Sarjapur",demand:"High"},{name:"Hebbal",demand:"High"},{name:"Electronic City",demand:"Medium"},{name:"Koramangala",demand:"Medium"}], newListings:418, trend:[7200,7700,8100,8600,9100] },
  "Delhi NCR":{ price:"₹12,300", growth:"+9.4%", localities:[{name:"Golf Course Rd",demand:"Very High"},{name:"Sector 143",demand:"High"},{name:"Dwarka Exp.",demand:"High"},{name:"Greater Noida",demand:"Medium"},{name:"Indirapuram",demand:"Medium"}], newListings:389, trend:[10100,10700,11200,11800,12300] },
  Chennai:    { price:"₹8,600", growth:"+10.7%", localities:[{name:"OMR",demand:"Very High"},{name:"Perumbakkam",demand:"High"},{name:"Sholinganallur",demand:"High"},{name:"Anna Nagar",demand:"Medium"},{name:"Velachery",demand:"Medium"}], newListings:267, trend:[7000,7300,7700,8100,8600] },
  Pune:       { price:"₹10,200", growth:"+11.3%", localities:[{name:"Kharadi",demand:"Very High"},{name:"Wakad",demand:"High"},{name:"Hinjewadi",demand:"High"},{name:"Baner",demand:"Medium"},{name:"Pimpri",demand:"Medium"}], newListings:305, trend:[8100,8600,9100,9700,10200] },
};

/* ─── Property data ─────────────────────────────────────────── */
const PROPERTIES = [
  { id:1, city:"Hyderabad", title:"Prestige Falcon City", type:"Apartment", beds:3, baths:3, sqft:2100, price:"₹2.8 Cr", img:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80", tag:"Featured" },
  { id:2, city:"Hyderabad", title:"Sobha Neopolis", type:"Villa", beds:4, baths:4, sqft:3800, price:"₹5.2 Cr", img:"https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", tag:"New Launch" },
  { id:3, city:"Mumbai", title:"Lodha Malabar", type:"Apartment", beds:4, baths:4, sqft:3200, price:"₹18.5 Cr", img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", tag:"Premium" },
  { id:4, city:"Mumbai", title:"Rustomjee Elements", type:"Apartment", beds:3, baths:2, sqft:1900, price:"₹7.4 Cr", img:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", tag:"Under Construction" },
  { id:5, city:"Bengaluru", title:"Brigade Insignia", type:"Villa", beds:5, baths:5, sqft:5200, price:"₹8.9 Cr", img:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", tag:"RERA" },
  { id:6, city:"Bengaluru", title:"Godrej Reserve", type:"Apartment", beds:3, baths:3, sqft:1750, price:"₹3.1 Cr", img:"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", tag:"Ready" },
  { id:7, city:"Delhi NCR", title:"DLF Camellias", type:"Penthouse", beds:5, baths:6, sqft:8800, price:"₹42 Cr", img:"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", tag:"Ultra Luxury" },
  { id:8, city:"Chennai", title:"Mahindra Eden", type:"Villa", beds:4, baths:4, sqft:3400, price:"₹4.6 Cr", img:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80", tag:"New Launch" },
  { id:9, city:"Pune", title:"Shapoorji Parkwest", type:"Apartment", beds:2, baths:2, sqft:1200, price:"₹1.8 Cr", img:"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80", tag:"Featured" },
];

const LOCATIONS = [
  { city:"Hyderabad", area:"Kokapet", listings:124, avg:"₹6,800/sqft", grad:"linear-gradient(135deg,#000000,#0B0D10)", img:"https://images.unsplash.com/photo-1590577976322-3d2d6e2130d5?w=800&q=80" },
  { city:"Mumbai", area:"Bandra West", listings:89, avg:"₹42,000/sqft", grad:"linear-gradient(135deg,#0d1f3c,#1a3a6e)", img:"https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80" },
  { city:"Bengaluru", area:"Whitefield", listings:156, avg:"₹8,200/sqft", grad:"linear-gradient(135deg,#1a1040,#3020a0)", img:"https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80" },
  { city:"Delhi NCR", area:"Golf Course Rd", listings:72, avg:"₹18,500/sqft", grad:"linear-gradient(135deg,#2c1810,#5a3020)", img:"https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80" },
  { city:"Pune", area:"Kharadi", listings:103, avg:"₹9,400/sqft", grad:"linear-gradient(135deg,#101a10,#204020)", img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
  { city:"Chennai", area:"OMR", listings:91, avg:"₹7,600/sqft", grad:"linear-gradient(135deg,#201010,#401a1a)", img:"https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80" },
];

type Testimonial = { id: string; name: string; role: string; rating: number; text: string; date: string };

const DEFAULT_SITE_CONTENT: Record<string, string> = {
  hero_line1: "Find Your Dream Property",
  hero_line2: "Now in Hyderabad",
  hero_subtitle: "From search to possession — India's most trusted premium platform",
  trust_bar_note: "",
};

/* ─── Helpers ─────────────────────────────────────────────── */
function SvgIcon({ d, size=20, color="currentColor", strokeWidth=1.5 }: { d:string; size?:number; color?:string; strokeWidth?:number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function StarRow({ n }: { n:number }) {
  return <span>{Array.from({length:5}).map((_,i) => <span key={i} style={{color: i<n ? G.gold : "#444", fontSize:13}}>★</span>)}</span>;
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null)
  const { savedIds, toggleSave } = useSavedProperties(userId)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const [siteContent, setSiteContent] = useState<Record<string, string>>(DEFAULT_SITE_CONTENT);
  useEffect(() => {
    async function loadSiteContent() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("site_content").select("key, value");
        if (data) {
          setSiteContent(prev => {
            const next = { ...prev };
            data.forEach((row: any) => { if (row.value) next[row.key] = row.value; });
            return next;
          });
        }
      } catch (_) {}
    }
    loadSiteContent();
  }, []);

  const [liveStats, setLiveStats] = useState({ listings: 0, agents: 0, cities: 0 });
  useEffect(() => {
    async function loadLiveStats() {
      try {
        const supabase = createClient();
        const [{ count: listingsCount }, { count: agentsCount }, { data: cityRows }] = await Promise.all([
          supabase.from("property_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("agent_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("property_listings").select("city").eq("status", "active"),
        ]);
        const uniqueCities = new Set((cityRows ?? []).map((r: any) => r.city).filter(Boolean)).size;
        setLiveStats({ listings: listingsCount ?? 0, agents: agentsCount ?? 0, cities: uniqueCities });
      } catch (_) {}
    }
    loadLiveStats();
  }, []);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  useEffect(() => {
    async function loadTestimonials() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("testimonials")
          .select("id, name, designation, company, content, rating, created_at")
          .eq("is_featured", true)
          .order("sort_order", { ascending: true })
          .limit(9);
        if (data) {
          setTestimonials(data.map((t: any) => ({
            id: t.id,
            name: t.name,
            role: [t.designation, t.company].filter(Boolean).join(", "),
            rating: t.rating ?? 5,
            text: t.content,
            date: t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
          })));
        }
      } catch (_) {}
    }
    loadTestimonials();
  }, []);

  const [searchTab, setSearchTab] = useState("Buy");
  const [searchCity, setSearchCity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceTab, setServiceTab] = useState("For Buyers");
  const [propCity, setPropCity] = useState("All");
  const [catCity, setCatCity] = useState("Hyderabad");
  const [insightCity, setInsightCity] = useState("Hyderabad");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const cityDropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cityOpen) return;
    const handler = (e: MouseEvent) => { if (cityDropRef.current && !cityDropRef.current.contains(e.target as Node)) setCityOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cityOpen]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const filteredProps = propCity === "All" ? PROPERTIES : PROPERTIES.filter(p => p.city === propCity);

  const scrollCarousel = (dir: number) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 300, behavior:"smooth" });
  };

  useEffect(() => {
    if (testimonials.length === 0) return;
    const t = setInterval(() => setReviewIdx(i => (i+1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);


  // Hero cursor glow — soft gold radial that follows the cursor within the hero only
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = heroRef.current;
    const glow = glowRef.current;
    if (!hero || !glow) return;
    let raf = 0, mx = 0, my = 0;
    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        glow.style.transform = `translate3d(${mx - 300}px, ${my - 300}px, 0)`;
      });
    };
    const onEnter = () => { glow.style.opacity = "1"; };
    const onLeave = () => { glow.style.opacity = "0"; };
    hero.addEventListener("mousemove", onMove, { passive: true });
    hero.addEventListener("mouseenter", onEnter);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseenter", onEnter);
      hero.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const md = MARKET[insightCity] ?? MARKET["Hyderabad"];
  const maxTrend = Math.max(...md.trend);

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported. Please use Chrome or Edge.');
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSearchQuery('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
      } else if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }
      const current = finalTranscript || interimTranscript;
      setSearchQuery(current);
      if (finalTranscript) {
        setTimeout(() => {
          router.push(`/search?q=${encodeURIComponent(finalTranscript.trim())}&city=${encodeURIComponent(searchCity)}&tab=${searchTab.toLowerCase().replace(/ /g, '-')}`);
        }, 600);
      }
    };

    try {
      recognition.start();
    } catch(e) {
      setIsListening(false);
      alert('Could not start voice recognition. Please try again.');
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: "Nilay 360",
          url: "https://nilay360.com",
          logo: "https://nilay360.com/logo.png",
          description: "Nilay 360 is a technology-powered real estate platform offering property discovery, 360-degree virtual tours, and end-to-end transaction support across India.",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Hyderabad",
            addressRegion: "Telangana",
            addressCountry: "IN",
          },
          sameAs: [
            "https://www.instagram.com/nilay360_",
            "https://www.instagram.com/nivila_in",
          ],
          areaServed: { "@type": "Country", name: "India" },
          serviceType: ["Property Discovery", "Virtual Property Tours", "Real Estate Transactions", "PropTech Solutions"],
        }) }}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body { font-family:'DM Sans',system-ui,sans-serif; background:#000000; color:#E8EAED; overflow-x:hidden; }
        html, body { max-width: 100vw; overflow-x: hidden !important; }
        #__next, main { max-width: 100vw; overflow-x: hidden; }
        section { max-width: 100vw; overflow-x: clip; }
        .hero-section { overflow: visible !important; }
        * { max-width: 100%; }
        a { color:inherit; text-decoration:none; }
        button { font-family:'DM Sans',system-ui,sans-serif; }

        .hide-scroll::-webkit-scrollbar { display:none; }
        .hide-scroll { -ms-overflow-style:none; scrollbar-width:none; }

        /* ── Card hover / image-zoom — unified shadow system ── */
        .card-hover { transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1); will-change:transform; }
        .card-hover:hover { transform:translateY(-8px); box-shadow:0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.22) !important; }
        .card-img { transition:transform 0.55s cubic-bezier(0.16,1,0.3,1); will-change:transform; }
        .card-hover:hover .card-img { transform:scale(1.07); }

        .nav-drop-item { display:block; padding:9px 14px; border-radius:6px; font-size:13px; color:#111; transition:background 0.15s, color 0.15s; white-space:nowrap; }
        .nav-drop-item:hover { background:rgba(11,13,16,0.06); color:#111; }

        .city-tab { padding:8px 18px; border-radius:999px; font-size:13px; font-weight:500; cursor:pointer; border:1px solid rgba(255,255,255,0.10); transition:all 0.2s; background:transparent; color:rgba(255,255,255,0.45); }
        .city-tab.active { background:${G.gold}; color:#fff; border-color:${G.gold}; }
        .city-tab:not(.active):hover { border-color:rgba(43,168,224,0.35); color:rgba(255,255,255,0.80); box-shadow:0 0 12px rgba(43,168,224,0.10); }

        /* ── Glass service cards ── */
        .svc-card { display:flex; flex-direction:column; align-items:center; gap:12px; padding:22px 14px; border-radius:16px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); cursor:pointer; transition:transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.35s ease; min-width:110px; will-change:transform; }
        .svc-card:hover { border-color:rgba(43,168,224,0.45); box-shadow:0 20px 60px rgba(0,0,0,0.45), 0 0 24px rgba(43,168,224,0.12); transform:translateY(-6px); }

        .search-tab { padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; border:none; background:transparent; color:rgba(255,255,255,0.55); border-bottom:2px solid transparent; transition:all 0.15s; white-space:nowrap; }
        .search-tab.active { color:#fff; border-bottom-color:${G.gold}; }
        .search-tab:not(.active):hover { color:rgba(255,255,255,0.85); }

        .badge-free { background:${G.gold}; color:#000; font-size:9px; font-weight:700; padding:1px 5px; border-radius:6px; letter-spacing:0.5px; margin-left:5px; vertical-align:middle; }
        .badge-tag { display:inline-block; background:rgba(43,168,224,0.15); color:${G.gold}; font-size:10px; font-weight:600; padding:3px 8px; border-radius:6px; letter-spacing:0.5px; }

        .insight-bar { height:6px; border-radius:6px; background:${G.gold}; transition:width 0.5s ease; }

        /* ── Stats as glass pills ── */
        .hero-stat { flex:1; padding:9px 14px; border-left:1px solid rgba(43,168,224,0.15); position:relative; box-sizing:border-box; }
        .hero-stat:first-child { border-left:none; }

        .section-divider { height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(43,168,224,0.20) 50%, transparent 100%); margin: 0; }

        /* ── Premium glass cards — unified system ── */
        .premium-card { background:rgba(255,255,255,0.04); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); box-shadow:0 4px 24px rgba(0,0,0,0.18); transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.4s ease; will-change:transform; }
        .premium-card:hover { transform:translateY(-8px); box-shadow:0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.22), 0 0 30px rgba(43,168,224,0.08); border-color:rgba(43,168,224,0.25); }

        /* ── Icon wrap + glow on hover ── */
        .svc-icon-wrap { width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg, rgba(43,168,224,0.14) 0%, rgba(43,168,224,0.04) 100%); border:1px solid rgba(43,168,224,0.18); display:flex; align-items:center; justify-content:center; transition:all 0.3s ease; will-change:box-shadow; }
        .svc-card:hover .svc-icon-wrap { background:linear-gradient(135deg, rgba(43,168,224,0.30) 0%, rgba(43,168,224,0.10) 100%); box-shadow:0 0 28px rgba(43,168,224,0.32), 0 0 8px rgba(43,168,224,0.16); border-color:rgba(43,168,224,0.42); }

        /* ── Category cards ── */
        .cat-card { position:relative; border-radius:24px; overflow:hidden; min-height:280px; cursor:pointer; display:flex; flex-direction:column; justify-content:flex-end; transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s; will-change:transform; }
        .cat-card:hover { transform:translateY(-8px); box-shadow:0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.22), 0 0 28px rgba(43,168,224,0.10); }
        .cat-card:hover .cat-img { transform:scale(1.07); }
        .cat-img { position:absolute; inset:0; background-size:cover; background-position:center; transition:transform 0.6s cubic-bezier(0.16,1,0.3,1); will-change:transform; }

        /* ── Location cards ── */
        .loc-card { position:relative; border-radius:20px; overflow:hidden; height:240px; cursor:pointer; flex-shrink:0; width:240px; transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s; will-change:transform; }
        .loc-card:hover { transform:translateY(-8px); box-shadow:0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.18), 0 0 20px rgba(43,168,224,0.08); }

        .glow-dot { width:6px; height:6px; border-radius:50%; background:#2BA8E0; box-shadow:0 0 8px rgba(43,168,224,0.8), 0 0 16px rgba(43,168,224,0.4); animation:pulse-dot 2s ease-in-out infinite; flex-shrink:0; }
        @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.3); } }
        @keyframes mic-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.2); } }
        .mic-listening { animation:mic-pulse 1s ease-in-out infinite; color:#2BA8E0 !important; }

        .blue-line { height:1px; background:linear-gradient(90deg, #2BA8E0 0%, #3DBEF5 50%, #2BA8E0 100%); box-shadow:0 0 8px rgba(43,168,224,0.5); }

        /* ── Stat reveal animation ── */
        @keyframes stat-reveal { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .stat-value { animation:stat-reveal 0.7s cubic-bezier(0.16,1,0.3,1) both; }

        @media (max-width:900px) {
          .nav-center { display:none !important; }
          .hero-search-row { flex-direction:column !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior:auto; }
          *, *::before, *::after { animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; }
        }

        @media (max-width: 768px) {
          .hero-section { min-height: auto !important; padding-top: 0 !important; }
          .hero-content { padding: 24px 16px 40px !important; padding-top: 90px !important; min-height: auto !important; }
          .hero-pill { margin-bottom: 20px !important; padding: 5px 12px !important; font-size: 11px !important; }
          .hero-h1 { font-size: clamp(30px, 8vw, 44px) !important; line-height: 1.1 !important; margin-bottom: 12px !important; }
          .hero-subline { font-size: 14px !important; margin-bottom: 24px !important; line-height: 1.6 !important; }
          .hero-searchbox { margin-bottom: 24px !important; border-radius: 16px !important; }
          .hero-stats { padding-top: 20px !important; padding-bottom: 0 !important; margin-bottom: 0 !important; gap: 10px !important; }
          .hero-stat { padding: 7px 8px; border-left: none !important; }
          .hero-stat div:first-child { font-size: 15px !important; }
          .svc-card { min-width: 85px; padding: 14px 8px; gap: 8px; }
          .svc-icon-wrap { width: 38px; height: 38px; border-radius: 10px; }
          .city-tab { padding: 6px 10px; font-size: 11px; }
          .search-tab { padding: 7px 10px; font-size: 11px; }
          .badge-free { display: none; }
          .premium-card { width: 260px !important; }
          .cat-card { min-height: 180px !important; border-radius: 16px !important; }
          .loc-card { width: 160px !important; height: 160px !important; }
          .hero-search-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; padding: 12px !important; width: 100% !important; box-sizing: border-box !important; }
          .hero-search-row > * { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; flex: none !important; }
          .hero-search-row select { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; padding: 10px 16px !important; }
          .hero-search-row button[type=submit], .hero-search-row > button:last-child { min-height: 44px !important; justify-content: center; }
          .section-heading { font-size: clamp(28px, 7vw, 40px) !important; }
        }

        @media (max-width: 480px) {
          .hero-content { padding-top: 84px !important; }
          .hero-h1 { font-size: clamp(28px, 9vw, 38px) !important; }
          .hero-stat { flex: 1 1 calc(50% - 6px) !important; padding: 6px 6px !important; min-width: 0 !important; border-left: none !important; }
          .hero-stat div:first-child { font-size: 15px !important; }
          .hero-stat div:last-child { font-size: 8px !important; }
          .svc-card { min-width: 75px; padding: 10px 4px; font-size: 10px; }
          .premium-card { width: 230px !important; }
          .loc-card { width: 140px !important; height: 140px !important; }
        }

        @media (max-width: 768px) {
          .services-section { padding: clamp(36px, 8vw, 56px) clamp(16px, 4vw, 24px) !important; }
          .services-h2 { font-size: clamp(22px, 6vw, 30px) !important; text-align: center !important; margin-bottom: 20px !important; }
          .services-tabs { justify-content: center !important; flex-wrap: wrap !important; gap: 8px !important; margin-bottom: 28px !important; }
          .services-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 16px !important; }
        }

        @media (max-width: 480px) {
          .services-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .services-tabs { gap: 6px !important; }
        }

        @media (max-width: 768px) {
          .featured-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .featured-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .featured-carousel { gap: 16px !important; padding-bottom: 16px !important; }
          .discover-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .discover-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .discover-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
        }

        @media (max-width: 480px) {
          .discover-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
        }

        @media (max-width: 768px) {
          .market-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .market-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .market-grid { grid-template-columns: repeat(2,1fr) !important; gap: 14px !important; }
        }

        @media (max-width: 480px) {
          .market-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
        }

        @media (max-width: 768px) {
          .why-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .why-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .why-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
        }

        @media (max-width: 480px) {
          .why-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
        }

        @media (max-width: 768px) {
          .trending-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .trending-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .trending-carousel { gap: 12px !important; padding-bottom: 12px !important; }
          .testimonials-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .testimonials-heading { font-size: clamp(22px,6vw,30px) !important; text-align: center !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .cta-section { padding: clamp(48px,10vw,72px) clamp(16px,4vw,24px) !important; text-align: center !important; }
          .cta-heading { font-size: clamp(24px,6vw,36px) !important; }
          .cta-buttons { flex-direction: column !important; align-items: center !important; gap: 12px !important; }
          .footer-section { padding: clamp(36px,8vw,56px) clamp(16px,4vw,24px) !important; }
          .footer-grid { grid-template-columns: repeat(2,1fr) !important; gap: 24px !important; }
          .footer-bottom { flex-direction: column !important; text-align: center !important; gap: 8px !important; }
        }

        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .cta-heading { font-size: clamp(22px,6vw,30px) !important; }
        }
      `}</style>

      {/* ══════════ HERO ══════════ */}
      <section ref={heroRef} className="hero-section" style={{
        position:"relative", minHeight:"100vh", paddingTop:"64px",
        display:"flex", flexDirection:"column", justifyContent:"center",
        background:"radial-gradient(ellipse 130% 65% at 50% 0%, rgba(43,168,224,0.13) 0%, transparent 52%), radial-gradient(ellipse 80% 80% at 88% 100%, rgba(43,168,224,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 55% at 12% 55%, rgba(43,168,224,0.06) 0%, transparent 58%), linear-gradient(180deg, #000000 0%, #050810 50%, #000000 100%)",
        overflow:"visible",
      }}>
        {/* Silk texture overlay */}
        <div style={{ position:"absolute", inset:0, zIndex:0, backgroundImage:"url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=40')", backgroundSize:"cover", opacity:0.04, mixBlendMode:"overlay", pointerEvents:"none" }} />
        {/* Cursor glow */}
        <div ref={glowRef} aria-hidden style={{position:"absolute", top:0, left:0, width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(43,168,224,0.14) 0%, transparent 70%)", pointerEvents:"none", opacity:0, transition:"opacity 0.3s ease", zIndex:0, willChange:"transform, opacity"}} />
        <div style={{position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 65% 40%, rgba(11,13,16,0.65) 0%, transparent 65%), radial-gradient(ellipse 60% 80% at 30% 60%, rgba(43,168,224,0.08) 0%, transparent 60%), rgba(5,8,12,0.72)"}} />

        {/* Animated premium SVG city skyline */}
        <svg style={{position:"absolute", bottom:0, left:0, right:0, width:"100%"}} viewBox="0 0 1440 380" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="bld-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3DBEF5" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#0B0D10" stopOpacity="0.95"/>
            </linearGradient>
            <linearGradient id="bld-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2BA8E0" stopOpacity="0.85"/>
              <stop offset="100%" stopColor="#050810" stopOpacity="0.98"/>
            </linearGradient>
            <linearGradient id="bld-c" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5DD4F8" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#0B1A2A" stopOpacity="1"/>
            </linearGradient>
            <linearGradient id="glow-a" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent"/>
              <stop offset="50%" stopColor="rgba(43,168,224,0.15)"/>
              <stop offset="100%" stopColor="transparent"/>
            </linearGradient>
            <pattern id="win-a" x="0" y="0" width="12" height="16" patternUnits="userSpaceOnUse">
              <rect x="2" y="2" width="7" height="10" rx="1" fill="rgba(255,255,255,0.18)"/>
            </pattern>
            <pattern id="win-b" x="0" y="0" width="10" height="14" patternUnits="userSpaceOnUse">
              <rect x="2" y="2" width="6" height="9" rx="1" fill="rgba(43,168,224,0.35)"/>
            </pattern>
            <pattern id="win-c" x="0" y="0" width="8" height="12" patternUnits="userSpaceOnUse">
              <rect x="1" y="2" width="5" height="7" rx="1" fill="rgba(255,255,255,0.12)"/>
            </pattern>
            <linearGradient id="reflect" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(43,168,224,0.08)"/>
              <stop offset="100%" stopColor="transparent"/>
            </linearGradient>
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <style>{`
            @keyframes bld-rise {
              from { transform: translateY(40px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes win-flicker {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
            @keyframes win-flicker2 {
              0%, 100% { opacity: 0.6; }
              30% { opacity: 1; }
              60% { opacity: 0.2; }
            }
            @keyframes antenna-blink {
              0%, 90%, 100% { opacity: 0; }
              91%, 99% { opacity: 1; }
            }
            .bld { animation: bld-rise 1.2s cubic-bezier(0.16,1,0.3,1) both; }
            .b1 { animation-delay: 0.05s; }
            .b2 { animation-delay: 0.12s; }
            .b3 { animation-delay: 0.18s; }
            .b4 { animation-delay: 0.08s; }
            .b5 { animation-delay: 0.22s; }
            .b6 { animation-delay: 0.15s; }
            .b7 { animation-delay: 0.28s; }
            .b8 { animation-delay: 0.10s; }
            .b9 { animation-delay: 0.20s; }
            .b10 { animation-delay: 0.06s; }
            .wf1 { animation: win-flicker 4.1s ease-in-out infinite; animation-delay: 0.7s; }
            .wf2 { animation: win-flicker2 5.3s ease-in-out infinite; animation-delay: 1.2s; }
            .wf3 { animation: win-flicker 6.7s ease-in-out infinite; animation-delay: 2.1s; }
            .ant { animation: antenna-blink 3s ease-in-out infinite; }
            .ant2 { animation: antenna-blink 4.2s ease-in-out infinite; animation-delay: 1.5s; }
          `}</style>

          {/* Ground glow */}
          <rect x="0" y="370" width="1440" height="10" fill="url(#glow-a)"/>

          {/* FAR BACKGROUND LAYER */}
          <g opacity="0.35">
            <rect className="bld b10" x="30" y="260" width="40" height="120" fill="url(#bld-b)"/>
            <rect className="bld b10" x="150" y="240" width="35" height="140" fill="url(#bld-b)"/>
            <rect className="bld b10" x="340" y="250" width="45" height="130" fill="url(#bld-b)"/>
            <rect className="bld b10" x="520" y="230" width="38" height="150" fill="url(#bld-b)"/>
            <rect className="bld b10" x="700" y="255" width="42" height="125" fill="url(#bld-b)"/>
            <rect className="bld b10" x="880" y="235" width="36" height="145" fill="url(#bld-b)"/>
            <rect className="bld b10" x="1060" y="248" width="44" height="132" fill="url(#bld-b)"/>
            <rect className="bld b10" x="1240" y="242" width="40" height="138" fill="url(#bld-b)"/>
            <rect className="bld b10" x="1380" y="258" width="38" height="122" fill="url(#bld-b)"/>
          </g>

          {/* Building 1 */}
          <g className="bld b1">
            <rect x="0" y="200" width="58" height="180" fill="url(#bld-b)"/>
            <rect x="0" y="200" width="58" height="180" fill="url(#win-c)" opacity="0.5"/>
            <rect x="8" y="180" width="16" height="22" fill="url(#bld-b)"/>
          </g>

          {/* Building 2 */}
          <g className="bld b2">
            <rect x="75" y="100" width="70" height="280" fill="url(#bld-a)"/>
            <rect x="75" y="100" width="70" height="280" fill="url(#win-b)" opacity="0.6" className="wf1"/>
            <rect x="95" y="82" width="30" height="20" fill="url(#bld-a)"/>
            <rect x="109" y="60" width="2" height="22" fill="rgba(255,255,255,0.4)"/>
            <circle cx="110" cy="58" r="3" fill="#ff4444" className="ant"/>
          </g>

          {/* Building 3 */}
          <g className="bld b3">
            <rect x="165" y="155" width="48" height="225" fill="url(#bld-b)"/>
            <rect x="165" y="155" width="48" height="225" fill="url(#win-c)" opacity="0.4"/>
            <rect x="177" y="135" width="24" height="22" fill="url(#bld-b)"/>
          </g>

          {/* Building 4 — tallest left */}
          <g className="bld b4">
            <rect x="238" y="40" width="92" height="340" fill="url(#bld-c)"/>
            <rect x="238" y="40" width="92" height="340" fill="url(#win-a)" opacity="0.55" className="wf2"/>
            <rect x="250" y="20" width="68" height="22" fill="url(#bld-c)"/>
            <rect x="264" y="4" width="40" height="18" fill="url(#bld-c)"/>
            <rect x="283" y="-12" width="3" height="18" fill="rgba(255,255,255,0.5)"/>
            <circle cx="284" cy="-14" r="4" fill="#ff4444" className="ant2"/>
            <rect x="238" y="40" width="18" height="340" fill="rgba(255,255,255,0.06)"/>
          </g>

          {/* Building 5 */}
          <g className="bld b5">
            <rect x="352" y="110" width="62" height="270" fill="url(#bld-b)"/>
            <rect x="352" y="110" width="62" height="270" fill="url(#win-b)" opacity="0.45" className="wf3"/>
            <rect x="364" y="92" width="38" height="20" fill="url(#bld-b)"/>
          </g>

          {/* Building 6 — center tall */}
          <g className="bld b6">
            <rect x="438" y="20" width="102" height="360" fill="url(#bld-a)"/>
            <rect x="438" y="20" width="102" height="360" fill="url(#win-a)" opacity="0.6" className="wf1"/>
            <rect x="456" y="2" width="66" height="20" fill="url(#bld-a)"/>
            <rect x="472" y="-14" width="34" height="18" fill="url(#bld-a)"/>
            <rect x="438" y="20" width="20" height="360" fill="rgba(255,255,255,0.05)"/>
            <rect x="488" y="-30" width="3" height="18" fill="rgba(255,255,255,0.5)"/>
            <circle cx="489" cy="-32" r="4" fill="#ff4444" className="ant"/>
          </g>

          {/* Building 7 */}
          <g className="bld b7">
            <rect x="560" y="130" width="68" height="250" fill="url(#bld-b)"/>
            <rect x="560" y="130" width="68" height="250" fill="url(#win-c)" opacity="0.5"/>
            <rect x="574" y="112" width="40" height="20" fill="url(#bld-b)"/>
          </g>

          {/* Building 8 — center-right tall */}
          <g className="bld b8">
            <rect x="652" y="50" width="85" height="330" fill="url(#bld-c)"/>
            <rect x="652" y="50" width="85" height="330" fill="url(#win-b)" opacity="0.55" className="wf2"/>
            <rect x="668" y="30" width="52" height="22" fill="url(#bld-c)"/>
            <rect x="680" y="12" width="28" height="20" fill="url(#bld-c)"/>
            <rect x="652" y="50" width="16" height="330" fill="rgba(255,255,255,0.06)"/>
            <rect x="688" y="12" width="2" height="14" fill="rgba(255,255,255,0.4)"/>
            <circle cx="689" cy="10" r="3" fill="#ff4444" className="ant2"/>
          </g>

          {/* Building 9 */}
          <g className="bld b9">
            <rect x="760" y="160" width="52" height="220" fill="url(#bld-b)"/>
            <rect x="760" y="160" width="52" height="220" fill="url(#win-c)" opacity="0.4"/>
            <rect x="772" y="142" width="28" height="20" fill="url(#bld-b)"/>
          </g>

          {/* Building 10 */}
          <g className="bld b1">
            <rect x="834" y="80" width="90" height="300" fill="url(#bld-a)"/>
            <rect x="834" y="80" width="90" height="300" fill="url(#win-a)" opacity="0.5" className="wf3"/>
            <rect x="852" y="60" width="54" height="22" fill="url(#bld-a)"/>
            <rect x="834" y="80" width="18" height="300" fill="rgba(255,255,255,0.05)"/>
          </g>

          {/* Building 11 */}
          <g className="bld b2">
            <rect x="946" y="120" width="60" height="260" fill="url(#bld-b)"/>
            <rect x="946" y="120" width="60" height="260" fill="url(#win-b)" opacity="0.45" className="wf1"/>
            <rect x="960" y="100" width="32" height="22" fill="url(#bld-b)"/>
          </g>

          {/* Building 12 — right tall */}
          <g className="bld b3">
            <rect x="1028" y="30" width="98" height="350" fill="url(#bld-c)"/>
            <rect x="1028" y="30" width="98" height="350" fill="url(#win-a)" opacity="0.6" className="wf2"/>
            <rect x="1046" y="10" width="62" height="22" fill="url(#bld-c)"/>
            <rect x="1062" y="-6" width="30" height="18" fill="url(#bld-c)"/>
            <rect x="1028" y="30" width="18" height="350" fill="rgba(255,255,255,0.06)"/>
            <rect x="1076" y="-22" width="3" height="18" fill="rgba(255,255,255,0.5)"/>
            <circle cx="1077" cy="-24" r="4" fill="#ff4444" className="ant"/>
          </g>

          {/* Building 13 */}
          <g className="bld b4">
            <rect x="1148" y="100" width="65" height="280" fill="url(#bld-b)"/>
            <rect x="1148" y="100" width="65" height="280" fill="url(#win-c)" opacity="0.5" className="wf3"/>
            <rect x="1162" y="82" width="38" height="20" fill="url(#bld-b)"/>
          </g>

          {/* Building 14 */}
          <g className="bld b5">
            <rect x="1238" y="60" width="80" height="320" fill="url(#bld-a)"/>
            <rect x="1238" y="60" width="80" height="320" fill="url(#win-b)" opacity="0.55" className="wf1"/>
            <rect x="1256" y="40" width="44" height="22" fill="url(#bld-a)"/>
            <rect x="1268" y="22" width="20" height="20" fill="url(#bld-a)"/>
            <rect x="1238" y="60" width="16" height="320" fill="rgba(255,255,255,0.05)"/>
          </g>

          {/* Building 15 */}
          <g className="bld b6">
            <rect x="1342" y="140" width="55" height="240" fill="url(#bld-b)"/>
            <rect x="1342" y="140" width="55" height="240" fill="url(#win-c)" opacity="0.4"/>
            <rect x="1354" y="122" width="30" height="20" fill="url(#bld-b)"/>
          </g>

          {/* Building 16 — far right */}
          <g className="bld b7">
            <rect x="1412" y="170" width="28" height="210" fill="url(#bld-b)"/>
            <rect x="1412" y="170" width="28" height="210" fill="url(#win-c)" opacity="0.35"/>
          </g>

          {/* Ground line + reflection */}
          <rect x="0" y="378" width="1440" height="2" fill="rgba(43,168,224,0.3)"/>
          <rect x="0" y="380" width="1440" height="40" fill="url(#reflect)" opacity="0.4"/>
        </svg>

        {/* Bottom fade */}
        <div style={{position:"absolute", bottom:0, left:0, right:0, height:"50%", background:"linear-gradient(to top, #050810 0%, transparent 100%)", pointerEvents:"none"}} />

        {/* Content */}
        <motion.div
          initial={{ opacity:0, y:30 }}
          animate={{ opacity:1, y:0 }}
          transition={{ duration:0.8, ease:[0.16,1,0.3,1] }}
          className="hero-content"
          style={{position:"relative", zIndex:2, padding:"0 16px 48px", maxWidth:"min(860px, 100%)", margin:"0 auto", textAlign:"center", width:"100%", boxSizing:"border-box"}}
        >
          {/* 2 — Search bar */}
          <div className="hero-searchbox" style={{background:"rgba(255,255,255,0.06)", backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)", border:"1px solid rgba(255,255,255,0.10)", borderRadius:24, overflow:"visible", maxWidth:"min(820px, 100%)", marginBottom:36, margin:"0 auto 36px", width:"100%", boxSizing:"border-box", boxShadow:"0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.08), inset 0 1px 0 rgba(255,255,255,0.06)", position:"relative", zIndex:10}}>
            <div style={{display:"flex", borderBottom:"1px solid rgba(255,255,255,0.08)", paddingLeft:4, overflowX:"auto"}} className="hide-scroll">
              {["Buy","Rent","New Projects","Valuation","List Property","Agents"].map(t=>(
                <button key={t} onClick={()=>setSearchTab(t)} className={`search-tab${searchTab===t?" active":""}`}>
                  {t}{(t==="Valuation"||t==="List Property") && <span className="badge-free">FREE</span>}
                </button>
              ))}
            </div>
            <div className="hero-search-row" style={{display:"flex", gap:0, alignItems:"stretch", padding:"12px 12px 12px 4px"}}>
              {/* Custom city dropdown */}
              <div ref={cityDropRef} style={{flex:"0 0 160px", position:"relative", borderRight:"1px solid rgba(255,255,255,0.1)"}}>
                <button
                  type="button"
                  onClick={()=>setCityOpen(o=>!o)}
                  style={{width:"100%", height:"100%", minHeight:44, background:"transparent", border:"none", padding:"0 14px 0 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, color: searchCity ? "#fff" : "rgba(255,255,255,0.45)", outline:"none"}}
                >
                  <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{searchCity || "Select City"}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{flexShrink:0, transition:"transform 0.2s", transform: cityOpen ? "rotate(180deg)" : "rotate(0deg)"}}>
                    <path d="M2 4l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {cityOpen && (
                  <div style={{position:"absolute", top:"calc(100% + 8px)", left:0, minWidth:180, background:"#0b0d10", border:"1px solid rgba(43,168,224,0.22)", borderRadius:14, boxShadow:"0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(43,168,224,0.10)", zIndex:9999, overflowY:"auto", overflowX:"hidden", maxHeight:320, padding:"6px"}}>
                    {["", ...CITIES].map((c,i)=>(
                      <button key={i} type="button"
                        onClick={()=>{ setSearchCity(c); setCityOpen(false); }}
                        style={{width:"100%", padding:"9px 14px", background: searchCity===c ? "rgba(43,168,224,0.12)" : "transparent", border:"none", borderRadius:9, textAlign:"left", fontFamily:"'DM Sans',sans-serif", fontSize:13, color: c ? "#fff" : "rgba(255,255,255,0.35)", cursor:"pointer", transition:"background 0.15s", display:"block"}}
                        onMouseOver={e=>(e.currentTarget.style.background="rgba(43,168,224,0.10)")}
                        onMouseOut={e=>(e.currentTarget.style.background= searchCity===c ? "rgba(43,168,224,0.12)" : "transparent")}
                      >{c || "All Cities"}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{flex:1, display:"flex", alignItems:"center", padding:"0 16px", gap:10}}>
                <SvgIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={16} color="rgba(255,255,255,0.4)" />
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search by Locality, Project or Builder"
                  style={{flex:1, background:"transparent", border:"none", color:"#fff", fontSize:14, outline:"none", fontFamily:"'DM Sans',sans-serif"}}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchCity)}&tab=${searchTab.toLowerCase().replace(/ /g, '-')}`);
                    }
                  }}
                />
                <button
                  title={isListening ? "Listening..." : "Voice search"}
                  onClick={startVoiceSearch}
                  style={{background:"none", border:"none", cursor:"pointer", display:"flex", padding:4, transition:"all 0.2s", animation: isListening ? "mic-pulse 1s ease-in-out infinite" : "none"}}
                >
                  <SvgIcon d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" size={16} color={isListening ? "#2BA8E0" : "rgba(255,255,255,0.4)"} />
                </button>
              </div>
              <button
                onClick={() => router.push(`/search?tab=${searchTab.toLowerCase().replace(/ /g, '-')}&city=${encodeURIComponent(searchCity)}&q=${encodeURIComponent(searchQuery)}`)}
                style={{padding:"0 28px", background:G.gold, borderRadius:10, color:"#000", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap", transition:"background 0.15s, box-shadow 0.15s", border:"none", cursor:"pointer", height:"100%", minHeight:44, boxShadow:"0 10px 30px rgba(43,168,224,0.35)"}}
                onMouseOver={e=>(e.currentTarget.style.background=G.goldLt)}
                onMouseOut={e=>(e.currentTarget.style.background=G.gold)}>
                <SvgIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={15} color="#000" />
                Search
              </button>
            </div>
          </div>

          {/* 3 — Stats strip */}
          <div className="hero-stats" style={{display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"12px", width:"100%", maxWidth:"100%", boxSizing:"border-box", marginBottom:40, paddingBottom:32, borderBottom:"1px solid rgba(43,168,224,0.12)", position:"relative", zIndex:2}}>
            {[[liveStats.listings.toLocaleString("en-IN"),"Listings"],[liveStats.agents.toLocaleString("en-IN"),"Agents"],[String(liveStats.cities),"Cities"]].map(([v,l])=>(
              <div key={l} className="hero-stat" style={{background:"rgba(255,255,255,0.04)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", border:"1px solid rgba(43,168,224,0.12)", borderRadius:12, flex:"1 1 auto"}}>
                <div className="stat-value" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:19, fontWeight:600, background:"linear-gradient(135deg, #E8EAED 0%, #2BA8E0 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>{v}</div>
                <div style={{fontSize:9.5, color:"rgba(255,255,255,0.50)", marginTop:2, letterSpacing:"0.06em", textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>
          {siteContent.trust_bar_note && (
            <p style={{fontSize:11, color:"rgba(255,255,255,0.4)", textAlign:"center", marginTop:-28, marginBottom:32}}>{siteContent.trust_bar_note}</p>
          )}

          {/* 4 — Headline */}
          <h1 className="hero-h1" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(32px,7vw,72px)", fontWeight:300, color:"#fff", lineHeight:1.05, marginBottom:16, letterSpacing:"-0.01em", wordBreak:"break-word", maxWidth:"100%"}}>
            {siteContent.hero_line1}
            <em style={{display:"block", color:G.goldLt, fontStyle:"italic", fontWeight:400}}>{siteContent.hero_line2}</em>
          </h1>

          {/* 5 — Subline */}
          <p className="hero-subline" style={{fontSize:15, color:"rgba(255,255,255,0.5)", lineHeight:1.75, marginBottom:0, maxWidth:500, fontWeight:300, margin:"0 auto", padding:"0 8px", maxWidth:"100%", boxSizing:"border-box"}}>
            {siteContent.hero_subtitle}
          </p>
        </motion.div>
      </section>

      {/* ══════════ SECTION 2 — TRUST BAR ══════════ */}
      <div className="section-divider" />
      <section style={{ background:"#0B0D10", padding:"0 56px" }}>
        <div style={{ maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box", display:"flex", alignItems:"center", justifyContent:"space-between", height:64, gap:24 }}>
          <div className="glow-dot" />
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontWeight:500, letterSpacing:"0.05em", whiteSpace:"nowrap" }}>INDIA'S PREMIUM REAL ESTATE PLATFORM</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
          {["RERA Verified Listings", `${liveStats.agents}+ Expert Agents`, `${liveStats.cities} Cities`].map((t,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"#2BA8E0" }} />
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)", whiteSpace:"nowrap" }}>{t}</span>
            </div>
          ))}
          <div className="glow-dot" />
        </div>
      </section>
      <div className="section-divider" />

      {/* ══════════ SECTION 3 — EVERYTHING AT ONE PLACE ══════════ */}
      <section className="services-section" style={{background:"#000000", padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)", borderTop:"1px solid rgba(43,168,224,0.08)"}}>
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box"}}>
          <Reveal>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28, flexWrap:"wrap", gap:16}}>
            <div>
              <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Our Services</div>
              <h2 className="services-h2" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>Everything You Need at One Place</h2>
            </div>
            <div className="services-tabs" style={{display:"flex", gap:6, background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4, border:"1px solid rgba(255,255,255,0.06)"}}>
              {Object.keys(SERVICES).map(t=>(
                <button key={t} onClick={()=>setServiceTab(t)} style={{padding:"8px 18px", borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer", border:"none", background: serviceTab===t ? G.gold : "transparent", color: serviceTab===t ? "#000" : "rgba(255,255,255,0.45)", transition:"all 0.15s"}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          </Reveal>

          <div className="services-grid" style={{display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12}}>
            {SERVICES[serviceTab].map((svc,i)=>(
              <Reveal key={svc.label} delay={i*0.06}>
              <motion.div whileHover={{ y: -4 }} transition={{ type:"spring", stiffness:300, damping:20 }}>
              <a href={svc.href} className="svc-card" style={{width:"100%"}}>
                <div className="svc-icon-wrap">
                  <SvgIcon d={svc.icon} size={22} color={G.gold} />
                </div>
                <span style={{fontSize:12, fontWeight:600, color:"#AEB4BC", textAlign:"center", lineHeight:1.3}}>{svc.label}</span>
              </a>
              </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 4 — FEATURED PROPERTIES CAROUSEL ══════════ */}
      <section className="featured-section" style={{background:"#0B0D10", padding:"96px 0 96px 56px"}}>
        <div style={{maxWidth:1280+56, paddingRight:0, margin:"0 auto"}}>
          <Reveal>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, paddingRight:56, flexWrap:"wrap", gap:12}}>
            <div>
              <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Featured Listings</div>
              <h2 className="featured-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>Premium Properties</h2>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:16}}>
              <a href="/properties" style={{fontSize:14, color:G.gold, fontWeight:600, display:"flex", alignItems:"center", gap:4}}>
                View All →
              </a>
              <div style={{display:"flex", gap:8}}>
                {[-1,1].map(d=>(
                  <button key={d} onClick={()=>scrollCarousel(d)}
                    style={{width:40, height:40, borderRadius:"50%", border:`1px solid rgba(43,168,224,0.25)`, background:"rgba(11,13,16,0.8)", backdropFilter:"blur(8px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", color:"#FFFFFF"}}
                    onMouseOver={e=>{(e.currentTarget as HTMLElement).style.background="rgba(43,168,224,0.2)";(e.currentTarget as HTMLElement).style.borderColor="rgba(43,168,224,0.6)";}}
                    onMouseOut={e=>{(e.currentTarget as HTMLElement).style.background="rgba(11,13,16,0.8)";(e.currentTarget as HTMLElement).style.borderColor="rgba(43,168,224,0.25)";}}>
                    <SvgIcon d={d<0 ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} size={14} color="currentColor" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          </Reveal>

          {/* City tabs */}
          <div style={{display:"flex", gap:8, marginBottom:24, flexWrap:"wrap"}}>
            {["All","Hyderabad","Mumbai","Bengaluru","Delhi NCR","Chennai","Pune"].map(c=>(
              <button key={c} onClick={()=>setPropCity(c)} className={`city-tab${propCity===c?" active":""}`}>{c}</button>
            ))}
          </div>

          {/* Carousel */}
          <div ref={carouselRef} className="hide-scroll featured-carousel" style={{display:"flex", gap:16, overflowX:"auto", paddingBottom:8, paddingRight:56, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", maxWidth:"100vw", boxSizing:"border-box"}}>
            {filteredProps.map((p,i)=>(
              <Reveal key={p.id} delay={i*0.06} style={{flexShrink:0}}>
              <a href={`/property/${p.id}`} className="premium-card"
                style={{flexShrink:0, width:280, borderRadius:16, overflow:"hidden", display:"block", scrollSnapAlign:"start"}}>
                {/* Image */}
                <div style={{height:180, position:"relative", overflow:"hidden"}}>
                  <div className="card-img" style={{position:"absolute", inset:0, backgroundImage:`url(${p.img})`, backgroundSize:"cover", backgroundPosition:"center"}} />
                  <div style={{position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)"}} />
                  <span className="badge-tag" style={{position:"absolute", top:12, left:12, zIndex:1}}>{p.tag}</span>
                  <button
                    onClick={(e) => { e.preventDefault(); toggleSave(p.id) }}
                    style={{position:"absolute", top:12, right:12, zIndex:2, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s"}}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={savedIds.has(p.id) ? "#2BA8E0" : "none"} stroke={savedIds.has(p.id) ? "#2BA8E0" : "rgba(255,255,255,0.8)"} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <div style={{position:"absolute", bottom:12, right:12, zIndex:1, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(6px)", borderRadius:6, padding:"4px 10px"}}>
                    <span style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18, fontWeight:700, color:"#fff"}}>{p.price}</span>
                  </div>
                </div>
                {/* Info */}
                <div style={{padding:"18px", background:"rgba(11,13,16,0.96)"}}>
                  <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:500, letterSpacing:"0.05em", marginBottom:4}}>{p.city} · {p.type}</div>
                  <h3 style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:18, fontWeight:700, color:"#fff", marginBottom:10}}>{p.title}</h3>
                  <div style={{display:"flex", gap:14, fontSize:12, color:"rgba(255,255,255,0.45)"}}>
                    <span style={{display:"flex", alignItems:"center", gap:4}}>
                      <SvgIcon d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" size={12} color="rgba(255,255,255,0.35)" /> {p.beds} Beds
                    </span>
                    <span style={{display:"flex", alignItems:"center", gap:4}}>
                      <SvgIcon d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" size={12} color="rgba(255,255,255,0.35)" /> {p.baths} Baths
                    </span>
                    <span>{p.sqft.toLocaleString()} sqft</span>
                  </div>
                </div>
              </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 5 — PROPERTY CATEGORIES ══════════ */}
      <section className="discover-section" style={{background:"#000000", padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)"}}>
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box"}}>
          <Reveal>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24, flexWrap:"wrap", gap:12}}>
            <div>
              <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Browse by Type</div>
              <h2 className="discover-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>Discover Properties Across India</h2>
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {CITIES.slice(0,6).map(c=>(
                <button key={c} onClick={()=>setCatCity(c)} className={`city-tab${catCity===c?" active":""}`} style={{fontSize:12}}>{c}</button>
              ))}
            </div>
          </div>
          </Reveal>

          <div className="discover-grid" style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16}}>
            {[
              {type:"Apartments", count:142, grad:"linear-gradient(135deg, rgba(43,168,224,0.6) 0%, rgba(11,13,16,0.8) 100%)", img:"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80", d:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"},
              {type:"Villas", count:48, grad:"linear-gradient(135deg, rgba(61,190,245,0.5) 0%, rgba(11,13,16,0.8) 100%)", img:"https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", d:"M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10"},
              {type:"Plots & Land", count:76, grad:"linear-gradient(135deg, rgba(43,168,224,0.4) 0%, rgba(11,13,16,0.8) 100%)", img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", d:"M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"},
            ].map((cat,i)=>(
              <Reveal key={cat.type} delay={i*0.08}>
              <a href={`/search?city=${catCity.toLowerCase().replace(" ","-")}&type=${cat.type.toLowerCase().split(" ")[0]}`}
                className="cat-card"
                style={{width:"100%"}}>
                <div className="cat-img" style={{backgroundImage:`url(${cat.img})`}} />
                <div style={{position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)"}} />
                <div style={{position:"absolute", inset:0, background:cat.grad, opacity:0.3}} />
                <div style={{position:"relative", zIndex:2, padding:"0 28px 28px"}}>
                  <span style={{display:"inline-block", background:"rgba(43,168,224,0.15)", border:"1px solid rgba(43,168,224,0.30)", color:G.goldLt, borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:600, marginBottom:8}}>{cat.count} properties</span>
                  <h3 style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", marginBottom:6}}>{cat.type}</h3>
                  <p style={{fontSize:12, color:"rgba(255,255,255,0.6)", marginBottom:0}}>for Sale in {catCity}</p>
                  <div style={{color:G.gold, fontSize:13, marginTop:8, opacity:0.8}}>→</div>
                </div>
              </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 6 — MARKET INSIGHTS ══════════ */}
      <section className="market-section" style={{background:"#0B0D10", padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)"}}>
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box"}}>
          <Reveal>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24, flexWrap:"wrap", gap:12}}>
            <div>
              <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Market Intelligence</div>
              <h2 className="market-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>Property Price Insights</h2>
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {Object.keys(MARKET).map(c=>(
                <button key={c} onClick={()=>setInsightCity(c)} className={`city-tab${insightCity===c?" active":""}`} style={{fontSize:12}}>{c}</button>
              ))}
            </div>
          </div>
          </Reveal>

          <div className="market-grid" style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16}}>
            {/* Price trend mini chart */}
            <Reveal delay={0}>
            <div style={{background:"rgba(255,255,255,0.03)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 4px 24px rgba(0,0,0,0.2)", height:"100%"}}>
              <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:16}}>Price Trend (₹/sqft)</div>
              <div style={{display:"flex", alignItems:"flex-end", gap:6, height:80, marginBottom:12}}>
                {md.trend.map((v,i)=>(
                  <div key={i} style={{flex:1, background: i===md.trend.length-1 ? G.gold : "rgba(43,168,224,0.12)", borderRadius:"3px 3px 0 0", height:`${(v/maxTrend)*100}%`, transition:"height 0.5s ease", position:"relative"}}>
                    {i===md.trend.length-1 && <div style={{position:"absolute", top:-18, left:"50%", transform:"translateX(-50%)", fontSize:9, color:G.gold, fontWeight:700, whiteSpace:"nowrap"}}>{v.toLocaleString()}</div>}
                  </div>
                ))}
              </div>
              <div style={{display:"flex", justifyContent:"space-between", fontSize:10, color:"rgba(255,255,255,0.3)"}}>
                {["Q1","Q2","Q3","Q4","Now"].map(q=><span key={q}>{q}</span>)}
              </div>
            </div>
            </Reveal>

            {/* Avg price */}
            <Reveal delay={0.08}>
            <div style={{background:"rgba(255,255,255,0.03)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 4px 24px rgba(0,0,0,0.2)", height:"100%"}}>
              <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:16}}>Avg Price / Sqft</div>
              <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:40, fontWeight:700, color:"#fff", lineHeight:1, marginBottom:8}}>{md.price}</div>
              <span style={{display:"inline-block", background:"rgba(26,122,60,0.15)", color:"#4ade80", fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:6, border:"1px solid rgba(74,222,128,0.2)"}}>
                {md.growth} YoY
              </span>
              <div style={{marginTop:16, fontSize:12, color:"rgba(255,255,255,0.35)"}}>Current average across all property types in {insightCity}</div>
            </div>
            </Reveal>

            {/* Top localities */}
            <Reveal delay={0.16}>
            <div style={{background:"rgba(255,255,255,0.03)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 4px 24px rgba(0,0,0,0.2)", height:"100%"}}>
              <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:16}}>Top Localities</div>
              {md.localities.map((loc,i)=>(
                <div key={loc.name} style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span style={{width:18, height:18, borderRadius:"50%", background:i===0?G.gold:"rgba(43,168,224,0.10)", color: i===0 ? "#000" : "rgba(255,255,255,0.5)", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:13, color:"rgba(255,255,255,0.75)", fontWeight:500}}>{loc.name}</span>
                  </div>
                  <span style={{fontSize:11, color: loc.demand==="Very High" ? "#4ade80" : "rgba(255,255,255,0.4)", fontWeight:600}}>{loc.demand}</span>
                </div>
              ))}
            </div>
            </Reveal>

            {/* New listings */}
            <Reveal delay={0.24}>
            <div style={{background:"rgba(255,255,255,0.03)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderRadius:16, padding:24, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 4px 24px rgba(0,0,0,0.2)", height:"100%"}}>
              <div style={{fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:16}}>New Listings This Month</div>
              <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:40, fontWeight:700, color:"#fff", lineHeight:1, marginBottom:8}}>{md.newListings}</div>
              <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:16}}>
                <span style={{fontSize:18, color:"#4ade80"}}>↑</span>
                <span style={{fontSize:13, color:"#4ade80", fontWeight:600}}>+12% vs last month</span>
              </div>
              <a href={`/search?city=${insightCity.toLowerCase().replace(" ","-")}&sort=newest`} style={{fontSize:13, color:G.gold, fontWeight:600, display:"flex", alignItems:"center", gap:4}}>
                View new listings →
              </a>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 7 — WHY Nilay 360 ══════════ */}
      <section className="why-section" style={{background:"linear-gradient(180deg, #000000 0%, #0B0D10 100%)", padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)", position:"relative"}}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=30')", backgroundSize:"cover", opacity:0.03, mixBlendMode:"overlay" }} />
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box", position:"relative", zIndex:1}}>
          <Reveal>
          <div style={{textAlign:"center", marginBottom:28}}>
            <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Why Choose Us</div>
            <h2 className="why-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>The Nilay 360 Difference</h2>
          </div>
          </Reveal>

          <div className="why-grid" style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12}}>
            {[
              {d:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title:"RERA Verified", desc:"Every listing verified"},
              {d:"M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", title:"Trusted Agents", desc:"500+ certified professionals"},
              {d:"M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", title:"Zero Hidden Costs", desc:"100% transparent pricing"},
              {d:"M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9", title:"NRI Friendly", desc:"Seamless cross-border service"},
              {d:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6", title:"Market Intelligence", desc:"Real-time data & insights"},
              {d:"M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title:"24/7 Support", desc:"Dedicated assistance always"},
            ].map((c,i)=>(
              <Reveal key={c.title} delay={(i%3)*0.08}>
              <div className="premium-card" style={{borderRadius:16, padding:"22px 24px", display:"flex", alignItems:"center", gap:16, maxHeight:100}}>
                <div className="svc-icon-wrap" style={{flexShrink:0}}>
                  <SvgIcon d={c.d} size={20} color={G.gold} />
                </div>
                <div>
                  <div style={{fontSize:14, fontWeight:700, color:"#fff", marginBottom:2}}>{c.title}</div>
                  <div style={{fontSize:12, color:"rgba(255,255,255,0.45)"}}>{c.desc}</div>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 8 — TRENDING LOCATIONS ══════════ */}
      <section className="trending-section" style={{background:"#000000", padding:"96px 0 96px 56px"}}>
        <div style={{maxWidth:1280+56, margin:"0 auto"}}>
          <Reveal>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28, paddingRight:56}}>
            <div>
              <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Hot Markets</div>
              <h2 className="trending-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", wordBreak:"break-word", maxWidth:"100%"}}>Trending Locations</h2>
            </div>
            <a href="/locations" style={{fontSize:14, color:G.gold, fontWeight:600}}>View all cities →</a>
          </div>
          </Reveal>

          <div className="hide-scroll trending-carousel" style={{display:"flex", gap:16, overflowX:"auto", paddingRight:56, paddingBottom:8, scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch", maxWidth:"100vw", boxSizing:"border-box"}}>
            {LOCATIONS.map((loc,i)=>(
              <Reveal key={`${loc.city}-${loc.area}`} delay={i*0.06} style={{flexShrink:0}}>
              <a href={`/search?city=${loc.city.toLowerCase().replace(" ","-")}&locality=${loc.area.toLowerCase().replace(" ","-")}`}
                className="loc-card"
                style={{ position:"relative", borderRadius:20, overflow:"hidden", height:240, width:240, flexShrink:0, cursor:"pointer", display:"block", scrollSnapAlign:"start" }}>
                <div style={{position:"absolute", inset:0, backgroundImage:`url(${loc.img})`, backgroundSize:"cover", backgroundPosition:"center", transition:"transform 0.6s cubic-bezier(0.16,1,0.3,1)"}} />
                <div style={{position:"absolute", inset:0, background:loc.grad, opacity:0.25}} />
                <div style={{position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)"}} />
                <div style={{position:"absolute", bottom:16, left:16, right:16}}>
                  <div style={{fontSize:10, color:"rgba(255,255,255,0.6)", letterSpacing:"0.05em", marginBottom:2}}>{loc.city}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20, fontWeight:700, color:"#fff"}}>{loc.area}</div>
                  <div style={{display:"flex", gap:12, marginTop:6}}>
                    <span style={{fontSize:11, color:G.goldLt}}>{loc.listings} listings</span>
                    <span style={{fontSize:11, color:"rgba(255,255,255,0.6)"}}>{loc.avg}</span>
                  </div>
                </div>
              </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 9 — TESTIMONIALS ══════════ */}
      <section className="testimonials-section" style={{background:"#0B0D10", padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)"}}>
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box"}}>
          <Reveal>
          <div style={{textAlign:"center", marginBottom:28}}>
            <div style={{fontSize:11, color:G.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:8}}>Client Stories</div>
            <h2 className="testimonials-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:32, fontWeight:700, color:"#fff", marginBottom:8, wordBreak:"break-word", maxWidth:"100%"}}>What Our Clients Say</h2>
          </div>
          </Reveal>

          {testimonials.length === 0 ? (
            <Reveal>
              <div className="premium-card" style={{borderRadius:20, padding:"48px 32px", textAlign:"center", borderTop:"2px solid rgba(43,168,224,0.25)", maxWidth:560, margin:"0 auto"}}>
                <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:20, color:"rgba(255,255,255,0.8)", marginBottom:8}}>Be the First to Share Your Experience</p>
                <p style={{fontSize:13, color:"rgba(255,255,255,0.45)"}}>We're just getting started — client reviews will appear here as they come in.</p>
              </div>
            </Reveal>
          ) : (
            <>
              {/* Review cards */}
              <div className="testimonials-grid" style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24}}>
                {Array.from({length: Math.min(3, testimonials.length)}, (_,k) => testimonials[(reviewIdx+k)%testimonials.length]).map((r,pos)=>(
                  <Reveal key={r.id} delay={pos*0.08}>
                  <div className="premium-card" style={{borderRadius:20, padding:"32px", borderTop:"2px solid rgba(43,168,224,0.25)", transition:"opacity 0.3s", height:"100%"}}>
                    <StarRow n={r.rating} />
                    <p style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:17, color:"rgba(255,255,255,0.85)", lineHeight:1.65, margin:"14px 0 20px", fontStyle:"italic"}}>{`"${r.text}"`}</p>
                    <div style={{display:"flex", alignItems:"center", gap:12}}>
                      <div style={{width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg, #2BA8E0 0%, #1577B8 100%)", display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <span style={{fontSize:14, fontWeight:700, color:"#fff"}}>{r.name[0]}</span>
                      </div>
                      <div>
                        <div style={{fontSize:13, fontWeight:700, color:"#fff"}}>{r.name}</div>
                        <div style={{fontSize:11, color:"rgba(255,255,255,0.4)"}}>{r.role}{r.role && r.date ? " · " : ""}{r.date}</div>
                      </div>
                    </div>
                  </div>
                  </Reveal>
                ))}
              </div>

              {/* Dots */}
              {testimonials.length > 1 && (
                <div style={{display:"flex", justifyContent:"center", gap:8}}>
                  {testimonials.map((t,i)=>(
                    <button key={t.id} onClick={()=>setReviewIdx(i)} style={{width: i===reviewIdx ? 24 : 8, height:8, borderRadius:4, background: i===reviewIdx ? G.gold : "rgba(255,255,255,0.15)", border:"none", cursor:"pointer", transition:"all 0.3s"}} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <div className="section-divider" />

      {/* ══════════ SECTION 10 — CTA BANNER ══════════ */}
      <section className="cta-section" style={{background:`linear-gradient(135deg, ${G.dark} 0%, ${G.mid} 100%)`, padding:"clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)", position:"relative", overflow:"hidden"}}>
        {/* Decorative circles */}
        <div style={{position:"absolute", left:-150, top:-150, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(43,168,224,0.12) 0%, transparent 70%)", pointerEvents:"none"}} />
        <div style={{position:"absolute", right:-150, bottom:-150, width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(43,168,224,0.10) 0%, transparent 70%)", pointerEvents:"none"}} />
        <div style={{position:"absolute", inset:0, backgroundImage:"radial-gradient(ellipse 50% 80% at 80% 50%, rgba(43,168,224,0.1) 0%, transparent 60%)", pointerEvents:"none"}} />
        <Reveal style={{maxWidth:720, margin:"0 auto", position:"relative", zIndex:1}}>
        <div style={{textAlign:"center", background:"rgba(255,255,255,0.04)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.10)", borderRadius:32, padding:"clamp(32px,5vw,56px) clamp(24px,4vw,48px)", boxShadow:"0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(43,168,224,0.08)"}}>
          <h2 className="cta-heading" style={{fontFamily:"'Cormorant Garamond',Georgia,serif", fontSize:"clamp(26px,5vw,40px)", fontWeight:300, color:"#fff", marginBottom:14, wordBreak:"break-word", maxWidth:"100%"}}>
            Ready to Find Your<br /><em style={{fontStyle:"italic", color:G.goldLt}}>Perfect Property?</em>
          </h2>
          <p style={{fontSize:15, color:"rgba(255,255,255,0.65)", marginBottom:32, lineHeight:1.7}}>
            Join 50,000+ buyers and investors who found their dream property through Nilay 360.
          </p>
          <div className="cta-buttons" style={{display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap"}}>
            <a href="/search" style={{padding:"14px 32px", background:G.gold, borderRadius:10, color:"#000", fontSize:15, fontWeight:700, transition:"background 0.15s, box-shadow 0.15s", boxShadow:"0 10px 30px rgba(43,168,224,0.35)"}}
              onMouseOver={e=>{e.currentTarget.style.background=G.goldLt; e.currentTarget.style.boxShadow="0 10px 30px rgba(61,190,245,0.45)";}} onMouseOut={e=>{e.currentTarget.style.background=G.gold; e.currentTarget.style.boxShadow="0 10px 30px rgba(43,168,224,0.35)";}}>Browse Properties</a>
            <a href="/contact" style={{padding:"14px 32px", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, color:"#fff", fontSize:15, fontWeight:500, transition:"all 0.15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=G.gold;e.currentTarget.style.color=G.gold;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";e.currentTarget.style.color="#fff";}}>Contact an Expert</a>
          </div>
        </div>
        </Reveal>
      </section>

      {/* ══════════ SECTION 11 — FOOTER ══════════ */}
      <footer className="footer-section" style={{background:G.black, padding:"56px 56px 28px", color:"rgba(255,255,255,0.55)"}}>
        <div style={{maxWidth:"min(1280px, 100%)", margin:"0 auto", width:"100%", boxSizing:"border-box"}}>
          <div className="footer-grid" style={{display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:40, marginBottom:48}}>
            {/* Brand */}
            <div>
              <a href="/" style={{display:"inline-block", marginBottom:12}}>
                <img src="/nilay_logo_final.png" alt="Nilay 360" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
              </a>
              <p style={{fontSize:13, lineHeight:1.75, maxWidth:240, marginBottom:20}}>India's premium real estate platform connecting discerning buyers with exceptional properties.</p>
              <div style={{display:"flex", gap:10}}>
                {[
                  {href:"https://www.instagram.com/nilay360", title:"Follow on Instagram", hoverBg:"rgba(225,48,108,0.15)", d:"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"},
                  {href:"https://www.linkedin.com/company/nilay360", title:"Connect on LinkedIn", hoverBg:"rgba(0,119,181,0.15)", d:"M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"},
                  {href:"https://www.youtube.com/@nilay360", title:"Watch on YouTube", hoverBg:"rgba(255,0,0,0.15)", d:"M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"},
                ].map(s=>(
                  <a key={s.href} href={s.href} title={s.title} target="_blank" rel="noopener noreferrer"
                    style={{width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.15s"}}
                    onMouseOver={e=>(e.currentTarget.style.background=s.hoverBg)}
                    onMouseOut={e=>(e.currentTarget.style.background="rgba(255,255,255,0.07)")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d={s.d} /></svg>
                  </a>
                ))}
              </div>
            </div>
            {/* Cols */}
            {[
              {heading:"Properties", links:[["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]]},
              {heading:"Company",    links:[["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]]},
              {heading:"Tools",      links:[["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]]},
              {heading:"Legal",      links:[["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"]]},
            ].map(col=>(
              <div key={col.heading}>
                <h4 style={{fontSize:10, fontWeight:700, color:"#fff", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:16}}>{col.heading}</h4>
                {col.links.map(([l,h])=>(
                  <a key={l} href={h} style={{display:"block", color:"rgba(255,255,255,0.5)", fontSize:13, marginBottom:10, transition:"color 0.15s"}}
                    onMouseOver={e=>(e.currentTarget.style.color=G.gold)} onMouseOut={e=>(e.currentTarget.style.color="rgba(255,255,255,0.5)")}>{l}</a>
                ))}
              </div>
            ))}
          </div>

          <div className="footer-bottom" style={{borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12}}>
            <p style={{fontSize:12}}>© {new Date().getFullYear()} Nilay 360 · All rights reserved.</p>
            <p style={{fontSize:12}}>All listings subject to availability. Prices are indicative. Verify with RERA before purchase.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
