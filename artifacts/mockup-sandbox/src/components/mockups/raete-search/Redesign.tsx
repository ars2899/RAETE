import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronUp, Info, Search } from 'lucide-react';

type PriorityKey = 'materials' | 'quality' | 'price' | 'longevity';
type PriorityValue = '' | 'Low' | 'Medium' | 'High';
type Priorities = Record<PriorityKey, PriorityValue>;

const dimensions: { key: PriorityKey; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'quality', label: 'Quality' },
  { key: 'price', label: 'Price' },
  { key: 'longevity', label: 'Longevity' },
];

const presets: { name: string; values: Priorities; note: string }[] = [
  { name: 'Materials First', values: { materials: 'High', quality: 'Medium', price: 'Low', longevity: 'Medium' }, note: 'Start with what it’s made of.' },
  { name: 'Keep It Forever', values: { materials: 'Medium', quality: 'High', price: 'Low', longevity: 'High' }, note: 'Put construction and staying power first.' },
  { name: 'Price Conscious', values: { materials: 'Low', quality: 'Medium', price: 'High', longevity: 'Low' }, note: 'Let the asking price lead.' },
];

const products = [
  { id: 1, brand: 'MIRROR PALACE', name: 'Ribbed mini skirt', color: 'Black', price: '$48', retailer: 'Mirror Palace', fit: 'Cotton blend · rib knit', why: 'A cotton-rich rib and clear construction details give this the strongest materials fit for your priorities.', ahead: 'more material detail than #2, with a lower listed price.', tags: ['Cotton-rich blend', 'Rib-knit texture'], swatch: 'rib' },
  { id: 2, brand: 'EDITED', name: 'Cotton twill micro skirt', color: 'Black', price: '$62', retailer: 'Edited', fit: 'Cotton twill · mini', why: 'A clean cotton twill option with a straightforward silhouette.', ahead: 'a more accessible listed price, while keeping a similar cotton-forward feel.', tags: ['Cotton twill', 'Clean finish'], swatch: 'twill' },
  { id: 3, brand: 'STUDIO 189', name: 'Structured wool-blend mini', color: 'Black', price: '$95', retailer: 'Studio 189', fit: 'Wool blend · structured', why: 'A more structured wool blend, with a higher listed price.', ahead: 'a stronger wool-content signal in this illustrative comparison.', tags: ['Wool blend', 'Structured shape'], swatch: 'wool' },
  { id: 4, brand: 'COS', name: 'Tailored A-line mini skirt', color: 'Black', price: '$89', retailer: 'COS', fit: 'Recycled polyester blend', why: 'A tailored A-line cut with a more technical fabric mix.', ahead: 'a lower price than several tailored alternatives.', tags: ['A-line cut', 'Side closure'], swatch: 'tailored' },
  { id: 5, brand: 'ARKET', name: 'Wool mini skirt', color: 'Black', price: '$79', retailer: 'Arket', fit: 'Wool blend · straight', why: 'A simple wool-blend shape.', ahead: 'a competitive listed price for a wool blend.', tags: ['Wool blend', 'Straight cut'], swatch: 'wool' },
  { id: 6, brand: '& OTHER STORIES', name: 'High-waist mini skirt', color: 'Black', price: '$69', retailer: '& Other Stories', fit: 'Viscose blend · high rise', why: 'A high-rise option with a soft drape.', ahead: 'a lower listed price and a simple waist detail.', tags: ['High rise', 'Soft drape'], swatch: 'tailored' },
  { id: 7, brand: 'MANGO', name: 'Buttoned denim mini', color: 'Black', price: '$55', retailer: 'Mango', fit: 'Cotton denim · button front', why: 'A denim construction with visible front detailing.', ahead: 'a notably lower listed price.', tags: ['Cotton denim', 'Button front'], swatch: 'twill' },
  { id: 8, brand: 'STORIES IN COLOR', name: 'The everyday mini', color: 'Black', price: '$42', retailer: 'Stories in Color', fit: 'Polyester blend · pull-on', why: 'A simple pull-on shape at the lowest listed price in this fixture.', ahead: 'the lowest listed price among these examples.', tags: ['Pull-on waist', 'Easy shape'], swatch: 'rib' },
];

const emptyPriorities: Priorities = { materials: '', quality: '', price: '', longevity: '' };

function ProductStill({ variant, compact = false }: { variant: string; compact?: boolean }) {
  return (
    <div className={`rd-still rd-${variant}${compact ? ' rd-compact' : ''}`} aria-hidden="true">
      <span className="rd-still-index">RAETE / OBJECT STUDY</span>
      <svg viewBox="0 0 280 300" role="presentation">
        <defs>
          <linearGradient id={`fabric-${variant}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#343533" />
            <stop offset=".54" stopColor="#181a19" />
            <stop offset="1" stopColor="#090a09" />
          </linearGradient>
          <filter id={`shadow-${variant}`} x="-30%" y="-20%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>
        <ellipse cx="142" cy="254" rx="75" ry="12" fill="#5a5148" opacity=".16" filter={`url(#shadow-${variant})`} />
        <path className="rd-skirt-shape" d={variant === 'twill' ? 'M91 72 Q140 81 188 72 L211 221 Q142 239 69 221 Z' : variant === 'tailored' ? 'M92 73 Q140 81 188 73 L204 223 Q141 235 76 223 Z' : 'M94 70 Q140 81 186 70 L202 220 Q141 234 78 220 Z'} fill={`url(#fabric-${variant})`} />
        <path d="M95 81 Q140 90 185 81" fill="none" stroke="#77736c" strokeOpacity=".5" strokeWidth="1.5" />
        <path d="M107 89 L96 213 M173 89 L184 213" fill="none" stroke="#77736c" strokeOpacity=".24" strokeWidth="1" />
        {variant === 'rib' && <g stroke="#a09a8e" strokeOpacity=".2" strokeWidth="1">{[112,120,128,136,144,152,160,168].map((x) => <path key={x} d={`M${x} 91 L${x - 8} 215`} />)}</g>}
        {variant === 'twill' && <path d="M140 90 L140 217" stroke="#a09a8e" strokeOpacity=".45" strokeWidth="1" />}
        {variant === 'tailored' && <path d="M141 89 L141 218 M140 100 L145 100" stroke="#aaa397" strokeOpacity=".55" strokeWidth="1" />}
        <path d="M89 224 Q140 232 192 224" fill="none" stroke="#b6afa3" strokeOpacity=".25" strokeWidth="1" />
      </svg>
      <span className="rd-still-caption">BLACK / MINI</span>
    </div>
  );
}

function ProductMeta({ product }: { product: (typeof products)[number] }) {
  return (
    <div className="rd-product-meta">
      <div className="rd-brand">{product.brand}</div>
      <h3>{product.name}</h3>
      <p>{product.fit}</p>
      <div className="rd-price-row"><strong>{product.price}</strong><span>{product.retailer} <ArrowUpRight size={12} /></span></div>
    </div>
  );
}

export function Redesign() {
  const [query, setQuery] = useState('black mini skirt');
  const [submittedQuery, setSubmittedQuery] = useState('black mini skirt');
  const [priorities, setPriorities] = useState<Priorities>(emptyPriorities);
  const [activePreset, setActivePreset] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const isRanked = dimensions.every(({ key }) => priorities[key] !== '');
  const topPick = useMemo(() => {
    const preferenceWeights = { High: 3, Medium: 2, Low: 1, '': 0 };
    return products.map((product, index) => {
      const prototypeFit = [76, 65, 73, 59, 62, 57, 54, 50][index];
      const priceFit = [88, 72, 38, 43, 55, 65, 78, 92][index];
      const fit = (prototypeFit * preferenceWeights[priorities.materials] +
        [70, 68, 72, 64, 67, 58, 59, 48][index] * preferenceWeights[priorities.quality] +
        priceFit * preferenceWeights[priorities.price] +
        [65, 59, 71, 58, 70, 54, 57, 45][index] * preferenceWeights[priorities.longevity]);
      return { product, index, fit };
    }).sort((a, b) => b.fit - a.fit);
  }, [priorities]);

  function selectPreset(name: string, values: Priorities) {
    setPriorities(values);
    setActivePreset(name);
    setExpanded(false);
  }

  function changePriority(key: PriorityKey, value: PriorityValue) {
    setPriorities((current) => ({ ...current, [key]: value }));
    setActivePreset('');
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (next) setSubmittedQuery(next);
  }

  const featured = isRanked ? topPick[0].product : null;

  return (
    <main className="raete-redesign">
      <style>{`
        .raete-redesign {
          --rd-paper:#f3f0e8; --rd-card:#f8f6f0; --rd-ink:#242923; --rd-muted:#74766e;
          --rd-line:#d8d3c8; --rd-green:#3c5949; --rd-green-deep:#2d4538; --rd-clay:#b45e42;
          min-height:100dvh; padding:0 clamp(18px,6vw,92px) 40px; color:var(--rd-ink);
          background:radial-gradient(ellipse at 80% 0%,rgba(208,199,178,.24),transparent 38%),var(--rd-paper);
          font-family:Manrope, "Avenir Next", system-ui, sans-serif; box-sizing:border-box;
        }
        .raete-redesign *{box-sizing:border-box}
        .raete-redesign button,.raete-redesign input,.raete-redesign select{font:inherit}
        .rd-topbar{height:70px;border-bottom:1px solid var(--rd-line);display:flex;align-items:center;justify-content:space-between}
        .rd-wordmark{font-weight:800;font-size:22px;letter-spacing:-.085em;text-decoration:none;color:var(--rd-ink);display:flex;align-items:center;gap:9px}
        .rd-mark{width:17px;height:17px;border:1.5px solid var(--rd-green);border-radius:50%;position:relative;display:inline-block}
        .rd-mark:after{content:"";position:absolute;width:5px;height:5px;background:var(--rd-clay);right:-2px;top:0;border-radius:50%}
        .rd-top-note,.rd-eyebrow,.rd-section-kicker,.rd-mini-label,.rd-brand,.rd-still-index,.rd-still-caption,.rd-number,.rd-count,.rd-data-label,.rd-footer{font:9px "DM Mono",ui-monospace,monospace;letter-spacing:.12em}
        .rd-top-note{color:var(--rd-muted);display:flex;align-items:center;gap:9px}
        .rd-live-mark{width:6px;height:6px;border-radius:50%;background:#788a64}
        .rd-intro{max-width:1110px;margin:51px auto 0;display:grid;grid-template-columns:minmax(250px,1fr) minmax(340px,.82fr);gap:32px;align-items:end}
        .rd-eyebrow{color:var(--rd-muted);display:flex;align-items:center;gap:10px}
        .rd-eyebrow b{font-weight:400;color:var(--rd-clay)}
        .rd-intro h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(55px,7vw,86px);font-weight:400;letter-spacing:-.065em;line-height:.92;margin:19px 0 13px}
        .rd-intro h1 em{font-weight:400;color:var(--rd-green)}
        .rd-subtitle{font-size:13px;color:var(--rd-muted);line-height:1.65;margin:0}
        .rd-search-side{padding-bottom:4px}
        .rd-search-form{height:53px;border-bottom:1px solid var(--rd-ink);display:flex;align-items:center;gap:12px}
        .rd-search-form svg{color:var(--rd-green);flex:none}
        .rd-search-form input{border:0;outline:0;background:transparent;color:var(--rd-ink);font-size:15px;min-width:0;flex:1}
        .rd-search-form button{border:0;background:var(--rd-green);color:#fbfaf5;padding:11px 16px;cursor:pointer;font-size:11px;transition:background .2s,transform .2s}
        .rd-search-form button:hover{background:var(--rd-green-deep);transform:translateY(-1px)}
        .rd-search-help{display:flex;justify-content:space-between;margin-top:9px;color:var(--rd-muted);font:8px "DM Mono",monospace;letter-spacing:.1em}
        .rd-main{max-width:1110px;margin:52px auto 0}
        .rd-controls{border:1px solid var(--rd-line);background:rgba(248,246,240,.64);padding:21px 23px 18px;position:relative}
        .rd-controls-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
        .rd-section-kicker{color:var(--rd-clay)}
        .rd-controls h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:26px;letter-spacing:-.04em;margin:5px 0 0}
        .rd-rank-state{font:9px "DM Mono",monospace;letter-spacing:.09em;color:var(--rd-muted);border:1px solid var(--rd-line);padding:8px 10px;white-space:nowrap}
        .rd-rank-state.is-ranked{color:var(--rd-green);border-color:#a9b5a5;background:#edf0e9}
        .rd-presets{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0 17px}
        .rd-preset{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:166px;background:transparent;border:1px solid var(--rd-line);padding:9px 11px;color:var(--rd-ink);font-size:10px;cursor:pointer;transition:background .2s,border-color .2s,color .2s;position:relative}
        .rd-preset:hover,.rd-preset.selected{background:#e7ebe3;border-color:#aab8a7;color:var(--rd-green-deep)}
        .rd-preset span{font-size:10px;color:var(--rd-ink);font-weight:700}
        .rd-preset small{font-size:9px;color:var(--rd-muted);font-weight:400}
        .rd-preset svg{position:absolute;right:10px;top:10px}
        .rd-preference-grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--rd-line)}
        .rd-preference{padding:13px 13px 0 0}
        .rd-preference + .rd-preference{border-left:1px solid var(--rd-line);padding-left:16px}
        .rd-preference label{display:block;font-size:11px;font-weight:700;margin-bottom:8px}
        .rd-choice-row{display:flex;gap:5px}
        .rd-choice{font-size:9px;color:var(--rd-muted);background:transparent;border:1px solid transparent;padding:6px 8px;cursor:pointer}
        .rd-choice:hover{border-color:var(--rd-line);color:var(--rd-ink)}
        .rd-choice.active{background:var(--rd-green);color:#fbfaf5;border-color:var(--rd-green)}
        .rd-controls-foot{font-size:10px;color:var(--rd-muted);line-height:1.5;margin:14px 0 0;display:flex;gap:7px;align-items:flex-start}
        .rd-controls-foot svg{flex:none;margin-top:1px}
        .rd-controls-toggle{display:none}
        .rd-results-heading{display:flex;justify-content:space-between;align-items:end;margin:32px 0 16px}
        .rd-results-heading h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:29px;letter-spacing:-.04em;margin:5px 0 0}
        .rd-count{color:var(--rd-muted)}
        .rd-unranked-note{border-left:2px solid var(--rd-clay);padding:7px 0 7px 12px;color:#64675f;font-size:11px;line-height:1.6;margin-bottom:16px}
        .rd-featured{display:grid;grid-template-columns:minmax(260px,.86fr) minmax(360px,1.14fr);background:#e8e5dc;border:1px solid #d7d2c7;min-height:365px}
        .rd-featured .rd-still{min-height:365px}
        .rd-feature-copy{padding:26px clamp(21px,3vw,43px);display:flex;flex-direction:column;align-items:flex-start}
        .rd-pick-overline{display:flex;align-items:center;gap:9px;color:var(--rd-green);font:9px "DM Mono",monospace;letter-spacing:.11em}
        .rd-pick-overline i{width:19px;height:19px;border:1px solid #9ba994;border-radius:50%;display:grid;place-items:center;font-style:normal}
        .rd-feature-copy h3{font-family:Georgia,"Times New Roman",serif;font-size:36px;line-height:1.03;letter-spacing:-.05em;font-weight:400;margin:18px 0 4px}
        .rd-feature-copy .rd-brand{color:var(--rd-muted);margin:0}
        .rd-feature-price{font-size:16px;font-weight:700;margin-top:16px}
        .rd-feature-retailer{font-size:10px;color:var(--rd-muted);margin:3px 0 20px}
        .rd-reason-block{width:100%;border-top:1px solid #cec9be;padding:12px 0 0;margin-top:auto}
        .rd-reason-block + .rd-reason-block{margin-top:12px}
        .rd-reason-block strong{font-size:11px;display:block;margin-bottom:5px}
        .rd-reason-block p{font-size:11px;line-height:1.55;color:#65675f;margin:0}
        .rd-expand{display:flex;align-items:center;gap:7px;background:none;border:0;color:var(--rd-green);font-weight:700;font-size:10px;padding:13px 0 0;cursor:pointer}
        .rd-detail-panel{margin-top:11px;background:rgba(248,246,240,.55);padding:12px;width:100%;animation:rdReveal .22s ease-out}
        .rd-detail-panel h4{font-size:10px;margin:0 0 9px}
        .rd-detail-line{display:grid;grid-template-columns:1fr auto;gap:14px;padding:6px 0;border-top:1px solid #ddd8cd;font-size:10px}
        .rd-detail-line span{color:var(--rd-muted)}
        .rd-prototype-tag{font:8px "DM Mono",monospace;letter-spacing:.06em;color:#8f533c;background:#f2e4dc;padding:3px 5px;margin-left:5px}
        .rd-alternatives-title{display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px}
        .rd-alternatives-title h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;font-size:24px;letter-spacing:-.04em;margin:0}
        .rd-alternatives-title span{font:9px "DM Mono",monospace;color:var(--rd-muted);letter-spacing:.1em}
        .rd-alternatives{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .rd-alternative{display:grid;grid-template-columns:118px 1fr;border:1px solid var(--rd-line);background:rgba(248,246,240,.55);min-height:145px;overflow:hidden}
        .rd-alternative .rd-still{min-height:145px}
        .rd-alternative-copy{padding:13px 15px;display:flex;flex-direction:column}
        .rd-alt-top{display:flex;justify-content:space-between;align-items:center;color:var(--rd-green);font:9px "DM Mono",monospace;letter-spacing:.1em}
        .rd-alt-top strong{font-size:9px;font-weight:400}
        .rd-alternative-copy h3{font-family:Georgia,"Times New Roman",serif;font-size:17px;font-weight:400;letter-spacing:-.025em;margin:9px 0 2px}
        .rd-alternative-copy .rd-brand{color:var(--rd-muted);font-size:8px}
        .rd-alternative-copy .rd-price-row{margin-top:auto;padding-top:9px}
        .rd-alternative-copy .rd-price-row strong{font-size:12px}
        .rd-alternative-copy .rd-price-row span{font-size:9px}
        .rd-show-more{display:flex;margin:18px auto 0;align-items:center;gap:9px;border:1px solid var(--rd-line);background:transparent;padding:10px 15px;font-size:10px;cursor:pointer;color:var(--rd-green);transition:background .2s}
        .rd-show-more:hover{background:#e8e5dc}
        .rd-hidden-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;animation:rdReveal .2s ease-out}
        .rd-hidden-item{border-top:1px solid var(--rd-line);padding:10px 2px;display:flex;justify-content:space-between;gap:12px;font-size:11px}
        .rd-hidden-item span{color:var(--rd-muted)}
        .rd-disclosure{margin:35px auto 0;max-width:1110px;border-top:1px solid var(--rd-ink);border-bottom:1px solid var(--rd-line)}
        .rd-disclosure-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:0;padding:14px 0;cursor:pointer;text-align:left;color:var(--rd-ink)}
        .rd-disclosure-title{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:700}
        .rd-disclosure-title svg{color:var(--rd-clay)}
        .rd-disclosure-toggle > svg{color:var(--rd-muted)}
        .rd-disclosure-body{display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px;padding:0 0 17px;animation:rdReveal .2s ease-out}
        .rd-data-label{color:var(--rd-green);margin-bottom:7px}
        .rd-disclosure-body p{font-size:10px;line-height:1.55;color:var(--rd-muted);margin:0}
        .rd-footer{max-width:1110px;margin:21px auto 0;display:flex;justify-content:space-between;color:var(--rd-muted);font-size:8px}
        .rd-still{position:relative;overflow:hidden;background:radial-gradient(ellipse at 51% 40%,#e0d9ce 0%,#d8d1c4 48%,#d0c8bb 100%);min-height:100%;display:flex;align-items:center;justify-content:center}
        .rd-still:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.13),transparent 42%,rgba(64,57,46,.05));pointer-events:none}
        .rd-still svg{height:75%;max-height:290px;width:80%;position:relative;z-index:1;filter:drop-shadow(0 14px 12px rgba(50,44,36,.17))}
        .rd-still-index,.rd-still-caption{position:absolute;z-index:2;color:#7c776d;font-size:7px}
        .rd-still-index{top:15px;left:16px}
        .rd-still-caption{bottom:14px;right:16px}
        .rd-compact svg{height:70%;width:78%}
        @keyframes rdReveal{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:760px){
          .raete-redesign{padding:0 17px 30px}
          .rd-topbar{height:59px}.rd-top-note{font-size:8px;gap:6px}
          .rd-intro{margin-top:36px;grid-template-columns:1fr;gap:19px}
          .rd-intro h1{font-size:62px;margin-top:16px}
          .rd-search-side{padding:0}
          .rd-main{margin-top:34px}
          .rd-controls{padding:17px 15px 14px}
          .rd-controls-heading{align-items:center}
          .rd-controls h2{font-size:23px}
          .rd-rank-state{font-size:8px;padding:7px}
          .rd-presets{display:grid;grid-template-columns:1fr;gap:5px;margin:15px 0}
          .rd-preset{justify-content:flex-start;padding:9px;min-width:0}
          .rd-preference-grid{grid-template-columns:repeat(2,1fr)}
          .rd-preference{padding:12px 8px 8px 0}
          .rd-preference:nth-child(3){border-left:0;padding-left:0;border-top:1px solid var(--rd-line)}
          .rd-preference:nth-child(4){border-top:1px solid var(--rd-line);padding-left:12px}
          .rd-preference + .rd-preference{padding-left:12px}
          .rd-preference:nth-child(3){padding-left:0}
          .rd-choice-row{gap:1px}
          .rd-choice{padding:6px 7px}
          .rd-results-heading{margin:27px 0 13px}
          .rd-results-heading h2{font-size:25px}
          .rd-featured{grid-template-columns:1fr}
          .rd-featured .rd-still{min-height:260px}
          .rd-feature-copy{padding:21px}
          .rd-feature-copy h3{font-size:31px}
          .rd-reason-block{margin-top:14px}
          .rd-alternatives{grid-template-columns:1fr}
          .rd-alternative{grid-template-columns:100px 1fr}
          .rd-alternative .rd-still{min-height:135px}
          .rd-hidden-list{grid-template-columns:1fr}
          .rd-disclosure-body{grid-template-columns:1fr;gap:14px;padding-bottom:16px}
          .rd-footer{gap:15px;line-height:1.5}
        }
        @media(prefers-reduced-motion:reduce){.raete-redesign *{animation:none!important;transition:none!important}}
      `}</style>

      <header className="rd-topbar">
        <a href="#search" className="rd-wordmark" aria-label="Raete search">
          <span className="rd-mark" /> raete
        </a>
        <div className="rd-top-note"><span className="rd-live-mark" /> PRODUCT SEARCH <span>/</span> DECISION PREVIEW</div>
      </header>

      <section className="rd-intro" id="search">
        <div>
          <div className="rd-eyebrow"><b>01</b> A LITTLE MORE THOUGHT, IN EVERY FIND</div>
          <h1>Find the<br /><em>right piece.</em></h1>
          <p className="rd-subtitle">Compare what’s out there. Then make the call<br className="rd-desktop-break" /> on what matters to you.</p>
        </div>
        <div className="rd-search-side">
          <form className="rd-search-form" onSubmit={submitSearch}>
            <Search size={18} strokeWidth={1.7} aria-hidden="true" />
            <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
            <button type="submit">Search <ArrowUpRight size={13} /></button>
          </form>
          <div className="rd-search-help"><span>ILLUSTRATIVE SEARCH PREVIEW</span><span>UP TO 8 PIECES</span></div>
        </div>
      </section>

      <div className="rd-main">
        <section className="rd-controls" aria-label="Your priorities">
          <div className="rd-controls-heading">
            <div><div className="rd-section-kicker">MAKE THIS SEARCH YOURS</div><h2>What matters to you?</h2></div>
            <div className={`rd-rank-state${isRanked ? ' is-ranked' : ''}`}>{isRanked ? 'YOUR ORDER IS SET' : 'UNRANKED · CHOOSE ALL FOUR'}</div>
          </div>
          <div className="rd-presets" aria-label="Priority presets">
            {presets.map((preset) => (
              <button className={`rd-preset${activePreset === preset.name ? ' selected' : ''}`} type="button" key={preset.name} onClick={() => selectPreset(preset.name, preset.values)}>
                <span>{preset.name}</span>{activePreset === preset.name && <Check size={13} />}{activePreset !== preset.name && <small>{preset.note}</small>}
              </button>
            ))}
          </div>
          <div className="rd-preference-grid">
            {dimensions.map(({ key, label }) => (
              <div className="rd-preference" key={key}>
                <label>{label}</label>
                <div className="rd-choice-row" role="group" aria-label={`${label} priority`}>
                  {(['Low', 'Medium', 'High'] as const).map((value) => (
                    <button type="button" key={value} className={`rd-choice${priorities[key] === value ? ' active' : ''}`} aria-pressed={priorities[key] === value} onClick={() => changePriority(key, value)}>{value}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="rd-controls-foot"><Info size={13} /> Choose all four to see a personal order. Presets fill every choice; change any one to make it yours.</p>
        </section>

        <section aria-live="polite">
          <div className="rd-results-heading">
            <div><div className="rd-section-kicker">YOUR SEARCH · ILLUSTRATIVE FIXTURE</div><h2>{submittedQuery}</h2></div>
            <div className="rd-count">08 EXAMPLE LISTINGS</div>
          </div>
          {!isRanked && <div className="rd-unranked-note">No order yet. Your priorities are incomplete, so these pieces are shown without a ranking.</div>}

          {featured ? (
            <>
              <article className="rd-featured">
                <ProductStill variant={featured.swatch} />
                <div className="rd-feature-copy">
                  <div className="rd-pick-overline"><i><Check size={12} /></i> #1 FOR YOUR PRIORITIES <b className="rd-prototype-tag">PROTOTYPE ORDER</b></div>
                  <h3>{featured.name}</h3><div className="rd-brand">{featured.brand} · {featured.color}</div>
                  <div className="rd-feature-price">{featured.price}</div><div className="rd-feature-retailer">{featured.retailer} · example listing</div>
                  <div className="rd-reason-block"><strong>Why it’s #1 for you</strong><p>{featured.why}</p></div>
                  <div className="rd-reason-block"><strong>Ahead of #2 because…</strong><p>{featured.ahead}</p></div>
                  <button className="rd-expand" type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded}>
                    {expanded ? 'Hide breakdown' : 'See why'} {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {expanded && <div className="rd-detail-panel">
                    <h4>What shaped this order</h4>
                    <div className="rd-detail-line"><span>Listed price <small>· fixture</small></span><strong>{featured.price}</strong></div>
                    <div className="rd-detail-line"><span>Materials fit <b className="rd-prototype-tag">PROTOTYPE</b></span><strong>Strong match</strong></div>
                    <div className="rd-detail-line"><span>Quality signal <b className="rd-prototype-tag">PROTOTYPE</b></span><strong>Good match</strong></div>
                    <div className="rd-detail-line"><span>Longevity signal <b className="rd-prototype-tag">PROTOTYPE</b></span><strong>Promising</strong></div>
                    <p className="rd-controls-foot"><Info size={13} /> Prototype signals are synthetic examples—not owner reports or verified product attributes.</p>
                  </div>}
                </div>
              </article>
              <div className="rd-alternatives-title"><h2>Also worth a look</h2><span>ALTERNATIVES · RANKED FOR YOU</span></div>
              <div className="rd-alternatives">
                {topPick.slice(1, 3).map(({ product }, index) => (
                  <article className="rd-alternative" key={product.id}>
                    <ProductStill variant={product.swatch} compact />
                    <div className="rd-alternative-copy"><div className="rd-alt-top"><span>#{index + 2}</span><strong>PROTOTYPE ORDER</strong></div><h3>{product.name}</h3><div className="rd-brand">{product.brand}</div><div className="rd-price-row"><strong>{product.price}</strong><span>{product.retailer} <ArrowUpRight size={11} /></span></div></div>
                  </article>
                ))}
              </div>
              <button className="rd-show-more" type="button" onClick={() => setShowMore((visible) => !visible)} aria-expanded={showMore}>
                {showMore ? 'Show less' : 'Show more · #4–#8'} {showMore ? <ChevronUp size={14} /> : <ArrowDownRight size={14} />}
              </button>
              {showMore && <div className="rd-hidden-list">{topPick.slice(3).map(({ product }, index) => (
                <div className="rd-hidden-item" key={product.id}><strong>#{index + 4} · {product.brand} — {product.name}</strong><span>{product.price}</span></div>
              ))}</div>}
            </>
          ) : (
            <>
              <div className="rd-alternatives">
                {products.slice(0, 2).map((product, index) => (
                  <article className="rd-alternative" key={product.id}>
                    <ProductStill variant={product.swatch} compact />
                    <div className="rd-alternative-copy"><div className="rd-alt-top"><span>NOT RANKED</span><strong>EXAMPLE {String(index + 1).padStart(2, '0')}</strong></div><h3>{product.name}</h3><div className="rd-brand">{product.brand}</div><div className="rd-price-row"><strong>{product.price}</strong><span>{product.retailer} <ArrowUpRight size={11} /></span></div></div>
                  </article>
                ))}
              </div>
              <button className="rd-show-more" type="button" onClick={() => setShowMore((visible) => !visible)} aria-expanded={showMore}>
                {showMore ? 'Show less' : 'Show more examples · 6'} {showMore ? <ChevronUp size={14} /> : <ArrowDownRight size={14} />}
              </button>
              {showMore && <div className="rd-hidden-list">{products.slice(2).map((product, index) => (
                <div className="rd-hidden-item" key={product.id}><strong>EXAMPLE {String(index + 3).padStart(2, '0')} · {product.brand} — {product.name}</strong><span>{product.price}</span></div>
              ))}</div>}
            </>
          )}
        </section>
      </div>

      <section className="rd-disclosure" aria-label="Prototype data details">
        <button className="rd-disclosure-toggle" type="button" onClick={() => setDisclosureOpen((open) => !open)} aria-expanded={disclosureOpen}>
          <span className="rd-disclosure-title"><Info size={15} /> Prototype data <span className="rd-prototype-tag">READ THIS FIRST</span></span>
          {disclosureOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {disclosureOpen && <div className="rd-disclosure-body">
          <div><div className="rd-data-label">LISTING FACTS · ILLUSTRATIVE</div><p>Product names, prices, retailer names and material descriptions shown here are static fixture examples. They are not live offers, checked listings or verified facts.</p></div>
          <div><div className="rd-data-label">DECISION SIGNALS · PROTOTYPE</div><p>Materials, quality and longevity signals are synthetic demonstration values. They are not measured attributes, expert judgments or evidence from owners.</p></div>
          <div><div className="rd-data-label">COMMUNITY REPUTATION · NOT LIVE</div><p>No reviews, community ranking or owner-reported reputation is used in this preview. Personal ordering is illustrative only.</p></div>
        </div>}
      </section>
      <footer className="rd-footer"><span>RAETE / A MORE CONSIDERED WAY TO SEARCH</span><span>NO COMPOSITE SCORE · NO LIVE CLAIMS</span></footer>
    </main>
  );
}
