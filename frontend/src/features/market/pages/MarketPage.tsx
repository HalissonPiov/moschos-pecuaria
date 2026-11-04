import { useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Calendar,
  Check,
  ChevronDown,
  Edit3,
  Heart,
  MapPin,
  Plus,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { gsap } from "gsap";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";

const states = [
  { id: "MG", name: "Minas Gerais", quote: 324.85, change: "+1,8%", tone: 4, path: "138,150 214,142 246,177 220,230 156,222 120,183" },
  { id: "SP", name: "São Paulo", quote: 331.20, change: "+0,9%", tone: 5, path: "105,222 156,222 220,230 203,266 137,281 91,255" },
  { id: "GO", name: "Goiás", quote: 318.40, change: "+1,2%", tone: 3, path: "115,101 180,100 214,142 138,150 120,183 84,150" },
  { id: "MS", name: "Mato Grosso do Sul", quote: 315.70, change: "−0,4%", tone: 3, path: "43,177 120,183 156,222 105,222 91,255 42,238" },
  { id: "MT", name: "Mato Grosso", quote: 308.90, change: "+0,6%", tone: 2, path: "33,80 115,101 84,150 120,183 43,177 12,125" },
  { id: "BA", name: "Bahia", quote: 302.60, change: "+0,3%", tone: 2, path: "214,90 277,107 300,158 246,177 214,142 180,100" },
  { id: "PA", name: "Pará", quote: 296.80, change: "−0,2%", tone: 1, path: "74,25 190,29 214,90 180,100 115,101 33,80" },
  { id: "PR", name: "Paraná", quote: 326.10, change: "+1,1%", tone: 4, path: "137,281 203,266 207,296 159,316 119,300" },
];

export default function MarketPage() {
  const mapRef = useRef<SVGSVGElement>(null);
  const [params, setParams] = useSearchParams();
  const selected = states.find((state) => state.id === params.get("uf")) || states[0];
  const period = params.get("periodo") || "30 dias";
  const [manualOpen, setManualOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!mapRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.from(".market-state", { opacity: 0, scale: .9, transformOrigin: "center", stagger: .06, duration: .55, ease: "back.out(1.4)" });
      gsap.from(".map-marker", { opacity: 0, y: -12, stagger: .1, delay: .45, duration: .4 });
    }, mapRef);
    return () => context.revert();
  }, []);

  function updateRoute(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  }

  function selectState(id: string) { updateRoute("uf", id); }

  return (
    <AppShell>
      <div className="market-page">
        <header className="section-heading market-heading">
          <div><span className="eyebrow">REFERÊNCIA DE MERCADO</span><h1>Cotações da arroba</h1><p>Dados ilustrativos para apoiar suas simulações de venda.</p></div>
          <Button variant="secondary" icon={<Plus />} onClick={() => setManualOpen(true)}>Registrar cotação</Button>
        </header>
        <div className="market-disclaimer"><TrendingUp /><span><strong>Integração automática com o CEPEA em breve</strong><small>Por enquanto, use estas referências ilustrativas ou registre sua própria cotação.</small></span></div>

        <div className="market-layout">
          <section className="map-panel">
            <div className="map-toolbar"><div><span className="eyebrow">BRASIL</span><h2>Preço da arroba por estado</h2></div><span className="map-date"><Calendar /> Atualizado em 08 nov 2026</span></div>
            <svg className="brazil-map" ref={mapRef} viewBox="0 0 330 350" role="img" aria-label="Mapa do Brasil com cotações ilustrativas por estado">
              <path className="map-outline" d="M72 18L194 24L235 64L286 95L317 158L287 206L237 228L216 301L169 340L115 307L80 265L32 247L6 180L13 116L31 72Z" />
              {states.map((state) => <polygon key={state.id} points={state.path} tabIndex={0} role="button" aria-label={`${state.name}: R$ ${state.quote.toLocaleString("pt-BR",{ minimumFractionDigits: 2 })} por arroba`} aria-pressed={selected.id === state.id} className={`market-state market-state--${state.tone} ${selected.id === state.id ? "selected" : ""}`} onClick={() => selectState(state.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectState(state.id); } }}><title>{state.name}: R$ {state.quote.toLocaleString("pt-BR",{ minimumFractionDigits: 2 })} / @</title></polygon>)}
              <g className="map-marker" tabIndex={0} role="button" aria-label="Selecionar Triângulo Mineiro" onClick={() => selectState("MG")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectState("MG"); }}><circle cx="177" cy="182" r="8" /><circle cx="177" cy="182" r="3" /><text x="188" y="185">Triângulo</text></g>
              <g className="map-marker" tabIndex={0} role="button" aria-label="Selecionar Araçatuba" onClick={() => selectState("SP")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectState("SP"); }}><circle cx="151" cy="250" r="8" /><circle cx="151" cy="250" r="3" /><text x="162" y="253">Araçatuba</text></g>
              <g className="map-marker" tabIndex={0} role="button" aria-label="Selecionar Goiânia" onClick={() => selectState("GO")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectState("GO"); }}><circle cx="150" cy="124" r="8" /><circle cx="150" cy="124" r="3" /><text x="161" y="127">Goiânia</text></g>
            </svg>
            <div className="map-legend"><span>Menor preço</span>{[1,2,3,4,5].map((tone) => <i className={`market-state--${tone}`} key={tone} />)}<span>Maior preço</span></div>
          </section>

          <aside className="quote-panel">
            <div className="quote-panel__mobile-handle" />
            <div className="quote-panel__head"><div><span className="eyebrow">ESTADO SELECIONADO</span><h2>{selected.name}</h2></div><button aria-pressed={favorite} className={favorite ? "favorite active" : "favorite"} onClick={() => setFavorite(!favorite)} aria-label={favorite ? "Remover região dos favoritos" : "Marcar região favorita"}><Heart /></button></div>
            <div className="current-quote"><span>Cotação atual</span><strong><i>R$</i> {selected.quote.toLocaleString("pt-BR",{ minimumFractionDigits: 2 })} <small>/ @</small></strong><b>{selected.change} hoje</b></div>
            <div className="quote-period" role="group" aria-label="Período do histórico"><button aria-pressed={period === "30 dias"} className={period === "30 dias" ? "active" : ""} onClick={() => updateRoute("periodo","30 dias")}>30 dias</button><button aria-pressed={period === "12 meses"} className={period === "12 meses" ? "active" : ""} onClick={() => updateRoute("periodo","12 meses")}>12 meses</button></div>
            <div className="quote-chart">
              <svg viewBox="0 0 340 120" role="img" aria-label={`Histórico da arroba em ${selected.name}`}><path className="quote-area" d={period === "30 dias" ? "M0 95 C35 90 40 70 78 76 S130 62 164 65 S225 35 263 45 S305 24 340 20 L340 120L0 120Z" : "M0 90 C48 55 82 78 110 70 S165 40 205 60 S262 25 300 38 S326 20 340 28L340 120L0 120Z"} /><path className="quote-line" d={period === "30 dias" ? "M0 95 C35 90 40 70 78 76 S130 62 164 65 S225 35 263 45 S305 24 340 20" : "M0 90 C48 55 82 78 110 70 S165 40 205 60 S262 25 300 38 S326 20 340 28"} /></svg>
              <div><span>{period === "30 dias" ? "10 out" : "nov 2025"}</span><span>R$ {selected.quote.toLocaleString("pt-BR",{ minimumFractionDigits: 2 })}</span><span>{period === "30 dias" ? "08 nov" : "nov 2026"}</span></div>
            </div>
            <section className="regions-list"><span>REGIÕES COM DADOS</span>{selected.id === "MG" ? [["Triângulo Mineiro","R$ 326,40"],["Belo Horizonte","R$ 324,10"],["Norte de Minas","R$ 319,80"]].map(([region,value],index) => <button key={region} className={index === 0 ? "active" : ""}><MapPin /><span><strong>{region}</strong><small>{value} / @</small></span>{index === 0 && <Star aria-label="Região favorita" />}</button>) : <button className="active"><MapPin /><span><strong>Região principal</strong><small>R$ {selected.quote.toLocaleString("pt-BR",{ minimumFractionDigits: 2 })} / @</small></span></button>}</section>
            <Button onClick={() => setToast(`Cotação de ${selected.name} enviada ao simulador.`)}>Usar esta cotação no simulador</Button>
          </aside>
        </div>

        <section className="manual-history">
          <div className="finance-panel__heading"><div><span className="eyebrow">SUAS REFERÊNCIAS</span><h2>Cotações registradas</h2><p>Valores inseridos manualmente não alteram a referência ilustrativa do mapa.</p></div></div>
          {[["06/11/2026","Triângulo Mineiro","R$ 323,50"],["29/10/2026","Zona da Mata — MG","R$ 319,00"]].map((row) => <div key={row[0]}><time>{row[0]}</time><span><MapPin />{row[1]}</span><strong>{row[2]} / @</strong><button className="icon-button" aria-label={`Editar cotação de ${row[0]}`}><Edit3 /></button><button className="icon-button danger-icon" aria-label={`Excluir cotação de ${row[0]}`}><Trash2 /></button></div>)}
        </section>
      </div>

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Registrar cotação"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setManualOpen(false); setToast("Cotação manual registrada no histórico."); }}><div className="form-grid"><Field label="Data" type="date" defaultValue="2026-11-08" /><Field label="Valor da arroba" inputMode="decimal" autoComplete="off" defaultValue="324,85" suffix={<span className="field-suffix">R$</span>} /></div><label className="select-field"><span>Região</span><select><option>Triângulo Mineiro — MG</option><option>Zona da Mata — MG</option><option>Araçatuba — SP</option></select></label><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setManualOpen(false)}>Cancelar</Button><Button type="submit">Salvar cotação</Button></div></form></Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
