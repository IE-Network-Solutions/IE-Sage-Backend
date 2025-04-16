const express = require("express");
const sql = require("mssql");
require("dotenv").config(); // <-- Load env vars at the very top

const app = express();
const port = 3009;
const cors = require("cors");
app.use(cors());

const config = {
  server: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Route to fetch data from SQL Server
app.get("/api/data", async (req, res) => {
  let pool;
  const top = parseInt(req.query.$top) || 100;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * top;
  const countRequested = req.query.$count === "true";

  try {
    pool = await sql.connect(config);

    // Main paginated query
    const result = await pool
      .request()
      .input("skip", sql.Int, skip)
      .input("top", sql.Int, top).query(`
      SELECT *
      FROM (
        SELECT 
          GLJED.*,
          GLJEDO.OPTFIELD,
          GLJEDO.VALUE AS OPTFIELD_VALUE,
          ROW_NUMBER() OVER (ORDER BY GLJED.BATCHNBR DESC) AS RowNum
        FROM GLJED
        LEFT JOIN GLJEDO
          ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
          AND GLJED.JOURNALID = GLJEDO.JOURNALID
      ) AS Paged
      WHERE RowNum > @skip AND RowNum <= (@skip + @top)
    `);

    // Optional total count
    let totalCount = null;
    if (countRequested) {
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM GLJED
        LEFT JOIN GLJEDO
          ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
          AND GLJED.JOURNALID = GLJEDO.JOURNALID
      `);
      totalCount = countResult.recordset[0].total;
    }

    // Custom mapping
    const formattedData = result.recordset.map((entry) => ({
      BatchNumber: entry.BATCHNBR,
      JournalId: entry.JOURNALID,
      TransactionNumber: entry.TRANSNBR,
      AuditDate: entry.AUDTDATE,
      AuditTime: entry.AUDTTIME,
      AuditUser: entry.AUDTUSER?.trim(),
      AuditOrg: entry.AUDTORG?.trim(),
      AccountId: entry.ACCTID?.trim(),
      CompanyId: entry.COMPANYID?.trim(),
      TransactionAmount: entry.TRANSAMT,
      TransactionQuantity: entry.TRANSQTY,
      SourceCurrencyAmount: entry.SCURNAMT,
      SourceCurrencyCode: entry.SCURNCODE,
      SourceCurrencyDecimal: entry.SCURNDEC,
      HomeCurrencyCode: entry.HCURNCODE,
      RateType: entry.RATETYPE,
      ConversionRate: entry.CONVRATE,
      RateSpread: entry.RATESPREAD,
      MatchDateCode: entry.DATEMTCHCD,
      RateOperation: entry.RATEOPER,
      TransactionDescription: entry.TRANSDESC?.trim(),
      TransactionReference: entry.TRANSREF?.trim(),
      TransactionDate: entry.TRANSDATE,
      SourceLedger: entry.SRCELDGR,
      SourceType: entry.SRCETYPE,
      Values: entry.VALUES,
      DepartmentComponent: entry.DESCOMP?.trim(),
      Route: entry.ROUTE,
      OptionalField: entry.OPTFIELD?.trim(),
      OptionalFieldValue: entry.OPTFIELD_VALUE?.trim(),
    }));

    res.json({
      data: formattedData,
      page,
      top,
      count: totalCount,
      totalPages:
        countRequested && totalCount ? Math.ceil(totalCount / top) : undefined,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (pool) await pool.close();
  }
});

app.get("/api/data/solutions", async (req, res) => {
  let pool;

  // Support both $top and top (fallback)
  const top = parseInt(req.query.$top || req.query.top) || 100;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * top;
  const countRequested = req.query.$count === "true";

  try {
    pool = await sql.connect(config);

    // ✅ Use parameters for skip and top
    const result = await pool
      .request()
      .input("skip", sql.Int, skip)
      .input("top", sql.Int, top).query(`
        SELECT *
        FROM (
          SELECT 
            GLJED.*,
            GLJEDO.OPTFIELD,
            GLJEDO.VALUE AS OPTFIELD_VALUE,
            ROW_NUMBER() OVER (ORDER BY GLJED.BATCHNBR DESC) AS RowNum
          FROM GLJED
          LEFT JOIN GLJEDO
            ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
            AND GLJED.JOURNALID = GLJEDO.JOURNALID
          WHERE RTRIM(GLJEDO.OPTFIELD) = 'SOLUTION'
        ) AS Paged
        WHERE RowNum > @skip AND RowNum <= (@skip + @top)
      `);

    let totalCount = null;

    if (countRequested) {
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM GLJED
        LEFT JOIN GLJEDO
          ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
          AND GLJED.JOURNALID = GLJEDO.JOURNALID
        WHERE RTRIM(GLJEDO.OPTFIELD) = 'SOLUTION'
      `);
      totalCount = countResult.recordset[0].total;
    }

    const formattedData = result.recordset.map((entry) => ({
      BatchNumber: entry.BATCHNBR,
      JournalId: entry.JOURNALID,
      TransactionNumber: entry.TRANSNBR,
      AuditDate: entry.AUDTDATE,
      AuditTime: entry.AUDTTIME,
      AuditUser: entry.AUDTUSER?.trim(),
      AuditOrg: entry.AUDTORG?.trim(),
      AccountId: entry.ACCTID?.trim(),
      CompanyId: entry.COMPANYID?.trim(),
      TransactionAmount: entry.TRANSAMT,
      TransactionQuantity: entry.TRANSQTY,
      SourceCurrencyAmount: entry.SCURNAMT,
      SourceCurrencyCode: entry.SCURNCODE,
      SourceCurrencyDecimal: entry.SCURNDEC,
      HomeCurrencyCode: entry.HCURNCODE,
      RateType: entry.RATETYPE,
      ConversionRate: entry.CONVRATE,
      RateSpread: entry.RATESPREAD,
      MatchDateCode: entry.DATEMTCHCD,
      RateOperation: entry.RATEOPER,
      TransactionDescription: entry.TRANSDESC?.trim(),
      TransactionReference: entry.TRANSREF?.trim(),
      TransactionDate: entry.TRANSDATE,
      SourceLedger: entry.SRCELDGR,
      SourceType: entry.SRCETYPE,
      Values: entry.VALUES,
      DepartmentComponent: entry.DESCOMP?.trim(),
      Route: entry.ROUTE,
      OptionalField: entry.OPTFIELD?.trim(),
      OptionalFieldValue: entry.OPTFIELD_VALUE?.trim(),
    }));

    res.json({
      data: formattedData,
      page,
      top,
      count: totalCount,
      totalPages:
        countRequested && totalCount ? Math.ceil(totalCount / top) : undefined,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (pool) await pool.close();
  }
});
app.get("/api/data/business-unit", async (req, res) => {
  let pool;

  // Support both $top and top (fallback)
  const top = parseInt(req.query.$top || req.query.top) || 100;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * top;
  const countRequested = req.query.$count === "true";

  try {
    pool = await sql.connect(config);

    // ✅ Use parameters for skip and top
    const result = await pool
      .request()
      .input("skip", sql.Int, skip)
      .input("top", sql.Int, top).query(`
        SELECT *
        FROM (
          SELECT 
            GLJED.*,
            GLJEDO.OPTFIELD,
            GLJEDO.VALUE AS OPTFIELD_VALUE,
            ROW_NUMBER() OVER (ORDER BY GLJED.BATCHNBR DESC) AS RowNum
          FROM GLJED
          LEFT JOIN GLJEDO
            ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
            AND GLJED.JOURNALID = GLJEDO.JOURNALID
          WHERE RTRIM(GLJEDO.OPTFIELD) = 'BUUNIT'
        ) AS Paged
        WHERE RowNum > @skip AND RowNum <= (@skip + @top)
      `);

    let totalCount = null;

    if (countRequested) {
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM GLJED
        LEFT JOIN GLJEDO
          ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
          AND GLJED.JOURNALID = GLJEDO.JOURNALID
        WHERE RTRIM(GLJEDO.OPTFIELD) = 'BUUNIT'
      `);
      totalCount = countResult.recordset[0].total;
    }

    const formattedData = result.recordset.map((entry) => ({
      BatchNumber: entry.BATCHNBR,
      JournalId: entry.JOURNALID,
      TransactionNumber: entry.TRANSNBR,
      AuditDate: entry.AUDTDATE,
      AuditTime: entry.AUDTTIME,
      AuditUser: entry.AUDTUSER?.trim(),
      AuditOrg: entry.AUDTORG?.trim(),
      AccountId: entry.ACCTID?.trim(),
      CompanyId: entry.COMPANYID?.trim(),
      TransactionAmount: entry.TRANSAMT,
      TransactionQuantity: entry.TRANSQTY,
      SourceCurrencyAmount: entry.SCURNAMT,
      SourceCurrencyCode: entry.SCURNCODE,
      SourceCurrencyDecimal: entry.SCURNDEC,
      HomeCurrencyCode: entry.HCURNCODE,
      RateType: entry.RATETYPE,
      ConversionRate: entry.CONVRATE,
      RateSpread: entry.RATESPREAD,
      MatchDateCode: entry.DATEMTCHCD,
      RateOperation: entry.RATEOPER,
      TransactionDescription: entry.TRANSDESC?.trim(),
      TransactionReference: entry.TRANSREF?.trim(),
      TransactionDate: entry.TRANSDATE,
      SourceLedger: entry.SRCELDGR,
      SourceType: entry.SRCETYPE,
      Values: entry.VALUES,
      DepartmentComponent: entry.DESCOMP?.trim(),
      Route: entry.ROUTE,
      OptionalField: entry.OPTFIELD?.trim(),
      OptionalFieldValue: entry.OPTFIELD_VALUE?.trim(),
    }));

    res.json({
      data: formattedData,
      page,
      top,
      count: totalCount,
      totalPages:
        countRequested && totalCount ? Math.ceil(totalCount / top) : undefined,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (pool) await pool.close();
  }
});
app.get("/api/data/sector", async (req, res) => {
  let pool;

  // Support both $top and top (fallback)
  const top = parseInt(req.query.$top || req.query.top) || 100;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * top;
  const countRequested = req.query.$count === "true";

  try {
    pool = await sql.connect(config);

    // ✅ Use parameters for skip and top
    const result = await pool
      .request()
      .input("skip", sql.Int, skip)
      .input("top", sql.Int, top).query(`
        SELECT *
        FROM (
          SELECT 
            GLJED.*,
            GLJEDO.OPTFIELD,
            GLJEDO.VALUE AS OPTFIELD_VALUE,
            ROW_NUMBER() OVER (ORDER BY GLJED.BATCHNBR DESC) AS RowNum
          FROM GLJED
          LEFT JOIN GLJEDO
            ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
            AND GLJED.JOURNALID = GLJEDO.JOURNALID
          WHERE RTRIM(GLJEDO.OPTFIELD) = 'SECTOR'
        ) AS Paged
        WHERE RowNum > @skip AND RowNum <= (@skip + @top)
      `);

    let totalCount = null;

    if (countRequested) {
      const countResult = await pool.request().query(`
        SELECT COUNT(*) AS total
        FROM GLJED
        LEFT JOIN GLJEDO
          ON GLJED.TRANSNBR = GLJEDO.TRANSNBR
          AND GLJED.JOURNALID = GLJEDO.JOURNALID
        WHERE RTRIM(GLJEDO.OPTFIELD) = 'SECTOR'
      `);
      totalCount = countResult.recordset[0].total;
    }

    const formattedData = result.recordset.map((entry) => ({
      BatchNumber: entry.BATCHNBR,
      JournalId: entry.JOURNALID,
      TransactionNumber: entry.TRANSNBR,
      AuditDate: entry.AUDTDATE,
      AuditTime: entry.AUDTTIME,
      AuditUser: entry.AUDTUSER?.trim(),
      AuditOrg: entry.AUDTORG?.trim(),
      AccountId: entry.ACCTID?.trim(),
      CompanyId: entry.COMPANYID?.trim(),
      TransactionAmount: entry.TRANSAMT,
      TransactionQuantity: entry.TRANSQTY,
      SourceCurrencyAmount: entry.SCURNAMT,
      SourceCurrencyCode: entry.SCURNCODE,
      SourceCurrencyDecimal: entry.SCURNDEC,
      HomeCurrencyCode: entry.HCURNCODE,
      RateType: entry.RATETYPE,
      ConversionRate: entry.CONVRATE,
      RateSpread: entry.RATESPREAD,
      MatchDateCode: entry.DATEMTCHCD,
      RateOperation: entry.RATEOPER,
      TransactionDescription: entry.TRANSDESC?.trim(),
      TransactionReference: entry.TRANSREF?.trim(),
      TransactionDate: entry.TRANSDATE,
      SourceLedger: entry.SRCELDGR,
      SourceType: entry.SRCETYPE,
      Values: entry.VALUES,
      DepartmentComponent: entry.DESCOMP?.trim(),
      Route: entry.ROUTE,
      OptionalField: entry.OPTFIELD?.trim(),
      OptionalFieldValue: entry.OPTFIELD_VALUE?.trim(),
    }));

    res.json({
      data: formattedData,
      page,
      top,
      count: totalCount,
      totalPages:
        countRequested && totalCount ? Math.ceil(totalCount / top) : undefined,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (pool) await pool.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
