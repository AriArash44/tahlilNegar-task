import { treemap, hierarchy, treemapSquarify, groups } from "d3";
import raw from "./MarketMap.json";

const groupNameMap = new Map(raw.groups.map(g => [g.g, g.n]));

const grouped = groups(raw.stocks, d => d.g);

const data = {
  name: "Market",
  children: grouped.map(([groupId, stocks]) => ({
    name: groupNameMap.get(groupId),
    children: stocks.map(d => ({
      name: d.n,
      value: Number(d.s),
      change: Number(d.p)
    }))
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
    .padding(1.5)(root);
  leaves = root.leaves();
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(zoom, zoom);
  root.leaves().forEach(d => {
    ctx.fillStyle = d.data.change > 3 ? "#30cc5a" : d.data.change > 1.5 ? "#2f9e4f" : d.data.change > 0.05 ? "#35764e" : 
    d.data.change < -3 ? "#d2464b" : d.data.change < -1.5 ? "#bf4045" : d.data.change < -0.05 ? "#8b444e" : "#414554";
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
    if ((d.x1 - d.x0) * zoom > 60 && (d.y1 - d.y0) * zoom > 30) {
      ctx.fillStyle = "white";
      ctx.font = `${10 / zoom + 4}px "iran-yekan(fanum)", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lines = (d.data.name + "\n" + d.data.change).split("\n");
      const lineHeight = 10 / zoom + 6;
      lines.forEach((line, i) => {
        ctx.fillText(
          line,
          d.x0 + (d.x1 - d.x0) / 2,
          d.y0 + (d.y1 - d.y0) / 2 + i * lineHeight - lineHeight / 2
        );
      });
    }
  });
  root.descendants().forEach(d => {
    if (d.children && (d.x1 - d.x0) * zoom > 60 && (d.y1 - d.y0) * zoom > 30) {
      ctx.fillStyle = "white";
      ctx.font = `${4 / zoom + 2}px "iran-yekan(fanum)", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        d.data.name,
        d.x0 + (d.x1 - d.x0) / 2,
        d.y0 - 2 / zoom - 1
      );
    }
  });
  ctx.restore();
}

document.fonts.ready.then(() => {
  render();
});

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
let movedDuringDrag = false;

canvas.addEventListener("mousedown", e => {
  dragging = true;
  movedDuringDrag = false;
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener("mouseup", e => {
  dragging = false;
  if (movedDuringDrag) {
    return;
  }
  handleClick(e);
});
canvas.addEventListener("mousemove", e => {
  if (dragging) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      movedDuringDrag = true;
    }
    offsetX += (e.clientX - lastX);
    offsetY += (e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
    clampOffsets();
    render();
  } else {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const worldX = (mouseX - offsetX) / zoom;
    const worldY = (mouseY - offsetY) / zoom;
    let hovering = false;
    for (const d of leaves) {
      if (worldX >= d.x0 && worldX <= d.x1 &&
          worldY >= d.y0 && worldY <= d.y1) {
        hovering = true;
        break;
      }
    }
    canvas.style.cursor = hovering ? "pointer" : "default";
  }
});

let pinchActive = false;
let pinchStartDist = 0;
let pinchStartZoom = 1;
let pinchStartMidX = 0;
let pinchStartMidY = 0;
let pinchWorldX = 0;
let pinchWorldY = 0;

function touchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}
function touchMid(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  };
}

canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    pinchActive = true;
    movedDuringDrag = true;
    const [t1, t2] = e.touches;
    pinchStartDist = touchDist(t1, t2);
    pinchStartZoom = zoom;
    const mid = touchMid(t1, t2);
    pinchStartMidX = mid.x;
    pinchStartMidY = mid.y;
    pinchWorldX = (pinchStartMidX - offsetX) / zoom;
    pinchWorldY = (pinchStartMidY - offsetY) / zoom;
  } else if (e.touches.length === 1 && !pinchActive) {
    e.preventDefault();
    dragging = true;
    movedDuringDrag = false;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  if (pinchActive && e.touches.length === 2) {
    e.preventDefault();
    const [t1, t2] = e.touches;
    const dist = touchDist(t1, t2);
    const factor = dist / pinchStartDist;
    zoom = pinchStartZoom * factor;
    if (zoom < 1) zoom = 1;
    offsetX = pinchStartMidX - pinchWorldX * zoom;
    offsetY = pinchStartMidY - pinchWorldY * zoom;
    clampOffsets();
    render();
  } else if (dragging && e.touches.length === 1 && !pinchActive) {
    e.preventDefault();
    const dx = e.touches[0].clientX - lastX;
    const dy = e.touches[0].clientY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      movedDuringDrag = true;
    }
    offsetX += dx;
    offsetY += dy;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    clampOffsets();
    render();
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  if (pinchActive && e.touches.length >= 1) {
    return;
  }
  if (pinchActive && e.touches.length === 0) {
    pinchActive = false;
    return;
  }
  if (dragging) {
    dragging = false;
    if (!movedDuringDrag && e.changedTouches.length === 1) {
      handleClick(e.changedTouches[0]);
    }
  }
}, { passive: false });

function handleClick(point) {
  const mouseX = point.clientX;
  const mouseY = point.clientY;
  const worldX = (mouseX - offsetX) / zoom;
  const worldY = (mouseY - offsetY) / zoom;
  for (const d of leaves) {
    if (worldX >= d.x0 && worldX <= d.x1 &&
        worldY >= d.y0 && worldY <= d.y1) {
      document.getElementById("modal-name").textContent = d.data.name;
      document.getElementById("modal-volume").textContent = d.data.value;
      document.getElementById("modal-change").textContent = d.data.change;
      document.getElementById("modal").style.display = "flex";
      break;
    }
  }
}

document.getElementById("modal-close").onclick = () => {
  document.getElementById("modal").style.display = "none";
};

window.onclick = e => {
  const modal = document.getElementById("modal");
  if (e.target === modal) {
    modal.style.display = "none";
  }
};
