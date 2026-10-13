// routes/recommend.js  (mounted at /recommend)
//   GET /recommend?q=...   Recommendation Agent proxy (any logged-in user)

const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
      throw httpError(400, 'Query parameter "q" is required');
    }

    const apimBase = process.env.APIM_BASE_URL || 'https://bmv-apim-mz.azure-api.net';
    const apimKey = process.env.APIM_KEY;

    if (!apimKey) {
      console.error('[recommend] APIM_KEY is not configured in environment');
      throw httpError(502, 'Recommendation service is temporarily unavailable');
    }

    const targetUrl = `${apimBase.replace(/\/+$/, '')}/recommend/recommend?q=${encodeURIComponent(q.trim())}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let upstreamRes;
    try {
      upstreamRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apimKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw httpError(504, 'Recommendation service timed out after 15s');
      }
      console.error('[recommend] Upstream fetch error:', err.message);
      throw httpError(502, 'Failed to connect to recommendation service');
    } finally {
      clearTimeout(timeoutId);
    }

    let data;
    try {
      data = await upstreamRes.json();
    } catch {
      data = null;
    }

    if (upstreamRes.status === 400) {
      return res.status(400).json(data || { error: 'Please include date, time, and requirements in your query' });
    }

    if (!upstreamRes.ok) {
      console.error(`[recommend] Upstream returned status ${upstreamRes.status}`);
      throw httpError(502, 'Recommendation service returned an error');
    }

    // Format score as a Number on any returned recommendations / results
    const list = data?.recommendations || data?.results;
    if (Array.isArray(list)) {
      for (const r of list) {
        if (r.score !== undefined && r.score !== null) {
          r.score = Number(r.score);
        }
      }
    }

    res.json(data);
  })
);

module.exports = router;

