import type { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { siteConfig } from '@/config/site'
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Guides, conseils et actualites SEO. Apprenez a optimiser votre site web et automatiser votre strategie de contenu avec ' +
    siteConfig.name +
    '.',
}

const articles = [
  {
    slug: 'guide-seo-2025',
    title: 'Le guide complet du SEO en 2025',
    excerpt:
      'Decouvrez les strategies SEO les plus efficaces pour 2025. Algorithmes Google, contenu IA, Core Web Vitals : tout ce que vous devez savoir pour dominer les SERP.',
    category: 'Guide',
    date: '15 Jan 2025',
    readTime: '12 min',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    slug: 'ia-redaction-seo',
    title: "Comment l'IA revolutionne la redaction SEO",
    excerpt:
      "L'intelligence artificielle transforme la creation de contenu web. Decouvrez comment utiliser l'IA pour produire du contenu SEO de qualite, plus vite et a moindre cout.",
    category: 'IA & SEO',
    date: '8 Jan 2025',
    readTime: '8 min',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    slug: 'backlinks-strategies',
    title: '10 strategies de backlinks qui fonctionnent encore',
    excerpt:
      'Le link building reste un pilier du SEO. Voici 10 techniques eprouvees pour obtenir des backlinks de qualite et booster votre autorite de domaine de maniere durable.',
    category: 'Backlinks',
    date: '2 Jan 2025',
    readTime: '10 min',
    color: 'bg-orange-100 text-orange-700',
  },
  {
    slug: 'mots-cles-longue-traine',
    title: 'Mots-cles longue traine : la mine d\'or du SEO',
    excerpt:
      'Les mots-cles longue traine representent 70% des recherches Google. Apprenez a les identifier, les cibler et les exploiter pour generer un trafic qualifie et convertir plus.',
    category: 'Mots-cles',
    date: '20 Dec 2024',
    readTime: '7 min',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    slug: 'wordpress-seo-optimisation',
    title: 'Optimiser WordPress pour le SEO : checklist complete',
    excerpt:
      'WordPress est le CMS le plus utilise au monde. Suivez notre checklist en 25 points pour optimiser votre site WordPress et ameliorer votre classement dans les resultats Google.',
    category: 'WordPress',
    date: '12 Dec 2024',
    readTime: '15 min',
    color: 'bg-cyan-100 text-cyan-700',
  },
  {
    slug: 'automatiser-seo',
    title: 'Automatiser son SEO : par ou commencer ?',
    excerpt:
      'Gagnez du temps et de l\'efficacite en automatisant les taches SEO repetitives. De la recherche de mots-cles a la publication, decouvrez ce qui peut etre automatise.',
    category: 'Automatisation',
    date: '5 Dec 2024',
    readTime: '9 min',
    color: 'bg-pink-100 text-pink-700',
  },
]

export default function BlogPage() {
  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
                <BookOpen className="h-4 w-4" />
                Blog SEO
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Guides &amp; conseils pour{' '}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  booster ton SEO
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Articles, tutoriels et strategies pour ameliorer votre
                referencement naturel et automatiser votre creation de contenu.
              </p>
            </div>
          </div>
        </section>

        {/* Articles grid */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <article
                  key={article.slug}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Colored header */}
                  <div className="h-48 rounded-t-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-gray-300 group-hover:text-brand-300 transition-colors" />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${article.color}`}>
                        {article.category}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {article.title}
                    </h2>

                    <p className="mt-2 flex-1 text-sm text-gray-600 line-clamp-3">
                      {article.excerpt}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {article.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {article.readTime}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                        Lire
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="bg-gray-50 py-20">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Restez informe des dernieres tendances SEO
            </h2>
            <p className="mt-3 text-gray-600">
              Recevez nos meilleurs articles et guides directement dans votre
              boite mail. Pas de spam, promis.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <input
                type="email"
                placeholder="votre@email.com"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                readOnly
              />
              <button
                type="button"
                className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                S&apos;abonner
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
