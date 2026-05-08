import QRCode from "qrcode";

interface CouponInfo {
  code: string;
  name: string;
  type: string;
  value: number;
  minPurchase: number;
  startDate: Date | string;
  endDate: Date | string;
  limitType: string;
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
