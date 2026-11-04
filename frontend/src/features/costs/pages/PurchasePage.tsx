import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  CalendarClock,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FileImage,
  ImagePlus,
  Info,
  Lock,
  Maximize2,
  Plus,
  RefreshCw,
  RotateCw,
  ScanLine,
  Split,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";
import { ReceiptMock } from "@/features/costs/pages/CostsPage";

type Source = "camera" | "gallery" | "none" | null;

export default function PurchasePage() {
  const navigate = useNavigate();
  const [source, setSource] = useState<Source>(null);
  const [step, setStep] = useState(1);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [split, setSplit] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function chooseSource(next: Source) {
    setSource(next);
    if (next === "none") { setStep(3); return; }
    setCompressing(true);
    setProgress(18);
    window.setTimeout(() => setProgress(68), 350);
    window.setTimeout(() => { setProgress(100); setCompressing(false); }, 800);
  }

  function restart() {
    setSource(null); setStep(1); setSaved(false); setSplit(false); setRecurring(false);
  }

  const hasPhoto = source === "camera" || source === "gallery";

  return (
    <AppShell>
      <div className="purchase-page">
        <header className="purchase-header">
          <button className="back-link" onClick={() => navigate("/fazenda/baixada/custos")}><ArrowLeft /> Voltar para custos</button>
          <div><span className="eyebrow">NOVA COMPRA</span><h1>Registrar compra</h1><p>Da nota ao custo do lote, sem complicação.</p></div>
          {!saved && <div className="purchase-progress"><span>Etapa {step} de 4</span><div>{[1,2,3,4].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}</div></div>}
        </header>

        {saved ? <Success onRestart={restart} onDone={() => navigate("/fazenda/baixada/custos")} /> : source === null ? (
          <SourceChoice onChoose={chooseSource} />
        ) : (
          <div className={`purchase-workspace ${!hasPhoto ? "purchase-workspace--no-photo" : ""}`}>
            {hasPhoto && <ReceiptAside onOpen={() => setPhotoOpen(true)} onRetake={() => setSource(null)} compact />}
            <motion.main className="purchase-form" key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              {compressing ? <Compressing progress={progress} /> : (
                <>
                  {step === 1 && <PhotoStep onNext={() => setStep(2)} onRetake={() => setSource(null)} />}
                  {step === 2 && <NoteDataStep onNext={() => setStep(3)} onBack={() => setStep(1)} />}
                  {step === 3 && <ItemsStep noPhoto={!hasPhoto} recurring={recurring} setRecurring={setRecurring} split={split} setSplit={setSplit} billOpen={billOpen} setBillOpen={setBillOpen} onNext={() => setStep(4)} onBack={() => setStep(hasPhoto ? 2 : 1)} onAttach={() => setSource("gallery")} />}
                  {step === 4 && <ReviewStep hasPhoto={hasPhoto} recurring={recurring} split={split} onBack={() => setStep(3)} onSave={() => { setSaved(true); setToast("Compra salva. O custo já entrou nos destinos escolhidos."); }} />}
                </>
              )}
            </motion.main>
          </div>
        )}
      </div>
      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="Foto da nota"><div className="receipt-fullscreen"><div className="receipt-photo"><ReceiptMock compact={false} /></div><div className="photo-tools"><Button variant="secondary" icon={<ZoomIn />}>Aproximar</Button><Button variant="secondary" icon={<RotateCw />}>Girar</Button></div></div></Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}

function SourceChoice({ onChoose }: { onChoose: (source: Source) => void }) {
  return (
    <section className="source-choice">
      <div className="source-choice__intro"><span className="eyebrow">COMO QUER COMEÇAR?</span><h2>A nota ajuda você a guardar cada detalhe</h2><p>Escolha uma opção. Você poderá revisar tudo antes de salvar.</p></div>
      <div className="source-grid">
        <button className="source-card source-card--featured" onClick={() => onChoose("camera")}><span><Camera /></span><div><strong>Tirar foto da nota</strong><small>Abra a câmera e enquadre o documento</small></div><ChevronRight /></button>
        <button className="source-card" onClick={() => onChoose("gallery")}><span><ImagePlus /></span><div><strong>Escolher da galeria</strong><small>Use uma foto que já está no aparelho</small></div><ChevronRight /></button>
        <button className="source-card" onClick={() => onChoose("none")}><span><FileImage /></span><div><strong>Lançar sem nota</strong><small>Registre o custo e anexe uma foto depois</small></div><ChevronRight /></button>
      </div>
      <div className="privacy-note"><Lock /><span><strong>Sua privacidade vem primeiro</strong><small>Só você vê as fotos das suas notas.</small></span></div>
      <button className="auto-read" disabled><ScanLine /><span><strong>Ler nota automaticamente</strong><small>Em breve</small></span></button>
    </section>
  );
}

function ReceiptAside({ onOpen, onRetake, compact }: { onOpen: () => void; onRetake: () => void; compact?: boolean }) {
  return <aside className={`receipt-aside ${compact ? "compact" : ""}`}><div className="receipt-aside__heading"><span><Eye /> NOTA SEMPRE À VISTA</span><button onClick={onOpen}><Maximize2 />Ampliar</button></div><button className="receipt-photo" onClick={onOpen}><ReceiptMock compact={false} /><span><ZoomIn /> Toque para ampliar</span></button><div className="receipt-aside__actions"><button onClick={onOpen}><RotateCw />Girar</button><button onClick={onRetake}><RefreshCw />Refazer</button></div><p><Lock /> Só você vê as fotos das suas notas.</p></aside>;
}

function Compressing({ progress }: { progress: number }) {
  return <div className="compressing" role="status" aria-live="polite"><span><FileImage /></span><h2>Reduzindo o tamanho da imagem…</h2><p>Assim a foto abre mais rápido, sem perder a leitura.</p><div><i style={{ transform: `scaleX(${progress / 100})` }} /></div><strong>{progress}%</strong></div>;
}

function StepHeading({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="purchase-step-heading"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>;
}

function PhotoStep({ onNext, onRetake }: { onNext: () => void; onRetake: () => void }) {
  return <><StepHeading number="01" title="Confira a foto" text="Veja se todas as informações estão nítidas antes de continuar." /><div className="photo-mobile-preview"><ReceiptMock compact={false} /></div><div className="framing-tip"><Info /><p><strong>Deixe a nota inteira na foto, com boa luz.</strong><small>Evite sombras e confira se o valor total aparece.</small></p></div><div className="form-footer"><Button variant="ghost" icon={<RefreshCw />} onClick={onRetake}>Refazer</Button><Button onClick={onNext}>Usar esta foto <ChevronRight /></Button></div></>;
}

function NoteDataStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [supplier, setSupplier] = useState("Agropecuária Ponte Nova");
  return <><StepHeading number="02" title="Dados da nota" text="Identifique a compra para encontrar esta nota facilmente depois." /><div className="form-section purchase-section"><div className="suggested-label"><RefreshCw /> Fornecedor usado recentemente</div><Field label="Fornecedor" autoComplete="organization" value={supplier} onChange={(event) => setSupplier(event.target.value)} list="suppliers" /><datalist id="suppliers"><option value="Agropecuária Ponte Nova" /><option value="Vet Rural" /><option value="Casa do Criador" /></datalist><div className="form-grid"><Field label="Data da compra" type="date" defaultValue="2026-11-05" /><Field label="Valor total" inputMode="decimal" autoComplete="off" defaultValue="2.400,00" suffix={<span className="field-suffix">R$</span>} /></div></div><div className="form-footer"><Button variant="ghost" onClick={onBack}>Voltar</Button><Button onClick={onNext}>Continuar <ChevronRight /></Button></div></>;
}

function ItemsStep({ noPhoto, recurring, setRecurring, split, setSplit, billOpen, setBillOpen, onNext, onBack, onAttach }: { noPhoto: boolean; recurring: boolean; setRecurring: (value: boolean) => void; split: boolean; setSplit: (value: boolean) => void; billOpen: boolean; setBillOpen: (value: boolean) => void; onNext: () => void; onBack: () => void; onAttach: () => void }) {
  return <><StepHeading number="03" title="Itens e custos" text="Diga o que foi comprado e para onde esse custo deve ir." />{noPhoto && <button className="attach-later" onClick={onAttach}><ImagePlus /><span><strong>Anexar foto agora</strong><small>Ou continue e anexe depois</small></span><ChevronRight /></button>}<div className="read-banner"><ScanLine /><span><strong>Confira os dados lidos da foto</strong><small>Preenchimento automático estará disponível em breve.</small></span><b>EM BREVE</b></div><section className="item-editor"><div className="item-editor__top"><span>ITEM 01</span><button aria-label="Excluir item"><Trash2 /></button></div><Field label="Descrição do item" autoComplete="off" defaultValue="Sal mineral proteinado" /><div className="suggested-label"><RefreshCw /> Sugerido pela última compra de Agropecuária Ponte Nova</div><div className="form-grid"><Field label="Valor" inputMode="decimal" autoComplete="off" defaultValue="2.184,70" suffix={<span className="field-suffix">R$</span>} /><label className="select-field"><span>Destino obrigatório</span><select defaultValue="Lote Safra 24"><option>Lote Safra 24</option><option>Lote Bezerros Sul</option><option>Boi 047</option></select></label></div><div className="category-choice"><span>Categoria</span><div>{["Ração","Suplemento","Medicamento"].map((category) => <button aria-pressed={category === "Suplemento"} className={category === "Suplemento" ? "active" : ""} key={category}>{category}</button>)}<button><Plus /> nova categoria</button></div></div><button aria-pressed={split} className={`split-button ${split ? "active" : ""}`} onClick={() => setSplit(!split)}><Split /><span><strong>Dividir entre lotes</strong><small>Cria um lançamento para cada lote</small></span><i>{split && <Check />}</i></button>{split && <div className="split-box"><label><input type="checkbox" defaultChecked />Lote Safra 24 <span>60% · R$ 1.310,82</span></label><label><input type="checkbox" defaultChecked />Lote Bezerros Sul <span>40% · R$ 873,88</span></label></div>}<label className="recurring-toggle"><span><strong>Compra recorrente</strong><small>Receba um lembrete para confirmar a próxima compra</small></span><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /><i /></label>{recurring && <div className="recurring-fields"><label className="select-field"><span>Periodicidade</span><select defaultValue="Mensal"><option>Semanal</option><option>Quinzenal</option><option>Mensal</option><option>Bimestral</option><option>Trimestral</option><option>Personalizada</option></select></label><Field label="Próxima data prevista" type="date" defaultValue="2026-12-05" /></div>}</section><Button variant="secondary" icon={<Plus />} className="add-item-button">Adicionar outro item</Button><div className="sum-warning"><Info /><span><strong>Falta lançar R$ 215,30</strong><small>Soma dos itens: R$ 2.184,70 · Total da nota: R$ 2.400,00</small></span><em>Isso não impede salvar</em></div><section className={`bill-section ${billOpen ? "open" : ""}`}><button aria-expanded={billOpen} onClick={() => setBillOpen(!billOpen)}><span><strong>Boleto desta nota</strong><small>Opcional · complemento</small></span><ChevronDown /></button>{billOpen && <div><Field label="Linha digitável" inputMode="numeric" autoComplete="off" placeholder="00000.00000 00000.000000..." /><div className="form-grid"><Field label="Valor do boleto" inputMode="decimal" autoComplete="off" defaultValue="2.400,00" /><Field label="Vencimento" type="date" defaultValue="2026-11-20" /></div></div>}</section><div className="form-footer"><Button variant="ghost" onClick={onBack}>Voltar</Button><Button onClick={onNext}>Revisar compra <ChevronRight /></Button></div></>;
}

function ReviewStep({ hasPhoto, recurring, split, onBack, onSave }: { hasPhoto: boolean; recurring: boolean; split: boolean; onBack: () => void; onSave: () => void }) {
  return <><StepHeading number="04" title="Revise e salve" text="Confira os lançamentos que entrarão no custo da propriedade." /><section className="review-card"><div className="review-note">{hasPhoto ? <div className="review-thumb"><ReceiptMock compact /></div> : <div className="review-no-photo"><FileImage /><span>Sem foto<small>Você pode anexar depois</small></span></div>}<div><span>FORNECEDOR</span><strong>Agropecuária Ponte Nova</strong><small>05/11/2026 · Total da nota R$ 2.400,00</small></div></div><div className="review-item"><span className="category-chip">Suplemento</span><p><strong>Sal mineral proteinado</strong><small>{split ? "Lote Safra 24 (60%) + Lote Bezerros Sul (40%)" : "Lote Safra 24"}{recurring && " · Mensal"}</small></p><b>R$ 2.184,70</b></div><div className="review-total"><span>Total dos lançamentos<small>Diferença para a nota: R$ 215,30</small></span><strong>R$ 2.184,70</strong></div></section><div className="save-note"><Check /><p><strong>Pronto para salvar</strong><small>O custo passa a contar imediatamente nos destinos escolhidos.</small></p></div><div className="form-footer"><Button variant="ghost" onClick={onBack}>Voltar e editar</Button><Button icon={<Check />} onClick={onSave}>Salvar compra</Button></div></>;
}

function Success({ onRestart, onDone }: { onRestart: () => void; onDone: () => void }) {
  return <motion.section className="purchase-success" initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }}><span><Check /></span><div className="eyebrow">COMPRA SALVA</div><h2>Tudo certo por aqui</h2><p>O custo de <strong>R$ 2.184,70</strong> já entrou no Lote Safra 24. A nota está guardada com segurança.</p><div className="success-summary"><div><CalendarClock /><span><small>Próxima previsão</small><strong>05/12/2026</strong></span></div><div><RefreshCw /><span><small>Recorrência</small><strong>Mensal</strong></span></div></div><div className="success-actions"><Button icon={<Plus />} onClick={onRestart}>Registrar outra</Button><Button variant="secondary" onClick={onDone}>Ver lançamentos</Button></div></motion.section>;
}
