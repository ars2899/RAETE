import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getSearchChannel3ProductsQueryKey,
  useGenerateRaeteExplanation,
  useSearchChannel3Products,
} from '@workspace/api-client-react';
import type { Channel3Offer, Channel3Product } from '@workspace/api-client-react';

type PriorityKey = 'materials' | 'quality' | 'price' | 'longevity';
type PriorityLevel = '' | 'high' | 'medium' | 'low';
type SelectedPriority = Exclude<PriorityLevel, ''>;
type Priorities = Record<PriorityKey, PriorityLevel>;
type SelectedPriorities = Record<PriorityKey, SelectedPriority>;
type DimensionSource = 'prototype' | 'channel3';

type Dimension = {
  key: PriorityKey;
  label: string;
  score: number | null;
  level: SelectedPriority;
  weight: number;
  source: DimensionSource;
};
type RankedProduct = {
  product: Channel3Product;
  dimensions: Dimension[];
  score: number;
  originalIndex: number;
};
type PaypalV6Session = {
  start: (options: { presentationMode: 'auto' }, order: Promise<{ orderId: string }>) => Promise<void>;
};
type PaypalV6Instance = {
  findEligibleMethods: () => Promise<{ isEligible: (method: string) => boolean }>;
  createPayPalOneTimePaymentSession: (handlers: {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }) => Promise<PaypalV6Session>;
};
declare global {
  interface Window {
    paypal?: { createInstance: (options: { clientId: string; components: string[] }) => Promise<PaypalV6Instance> };
  }
}

const priorityOptions: { key: PriorityKey; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'quality', label: 'Quality' },
  { key: 'price', label: 'Price' },
  { key: 'longevity', label: 'Longevity' },
];
const weightByLevel: Record<SelectedPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const presets: {
  id: string;
  name: string;
  description: string;
  priorities: SelectedPriorities;
}[] = [
  {
    id: 'materials-first',
    name: 'Materials First',
    description: "What it's made of comes first.",
    priorities: { materials: 'high', quality: 'medium', price: 'low', longevity: 'medium' },
  },
  {
    id: 'keep-forever',
    name: 'Keep It Forever',
    description: 'Quality and longevity come first.',
    priorities: { materials: 'medium', quality: 'high', price: 'low', longevity: 'high' },
  },
  {
    id: 'price-conscious',
    name: 'Price Conscious',
    description: 'Price comes first.',
    priorities: { materials: 'low', quality: 'medium', price: 'high', longevity: 'low' },
  },
];

function getImage(product: Channel3Product) {
  return product.images?.find((image) => image.is_main_image) ?? product.images?.[0];
}

function getOffer(product: Channel3Product): Channel3Offer | undefined {
  return product.offers?.find((offer) => {
    const amount = offer.price?.price ?? offer.price?.amount;
    return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 && !!offer.price?.currency;
  }) ?? product.offers?.[0];
}

function getOfferAmount(offer?: Channel3Offer) {
  const amount = offer?.price?.price ?? offer?.price?.amount;
  return typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function formatPrice(offer?: Channel3Offer) {
  const amount = getOfferAmount(offer);
  const currency = offer?.price?.currency;
  if (amount === undefined || !currency) return undefined;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function isPayPalAmountSafe(offer?: Channel3Offer) {
  const amount = getOfferAmount(offer);
  const currency = offer?.price?.currency?.toUpperCase();
  const supported = ['AUD','BRL','CAD','CNY','CZK','DKK','EUR','GBP','HKD','HUF','ILS','JPY','MXN','MYR','NOK','NZD','PHP','PLN','RUB','SEK','SGD','THB','TWD','USD','CHF'];
  if (amount === undefined || amount <= 0 || !currency || !supported.includes(currency)) return false;
  if (currency === 'JPY' || currency === 'HUF') return Number.isInteger(amount);
  return Math.round(amount * 100) === amount * 100;
}

export function hasAllPriorities(priorities: Priorities): priorities is SelectedPriorities {
  return priorityOptions.every(({ key }) => priorities[key] !== '');
}

function getPrototypeScore(productId: string, dimension: Exclude<PriorityKey, 'price'>) {
  let hash = 2166136261;
  for (const character of `${productId}:${dimension}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 101;
}

export function getPriceScores(products: Channel3Product[]) {
  const priceFacts = products.map((product) => {
    const offer = getOffer(product);
    const amount = getOfferAmount(offer);
    const currency = offer?.price?.currency;
    return amount !== undefined && currency ? { amount, currency } : null;
  });

  if (priceFacts.length === 0 || priceFacts.some((fact) => fact === null)) {
    return { available: false, scores: new Map<string, number>() };
  }

  const comparablePrices = priceFacts.filter(
    (fact): fact is NonNullable<typeof fact> => fact !== null,
  );
  if (new Set(comparablePrices.map((fact) => fact.currency)).size !== 1) {
    return { available: false, scores: new Map<string, number>() };
  }

  const amounts = comparablePrices.map((fact) => fact.amount);
  const lowest = Math.min(...amounts);
  const highest = Math.max(...amounts);
  const scores = new Map(
    products.map((product, index) => [
      product.id,
      highest === lowest
        ? 100
        : Math.round(((highest - comparablePrices[index].amount) / (highest - lowest)) * 100),
    ]),
  );
  return { available: true, scores };
}

export function rankProducts(
  products: Channel3Product[],
  priorities: SelectedPriorities,
): RankedProduct[] {
  const prices = getPriceScores(products);
  return products
    .map((product, originalIndex) => {
      const dimensions: Dimension[] = [
        {
          key: 'materials',
          label: 'Materials',
          score: getPrototypeScore(product.id, 'materials'),
          level: priorities.materials,
          weight: weightByLevel[priorities.materials],
          source: 'prototype',
        },
        {
          key: 'quality',
          label: 'Quality',
          score: getPrototypeScore(product.id, 'quality'),
          level: priorities.quality,
          weight: weightByLevel[priorities.quality],
          source: 'prototype',
        },
        {
          key: 'price',
          label: 'Price',
          score: prices.scores.get(product.id) ?? null,
          level: priorities.price,
          weight: weightByLevel[priorities.price],
          source: 'channel3',
        },
        {
          key: 'longevity',
          label: 'Longevity',
          score: getPrototypeScore(product.id, 'longevity'),
          level: priorities.longevity,
          weight: weightByLevel[priorities.longevity],
          source: 'prototype',
        },
      ];
      const available = dimensions.filter(
        (dimension): dimension is Dimension & { score: number } => dimension.score !== null,
      );
      const totalWeight = available.reduce((sum, dimension) => sum + dimension.weight, 0);
      const weightedScore = available.reduce(
        (sum, dimension) => sum + dimension.score * dimension.weight,
        0,
      );
      return {
        product,
        dimensions,
        originalIndex,
        score: Math.round(weightedScore / totalWeight),
      };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
}

function getLeadingDimension(top: RankedProduct, second?: RankedProduct) {
  if (!second) return undefined;
  const priorityRank: Record<SelectedPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  return top.dimensions
    .map((dimension) => {
      const other = second.dimensions.find((item) => item.key === dimension.key);
      return {
        ...dimension,
        delta: other && dimension.score !== null && other.score !== null
          ? dimension.score - other.score
          : 0,
        weightedDelta: other && dimension.score !== null && other.score !== null
          ? (dimension.score - other.score) * dimension.weight
          : 0,
      };
    })
    .filter((dimension) => dimension.delta > 0)
    .sort(
      (a, b) =>
        priorityRank[b.level] - priorityRank[a.level] ||
        b.weightedDelta - a.weightedDelta ||
        b.delta - a.delta,
    )[0];
}

export function getTradeoffText(top: RankedProduct, second: RankedProduct) {
  const topLead = getLeadingDimension(top, second);
  const secondLead = getLeadingDimension(second, top);
  if (topLead && secondLead) {
    return `${top.product.title} leads on ${topLead.label}${topLead.source === 'prototype' ? ' (Prototype)' : ''}; ${second.product.title} leads on ${secondLead.label}${secondLead.source === 'prototype' ? ' (Prototype)' : ''}.`;
  }
  if (topLead) {
    return `${top.product.title} has a small edge on ${topLead.label}${topLead.source === 'prototype' ? ' (Prototype)' : ''}, while the rest of the selected priorities are close.`;
  }
  if (secondLead) {
    return `${second.product.title} has a small edge on ${secondLead.label}${secondLead.source === 'prototype' ? ' (Prototype)' : ''}; the overall fit remains close.`;
  }
  return 'The two options balance your selected priorities almost evenly.';
}

function getWinnerReason(top: RankedProduct, second?: RankedProduct) {
  const lead = second ? getLeadingDimension(top, second) : undefined;
  if (!lead) return 'This is the strongest match across your selected priorities.';
  return `It leads #2 on ${lead.label}${lead.source === 'prototype' ? ' (Prototype)' : ''}, which you set to ${lead.level}.`;
}

function ProductImage({
  product,
  className = '',
}: {
  product: Channel3Product;
  className?: string;
}) {
  const image = getImage(product);
  const imageUrl = image?.cleaned_url || image?.url;
  return (
    <div className={`decision-image ${className}`}>
      {imageUrl ? <img src={imageUrl} alt={image?.alt_text || product.title} loading="lazy" /> : (
        <span className="decision-image-empty" aria-label="No product image"><Sparkles size={20} /></span>
      )}
    </div>
  );
}

function MerchantLink({ offer }: { offer?: Channel3Offer }) {
  if (!offer?.url) return <span className="decision-merchant">Merchant unavailable</span>;
  return (
    <a className="decision-merchant" href={offer.url} target="_blank" rel="noreferrer">
      {offer.domain || 'View listing'} <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}

function LiveProductFacts({ product }: { product: Channel3Product }) {
  const offer = getOffer(product);
  const brand = product.brands?.find((item) => item.name)?.name;
  const price = formatPrice(offer);
  return (
    <div className="live-facts">
      <span className="live-facts-label"><span /> Live listing</span>
      {brand && <p className="live-brand">{brand}</p>}
      <h3>{product.title}</h3>
      <div className="live-fact-row">
        {price && <strong className="live-price">{price}</strong>}
        <MerchantLink offer={offer} />
      </div>
      {(offer?.condition || offer?.availability) && (
        <div className="listing-details">
          {offer.condition && <span>{offer.condition}</span>}
          {offer.availability && <span>{offer.availability}</span>}
        </div>
      )}
    </div>
  );
}

function ScoreBreakdown({ ranked }: { ranked: RankedProduct }) {
  return (
    <div className="why-breakdown" data-testid="panel-score-breakdown">
      <div className="breakdown-heading">
        <span>Dimension breakdown</span>
        <span>0–100 dimension scores</span>
      </div>
      {ranked.dimensions.map((dimension) => (
        <div className="dimension-row" key={dimension.key}>
          <div className="dimension-copy">
            <span>{dimension.label}</span>
            {dimension.source === 'prototype' && <span className="prototype-tag">Prototype</span>}
            {dimension.source === 'channel3' && <span className="provenance-tag">Channel3 offer</span>}
          </div>
          <div className="dimension-track" aria-label={dimension.score === null ? 'Not included in ranking' : `${dimension.score} out of 100`}>
            {dimension.score !== null && <span style={{ width: `${dimension.score}%` }} />}
          </div>
          <strong className="dimension-value">{dimension.score === null ? '—' : dimension.score}</strong>
          <span className="dimension-weight">{dimension.level} · ×{dimension.weight}</span>
        </div>
      ))}
      <p className="breakdown-note">
        The overall score is used only to order products and is never shown. Prototype dimensions are synthetic demo signals, not owner evidence.
      </p>
    </div>
  );
}

function Alternative({
  ranked,
  rank,
}: {
  ranked: RankedProduct;
  rank: number;
}) {
  const offer = getOffer(ranked.product);
  const price = formatPrice(offer);
  return (
    <article className="alternative-row" data-testid={`card-ranked-product-${ranked.product.id}`}>
      <span className="alternative-rank" aria-label={`#${rank} for you`}>#{rank}</span>
      <ProductImage product={ranked.product} className="alternative-image" />
      <div className="alternative-copy">
        <span className="alternative-brand">{ranked.product.brands?.find((item) => item.name)?.name || offer?.domain || 'Retail listing'}</span>
        <h3>{ranked.product.title}</h3>
        <MerchantLink offer={offer} />
      </div>
      <div className="alternative-aside">
        {price && <strong>{price}</strong>}
        <span>Live listing</span>
      </div>
    </article>
  );
}

function ProductCard({ product, index }: { product: Channel3Product; index: number }) {
  const offer = getOffer(product);
  const price = formatPrice(offer);
  return (
    <article className="unranked-card" data-testid={`card-unranked-product-${product.id}`} style={{ animationDelay: `${index * 45}ms` }}>
      <ProductImage product={product} />
      <div className="unranked-copy">
        <span>{product.brands?.find((item) => item.name)?.name || offer?.domain || 'Retail listing'}</span>
        <h3>{product.title}</h3>
        <div>{price && <strong>{price}</strong>}<MerchantLink offer={offer} /></div>
      </div>
    </article>
  );
}

function PriorityPanel({
  priorities,
  activePreset,
  rankingActive,
  priceAvailable,
  onChange,
  onChoosePreset,
}: {
  priorities: Priorities;
  activePreset: string | null;
  rankingActive: boolean;
  priceAvailable: boolean;
  onChange: (key: PriorityKey, value: PriorityLevel) => void;
  onChoosePreset: (preset: typeof presets[number]) => void;
}) {
  return (
    <section className="priority-panel" aria-label="Ranking priorities" data-testid="panel-priorities">
      <div className="priority-topline">
        <div>
          <h2>What matters for this choice?</h2>
        </div>
        <span className={`ranking-state ${rankingActive ? 'is-ready' : ''}`} data-testid="status-ranking">
          {rankingActive && <><span />Ranked by your priorities</>}
        </span>
      </div>
      <p className="eyebrow">Preset priorities</p>
      <div className="preset-list" aria-label="Priority presets">
        {presets.map((preset) => (
          <button
            className={`preset-button ${activePreset === preset.id ? 'is-selected' : ''}`}
            key={preset.id}
            type="button"
            onClick={() => onChoosePreset(preset)}
            aria-pressed={activePreset === preset.id}
            data-testid={`button-preset-${preset.id}`}
          >
            <span className="preset-name">{preset.name}{activePreset === preset.id && <Check size={13} aria-hidden="true" />}</span>
            <span className="preset-description">{preset.description}</span>
          </button>
        ))}
      </div>
      <div className="priority-fields">
        {priorityOptions.map(({ key, label }, index) => (
          <label className="priority-field" htmlFor={`priority-${key}`} key={key}>
            <span className="priority-number">0{index + 1}</span>
            <span className="priority-label">
              <span>{label}</span>
              {key === 'price'
                ? <span className="priority-source-label">Channel3</span>
                : <span className="priority-source-label is-prototype">Prototype</span>}
              {key === 'price' && !priceAvailable && <small>Not comparable</small>}
            </span>
            <select
              id={`priority-${key}`}
              value={priorities[key]}
              onChange={(event) => onChange(key, event.currentTarget.value as PriorityLevel)}
              data-testid={`select-priority-${key}`}
            >
              <option value="" disabled>Choose</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        ))}
      </div>
      <div className="method-note">
        <Info size={15} aria-hidden="true" />
        <p>
          Set all four, or start from a preset.
          {!priceAvailable && ' Price is not included because the available prices are not comparable.'}
        </p>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return <div className="decision-skeleton" aria-hidden="true"><div /><i /><i /><i /></div>;
}
export default function ProductSearch() {
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [priorities, setPriorities] = useState<Priorities>({
    materials: '',
    quality: '',
    price: '',
    longevity: '',
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [expandedWhy, setExpandedWhy] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [prototypeOpen, setPrototypeOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [aiExplanation, setAiExplanation] = useState('');
  const [paypalStatus, setPaypalStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'complete' | 'cancelled' | 'error'>('idle');
  const paypalMountRef = useRef<HTMLDivElement>(null);
  const aiRequestId = useRef(0);
  const explanationMutation = useGenerateRaeteExplanation();
  const generateExplanationRef = useRef(explanationMutation.mutateAsync);
  generateExplanationRef.current = explanationMutation.mutateAsync;
  const query = useSearchChannel3Products(
    { query: submittedQuery || ' ' },
    {
      query: {
        queryKey: getSearchChannel3ProductsQueryKey({ query: submittedQuery || ' ' }),
        enabled: submittedQuery.length > 0,
        retry: false,
      },
    },
  );

  const products = useMemo(() => query.data?.products?.slice(0, 8) ?? [], [query.data?.products]);
  const rankingActive = hasAllPriorities(priorities);
  const prices = useMemo(() => getPriceScores(products), [products]);
  const rankedProducts = useMemo(
    () => rankingActive ? rankProducts(products, priorities as SelectedPriorities) : [],
    [products, priorities, rankingActive],
  );
  const top = rankedProducts[0];
  const second = rankedProducts[1];
  const closeCall = !!top && !!second && top.score - second.score < 5;
  const explanationInput = useMemo(() => {
    if (!top) return null;
    const offer = getOffer(top.product);
    return {
      productName: top.product.title,
      brand: top.product.brands?.find((item) => item.name)?.name ?? null,
      productFacts: {
        price: formatPrice(offer) ?? null,
        merchant: offer?.domain ?? null,
        condition: offer?.condition ?? null,
        availability: offer?.availability ?? null,
      },
      priorities: priorities as SelectedPriorities,
      dimensions: top.dimensions.map((dimension) => ({
        name: dimension.label as 'Materials' | 'Quality' | 'Price' | 'Longevity',
        priority: dimension.level,
        score: dimension.score,
        weight: dimension.weight,
        provenance: dimension.source,
      })),
      aheadOfSecond: second ? getTradeoffText(top, second) : null,
    };
  }, [top, second, priorities]);

  useEffect(() => {
    const requestId = ++aiRequestId.current;
    if (!rankingActive || !explanationInput) {
      setAiStatus('idle');
      setAiExplanation('');
      return;
    }

    setAiStatus('loading');
    setAiExplanation('');
    void generateExplanationRef.current({ data: explanationInput }).then(
      (result) => {
        if (aiRequestId.current !== requestId) return;
        setAiExplanation(result.explanation);
        setAiStatus('ready');
      },
      () => {
        if (aiRequestId.current !== requestId) return;
        setAiStatus('error');
      },
    );
    return () => {
      aiRequestId.current += 1;
    };
  }, [rankingActive, explanationInput]);

  useEffect(() => {
    const currentProduct = top?.product;
    if (!rankingActive || !currentProduct || !isPayPalAmountSafe(getOffer(currentProduct))) {
      setPaypalStatus('idle');
      paypalMountRef.current?.replaceChildren();
      return;
    }
    let cancelled = false;
    setPaypalStatus('loading');

    async function initializePayPal() {
      try {
        const configResponse = await fetch('/api/paypal/config');
        if (!configResponse.ok) throw new Error('PayPal Sandbox is not configured.');
        const { clientId } = await configResponse.json() as { clientId: string };
        if (!window.paypal) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById('paypal-v6-sdk') as HTMLScriptElement | null;
            const script = existing ?? document.createElement('script');
            script.src = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('PayPal Sandbox SDK could not load.'));
            if (!existing) {
              script.id = 'paypal-v6-sdk';
              document.head.appendChild(script);
            }
          });
        }
        if (cancelled || !window.paypal) return;
        const sdk = await window.paypal.createInstance({ clientId, components: ['paypal-payments'] });
        const eligibility = await sdk.findEligibleMethods();
        if (!eligibility.isEligible('paypal')) throw new Error('PayPal is not eligible in this Sandbox session.');
        const session = await sdk.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }) => {
            const response = await fetch(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST' });
            if (!response.ok) throw new Error('PayPal Sandbox capture failed.');
            const capture = await response.json() as { status: string };
            if (capture.status !== 'COMPLETED') throw new Error('PayPal Sandbox capture was not completed.');
            setPaypalStatus('complete');
          },
          onCancel: () => setPaypalStatus('cancelled'),
          onError: () => setPaypalStatus('error'),
        });
        if (cancelled || !paypalMountRef.current) return;
        const button = document.createElement('paypal-button');
        button.setAttribute('aria-label', 'Pay with PayPal Sandbox');
        button.addEventListener('click', () => {
          setPaypalStatus('processing');
          const order = fetch('/api/paypal/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: submittedQuery, productId: currentProduct.id }),
          }).then(async (response) => {
            if (!response.ok) throw new Error('PayPal Sandbox could not create the order.');
            return await response.json() as { orderId: string };
          });
          void session.start({ presentationMode: 'auto' }, order).catch(() => setPaypalStatus('error'));
        });
        paypalMountRef.current.replaceChildren(button);
        setPaypalStatus('ready');
      } catch {
        if (!cancelled) setPaypalStatus('error');
      }
    }

    void initializePayPal();
    return () => {
      cancelled = true;
      paypalMountRef.current?.replaceChildren();
    };
  }, [rankingActive, top?.product.id, submittedQuery]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = input.trim().slice(0, 200);
    if (next) {
      setSubmittedQuery(next);
      setShowMore(false);
      setExpandedWhy(false);
    }
  }

  function onPriorityChange(key: PriorityKey, value: PriorityLevel) {
    setPriorities((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
  }

  function onChoosePreset(preset: typeof presets[number]) {
    setPriorities(preset.priorities);
    setActivePreset(preset.id);
    setShowMore(false);
    setExpandedWhy(false);
  }
  const shownAlternatives = showMore ? rankedProducts.slice(1) : rankedProducts.slice(1, 3);

  return (
    <main className="decision-page">
      <header className="decision-header">
        <a className="decision-wordmark" href="/" aria-label="Raete home" data-testid="link-home">
          <span className="wordmark-mark" aria-hidden="true"><i /></span>
          <span>raete</span>
        </a>
        <div className="header-context"><span className="header-live-dot" /> Product search <b>/</b> Channel3</div>
      </header>

      <section className="decision-hero">
        {!submittedQuery && (
          <div className="hero-heading">
            <h1>Which one wins for you?</h1>
            <p>Set what matters. See which one comes out ahead, and why.</p>
          </div>
        )}
        <form className="decision-search" onSubmit={onSubmit}>
          <Search size={19} strokeWidth={1.7} aria-hidden="true" />
          <input
            type="search"
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Try “black mini skirt”"
            aria-label="Search products"
            maxLength={200}
            data-testid="input-search"
          />
          <button type="submit" disabled={!input.trim() || query.isFetching} data-testid="button-submit">
            {query.isFetching ? <LoaderCircle size={16} className="search-spinner" /> : <>Search <ArrowUpRight size={15} /></>}
          </button>
        </form>
      </section>

      {!submittedQuery ? (
        <section className="first-search-note" data-testid="status-idle">
          <div className="first-search-rule" />
        </section>
      ) : (
        <section className="decision-results" aria-live="polite">
          <div className="search-results-heading">
            <div><h2>{submittedQuery}</h2></div>
            {query.isSuccess && <span className="result-count" data-testid="text-result-count">{products.length} products from Channel3{!rankingActive && ' · not ranked yet'}</span>}
          </div>

          {query.isSuccess && !query.isFetching && products.length > 0 && (
            <>
              <PriorityPanel
                priorities={priorities}
                activePreset={activePreset}
                rankingActive={rankingActive}
                priceAvailable={prices.available}
                onChange={onPriorityChange}
                onChoosePreset={onChoosePreset}
              />
              {!rankingActive && (
                <div className="unranked-notice" data-testid="status-unranked">
                  <span>Browse first</span>
                  <p>These results stay in Channel3’s original order until you set all four priorities or choose a preset.</p>
                </div>
              )}
            </>
          )}

          {query.isFetching && (
            <div className="unranked-grid" data-testid="status-loading" aria-label="Loading products">
              {Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}
            </div>
          )}

          {query.isError && !query.isFetching && (
            <div className="result-state error-state" data-testid="status-error">
              <span className="state-icon">!</span>
              <div><h3>That search didn’t come through.</h3><p>Give it another try in a moment.</p></div>
              <button type="button" className="retry-search" onClick={() => void query.refetch()} data-testid="button-retry">Try again <ArrowUpRight size={14} /></button>
            </div>
          )}

          {query.isSuccess && !query.isFetching && products.length === 0 && (
            <div className="result-state" data-testid="status-empty">
              <span className="state-icon quiet">—</span>
              <div><h3>No pieces found.</h3><p>Try a different description.</p></div>
            </div>
          )}
          {query.isSuccess && !query.isFetching && products.length > 0 && !rankingActive && (
            <div className="unranked-grid" data-testid="list-unranked-products">
              {products.map((product, index) => <ProductCard product={product} index={index} key={product.id} />)}
            </div>
          )}

          {query.isSuccess && !query.isFetching && rankingActive && top && (
            <div className="ranked-results" data-testid="list-ranked-products">
              <div className={`winner-card ${closeCall ? 'winner-close' : ''}`} data-testid={`card-winner-${top.product.id}`}>
                <div className="winner-photo">
                  <ProductImage product={top.product} />
                  <span className="winner-badge">#1 for you</span>
                  <span className="winner-index">01 / {String(products.length).padStart(2, '0')}</span>
                </div>
                <div className="winner-details">
                  <div className="winner-intro">
                    <span className="eyebrow">Why it's #1 for you</span>
                    <span className="match-mark"><Sparkles size={14} /> {closeCall ? 'Close call' : 'Priority match'}</span>
                  </div>
                  <LiveProductFacts product={top.product} />
                  {closeCall && second ? (
                    <div className="close-call" role="status" data-testid="status-close-call">
                      <strong>No clear winner for your priorities</strong>
                      <p>{getTradeoffText(top, second)}</p>
                    </div>
                  ) : (
                    <div className="winner-reason" data-testid="text-winner-reason">
                      <p>{getWinnerReason(top, second)}</p>
                    </div>
                  )}
                  {second && (
                    <div className="ahead-note" data-testid="text-ahead-comparison">
                      <ArrowDownRight size={16} aria-hidden="true" />
                      <div><span>Ahead of #2 because…</span><p>{closeCall ? getTradeoffText(top, second) : getWinnerReason(top, second)}</p></div>
                    </div>
                  )}
                  <div className="ai-explanation" data-testid="panel-ai-explanation" aria-live="polite">
                    <span>AI explanation</span>
                    <p>{aiStatus === 'ready' ? aiExplanation : aiStatus === 'error' ? 'AI explanation unavailable' : aiStatus === 'loading' ? 'Generating explanation…' : ''}</p>
                  </div>
                  <section className="paypal-checkout" aria-label="PayPal Sandbox demo checkout">
                    <span className="paypal-action-label">Pay with PayPal Sandbox</span>
                    <p>Sandbox · no real payment</p>
                    <p className="paypal-demo-note">Demo transaction only; the Channel3 retailer is not paid.</p>
                    {isPayPalAmountSafe(getOffer(top.product))
                      ? <div className="paypal-button-slot" ref={paypalMountRef} aria-label="Pay with PayPal Sandbox" />
                      : <p className="paypal-message">PayPal Sandbox is unavailable because this product has no safe supported live price and currency.</p>}
                    {paypalStatus === 'loading' && <p className="paypal-message">Loading PayPal Sandbox…</p>}
                    {paypalStatus === 'processing' && <p className="paypal-message">Waiting for Sandbox approval…</p>}
                    {paypalStatus === 'cancelled' && <p className="paypal-message">Sandbox checkout cancelled.</p>}
                    {paypalStatus === 'error' && <p className="paypal-message">PayPal Sandbox checkout could not be completed. The ranking is unchanged.</p>}
                    {paypalStatus === 'complete' && (
                      <div className="paypal-confirmation" role="status" data-testid="paypal-success">
                        <strong>Sandbox checkout complete</strong>
                        <p>No real payment was made.</p>
                      </div>
                    )}
                  </section>
                  <button
                    type="button"
                    className="see-why-button"
                    onClick={() => setExpandedWhy((current) => !current)}
                    aria-expanded={expandedWhy}
                    data-testid="button-see-why"
                  >
                    {expandedWhy ? 'Hide breakdown' : 'See why'}
                    {expandedWhy ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {expandedWhy && <ScoreBreakdown ranked={top} />}
                </div>
              </div>

              {shownAlternatives.length > 0 && (
                <section className="alternatives-section" aria-label="Other close fits">
                  <div className="alternatives-heading">
                    <div><span className="eyebrow">Other options</span><h2>Worth a closer look</h2></div>
                    <span>In Channel3 order when tied</span>
                  </div>
                  <div className="alternatives-list">
                    {shownAlternatives.map((item, index) => <Alternative key={item.product.id} ranked={item} rank={index + 2} />)}
                  </div>
                  {rankedProducts.length > 3 && (
                    <button
                      type="button"
                      className="show-more-button"
                      onClick={() => setShowMore((current) => !current)}
                      aria-expanded={showMore}
                      data-testid="button-show-more"
                    >
                      {showMore ? <>Show fewer <ChevronUp size={15} /></> : <>Show more ({rankedProducts.length - 3}) <ChevronDown size={15} /></>}
                    </button>
                  )}
                </section>
              )}
            </div>
          )}
        </section>
      )}

      <footer className="decision-footer">
        <span>RAETE <b>/</b> A window into what’s available</span>
        <span>Real listings. Clearer choices.</span>
      </footer>

      <div className="decision-prototype-disclosure">
        {prototypeOpen && (
          <section className="prototype-popover" id="prototype-explainer" role="dialog" aria-label="Prototype data details">
            <div className="prototype-popover-heading">
              <div><span className="eyebrow">A note on evidence</span><h2>Prototype data</h2></div>
              <button type="button" aria-label="Close prototype data details" onClick={() => setPrototypeOpen(false)} data-testid="button-close-prototype"><X size={16} /></button>
            </div>
            <div className="evidence-row live-evidence"><span className="evidence-dot" /><p><strong>Live from Channel3</strong>Product titles, images, brand names, retailer links, offer prices, and listing details.</p></div>
            <div className="evidence-row prototype-evidence"><span className="prototype-tag">Prototype</span><p><strong>Demo signals</strong>Materials, Quality, and Longevity are synthetic placeholders, not owner evidence.</p></div>
            <div className="evidence-row"><span className="community-mark">—</span><p><strong>Not available</strong>Community reputation and real owner reports are not live.</p></div>
          </section>
        )}
        <button
          className={`prototype-toggle ${prototypeOpen ? 'is-open' : ''}`}
          type="button"
          onClick={() => setPrototypeOpen((current) => !current)}
          aria-expanded={prototypeOpen}
          aria-controls="prototype-explainer"
          data-testid="button-prototype-data"
        >
          <Info size={16} /> Prototype data {prototypeOpen ? <X size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
    </main>
  );
}
