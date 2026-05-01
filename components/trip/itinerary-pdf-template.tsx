"use client"

import type { TripResult } from "@/types/trip"

type PdfBreakdownItem = {
  label: string
  total: string
  perPerson: string
}

type PdfDetailedDay = {
  title: string
  description: string
}

export function ItineraryPdfTemplate({
  destination,
  estimatedCost,
  originSubtitle,
  periodLabel,
  isSuggestedPeriod,
  periodReason,
  startDate,
  endDate,
  durationLabel,
  durationDays,
  travelersLabel,
  selectedVariantLabel,
  costPerPerson,
  currency,
  breakdown,
  assumptions,
  summary,
  itinerary,
  detailedItinerary,
  insights,
  whyThisTrip,
  attentionPoints,
}: {
  destination: TripResult["destination"]
  estimatedCost: TripResult["estimatedCost"]
  originSubtitle: string
  periodLabel?: TripResult["periodLabel"]
  isSuggestedPeriod?: boolean
  periodReason?: string
  startDate?: string
  endDate?: string
  durationLabel?: TripResult["durationLabel"]
  durationDays: number
  travelersLabel: string
  selectedVariantLabel: string
  costPerPerson: string
  currency: "BRL"
  breakdown: PdfBreakdownItem[]
  assumptions: string
  summary: string
  itinerary: TripResult["itinerary"]
  detailedItinerary: PdfDetailedDay[]
  insights: string[]
  whyThisTrip: string[]
  attentionPoints: string[]
}) {
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())

  function normalizePdfText(value: string) {
    return value
      .replaceAll("historico", "hist\u00f3rico")
      .replaceAll("hist\u00c3\u00b3rico", "hist\u00f3rico")
      .replaceAll("programacao", "programa\u00e7\u00e3o")
      .replaceAll("programa\u00c3\u00a7\u00c3\u00a3o", "programa\u00e7\u00e3o")
      .replaceAll("cafe", "caf\u00e9")
      .replaceAll("caf\u00c3\u00a9", "caf\u00e9")
      .replaceAll("almoco", "almo\u00e7o")
      .replaceAll("almo\u00c3\u00a7o", "almo\u00e7o")
      .replaceAll("proxima", "pr\u00f3xima")
      .replaceAll("pr\u00c3\u00b3xima", "pr\u00f3xima")
      .replaceAll("experiencia", "experi\u00eancia")
      .replaceAll("experi\u00c3\u00aancia", "experi\u00eancia")
      .replaceAll("antecedencia", "anteced\u00eancia")
      .replaceAll("anteced\u00c3\u00aancia", "anteced\u00eancia")
      .replaceAll("preco", "pre\u00e7o")
      .replaceAll("pre\u00c3\u00a7o", "pre\u00e7o")
      .replaceAll("sugestao", "sugest\u00e3o")
      .replaceAll("sugest\u00c3\u00a3o", "sugest\u00e3o")
      .replaceAll("Observa\u00c3\u00a7\u00c3\u00b5es", "Observa\u00e7\u00f5es")
      .replaceAll("voc\u00c3\u00aa", "voc\u00ea")
      .replaceAll("prefer\u00c3\u00aancias", "prefer\u00eancias")
      .replaceAll("\u00c3\u00banica", "\u00fanica")
      .replaceAll("\u00e2\u20ac\u00a2", "\u2022")
      .replaceAll("\u00e2\u20ac\u201d", "\u2014")
  }

  const safePeriod = periodLabel ?? "Per\u00edodo n\u00e3o informado"
  const safePeriodReason = periodReason ?? "Período ainda não definido para a viagem."
  const safeDates = startDate && endDate ? `${startDate} a ${endDate}` : startDate ?? endDate ?? "Não informado"
  const safeDuration = durationLabel ?? `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`

  const printStyles = {
    page: {
      width: "794px",
      backgroundColor: "#ffffff",
      color: "#17324d",
      fontFamily: "Arial, Helvetica, sans-serif",
      paddingBottom: "28px",
    },
    hero: {
      position: "relative" as const,
      padding: "34px 36px 28px",
      background: "linear-gradient(90deg, #1fc4dd 0%, #2468f2 100%)",
      overflow: "hidden",
    },
    heroBubble: {
      position: "absolute" as const,
      right: "-22px",
      top: "-26px",
      width: "132px",
      height: "132px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.08)",
    },
    heroBubbleTwo: {
      position: "absolute" as const,
      right: "22px",
      top: "18px",
      width: "78px",
      height: "78px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.05)",
    },
    logo: {
      display: "block",
      margin: "0 auto 18px",
      width: "72px",
      height: "auto",
    },
    heroTitle: {
      color: "#ffffff",
      textAlign: "center" as const,
      fontSize: "15px",
      fontWeight: 700,
      margin: 0,
    },
    heroDate: {
      color: "rgba(255,255,255,0.92)",
      textAlign: "center" as const,
      fontSize: "12px",
      marginTop: "10px",
    },
    body: {
      padding: "16px",
      background: "#f8fafc",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #e3ebf4",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: "14px",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      breakInside: "avoid" as const,
      pageBreakInside: "avoid" as const,
    },
    sectionTitleRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "12px",
    },
    sectionDot: {
      width: "18px",
      height: "18px",
      borderRadius: "999px",
      background: "#12b8ea",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: 700,
      flexShrink: 0,
    },
    sectionTitle: {
      margin: 0,
      color: "#15324f",
      fontSize: "18px",
      fontWeight: 700,
    },
    paragraph: {
      margin: 0,
      color: "#42566f",
      fontSize: "13px",
      lineHeight: 1.7,
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "12px",
      marginTop: "14px",
    },
    metaItem: {
      background: "#f7fafc",
      borderRadius: "12px",
      padding: "10px 12px",
      minHeight: "68px",
    },
    metaTitle: {
      color: "#8b9aad",
      fontSize: "11px",
      marginBottom: "6px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
    },
    metaValue: {
      color: "#17324d",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: 1.4,
    },
    itineraryGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "10px",
    },
    itineraryChip: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      borderRadius: "12px",
      background: "#f7fafc",
      padding: "12px",
      minHeight: "48px",
    },
    itemNumber: {
      width: "22px",
      height: "22px",
      borderRadius: "999px",
      background: "#12b8ea",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: 700,
      flexShrink: 0,
    },
    itineraryText: {
      color: "#253b56",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1.45,
    },
    fullDay: {
      display: "flex",
      gap: "12px",
      marginBottom: "14px",
      alignItems: "flex-start",
    },
    fullDayIcon: {
      width: "22px",
      height: "22px",
      borderRadius: "999px",
      background: "#12b8ea",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: 700,
      flexShrink: 0,
      marginTop: "2px",
    },
    fullDayTitle: {
      margin: "0 0 4px",
      color: "#15324f",
      fontSize: "13px",
      fontWeight: 700,
    },
    fullDayText: {
      margin: 0,
      color: "#4c5f76",
      fontSize: "12px",
      lineHeight: 1.65,
    },
    list: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "grid",
      gap: "10px",
    },
    listItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      color: "#29506e",
      fontSize: "12px",
      lineHeight: 1.6,
      background: "#f7fafc",
      borderRadius: "12px",
      padding: "12px",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "12px 18px 0",
      color: "#6f8097",
      fontSize: "10px",
      lineHeight: 1.6,
      breakInside: "avoid" as const,
      pageBreakInside: "avoid" as const,
    },
  }

  return (
    <div data-pdf-root="true" style={printStyles.page}>
      <div style={printStyles.hero}>
        <div style={printStyles.heroBubble} />
        <div style={printStyles.heroBubbleTwo} />
        <img src="/images/vuei-logo.png" alt="VUEI" style={printStyles.logo} />
        <p style={printStyles.heroTitle}>Roteiro personalizado gerado com VUEI</p>
        <div style={printStyles.heroDate}>{today}</div>
      </div>

      <div style={printStyles.body}>
        <section data-pdf-section="meta" style={printStyles.card}>
          <div style={printStyles.metaTitle}>{normalizePdfText(originSubtitle)}</div>
          <p style={{ ...printStyles.paragraph, fontStyle: "italic" }}>{`"${normalizePdfText(summary)}"`}</p>

          <div style={printStyles.metaGrid}>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Destino</div>
              <div style={printStyles.metaValue}>{destination}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>{isSuggestedPeriod ? "Período recomendado" : "Período informado"}</div>
              <div style={printStyles.metaValue}>{safePeriod}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Datas</div>
              <div style={printStyles.metaValue}>{safeDates}</div>
            </div>
          </div>

          <div style={printStyles.metaGrid}>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Duração</div>
              <div style={printStyles.metaValue}>{safeDuration}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Viajantes</div>
              <div style={printStyles.metaValue}>{travelersLabel}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Opção</div>
              <div style={printStyles.metaValue}>{selectedVariantLabel}</div>
            </div>
          </div>

          <div style={printStyles.metaGrid}>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Custo total</div>
              <div style={printStyles.metaValue}>{estimatedCost}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Por pessoa</div>
              <div style={printStyles.metaValue}>{costPerPerson}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Moeda</div>
              <div style={printStyles.metaValue}>{currency}</div>
            </div>
          </div>
        </section>

        <section data-pdf-section="costs" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>1</span>
            <h2 style={printStyles.sectionTitle}>Custos e premissas</h2>
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            {breakdown.map((item) => (
              <div
                key={item.label}
                style={{ display: "flex", justifyContent: "space-between", gap: "12px", borderRadius: "12px", background: "#f7fafc", padding: "12px" }}
              >
                <div>
                  <div style={printStyles.fullDayTitle}>{item.label}</div>
                  <div style={printStyles.fullDayText}>{item.perPerson} por pessoa</div>
                </div>
                <div style={{ ...printStyles.metaValue, textAlign: "right" as const }}>{item.total}</div>
              </div>
            ))}
          </div>

          <div style={{ ...printStyles.metaItem, marginTop: "12px" }}>
            <div style={printStyles.metaTitle}>Premissas usadas</div>
            <div style={printStyles.paragraph}>{normalizePdfText(assumptions)}</div>
          </div>
        </section>

        <section data-pdf-section="summary" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>2</span>
            <h2 style={printStyles.sectionTitle}>Resumo da viagem</h2>
          </div>
          <p style={printStyles.paragraph}>{normalizePdfText(summary)}</p>
          <p style={{ ...printStyles.paragraph, marginTop: "10px" }}>{normalizePdfText(safePeriodReason)}</p>
        </section>

        <section data-pdf-section="short-itinerary" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>3</span>
            <h2 style={printStyles.sectionTitle}>Roteiro resumido</h2>
          </div>
          <div style={printStyles.itineraryGrid}>
            {itinerary.map((day, index) => (
              <div key={day} style={printStyles.itineraryChip}>
                <span style={printStyles.itemNumber}>{index + 1}</span>
                <span style={printStyles.itineraryText}>{normalizePdfText(day)}</span>
              </div>
            ))}
          </div>
        </section>

        <section data-pdf-section="full-itinerary" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>4</span>
            <h2 style={printStyles.sectionTitle}>Roteiro completo</h2>
          </div>
          <div>
            {detailedItinerary.map((day, index) => (
              <div key={`${day.title}-${day.description}`} style={printStyles.fullDay}>
                <span style={printStyles.fullDayIcon}>{index + 1}</span>
                <div>
                  <h3 style={printStyles.fullDayTitle}>{normalizePdfText(day.title)}</h3>
                  <p style={printStyles.fullDayText}>{normalizePdfText(day.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-pdf-section="insights" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>5</span>
            <h2 style={printStyles.sectionTitle}>Insights da opção escolhida</h2>
          </div>
          <ul style={printStyles.list}>
            {insights.map((item) => (
              <li key={item} style={printStyles.listItem}>
                <span style={printStyles.itemNumber}>{"\u2022"}</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section data-pdf-section="why-this-trip" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>6</span>
            <h2 style={printStyles.sectionTitle}>Por que essa viagem faz sentido</h2>
          </div>
          <ul style={printStyles.list}>
            {whyThisTrip.map((item) => (
              <li key={item} style={printStyles.listItem}>
                <span style={printStyles.itemNumber}>{"\u2022"}</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section data-pdf-section="attention-points" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>7</span>
            <h2 style={printStyles.sectionTitle}>Pontos de atenção</h2>
          </div>
          <ul style={printStyles.list}>
            {attentionPoints.map((item) => (
              <li key={item} style={{ ...printStyles.listItem, background: "#fff7ed" }}>
                <span style={printStyles.itemNumber}>{"\u2022"}</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section data-pdf-section="final-notes" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>8</span>
            <h2 style={printStyles.sectionTitle}>Observações finais</h2>
          </div>
          <p style={printStyles.paragraph}>
            Este roteiro foi criado especialmente para você com base nas suas preferências. Aproveite cada momento dessa experiência única.
          </p>
          <p style={{ ...printStyles.paragraph, marginTop: "10px" }}>
            Os valores são estimativas e podem variar conforme disponibilidade, câmbio, antecedência e período.
          </p>
        </section>
      </div>

      <footer style={printStyles.footer}>
        <div>
          <strong>VUEI</strong> {"\u2014"} descubra, simule e planeje sua viagem em segundos
          <br />
          www.vuei.com.br
        </div>
        <div>Documento gerado automaticamente</div>
      </footer>
    </div>
  )
}
