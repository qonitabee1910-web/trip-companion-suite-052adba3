/**
 * Export the ticket DOM node to PDF or PNG using html-to-image + jsPDF.
 */
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";

const PIXEL_RATIO = 2;

async function nodeToImage(elementId: string, kind: "png" | "jpeg") {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);
  const opts = {
    pixelRatio: PIXEL_RATIO,
    cacheBust: true,
    backgroundColor: "#ffffff",
  };
  return kind === "png" ? toPng(el, opts) : toJpeg(el, { ...opts, quality: 0.95 });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadTicketPNG(elementId: string, bookingId: string) {
  const dataUrl = await nodeToImage(elementId, "png");
  downloadDataUrl(dataUrl, `Ticket-${bookingId}.png`);
}

export async function downloadTicketPDF(elementId: string, bookingId: string) {
  const dataUrl = await nodeToImage(elementId, "jpeg");
  // A6 portrait = 105 x 148 mm; ticket card is 380px wide → fit nicely
  const pdf = new jsPDF({ unit: "mm", format: "a6", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Calculate aspect-preserving dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  const ratio = img.width / img.height;
  let w = pageW - 8;
  let h = w / ratio;
  if (h > pageH - 8) {
    h = pageH - 8;
    w = h * ratio;
  }
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(dataUrl, "JPEG", x, y, w, h);
  pdf.save(`Ticket-${bookingId}.pdf`);
}
