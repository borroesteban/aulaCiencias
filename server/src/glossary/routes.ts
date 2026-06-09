import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/client.js";
import {
  glossaryArticleLevels,
  glossaryArticleMedia,
  glossaryArticleRelatedTopics,
  glossaryArticleSources,
  glossaryArticles,
  glossaryTopics,
} from "../db/schema.js";
import { validateParams } from "../http/validation.js";

const slugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export const glossaryRouter = Router();

function splitList(value: string | null) {
  return value
    ? value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

glossaryRouter.get("/windows", async (_req, res, next) => {
  try {
    const rows = await getDb()
      .select({
        id: glossaryTopics.id,
        title: glossaryTopics.title,
        slug: glossaryTopics.slug,
        shortDescription: glossaryTopics.shortDescription,
        imageUrl: glossaryTopics.imageUrl,
        displayOrder: glossaryTopics.displayOrder,
      })
      .from(glossaryTopics)
      .where(eq(glossaryTopics.isActive, true))
      .orderBy(asc(glossaryTopics.displayOrder), asc(glossaryTopics.title));

    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
});

glossaryRouter.get("/articles/:slug", validateParams(slugParamsSchema), async (req, res, next) => {
  try {
    const [article] = await getDb()
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

    if (!article) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const [levels, media, sources, relations] = await Promise.all([
      getDb()
        .select()
        .from(glossaryArticleLevels)
        .where(and(eq(glossaryArticleLevels.articleId, article.id), eq(glossaryArticleLevels.isActive, true)))
        .orderBy(asc(glossaryArticleLevels.levelOrder)),
      getDb()
        .select()
        .from(glossaryArticleMedia)
        .where(and(eq(glossaryArticleMedia.articleId, article.id), eq(glossaryArticleMedia.isActive, true)))
        .orderBy(asc(glossaryArticleMedia.displayOrder)),
      getDb()
        .select()
        .from(glossaryArticleSources)
        .where(and(eq(glossaryArticleSources.articleId, article.id), eq(glossaryArticleSources.isActive, true)))
        .orderBy(asc(glossaryArticleSources.displayOrder)),
      getDb()
        .select({
          relationLabel: glossaryArticleRelatedTopics.relationLabel,
          title: glossaryArticles.title,
          slug: glossaryTopics.slug,
        })
        .from(glossaryArticleRelatedTopics)
        .innerJoin(glossaryArticles, eq(glossaryArticleRelatedTopics.relatedArticleId, glossaryArticles.id))
        .innerJoin(glossaryTopics, eq(glossaryArticles.topicId, glossaryTopics.id))
        .where(eq(glossaryArticleRelatedTopics.articleId, article.id)),
    ]);

    return res.json({
      article: {
        ...article,
        keywords: splitList(article.keywords),
        examples: splitList(article.examples),
        counterExamples: splitList(article.counterExamples),
        commonMistakes: splitList(article.commonMistakes),
        applications: splitList(article.applications),
        relatedConcepts: splitList(article.relatedConcepts),
        levels,
        media,
        sources,
        relatedTopics: relations,
      },
    });
  } catch (error) {
    return next(error);
  }
});
