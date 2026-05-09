import QRCode from "qrcode";

interface CouponInfo {
  code: string;
  name: string;
  category?: string;
  type: string;
  value: number;
  minPurchase: number;
  startDate: Date | string;
  endDate: Date | string;
  limitType: string;
  serviceNote?: string | null;
}

interface TokenInfo {
  id: string;
  usedAt: Date | null | string;
}

export async function printCouponTokens(
  businessName: string,
  businessSlug: string,
  coupon: CouponInfo,
  tokens: TokenInfo[],
  logoUrl?: string
) {
  const unused = tokens.filter((t) => !t.usedAt);

  if (unused.length === 0) {
    alert("No hay tokens disponibles para imprimir (todos han sido canjeados).");
    return;
  }

  const bodyStyles = getComputedStyle(document.body);
  const BRAND   = bodyStyles.getPropertyValue("--color-brand-500").trim() || "#f72c5b";
  const BRAND_D = bodyStyles.getPropertyValue("--color-brand-700").trim() || "#be123c";

  // Resolve logo to absolute URL so the new window can load it
  const resolvedLogo =
    logoUrl ?? `${window.location.origin}/${businessSlug}/logo.png`;

  // El QR codifica el ID corto (primeros 8 chars del UUID) — mismo valor visible en el cupón
  const qrUrls = await Promise.all(
    unused.map((t) =>
      QRCode.toDataURL(t.id.slice(0, 8).toUpperCase(), {
        width: 300,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
    )
  );

  const discountText =
    coupon.type === "PERCENTAGE"
      ? `${coupon.value}% OFF`
      : `$${coupon.value.toFixed(2)} OFF`;

  const needsDates =
    coupon.limitType === "DATE" || coupon.limitType === "BOTH";

  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Mexico_City",
    });

  const dateRange = needsDates ? `${fmt(coupon.startDate)} – ${fmt(coupon.endDate)}` : null;
  const minPurchaseText =
    coupon.minPurchase > 0 ? `Compra mínima $${coupon.minPurchase.toFixed(2)}` : null;

  const cards = unused
    .map(
      (token, i) => `
    <div class="card">

      <!-- Barra superior de color de marca -->
      <div class="top-bar"></div>

      <!-- Cabecera: logo sobre fondo blanco -->
      <div class="header">
        <div class="logo-wrap">
          <img class="logo" src="${resolvedLogo}" alt="${businessName}" onerror="this.style.display='none'" />
        </div>
        <div class="header-info">
          <span class="biz">${businessName}</span>
          <span class="coupon-name">${coupon.name}</span>
        </div>
        <div class="discount-badge">${discountText}</div>
      </div>

      <!-- Separador -->
      <div class="sep"></div>

      <!-- Cuerpo principal -->
      <div class="body">
        <div class="left">
          <ul class="conditions">
            ${minPurchaseText ? `<li>${minPurchaseText}</li>` : ""}
            ${dateRange ? `<li>Vigencia: ${dateRange}</li>` : ""}
            <li>No acumulable con otras promociones</li>
            <li>Válido una sola vez · Intransferible</li>
            <li>Presentar al momento del pago</li>
          </ul>
        </div>
        <div class="right">
          <img class="qr" src="${qrUrls[i]}" alt="QR ${token.id}" />
          <span class="scan-hint">Escanear al cobrar</span>
        </div>
      </div>

      <!-- Pie con color de marca -->
      <div class="footer">
        <span class="code-label">ID ÚNICO</span>
        <span class="short-id">${token.id.slice(0, 8).toUpperCase()}</span>
        <span class="uuid">${token.id}</span>
      </div>

    </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cupones – ${coupon.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;background:#f0f0f0;padding:12mm}

    /* ── Barra de impresión ── */
    .print-bar{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:10mm;
    }
    .print-bar h1{font-size:13px;color:#555;font-weight:normal}
    .print-bar h1 strong{color:#111;display:block;font-size:16px}
    .print-bar button{
      padding:9px 24px;background:${BRAND};color:#fff;border:none;
      border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;
    }
    .print-bar button:hover{background:${BRAND_D}}

    .grid{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:6mm;
    }

    /* ── Card ── */
    .card{
      background:#fff;
      border-radius:3mm;
      overflow:hidden;
      box-shadow:0 2px 8px rgba(0,0,0,.13);
      display:flex;
      flex-direction:column;
      page-break-inside:avoid;
    }

    /* Barra superior de color */
    .top-bar{
      height:3mm;
      background:${BRAND};
    }

    /* Header: logo sobre fondo blanco */
    .header{
      background:#fff;
      display:flex;
      align-items:center;
      gap:3mm;
      padding:3mm 4mm 2mm;
    }
    .logo-wrap{
      background:#f8f8f8;
      border:1px solid #eee;
      border-radius:2mm;
      padding:1.5mm;
      display:flex;
      align-items:center;
      justify-content:center;
      flex-shrink:0;
    }
    .logo{
      height:14mm;
      width:auto;
      max-width:30mm;
      object-fit:contain;
      display:block;
    }
    .header-info{
      flex:1;
      display:flex;
      flex-direction:column;
      gap:0.5mm;
      min-width:0;
    }
    .biz{
      font-size:7.5pt;
      font-weight:700;
      color:#444;
      letter-spacing:.4px;
      text-transform:uppercase;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .coupon-name{
      font-size:8pt;
      font-weight:600;
      color:#222;
    }
    .discount-badge{
      background:${BRAND};
      color:#fff;
      font-size:13pt;
      font-weight:900;
      padding:2mm 3.5mm;
      border-radius:2mm;
      white-space:nowrap;
      flex-shrink:0;
      letter-spacing:.5px;
    }

    /* Separador */
    .sep{
      height:1px;
      background:#eee;
      margin:0 4mm;
    }

    /* Body */
    .body{
      display:flex;
      gap:3mm;
      padding:3mm 4mm;
      flex:1;
      align-items:flex-start;
    }
    .left{
      flex:1;
    }
    .conditions{
      list-style:none;
      display:flex;
      flex-direction:column;
      gap:1.2mm;
    }
    .conditions li{
      font-size:6pt;
      color:#666;
      padding-left:7px;
      position:relative;
      line-height:1.3;
    }
    .conditions li::before{
      content:"▸";
      position:absolute;
      left:0;
      color:${BRAND};
      font-size:5pt;
      top:0.5pt;
    }

    /* QR */
    .right{
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:1mm;
      flex-shrink:0;
    }
    .qr{
      width:28mm;
      height:28mm;
      border:1px solid #eee;
      border-radius:1.5mm;
      padding:1mm;
    }
    .scan-hint{
      font-size:5pt;
      color:#aaa;
      text-align:center;
    }

    /* Footer con color de marca */
    .footer{
      background:${BRAND};
      padding:2mm 4mm;
      display:flex;
      align-items:center;
      gap:2mm;
    }
    .code-label{
      font-size:5pt;
      color:rgba(255,255,255,.7);
      text-transform:uppercase;
      letter-spacing:.5px;
      flex-shrink:0;
    }
    .short-id{
      font-family:monospace;
      font-size:8.5pt;
      font-weight:700;
      color:#fff;
      letter-spacing:2px;
    }
    .uuid{
      font-family:monospace;
      font-size:3.5pt;
      color:rgba(255,255,255,.5);
      margin-left:auto;
      word-break:break-all;
      text-align:right;
      max-width:40mm;
    }

    /* Print overrides */
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      body{background:#fff;padding:5mm}
      .print-bar{display:none}
      .grid{gap:4mm}
      .card{box-shadow:none;border:1px solid #ddd}
      @page{margin:8mm;size:A4 portrait}
    }
  </style>
</head>
<body>

  <div class="print-bar">
    <h1>
      <strong>${coupon.name}</strong>
      ${unused.length} cupón${unused.length !== 1 ? "es" : ""} listo${unused.length !== 1 ? "s" : ""} para imprimir
    </h1>
    <button onclick="window.print()">🖨️&nbsp; Imprimir</button>
  </div>

  <div class="grid">${cards}</div>

</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo."
    );
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── GENERIC batch print ──────────────────────────────────────────────────────

/**
 * Imprime N copias del mismo cupón GENÉRICO.
 * Todos los cupones son idénticos: usan el código compartido como QR.
 * No genera ni consume tokens.
 */
export async function printGenericCopies(
  businessName: string,
  businessSlug: string,
  coupon: CouponInfo,
  count: number,
) {
  const safeCount = Math.min(Math.max(1, count), 200);

  const bodyStyles = getComputedStyle(document.body);
  const BRAND   = bodyStyles.getPropertyValue("--color-brand-500").trim() || "#f72c5b";
  const BRAND_D = bodyStyles.getPropertyValue("--color-brand-700").trim() || "#be123c";

  const resolvedLogo = `${window.location.origin}/${businessSlug}/logo.png`;

  // Un solo QR con el código genérico — se reutiliza en todas las copias
  const qrDataUrl = await QRCode.toDataURL(coupon.code, {
    width: 300, margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  const discountText = coupon.category === "COURTESY"
    ? "CORTESÍA"
    : coupon.type === "PERCENTAGE"
      ? `${coupon.value}% OFF`
      : `$${coupon.value.toFixed(2)} OFF`;

  const needsDates = coupon.limitType === "DATE" || coupon.limitType === "BOTH";
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
  const dateRange = needsDates ? `${fmt(coupon.startDate)} – ${fmt(coupon.endDate)}` : null;
  const minPurchaseText = coupon.minPurchase > 0 ? `Compra mínima $${coupon.minPurchase.toFixed(2)}` : null;

  const card = `
    <div class="card">
      <div class="top-bar"></div>
      <div class="header">
        <div class="logo-wrap">
          <img class="logo" src="${resolvedLogo}" alt="${businessName}" onerror="this.style.display='none'" />
        </div>
        <div class="header-info">
          <span class="biz">${businessName}</span>
          <span class="coupon-name">${coupon.name}</span>
        </div>
        <div class="discount-badge">${discountText}</div>
      </div>
      <div class="sep"></div>
      <div class="body">
        <div class="left">
          <ul class="conditions">
            ${minPurchaseText ? `<li>${minPurchaseText}</li>` : ""}
            ${dateRange ? `<li>Vigencia: ${dateRange}</li>` : ""}
            <li>No acumulable con otras promociones</li>
            <li>Presentar al momento del pago</li>
          </ul>
        </div>
        <div class="right">
          <img class="qr" src="${qrDataUrl}" alt="QR ${coupon.code}" />
          <span class="scan-hint">Escanear al cobrar</span>
        </div>
      </div>
      <div class="footer">
        <span class="code-label">CÓDIGO</span>
        <span class="short-id">${coupon.code}</span>
      </div>
    </div>`;

  const cards = Array.from({ length: safeCount }, () => card).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cupones – ${coupon.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;background:#f0f0f0;padding:12mm}
    .print-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10mm}
    .print-bar h1{font-size:13px;color:#555;font-weight:normal}
    .print-bar h1 strong{color:#111;display:block;font-size:16px}
    .print-bar button{padding:9px 24px;background:${BRAND};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .print-bar button:hover{background:${BRAND_D}}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}
    .card{background:#fff;border-radius:3mm;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.13);display:flex;flex-direction:column;page-break-inside:avoid}
    .top-bar{height:3mm;background:${BRAND}}
    .header{background:#fff;display:flex;align-items:center;gap:3mm;padding:3mm 4mm 2mm}
    .logo-wrap{background:#f8f8f8;border:1px solid #eee;border-radius:2mm;padding:1.5mm;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .logo{height:14mm;width:auto;max-width:30mm;object-fit:contain;display:block}
    .header-info{flex:1;display:flex;flex-direction:column;gap:.5mm;min-width:0}
    .biz{font-size:7.5pt;font-weight:700;color:#444;letter-spacing:.4px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .coupon-name{font-size:8pt;font-weight:600;color:#222}
    .discount-badge{background:${BRAND};color:#fff;font-size:13pt;font-weight:900;padding:2mm 3.5mm;border-radius:2mm;white-space:nowrap;flex-shrink:0;letter-spacing:.5px}
    .sep{height:1px;background:#eee;margin:0 4mm}
    .body{display:flex;gap:3mm;padding:3mm 4mm;flex:1;align-items:flex-start}
    .left{flex:1}
    .conditions{list-style:none;display:flex;flex-direction:column;gap:1.2mm}
    .conditions li{font-size:6pt;color:#666;padding-left:7px;position:relative;line-height:1.3}
    .conditions li::before{content:"▸";position:absolute;left:0;color:${BRAND};font-size:5pt;top:.5pt}
    .right{display:flex;flex-direction:column;align-items:center;gap:1mm;flex-shrink:0}
    .qr{width:28mm;height:28mm;border:1px solid #eee;border-radius:1.5mm;padding:1mm}
    .scan-hint{font-size:5pt;color:#aaa;text-align:center}
    .footer{background:${BRAND};padding:2mm 4mm;display:flex;align-items:center;gap:2mm}
    .code-label{font-size:5pt;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
    .short-id{font-family:monospace;font-size:8.5pt;font-weight:700;color:#fff;letter-spacing:2px}
    @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff;padding:5mm}.print-bar{display:none}.grid{gap:4mm}.card{box-shadow:none;border:1px solid #ddd}@page{margin:8mm;size:A4 portrait}}
  </style>
</head>
<body>
  <div class="print-bar">
    <h1>
      <strong>${coupon.name}</strong>
      ${safeCount} copia${safeCount !== 1 ? "s" : ""} del código <code>${coupon.code}</code>
    </h1>
    <button onclick="window.print()">🖨️&nbsp; Imprimir</button>
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── Helpers for downloadCouponImage ─────────────────────────────────────────

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "America/Mexico_City",
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Genera y descarga (o comparte en móvil) una imagen PNG de un cupón individual.
 * - DATE: usa código genérico, sin límite de usos.
 * - QUANTITY/BOTH: se debe pasar un `token` con su ID para embeber el folio único.
 */
export async function downloadCouponImage(
  businessName: string,
  businessSlug: string,
  coupon: CouponInfo,
  token?: { id: string },
) {
  const cs = getComputedStyle(document.documentElement);
  const BRAND = cs.getPropertyValue("--color-brand-500").trim() || "#f72c5b";

  const isCourtesy = coupon.category === "COURTESY";

  // Si viene token: QR = ID corto (8 chars), igual que el impreso físico.
  // Sin token (DATE): QR = código genérico.
  const qrContent = token
    ? token.id.slice(0, 8).toUpperCase()
    : coupon.code;
  const footerLabel = token ? "FOLIO ÚNICO" : "CÓDIGO";
  const footerValue = token ? token.id.slice(0, 8).toUpperCase() : coupon.code;

  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 280, margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  const [logoImg, qrImg] = await Promise.all([
    loadImg(`${window.location.origin}/${businessSlug}/logo.png`),
    loadImg(qrDataUrl),
  ]);

  // Canvas 1080×540 (2:1, ideal para historias/posts)
  const W = 1080, H = 540;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Fondo blanco ──
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Barra superior de marca ──
  const BAR = 22;
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, BAR);

  // ── Constantes de layout ──
  const PAD = 52;
  const QR_SIZE = 196;
  const rightColX = W - PAD - QR_SIZE;  // X donde empieza columna derecha
  const leftW = rightColX - PAD - 32;   // ancho disponible columna izquierda

  // ── Logo ──
  const LOGO_H = 54;
  let logoW = 0;
  const logoY = BAR + PAD;
  if (logoImg) {
    logoW = Math.min(120, (logoImg.width * LOGO_H) / logoImg.height);
    ctx.drawImage(logoImg, PAD, logoY, logoW, LOGO_H);
  }

  // ── Nombre del negocio ──
  ctx.textBaseline = "top";
  ctx.fillStyle = "#999999";
  ctx.font = "bold 15px Arial, Helvetica, sans-serif";
  ctx.fillText(businessName.toUpperCase(), PAD, logoY + LOGO_H + 14);

  // ── Nombre del cupón (multilinea) ──
  ctx.fillStyle = "#111111";
  ctx.font = "bold 34px Arial, Helvetica, sans-serif";
  const nameWords = coupon.name.split(" ");
  let nameLine = "", nameLineY = logoY + LOGO_H + 44;
  const NAME_LH = 40;
  for (const word of nameWords) {
    const test = nameLine + word + " ";
    if (ctx.measureText(test).width > leftW && nameLine) {
      ctx.fillText(nameLine.trim(), PAD, nameLineY);
      nameLine = word + " ";
      nameLineY += NAME_LH;
    } else {
      nameLine = test;
    }
  }
  ctx.fillText(nameLine.trim(), PAD, nameLineY);
  const afterName = nameLineY + NAME_LH;

  // ── Badge de descuento (arriba derecha) ──
  const badgeText = isCourtesy
    ? "CORTESÍA"
    : coupon.type === "PERCENTAGE"
      ? `${coupon.value}% OFF`
      : `$${Number(coupon.value).toFixed(0)} OFF`;

  ctx.font = "bold 28px Arial, Helvetica, sans-serif";
  const BTW = ctx.measureText(badgeText).width;
  const BPX = 24, BPY = 14;
  const BW = BTW + BPX * 2, BH = 56;
  const badgeX = W - PAD - BW, badgeY = BAR + PAD;

  ctx.fillStyle = BRAND;
  rrect(ctx, badgeX, badgeY, BW, BH, 10);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + BW / 2, badgeY + BH / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // ── Divisor horizontal ──
  const DIV_Y = Math.max(afterName + 18, BAR + PAD + LOGO_H + 128);
  ctx.strokeStyle = "#eeeeee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, DIV_Y);
  ctx.lineTo(W - PAD, DIV_Y);
  ctx.stroke();

  // ── QR code ──
  const qrY = DIV_Y + 18;
  if (qrImg) {
    ctx.drawImage(qrImg, rightColX, qrY, QR_SIZE, QR_SIZE);
  }
  ctx.fillStyle = "#bbbbbb";
  ctx.font = "14px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Escanear al cobrar", rightColX + QR_SIZE / 2, qrY + QR_SIZE + 16);
  ctx.textAlign = "left";

  // ── Condiciones ──
  const needsDates = coupon.limitType === "DATE" || coupon.limitType === "BOTH";
  const conds: string[] = [];
  if (needsDates) conds.push(`Vigencia: ${fmtDate(coupon.startDate)} – ${fmtDate(coupon.endDate)}`);
  if (Number(coupon.minPurchase) > 0) conds.push(`Compra mínima $${Number(coupon.minPurchase).toFixed(2)}`);
  if (isCourtesy && coupon.serviceNote) {
    try {
      const svcs = JSON.parse(coupon.serviceNote) as { name: string }[];
      if (svcs.length) conds.push(`Incluye: ${svcs.map(s => s.name).join(", ")}`);
    } catch { /* serviceNote plain text */ }
  }
  conds.push("No acumulable con otras promociones");
  conds.push("Presentar al momento del pago");

  ctx.font = "17px Arial, Helvetica, sans-serif";
  const condStartY = DIV_Y + 26;
  conds.forEach((cond, i) => {
    const cy = condStartY + i * 30;
    ctx.fillStyle = BRAND;
    ctx.fillText("▸", PAD, cy);
    ctx.fillStyle = "#555555";
    // Wrap long conditions
    const maxCondW = leftW - 22;
    if (ctx.measureText(cond).width > maxCondW) {
      const words = cond.split(" ");
      let cl = "", clY = cy;
      for (const w of words) {
        const t = cl + w + " ";
        if (ctx.measureText(t).width > maxCondW && cl) {
          ctx.fillText(cl.trim(), PAD + 22, clY);
          cl = w + " ";
          clY += 22;
        } else { cl = t; }
      }
      ctx.fillText(cl.trim(), PAD + 22, clY);
    } else {
      ctx.fillText(cond, PAD + 22, cy);
    }
  });

  // ── Footer con color de marca ──
  const FOOTER_H = 72;
  const footerY = H - FOOTER_H;
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, footerY, W, FOOTER_H);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "12px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(footerLabel, PAD, footerY + 14);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 30px monospace`;
  ctx.textBaseline = "top";
  ctx.fillText(footerValue, PAD, footerY + 32);

  // ── Descargar o compartir ──
  canvas.toBlob((blob) => {
    if (!blob) return;
    const filename = `cupon-${footerValue}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      (navigator as any).canShare?.({ files: [file] })
    ) {
      (navigator as any)
        .share({
          files: [file],
          title: `Cupón: ${coupon.name}`,
          text: `Usa el código ${coupon.code} al pagar en ${businessName}`,
        })
        .catch(() => triggerDownload(blob, filename));
    } else {
      triggerDownload(blob, filename);
    }
  }, "image/png");
}
