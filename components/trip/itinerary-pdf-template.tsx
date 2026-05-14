"use client"

import { useMemo, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import type { TripResult } from "@/types/trip"

type PdfBreakdownItem = {
  label: string
  total: string
  perPerson: string
}

type PdfDetailedDay = {
  title: string
  description: string
  tips: string[]
}

function normalizePdfText(value: string) {
  return value
    .replace(/Ã¡/g, "á")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã§/g, "ç")
    .replace(/Ã/g, "Á")
    .replace(/Ã€/g, "À")
    .replace(/Ã‚/g, "Â")
    .replace(/Ãƒ/g, "Ã")
    .replace(/Ã‰/g, "É")
    .replace(/ÃŠ/g, "Ê")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ã”/g, "Ô")
    .replace(/Ã•/g, "Õ")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‡/g, "Ç")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€¢/g, "•")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€˜|â€™/g, "'")
    .replace(/�/g, "")
    .trim()
}

function buildDaySegments(description: string) {
  const normalized = normalizePdfText(description)
  const segments = [
    { label: "Manhã", match: normalized.match(/Manhã:\s*(.*?)(?=\s*Tarde:|\s*Noite:|$)/i)?.[1]?.trim() ?? "" },
    { label: "Tarde", match: normalized.match(/Tarde:\s*(.*?)(?=\s*Noite:|$)/i)?.[1]?.trim() ?? "" },
    { label: "Noite", match: normalized.match(/Noite:\s*(.*)$/i)?.[1]?.trim() ?? "" },
  ].filter((item) => item.match)

  if (segments.length > 0) {
    return segments
  }

  return [{ label: "Plano do dia", match: normalized }]
}

function sectionTitleStyles(accent: string) {
  return {
    badge: {
      width: "28px",
      height: "28px",
      borderRadius: "999px",
      background: accent,
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 700,
      flexShrink: 0,
    },
    title: {
      margin: 0,
      color: "#13304c",
      fontSize: "20px",
      fontWeight: 700,
      lineHeight: 1.2,
    },
  }
}

function PdfSection({
  index,
  title,
  accent,
  children,
  keepTogether = true,
}: {
  index: number
  title: string
  accent: string
  children: ReactNode
  keepTogether?: boolean
}) {
  const heading = sectionTitleStyles(accent)

  return (
    <section
      data-pdf-section={title.toLowerCase().replace(/\s+/g, "-")}
      data-pdf-keep={keepTogether ? "true" : undefined}
      style={{
        background: "#ffffff",
        border: "1px solid #dbe7f3",
        borderRadius: "18px",
        padding: "18px 20px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        breakInside: keepTogether ? ("avoid" as const) : ("auto" as const),
        pageBreakInside: keepTogether ? ("avoid" as const) : ("auto" as const),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={heading.badge}>{index}</span>
        <h2 style={heading.title}>{title}</h2>
      </div>
      {children}
    </section>
  )
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
  const [logoVisible, setLogoVisible] = useState(true)
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  )

  const safeDestination = normalizePdfText(destination || "Destino sugerido")
  const safeSummary = normalizePdfText(summary || "Roteiro personalizado pronto para consulta.")
  const safeOriginSubtitle = normalizePdfText(originSubtitle)
  const safePeriod = normalizePdfText(periodLabel ?? "Período não informado")
  const safePeriodReason = normalizePdfText(periodReason ?? "Período ainda não definido para a viagem.")
  const safeDates = normalizePdfText(startDate && endDate ? `${startDate} a ${endDate}` : startDate ?? endDate ?? "Não informado")
  const safeDuration = normalizePdfText(durationLabel ?? `${durationDays} ${durationDays === 1 ? "dia" : "dias"}`)
  const normalizedAssumptions = normalizePdfText(assumptions)

  const styles: Record<string, CSSProperties> = {
    page: {
      width: "794px",
      minHeight: "1123px",
      background: "#ffffff",
      color: "#17324d",
      fontFamily: '"Arial", "Helvetica", sans-serif',
    },
    hero: {
      position: "relative",
      padding: "36px 42px 30px",
      background: "linear-gradient(135deg, #0f9fd7 0%, #004aad 100%)",
      overflow: "hidden",
    },
    heroGlowLarge: {
      position: "absolute",
      right: "-36px",
      top: "-42px",
      width: "180px",
      height: "180px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.10)",
    },
    heroGlowSmall: {
      position: "absolute",
      right: "34px",
      top: "22px",
      width: "94px",
      height: "94px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.08)",
    },
    logoWrap: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "18px",
    },
    logo: {
      width: "84px",
      height: "84px",
      objectFit: "contain",
      display: "block",
    },
    logoFallback: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "84px",
      height: "84px",
      borderRadius: "24px",
      background: "rgba(255,255,255,0.14)",
      color: "#ffffff",
      fontSize: "28px",
      fontWeight: 700,
      letterSpacing: "0.08em",
    },
    eyebrow: {
      margin: 0,
      textAlign: "center",
      color: "rgba(255,255,255,0.82)",
      textTransform: "uppercase",
      letterSpacing: "0.22em",
      fontSize: "11px",
      fontWeight: 700,
    },
    heroTitle: {
      margin: "10px 0 0",
      textAlign: "center",
      color: "#ffffff",
      fontSize: "28px",
      fontWeight: 700,
      lineHeight: 1.2,
    },
    heroSubtitle: {
      margin: "10px auto 0",
      maxWidth: "520px",
      textAlign: "center",
      color: "rgba(255,255,255,0.92)",
      fontSize: "14px",
      lineHeight: 1.7,
    },
    heroMeta: {
      marginTop: "18px",
      textAlign: "center",
      color: "rgba(255,255,255,0.86)",
      fontSize: "12px",
    },
    body: {
      padding: "20px",
      background: "#f4f8fc",
      display: "grid",
      gap: "16px",
    },
    leadCard: {
      background: "#ffffff",
      border: "1px solid #dbe7f3",
      borderRadius: "18px",
      padding: "20px",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    quote: {
      margin: "10px 0 0",
      color: "#37506c",
      fontSize: "15px",
      lineHeight: 1.7,
      fontStyle: "italic",
    },
    metaGrid: {
      marginTop: "18px",
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "12px",
    },
    metaCard: {
      background: "#f7fbff",
      border: "1px solid #e2edf7",
      borderRadius: "14px",
      padding: "12px 14px",
      minHeight: "78px",
    },
    metaLabel: {
      color: "#7290ad",
      fontSize: "10px",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom: "6px",
      fontWeight: 700,
    },
    metaValue: {
      color: "#16324d",
      fontSize: "14px",
      fontWeight: 700,
      lineHeight: 1.45,
    },
    bodyText: {
      margin: 0,
      color: "#42566f",
      fontSize: "13px",
      lineHeight: 1.75,
    },
    costGrid: {
      display: "grid",
      gap: "10px",
    },
    costRow: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.85fr 0.75fr",
      gap: "12px",
      alignItems: "center",
      background: "#f7fbff",
      border: "1px solid #e2edf7",
      borderRadius: "14px",
      padding: "12px 14px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    costValue: {
      color: "#16324d",
      fontSize: "14px",
      fontWeight: 700,
      textAlign: "right",
    },
    compactList: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "10px",
    },
    compactItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      background: "#f7fbff",
      border: "1px solid #e2edf7",
      borderRadius: "14px",
      padding: "12px 14px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    itemIndex: {
      width: "24px",
      height: "24px",
      borderRadius: "999px",
      background: "#0f9fd7",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      fontWeight: 700,
      flexShrink: 0,
      marginTop: "1px",
    },
    compactText: {
      color: "#29445f",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1.55,
    },
    dayCard: {
      display: "grid",
      gap: "12px",
      background: "#fcfdff",
      border: "1px solid #dbe7f3",
      borderRadius: "16px",
      padding: "14px 16px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
      marginBottom: "12px",
    },
    dayHeader: {
      display: "flex",
      gap: "12px",
      alignItems: "flex-start",
    },
    dayNumber: {
      width: "28px",
      height: "28px",
      borderRadius: "999px",
      background: "#004aad",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 700,
      flexShrink: 0,
    },
    dayTitle: {
      margin: "1px 0 0",
      color: "#13304c",
      fontSize: "15px",
      fontWeight: 700,
      lineHeight: 1.35,
    },
    segmentGrid: {
      display: "grid",
      gap: "8px",
    },
    segmentCard: {
      background: "#f7fbff",
      border: "1px solid #e2edf7",
      borderRadius: "12px",
      padding: "10px 12px",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    segmentLabel: {
      color: "#004aad",
      fontSize: "10px",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: "5px",
    },
    bulletList: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "grid",
      gap: "10px",
    },
    bulletItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      background: "#f7fbff",
      border: "1px solid #e2edf7",
      borderRadius: "14px",
      padding: "12px 14px",
      color: "#2f4863",
      fontSize: "12px",
      lineHeight: 1.65,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    bulletDot: {
      width: "22px",
      height: "22px",
      borderRadius: "999px",
      background: "#dff5ff",
      color: "#0f83b5",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: 700,
      flexShrink: 0,
      marginTop: "1px",
    },
    warningItem: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      background: "#fff8ed",
      border: "1px solid #f3dfbd",
      borderRadius: "14px",
      padding: "12px 14px",
      color: "#66411c",
      fontSize: "12px",
      lineHeight: 1.65,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    footer: {
      display: "flex",
      justifyContent: "space-between",
      gap: "16px",
      padding: "8px 24px 24px",
      color: "#6d8097",
      fontSize: "10px",
      lineHeight: 1.7,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
  }

  return (
    <div data-pdf-root="true" style={styles.page}>
      <header style={styles.hero}>
        <div style={styles.heroGlowLarge} />
        <div style={styles.heroGlowSmall} />
        <div style={styles.logoWrap}>
          {logoVisible ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/vuei-logo.png" alt="VUEI" style={styles.logo} onError={() => setLogoVisible(false)} />
            </>
          ) : (
            <div style={styles.logoFallback}>V</div>
          )}
        </div>
        <p style={styles.eyebrow}>Roteiro completo VUEI</p>
        <h1 style={styles.heroTitle}>{safeDestination}</h1>
        <p style={styles.heroSubtitle}>{safeSummary}</p>
        <div style={styles.heroMeta}>Gerado em {today}</div>
      </header>

      <main style={styles.body}>
        <section data-pdf-section="meta" data-pdf-keep="true" style={styles.leadCard}>
          <div style={styles.metaLabel}>{safeOriginSubtitle}</div>
          <p style={styles.quote}>{`"${safeSummary}"`}</p>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Destino</div>
              <div style={styles.metaValue}>{safeDestination}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>{isSuggestedPeriod ? "Período recomendado" : "Período informado"}</div>
              <div style={styles.metaValue}>{safePeriod}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Datas</div>
              <div style={styles.metaValue}>{safeDates}</div>
            </div>
          </div>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Duração</div>
              <div style={styles.metaValue}>{safeDuration}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Viajantes</div>
              <div style={styles.metaValue}>{normalizePdfText(travelersLabel)}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Opção escolhida</div>
              <div style={styles.metaValue}>{normalizePdfText(selectedVariantLabel)}</div>
            </div>
          </div>

          <div style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Custo total</div>
              <div style={styles.metaValue}>{normalizePdfText(estimatedCost)}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Por pessoa</div>
              <div style={styles.metaValue}>{normalizePdfText(costPerPerson)}</div>
            </div>
            <div style={styles.metaCard}>
              <div style={styles.metaLabel}>Moeda</div>
              <div style={styles.metaValue}>{currency}</div>
            </div>
          </div>
        </section>

        <PdfSection index={1} title="Custos e premissas" accent="#0f9fd7">
          <div style={styles.costGrid}>
            {breakdown.map((item) => (
              <div key={item.label} data-pdf-keep="true" style={styles.costRow}>
                <div>
                  <div style={{ ...styles.metaValue, textAlign: "left" }}>{normalizePdfText(item.label)}</div>
                </div>
                <div style={{ ...styles.bodyText, textAlign: "right" }}>{normalizePdfText(item.perPerson)} por pessoa</div>
                <div style={styles.costValue}>{normalizePdfText(item.total)}</div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.metaCard, marginTop: "12px" }}>
            <div style={styles.metaLabel}>Premissas utilizadas</div>
            <p style={styles.bodyText}>{normalizedAssumptions}</p>
          </div>
        </PdfSection>

        <PdfSection index={2} title="Resumo da viagem" accent="#004aad">
          <p style={styles.bodyText}>{safeSummary}</p>
          <p style={{ ...styles.bodyText, marginTop: "10px" }}>{safePeriodReason}</p>
        </PdfSection>

        <PdfSection index={3} title="Roteiro resumido" accent="#3fb950">
          <div style={styles.compactList}>
            {itinerary.map((day, index) => (
              <div key={`${index}-${day}`} data-pdf-keep="true" style={styles.compactItem}>
                <span style={styles.itemIndex}>{index + 1}</span>
                <span style={styles.compactText}>{normalizePdfText(day)}</span>
              </div>
            ))}
          </div>
        </PdfSection>

        <PdfSection index={4} title="Roteiro completo" accent="#7c3aed" keepTogether={false}>
          <div>
            {detailedItinerary.map((day, index) => {
              const dayTitle = normalizePdfText(day.title || `Dia ${index + 1}`)
              const daySegments = buildDaySegments(day.description)

              return (
                <article key={`${dayTitle}-${index}`} data-pdf-day="true" style={styles.dayCard}>
                  <div style={styles.dayHeader}>
                    <span style={styles.dayNumber}>{index + 1}</span>
                    <h3 style={styles.dayTitle}>{dayTitle}</h3>
                  </div>

                  <div style={styles.segmentGrid}>
                    {daySegments.map((segment) => (
                      <div key={`${dayTitle}-${segment.label}`} style={styles.segmentCard}>
                        <div style={styles.segmentLabel}>{segment.label}</div>
                        <p style={styles.bodyText}>{normalizePdfText(segment.match)}</p>
                      </div>
                    ))}
                  </div>

                  {day.tips.length > 0 ? (
                    <ul style={styles.bulletList}>
                      {day.tips.map((tip) => (
                        <li key={`${dayTitle}-${tip}`} style={styles.bulletItem}>
                          <span style={styles.bulletDot}>•</span>
                          <span>{normalizePdfText(tip)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              )
            })}
          </div>
        </PdfSection>

        <PdfSection index={5} title="Insights da opção escolhida" accent="#0f9fd7">
          <ul style={styles.bulletList}>
            {insights.map((item) => (
              <li key={item} style={styles.bulletItem}>
                <span style={styles.bulletDot}>•</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </PdfSection>

        <PdfSection index={6} title="Por que essa viagem faz sentido" accent="#004aad">
          <ul style={styles.bulletList}>
            {whyThisTrip.map((item) => (
              <li key={item} style={styles.bulletItem}>
                <span style={styles.bulletDot}>•</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </PdfSection>

        <PdfSection index={7} title="Pontos de atenção" accent="#d97706">
          <ul style={styles.bulletList}>
            {attentionPoints.map((item) => (
              <li key={item} style={styles.warningItem}>
                <span style={styles.bulletDot}>!</span>
                <span>{normalizePdfText(item)}</span>
              </li>
            ))}
          </ul>
        </PdfSection>

        <PdfSection index={8} title="Observações finais" accent="#475569">
          <p style={styles.bodyText}>
            Este roteiro foi criado com base nas suas preferências e no conteúdo já gerado no VUEI. Use este documento como guia
            prático para consultar a viagem, revisar prioridades e organizar a execução com mais confiança.
          </p>
          <p style={{ ...styles.bodyText, marginTop: "10px" }}>
            Valores e disponibilidade podem variar conforme antecedência, câmbio, sazonalidade, lotação e regras de cada fornecedor.
          </p>
        </PdfSection>
      </main>

      <footer data-pdf-keep="true" style={styles.footer}>
        <div>
          <strong>VUEI</strong> — descubra, simule e planeje sua viagem com mais clareza.
          <br />
          www.vuei.com.br
        </div>
        <div>Documento gerado automaticamente a partir do roteiro salvo.</div>
      </footer>
    </div>
  )
}
