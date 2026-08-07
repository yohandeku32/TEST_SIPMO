import { connect } from "@tidbcloud/serverless";

function getConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum diatur di Vercel.");
  }

  return connect({
    url: databaseUrl,
    fullResult: true
  });
}

function normalizeForJson(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeForJson);
  }

  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = normalizeForJson(item);
    }
    return result;
  }

  return value;
}

function getFirstSqlKeyword(sql) {
  return String(sql || "")
    .trim()
    .replace(/^\/\*[\s\S]*?\*\/\s*/, "")
    .split(/\s+/)[0]
    .toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const conn = getConnection();

    // GET hanya untuk health check koneksi Vercel -> TiDB.
    if (req.method === "GET") {
      const result = await conn.execute(
        "SELECT DATABASE() AS DATABASE_NAME, NOW() AS SERVER_TIME"
      );

      return res.status(200).json({
        success: true,
        message: "Vercel API berhasil terhubung ke TiDB.",
        rows: normalizeForJson(result.rows || []),
        rowCount: Number(result.rowCount || 0)
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({
        success: false,
        message: "Method tidak diizinkan."
      });
    }

    const apiSecret = String(
      process.env.SIPMODAG_API_SECRET || ""
    );

    const requestSecret = String(
      req.headers["x-sipmodag-key"] || ""
    );

    if (!apiSecret) {
      return res.status(500).json({
        success: false,
        message: "SIPMODAG_API_SECRET belum diatur di Vercel."
      });
    }

    if (!requestSecret || requestSecret !== apiSecret) {
      return res.status(401).json({
        success: false,
        message: "API key tidak valid."
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const sql = String(body.sql || "").trim();
    const params = Array.isArray(body.params)
      ? body.params
      : [];

    if (!sql) {
      return res.status(400).json({
        success: false,
        message: "SQL belum dikirim."
      });
    }

    // SIPMODAG saat ini hanya membutuhkan satu statement per request.
    const sqlWithoutFinalSemicolon =
      sql.replace(/;\s*$/, "");

    if (sqlWithoutFinalSemicolon.includes(";")) {
      return res.status(400).json({
        success: false,
        message: "Multiple SQL statements tidak diizinkan."
      });
    }

    const keyword = getFirstSqlKeyword(sql);

    // Sesuai query yang digunakan Code.gs SIPMODAG sekarang.
    const allowed = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE"
    ];

    if (!allowed.includes(keyword)) {
      return res.status(403).json({
        success: false,
        message:
          "Perintah SQL tidak diizinkan. Hanya SELECT, INSERT, UPDATE, dan DELETE."
      });
    }

    const result = await conn.execute(
      sql,
      params
    );

    return res.status(200).json({
      success: true,
      command: keyword,
      rows: normalizeForJson(result.rows || []),
      rowCount: Number(result.rowCount || 0),
      rowsAffected:
        result.rowsAffected === null ||
        result.rowsAffected === undefined
          ? 0
          : Number(result.rowsAffected),
      lastInsertId:
        result.lastInsertId === null ||
        result.lastInsertId === undefined
          ? null
          : String(result.lastInsertId)
    });

  } catch (error) {
    console.error(
      "SIPMODAG DATABASE API ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Terjadi kesalahan pada database API."
    });
  }
}
