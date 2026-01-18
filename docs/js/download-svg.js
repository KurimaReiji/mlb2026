import { svgdownload, loadCssRules } from "utils.js";

/**
 * @description Custom element to download an SVG chart as a PNG image.
 * @extends HTMLElement
 */
class DownloadSvg extends HTMLElement {
  /**
   * @constructor
   */
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  /**
   * @description Renders the download button.
   */
  render() {
    const css = `<style>
      :host { 
        display: block;
        font-family: 'Noto Sans', Arial, sans-serif;
      }
      .download {
        text-align: center;
        line-height: 1;
        padding-block: min(1vh, .25em);
        margin-inline: auto;
        margin-block: min(2vh, 1em);
        max-width: 12em;
        border-radius: 1.5em;
        background: var(--team-color, none);
        cursor: pointer;
        transition: padding-inline .6s;
      }
      .download {
        border: solid 1px var(--team-color);
        background: var(--team-color, black);
        color: var(--invert-team-color, white);
      }
      .download:hover {
        padding-inline: 1em;
      }
      </style>
      <style>
      [data-team="Orioles"]{
        --team-color: var(--orioles-orange);
      }
      [data-team="Red Sox"]{
        --team-color: var(--redsox-red);
      }
      [data-team="Rays"]{
        --team-color: var(--rays-navy);
      }
      [data-team="Yankees"]{
        --team-color: var(--yankees-navy);
      }
      [data-team="Blue Jays"]{
        --team-color: var(--bluejays-blue);
      }

      [data-team="White Sox"]{
        --team-color: var(--whitesox-black);
      }
      [data-team="Indians"],
      [data-team="Guardians"]{
        --team-color: var(--guardians-red);
      }
      [data-team="Tigers"]{
        --team-color: var(--tigers-navy);
      }
      [data-team="Royals"]{
        --team-color: var(--royals-blue);
      }
      [data-team="Twins"]{
        --team-color: var(--twins-navy);
      }

      [data-team="Astros"]{
        --team-color: var(--astros-orange);
      }
      [data-team="Athletics"]{
        --team-color: var(--athletics-darkgreen);
      }
      [data-team="Angels"]{
        --team-color: var(--angels-maroon);
      }
      [data-team="Mariners"]{
        --team-color: var(--mariners-navy);
      }
      [data-team="Rangers"]{
        --team-color: var(--rangers-blue);
      }

      [data-team="Braves"]{
        --team-color: var(--braves-scarlet);
      }
      [data-team="Marlins"]{
        --team-color: var(--marlins-black);
      }
      [data-team="Mets"]{
        --team-color: var(--mets-orange);
      }
      [data-team="Phillies"]{
        --team-color: var(--phillies-red);
      }
      [data-team="Nationals"]{
        --team-color: var(--nationals-red);
      }

      [data-team="Cubs"]{
        --team-color: var(--cubs-blue);
      }
      [data-team="Reds"]{
        --team-color: var(--reds-red);
      }
      [data-team="Brewers"]{
        --team-color: var(--brewers-navy);
      }
      [data-team="Pirates"]{
        --team-color: var(--pirates-gold);
      }
      [data-team="Cardinals"]{
        --team-color: var(--cardinals-red);
      }

      [data-team="Diamondbacks"]{
        --team-color: var(--dbacks-red);
      }
      [data-team="Rockies"]{
        --team-color: var(--rockies-black);
      }
      [data-team="Dodgers"]{
        --team-color: var(--dodger-blue);
      }
      [data-team="Padres"]{
        --team-color: var(--padres-brown);
      }
      [data-team="Giants"]{
        --team-color: var(--giants-orange);
      }
      </style>`;
    const html = `<div class="download">Save as PNG</div>`;
    this.shadowRoot.innerHTML = `${css}${html}`;
  }

  /**
   * @description Called when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.render();
    const root = this.shadowRoot;
    const downloadButton = root.querySelector(".download");

    const handleRouted = ({ detail }) => {
      downloadButton.dataset.team = detail.clubName;
    };

    const handleClick = async (evt) => {
      evt.stopPropagation();
      downloadButton.style.pointerEvents = "none";
      const chartElement = document.querySelector("record-chart");
      try {
        await downloadHandler({
          chartElement,
          svg: chartElement.shadowRoot.querySelector("svg").cloneNode(true),
          season: chartElement.season,
          team: chartElement.clubName,
        });
      } catch (error) {
        console.error("Error downloading SVG:", error);
      } finally {
        downloadButton.style.pointerEvents = "auto";
      }
    };

    document.addEventListener("ROUTED", handleRouted);
    downloadButton.addEventListener("click", handleClick);

    this._removeListeners = () => {
      document.removeEventListener("ROUTED", handleRouted);
      downloadButton.removeEventListener("click", handleClick);
    };
  }

  /**
   * @description Called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    if (this._removeListeners) {
      this._removeListeners();
    }
  }
}

customElements.define("download-svg", DownloadSvg);
export { DownloadSvg };

/**
 * @description Handles the download process of an SVG chart as a PNG image.
 * @async
 * @param {object} detail - The download details.
 * @param {HTMLElement} detail.chartElement - The chart element.
 * @param {SVGElement} detail.svg - The SVG element to download.
 * @param {string} detail.season - The season of the chart.
 * @param {string} detail.team - The team name.
 * @returns {Promise<void>}
 */
async function downloadHandler({ chartElement, svg, season, team }) {
  const width = 1600;
  const height = 1600;

  const clonedSvg = svg.cloneNode(true);
  clonedSvg.setAttributeNS(null, "width", width);
  clonedSvg.setAttributeNS(null, "height", height);

  const record = clonedSvg.querySelector("#Record text").textContent;
  const filename = `${season}-${team.replace(" ", "")}-${record}.png`;

  try {
    const cssRules = await Promise.all(
      [...chartElement.shadowRoot.querySelectorAll(`link[rel="stylesheet"]`)].map((link) =>
        loadCssRules(link, clonedSvg)
      )
    ).then((css) => css.join("\n"));

    clonedSvg.querySelector(`style[data-css="external"]`).textContent = cssRules;

    clonedSvg.dataset.download = filename;
    document.body.append(clonedSvg);
    await svgdownload(filename, document.querySelector('[data-download]'));
    clonedSvg.remove();
  } catch (error) {
    console.error("Error in downloadHandler:", error);
    throw error;
  }
}