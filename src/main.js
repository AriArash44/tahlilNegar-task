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

let zoom = 1;
let offsetX = 0;
let offsetY = 0;
let leaves = [];

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
  leaves = root.leaves();
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);
  root.leaves().forEach(d => {
    ctx.fillStyle = d.data.change > 0 ? "green" : d.data.change < 0 ? "red" : "gray";
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    if ((d.x1 - d.x0) * zoom > 40 && (d.y1 - d.y0) * zoom > 20) {
      ctx.fillStyle = "white";
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        d.data.name,
        d.x0 + (d.x1 - d.x0) / 2,
        d.y0 + (d.y1 - d.y0) / 2
      );
    }
  });
  ctx.restore();
}

render();

window.addEventListener("resize", render);

function clampOffsets() {
  const viewW = canvas.width;
  const viewH = canvas.height;
  const contentW = viewW * zoom;
  const contentH = viewH * zoom;
  const minX = viewW - contentW;
  const maxX = 0;
  const minY = viewH - contentH;
  const maxY = 0;
  if (offsetX < minX) offsetX = minX;
  if (offsetX > maxX) offsetX = maxX;
  if (offsetY < minY) offsetY = minY;
  if (offsetY > maxY) offsetY = maxY;
}

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const worldX = (mouseX - offsetX) / zoom;
  const worldY = (mouseY - offsetY) / zoom;
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  zoom *= factor;
  if (zoom < 1) zoom = 1;
  offsetX = mouseX - worldX * zoom;
  offsetY = mouseY - worldY * zoom;
  clampOffsets();
  render();
});

let dragging = false, lastX, lastY;
canvas.addEventListener("mousedown", e => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mousemove", e => {
  if (dragging) {
    offsetX += (e.clientX - lastX);
    offsetY += (e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    clampOffsets();
    render();
  }
});

canvas.addEventListener("click", e => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const worldX = (mouseX - offsetX) / zoom;
  const worldY = (mouseY - offsetY) / zoom;
  for (const d of leaves) {
    if (worldX >= d.x0 && worldX <= d.x1 &&
        worldY >= d.y0 && worldY <= d.y1) {
      alert(d.data.name);
      break;
    }
  }
});