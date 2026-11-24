// Forwards document uploads to the extraction service (services/extraction).
// Browsers never call that service directly: the API checks who is asking and how big the upload is first.
import { Readable } from "node:stream";
import { Router } from "express";
import type { Response } from "express";
import { isDemoRole } from "./demo-organizations.js";

/** The extraction service accepts files up to 10 MB; allow a little extra for the multipart headers. */
export const maxUploadBytes = 10 * 1024 * 1024 + 64 * 1024;

const timeoutMs = 60_000;

/** Extraction errors that describe a problem with the upload itself and are safe to pass on. */
const clientErrors = new Set([400, 413, 415, 422]);

function sendError(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

async function errorDetail(upstream: globalThis.Response): Promise<string | null> {
  const body: unknown = await upstream.json().catch(() => null);
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") {
    return body.detail;
  }
  return null;
}

export function extractionRouter(extractionUrl: string): Router {
  const router = Router();

  // Body: multipart/form-data with one `file` field (PDF, PNG or JPEG). Response: the extraction
  // service's InvoiceExtraction (fields with confidence, line items, review reasons), unchanged.
  router.post("/extract/invoice", async (req, res) => {
    const { role } = req.query;
    if (!isDemoRole(role)) {
      sendError(res, 400, "Query parameter role must be supplier, buyer, lender-a or lender-b.");
      return;
    }
    if (role !== "supplier") {
      sendError(res, 403, "Only the supplier can upload an invoice.");
      return;
    }
    if (!req.is("multipart/form-data")) {
      sendError(res, 415, "Send the invoice as multipart/form-data with a file field.");
      return;
    }
    const length = Number(req.headers["content-length"]);
    if (!Number.isFinite(length)) {
      sendError(res, 411, "The upload must state its size.");
      return;
    }
    if (length > maxUploadBytes) {
      sendError(res, 413, "File is larger than 10 MB.");
      return;
    }

    // Stream the request straight through: the file is never buffered or stored by the API.
    // `duplex` is required by Node's fetch for a streamed body but missing from its RequestInit type.
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: { "content-type": req.headers["content-type"] ?? "" },
      body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
      duplex: "half",
      signal: AbortSignal.timeout(timeoutMs),
    };

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(`${extractionUrl}/extract/invoice`, init);
    } catch {
      sendError(res, 502, "The extraction service is unavailable. Try again, or enter the fields manually.");
      return;
    }

    if (upstream.ok) {
      res.json(await upstream.json());
      return;
    }
    if (clientErrors.has(upstream.status)) {
      sendError(res, upstream.status, (await errorDetail(upstream)) ?? "The document could not be read.");
      return;
    }
    sendError(res, 502, "The extraction service failed. Try again, or enter the fields manually.");
  });

  return router;
}
