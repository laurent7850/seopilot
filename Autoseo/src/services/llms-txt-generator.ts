import { getOpenAI } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

export async function generateLlmsTxt(siteId: string, userId: string): Promise<string> {
  // Load the site
  const site = await prisma.site.findFirst({
    where: { id: siteId, userId },
  })

  if (!site) {
    throw new Error('Site introuvable')
  }

  // Load the site's published articles (last 20)
  const articles = await prisma.article.findMany({
    where: {
      siteId,
      status: 'PUBLISHED',
    },
    select: {
      title: true,
      slug: true,
      metaDescription: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  })

  // Build the article list for the prompt
  const articleList = articles
    .map((a) => {
      const url = `${site.url.replace(/\/$/, '')}/${a.slug}`
      const desc = a.metaDescription || 'Pas de description disponible'
      return `- Titre: "${a.title}" | URL: ${url} | Description: ${desc}`
    })
    .join('\n')

  const openai = getOpenAI()

  const prompt = `Tu es un expert en SEO et en optimisation pour les LLMs (Large Language Models).

Genere un fichier llms.txt au format Markdown en suivant strictement la specification de llmstxt.org.

Le fichier doit contenir :
1. Un titre H1 avec le nom du site
2. Un blockquote avec une description du site basee sur sa niche
3. Des sections organisees par categories de contenu avec des titres H2
4. Une liste des pages/articles importants avec leurs URLs et descriptions courtes
5. Une section optionnelle avec des informations supplementaires sur le site

Informations du site :
- Nom : ${site.name}
- URL : ${site.url}
- Niche : ${site.niche || 'General'}
- Langue : ${site.language || 'fr'}

Articles publies (${articles.length}) :
${articleList || 'Aucun article publie pour le moment.'}

Regles importantes :
- Suis exactement le format llmstxt.org : H1 pour le titre, blockquote pour la description, H2 pour les sections
- Chaque lien doit etre au format Markdown : [Titre](URL): Description
- Organise les articles par theme/categorie si possible
- Ajoute une section "A propos" et une section "Contenu principal"
- Le fichier doit etre en ${site.language === 'fr' ? 'francais' : 'anglais'}
- Genere un contenu professionnel et bien structure
- N'invente PAS d'URLs : utilise uniquement les URLs fournies ci-dessus
- Si aucun article n'est disponible, cree une structure de base avec les pages principales du site (accueil, contact, etc.)`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Tu generes des fichiers llms.txt au format Markdown suivant la specification llmstxt.org. Reponds uniquement avec le contenu du fichier, sans bloc de code ni explication.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  })

  const content = response.choices[0]?.message?.content

  if (!content) {
    throw new Error('Impossible de generer le fichier llms.txt')
  }

  return content.trim()
}
