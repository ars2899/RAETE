import { useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, ChevronDown, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import './RaeteV0.css';

type Dimension = 'materials' | 'quality' | 'price' | 'longevity';
type Level = '' | 'Low' | 'Medium' | 'High';
type Preferences = Record<Dimension, Level>;
type Product = {
  id: string; title: string; brand: string; image: string; merchant: string;
  price: number; currency: string; url: string;
};
type Scored = { product: Product; score: number; parts: Record<Dimension, number | null>; originalIndex: number };

const products: Product[] = [
  { id: '07UgnU0', title: 'Black Mini Skirt', brand: 'HOUSE OF CB', image: 'https://cdn.trychannel3.com/9ded59e2-dee0-4914-98d5-be319475f09f?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=LNuX', merchant: 'app.houseofcb.com', price: 35, currency: 'USD', url: 'https://buy.trychannel3.com/07UgnU0-LNuX-KVktGh?o=01M1P7E47B9SNVW9MC95765XC2&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: 'ahwMlOn', title: 'Jocasta Ruched Mini Skirt', brand: 'Club L London', image: 'https://cdn.trychannel3.com/cleaned/v1/83944c62-f5da-434a-b325-2d9cc6034376?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=P0EM', merchant: 'clubllondon.us', price: 45, currency: 'USD', url: 'https://buy.trychannel3.com/ahwMlOn-P0EM-KVktGh?o=01M2WG6RTNMTWGTE0GBGDMRPV2&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: 'lYraqZI', title: 'Marina Mini Skirt', brand: 'Larroudé', image: 'https://cdn.trychannel3.com/cleaned/v1/f23f373f-f6ce-4fa7-9023-eb021b1342c8?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=1eoW', merchant: 'larroude.com', price: 475, currency: 'USD', url: 'https://buy.trychannel3.com/lYraqZI-1eoW-KVktGh?o=01M2GZQJA3BAXXJXCV88J5WCDG&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: 'vpaEyZb', title: 'Tailored Mini Skirt', brand: 'Edikted', image: 'https://cdn.trychannel3.com/250496cb-52a1-40ae-bab7-46b5316326f2?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=hu0i', merchant: 'edikted.com', price: 10, currency: 'USD', url: 'https://buy.trychannel3.com/vpaEyZb-hu0i-KVktGh?o=01KRZE760Q8N57WTMZ1MAN56JD&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: '0cODOam', title: 'Pointelle Knit Mini Skirt', brand: 'self-portrait', image: 'https://cdn.trychannel3.com/cleaned/v1/3c211512-4ef3-4d3b-b045-ebf297049782?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=U9h1', merchant: 'us.self-portrait.com', price: 410, currency: 'USD', url: 'https://buy.trychannel3.com/0cODOam-U9h1-KVktGh?o=01M34QCBYHSAWNGWW08WPJDETV&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: 'SIw8Crl', title: 'Belle Mini Skirt', brand: 'By Dyln', image: 'https://cdn.trychannel3.com/cleaned/v1/76d6b6c6-8202-485e-98de-e6f123964c33?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=wxBk', merchant: 'bydyln.com', price: 32, currency: 'USD', url: 'https://buy.trychannel3.com/SIw8Crl-wxBk-KVktGh?o=01M25XSZQA07RXRTFVZ0BPPVRA&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: 'YBtdaxv', title: 'Drape Mini Skirt', brand: "Marshall's", image: 'https://cdn.trychannel3.com/60b0b120-c645-4bde-adcc-8da72fde61ce?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=jRDL', merchant: 'marshalls.com', price: 19.99, currency: 'USD', url: 'https://buy.trychannel3.com/YBtdaxv-jRDL-KVktGh?o=01M1649BN2VX5GJXEKEGA1TFMD&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
  { id: '5VX0ecL', title: 'Black Pleated Mini Skirt with Pocket', brand: 'Roberto Cavalli', image: 'https://cdn.trychannel3.com/ee98be44-cd38-47da-8f80-939cd1477624?aid=01M76W1WG8HC0MZA6DTXEWRGJ2&mid=l71u', merchant: 'robertocavalli.com', price: 310, currency: 'USD', url: 'https://buy.trychannel3.com/5VX0ecL-l71u-KVktGh?o=01KJ7QTP0MZ9E6SFRCN9T3Y7Z9&aid=01M76W1WG8HC0MZA6DTXEWRGJ2' },
];

const dimensions: { key: Dimension; label: string }[] = [
  { key: 'materials', label: 'Materials' }, { key: 'quality', label: 'Quality' },
  { key: 'price', label: 'Price' }, { key: 'longevity', label: 'Longevity' },
];
const presets: { name: string; values: [Level, Level, Level, Level]; note: string }[] = [
  { name: 'Materials First', values: ['High', 'Medium', 'Low', 'Medium'], note: 'Materials lead the decision' },
  { name: 'Keep It Forever', values: ['Medium', 'High', 'Low', 'High'], note: 'Built for the long haul' },
  { name: 'Price Conscious', values: ['Low', 'Medium', 'High', 'Low'], note: 'Let price carry more weight' },
];
const emptyPreferences: Preferences = { materials: '', quality: '', price: '', longevity: '' };
const weight = (value: Level) => value === 'High' ? 3 : value === 'Medium' ? 2 : 1;

function signal(id: string, key: Exclude<Dimension, 'price'>) {
  let hash = 2166136261;
  for (const char of `${id}:${key}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 101;
}

function rankItems(preferences: Preferences): Scored[] {
  const min = Math.min(...products.map((p) => p.price));
  const max = Math.max(...products.map((p) => p.price));
  return products.map((product, originalIndex) => {
    const parts: Record<Dimension, number | null> = {
      materials: signal(product.id, 'materials'),
      quality: signal(product.id, 'quality'),
      price: max === min ? 100 : Math.round(((max - product.price) / (max - min)) * 100),
      longevity: signal(product.id, 'longevity'),
    };
    const weighted = dimensions.reduce((sum, item) => sum + (parts[item.key] ?? 0) * weight(preferences[item.key]), 0);
    const totalWeight = dimensions.reduce((sum, item) => sum + weight(preferences[item.key]), 0);
    return { product, parts, originalIndex, score: weighted / totalWeight };
  }).sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}

function money(product: Product) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency, maximumFractionDigits: 2 }).format(product.price);
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  return <a className={`rv-image${large ? ' rv-image-large' : ''}`} href={product.url} target="_blank" rel="noreferrer" aria-label={`Shop ${product.title} at ${product.merchant}`}>
    <img src={product.image} alt={`${product.brand} — ${product.title}`} loading={large ? 'eager' : 'lazy'} />
    <span className="rv-image-arrow"><ArrowUpRight size={15} /></span>
  </a>;
}

function Details({ product }: { product: Product }) {
  return <div className="rv-product-details">
    <span className="rv-brand">{product.brand}</span>
    <span className="rv-title">{product.title}</span>
    <div className="rv-price-line"><strong>{money(product)}</strong><a href={product.url} target="_blank" rel="noreferrer">{product.merchant}<ArrowUpRight size={12} /></a></div>
  </div>;
}

export function RaeteV0() {
  const queryState = new URLSearchParams(window.location.search).get('state');
  const initialState = queryState === 'unranked' || queryState === 'ranked' ? queryState : 'initial';
  const [state, setState] = useState<'initial' | 'unranked' | 'ranked'>(initialState);
  const [query, setQuery] = useState(initialState === 'initial' ? '' : 'black mini skirt');
  const [preferences, setPreferences] = useState<Preferences>(initialState === 'ranked' ? {
    materials: 'High', quality: 'Medium', price: 'Low', longevity: 'Medium',
  } : emptyPreferences);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(initialState === 'ranked' ? 'Materials First' : '');
  const ranked = useMemo(() => state === 'ranked' ? rankItems(preferences) : [], [state, preferences]);
  const closeCall = ranked.length > 1 && ranked[0].score - ranked[1].score < 5;
  const closeTradeoff = useMemo(() => {
    if (ranked.length < 2) return '';
    const [first, second] = ranked;
    const separating = [...dimensions].sort((a, b) =>
      Math.abs(((first.parts[b.key] ?? 0) - (second.parts[b.key] ?? 0)) * weight(preferences[b.key])) -
      Math.abs(((first.parts[a.key] ?? 0) - (second.parts[a.key] ?? 0)) * weight(preferences[a.key])),
    )[0];
    if (!separating) return 'Their fit is nearly even across your selected priorities.';
    const firstValue = first.parts[separating.key] ?? 0;
    const secondValue = second.parts[separating.key] ?? 0;
    const lead = firstValue >= secondValue ? first.product.title : second.product.title;
    const other = firstValue >= secondValue ? second.product.title : first.product.title;
    const advantage = separating.key === 'price'
      ? 'has the lower listed price'
      : `has a stronger ${separating.label.toLowerCase()} prototype signal`;
    return `${lead} ${advantage}; ${other} stays close across your other priorities.`;
  }, [ranked, preferences]);

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) setQuery('black mini skirt');
    setState('unranked');
    setPreferences(emptyPreferences);
    setSelectedPreset('');
    setShowAll(false);
  }

  function choosePreset(preset: typeof presets[number]) {
    const next = Object.fromEntries(dimensions.map((dimension, index) => [dimension.key, preset.values[index]])) as Preferences;
    setPreferences(next);
    setSelectedPreset(preset.name);
    setState('ranked');
    setShowAll(false);
  }

  function setPreference(key: Dimension, value: Level) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSelectedPreset('');
    if (dimensions.every((dimension) => next[dimension.key])) {
      setState('ranked');
      setShowAll(false);
    } else setState('unranked');
  }

  function explanation(item: Scored) {
    const bestDimension = [...dimensions]
      .sort((a, b) => (item.parts[b.key] ?? 0) * weight(preferences[b.key]) - (item.parts[a.key] ?? 0) * weight(preferences[a.key]))[0];
    if (!bestDimension) return 'Its strongest match is the priority you chose to emphasize.';
    if (bestDimension.key === 'price') return 'Its listed Channel3 price contributes most to this order.';
    return `Its ${bestDimension.label.toLowerCase()} signal carries the most weight in this order.`;
  }

  function tradeoffExplanation(first: Scored, second: Scored) {
    const firstAdvantages: string[] = [];
    const secondAdvantages: string[] = [];
    dimensions.forEach(({ key, label }) => {
      const a = first.parts[key] ?? 0;
      const b = second.parts[key] ?? 0;
      if (a === b) return;
      const winner = key === 'price' ? (a > b ? first : second) : (a > b ? first : second);
      const phrase = key === 'price' ? 'lower listed price' : `${label} demo signal`;
      (winner === first ? firstAdvantages : secondAdvantages).push(phrase);
    });
    const join = (list: string[]) => list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
    if (firstAdvantages.length && secondAdvantages.length) return `It leads on the weighted mix: stronger ${join(firstAdvantages)}; #2 is stronger on ${join(secondAdvantages)}.`;
    if (firstAdvantages.length) return `It leads on the weighted mix, with stronger ${join(firstAdvantages)}.`;
    return 'It edges ahead on the combination of priorities you selected.';
  }

  return <main className="raete-v0">
    <header className="rv-header">
      <a className="rv-wordmark" href="#" onClick={(event) => { event.preventDefault(); setState('initial'); }} aria-label="RAETE home"><span className="rv-mark"><i /></span>raete</a>
      <button className="rv-prototype" type="button" aria-expanded={disclosureOpen} onClick={() => setDisclosureOpen(!disclosureOpen)}>
        <span className="rv-prototype-dot" /> Prototype data <ChevronDown size={14} />
      </button>
      {disclosureOpen && <aside className="rv-disclosure">
        <strong>About this preview</strong>
        <p>Channel3 supplies product facts, retailer details, and live listed prices.</p>
        <p>Materials, Quality, and Longevity use synthetic demo signals — not real owner data. Community reputation is not live.</p>
      </aside>}
    </header>

    <section className={`rv-search-intro${state !== 'initial' ? ' rv-search-compact' : ''}`}>
      <div className="rv-search-copy">
        <h1>{state === 'initial' ? 'Find the piece that fits you.' : 'A better way to find your piece.'}</h1>
        <p>{state === 'initial' ? 'Search real products, then decide by what matters to you.' : 'Search across retailers, then make the order your own.'}</p>
      </div>
      <form className="rv-search-form" onSubmit={submitSearch}>
        <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} aria-label="Search products" placeholder="Try “black mini skirt”" />
        <button type="submit">Search <ArrowUpRight size={16} /></button>
      </form>
      {state === 'initial' && <button className="rv-example" type="button" onClick={() => { setQuery('black mini skirt'); submitSearch(); }}>
        <span>Try this search</span><strong>Try black mini skirt</strong><ArrowUpRight size={14} />
      </button>}
    </section>

    {state !== 'initial' && <section className="rv-results">
      <div className="rv-results-heading">
        <div><span className="rv-kicker">YOUR SEARCH</span><h2>{query || 'black mini skirt'}</h2></div>
        <span className="rv-result-count">8 products</span>
      </div>

      <section className="rv-preferences" aria-label="Preset priorities and ranking preferences">
        <div className="rv-preferences-top">
          <div><span className="rv-kicker">MAKE THE ORDER YOURS</span><h3>What matters most?</h3></div>
          <div className="rv-state-note"><SlidersHorizontal size={14} />{state === 'ranked' ? 'Personalized for you' : 'Results are not ranked yet'}</div>
        </div>
        <div className="rv-presets">
          <span className="rv-preset-label">Preset priorities</span>
          {presets.map((preset) => <button key={preset.name} type="button" className={`rv-preset${selectedPreset === preset.name ? ' selected' : ''}`} onClick={() => choosePreset(preset)}>
            <strong>{preset.name}</strong><span>{preset.note}</span>
          </button>)}
        </div>
        <div className="rv-selects">
          {dimensions.map(({ key, label }) => <label key={key} className="rv-select">
            <span>{label}{key !== 'price' && <small>Prototype</small>}</span>
            <select value={preferences[key]} onChange={(event) => setPreference(key, event.currentTarget.value as Level)} aria-label={`${label} priority`}>
              <option value="">Choose</option><option>Low</option><option>Medium</option><option>High</option>
            </select>
          </label>)}
        </div>
        <p className="rv-priority-foot">Choose all four priorities or a preset to personalize the order. Higher importance carries more weight.</p>
      </section>

      {state === 'ranked' ? <section className="rv-ranked" aria-label="Personalized results">
        {closeCall ? <div className="rv-close-call">
          <span className="rv-kicker">A CLOSE CALL</span><h3>No clear winner for your priorities</h3>
          <p>{ranked[0].product.title} and {ranked[1].product.title} are nearly even. {closeTradeoff}</p>
        </div> : <div className="rv-ranked-label"><span className="rv-kicker">YOUR PERSONALIZED ORDER</span><span>Made from your priorities</span></div>}
        {closeCall ? <div className="rv-close-pair">
          {ranked.slice(0, 2).map((item, index) => <article className="rv-close-item" key={item.product.id}>
            <ProductImage product={item.product} /><div className="rv-rank-label">#{index + 1} for your priorities</div><Details product={item.product} />
            <p className="rv-why-copy">{explanation(item)}</p>
            <button className="rv-see-why" type="button" onClick={() => setExpanded((current) => current.includes(item.product.id) ? current.filter((id) => id !== item.product.id) : [...current, item.product.id])}>See why <ChevronDown size={14} /></button>
            {expanded.includes(item.product.id) && <Breakdown item={item} preferences={preferences} />}
          </article>)}
        </div> : <>
          <article className="rv-featured">
            <ProductImage product={ranked[0].product} large />
            <div className="rv-feature-copy">
              <span className="rv-rank-label">#1 for your priorities</span>
              <Details product={ranked[0].product} />
              <div className="rv-feature-why"><span>Why it’s #1 for you</span><p>{explanation(ranked[0])}</p></div>
              <div className="rv-feature-trade"><span>Ahead of #2 because…</span><p>{tradeoffExplanation(ranked[0], ranked[1])}</p></div>
          <WhyButton expanded={expanded.includes(ranked[0].product.id)} onClick={() => setExpanded((current) => current.includes(ranked[0].product.id) ? current.filter((id) => id !== ranked[0].product.id) : [...current, ranked[0].product.id])} />
              {expanded.includes(ranked[0].product.id) && <Breakdown item={ranked[0]} preferences={preferences} />}
            </div>
          </article>
          <div className="rv-alternatives">
            {ranked.slice(1, showAll ? 8 : 4).map((item, index) => <article className="rv-alternative" key={item.product.id}>
              <ProductImage product={item.product} /><div className="rv-alternative-content">
                <span className="rv-rank-label">#{index + 2}</span><Details product={item.product} />
                <WhyButton expanded={expanded.includes(item.product.id)} onClick={() => setExpanded((current) => current.includes(item.product.id) ? current.filter((id) => id !== item.product.id) : [...current, item.product.id])} />
                {expanded.includes(item.product.id) && <Breakdown item={item} preferences={preferences} />}
              </div>
            </article>)}
          </div>
          {!showAll && <button className="rv-show-more" type="button" onClick={() => setShowAll(true)}>Show more <ChevronDown size={15} /><span>4 more pieces</span></button>}
        </>}
        {closeCall && <>
          <div className="rv-alternatives">
            {ranked.slice(2, showAll ? 8 : 4).map((item, index) => <article className="rv-alternative" key={item.product.id}>
              <ProductImage product={item.product} /><div className="rv-alternative-content">
                <span className="rv-rank-label">#{index + 3}</span><Details product={item.product} />
                <WhyButton expanded={expanded.includes(item.product.id)} onClick={() => setExpanded((current) => current.includes(item.product.id) ? current.filter((id) => id !== item.product.id) : [...current, item.product.id])} />
                {expanded.includes(item.product.id) && <Breakdown item={item} preferences={preferences} />}
              </div>
            </article>)}
          </div>
          {!showAll && <button className="rv-show-more" type="button" onClick={() => setShowAll(true)}>Show more <ChevronDown size={15} /><span>4 more pieces</span></button>}
        </>}
      </section> : <section className="rv-unranked" aria-label="Unranked product results">
        <div className="rv-unranked-heading"><span>PRODUCTS FOUND</span><p>These results are not ranked yet.</p></div>
        <div className="rv-product-grid">
          {products.map((product) => <article className="rv-product-card" key={product.id}><ProductImage product={product} /><Details product={product} /></article>)}
        </div>
      </section>}
    </section>}
    <footer className="rv-footer"><span>RAETE <i>/</i> A WINDOW INTO WHAT’S AVAILABLE</span><span>PRODUCTS, ONE SEARCH AWAY</span></footer>
  </main>;
}

function WhyButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return <button className="rv-see-why" type="button" aria-expanded={expanded} onClick={onClick}>{expanded ? 'Hide why' : 'See why'} {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>;
}

function Breakdown({ item, preferences }: { item: Scored; preferences: Preferences }) {
  return <div className="rv-breakdown">
    <strong>Priority breakdown</strong>
    {dimensions.map(({ key, label }) => <div className="rv-breakdown-row" key={key}>
      <span>{label}{key !== 'price' && <small>Prototype</small>}</span>
      <span>{preferences[key]} priority · {key === 'price' ? 'Channel3 offer price' : (item.parts[key] ?? 0) >= 67 ? 'Stronger demo signal' : (item.parts[key] ?? 0) >= 34 ? 'Mid-range demo signal' : 'Lighter demo signal'}</span>
    </div>)}
    <p>Materials, Quality, and Longevity are deterministic prototype signals based on product IDs. Price uses same-currency Channel3 offer prices normalized across these results; a lower price helps in proportion to its importance.</p>
  </div>;
}
