import { treemap, hierarchy, treemapSquarify } from "d3";
import raw from "./MarketMap.json";

const data = {
  name: "Market",
  children: raw.stocks.map(d => ({
    name: d.n,
    value: Number(d.s),
    change: Number(d.p)
  }))
};

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

function render() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  const root = hierarchy(data)
    .sum(d => Math.sqrt(d.value))
    .sort((a, b) => b.value - a.value);
  treemap()
    .tile(treemapSquarify)
    .size([width, height])
    .padding(2)(root);
  ctx.clearRect(0, 0, width, height);
  root.leaves().forEach(d => {
    ctx.fillStyle = d.data.change > 0 ? "green" : d.data.change < 0 ? "red" : "gray";
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    if ((d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 20) {
      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        d.data.name,
        d.x0 + (d.x1 - d.x0) / 2,
        d.y0 + (d.y1 - d.y0) / 2
      );
    }
  });
}

render();

window.addEventListener("resize", render);