/**
 * Fetch cover images from free image APIs (Pexels or Unsplash).
 * Pexels: 200 req/hr, 20,000/mo free - https://www.pexels.com/api/
 * Unsplash: 50 req/hr, 5,000/mo free - https://unsplash.com/developers
 */

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';
const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';

export async function fetchCoverImage({ topic, apiKey, provider = 'pexels', logger }) {
  const log = logger || console.log.bind(console);
  const query = buildImageQuery(topic);

  if (provider === 'unsplash') {
    return fetchFromUnsplash({ query, apiKey, log });
  }
  return fetchFromPexels({ query, apiKey, log });
}

function buildImageQuery(topic) {
  const keywords = topic
    .toLowerCase()
    .replace(/how to|download|save|video|pinterest|reel|pin/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const baseTerms = ['Pinterest', 'video', 'download', 'technology', 'smartphone', 'computer'];
  const specificTerms = keywords.split(' ').filter(Boolean);
  return [...baseTerms, ...specificTerms].slice(0, 5).join(' ');
}

async function fetchFromPexels({ query, apiKey, log }) {
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is required. Get one free at https://www.pexels.com/api/');
  }

  log(`  fetching cover image from Pexels for: "${query}"`);
  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`;

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error('Pexels API key invalid (401). Check PEXELS_API_KEY.');
    }
    if (res.status === 429) {
      throw new Error('Pexels rate limit hit (429). Free tier: 200 requests/hour.');
    }
    throw new Error(`Pexels request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const photo = json.photos?.[0];

  if (!photo) {
    throw new Error('No images found on Pexels for this query.');
  }

  return {
    url: photo.src.large2x || photo.src.large || photo.src.original,
    alt: photo.alt || query,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    provider: 'pexels',
  };
}

async function fetchFromUnsplash({ query, apiKey, log }) {
  if (!apiKey) {
    throw new Error('UNSPLASH_API_KEY is required. Get one free at https://unsplash.com/developers');
  }

  log(`  fetching cover image from Unsplash for: "${query}"`);
  const url = `${UNSPLASH_API_URL}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error('Unsplash API key invalid (401). Check UNSPLASH_API_KEY.');
    }
    if (res.status === 429) {
      throw new Error('Unsplash rate limit hit (429). Demo tier: 50 requests/hour.');
    }
    throw new Error(`Unsplash request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const photo = json.results?.[0];

  if (!photo) {
    throw new Error('No images found on Unsplash for this query.');
  }

  return {
    url: photo.urls.regular,
    alt: photo.alt_description || photo.description || query,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    provider: 'unsplash',
  };
}

export function buildImageHtml(image, topic) {
  const attribution = image.photographer
    ? `<p style="font-size:0.8em;color:#666;margin-top:8px;">Cover photo by <a href="${image.photographerUrl}" target="_blank" rel="noopener">${image.photographer}</a> on ${image.provider.charAt(0).toUpperCase() + image.provider.slice(1)}</p>`
    : '';

  return `
<figure style="margin:0 0 24px 0;">
  <img src="${image.url}" alt="${image.alt || topic}" style="width:100%;height:auto;max-width:100%;border-radius:8px;display:block;" loading="lazy" />
  ${attribution}
</figure>
`.trim();
}