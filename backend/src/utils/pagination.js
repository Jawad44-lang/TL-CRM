export function paginate(query, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  return { skip: (p - 1) * l, limit: l, page: p };
}

export function pageMeta(total, { skip, limit, page }) {
  return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
