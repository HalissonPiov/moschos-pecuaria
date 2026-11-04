import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowDownLeft,
  Beef,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Download,
  Edit3,
  FileText,
  Filter,
  MapPin,
  MoreHorizontal,
  ReceiptText,
  Scale,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Modal, Toast } from "@/shared/ui/UI";

const tabs = [
  ["geral", "Visão geral"],
  ["custos", "Custos"],
  ["painel", "Painel"],
  ["vendas", "Vendas"],
  ["historico", "Histórico"],
];

const costs = [
  { date: "05/11/2026", category: "Suplemento", supplier: "Agropecuária Ponte Nova", value: "R$ 2.184,70", note: true },
  { date: "22/10/2026", category: "Medicamento", supplier: "Vet Rural", value: "R$ 786,45", note: true },
  { date: "06/10/2026", category: "Locação de pasto", supplier: "Carlos Andrade", value: "R$ 3.250,00", note: false },
  { date: "19/09/2026", category: "Ração", supplier: "Casa do Criador", value: "R$ 4.832,18", note: true },
];

export default function LotDetailPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") || "geral";
  const [helpOpen, setHelpOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function changeTab(next: string) {
    const updated = new URLSearchParams(params);
    updated.set("aba", next);
    setParams(updated);
  }

  function openPurchase() {
    window.dispatchEvent(new Event("mochos:purchase"));
  }

  return (
    <AppShell>
      <div className="lot-detail">
        <button className="back-link" onClick={() => navigate("/fazenda/baixada/rebanho")}>← Voltar para o rebanho</button>
        <header className="lot-hero">
          <div className="lot-hero__identity">
            <span className="kind-badge"><Beef /> Lote</span>
            <h1>Lote Safra 24</h1>
            <p><span>Nelore</span><span>22 meses</span><span><MapPin /> Piquete da Serra</span></p>
            <div className="balance-tag"><strong>31</strong><span>de 38 animais<br />em estoque</span></div>
          </div>
          <div className="lot-hero__actions">
            <Button variant="secondary" icon={<Edit3 />} onClick={() => navigate("/fazenda/baixada/rebanho/lote-safra-24/editar")}>Editar lote</Button>
            <button className="icon-button" aria-label="Mais opções"><MoreHorizontal /></button>
          </div>
          <div className="lot-numbers">
            <LotNumber label="Custo total confirmado" value="R$ 87.436,29" note="38 animais originais" />
            <LotNumber label="Custo por animal" value="R$ 2.300,96" note="custo total ÷ 38" />
            <LotNumber label="Margem estimada" value="+ R$ 21.892,40" note="sobre custos diretos" positive help={() => setHelpOpen(true)} />
          </div>
        </header>

        <nav className="lot-tabs" aria-label="Informações do lote" role="tablist">
          {tabs.map(([key, label]) => <button role="tab" aria-selected={tab === key} key={key} className={tab === key ? "active" : ""} onClick={() => changeTab(key)}>{label}</button>)}
        </nav>

        <motion.div className="lot-tab-content" key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
          {tab === "geral" && <Overview onTab={changeTab} />}
          {tab === "custos" && <Costs />}
          {tab === "painel" && <LotPanel />}
          {tab === "vendas" && <Sales onSale={() => setSaleOpen(true)} />}
          {tab === "historico" && <History />}
        </motion.div>

        <div className="lot-fixed-actions">
          <Button variant="secondary" icon={<Camera />} onClick={openPurchase}>Registrar compra</Button>
          <Button icon={<TrendingUp />} onClick={() => setSaleOpen(true)}>Vender / Simular</Button>
        </div>
      </div>

      <Modal open={saleOpen} onClose={() => setSaleOpen(false)} title="Simular venda">
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); setSaleOpen(false); setToast("Simulação salva. Nenhum animal foi vendido."); }}>
          <label className="select-field"><span>Quantidade de animais</span><select defaultValue="7">{[1,2,3,4,5,6,7,8,9,10].map((number) => <option key={number}>{number}</option>)}</select></label>
          <label className="field"><span className="field__label">Valor total da venda</span><span className="field__control"><input inputMode="decimal" defaultValue="34.860,00" /></span></label>
          <div className="sale-preview">
            <div><span>Valor recebido</span><strong>R$ 34.860,00</strong></div>
            <div><span>Custo apropriado (7 × R$ 2.300,96)</span><strong>− R$ 16.106,72</strong></div>
            <div><span>Margem sobre custos diretos</span><strong>+ R$ 18.753,28</strong></div>
          </div>
          <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setSaleOpen(false)}>Cancelar</Button><Button type="submit">Salvar simulação</Button></div>
        </form>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Como calculamos">
        <div className="calculation-help"><p>A estimativa usa o custo médio dos 38 animais originais e a cotação ilustrativa de R$ 321,40 por arroba.</p><div className="help-note"><CheckCircle2 /> Gastos previstos ainda não entram neste cálculo.</div><p className="fine-print">Margem sobre custos diretos. Não inclui custos gerais da propriedade.</p></div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

function LotNumber({ label, value, note, positive, help }: { label: string; value: string; note: string; positive?: boolean; help?: () => void }) {
  return <div className={positive ? "positive" : ""}><span>{label}{help && <button className="icon-button" onClick={help} aria-label="Como calculamos"><CircleHelp /></button>}</span><strong><i>{value.includes("R$") ? "R$" : ""}</i>{value.replace("R$ ", "").replace("+ ", "+ ")}</strong><small>{note}</small></div>;
}

function Overview({ onTab }: { onTab: (tab: string) => void }) {
  return (
    <div className="overview-grid">
      <section className="detail-panel">
        <div className="detail-panel__heading"><div><span className="eyebrow">DESDE 18/01/2024</span><h2>Resumo do lote</h2></div></div>
        <dl className="lot-facts"><div><dt>Raça</dt><dd>Nelore</dd></div><div><dt>Idade média</dt><dd>22 meses</dd></div><div><dt>Local</dt><dd>Piquete da Serra</dd></div><div><dt>Entrada</dt><dd>18/01/2024</dd></div><div><dt>Marca</dt><dd>FB 24</dd></div><div><dt>Cor</dt><dd>Branca</dd></div></dl>
        <div className="lot-note"><strong>Anotação</strong><p>Lote formado com animais da própria fazenda. Revisar peso em dezembro.</p></div>
      </section>
      <section className="detail-panel">
        <div className="detail-panel__heading"><div><span className="eyebrow">MAIORES GASTOS</span><h2>Custos por categoria</h2></div><button className="text-link" onClick={() => onTab("custos")}>Ver custos</button></div>
        <div className="category-bars">
          <CategoryBar label="Suplemento" value="R$ 33.224,18" width="82%" />
          <CategoryBar label="Locação de pasto" value="R$ 23.608,00" width="59%" />
          <CategoryBar label="Ração" value="R$ 15.741,47" width="39%" />
          <CategoryBar label="Medicamento" value="R$ 8.963,64" width="22%" />
        </div>
      </section>
      <section className="detail-panel detail-panel--wide">
        <div className="detail-panel__heading"><div><span className="eyebrow">ATIVIDADE RECENTE</span><h2>Últimos acontecimentos</h2></div><button className="text-link" onClick={() => onTab("historico")}>Ver histórico</button></div>
        <div className="recent-list">
          <div><span><ReceiptText /></span><p><strong>Compra de suplemento registrada</strong><small>Agropecuária Ponte Nova · R$ 2.184,70</small></p><time>Hoje</time></div>
          <div><span><ArrowDownLeft /></span><p><strong>Venda de 7 animais confirmada</strong><small>Saldo atualizado para 31 animais</small></p><time>28 out</time></div>
          <div><span><FileText /></span><p><strong>Nota fiscal anexada</strong><small>Compra de medicamento · Vet Rural</small></p><time>22 out</time></div>
        </div>
      </section>
    </div>
  );
}

function CategoryBar({ label, value, width }: { label: string; value: string; width: string }) {
  return <div><p><span>{label}</span><strong>{value}</strong></p><i><b style={{ width }} /></i></div>;
}

function Costs() {
  return (
    <section className="detail-panel full-panel">
      <div className="detail-panel__heading"><div><span className="eyebrow">CUSTOS CONFIRMADOS</span><h2>R$ 87.436,29 acumulados</h2><p>Gastos previstos não entram neste total.</p></div><Button variant="secondary" icon={<Download />}>Baixar lista</Button></div>
      <div className="cost-table">
        <div className="cost-table__head"><span>Data</span><span>Categoria</span><span>Fornecedor</span><span>Nota</span><span>Valor</span></div>
        {costs.map((cost) => <div className="cost-table__row" key={cost.date + cost.category}><time>{cost.date}</time><strong>{cost.category}</strong><span>{cost.supplier}</span><span>{cost.note ? <button aria-label="Abrir nota fiscal"><FileText /></button> : "—"}</span><b>{cost.value}</b></div>)}
      </div>
    </section>
  );
}

function LotPanel() {
  return (
    <div className="lot-panel-grid">
      <section className="detail-panel panel-highlight"><span className="eyebrow">QUANTO GASTEI</span><strong><i>R$</i> 87.436,29</strong><p>Confirmado desde a entrada do lote</p></section>
      <section className="detail-panel"><span className="eyebrow">POR ANIMAL ORIGINAL</span><strong><i>R$</i> 2.300,96</strong><p>R$ 87.436,29 ÷ 38 animais</p></section>
      <section className="detail-panel"><span className="eyebrow">POR MÊS NO LOTE</span><strong><i>R$</i> 2.760,66</strong><p>Média dos últimos 6 meses</p></section>
      <section className="detail-panel panel-highlight"><span className="eyebrow">QUANTO PODE SOBRAR</span><strong className="positive">+ <i>R$</i> 21.892,40</strong><p>Estimativa sobre custos diretos</p></section>
      <section className="detail-panel detail-panel--wide break-even">
        <div><span className="eyebrow">PONTO DE EQUILÍBRIO</span><h2>Você precisa receber pelo menos</h2><strong><i>R$</i> 2.300,96 <small>por animal</small></strong></div>
        <div className="scale-visual"><Scale /><span><i />Custo atual</span><b>Venda acima deste valor gera margem positiva.</b></div>
      </section>
    </div>
  );
}

function Sales({ onSale }: { onSale: () => void }) {
  return (
    <div className="sales-layout">
      <section className="detail-panel">
        <div className="detail-panel__heading"><div><span className="eyebrow">VENDA EM 28/10/2026</span><h2>7 animais vendidos</h2></div><span className="status-badge status-badge--stock">Concluída</span></div>
        <dl className="sale-numbers"><div><dt>Valor recebido</dt><dd>R$ 34.860,00</dd></div><div><dt>Custo apropriado</dt><dd>− R$ 16.106,72</dd></div><div><dt>Taxas da venda</dt><dd>− R$ 486,80</dd></div><div><dt>Margem sobre custos diretos</dt><dd>+ R$ 18.266,48</dd></div></dl>
      </section>
      <aside className="sale-cta"><TrendingUp /><h2>Quer vender mais animais?</h2><p>Simule com a cotação atual antes de decidir.</p><Button onClick={onSale}>Simular nova venda</Button><small>Cotação ilustrativa: R$ 321,40 / @</small></aside>
    </div>
  );
}

function History() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("tipo") || "Todos";
  const events = [
    { type: "Custos", date: "05 nov 2026", title: "Compra de suplemento", text: "Agropecuária Ponte Nova · R$ 2.184,70", icon: Wheat },
    { type: "Vendas", date: "28 out 2026", title: "Venda de 7 animais", text: "Margem sobre custos diretos: + R$ 18.266,48", icon: TrendingUp },
    { type: "Notas", date: "22 out 2026", title: "Nota fiscal anexada", text: "Medicamento · Vet Rural · R$ 786,45", icon: FileText },
    { type: "Custos", date: "06 out 2026", title: "Locação de pasto", text: "Custo confirmado · R$ 3.250,00", icon: CalendarClock },
  ];
  return (
    <section className="detail-panel full-panel">
      <div className="history-toolbar"><div><span className="eyebrow">TUDO EM ORDEM</span><h2>Histórico do lote</h2></div><label><Filter />Tipo<select value={filter} onChange={(event) => { const next = new URLSearchParams(params); next.set("tipo", event.target.value); setParams(next); }}><option>Todos</option><option>Custos</option><option>Notas</option><option>Vendas</option></select></label><label>Período<select value={params.get("periodo") || "Todo o período"} onChange={(event) => { const next = new URLSearchParams(params); next.set("periodo", event.target.value); setParams(next); }}><option>Todo o período</option><option>Últimos 30 dias</option><option>Este ano</option></select></label></div>
      <div className="timeline">
        {events.filter((event) => filter === "Todos" || event.type === filter).map(({ date, title, text, icon: Icon }) => <div key={title}><time>{date}</time><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p><ChevronRight /></div>)}
      </div>
    </section>
  );
}
