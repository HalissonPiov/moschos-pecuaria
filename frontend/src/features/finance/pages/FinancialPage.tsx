import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Info,
  ReceiptText,
  Scale,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Modal } from "@/shared/ui/UI";

const categories = [
  { name: "Suplemento", value: "R$ 33.224,18", percent: "38%", color: "dark" },
  { name: "Locação de pasto", value: "R$ 23.608,00", percent: "27%", color: "green" },
  { name: "Ração", value: "R$ 15.741,47", percent: "18%", color: "sand" },
  { name: "Medicamento", value: "R$ 8.963,64", percent: "10%", color: "pale" },
  { name: "Outros", value: "R$ 5.899,00", percent: "7%", color: "gray" },
];

export default function FinancialPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lot = params.get("lote") || "Lote Safra 24";
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <AppShell>
      <div className="financial-page">
        <button className="back-link" onClick={() => navigate("/fazenda/baixada/rebanho/lote-safra-24")}><ArrowLeft /> Voltar para o lote</button>
        <header className="financial-header">
          <div><span className="eyebrow">PAINEL FINANCEIRO</span><h1>Quanto custa e quanto pode sobrar</h1><p>Todos os números abaixo são exclusivos do lote selecionado.</p></div>
          <label className="lot-selector"><span>Lote analisado</span><strong>{lot}</strong><small>31 de 38 animais em estoque</small><ChevronDown /><select value={lot} onChange={(event) => { const next = new URLSearchParams(params); next.set("lote", event.target.value); setParams(next); }}><option>Lote Safra 24</option><option>Lote Bezerros Sul</option><option>Boi 047</option></select></label>
        </header>

        <section className="financial-kpis">
          <article><span>Custo total confirmado</span><strong><i>R$</i> 87.436,29</strong><small>Desde 18/01/2024</small></article>
          <article className="featured"><span>Quanto ficou por animal</span><strong><i>R$</i> 2.300,96</strong><small>Custo total ÷ 38 animais originais</small></article>
          <article><span>Custo previsto</span><strong><i>R$</i> 12.840,00</strong><small>Próximos 3 meses · ainda não confirmado</small></article>
        </section>

        <div className="financial-grid">
          <section className="finance-panel category-composition">
            <div className="finance-panel__heading"><div><span className="eyebrow">COMPOSIÇÃO</span><h2>De onde vem o custo</h2></div><button className="text-link" onClick={() => navigate("/fazenda/baixada/custos")}>Ver lançamentos</button></div>
            <div className="composition-layout">
              <div className="finance-donut"><div><strong>R$ 87,4 mil</strong><small>confirmado</small></div></div>
              <div className="composition-list">{categories.map((item) => <button key={item.name} onClick={() => setNoteOpen(true)}><i className={`tone-${item.color}`} /><span><strong>{item.name}</strong><small>{item.percent} do custo · {item.percent === "38%" ? "29% da receita" : "peso no resultado"}</small></span><b>{item.value}</b><FileText /></button>)}</div>
            </div>
          </section>

          <section className="finance-panel balance-panel">
            <div className="finance-panel__heading"><div><span className="eyebrow">PREÇO MÍNIMO</span><h2>Arroba de equilíbrio</h2></div><Scale /></div>
            <strong><i>R$</i> 248,70 <small>/ @</small></strong>
            <p>Preço mínimo estimado da arroba para cobrir os custos diretos deste lote.</p>
            <div><Info /><span>Premissa simples: 31 animais, 19,8 @ por cabeça e rendimento de carcaça de 52%.</span></div>
          </section>

          <section className="finance-panel finance-chart-panel">
            <div className="finance-panel__heading"><div><span className="eyebrow">EVOLUÇÃO</span><h2>Custo acumulado por animal</h2><p>Comparado à cotação de referência RF10.</p></div><div className="line-legend"><span><i />Custo/animal</span><span><i />Cotação RF10</span></div></div>
            <div className="finance-line-chart">
              <div className="chart-labels"><span>R$ 2.500</span><span>R$ 1.250</span><span>R$ 0</span></div>
              <svg viewBox="0 0 800 220" role="img" aria-label="Evolução do custo por animal e cotação de referência">
                <path className="finance-gridline" d="M0 25H800M0 105H800M0 185H800" />
                <path className="finance-area" d="M0 180 C100 170 110 155 200 145 S320 118 400 109 S520 75 600 66 S710 40 800 30 L800 200 L0 200Z" />
                <path className="finance-cost-line" d="M0 180 C100 170 110 155 200 145 S320 118 400 109 S520 75 600 66 S710 40 800 30" />
                <path className="finance-quote-line" d="M0 76 C130 70 190 92 280 82 S450 65 540 73 S690 55 800 61" />
              </svg>
              <div className="chart-months"><span>Jan</span><span>Mar</span><span>Mai</span><span>Jul</span><span>Set</span><span>Nov</span></div>
            </div>
          </section>

          <section className="finance-panel margin-panel">
            <div className="finance-panel__heading"><div><span className="eyebrow">SOBRE CUSTOS DIRETOS</span><h2>Margem das vendas</h2></div></div>
            <div className="margin-total"><span>Margem líquida total</span><strong>+ R$ 18.266,48</strong><small>Sobre custos diretos · 7 animais vendidos</small></div>
            <div className="sale-margin-row"><span><TrendingUp /></span><p><strong>Venda para Frigorífico União</strong><small>28/10/2026 · 7 animais</small></p><div><small>Bruta · custos diretos</small><b>R$ 18.753,28</b></div><div><small>Líquida · custos diretos</small><b>R$ 18.266,48</b></div><ChevronRight /></div>
          </section>

          <section className="finance-panel forecast-panel">
            <div className="finance-panel__heading"><div><span className="eyebrow">NÃO ENTRA NO CUSTO AINDA</span><h2>Próximos meses</h2></div><CalendarClock /></div>
            {[["Dezembro","R$ 5.920,00"],["Janeiro","R$ 3.460,00"],["Fevereiro","R$ 3.460,00"]].map(([month,value]) => <div className="forecast-row" key={month}><span>{month}</span><i><b /></i><strong>{value}</strong></div>)}
            <button className="text-link" onClick={() => navigate("/fazenda/baixada/custos?aba=projecao")}>Abrir projeção completa</button>
          </section>
        </div>

        <div className="finance-actions"><Button variant="secondary" icon={<CircleDollarSign />} onClick={() => navigate("/fazenda/baixada/vendas?aba=simulador")}>Simular venda</Button><Button icon={<TrendingUp />} onClick={() => navigate("/fazenda/baixada/vendas?acao=registrar")}>Registrar venda</Button></div>
      </div>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Origem deste custo">
        <div className="note-origin-list"><div><span><ReceiptText /></span><p><strong>Agropecuária Ponte Nova</strong><small>05/11/2026 · Sal mineral proteinado</small></p><b>R$ 2.184,70</b><ExternalLink /></div><div><span><ReceiptText /></span><p><strong>Casa do Criador</strong><small>19/09/2026 · Suplementação</small></p><b>R$ 4.832,18</b><ExternalLink /></div></div>
      </Modal>
    </AppShell>
  );
}
