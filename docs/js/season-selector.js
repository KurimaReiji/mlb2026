const targetSeasons = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

class SeasonSelector extends HTMLElement {
  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();
    const self = this;
    document.addEventListener("ROUTED", ({ detail }) => {
      self.dispatch({ ...detail });
    });
  }

  render() {
    const css = `<style>
    :host {
      display: block;
      container-type: inline-size;
      font-family: 'Noto Sans', Arial, sans-serif;
      min-width: 200px;
    }
    .selector {
      --grid-template: auto / repeat(4, 1fr);
    }

    @container (min-width: 32em) {
      .selector {
        --grid-template: auto / repeat(8, 1fr);
      }
    }
    .selector {
      padding-block: min(2vh, 1em) min(2vh, .5em);
      padding-inline: 2em;
      margin-inline: auto;
      display: grid;
      grid-template: var(--grid-template);
    }

    .selector .clickable {
      display: grid;
      place-content: center center;
      height: max(2em, 36px);
    }
    .clickable {
      cursor: pointer;
    }
    .active,
    .clickable:hover {
      background-color: var(--hover-color, lightgray);
    }
    </style>`;
    const html = `
    <div class="selector">
      <div data-grid="season"></div>
    </div>
    `;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `${css}${html}`;
    this.render_seasons();
  }

  render_seasons() {
    const self = this;
    const root = self.shadowRoot;

    const seasons = targetSeasons
      .map((s) => {
        const div = document.createElement("div");
        div.dataset.season = s;
        div.classList.add("clickable");
        div.textContent = s;
        return div;
      });

    root.querySelector(".selector").replaceChildren(...seasons);

    [...root.querySelectorAll(`.selector [data-season]`)].forEach((div) => {
      div.addEventListener("click", ({ currentTarget }) => {
        const targetSeason = currentTarget.dataset.season;
        self.dispatch({ season: targetSeason });
      });
    });
  }

  dispatch({ season }) {
    const self = this;
    const root = self.shadowRoot;

    if (self.current === season) return;
    if (!targetSeasons.includes(Number(season))) season = 2026;
    [...root.querySelectorAll(`.selector [data-season]`)].forEach((el) => {
      el.classList.remove("active");
    })

    self.current = season;
    Promise.all([
      get_today(season),
      get_season(season)
    ])
      .then(([cur, data]) => {
        // merge today's results
        cur.forEach((g) => {
          const game = data.games.find((game) => game.gamePk === g.gamePk);
          if (game) {
            game.status = g.status.detailedState;
            game.teams.away.score = g.teams.away.score;
            game.teams.home.score = g.teams.home.score;
            if (g.teams.away.score > g.teams.home.score) game.teams.away.isWinner = true;
            if (g.teams.away.score < g.teams.home.score) game.teams.home.isWinner = true;
          }
        })
        document.dispatchEvent(new CustomEvent("SeasonDataLoaded", {
          detail: data
        }));
        root.querySelector(`.selector [data-season="${season}"]`).classList.add("active");
      })
      ;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) { }
}

customElements.define("season-selector", SeasonSelector);
export { SeasonSelector };

async function get_today(season) {
  if (Number(season) !== 92026) return Promise.resolve([]);
  const url = 'https://statsapi.mlb.com/api/v1/schedule?sportId=1';
  return fetch(url, { cache: "no-cache" })
    .then((res) => res.json())
    .then((data) => {
      if (data.dates.length === 0) return [];
      return [];
      return data
        .dates[0].games
        .filter((g) => g.seriesDescription === "Regular Season")
        .filter(({ status }) => ["Final", "Game Over", "Completed Early"].includes(status.detailedState));
    });
}

async function get_season(season) {
  const url = (new URL(`../mlb-games-${season}.json`, import.meta.url)).href;
  return fetch(url, { cache: (Number(season) === 2026 ? "no-cache" : "default") })
    .then((res) => res.json());
}
