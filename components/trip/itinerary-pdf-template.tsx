"use client"

import type { TripResult } from "@/types/trip"

export function ItineraryPdfTemplate({
  destination,
  estimatedCost,
  originSubtitle,
  summary,
  itinerary,
  detailedItinerary,
  tips,
}: {
  destination: TripResult["destination"]
  estimatedCost: TripResult["estimatedCost"]
  originSubtitle: string
  summary: string
  itinerary: TripResult["itinerary"]
  detailedItinerary: string[]
  tips: TripResult["tips"]
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

  const printStyles = {
    page: {
      width: "794px",
      backgroundColor: "#ffffff",
      color: "#17324d",
      fontFamily: "Arial, Helvetica, sans-serif",
      paddingBottom: "28px",
      ["--background" as "--background"]: "#ffffff",
      ["--foreground" as "--foreground"]: "#17324d",
      ["--card" as "--card"]: "#ffffff",
      ["--card-foreground" as "--card-foreground"]: "#17324d",
      ["--popover" as "--popover"]: "#ffffff",
      ["--popover-foreground" as "--popover-foreground"]: "#17324d",
      ["--primary" as "--primary"]: "#004aad",
      ["--primary-foreground" as "--primary-foreground"]: "#ffffff",
      ["--secondary" as "--secondary"]: "#f7fafc",
      ["--secondary-foreground" as "--secondary-foreground"]: "#253b56",
      ["--muted" as "--muted"]: "#f8fafc",
      ["--muted-foreground" as "--muted-foreground"]: "#42566f",
      ["--accent" as "--accent"]: "#eaf8ff",
      ["--accent-foreground" as "--accent-foreground"]: "#15324f",
      ["--border" as "--border"]: "#e3ebf4",
      ["--input" as "--input"]: "#e3ebf4",
      ["--ring" as "--ring"]: "rgba(0,0,0,0)",
      ["--sidebar" as "--sidebar"]: "#ffffff",
      ["--sidebar-foreground" as "--sidebar-foreground"]: "#17324d",
      ["--sidebar-primary" as "--sidebar-primary"]: "#004aad",
      ["--sidebar-primary-foreground" as "--sidebar-primary-foreground"]: "#ffffff",
      ["--sidebar-accent" as "--sidebar-accent"]: "#f7fafc",
      ["--sidebar-accent-foreground" as "--sidebar-accent-foreground"]: "#17324d",
      ["--sidebar-border" as "--sidebar-border"]: "#e3ebf4",
      ["--sidebar-ring" as "--sidebar-ring"]: "rgba(0,0,0,0)",
    } as const,
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
    metaLabel: {
      color: "#8293a8",
      fontSize: "10px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.08em",
      marginBottom: "6px",
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1.2fr",
      gap: "14px",
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
    },
    metaValue: {
      color: "#17324d",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: 1.4,
    },
    paragraph: {
      margin: 0,
      color: "#42566f",
      fontSize: "13px",
      lineHeight: 1.7,
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
    tipsCard: {
      background: "#eaf8ff",
      border: "1px solid #b9ebff",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: "14px",
      marginTop: "18px",
      breakInside: "avoid" as const,
      pageBreakInside: "avoid" as const,
    },
    tipsList: {
      margin: 0,
      padding: 0,
      listStyle: "none",
    },
    tipItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      marginBottom: "10px",
      color: "#29506e",
      fontSize: "12px",
      lineHeight: 1.6,
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
          <div style={printStyles.metaLabel}>{normalizePdfText(originSubtitle)}</div>
          <p style={{ ...printStyles.paragraph, fontStyle: "italic" }}>{`"${normalizePdfText(summary)}"`}</p>

          <div style={printStyles.metaGrid}>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Destino</div>
              <div style={printStyles.metaValue}>{destination}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Custo estimado</div>
              <div style={printStyles.metaValue}>{estimatedCost}</div>
            </div>
            <div style={printStyles.metaItem}>
              <div style={printStyles.metaTitle}>Contexto</div>
              <div style={printStyles.metaValue}>Roteiro VUEI personalizado</div>
            </div>
          </div>
        </section>

        <section data-pdf-section="summary" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>1</span>
            <h2 style={printStyles.sectionTitle}>Resumo da Viagem</h2>
          </div>
          <p style={printStyles.paragraph}>{normalizePdfText(summary)}</p>
        </section>

        <section data-pdf-section="short-itinerary" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>2</span>
            <h2 style={printStyles.sectionTitle}>Roteiro Resumido</h2>
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
            <span style={printStyles.sectionDot}>3</span>
            <h2 style={printStyles.sectionTitle}>Roteiro Completo</h2>
          </div>
          <div>
            {detailedItinerary.map((day, index) => (
              <div key={day} style={printStyles.fullDay}>
                <span style={printStyles.fullDayIcon}>{index + 1}</span>
                <div>
                  <h3 style={printStyles.fullDayTitle}>{`Dia ${index + 1}`}</h3>
                  <p style={printStyles.fullDayText}>{normalizePdfText(day)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-pdf-section="tips" style={printStyles.tipsCard}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>4</span>
            <h2 style={printStyles.sectionTitle}>Dicas importantes</h2>
          </div>
          <ul style={printStyles.tipsList}>
            {tips.map((tip) => (
              <li key={tip} style={printStyles.tipItem}>
                <span style={printStyles.itemNumber}>{"\u2022"}</span>
                <span>{normalizePdfText(tip)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section data-pdf-section="final-notes" style={printStyles.card}>
          <div style={printStyles.sectionTitleRow}>
            <span style={printStyles.sectionDot}>5</span>
            <h2 style={printStyles.sectionTitle}>{"Observa\u00e7\u00f5es finais"}</h2>
          </div>
          <p style={printStyles.paragraph}>
            {"Este roteiro foi criado especialmente para voc\u00ea com base nas suas prefer\u00eancias. Aproveite cada momento dessa experi\u00eancia \u00fanica!"}
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
