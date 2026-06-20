import { and, asc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { bookingCatalogTopicLevels, bookingSubjectNames, bookingSubjectSlugs } from "../bookings/catalog.js";
import { getDb } from "../db/client.js";
import {
  glossaryArticles,
  glossaryTopics,
  subjects,
  topics,
} from "../db/schema.js";
import { validateParams } from "../http/validation.js";

const slugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export const glossaryRouter = Router();

interface WikipediaSummary {
  title: string;
  extract: string | null;
  description: string | null;
  url: string | null;
  imageUrl: string | null;
}

function splitList(value: string | null) {
  return value
    ? value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function publicSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "aulaCiencias/0.1 (educational glossary; https://aulaciencias.local)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

async function findWikipediaTitle(query: string) {
  const searchUrl = new URL("https://es.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", query);
  searchUrl.searchParams.set("srlimit", "1");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("utf8", "1");
  searchUrl.searchParams.set("origin", "*");

  const result = await fetchJson<{ query?: { search?: { title: string }[] } }>(searchUrl.toString());
  return result?.query?.search?.[0]?.title ?? query;
}

async function getWikipediaSummary(query: string): Promise<WikipediaSummary | null> {
  const title = await findWikipediaTitle(query);
  const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summary = await fetchJson<{
    title?: string;
    extract?: string;
    description?: string;
    content_urls?: { desktop?: { page?: string } };
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  }>(summaryUrl);

  if (!summary?.title) {
    return null;
  }

  return {
    title: summary.title,
    extract: summary.extract ?? null,
    description: summary.description ?? null,
    url: summary.content_urls?.desktop?.page ?? null,
    imageUrl: summary.originalimage?.source ?? summary.thumbnail?.source ?? null,
  };
}

glossaryRouter.get("/windows", async (_req, res, next) => {
  try {
    const db = getDb();
    const [glossaryRows, subjectRows, topicRows] = await Promise.all([
      db
        .select({
          title: glossaryTopics.title,
          slug: glossaryTopics.slug,
          shortDescription: glossaryTopics.shortDescription,
          imageUrl: glossaryTopics.imageUrl,
        })
        .from(glossaryTopics)
        .where(eq(glossaryTopics.isActive, true)),
      db
        .select({
          id: subjects.id,
          name: subjects.name,
          slug: subjects.slug,
          description: subjects.description,
          displayOrder: subjects.displayOrder,
        })
        .from(subjects)
        .where(and(eq(subjects.isVisible, true), inArray(subjects.slug, bookingSubjectSlugs)))
        .orderBy(asc(subjects.displayOrder), asc(subjects.name)),
      db
        .select({
          id: topics.id,
          title: topics.title,
          introduction: topics.introduction,
          subject: topics.subject,
          educationLevel: topics.educationLevel,
          educationTrack: topics.educationTrack,
          schoolYear: topics.schoolYear,
        })
        .from(topics)
        .where(
          and(
            eq(topics.isVisible, true),
            inArray(topics.subject, bookingSubjectNames),
            inArray(topics.educationLevel, [...bookingCatalogTopicLevels]),
          ),
        )
        .orderBy(asc(topics.title)),
    ]);

    const glossaryBySlug = new Map(glossaryRows.map((row) => [row.slug, row]));
    const seenSlugs = new Set<string>();
    const subjectItems = subjectRows.map((subject, index) => {
      seenSlugs.add(subject.slug);
      const glossary = glossaryBySlug.get(subject.slug);

      return {
        id: `subject-${subject.id}`,
        subjectId: null,
        subjectName: subject.name,
        title: subject.name,
        slug: subject.slug,
        shortDescription: subject.description ?? glossary?.shortDescription ?? null,
        imageUrl: glossary?.imageUrl ?? "",
        displayOrder: index * 10,
        kind: "subject",
      };
    });
    const topicItems = topicRows.flatMap((topic, index) => {
      const slug = publicSlug(topic.title);

      if (seenSlugs.has(slug)) {
        return [];
      }

      seenSlugs.add(slug);
      const glossary = glossaryBySlug.get(slug);
      const subjectGlossary = topic.subject ? glossaryBySlug.get(publicSlug(topic.subject)) : null;

      return [
        {
          id: `topic-${slug}`,
          subjectId: null,
          subjectName: topic.subject,
          title: topic.title,
          slug,
          shortDescription:
            glossary?.shortDescription ??
            [topic.subject, topic.educationLevel, topic.schoolYear, topic.educationTrack].filter(Boolean).join(" · "),
          imageUrl: glossary?.imageUrl ?? subjectGlossary?.imageUrl ?? "",
          displayOrder: 1000 + index,
          kind: "topic",
        },
      ];
    });

    return res.json({ items: [...subjectItems, ...topicItems] });
  } catch (error) {
    return next(error);
  }
});

glossaryRouter.get("/articles/:slug", validateParams(slugParamsSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const [storedArticle] = await db
      .select({
        id: glossaryArticles.id,
        topicId: glossaryArticles.topicId,
        title: glossaryArticles.title,
        slug: glossaryTopics.slug,
        summary: glossaryArticles.summary,
        fullDefinition: glossaryArticles.fullDefinition,
        introduction: glossaryArticles.introduction,
        body: glossaryArticles.body,
        examples: glossaryArticles.examples,
        counterExamples: glossaryArticles.counterExamples,
        commonMistakes: glossaryArticles.commonMistakes,
        applications: glossaryArticles.applications,
        relatedConcepts: glossaryArticles.relatedConcepts,
        conclusion: glossaryArticles.conclusion,
        seoTitle: glossaryArticles.seoTitle,
        seoDescription: glossaryArticles.seoDescription,
        keywords: glossaryArticles.keywords,
        ogImageUrl: glossaryArticles.ogImageUrl,
        imageUrl: glossaryTopics.imageUrl,
      })
      .from(glossaryArticles)
      .innerJoin(glossaryTopics, eq(glossaryArticles.topicId, glossaryTopics.id))
      .where(and(eq(glossaryTopics.slug, req.params.slug), eq(glossaryArticles.isActive, true), eq(glossaryTopics.isActive, true)))
      .limit(1);

    const article =
      storedArticle ??
      (await resolveBookingGlossaryArticle(db, req.params.slug));

    if (!article) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const wikipedia = await getWikipediaSummary(article.title);
    const sourceDate = new Date().toISOString().slice(0, 10);

    return res.json({
      article: {
        ...article,
        title: wikipedia?.title ?? article.title,
        summary: wikipedia?.description ?? null,
        fullDefinition: wikipedia?.extract ?? null,
        introduction: null,
        body: null,
        conclusion: null,
        ogImageUrl: wikipedia?.imageUrl ?? null,
        imageUrl: wikipedia?.imageUrl ?? null,
        keywords: splitList(article.keywords),
        examples: [],
        counterExamples: [],
        commonMistakes: [],
        applications: [],
        relatedConcepts: [],
        levels: [],
        media: [],
        sources: wikipedia?.url
          ? [
              {
                id: "wikipedia",
                title: `Wikipedia: ${wikipedia.title}`,
                author: null,
                institution: "Wikipedia",
                url: wikipedia.url,
                sourceType: "Enciclopedia libre",
                accessDate: sourceDate,
                displayOrder: 1,
                isActive: true,
              },
            ]
          : [],
        relatedTopics: [],
        wikipediaTitle: wikipedia?.title ?? null,
        wikipediaDescription: wikipedia?.description ?? null,
        wikipediaUrl: wikipedia?.url ?? null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

async function resolveBookingGlossaryArticle(db: ReturnType<typeof getDb>, slug: string) {
  const [subject] = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      description: subjects.description,
    })
    .from(subjects)
    .where(and(eq(subjects.slug, slug), eq(subjects.isVisible, true), inArray(subjects.slug, bookingSubjectSlugs)))
    .limit(1);

  if (subject) {
    return {
      id: subject.id,
      topicId: null,
      title: subject.name,
      slug: subject.slug,
      summary: subject.description,
      fullDefinition: null,
      introduction: null,
      body: null,
      examples: null,
      counterExamples: null,
      commonMistakes: null,
      applications: null,
      relatedConcepts: null,
      conclusion: null,
      seoTitle: `${subject.name} - Glosario aulaCiencias`,
      seoDescription: subject.description,
      keywords: subject.name,
      ogImageUrl: null,
      imageUrl: null,
    };
  }

  const topicRows = await db
      .select({
        id: topics.id,
        title: topics.title,
        subject: topics.subject,
        educationLevel: topics.educationLevel,
        educationTrack: topics.educationTrack,
        schoolYear: topics.schoolYear,
      })
      .from(topics)
      .where(
        and(
          eq(topics.isVisible, true),
          inArray(topics.subject, bookingSubjectNames),
          inArray(topics.educationLevel, [...bookingCatalogTopicLevels]),
        ),
      );
  const topic = topicRows.find((row) => publicSlug(row.title) === slug);

  if (!topic) {
    return null;
  }

  return {
    id: topic.id,
    topicId: null,
    title: topic.title,
    slug,
    summary: [topic.subject, topic.educationLevel, topic.schoolYear, topic.educationTrack].filter(Boolean).join(" · "),
    fullDefinition: null,
    introduction: null,
    body: null,
    examples: null,
    counterExamples: null,
    commonMistakes: null,
    applications: null,
    relatedConcepts: null,
    conclusion: null,
    seoTitle: `${topic.title} - Glosario aulaCiencias`,
    seoDescription: null,
    keywords: [topic.title, topic.subject].filter(Boolean).join(", "),
    ogImageUrl: null,
    imageUrl: null,
  };
}
