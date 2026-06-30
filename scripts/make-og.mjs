// Render the social preview card (1200×630) to public/og.png.
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0e0e10"/>
  <g fill="none" stroke="#f4d03f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M170 315 L320 315 M170 315 L276 421 M170 315 L170 465 M170 315 L64 421 M170 315 L20 315 M170 315 L64 209 M170 315 L170 165 M170 315 L276 209"/>
    <polygon points="263,315 236,381 170,408 104,381 77,315 104,249 170,222 236,249"/>
    <polygon points="320,315 276,421 170,465 64,421 20,315 64,209 170,165 276,209"/>
  </g>
  <circle cx="170" cy="315" r="13" fill="#f4d03f"/>
  <text x="392" y="270" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="100" fill="#f4f2ec">LA BOTONERA<tspan fill="#f4d03f">.</tspan></text>
  <text x="396" y="330" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="44" fill="#f4f2ec">de la araña</text>
  <text x="398" y="392" font-family="Arial, Helvetica, sans-serif" font-size="31" fill="#87878f">Botonera de Hay Algo Ahí · instantánea · offline</text>
  <text x="398" y="442" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="29" fill="#e5446d">COMBATÍ LA LICUADORA → HAGOV</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("public/og.png written");
