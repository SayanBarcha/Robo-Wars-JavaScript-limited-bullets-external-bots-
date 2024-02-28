import { makeSVG, makeSVGBase64 } from "https://esm.sh/terrazzo-maker";

document.body.style.backgroundImage = `url(${makeSVGBase64(
  makeSVG({
    blob: { min: 5, max: 10 },
    colors: ["#EFE1F0", "#CCEAF0", "#AEE1CD", "#666"],
    density: 200,
    terrazzo: {
      backgroundColor: "#F9F6EF",
      height: 500,
      width: 500
    }
  }).node()
)})`;

//make it reusable for diff elements.

const svgDot = makeSVG({
  blob: { min: 5, max: 10 },
  colors: ["#EFE1F0", "#CCEAF0", "#AEE1CD", "#999", "#fff"],
  density: 300,
  terrazzo: {
    backgroundColor: "#FFE681",
    height: 300,
    width: 300
  }
});

const bgDot = makeSVGBase64(svgDot.node());

document.querySelector(".dot").style.backgroundImage = `url(${bgDot})`;

const tback = makeSVG({
  blob: { min: 5, max: 10 },
  colors: ["#BA0C2E30", "#5EB0E530", "#AEE1CD90", "#fff9"],
  density: 300,
  terrazzo: {
    backgroundColor: "#0000",
    height: 300,
    width: 300
  }
});

const bgTback = makeSVGBase64(tback.node());

document.querySelectorAll(".tback").forEach((o) => {
  o.style.backgroundImage = `url(${bgTback})`;
});
