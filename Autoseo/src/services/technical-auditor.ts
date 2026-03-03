import * as cheerio from 'cheerio'
import sslChecker from 'ssl-checker'
import robotsParser from 'robots-parser'
import Sitemapper from 'sitemapper'

export interface AuditCheck {
  name: string
  category: 'technical' | 'content' | 'performance' | 'structured'
  status: 'pass' | 'warning' | 'fail'
  message: string
  details?: string
  points: number
  maxPoints: number
}

export interface CoreWebVitals {
  lcp?: number
  cls?: number
  fcp?: number
  performanceScore?: number
  seoScore?: number
}

export interface CategoryScore {
  score: number
  maxScore: number
  checks: AuditCheck[]
}

export interface TechnicalAuditResult {
  overallScore: number
  categories: {
    technical: CategoryScore
    content: CategoryScore
    performance: CategoryScore
    structured: CategoryScore
  }
  coreWebVitals?: CoreWebVitals
  url: string
  auditedAt: string
}

async function fetchPage(url: string): Promise<{ html: string; statusCode: number; headers: Record<string, string> }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SEOPilot-Auditor/1.0' },
      redirect: 'follow',
    })
    const html = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k] = v })
    return { html, statusCode: res.status, headers }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkSSL(hostname: string): Promise<AuditCheck> {
  try {
    const result = await sslChecker(hostname, { method: 'GET', port: 443 })
    if (result.valid && result.daysRemaining > 30) {
      return {
        name: 'Certificat SSL',
        category: 'technical',
        status: 'pass',
        message: `SSL valide, expire dans ${result.daysRemaining} jours`,
        points: 10,
        maxPoints: 10,
      }
    }
    if (result.valid && result.daysRemaining <= 30) {
      return {
        name: 'Certificat SSL',
        category: 'technical',
        status: 'warning',
        message: `SSL valide mais expire dans ${result.daysRemaining} jours`,
        details: 'Renouvelez votre certificat SSL rapidement',
        points: 5,
        maxPoints: 10,
      }
    }
    return {
      name: 'Certificat SSL',
      category: 'technical',
      status: 'fail',
      message: 'Certificat SSL invalide ou expire',
      details: 'Un certificat SSL valide est essentiel pour le SEO et la securite',
      points: 0,
      maxPoints: 10,
    }
  } catch {
    return {
      name: 'Certificat SSL',
      category: 'technical',
      status: 'fail',
      message: 'Impossible de verifier le certificat SSL',
      details: 'Le site n\'utilise peut-etre pas HTTPS',
      points: 0,
      maxPoints: 10,
    }
  }
}

async function checkRobotsTxt(baseUrl: string): Promise<AuditCheck> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString()
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': 'SEOPilot-Auditor/1.0' } })
    if (res.status !== 200) {
      return {
        name: 'robots.txt',
        category: 'technical',
        status: 'fail',
        message: 'Fichier robots.txt absent',
        details: 'Ajoutez un fichier robots.txt pour guider les moteurs de recherche',
        points: 0,
        maxPoints: 10,
      }
    }
    const content = await res.text()
    const robots = robotsParser(robotsUrl, content)
    const googlebotAllowed = robots.isAllowed('/', 'Googlebot') !== false

    if (googlebotAllowed) {
      return {
        name: 'robots.txt',
        category: 'technical',
        status: 'pass',
        message: 'robots.txt present et autorise Googlebot',
        points: 10,
        maxPoints: 10,
      }
    }
    return {
      name: 'robots.txt',
      category: 'technical',
      status: 'warning',
      message: 'robots.txt present mais bloque Googlebot',
      details: 'Verifiez les directives Disallow dans votre robots.txt',
      points: 5,
      maxPoints: 10,
    }
  } catch {
    return {
      name: 'robots.txt',
      category: 'technical',
      status: 'fail',
      message: 'Impossible d\'acceder au robots.txt',
      points: 0,
      maxPoints: 10,
    }
  }
}

async function checkSitemap(baseUrl: string): Promise<AuditCheck> {
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString()
    const sitemap = new Sitemapper({ url: sitemapUrl, timeout: 10000 })
    const { sites } = await sitemap.fetch()

    if (sites.length > 0) {
      return {
        name: 'sitemap.xml',
        category: 'technical',
        status: 'pass',
        message: `Sitemap valide avec ${sites.length} URL${sites.length > 1 ? 's' : ''}`,
        points: 10,
        maxPoints: 10,
      }
    }
    return {
      name: 'sitemap.xml',
      category: 'technical',
      status: 'warning',
      message: 'Sitemap trouve mais vide',
      details: 'Ajoutez des URLs a votre sitemap pour faciliter l\'indexation',
      points: 5,
      maxPoints: 10,
    }
  } catch {
    return {
      name: 'sitemap.xml',
      category: 'technical',
      status: 'fail',
      message: 'Sitemap introuvable ou invalide',
      details: 'Creez un fichier sitemap.xml pour aider les moteurs de recherche a decouvrir vos pages',
      points: 0,
      maxPoints: 10,
    }
  }
}

function checkMetaTitle($: cheerio.CheerioAPI): AuditCheck {
  const title = $('title').text().trim()
  if (!title) {
    return {
      name: 'Meta title',
      category: 'content',
      status: 'fail',
      message: 'Balise title absente',
      details: 'La balise title est essentielle pour le SEO. Ajoutez un titre de 30-60 caracteres.',
      points: 0,
      maxPoints: 10,
    }
  }
  if (title.length >= 30 && title.length <= 60) {
    return {
      name: 'Meta title',
      category: 'content',
      status: 'pass',
      message: `Title present (${title.length} caracteres)`,
      details: title,
      points: 10,
      maxPoints: 10,
    }
  }
  return {
    name: 'Meta title',
    category: 'content',
    status: 'warning',
    message: `Title present mais longueur non optimale (${title.length} caracteres)`,
    details: `"${title}" - Visez 30-60 caracteres`,
    points: 5,
    maxPoints: 10,
  }
}

function checkMetaDescription($: cheerio.CheerioAPI): AuditCheck {
  const desc = $('meta[name="description"]').attr('content')?.trim()
  if (!desc) {
    return {
      name: 'Meta description',
      category: 'content',
      status: 'fail',
      message: 'Meta description absente',
      details: 'Ajoutez une meta description de 120-160 caracteres pour ameliorer le CTR.',
      points: 0,
      maxPoints: 10,
    }
  }
  if (desc.length >= 120 && desc.length <= 160) {
    return {
      name: 'Meta description',
      category: 'content',
      status: 'pass',
      message: `Meta description presente (${desc.length} caracteres)`,
      points: 10,
      maxPoints: 10,
    }
  }
  return {
    name: 'Meta description',
    category: 'content',
    status: 'warning',
    message: `Meta description presente mais longueur non optimale (${desc.length} caracteres)`,
    details: 'Visez 120-160 caracteres pour la meta description',
    points: 5,
    maxPoints: 10,
  }
}

function checkH1($: cheerio.CheerioAPI): AuditCheck {
  const h1s = $('h1')
  if (h1s.length === 0) {
    return {
      name: 'Balise H1',
      category: 'content',
      status: 'fail',
      message: 'Aucune balise H1 trouvee',
      details: 'Chaque page doit avoir exactement une balise H1',
      points: 0,
      maxPoints: 5,
    }
  }
  if (h1s.length === 1) {
    return {
      name: 'Balise H1',
      category: 'content',
      status: 'pass',
      message: 'Une seule balise H1 presente',
      details: h1s.first().text().trim(),
      points: 5,
      maxPoints: 5,
    }
  }
  return {
    name: 'Balise H1',
    category: 'content',
    status: 'warning',
    message: `${h1s.length} balises H1 trouvees`,
    details: 'Limitez a une seule balise H1 par page',
    points: 2,
    maxPoints: 5,
  }
}

function checkHeadingHierarchy($: cheerio.CheerioAPI): AuditCheck {
  const headings: number[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push(parseInt(el.tagName.replace('h', ''), 10))
  })

  if (headings.length === 0) {
    return {
      name: 'Hierarchie des titres',
      category: 'content',
      status: 'fail',
      message: 'Aucun titre trouve sur la page',
      details: 'Utilisez des balises H1-H6 pour structurer votre contenu',
      points: 0,
      maxPoints: 5,
    }
  }

  let hasSkip = false
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      hasSkip = true
      break
    }
  }

  if (!hasSkip) {
    return {
      name: 'Hierarchie des titres',
      category: 'content',
      status: 'pass',
      message: `Hierarchie correcte (${headings.length} titres)`,
      points: 5,
      maxPoints: 5,
    }
  }
  return {
    name: 'Hierarchie des titres',
    category: 'content',
    status: 'warning',
    message: 'Niveaux de titres sautes dans la hierarchie',
    details: 'Evitez de passer de H1 a H3 sans H2 intermediaire',
    points: 2,
    maxPoints: 5,
  }
}

function checkViewport($: cheerio.CheerioAPI): AuditCheck {
  const viewport = $('meta[name="viewport"]').attr('content')
  if (!viewport) {
    return {
      name: 'Viewport mobile',
      category: 'technical',
      status: 'fail',
      message: 'Balise viewport absente',
      details: 'Ajoutez <meta name="viewport" content="width=device-width, initial-scale=1">',
      points: 0,
      maxPoints: 5,
    }
  }
  if (viewport.includes('width=device-width')) {
    return {
      name: 'Viewport mobile',
      category: 'technical',
      status: 'pass',
      message: 'Viewport mobile correctement configure',
      points: 5,
      maxPoints: 5,
    }
  }
  return {
    name: 'Viewport mobile',
    category: 'technical',
    status: 'warning',
    message: 'Viewport present mais configuration non standard',
    details: `Valeur actuelle: "${viewport}"`,
    points: 3,
    maxPoints: 5,
  }
}

function checkOGTags($: cheerio.CheerioAPI): AuditCheck {
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')

  const present = [ogTitle, ogDesc, ogImage].filter(Boolean).length

  if (present === 3) {
    return {
      name: 'Open Graph tags',
      category: 'structured',
      status: 'pass',
      message: 'Toutes les balises OG essentielles presentes',
      points: 5,
      maxPoints: 5,
    }
  }
  if (present > 0) {
    const missing = []
    if (!ogTitle) missing.push('og:title')
    if (!ogDesc) missing.push('og:description')
    if (!ogImage) missing.push('og:image')
    return {
      name: 'Open Graph tags',
      category: 'structured',
      status: 'warning',
      message: `${present}/3 balises OG presentes`,
      details: `Manquant: ${missing.join(', ')}`,
      points: 2,
      maxPoints: 5,
    }
  }
  return {
    name: 'Open Graph tags',
    category: 'structured',
    status: 'fail',
    message: 'Aucune balise Open Graph trouvee',
    details: 'Les balises OG ameliorent le partage sur les reseaux sociaux',
    points: 0,
    maxPoints: 5,
  }
}

function checkCanonical($: cheerio.CheerioAPI): AuditCheck {
  const canonical = $('link[rel="canonical"]').attr('href')
  if (canonical) {
    return {
      name: 'URL canonique',
      category: 'technical',
      status: 'pass',
      message: 'URL canonique presente',
      details: canonical,
      points: 5,
      maxPoints: 5,
    }
  }
  return {
    name: 'URL canonique',
    category: 'technical',
    status: 'warning',
    message: 'Pas de balise canonical trouvee',
    details: 'Ajoutez une URL canonique pour eviter le contenu duplique',
    points: 0,
    maxPoints: 5,
  }
}

function checkJsonLd($: cheerio.CheerioAPI): AuditCheck {
  const scripts = $('script[type="application/ld+json"]')
  if (scripts.length === 0) {
    return {
      name: 'Donnees structurees JSON-LD',
      category: 'structured',
      status: 'fail',
      message: 'Aucune donnee structuree JSON-LD trouvee',
      details: 'Ajoutez du schema.org en JSON-LD pour les rich snippets Google',
      points: 0,
      maxPoints: 5,
    }
  }

  const types: string[] = []
  scripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '')
      if (data['@type']) types.push(data['@type'])
      if (Array.isArray(data['@graph'])) {
        data['@graph'].forEach((item: any) => {
          if (item['@type']) types.push(item['@type'])
        })
      }
    } catch { /* invalid JSON-LD */ }
  })

  return {
    name: 'Donnees structurees JSON-LD',
    category: 'structured',
    status: 'pass',
    message: `${scripts.length} bloc(s) JSON-LD trouve(s)`,
    details: types.length > 0 ? `Types: ${types.join(', ')}` : undefined,
    points: 5,
    maxPoints: 5,
  }
}

function checkImageAlts($: cheerio.CheerioAPI): AuditCheck {
  const images = $('img')
  if (images.length === 0) {
    return {
      name: 'Attributs alt des images',
      category: 'content',
      status: 'pass',
      message: 'Aucune image trouvee',
      points: 5,
      maxPoints: 5,
    }
  }

  let withAlt = 0
  images.each((_, el) => {
    if ($(el).attr('alt')?.trim()) withAlt++
  })

  const ratio = withAlt / images.length
  if (ratio === 1) {
    return {
      name: 'Attributs alt des images',
      category: 'content',
      status: 'pass',
      message: `Toutes les images ont un attribut alt (${images.length}/${images.length})`,
      points: 5,
      maxPoints: 5,
    }
  }
  if (ratio >= 0.5) {
    return {
      name: 'Attributs alt des images',
      category: 'content',
      status: 'warning',
      message: `${withAlt}/${images.length} images avec attribut alt`,
      details: 'Ajoutez des attributs alt descriptifs aux images manquantes',
      points: 2,
      maxPoints: 5,
    }
  }
  return {
    name: 'Attributs alt des images',
    category: 'content',
    status: 'fail',
    message: `Seulement ${withAlt}/${images.length} images avec attribut alt`,
    details: 'Les attributs alt sont importants pour l\'accessibilite et le SEO',
    points: 0,
    maxPoints: 5,
  }
}

async function checkLlmsTxt(baseUrl: string): Promise<AuditCheck> {
  try {
    const llmsUrl = new URL('/llms.txt', baseUrl).toString()
    const res = await fetch(llmsUrl, { headers: { 'User-Agent': 'SEOPilot-Auditor/1.0' } })
    if (res.status === 200) {
      const content = await res.text()
      if (content.trim().length > 10) {
        return {
          name: 'Fichier llms.txt',
          category: 'structured',
          status: 'pass',
          message: 'Fichier llms.txt present',
          details: 'Votre site est optimise pour les LLMs (ChatGPT, Claude, etc.)',
          points: 5,
          maxPoints: 5,
        }
      }
    }
    return {
      name: 'Fichier llms.txt',
      category: 'structured',
      status: 'warning',
      message: 'Fichier llms.txt absent',
      details: 'Ajoutez un fichier llms.txt pour ameliorer la visibilite aupres des IA',
      points: 0,
      maxPoints: 5,
    }
  } catch {
    return {
      name: 'Fichier llms.txt',
      category: 'structured',
      status: 'warning',
      message: 'Impossible de verifier llms.txt',
      points: 0,
      maxPoints: 5,
    }
  }
}

async function checkPageSpeed(url: string): Promise<{ check: AuditCheck; vitals?: CoreWebVitals }> {
  const apiKey = process.env.GOOGLE_PSI_API_KEY
  if (!apiKey) {
    return {
      check: {
        name: 'Performance PageSpeed',
        category: 'performance',
        status: 'warning',
        message: 'Cle API PageSpeed non configuree',
        details: 'Ajoutez GOOGLE_PSI_API_KEY dans les variables d\'environnement',
        points: 0,
        maxPoints: 10,
      },
    }
  }

  try {
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&key=${apiKey}`
    const res = await fetch(psiUrl, { signal: AbortSignal.timeout(30000) })

    if (!res.ok) {
      throw new Error(`PSI API error: ${res.status}`)
    }

    const data = await res.json()
    const perfScore = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100)
    const seoScore = Math.round((data.lighthouseResult?.categories?.seo?.score || 0) * 100)

    const audits = data.lighthouseResult?.audits || {}
    const lcp = audits['largest-contentful-paint']?.numericValue
    const cls = audits['cumulative-layout-shift']?.numericValue
    const fcp = audits['first-contentful-paint']?.numericValue

    const vitals: CoreWebVitals = {
      lcp: lcp ? Math.round(lcp) : undefined,
      cls: cls ? parseFloat(cls.toFixed(3)) : undefined,
      fcp: fcp ? Math.round(fcp) : undefined,
      performanceScore: perfScore,
      seoScore,
    }

    let status: 'pass' | 'warning' | 'fail' = 'pass'
    let points = 10
    if (perfScore < 50) {
      status = 'fail'
      points = 0
    } else if (perfScore < 80) {
      status = 'warning'
      points = 5
    }

    return {
      check: {
        name: 'Performance PageSpeed',
        category: 'performance',
        status,
        message: `Score performance: ${perfScore}/100, Score SEO: ${seoScore}/100`,
        details: [
          lcp ? `LCP: ${(lcp / 1000).toFixed(1)}s` : null,
          cls !== undefined ? `CLS: ${cls.toFixed(3)}` : null,
          fcp ? `FCP: ${(fcp / 1000).toFixed(1)}s` : null,
        ].filter(Boolean).join(' | '),
        points,
        maxPoints: 10,
      },
      vitals,
    }
  } catch (err: any) {
    return {
      check: {
        name: 'Performance PageSpeed',
        category: 'performance',
        status: 'warning',
        message: 'Impossible d\'obtenir les donnees PageSpeed',
        details: err.message,
        points: 0,
        maxPoints: 10,
      },
    }
  }
}

export async function runTechnicalAudit(siteUrl: string): Promise<TechnicalAuditResult> {
  // Normalize URL
  let url = siteUrl
  if (!url.startsWith('http')) url = `https://${url}`
  const parsedUrl = new URL(url)
  const hostname = parsedUrl.hostname
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`

  // Fetch the homepage
  let $: cheerio.CheerioAPI
  try {
    const { html } = await fetchPage(url)
    $ = cheerio.load(html)
  } catch (err: any) {
    // If we can't even fetch the page, return a minimal audit
    return {
      overallScore: 0,
      categories: {
        technical: { score: 0, maxScore: 30, checks: [{ name: 'Acces au site', category: 'technical', status: 'fail', message: `Impossible d'acceder au site: ${err.message}`, points: 0, maxPoints: 30 }] },
        content: { score: 0, maxScore: 35, checks: [] },
        performance: { score: 0, maxScore: 10, checks: [] },
        structured: { score: 0, maxScore: 20, checks: [] },
      },
      url,
      auditedAt: new Date().toISOString(),
    }
  }

  // Run all checks in parallel where possible
  const [ssl, robots, sitemap, llmsTxt, pageSpeed] = await Promise.all([
    checkSSL(hostname),
    checkRobotsTxt(baseUrl),
    checkSitemap(baseUrl),
    checkLlmsTxt(baseUrl),
    checkPageSpeed(url),
  ])

  // Synchronous HTML checks
  const metaTitle = checkMetaTitle($)
  const metaDesc = checkMetaDescription($)
  const h1 = checkH1($)
  const headings = checkHeadingHierarchy($)
  const viewport = checkViewport($)
  const ogTags = checkOGTags($)
  const canonical = checkCanonical($)
  const jsonLd = checkJsonLd($)
  const imageAlts = checkImageAlts($)

  const allChecks = [ssl, robots, sitemap, viewport, canonical, metaTitle, metaDesc, h1, headings, imageAlts, ogTags, jsonLd, llmsTxt, pageSpeed.check]

  // Group by category
  const grouped: Record<string, AuditCheck[]> = { technical: [], content: [], performance: [], structured: [] }
  for (const check of allChecks) {
    grouped[check.category].push(check)
  }

  const categoryScore = (checks: AuditCheck[]) => ({
    score: checks.reduce((s, c) => s + c.points, 0),
    maxScore: checks.reduce((s, c) => s + c.maxPoints, 0),
    checks,
  })

  const categories = {
    technical: categoryScore(grouped.technical),
    content: categoryScore(grouped.content),
    performance: categoryScore(grouped.performance),
    structured: categoryScore(grouped.structured),
  }

  const totalPoints = allChecks.reduce((s, c) => s + c.points, 0)
  const totalMax = allChecks.reduce((s, c) => s + c.maxPoints, 0)
  const overallScore = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0

  return {
    overallScore,
    categories,
    coreWebVitals: pageSpeed.vitals,
    url,
    auditedAt: new Date().toISOString(),
  }
}
