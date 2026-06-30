// Render the social preview card (1200×630) to public/og.png.
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0e0e10"/>
  <g transform="translate(170,315)">
    <circle r="150" fill="#f4d03f"/>
    <path d="M0 0 m-100 0 a100 100 0 1 1 100 100" fill="none" stroke="#0e0e10" stroke-width="36" stroke-linecap="round"/>
    <circle r="34" fill="#0e0e10"/>
  </g>
  <text x="392" y="270" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="100" fill="#f4f2ec">LA BOTONERA<tspan fill="#f4d03f">.</tspan></text>
  <text x="396" y="330" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="44" fill="#f4f2ec">de la araña</text>
  <text x="398" y="392" font-family="Arial, Helvetica, sans-serif" font-size="31" fill="#87878f">Botonera de Hay Algo Ahí · instantánea · offline</text>
  <text x="398" y="442" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="29" fill="#e5446d">COMBATÍ LA LICUADORA → HAGOV</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("public/og.png written");
