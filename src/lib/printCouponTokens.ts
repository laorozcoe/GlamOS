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

      <!-- Cabecera con color de marca -->
      <div class="header">
        <img class="logo" src="${resolvedLogo}" alt="${businessName}" onerror="this.style.display='none'" />
        <span class="biz">${businessName}</span>
      </div>

      <!-- Cuerpo principal -->
      <div class="body">
        <div class="left">
          <div class="discount">${discountText}</div>
          <div class="coupon-name">${coupon.name}</div>

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

      <!-- Pie con ID único del token -->
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
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;padding:12mm}

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
      border-radius:4mm;
      overflow:hidden;
      box-shadow:0 1px 4px rgba(0,0,0,.12);
      display:flex;
      flex-direction:column;
      page-break-inside:avoid;
    }

    /* Header */
    .header{
      background:${BRAND};
      display:flex;
      align-items:center;
      gap:3mm;
      padding:3mm 4mm;
    }
    .logo{
      height:20mm;
      width:auto;
      max-width:45mm;
      object-fit:contain;
      flex-shrink:0;
    }
    .biz{
      color:#fff;
      font-size:9pt;
      font-weight:700;
      letter-spacing:.5px;
      text-transform:uppercase;
    }

    /* Body */
    .body{
      display:flex;
      gap:3mm;
      padding:4mm;
      flex:1;
    }
    .left{
      flex:1;
      display:flex;
      flex-direction:column;
      gap:2mm;
    }
    .discount{
      font-size:22pt;
      font-weight:900;
      color:${BRAND};
      line-height:1;
    }
    .coupon-name{
      font-size:9pt;
      font-weight:700;
      color:#222;
    }
    .conditions{
      list-style:none;
      display:flex;
      flex-direction:column;
      gap:1mm;
      margin-top:1mm;
    }
    .conditions li{
      font-size:6pt;
      color:#666;
      padding-left:6px;
      position:relative;
    }
    .conditions li::before{
      content:"·";
      position:absolute;
      left:0;
      color:${BRAND};
      font-weight:900;
    }

    /* Right side QR */
    .right{
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:1mm;
      flex-shrink:0;
    }
    .qr{
      width:30mm;
      height:30mm;
    }
    .scan-hint{
      font-size:5pt;
      color:#aaa;
      text-align:center;
    }

    /* Footer */
    .footer{
      background:#f9f9f9;
      border-top:1px solid #eee;
      padding:2mm 4mm;
      display:flex;
      align-items:center;
      gap:2mm;
    }
    .code-label{
      font-size:5.5pt;
      color:#aaa;
      text-transform:uppercase;
      letter-spacing:.5px;
      flex-shrink:0;
    }
    .short-id{
      font-family:monospace;
      font-size:8pt;
      font-weight:700;
      color:${BRAND};
      letter-spacing:1.5px;
    }
    .uuid{
      font-family:monospace;
      font-size:4pt;
      color:#ccc;
      margin-left:auto;
      word-break:break-all;
      text-align:right;
      max-width:45mm;
    }

    /* Print overrides */
    @media print{
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
