import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  BarChart3,
  Beef,
  ChevronDown,
  CircleDollarSign,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, StateView } from "@/shared/ui/UI";

type Animal = {
  name: string;
  kind: "Lote" | "Individual";
  breed: string;
  age: string;
  location: string;
  balance: string;
  cost: string;
  status: "Em estoque" | "Vendido parcial" | "Vendido";
  property: string;
};

const animals: Animal[] = [
  { name: "Lote Safra 24", kind: "Lote", breed: "Nelore", age: "22 meses", location: "Piquete da Serra", balance: "31 de 38", cost: "R$ 2.300,96", status: "Vendido parcial", property: "Fazenda da Baixada" },
  { name: "Lote Bezerros Sul", kind: "Lote", breed: "Nelore cruzado", age: "11 meses", location: "Pasto do Córrego", balance: "22 de 22", cost: "R$ 1.486,72", status: "Em estoque", property: "Fazenda da Baixada" },
  { name: "Boi 047", kind: "Individual", breed: "Nelore", age: "29 meses", location: "Piquete 3", balance: "1 de 1", cost: "R$ 3.187,43", status: "Em estoque", property: "Fazenda da Baixada" },
  { name: "Lote Recria 23", kind: "Lote", breed: "Angus x Nelore", age: "34 meses", location: "Pasto Alto", balance: "0 de 19", cost: "R$ 3.041,18", status: "Vendido", property: "Sítio Serra Bonita" },
];

const filterOptions = {
  status: ["Em estoque", "Vendido parcial", "Vendido"],
  mode: ["Lote", "Individual"],
  location: ["Piquete da Serra", "Pasto do Córrego", "Piquete 3", "Pasto Alto"],
};

export default function HerdPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"cards" | "list">((params.get("visual") as "cards" | "list") || "cards");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = params.get("busca") || "";
  const status = params.get("status") || "";
  const mode = params.get("modo") || "";
  const location = params.get("local") || "";
  const forcedState = params.get("estado");

  const filtered = useMemo(() => animals.filter((item) => {
    const searchMatch = `${item.name} ${item.breed} ${item.location}`.toLowerCase().includes(query.toLowerCase());
    return searchMatch && (!status || item.status === status) && (!mode || item.kind === mode) && (!location || item.location === location);
  }), [query, status, mode, location]);

  const groups = Array.from(new Set(filtered.map((item) => item.property)));
  const activeCount = [status, mode, location, params.get("periodo")].filter(Boolean).length;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (view === "list") next.set("visual", "list");
    setParams(next);
  }

  return (
    <AppShell>
      <div className="herd-page">
        <header className="section-heading">
          <div><span className="eyebrow">SEU GADO</span><h1>Rebanho</h1><p>Acompanhe cada animal e lote, do início até a venda.</p></div>
          <Button icon={<Plus />} onClick={() => navigate("/fazenda/baixada/rebanho/novo")}>Novo animal ou lote</Button>
        </header>

        {forcedState === "empty" ? <StateView type="empty" onRetry={() => navigate("/fazenda/baixada/rebanho/novo")} /> : (
          <>
            <section className="herd-tools" aria-label="Busca e filtros">
              <label className="search-box">
                <span className="sr-only">Buscar no rebanho</span><Search />
                <input value={query} onChange={(event) => update("busca", event.target.value)} placeholder="Buscar por nome, raça ou local" />
                {query && <button onClick={() => update("busca", "")} aria-label="Limpar busca"><X /></button>}
              </label>
              <div className={`filter-chips ${filtersOpen ? "filter-chips--open" : ""}`}>
                <FilterSelect label="Status" value={status} options={filterOptions.status} onChange={(value) => update("status", value)} />
                <FilterSelect label="Período" value={params.get("periodo") || ""} options={["Últimos 30 dias", "Este ano", "Todo o período"]} onChange={(value) => update("periodo", value)} />
                <FilterSelect label="Registro" value={mode} options={filterOptions.mode} onChange={(value) => update("modo", value)} />
                <FilterSelect label="Local" value={location} options={filterOptions.location} onChange={(value) => update("local", value)} />
                <button className="mobile-filter-button" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Filtros {activeCount > 0 && <b>{activeCount}</b>}</button>
                {activeCount > 0 && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}
              </div>
              <div className="view-toggle" aria-label="Modo de visualização">
                <button className={view === "cards" ? "active" : ""} onClick={() => { setView("cards"); update("visual", ""); }} aria-label="Ver cartões"><LayoutGrid /></button>
                <button className={view === "list" ? "active" : ""} onClick={() => { setView("list"); update("visual", "list"); }} aria-label="Ver lista"><List /></button>
              </div>
            </section>

            <div className="results-line">
              <span><strong>{filtered.length}</strong> {filtered.length === 1 ? "resultado" : "resultados"}</span>
              <label>Ordenar por <select value={params.get("ordem") || "recentes"} onChange={(event) => update("ordem", event.target.value)}><option value="recentes">Mais recentes</option><option value="nome">Nome</option><option value="custo">Maior custo</option></select></label>
            </div>

            {filtered.length === 0 ? (
              <div className="no-results"><Search /><h2>Nenhum resultado para o filtro</h2><p>Tente remover algum filtro ou buscar por outro nome.</p><Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button></div>
            ) : groups.map((property) => {
              const isCollapsed = collapsed.includes(property);
              return (
                <section className="herd-group" key={property}>
                  <button className="herd-group__heading" onClick={() => setCollapsed(isCollapsed ? collapsed.filter((item) => item !== property) : [...collapsed, property])}>
                    <span><img src="/assets/fazenda-baixada-logo.png" width="36" height="36" alt="" /><strong>{property}</strong><small>{filtered.filter((item) => item.property === property).length} registros</small></span>
                    <ChevronDown className={isCollapsed ? "rotated" : ""} />
                  </button>
                  {!isCollapsed && (
                    <motion.div className={`herd-items herd-items--${view}`} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: .06 } } }}>
                      {filtered.filter((item) => item.property === property).map((item) => <HerdCard key={item.name} item={item} view={view} onOpen={() => navigate("/fazenda/baixada/rebanho/lote-safra-24")} onPanel={() => navigate("/fazenda/baixada/rebanho/lote-safra-24/painel")} />)}
                    </motion.div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className={`filter-chip ${value ? "active" : ""}`}><span>{value || label}</span><ChevronDown /><select aria-label={`Filtrar por ${label}`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{label}: todos</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function HerdCard({ item, view, onOpen, onPanel }: { item: Animal; view: "cards" | "list"; onOpen: () => void; onPanel: () => void }) {
  return (
    <motion.article className="herd-card" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
      <button className="herd-card__main" onClick={onOpen}>
        <div className="herd-card__top"><span className="kind-badge"><Tags />{item.kind}</span><span className={`status-badge status-badge--${item.status === "Vendido" ? "sold" : item.status === "Vendido parcial" ? "partial" : "stock"}`}>{item.status}</span></div>
        <h2>{item.name}</h2>
        <div className="herd-meta"><span>{item.breed}</span><span>{item.age}</span><span><MapPin />{item.location}</span></div>
        <dl><div><dt>Saldo</dt><dd>{item.balance}</dd></div><div><dt>Custo por animal</dt><dd><i>R$</i> {item.cost.replace("R$ ", "")}</dd></div></dl>
      </button>
      <div className="herd-actions">
        <button><CircleDollarSign />Custos</button><button onClick={onPanel}><BarChart3 />Painel</button><button><Beef />Vender</button>
      </div>
    </motion.article>
  );
}
