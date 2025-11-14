export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "jarvis-assistant/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export async function getWeatherForCity(cityRaw: string): Promise<string> {
  const city = cityRaw.trim();
  if (!city) return "Please provide a city name for the weather.";

  // Geocoding to get coordinates
  const geo = await fetchJson<{
    results?: Array<{ name: string; latitude: number; longitude: number; country?: string }>;
  }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );

  const loc = geo.results?.[0];
  if (!loc) return `I couldn't find coordinates for ${city}.`;

  const forecast = await fetchJson<{
    current?: { temperature_2m?: number; weather_code?: number };
    current_units?: { temperature_2m?: string };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code`
  );

  const temp = forecast.current?.temperature_2m;
  const unit = forecast.current_units?.temperature_2m || "?C";
  const code = forecast.current?.weather_code;
  const desc = weatherCodeToText(code);
  return `Weather in ${loc.name}${loc.country ? ", " + loc.country : ""}: ${
    temp ?? "?"
  }${unit}, ${desc}.`;
}

export async function getWikiSummary(queryRaw: string): Promise<string> {
  const query = queryRaw.trim();
  if (!query) return "Please provide a topic to look up.";

  // Use REST v1 title search
  const search = await fetchJson<{
    pages: Array<{ id: number; key: string; title: string }>;
  }>(
    `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=1`
  );

  const page = search.pages?.[0];
  if (!page) return `I couldn't find anything about "${query}" on Wikipedia.`;

  const summary = await fetchJson<{
    extract: string;
    title: string;
    content_urls?: { desktop?: { page?: string } };
  }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`);

  const url = summary.content_urls?.desktop?.page;
  return `${summary.title}: ${summary.extract}${url ? `\n\nMore: ${url}` : ""}`;
}

function weatherCodeToText(code?: number): string {
  switch (code) {
    case 0:
      return "clear sky";
    case 1:
    case 2:
    case 3:
      return "partly cloudy";
    case 45:
    case 48:
      return "foggy";
    case 51:
    case 53:
    case 55:
      return "drizzle";
    case 61:
    case 63:
    case 65:
      return "rain";
    case 71:
    case 73:
    case 75:
      return "snow";
    case 95:
    case 96:
    case 99:
      return "thunderstorm";
    default:
      return "unavailable conditions";
  }
}
