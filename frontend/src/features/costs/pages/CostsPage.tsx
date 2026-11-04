import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Edit3,
  FileImage,
  FileText,
  Filter,
  MoreHorizontal,
  Paperclip,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";

const tabs = [
  ["lancamentos", "Lançamentos"],
  ["notas", "Notas"],
  ["confirmar", "A confirmar", "3"],
  ["projecao", "Projeção"],
  ["categorias", "Categorias"],
];

const entries = [
  { date: "05 nov", description: "Sal mineral proteinado", supplier: "Agropecuária Ponte Nova", category: "Suplemento", value: "2.184,70", destination: "Lote Safra 24", note: true, recurring: true },
  { date: "22 out", description: "Vacina contra clostridiose", supplier: "Vet Rural", category: "Medicamento", value: "786,45", destination: "Lote Safra 24", note: true, recurring: false },
  { date: "06 out", description: "Locação de pasto", supplier: "Carlos Andrade", category: "Locação", value: "3.250,00", destination: "Lote Bezerros Sul", note: false, recurring: true },
  { date: "19 set", description: "Ração de recria 18%", supplier: "Casa do Criador", category: "Ração", value: "4.832,18", destination: "Lote Safra 24", note: true, recurring: true },
  { date: "12 set", description: "Vermífugo 1L", supplier: "Vet Rural", category: "Medicamento", value: "342,80", destination: "Boi 047", note: true, recurring: false },
];

const receipts = [
  { supplier: "Agropecuária Ponte Nova", date: "05/11/2026", value: "R$ 2.184,70", count: 2, tone: "green" },
  { supplier: "Vet Rural", date: "22/10/2026", value: "R$ 786,45", count: 1, tone: "sand" },
  { supplier: "Casa do Criador", date: "19/09/2026", value: "R$ 4.832,18", count: 3, tone: "navy" },
  { supplier: "Posto Dois Irmãos", date: "02/09/2026", value: "R$ 640,00", count: 2, tone: "pale" },
];

export default function CostsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("aba") || "lancamentos";
  const query = params.get("busca") || "";
  const [detail, setDetail] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => entries.filter((item) => `${item.description} ${item.supplier} ${item.destination}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function changeTab(next: string) {
    setParams(next === "lancamentos" ? {} : { aba: next });
  }

  function updateQuery(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("busca", value); else next.delete("busca");
    setParams(next);
  }

  return (
    <AppShell>
      <div className="costs-page">
        <header className="section-heading costs-heading">
          <div><span className="eyebrow">DINHEIRO BEM CUIDADO</span><h1>Custos</h1><p>Registre gastos, organize notas e antecipe os próximos meses.</p></div>
          <Button icon={<Camera />} onClick={() => navigate("/fazenda/baixada/custos/nova-compra")}>Registrar compra</Button>
        </header>

        <nav className="cost-tabs" aria-label="Áreas de custos" role="tablist">
          {tabs.map(([key, label, count]) => <button role="tab" aria-selected={tab === key} key={key} className={tab === key ? "active" : ""} onClick={() => changeTab(key)}>{label}{count && <b>{count}</b>}</button>)}
        </nav>

        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
          {tab === "lancamentos" && <EntriesTab entries={filtered} query={query} setQuery={updateQuery} onOpen={setDetail} />}
          {tab === "notas" && <ReceiptsTab onOpen={setDetail} />}
          {tab === "confirmar" && <ConfirmTab onToast={setToast} />}
          {tab === "projecao" && <ProjectionTab />}
          {tab === "categorias" && <CategoriesTab onToast={setToast} />}
        </motion.div>
      </div>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.startsWith("nota") ? "Nota da compra" : "Detalhe do lançamento"}>
        {detail?.startsWith("nota") ? (
          <div className="receipt-detail">
            <ReceiptMock compact={false} />
            <div className="detail-kv"><span>Fornecedor<strong>Agropecuária Ponte Nova</strong></span><span>Data<strong>05/11/2026</strong></span><span>Total<strong>R$ 2.184,70</strong></span></div>
            <div className="linked-entry"><span><CircleDollarSign /></span><p><strong>Sal mineral proteinado</strong><small>Suplemento · Lote Safra 24</small></p><b>R$ 2.184,70</b></div>
            <div className="modal__actions"><Button variant="ghost" icon={<Trash2 />} onClick={() => setDeleteOpen(true)}>Excluir</Button><Button variant="secondary" icon={<RefreshCw />}>Trocar foto</Button><Button icon={<Edit3 />}>Editar</Button></div>
          </div>
        ) : (
          <div className="entry-detail">
            <div className="entry-detail__value"><span>VALOR CONFIRMADO</span><strong><i>R$</i> 2.184,70</strong></div>
            <div className="detail-kv"><span>Descrição<strong>Sal mineral proteinado</strong></span><span>Categoria<strong>Suplemento</strong></span><span>Destino<strong>Lote Safra 24</strong></span><span>Fornecedor<strong>Agropecuária Ponte Nova</strong></span><span>Data<strong>05/11/2026</strong></span><span>Recorrência<strong>Mensal</strong></span></div>
            <button className="origin-note" onClick={() => setDetail("nota-1")}><FileImage /><span><strong>Ver nota de origem</strong><small>1 foto anexada</small></span><ChevronRight /></button>
            <div className="modal__actions"><Button variant="ghost" icon={<Trash2 />} onClick={() => setDeleteOpen(true)}>Excluir</Button><Button icon={<Edit3 />}>Editar lançamento</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir este registro?">
        <p className="modal-copy">Esta ação não pode ser desfeita. Os totais do lote serão recalculados automaticamente.</p>
        <div className="modal__actions"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancelar</Button><Button variant="danger" onClick={() => { setDeleteOpen(false); setDetail(null); setToast("Registro excluído e totais atualizados."); }}>Sim, excluir</Button></div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

function EntriesTab({ entries: rows, query, setQuery, onOpen }: { entries: typeof entries; query: string; setQuery: (value: string) => void; onOpen: (id: string) => void }) {
  return (
    <>
      <section className="cost-summary">
        <div><span>Total confirmado no filtro</span><strong><i>R$</i> 11.396,13</strong><small>5 lançamentos confirmados</small></div>
        <div><span>Média por lançamento</span><strong><i>R$</i> 2.279,23</strong><small>No período selecionado</small></div>
        <div><span>Maior categoria</span><strong>Ração</strong><small>42,4% do total</small></div>
      </section>
      <section className="cost-toolbar">
        <label className="search-box"><span className="sr-only">Buscar lançamentos</span><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar descrição, fornecedor ou destino" />{query && <button onClick={() => setQuery("")} aria-label="Limpar"><X /></button>}</label>
        <div className="cost-filter-row">
          {["Período", "Fornecedor", "Categoria", "Lote", "Com nota", "Recorrente"].map((filter, index) => <button key={filter} className={index === 0 ? "active" : ""}>{filter}{index === 0 && <span>Este ano</span>}<Filter /></button>)}
        </div>
        <label className="cost-order">Ordenar<select defaultValue="recentes"><option value="recentes">Mais recentes</option><option>Maior valor</option><option>Menor valor</option></select></label>
      </section>
      <div className="entry-list">
        {rows.map((item, index) => (
          <motion.button className="entry-row" key={item.description} onClick={() => onOpen(String(index))} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
            <time>{item.date}</time>
            <span className="entry-icon"><CircleDollarSign /></span>
            <span className="entry-main"><strong>{item.description}</strong><small>{item.supplier}</small></span>
            <span className="category-chip">{item.category}</span>
            <span className="entry-destination">{item.destination}</span>
            <span className="entry-flags">{item.note && <FileText aria-label="Tem nota" />}{item.recurring && <RefreshCw aria-label="Recorrente" />}</span>
            <b><i>$</i> {item.value}</b><ChevronRight />
          </motion.button>
        ))}
      </div>
    </>
  );
}

function ReceiptsTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  return (
    <>
      <section className="gallery-toolbar">
        <div><span className="eyebrow">ARQUIVO DIGITAL</span><h2>Suas notas em um só lugar</h2><p>4 notas · R$ 8.443,33 em compras</p></div>
        <div className="gallery-actions"><button className="filter-chip active">Este ano</button><button className="filter-chip">Fornecedor</button><button className="filter-chip">Valor</button><div className="view-toggle"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><FileImage /></button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><ReceiptText /></button></div></div>
      </section>
      <div className={`receipt-gallery receipt-gallery--${view}`}>
        {receipts.map((receipt, index) => <button className="receipt-card" key={receipt.supplier} onClick={() => onOpen(`nota-${index}`)}><div className={`receipt-card__image tone-${receipt.tone}`}><ReceiptMock compact /><span><FileText /> {receipt.count} {receipt.count === 1 ? "lançamento" : "lançamentos"}</span></div><div className="receipt-card__body"><p><strong>{receipt.supplier}</strong><small>{receipt.date}</small></p><b>{receipt.value}</b><ChevronRight /></div></button>)}
      </div>
    </>
  );
}

function ConfirmTab({ onToast }: { onToast: (message: string) => void }) {
  const [items, setItems] = useState([
    { title: "Ração mensal", destination: "Lote Safra 24", date: "05/11", value: "R$ 4.680,00", category: "Ração" },
    { title: "Sal mineral proteinado", destination: "Lote Bezerros Sul", date: "12/11", value: "R$ 1.240,00", category: "Suplemento" },
    { title: "Locação de pasto", destination: "Lote Safra 24", date: "15/11", value: "R$ 3.250,00", category: "Locação" },
  ]);
  function remove(title: string, message: string) { setItems(items.filter((item) => item.title !== title)); onToast(message); }
  return (
    <div className="confirm-layout">
      <aside className="confirm-notice"><CalendarClock /><div><strong>Previstos só entram no custo depois que você confirma.</strong><p>Confira data e valor antes de confirmar. Você pode pular sem encerrar a recorrência.</p></div></aside>
      <div className="pending-list">
        {items.map((item) => <article className="pending-card" key={item.title}><div className="pending-date"><span>PREVISTO</span><strong>{item.date}</strong></div><div className="pending-main"><span className="category-chip">{item.category}</span><h2>{item.title}</h2><p>{item.destination}</p></div><strong className="pending-value">{item.value}</strong><div className="pending-actions"><Button icon={<Check />} onClick={() => remove(item.title, "Compra confirmada. Agora ela já conta no custo.")}>Confirmar</Button><Button variant="secondary" icon={<Edit3 />}>Editar valor/data</Button><button onClick={() => remove(item.title, "Previsão pulada desta vez.")}><SkipForward />Pular desta vez</button><button onClick={() => remove(item.title, "Recorrência encerrada.")}><X />Encerrar recorrência</button></div></article>)}
        {items.length === 0 && <div className="no-results"><Check /><h2>Tudo confirmado por aqui</h2><p>Não há compras recorrentes aguardando sua revisão.</p></div>}
      </div>
    </div>
  );
}

function ProjectionTab() {
  const [params, setParams] = useSearchParams();
  const months = params.get("meses") || "6";
  const lot = params.get("lote") || "Todos os lotes";
  function update(key: string, value: string) { const next = new URLSearchParams(params); next.set(key, value); setParams(next); }
  return (
    <>
      <section className="projection-hero"><div><span className="eyebrow">PREVISÃO · PRÓXIMOS {months} MESES</span><h2><i>R$</i> {months === "3" ? "27.640,00" : months === "6" ? "54.980,00" : "108.720,00"}</h2><p>Total previsto — não entra no custo confirmado</p></div><div className="period-switch" role="group" aria-label="Período da projeção">{["3","6","12"].map((item) => <button aria-pressed={months === item} className={months === item ? "active" : ""} onClick={() => update("meses", item)} key={item}>{item} meses</button>)}</div><label className="filter-chip">{lot}<select aria-label="Filtrar projeção por lote" value={lot} onChange={(event) => update("lote",event.target.value)}><option>Todos os lotes</option><option>Lote Safra 24</option><option>Lote Bezerros Sul</option></select></label></section>
      <section className="projection-panel">
        <div className="projection-chart">
          {[["Nov",72],["Dez",88],["Jan",63],["Fev",78],["Mar",59],["Abr",84]].map(([month, height], index) => <div className="projection-column" key={month}><div className="stack" style={{ height: `${height}%` }}><i /><i /><i /><i /></div><strong>{month}</strong><small>R$ {index % 2 ? "10,2 mil" : "8,4 mil"}</small></div>)}
        </div>
        <div className="projection-legend"><span><i />Ração</span><span><i />Suplemento</span><span><i />Locação</span><span><i />Medicamento</span></div>
      </section>
      <section className="recurring-list"><div className="detail-panel__heading"><div><span className="eyebrow">BASE DA PROJEÇÃO</span><h2>Compras recorrentes</h2><p>Esta previsão considera apenas as compras que você marcou como recorrentes.</p></div></div>{[["Ração mensal","Lote Safra 24","Mensal","R$ 4.680,00"],["Sal mineral proteinado","Lote Bezerros Sul","Mensal","R$ 1.240,00"],["Locação de pasto","Lote Safra 24","Bimestral","R$ 3.250,00"]].map((row) => <div key={row[0]}><span><RefreshCw /></span><p><strong>{row[0]}</strong><small>{row[1]}</small></p><em>{row[2]}</em><b>{row[3]}</b><button className="icon-button"><MoreHorizontal /></button></div>)}</section>
    </>
  );
}

function CategoriesTab({ onToast }: { onToast: (message: string) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const categories = [["Ração","42 lançamentos","green"],["Suplemento","31 lançamentos","olive"],["Medicamento","18 lançamentos","sand"],["Locação","9 lançamentos","navy"],["Manutenção","6 lançamentos","gray"]];
  return (
    <>
      <section className="gallery-toolbar"><div><span className="eyebrow">ORGANIZAÇÃO</span><h2>Categorias de custo</h2><p>Use cores para reconhecer rapidamente cada tipo de gasto.</p></div><Button icon={<Plus />} onClick={() => setAddOpen(true)}>Nova categoria</Button></section>
      <div className="category-manager">{categories.map(([name,count,color]) => <div key={name}><span className={`category-color category-color--${color}`} /><p><strong>{name}</strong><small>{count}</small></p><button className="icon-button" aria-label={`Editar ${name}`}><Edit3 /></button><button className="icon-button danger-icon" aria-label={`Excluir ${name}`} onClick={() => onToast(`${name} está em ${count}. Mova os lançamentos antes de excluir.`)}><Trash2 /></button></div>)}</div>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova categoria"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setAddOpen(false); onToast("Categoria criada com sucesso."); }}><Field label="Nome da categoria" name="category" placeholder="Ex.: Combustível" required /><label className="color-picker"><span>Escolha uma cor</span><div>{["green","olive","sand","navy","gray"].map((color, index) => <button type="button" className={`category-color category-color--${color} ${index === 0 ? "active" : ""}`} key={color} aria-label={`Cor ${color}`} />)}</div></label><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button><Button type="submit">Criar categoria</Button></div></form></Modal>
    </>
  );
}

export function ReceiptMock({ compact }: { compact: boolean }) {
  return <div className={`receipt-mock ${compact ? "receipt-mock--compact" : ""}`}><div className="receipt-mock__logo">APN</div><strong>AGROPECUÁRIA PONTE NOVA</strong><small>CNPJ 18.043.221/0001-09</small><i /><p>01 SAL MINERAL PROTEINADO</p><p>02 SACOS 30KG</p><i /><b>TOTAL R$ 2.184,70</b><small>05/11/2026 09:42</small><div className="receipt-bars">|||| ||| |||| || |||||</div></div>;
}
