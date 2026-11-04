import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";

const sales = [
  { date: "28 out 2026", lot: "Lote Safra 24", amount: "7 animais", buyer: "Frigorífico União", value: "R$ 34.860,00", margin: "+ R$ 18.266,48" },
  { date: "12 ago 2026", lot: "Lote Bezerros Sul", amount: "4 animais", buyer: "José Carlos", value: "R$ 12.400,00", margin: "+ R$ 5.823,12" },
  { date: "03 jun 2026", lot: "Lote Recria 23", amount: "19 animais", buyer: "Frigorífico União", value: "R$ 79.800,00", margin: "+ R$ 22.035,58" },
];

export default function SalesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") || "registradas";
  const [registerOpen, setRegisterOpen] = useState(params.get("acao") === "registrar");
  const [toast, setToast] = useState<string | null>(null);

  function toggleRegister(open: boolean) {
    setRegisterOpen(open);
    const next = new URLSearchParams(params);
    if (open) next.set("acao", "registrar"); else next.delete("acao");
    setParams(next, { replace: true });
  }

  return (
    <AppShell>
      <div className="sales-page">
        <header className="section-heading">
          <div><span className="eyebrow">RESULTADO DA FAZENDA</span><h1>Vendas</h1><p>Registre negociações e teste cenários antes de decidir.</p></div>
          <Button icon={<TrendingUp />} onClick={() => toggleRegister(true)}>Registrar venda</Button>
        </header>
        <nav className="cost-tabs sales-tabs" role="tablist" aria-label="Áreas de vendas"><button role="tab" aria-selected={tab === "registradas"} className={tab === "registradas" ? "active" : ""} onClick={() => setParams({})}>Registradas</button><button role="tab" aria-selected={tab === "simulador"} className={tab === "simulador" ? "active" : ""} onClick={() => setParams({ aba: "simulador" })}>Simulador</button></nav>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === "registradas" ? <RegisteredSales onRegister={() => toggleRegister(true)} /> : <Simulator onToast={setToast} onRegister={() => toggleRegister(true)} onMarket={() => navigate("/fazenda/baixada/mercado")} />}
        </motion.div>
      </div>
      <RegisterSale open={registerOpen} onClose={() => toggleRegister(false)} onSaved={() => { toggleRegister(false); setToast("Venda registrada. Estoque e margem foram atualizados."); }} />
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

function RegisteredSales({ onRegister }: { onRegister: () => void }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("busca") || "";
  const period = params.get("periodo") || "Este ano";
  const lot = params.get("lote") || "Todos os lotes";
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key,value); else next.delete(key); setParams(next); }
  const filtered = sales.filter((sale) => `${sale.lot} ${sale.buyer}`.toLowerCase().includes(query.toLowerCase()));
  return <><section className="sales-summary"><div><span>Receita recebida</span><strong><i>R$</i> 127.060,00</strong><small>3 vendas registradas</small></div><div><span>Margem líquida</span><strong>+ <i>R$</i> 46.125,18</strong><small>Sobre custos diretos</small></div><div><span>Animais vendidos</span><strong>30</strong><small>Em 3 lotes</small></div></section><section className="sales-toolbar"><label className="search-box"><span className="sr-only">Buscar venda por lote ou comprador</span><Search /><input value={query} onChange={(event) => update("busca",event.target.value)} placeholder="Buscar lote ou comprador" /></label><label className="filter-chip active">{period}<ChevronDown /><select aria-label="Filtrar vendas por período" value={period} onChange={(event) => update("periodo",event.target.value)}><option>Este ano</option><option>Últimos 30 dias</option></select></label><label className="filter-chip">{lot}<ChevronDown /><select aria-label="Filtrar vendas por lote" value={lot} onChange={(event) => update("lote",event.target.value)}><option>Todos os lotes</option><option>Lote Safra 24</option></select></label></section><div className="sales-list">{filtered.map((sale) => <button key={sale.date} className="sale-list-row"><time>{sale.date}</time><span className="sale-list-icon" aria-hidden="true"><TrendingUp /></span><p><strong>{sale.lot}</strong><small>{sale.amount} · {sale.buyer}</small></p><div><small>Valor recebido</small><b>{sale.value}</b></div><div className="positive"><small>Margem líquida · sobre custos diretos</small><b>{sale.margin}</b></div><ChevronRight /></button>)}</div>{filtered.length === 0 && <div className="no-results"><TrendingUp /><h2>Nenhuma venda encontrada</h2><p>Ajuste os filtros ou registre uma nova venda.</p><Button onClick={onRegister}>Registrar venda</Button></div>}</>;
}

function RegisterSale({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [quantity, setQuantity] = useState(7);
  const [value, setValue] = useState(34860);
  const invalid = quantity > 31 || quantity < 1;
  const cost = quantity * 2300.96;
  const margin = value - cost;
  return <Modal open={open} onClose={onClose} title="Registrar venda"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (!invalid) onSaved(); }}>
    <label className="select-field"><span>Lote ou animal</span><select><option>Lote Safra 24 — saldo 31</option><option>Lote Bezerros Sul — saldo 22</option><option>Boi 047 — saldo 1</option></select></label>
    <div className="form-grid"><Field label="Quantidade" type="number" inputMode="numeric" min="1" max="31" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} error={invalid ? "O saldo disponível é de 31 animais." : undefined} /><Field label="Valor recebido" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(Number(event.target.value))} suffix={<span className="field-suffix">R$</span>} /></div>
    <div className="form-grid"><Field label="Data da venda" type="date" defaultValue="2026-11-08" /><Field label="Comprador (opcional)" autoComplete="organization" defaultValue="Frigorífico União" /></div>
    <section className="live-sale-summary"><span>RESUMO AO VIVO</span><div><small>Custo apropriado confirmado</small><strong>− {money(cost)}</strong></div><div><small>Margem bruta · sobre custos diretos</small><strong className={margin >= 0 ? "positive" : "negative"}>{margin >= 0 ? "+" : "−"} {money(Math.abs(margin))}</strong></div><div><small>Saldo restante</small><strong>{Math.max(0,31 - quantity)} animais</strong></div></section>
    <p className="sale-form-note"><AlertCircle /> Vendas parciais mantêm o lote aberto com o saldo restante.</p>
    <div className="modal__actions"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={invalid}>Confirmar venda</Button></div>
  </form></Modal>;
}

function Simulator({ onToast, onRegister, onMarket }: { onToast: (message: string) => void; onRegister: () => void; onMarket: () => void }) {
  const [quantity, setQuantity] = useState(10);
  const [weight, setWeight] = useState(520);
  const [yieldRate, setYieldRate] = useState(52);
  const [quote, setQuote] = useState(321.4);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "done">("idle");
  const [fees, setFees] = useState([{ name: "Frete", value: 850, mode: "R$" }, { name: "Comissão", value: 1.5, mode: "%" }]);
  const arrobas = quantity * weight * (yieldRate / 100) / 15;
  const revenue = arrobas * quote;
  const lotCost = quantity * 2300.96;
  const feeTotal = fees.reduce((total, fee) => total + (fee.mode === "%" ? revenue * fee.value / 100 : fee.value), 0);
  const gross = revenue - lotCost;
  const net = gross - feeTotal;
  const balance = (lotCost + feeTotal) / arrobas;

  function fetchQuote() {
    // TODO(CEPEA): substituir este atraso e valor fictício pela integração oficial.
    setQuoteState("loading");
    window.setTimeout(() => { setQuote(324.85); setQuoteState("done"); }, 900);
  }

  return <div className="simulator-layout"><div className="simulator-form"><section className="sim-section"><div className="sim-section__heading"><span>01</span><div><h2>O que você pretende vender?</h2><p>Números identificados como “do sistema” vêm dos registros confirmados.</p></div></div><label className="select-field"><span>Lote</span><select><option>Lote Safra 24 — 31 animais disponíveis</option><option>Lote Bezerros Sul — 22 animais disponíveis</option></select></label><div className="form-grid"><Field label="Quantidade" type="number" inputMode="numeric" min="1" max="31" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /><Field label="Peso vivo médio estimado" type="number" inputMode="decimal" min="1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} suffix={<span className="field-suffix">kg</span>} /><Field label="Rendimento de carcaça" type="number" inputMode="decimal" min="1" max="100" value={yieldRate} onChange={(event) => setYieldRate(Number(event.target.value))} suffix={<span className="field-suffix">%</span>} /></div></section>
  <section className="sim-section"><div className="sim-section__heading"><span>02</span><div><h2>Cotação da arroba</h2><p>Digite seu valor ou teste a busca ilustrativa.</p></div></div><div className="quote-input-row"><Field label="Valor da arroba" type="number" inputMode="decimal" min="0" value={quote} onChange={(event) => setQuote(Number(event.target.value))} suffix={<span className="field-suffix">R$</span>} /><label className="select-field"><span>Região</span><select><option>Minas Gerais — Triângulo</option><option>São Paulo — Araçatuba</option><option>Goiás — Goiânia</option></select></label><Button variant="secondary" onClick={fetchQuote} disabled={quoteState === "loading"} icon={quoteState === "loading" ? <LoaderCircle className="spin" /> : <Search />}>{quoteState === "loading" ? "Buscando…" : "Buscar do CEPEA"}</Button></div>{quoteState === "done" && <div className="quote-result"><Check /><span><strong>Referência encontrada: R$ 324,85 / @</strong><small>Dado ilustrativo · integração CEPEA em breve</small></span><button onClick={onMarket}>Ver no Mercado</button></div>}</section>
  <section className="sim-section"><div className="sim-section__heading"><span>03</span><div><h2>Taxas adicionais</h2><p>Adicione valores em reais ou percentuais.</p></div></div><div className="fee-lines">{fees.map((fee,index) => <div key={index}><label><span className="sr-only">Nome da taxa {index + 1}</span><input value={fee.name} onChange={(event) => setFees(fees.map((item,i) => i === index ? {...item,name:event.target.value} : item))} /></label><label><span className="sr-only">Valor da taxa {index + 1}</span><input inputMode="decimal" type="number" value={fee.value} onChange={(event) => setFees(fees.map((item,i) => i === index ? {...item,value:Number(event.target.value)} : item))} /></label><label><span className="sr-only">Unidade da taxa {index + 1}</span><select value={fee.mode} onChange={(event) => setFees(fees.map((item,i) => i === index ? {...item,mode:event.target.value} : item))}><option>R$</option><option>%</option></select></label><button aria-label={`Remover taxa ${fee.name || index + 1}`} onClick={() => setFees(fees.filter((_,i) => i !== index))}><Trash2 /></button></div>)}</div><Button variant="secondary" icon={<Plus />} onClick={() => setFees([...fees,{name:"",value:0,mode:"R$"}])}>Adicionar taxa</Button></section></div>
  <aside className="simulation-output"><span className="eyebrow">CENÁRIO SIMULADO</span><h2>Se vender agora</h2><div className="simulation-primary"><small>Margem líquida</small><strong className={net >= 0 ? "positive" : "negative"}>{net >= 0 ? "+" : "−"} {money(Math.abs(net))}</strong><span>sobre custos diretos</span></div><div className="simulation-numbers"><ResultRow label="Receita bruta" value={money(revenue)} source="digitado" /><ResultRow label="Custo do lote" value={`− ${money(lotCost)}`} source="do sistema" link /><ResultRow label="Taxas" value={`− ${money(feeTotal)}`} source="digitado" /><ResultRow label="Margem bruta" value={money(gross)} source="calculado" /><ResultRow label="Margem líquida" value={money(net)} source="calculado" /><ResultRow label="Arroba de equilíbrio" value={`${money(balance)} / @`} source="calculado" /></div><label className="quote-slider"><span><strong>E se a arroba for…</strong><b>{money(quote)}</b></span><input type="range" min="220" max="400" step=".5" value={quote} onChange={(event) => setQuote(Number(event.target.value))} /><small><i>R$ 220</i><i>R$ 400</i></small></label><div className="simulation-actions"><Button onClick={() => onToast("Simulação salva para consultar depois.")}>Salvar simulação</Button><Button variant="secondary" icon={<ArrowRight />} onClick={onRegister}>Transformar em venda</Button></div><p><Clock /> Esta simulação não altera o estoque.</p></aside></div>;
}

function ResultRow({ label, value, source, link }: { label: string; value: string; source: string; link?: boolean }) {
  return <div><span>{label}<small className={`source-tag source-tag--${source.replace(" ","-")}`}>{source}</small></span><strong>{value}</strong>{link && <button aria-label="Abrir detalhes do custo"><ExternalLink /></button>}</div>;
}

function money(value: number) { return `R$ ${value.toLocaleString("pt-BR",{ minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
