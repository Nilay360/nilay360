import { PageShell } from "../_components/SiteChrome";

export default function ValuationPage() {
  return (
    <PageShell
      eyebrow="Free Tool"
      title="Property"
      italic="Valuation"
      subtitle="Get an instant, data-backed estimate of any property's market value — based on locality trends and recent comparable transactions."
      badge="Coming Soon"
      bullets={[
        { t:"Instant Estimates", d:"AI-driven valuation using thousands of recent transactions across your city." },
        { t:"Locality Benchmarks", d:"See how a property compares against the average price per sqft in its micro-market." },
        { t:"Expert Review", d:"Request a free on-site valuation from a Nilay 360 agent for the final word." },
      ]}
    />
  );
}
