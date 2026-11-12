import { Router, type IRouter } from "express";
import {
  SearchChannel3ProductsQueryParams,
  SearchChannel3ProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const channel3SearchUrl = "https://api.trychannel3.com/v1/search";
const resultLimit = 8;

router.get("/channel3/search", async (req, res): Promise<void> => {
  const params = SearchChannel3ProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Enter a search term up to 200 characters." });
    return;
  }

  const apiKey = process.env.CHANNEL3_API_KEY;
  if (!apiKey) {
    req.log.error("CHANNEL3_API_KEY is not configured");
    res.status(503).json({ error: "Product search is not configured yet." });
    return;
  }

  try {
    const upstream = await fetch(channel3SearchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ query: params.data.query, limit: resultLimit }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      req.log.warn(
        { statusCode: upstream.status },
        "Channel3 product search failed",
      );
      res.status(502).json({ error: "Product search is temporarily unavailable." });
      return;
    }

    const payload: unknown = await upstream.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("products" in payload) ||
      !Array.isArray(payload.products)
    ) {
      req.log.warn("Channel3 returned an unexpected search response");
      res.status(502).json({ error: "Product search returned an unexpected response." });
      return;
    }

    const parsed = SearchChannel3ProductsResponse.safeParse({
      products: payload.products.slice(0, resultLimit),
    });
    if (!parsed.success) {
      req.log.warn(
        { validationError: parsed.error.message },
        "Channel3 product data did not match the documented fields",
      );
      res.status(502).json({ error: "Product search returned an unexpected response." });
      return;
    }

    res.json(parsed.data);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      req.log.warn("Channel3 product search timed out");
      res.status(504).json({ error: "Product search timed out. Please try again." });
      return;
    }

    req.log.error({ err: error }, "Channel3 product search request failed");
    res.status(502).json({ error: "Product search is temporarily unavailable." });
  }
});

export default router;
