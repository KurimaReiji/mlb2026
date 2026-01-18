function hide_selectors() {
  [...document.querySelectorAll("season-selector, team-selector, download-svg")].forEach((el) => {
    el.classList.add("hide");
  });
}

function show_selectors() {
  [...document.querySelectorAll("season-selector, team-selector, download-svg")].forEach((el) => {
    el.classList.remove("hide");
  });
}

class SeriesResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render() {
    const css = `<style>
:host {
  display: block;
  container-type: inline-size;
  font-family: 'Noto Sans', Arial, sans-serif;
  position: relative;
}
.container { max-height: 96svh; overflow: auto; padding-block-start: 2cqi;}
.game div { text-align: center; font-size: clamp(.85em, 4cqi, 1.125em); line-height: 1.4;}
.game div:nth-of-type(1) { padding-block-start: min(5cqh, 1.5em);}
.game div:nth-of-type(2) { white-space: nowrap; font-size: clamp(1em, 6cqi, 1.25em);}

.container {
  cursor: pointer;
  &::before {
    content: "\\2716";
    position: absolute;
    top: 0; left: .5em;
    font-size: clamp(1em, 8cqi, 1.5em);
  }
}
.container:empty {
  border: none;
  &::before {
    content: '';
  }
}
    </style>`;
    this.shadowRoot.innerHTML = `${css}`;
    const html = `<div class="container"></div>`;
    this.shadowRoot.innerHTML = `${css}${html}`;
  }

  connectedCallback() {
    const self = this;
    self.render();
    const container = self.shadowRoot.querySelector(".container");

    container.addEventListener("click", () => {
      container.replaceChildren();
      show_selectors();
    });

    document.addEventListener("SeriesSelected", ({ detail }) => {
      const div = document.createElement("div");
      const games = detail
        .map((d) => {
          const wrapper = div.cloneNode();
          wrapper.classList.add("game");
          const date = div.cloneNode();
          date.textContent = new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(new Date(d.officialDate));
          const score = div.cloneNode();
          score.innerHTML = d.score.replace(d.winner, `<b>${d.winner}</b>`);
          const venue = div.cloneNode();
          venue.textContent = [d.venue, d.description, (d.doubleheader ? `Game ${d.doubleheader}` : undefined)]
            .filter((s) => s)
            .join(", ");
          wrapper.replaceChildren(date, score, venue);
          return wrapper;
        });
      container.replaceChildren(...games);
      hide_selectors();
    });
  }
}

customElements.define("series-results", SeriesResults);
export { SeriesResults };
